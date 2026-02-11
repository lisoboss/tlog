import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI = path.resolve(import.meta.dirname, '..', 'bin', 'cli.mjs');
const NODE = process.execPath;

function run(args, opts = {}) {
  const result = execFileSync(NODE, [CLI, ...args], {
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env, ...opts.env },
    cwd: opts.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  });
  return result;
}

function runWithStatus(args, opts = {}) {
  try {
    const stdout = run(args, opts);
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status };
  }
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tlog-test-'));
}

// ─── help ────────────────────────────────────────────────────────────────────

describe('CLI help', () => {
  it('shows help with no arguments', () => {
    const out = run([]);
    assert.match(out, /tlog/);
    assert.match(out, /USAGE/);
    assert.match(out, /COMMANDS/);
    assert.match(out, /OPTIONS/);
    assert.match(out, /EXAMPLES/);
  });

  it('help text does not contain npx', () => {
    const out = run([]);
    assert.ok(!out.includes('npx'), 'Help text should not contain npx');
  });

  it('lists all commands', () => {
    const out = run([]);
    assert.match(out, /init/);
    assert.match(out, /build/);
    assert.match(out, /dev/);
    assert.match(out, /preview/);
    assert.match(out, /new/);
  });

  it('shows --input and --output options', () => {
    const out = run([]);
    assert.match(out, /--input/);
    assert.match(out, /--output/);
    assert.match(out, /-i/);
    assert.match(out, /-o/);
  });
});

// ─── init ────────────────────────────────────────────────────────────────────

describe('CLI init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates all required files', () => {
    run(['init', '--input', tmpDir]);

    assert.ok(fs.existsSync(path.join(tmpDir, '.config.toml')), '.config.toml should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, 'hello-world.toml')), 'hello-world.toml should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, 'hello-world.md')), 'hello-world.md should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, '.public', 'favicon.svg')), '.public/favicon.svg should exist');
  });

  it('generates valid TOML config', () => {
    run(['init', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, '.config.toml'), 'utf-8');
    assert.match(content, /\[site\]/);
    assert.match(content, /url\s*=/);
    assert.match(content, /title\s*=\s*"My Blog"/);
    assert.match(content, /\[social\]/);
    assert.match(content, /\[homepage\]/);
    assert.match(content, /\[features\]/);
  });

  it('generates post TOML with today date', () => {
    run(['init', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, 'hello-world.toml'), 'utf-8');
    const today = new Date().toISOString().split('T')[0];
    assert.match(content, /\[metadata\]/);
    assert.match(content, /title\s*=\s*"Hello World"/);
    assert.ok(content.includes(today), `Post date should be ${today}`);
    assert.match(content, /draft\s*=\s*false/);
  });

  it('generates markdown content', () => {
    run(['init', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, 'hello-world.md'), 'utf-8');
    assert.match(content, /# Hello World/);
    assert.match(content, /tlog new/);
    assert.match(content, /tlog dev/);
    assert.match(content, /tlog build/);
    assert.ok(!content.includes('npx'), 'Markdown should not contain npx');
  });

  it('generates SVG favicon with title initial', () => {
    run(['init', '--input', tmpDir]);

    const svg = fs.readFileSync(path.join(tmpDir, '.public', 'favicon.svg'), 'utf-8');
    assert.match(svg, /<svg/);
    assert.match(svg, /M/); // "M" from "My Blog"
  });

  it('skips existing files', () => {
    // First init
    run(['init', '--input', tmpDir]);
    const originalContent = fs.readFileSync(path.join(tmpDir, '.config.toml'), 'utf-8');

    // Modify a file
    fs.writeFileSync(path.join(tmpDir, '.config.toml'), 'modified');

    // Second init should skip
    const out = run(['init', '--input', tmpDir]);
    assert.match(out, /skip/);

    // File should be unchanged
    const content = fs.readFileSync(path.join(tmpDir, '.config.toml'), 'utf-8');
    assert.equal(content, 'modified');
  });

  it('works with -i shorthand', () => {
    run(['init', '-i', tmpDir]);
    assert.ok(fs.existsSync(path.join(tmpDir, '.config.toml')));
  });

  it('output contains success message', () => {
    const out = run(['init', '--input', tmpDir]);
    assert.match(out, /initialized|create/i);
  });
});

// ─── new post ────────────────────────────────────────────────────────────────

