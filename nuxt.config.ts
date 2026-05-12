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
    // Mirror the COOP/COEP headers `app/public/_headers` sets for Netlify so
    // `nuxt dev` and the bun preset are cross-origin-isolated too — without these,
    // `SharedArrayBuffer` isn't available and the multi-threaded solver falls back
    // to the single-worker path.
    routeRules: {
      '/**': {
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
      },
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
        const importPlugin = viteInlineConfig.plugins?.find((p) => p && 'name' in p && p.name === 'nuxt:imports-transform');
        if (importPlugin) {
          viteInlineConfig.worker ||= {};
          viteInlineConfig.worker.plugins = () => [importPlugin];
        }
      }
    },
  },
  vite: {
    build: {
      target: 'esnext',
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
});
