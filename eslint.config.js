import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVarsOptions = { argsIgnorePattern: '^_', varsIgnorePattern: '^_' };

const sharedRules = {
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'warn',
  'object-shorthand': 'warn',
  'no-console': ['warn', { allow: ['error', 'warn'] }],
  curly: 'error',
  'import/order': [
    'warn',
    {
      'newlines-between': 'always',
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    },
  ],
  'import/no-duplicates': 'error',
};

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', '.agents/', '.claude/'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    plugins: { import: importPlugin },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser, ...globals.es2024 },
    },
    rules: {
      ...sharedRules,
      // Replaces the core rule, which misreports usage in TypeScript.
      '@typescript-eslint/no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
  {
    files: ['**/*.js'],
    plugins: { import: importPlugin },
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.es2024 } },
    rules: { ...sharedRules, 'no-unused-vars': ['warn', unusedVarsOptions] },
  },
  prettier,
);
