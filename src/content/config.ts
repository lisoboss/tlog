import { defineCollection, z } from 'astro:content';
import { blogLoader } from './loader';

const userDir = process.env.ZEN_BLOG_DIR;
const contentDir = userDir || './src/content/blog';

const blog = defineCollection({
  loader: blogLoader(contentDir),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { blog };
