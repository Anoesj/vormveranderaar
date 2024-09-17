// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

// @ts-expect-error - No types available, just ignore.
import { FlatCompat } from '@eslint/eslintrc';

// @ts-expect-error - No types available, just ignore.
import js from '@eslint/js';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const esLintConfigAnoesj = compat.extends('@anoesj/eslint-config-anoesj');
const esLintConfigAnoesjVue = compat.extends('@anoesj/eslint-config-anoesj-vue');

export default withNuxt(
  // Your custom configs here
  ...esLintConfigAnoesj,
  ...esLintConfigAnoesjVue,
  {
    files: ['**/*.vue'],
    rules: {
      'vue/html-self-closing': ['error', {
        html: {
          normal: 'never',
          void: 'never',
        },
      }],
      'vue/script-indent': ['warn', 2, {
        baseIndent: 0,
        switchCase: 1,
        ignores: [],
      }],
    },
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'indent': 'off', // TODO: We need to use the TS variant of this
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },
);
