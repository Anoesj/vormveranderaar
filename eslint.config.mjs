// @ts-check

// import withNuxt from './.nuxt/eslint.config.mjs';
import vueTsEslint from '@anoesj/eslint-config-vue-ts';
import { config } from 'typescript-eslint';

export default config(
  ...vueTsEslint(),
  // {
  //   files: ['**/*.vue'],
  //   rules: {
  //     'vue/html-self-closing': ['error', {
  //       html: {
  //         normal: 'never',
  //         void: 'never',
  //       },
  //     }],
  //     'vue/script-indent': ['warn', 2, {
  //       baseIndent: 0,
  //       switchCase: 1,
  //       ignores: [],
  //     }],
  //   },
  // },
);
