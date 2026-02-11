import type { PostFilter } from "./utils/posts";

export interface SiteConfig {
  title: string;
  slogan: string;
  description?: string;
  bio?: string;
  avatar?: string;
  site: string;
  social: {
    github?: string;
    linkedin?: string;
    email?: string;
    rss?: boolean;
  };
  techStack?: string[];
  homepage: PostFilter;
  googleAnalysis?: string;
  search?: boolean;
}

const defaultConfig: SiteConfig = {
  site: "http://localhost:4321",
  title: "Zen Blog",
  slogan: "A minimal blog.",
  description: "A blog built with tlog.",
  social: {},
  homepage: {
    maxPosts: 5,
    tags: [],
    excludeTags: [],
  },
  search: true,
};

function loadConfig(): SiteConfig {
  const envConfig = process.env.ZEN_BLOG_CONFIG;
  if (envConfig) {
    try {
      const parsed = JSON.parse(envConfig);
      return { ...defaultConfig, ...parsed };
    } catch {
      console.warn('[tlog] Failed to parse ZEN_BLOG_CONFIG, using defaults');
    }
  }
  return defaultConfig;
}

export const siteConfig: SiteConfig = loadConfig();
