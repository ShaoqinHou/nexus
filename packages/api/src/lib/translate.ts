import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// GLM Translation Service
// Single function for all translation needs: UI strings, menu content, notes
// Uses z.ai Anthropic-compatible API with GLM model
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;
let _model: string | null = null;

const DEFAULT_BASE_URL = 'https://api.z.ai/api/anthropic';
const MODEL_CANDIDATES = ['glm-5', 'glm-4.7'];

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) throw new Error('ZAI_API_KEY environment variable is required for translation');
    _client = new Anthropic({
      apiKey,
      baseURL: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
    });
  }
  return _client;
}

async function getModel(): Promise<string> {
  if (_model) return _model;
  const client = getClient();
  const candidates = process.env.ZAI_MODEL ? [process.env.ZAI_MODEL, ...MODEL_CANDIDATES] : MODEL_CANDIDATES;

  for (const model of candidates) {
    try {
      await client.messages.create({ model, max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] });
      _model = model;
      console.log(`Translation model detected: ${model}`);
      return model;
    } catch {
      // Try next model
    }
  }
  throw new Error(`No working translation model found. Tried: ${candidates.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TranslateOptions {
  text: string;
  targetLocale: string;
  context: string; // "menu item name", "UI button label", "customer order note", etc.
  sourceLocale?: string; // auto-detect if omitted
}

const SYSTEM_PROMPT = `You are a professional translator for a restaurant ordering platform.

Rules:
- Translate naturally for the target language — use proper grammar and word order
- For restaurant menu items: use established culinary terms, not literal word-by-word translation
- Preserve dish proper nouns (Pad Thai, Tiramisu, Fish & Chips) — transliterate phonetically for CJK if needed
- For CJK languages: add the original name in parentheses after transliteration for unfamiliar dishes
- Maintain any placeholder patterns like {count}, {name}, {price} exactly as-is
- For UI labels: be concise, match the register of the platform (professional but friendly)
- Return ONLY the translated text, no explanations or alternatives`;

/**
 * Translate a single piece of text using GLM.
 * Returns the translated string, or the original text if translation fails.
 */
export async function translate(options: TranslateOptions): Promise<string> {
  const { text, targetLocale, context, sourceLocale } = options;

  if (!text.trim()) return text;
  if (targetLocale === (sourceLocale || 'en')) return text;

  // Check if translation service is available
  if (!process.env.ZAI_API_KEY) return text;

  try {
    const client = getClient();
    const model = await getModel();

    const userMessage = sourceLocale
      ? `Translate from ${sourceLocale} to ${targetLocale}.\nContext: ${context}\nText: ${text}`
      : `Translate to ${targetLocale}.\nContext: ${context}\nText: ${text}`;

    const response = await client.messages.create({
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type === 'text' && content.text.trim()) {
      return content.text.trim();
    }
    return text; // fallback
  } catch (error) {
    console.error('Translation failed:', error instanceof Error ? error.message : error);
    return text; // graceful fallback to original
  }
}

/**
 * Translate multiple items in a single batch (reduces API calls).
 * Groups items by locale and sends one prompt per locale.
 */
export async function translateBatch(
  items: { key: string; text: string; context: string }[],
  targetLocale: string,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  if (!process.env.ZAI_API_KEY || targetLocale === 'en') {
    for (const item of items) results.set(item.key, item.text);
    return results;
  }

  // Build a numbered list for batch translation
  const numbered = items.map((item, i) => `${i + 1}. [${item.context}] ${item.text}`).join('\n');

  try {
    const client = getClient();
    const model = await getModel();

    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Translate each line to ${targetLocale}. Keep the numbering. Return ONLY the translations, one per line, matching the numbering.\n\n${numbered}`,
      }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const lines = content.text.trim().split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim());
      for (let i = 0; i < items.length; i++) {
        results.set(items[i].key, lines[i] || items[i].text);
      }
    }
  } catch (error) {
    console.error('Batch translation failed:', error instanceof Error ? error.message : error);
    for (const item of items) results.set(item.key, item.text);
  }

  return results;
}

/**
 * Check if translation service is available (ZAI_API_KEY configured).
 */
export function isTranslationAvailable(): boolean {
  return !!process.env.ZAI_API_KEY;
}
