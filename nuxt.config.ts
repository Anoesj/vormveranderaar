const netlify = process.env.NETLIFY === 'true';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-08-30',
  ssr: false,
  devtools: { enabled: false },
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    '@nuxt/test-utils/module',
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
  ],
  imports: {
    dirs: [
      'utils/**',
    ],
  },
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  nitro: {
    preset: netlify ? 'netlify-static' : 'bun',
    experimental: {
      websocket: true,
    },
  },
  runtimeConfig: {
    public: {
      calculateInBrowserOnly: false,
    },
  },
  // NOTE: Workaround for auto imports & bundling & web workers.
  // See: https://github.com/nuxt/nuxt/issues/24590#issuecomment-2318843660
  hooks: {
    'vite:extendConfig' (viteInlineConfig, env) {
      if (env.isClient) {
        const importPlugin = viteInlineConfig.plugins?.find(p => p && 'name' in p && p.name === 'nuxt:imports-transform')
        if (importPlugin) {
          viteInlineConfig.worker ||= {}
          viteInlineConfig.worker.plugins = () => [importPlugin]
        }
      }
    },
  },
  vite: {
    build: {
      target: 'esnext',
    },
  },
});
