# tlog

A minimal, beautiful blog generator powered by Astro. Build a static blog from any directory with a single command.

## Features

- Markdown + TOML metadata for content
- Dark mode with Catppuccin theme
- Tag-based organization & archive
- RSS feed, sitemap, SEO optimized
- Full-text search
- Fully responsive
- Google Analytics integration

## Quick Start

```bash
# Initialize a blog in the current directory
npx tlog init

# Start dev server
npx tlog dev

# Create a new post
npx tlog new my-first-post

# Build for production
npx tlog build
```

## Directory Structure

After `init`, your blog directory looks like:

```
my-blog/
├── .config.toml        # Site configuration
├── .public/             # Static assets (favicon, etc.)
├── hello-world.toml     # Post metadata
├── hello-world.md       # Post content
└── dist/                # Build output (after build)
```

## Configuration

Edit `.config.toml`:

```toml
[site]
url = "https://example.com"
title = "My Blog"
slogan = "Welcome to my blog."
description = "A personal blog."
bio = "Hello, I'm a developer."
avatar = ""

[social]
github = "https://github.com/your-username"
email = "your-email@example.com"
rss = true

[homepage]
maxPosts = 5
tags = []
excludeTags = []

[features]
techStack = ["JavaScript", "TypeScript", "Astro"]
googleAnalysis = ""
search = true
```

## Writing Posts

Each post is a pair of files:

**`my-post.toml`** — metadata:
```toml
[metadata]
title = "My Post Title"
description = "A brief description"
date = 2026-02-11
tags = ["blog", "tutorial"]
draft = false
```

**`my-post.md`** — content:
```markdown
# My Post Title

Your markdown content here...
```

## CLI Reference

```
npx tlog <command> [options]

Commands:
  init              Initialize a new blog
  dev               Start development server
  build             Build for production
  preview           Preview production build
  new <post-name>   Create a new post

Options:
  --input, -i <dir>   Source directory (default: cwd)
  --output, -o <dir>  Output directory (default: <input>/dist)
```

## License

MIT
