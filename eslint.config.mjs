// @ts-check

// import withNuxt from './.nuxt/eslint.config.mjs';
import vueTsEslint from '@anoesj/eslint-config-vue-ts';
import { config } from 'typescript-eslint';

export default config(
  ...vueTsEslint(),
);
