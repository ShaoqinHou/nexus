import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// GLM Translation Service
// Single function for all translation needs: UI strings, menu content, notes
// Uses z.ai Anthropic-compatible API with GLM model
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;
let _model: string | null = null;
let _modelDetectedAt = 0;
const MODEL_CACHE_TTL = 30 * 60 * 1000; // Re-probe model every 30 minutes
const REQUEST_TIMEOUT = 15_000; // 15 second timeout per API call
const RETRY_DELAY = 1_000; // 1 second between retries

const DEFAULT_BASE_URL = 'https://api.z.ai/api/anthropic';

// Broad candidate list — z.ai updates model names (glm-5 → glm-5.1 → glm-5.2 etc.)
// Ordered newest first; the first one that responds wins.
const MODEL_CANDIDATES = [
  'glm-5.2', 'glm-5.1', 'glm-5',
  'glm-4.9', 'glm-4.8', 'glm-4.7',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
];

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) throw new Error('ZAI_API_KEY environment variable is required for translation');
    _client = new Anthropic({
      apiKey,
      baseURL: process.env.ZAI_BASE_URL || DEFAULT_BASE_URL,
      timeout: REQUEST_TIMEOUT,
    });
  }
  return _client;
}

/**
 * Detect a working model by probing candidates.
 * Caches result for MODEL_CACHE_TTL. On failure, clears cache to force re-probe.
 */
async function getModel(): Promise<string> {
  // Use cached model if still fresh
  if (_model && (Date.now() - _modelDetectedAt) < MODEL_CACHE_TTL) {
    return _model;
  }

  const client = getClient();
  // Allow env override to skip probing entirely
  const envModel = process.env.ZAI_MODEL;
  const candidates = envModel ? [envModel, ...MODEL_CANDIDATES] : MODEL_CANDIDATES;
  // Deduplicate
  const unique = [...new Set(candidates)];

  for (const model of unique) {
    try {
      await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      });
      _model = model;
      _modelDetectedAt = Date.now();
      console.log(`[translate] Model detected: ${model}`);
      return model;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // Only log if it's not a simple "model not found" (reduce noise)
      if (!msg.includes('not found') && !msg.includes('not_found') && !msg.includes('404')) {
        console.warn(`[translate] Model "${model}" probe failed: ${msg}`);
      }
    }
  }

  // All candidates failed — clear cache so next call retries
  _model = null;
  _modelDetectedAt = 0;
  throw new Error(`[translate] No working model found. Tried: ${unique.join(', ')}`);
}

/** Clear model cache — forces re-probe on next translate call */
function invalidateModelCache() {
  _model = null;
  _modelDetectedAt = 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TranslateOptions {
  text: string;
  targetLocale: string;
  context: string;
  sourceLocale?: string;
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
 * Make an API call with a single retry on transient errors.
 */
async function callWithRetry(
  client: Anthropic,
  model: string,
  params: { system: string; messages: Anthropic.MessageParam[]; max_tokens: number },
): Promise<Anthropic.Message> {
  try {
    return await client.messages.create({ model, ...params });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isTransient = msg.includes('timeout') || msg.includes('ETIMEDOUT') ||
      msg.includes('ECONNRESET') || msg.includes('503') || msg.includes('529') ||
      msg.includes('rate') || msg.includes('overloaded');

    if (isTransient) {
      console.warn(`[translate] Transient error, retrying in ${RETRY_DELAY}ms: ${msg}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      try {
        return await client.messages.create({ model, ...params });
      } catch (retryError) {
        // Retry also failed — invalidate model cache in case model changed
        invalidateModelCache();
        throw retryError;
      }
    }

    // Non-transient error (auth, model not found, etc.)
    if (msg.includes('not found') || msg.includes('not_found')) {
      invalidateModelCache(); // model may have been renamed
    }
    throw error;
  }
}

/**
 * Translate a single piece of text using GLM.
 * Returns the translated string, or the original text if translation fails.
 * NEVER throws — always falls back gracefully.
 */
export async function translate(options: TranslateOptions): Promise<string> {
  const { text, targetLocale, context, sourceLocale } = options;

  if (!text.trim()) return text;
  if (targetLocale === (sourceLocale || 'en')) return text;
  if (!process.env.ZAI_API_KEY) return text;

  try {
    const client = getClient();
    const model = await getModel();

    const userMessage = sourceLocale
      ? `Translate from ${sourceLocale} to ${targetLocale}.\nContext: ${context}\nText: ${text}`
      : `Translate to ${targetLocale}.\nContext: ${context}\nText: ${text}`;

    const response = await callWithRetry(client, model, {
      system: SYSTEM_PROMPT,
      max_tokens: 500,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type === 'text' && content.text.trim()) {
      return content.text.trim();
    }
    return text;
  } catch (error) {
    console.error('[translate] Failed:', error instanceof Error ? error.message : error);
    return text; // graceful fallback
  }
}

/**
 * Translate multiple items in a single batch.
 * NEVER throws — falls back to original text for all items.
 */
export async function translateBatch(
  items: { key: string; text: string; context: string }[],
  targetLocale: string,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  if (!process.env.ZAI_API_KEY || items.length === 0) {
    for (const item of items) results.set(item.key, item.text);
    return results;
  }

  const numbered = items.map((item, i) => `${i + 1}. [${item.context}] ${item.text}`).join('\n');

  try {
    const client = getClient();
    const model = await getModel();

    const response = await callWithRetry(client, model, {
      system: SYSTEM_PROMPT,
      max_tokens: Math.min(items.length * 100, 4000),
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
    console.error('[translate] Batch failed:', error instanceof Error ? error.message : error);
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

/**
 * Get the currently detected model name (for diagnostics).
 */
export function getDetectedModel(): string | null {
  return _model;
}
