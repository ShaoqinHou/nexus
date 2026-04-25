import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/apps/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Flag hardcoded hex colors in apps/ and components/ — use design tokens instead.
      // Print/thermal templates embedded in template literals are exempt (review-override).
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'hardcoded-hex-chrome: Use a design token (var(--color-*) or Tailwind semantic class) instead of a hex literal. See .claude/rules/design-system.md.',
        },
      ],
    },
  },
];
