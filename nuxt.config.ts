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
});
