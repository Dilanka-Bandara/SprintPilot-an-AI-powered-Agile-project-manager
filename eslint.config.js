import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      'playwright-report/**',
      'test-results/**',
      '.tools/**',
      '**/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
