import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { siteConfig } from './src/config';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';

const userDir = process.env.ZEN_BLOG_DIR;
const outDir = process.env.ZEN_BLOG_OUTPUT;

export default defineConfig({
  site: siteConfig.site,
  ...(userDir && {
    outDir: outDir || path.resolve(userDir, 'dist'),
    publicDir: path.resolve(userDir, '.public'),
  }),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'catppuccin-frappe',
        dark: 'catppuccin-mocha',
      },
      transformers: [
        {
          pre(node) {
            delete node.properties.style;
          },
        },
      ],
    },
  },
});