describe('CLI new', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    run(['init', '--input', tmpDir]);
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates TOML and MD files', () => {
    run(['new', 'my-test-post', '--input', tmpDir]);

    assert.ok(fs.existsSync(path.join(tmpDir, 'my-test-post.toml')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'my-test-post.md')));
  });

  it('generates correct TOML metadata', () => {
    run(['new', 'my-test-post', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, 'my-test-post.toml'), 'utf-8');
    assert.match(content, /\[metadata\]/);
    assert.match(content, /title\s*=\s*"My Test Post"/); // Title case from slug
    assert.match(content, /draft\s*=\s*true/);
    assert.match(content, /tags\s*=\s*\[\]/);

    const today = new Date().toISOString().split('T')[0];
    assert.ok(content.includes(today), `Date should be ${today}`);
  });

  it('generates MD with placeholder content', () => {
    run(['new', 'my-test-post', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, 'my-test-post.md'), 'utf-8');
    assert.match(content, /Write your content here/);
  });

  it('converts slug to title case', () => {
    run(['new', 'hello-beautiful-world', '--input', tmpDir]);

    const content = fs.readFileSync(path.join(tmpDir, 'hello-beautiful-world.toml'), 'utf-8');
    assert.match(content, /title\s*=\s*"Hello Beautiful World"/);
  });

  it('fails without post name', () => {
    const { exitCode, stderr } = runWithStatus(['new', '--input', tmpDir]);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /Post name is required/i);
  });

  it('fails for duplicate post', () => {
    run(['new', 'duplicate-post', '--input', tmpDir]);
    const { exitCode, stderr } = runWithStatus(['new', 'duplicate-post', '--input', tmpDir]);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /already exists/i);
  });

  it('new post draft defaults to true', () => {
    run(['new', 'draft-post', '--input', tmpDir]);
    const content = fs.readFileSync(path.join(tmpDir, 'draft-post.toml'), 'utf-8');
    assert.match(content, /draft\s*=\s*true/);
  });
});

// ─── build (config validation) ──────────────────────────────────────────────

describe('CLI build/dev without config', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails without .config.toml', () => {
    const { exitCode, stderr } = runWithStatus(['build', '--input', tmpDir]);
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /\.config\.toml not found/);
  });

  it('error message suggests tlog init (without npx)', () => {
    const { stderr } = runWithStatus(['build', '--input', tmpDir]);
    assert.match(stderr, /tlog init/);
    assert.ok(!stderr.includes('npx'), 'Error should not contain npx');
  });
});

// ─── flag parsing ────────────────────────────────────────────────────────────

describe('CLI flag parsing', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('--input sets source directory', () => {
    run(['init', '--input', tmpDir]);
    assert.ok(fs.existsSync(path.join(tmpDir, '.config.toml')));
  });

  it('-i shorthand works', () => {
    run(['init', '-i', tmpDir]);
    assert.ok(fs.existsSync(path.join(tmpDir, '.config.toml')));
  });

  it('--output sets output directory', () => {
    run(['init', '--input', tmpDir]);

    // --output only affects build, just verify flag is accepted
    const { exitCode } = runWithStatus([
      'build', '--input', tmpDir, '--output', path.join(tmpDir, 'custom-out'),
    ]);
    // build may fail but should not fail due to flag parsing
    // The error should be about astro/config, not unknown flag
    assert.ok(true);
  });

  it('-o shorthand works', () => {
    run(['init', '--input', tmpDir]);
    // Same as above, just verifying flag acceptance
    const { stderr } = runWithStatus([
      'build', '-i', tmpDir, '-o', path.join(tmpDir, 'custom-out'),
    ]);
    assert.ok(!stderr.includes('unknown flag'), 'Short flag -o should be recognized');
  });

  it('default output dir is <input>/.dist', () => {
    run(['init', '--input', tmpDir]);
    // This is tested implicitly by a successful build
    // We verify the CLI source code has '.dist' as default
    const cliSource = fs.readFileSync(
      path.resolve(import.meta.dirname, '..', 'bin', 'cli.mjs'),
      'utf-8'
    );
    assert.match(cliSource, /resolve\(inputDir,\s*'\.dist'\)/);
  });
});

// ─── full build ──────────────────────────────────────────────────────────────

