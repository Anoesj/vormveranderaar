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
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  nitro: {
    preset: 'bun',
    experimental: {
      websocket: true,
    },
  },
});
