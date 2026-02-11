#!/usr/bin/env node

import { fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const command = process.argv[2];
const args = process.argv.slice(3);

// Parse --input and --output flags
function parseFlags(argv) {
  let inputDir = process.cwd();
  let outputDir = null;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--input' || argv[i] === '-i') && argv[i + 1]) {
      inputDir = path.resolve(argv[++i]);
    } else if ((argv[i] === '--output' || argv[i] === '-o') && argv[i + 1]) {
      outputDir = path.resolve(argv[++i]);
    } else {
      rest.push(argv[i]);
    }
  }
  if (!outputDir) outputDir = path.resolve(inputDir, 'dist');
  return { inputDir, outputDir, rest };
}

const { inputDir, outputDir, rest: extraArgs } = parseFlags(args);

// Terminal colors
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const CONFIG_FILE = '.config.toml';

async function main() {
  switch (command) {
    case 'init':
      await init();
      break;
    case 'build':
      await runAstroCommand(['build']);
      break;
    case 'dev':
      await runAstroCommand(['dev']);
      break;
    case 'preview':
      await runAstroCommand(['preview']);
      break;
    case 'new':
      await newPost(extraArgs[0]);
      break;
    default:
      printHelp();
  }
}

function printHelp() {
  console.log(`
${c.bold('tlog')} - A minimal, beautiful blog generator

${c.bold('USAGE')}
  npx tlog <command> [options]

${c.bold('COMMANDS')}
  ${c.cyan('init')}              Initialize a new blog in the current directory
  ${c.cyan('build')}             Build the blog for production
  ${c.cyan('dev')}               Start the development server
  ${c.cyan('preview')}           Preview the production build
  ${c.cyan('new')} ${c.dim('<post-name>')}   Create a new blog post

${c.bold('OPTIONS')}
  ${c.cyan('--input, -i')} ${c.dim('<dir>')}   Source directory (default: current dir)
  ${c.cyan('--output, -o')} ${c.dim('<dir>')}  Output directory (default: <input>/dist)

${c.bold('EXAMPLES')}
  npx tlog init
  npx tlog dev
  npx tlog build --input ./my-blog --output ./public
  npx tlog new my-first-post
  npx tlog build
`);
}

// ─── init ────────────────────────────────────────────────────────────────────

