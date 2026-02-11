import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'smol-toml';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate(): Date }).toDate();
  }
  const d = new Date(String(value));
  if (isNaN(d.getTime())) throw new Error(`Invalid date value: ${value}`);
  return d;
}

export function blogLoader(contentDir: string) {
  return {
    name: 'blog-toml-loader',
    async load(context: any) {
      const { store, parseData, logger } = context;

      const dir = path.resolve(contentDir);
      const files = await fs.readdir(dir);

      // Find all .toml files (each represents a post), skip dotfiles like .config.toml
      const tomlFiles = files.filter((f: string) => f.endsWith('.toml') && !f.startsWith('.'));

      store.clear();

      for (const tomlFile of tomlFiles) {
        const slug = path.basename(tomlFile, '.toml');
        const mdFile = slug + '.md';
        const tomlPath = path.join(dir, tomlFile);
        const mdPath = path.join(dir, mdFile);

        // Read and parse TOML metadata
        let tomlContent: string;
        try {
          tomlContent = await fs.readFile(tomlPath, 'utf-8');
        } catch {
          logger.warn(`Cannot read ${tomlFile}, skipping`);
          continue;
        }

        const parsed = parse(tomlContent);
        // Support both [metadata] section and flat TOML
        const metadata = (parsed.metadata ?? parsed) as Record<string, unknown>;

        // Read markdown content
        let body = '';
        try {
          body = await fs.readFile(mdPath, 'utf-8');
        } catch {
          logger.warn(`No matching .md file for ${tomlFile}, skipping`);
          continue;
        }

        // Validate data against the collection schema
        const data = await parseData({
          id: slug,
          data: {
            title: metadata.title,
            description: metadata.description,
            date: toDate(metadata.date),
            tags: metadata.tags,
            draft: metadata.draft,
            image: metadata.image,
          },
        });

        store.set({
          id: slug,
          data,
          body,
          filePath: path.relative(process.cwd(), mdPath),
          deferredRender: true,
        });
      }

      // Watch for changes in dev mode
      if (context.watcher) {
        context.watcher.add(dir);
        context.watcher.on('change', async (changedPath: string) => {
          if (!changedPath.startsWith(dir)) return;
          const ext = path.extname(changedPath);
          if (ext !== '.toml' && ext !== '.md') return;

          const slug = path.basename(changedPath, ext);
          const tomlPath = path.join(dir, slug + '.toml');
          const mdPath = path.join(dir, slug + '.md');

          try {
            const tomlContent = await fs.readFile(tomlPath, 'utf-8');
            const parsed = parse(tomlContent);
            const metadata = (parsed.metadata ?? parsed) as Record<string, unknown>;
            const body = await fs.readFile(mdPath, 'utf-8');

            const data = await parseData({
              id: slug,
              data: {
                title: metadata.title,
                description: metadata.description,
                date: toDate(metadata.date),
                tags: metadata.tags,
                draft: metadata.draft,
                image: metadata.image,
              },
            });

            store.set({
              id: slug,
              data,
              body,
              filePath: path.relative(process.cwd(), mdPath),
              deferredRender: true,
            });
          } catch (e) {
            logger.error(`Error reloading ${slug}: ${e}`);
          }
        });
      }
    },
  };
}