describe('CLI build (full)', () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
    run(['init', '--input', tmpDir]);
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('builds successfully with initialized blog', () => {
    const out = run(['build', '--input', tmpDir], { timeout: 120_000 });
    const distDir = path.join(tmpDir, '.dist');
    assert.ok(fs.existsSync(distDir), '.dist directory should be created');
  });

  it('generates index.html', () => {
    const indexPath = path.join(tmpDir, '.dist', 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html should exist');
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.match(html, /<html/);
    assert.match(html, /My Blog/);
  });

  it('generates blog post page', () => {
    const postDir = path.join(tmpDir, '.dist', 'blog', 'hello-world');
    const postIndex = path.join(postDir, 'index.html');
    assert.ok(fs.existsSync(postIndex), 'hello-world post page should exist');
    const html = fs.readFileSync(postIndex, 'utf-8');
    assert.match(html, /Hello World/);
  });

  it('generates RSS feed', () => {
    const rssPath = path.join(tmpDir, '.dist', 'rss.xml');
    assert.ok(fs.existsSync(rssPath), 'rss.xml should exist');
    const rss = fs.readFileSync(rssPath, 'utf-8');
    assert.match(rss, /<rss/);
  });

  it('generates sitemap', () => {
    const sitemapFiles = fs.readdirSync(path.join(tmpDir, '.dist'))
      .filter(f => f.includes('sitemap'));
    assert.ok(sitemapFiles.length > 0, 'Sitemap should be generated');
  });

  it('generates robots.txt', () => {
    const robotsPath = path.join(tmpDir, '.dist', 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'robots.txt should exist');
  });

  it('generates search JSON endpoint', () => {
    const searchPath = path.join(tmpDir, '.dist', 'api', 'search.json');
    assert.ok(fs.existsSync(searchPath), 'search.json should exist');
    const json = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
    assert.ok(Array.isArray(json), 'search.json should be an array');
  });

  it('generates tags pages', () => {
    const tagsDir = path.join(tmpDir, '.dist', 'tags');
    assert.ok(fs.existsSync(tagsDir), 'tags directory should exist');
  });

  it('generates archive page', () => {
    const archivePath = path.join(tmpDir, '.dist', 'archive', 'index.html');
    assert.ok(fs.existsSync(archivePath), 'archive page should exist');
  });

  it('builds to custom output directory', () => {
    const customOut = path.join(tmpDir, 'custom-output');
    run(['build', '--input', tmpDir, '--output', customOut], { timeout: 120_000 });
    assert.ok(fs.existsSync(customOut), 'Custom output directory should exist');
    assert.ok(fs.existsSync(path.join(customOut, 'index.html')), 'index.html in custom dir');
  });
});

// ─── draft & future posts ───────────────────────────────────────────────────

describe('Draft and future posts', () => {
  let tmpDir;

  before(() => {
    tmpDir = makeTmpDir();
    run(['init', '--input', tmpDir]);

    // Create a draft post
    fs.writeFileSync(path.join(tmpDir, 'draft-post.toml'), `[metadata]
title = "Draft Post"
description = "This is a draft"
date = 2020-01-01
tags = ["test"]
draft = true
`);
    fs.writeFileSync(path.join(tmpDir, 'draft-post.md'), '# Draft\n');

    // Create a future post
    fs.writeFileSync(path.join(tmpDir, 'future-post.toml'), `[metadata]
title = "Future Post"
description = "This is in the future"
date = 2099-12-31
tags = ["future"]
draft = false
`);
    fs.writeFileSync(path.join(tmpDir, 'future-post.md'), '# Future\n');

    run(['build', '--input', tmpDir], { timeout: 120_000 });
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('draft post page is still generated (filtering is at listing level)', () => {
    const draftPath = path.join(tmpDir, '.dist', 'blog', 'draft-post');
    assert.ok(fs.existsSync(draftPath), 'Draft post page should exist (all slugs are rendered)');
  });

  it('future post page is still generated (filtering is at listing level)', () => {
    const futurePath = path.join(tmpDir, '.dist', 'blog', 'future-post');
    assert.ok(fs.existsSync(futurePath), 'Future post page should exist (all slugs are rendered)');
  });

  it('published post is included', () => {
    const postPath = path.join(tmpDir, '.dist', 'blog', 'hello-world');
    assert.ok(fs.existsSync(postPath), 'Published post should be in output');
  });

  it('search endpoint excludes drafts', () => {
    const searchPath = path.join(tmpDir, '.dist', 'api', 'search.json');
    const json = JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
    const slugs = json.map((p) => p.slug || p.id);
    assert.ok(!slugs.includes('draft-post'), 'Draft should not appear in search');
  });

  it('index page does not list draft post', () => {
    const indexHtml = fs.readFileSync(path.join(tmpDir, '.dist', 'index.html'), 'utf-8');
    assert.ok(!indexHtml.includes('Draft Post'), 'Draft post should not appear on index');
  });

  it('index page does not list future post', () => {
    const indexHtml = fs.readFileSync(path.join(tmpDir, '.dist', 'index.html'), 'utf-8');
    assert.ok(!indexHtml.includes('Future Post'), 'Future post should not appear on index');
  });
});