async function init() {
  console.log(c.cyan('\n  Initializing a new tlog...\n'));

  const date = new Date().toISOString().split('T')[0];

  const filesToCreate = [
    {
      path: CONFIG_FILE,
      content: `[site]
url = "https://example.com"
title = "My Blog"
slogan = "Welcome to my blog."
description = "A personal blog built with tlog."
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
`,
    },
    {
      path: 'hello-world.toml',
      content: `[metadata]
title = "Hello World"
description = "My first blog post"
date = ${date}
tags = ["hello"]
draft = false
`,
    },
    {
      path: 'hello-world.md',
      content: `# Hello World

Welcome to my blog! This is your first post.

## Getting Started

Edit this file or create new posts with:

\`\`\`bash
npx tlog new my-new-post
\`\`\`

Then start the dev server:

\`\`\`bash
npx tlog dev
\`\`\`

Build for production:

\`\`\`bash
npx tlog build
\`\`\`

Happy writing!
`,
    },
  ];

  // Generate favicon from title initial
  const initial = filesToCreate[0].content.match(/title\s*=\s*"([^"]*)"/)?.[1]?.[0]?.toUpperCase() || 'Z';
  filesToCreate.push({
    path: '.public/favicon.svg',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0f0f0"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="8" fill="url(#bgGradient)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="36" fill="#000000" font-family="Arial, sans-serif" font-weight="900">
    ${initial}
  </text>
</svg>
`,
  });

  for (const file of filesToCreate) {
    const filePath = path.join(inputDir, file.path);
    if (fs.existsSync(filePath)) {
      console.log(c.yellow(`  skip  ${file.path}`) + c.dim(' (already exists)'));
      continue;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
    console.log(c.green(`  create  ${file.path}`));
  }

  console.log(`
${c.green('  ✓ Blog initialized!')}

  Next steps:
    1. Edit ${c.cyan(CONFIG_FILE)} to customize your site
    2. Run ${c.cyan('npx tlog dev')} to start the dev server
    3. Run ${c.cyan('npx tlog new <post-name>')} to create a new post
`);
}

// ─── new post ────────────────────────────────────────────────────────────────

async function newPost(name) {
  if (!name) {
    console.error(c.red('  Error: Post name is required.'));
    console.error(`  Usage: ${c.cyan('npx tlog new <post-name>')}`);
    process.exit(1);
  }

  const tomlPath = path.join(inputDir, `${name}.toml`);
  const mdPath = path.join(inputDir, `${name}.md`);

  if (fs.existsSync(tomlPath) || fs.existsSync(mdPath)) {
    console.error(c.red(`  Error: Post "${name}" already exists.`));
    process.exit(1);
  }

  const date = new Date().toISOString().split('T')[0];
  const title = name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const tomlContent = `[metadata]
title = "${title}"
description = ""
date = ${date}
tags = []
draft = true
`;

  const mdContent = `Write your content here...
`;

  fs.writeFileSync(tomlPath, tomlContent);
  fs.writeFileSync(mdPath, mdContent);

  console.log(c.green(`\n  ✓ Created new post: ${name}`));
  console.log(`    ${c.dim(path.relative(inputDir, tomlPath))}`);
  console.log(`    ${c.dim(path.relative(inputDir, mdPath))}\n`);
}

// ─── astro runner ────────────────────────────────────────────────────────────

async function loadUserConfig() {
  const configPath = path.join(inputDir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    console.error(c.red(`  Error: ${CONFIG_FILE} not found in ${inputDir}`));
    console.error(`  Run ${c.cyan('npx tlog init')} first.\n`);
    process.exit(1);
  }

  const { parse } = await import('smol-toml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = parse(raw);

  const site = parsed.site || {};
  const social = parsed.social || {};
  const homepage = parsed.homepage || {};
  const features = parsed.features || {};

  return {
    site: site.url || 'http://localhost:4321',
    title: site.title || 'Zen Blog',
    slogan: site.slogan || '',
    description: site.description || '',
    bio: site.bio || '',
    avatar: site.avatar || '',
    social: {
      github: social.github || '',
      linkedin: social.linkedin || '',
      email: social.email || '',
      rss: social.rss ?? false,
    },
    techStack: features.techStack || [],
    homepage: {
      maxPosts: homepage.maxPosts || 5,
      tags: homepage.tags || [],
      excludeTags: homepage.excludeTags || [],
    },
    googleAnalysis: features.googleAnalysis || '',
    search: features.search ?? true,
  };
}

function getAstroBin() {
  try {
    const astroPkgJsonPath = require.resolve('astro/package.json');
    const astroDir = path.dirname(astroPkgJsonPath);
    const pkg = JSON.parse(fs.readFileSync(astroPkgJsonPath, 'utf-8'));
    const binPath = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.astro;
    return path.join(astroDir, binPath);
  } catch {
    console.error(c.red('  Failed to find astro CLI. Make sure astro is installed.'));
    process.exit(1);
  }
}

async function runAstroCommand(astroArgs) {
  const config = await loadUserConfig();

  const env = {
    ...process.env,
    ZEN_BLOG_DIR: inputDir,
    ZEN_BLOG_OUTPUT: outputDir,
    ZEN_BLOG_CONFIG: JSON.stringify(config),
  };

  const astroBin = getAstroBin();

  return new Promise((resolve, reject) => {
    const child = fork(astroBin, astroArgs, {
      cwd: packageRoot,
      env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else process.exit(code);
    });

    child.on('error', (err) => {
      console.error(c.red(`  Error: ${err.message}`));
      reject(err);
    });
  });
}

// ─── entry ───────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(c.red(`  Error: ${err.message}`));
  process.exit(1);
});
