import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { siteConfig } from './src/config';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePublicDir = path.resolve(__dirname, 'public');

const userDir = process.env.ZEN_BLOG_DIR;
const outDir = process.env.ZEN_BLOG_OUTPUT;

// Vite plugin to copy package's public/ assets as fallbacks
// (user's .public/ files take precedence via Astro's publicDir)
function fallbackPublicPlugin() {
  const mimeTypes = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  return {
    name: 'tlog-fallback-public',
    // Dev: serve package public/ as fallback
    // Runs before Astro's handlers, but skips if user's .public/ has the file
    configureServer(server) {
      const userPublicDir = path.resolve(userDir, '.public');
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        // If user has their own version in .public/, let Astro serve it
        const userFile = path.join(userPublicDir, urlPath);
        if (fs.existsSync(userFile) && fs.statSync(userFile).isFile()) {
          return next();
        }
        // Otherwise serve from package public/ as fallback
        const filePath = path.join(packagePublicDir, urlPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      });
    },
    // Build: copy package public/ files to output (without overwriting user files)
    writeBundle(options) {
      const outPath = options.dir;
      if (!outPath) return;
      copyDirRecursive(packagePublicDir, outPath);
    },
  };
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      // Only copy if user hasn't provided their own version
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  site: siteConfig.site,
  ...(userDir && {
    outDir: outDir || path.resolve(userDir, 'dist'),
    publicDir: path.resolve(userDir, '.public'),
  }),
  integrations: [sitemap()],
  vite: {
    plugins: [
      tailwindcss(),
      ...(userDir ? [fallbackPublicPlugin()] : []),
    ],
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