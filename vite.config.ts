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
      includeAssets: ['apple-touch-icon.png'],
      // Caption fonts are drawn on a canvas, which silently falls back to another face when the
      // file is missing. Precache them so an installed app exports the same lettering offline.
      workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] },
      manifest: {
        name: 'STOCKROLL',
        short_name: 'STOCKROLL',
        description: 'Frame your photos, keep your film recipes, and share your signature look',
        lang: 'en',
        // The installed app opens on the front page, the same index of Frame, Gear and Recipes as
        // the site.
        start_url: '/',
        display: 'standalone',
        // Splash and status bar colors; mirror BRAND.cream / BRAND.red in src/shared/config/palette.ts.
        background_color: '#f4efe3',
        theme_color: '#8e211e',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { tsconfigPaths: true },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'] },
});
