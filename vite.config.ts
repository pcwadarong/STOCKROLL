import { seedDesignPlugin } from '@seed-design/vite-plugin';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    // One theme: cream paper with black ink (see src/app/theme.css.ts).
    seedDesignPlugin({ colorMode: 'light-only' }),
    vanillaExtractPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'STOCKROLL',
        short_name: 'STOCKROLL',
        description: 'Frame your photos, keep your film recipes, and share your signature look',
        lang: 'en',
        // The installed app opens straight into the editor, not the front page.
        start_url: '/frame',
        display: 'standalone',
        background_color: '#efe4cf',
        theme_color: '#8b1e1e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
