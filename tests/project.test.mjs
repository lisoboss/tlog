import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

// ─── Astro config ───────────────────────────────────────────────────────────

describe('Astro config', () => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, 'astro.config.mjs'), 'utf-8');

  it('reads ZEN_BLOG_DIR from env', () => {
    assert.match(source, /process\.env\.ZEN_BLOG_DIR/);
  });

  it('reads ZEN_BLOG_OUTPUT from env', () => {
    assert.match(source, /process\.env\.ZEN_BLOG_OUTPUT/);
  });

  it('sets outDir from env variable', () => {
    assert.match(source, /outDir/);
  });

  it('sets publicDir to .public', () => {
    assert.match(source, /\.public/);
  });

  it('includes sitemap integration', () => {
    assert.match(source, /sitemap/);
  });

  it('uses tailwindcss vite plugin', () => {
    assert.match(source, /tailwindcss/);
  });

  it('configures Shiki code highlighting', () => {
    assert.match(source, /shikiConfig/);
    assert.match(source, /catppuccin/);
  });

  it('uses catppuccin-frappe for light theme', () => {
    assert.match(source, /catppuccin-frappe/);
  });

  it('uses catppuccin-mocha for dark theme', () => {
    assert.match(source, /catppuccin-mocha/);
  });
});

// ─── Tailwind config ────────────────────────────────────────────────────────

describe('Tailwind config', () => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, 'tailwind.config.mjs'), 'utf-8');

  it('uses class-based dark mode', () => {
    assert.match(source, /darkMode:\s*['"]class['"]/);
  });

  it('includes catppuccin plugin', () => {
    assert.match(source, /catppuccin/);
  });

  it('scans src directory for content', () => {
    assert.match(source, /\.\/src\/\*\*/);
  });
});

// ─── Package.json ───────────────────────────────────────────────────────────

describe('Package config', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'));

  it('has correct bin entry', () => {
    assert.equal(pkg.bin.tlog, 'bin/cli.mjs');
  });

  it('is ESM (type: module)', () => {
    assert.equal(pkg.type, 'module');
  });

  it('has astro dependency', () => {
    assert.ok(pkg.dependencies.astro);
  });

  it('has smol-toml dependency', () => {
    assert.ok(pkg.dependencies['smol-toml']);
  });

  it('has tailwindcss dependency', () => {
    assert.ok(pkg.dependencies.tailwindcss);
  });

  it('requires node >= 18', () => {
    assert.match(pkg.engines.node, />=\s*18/);
  });

  it('files array includes bin/', () => {
    assert.ok(pkg.files.includes('bin/'));
  });

  it('files array includes src/', () => {
    assert.ok(pkg.files.includes('src/'));
  });

  it('has test script', () => {
    assert.ok(pkg.scripts.test, 'package.json should have a test script');
  });
});

// ─── Styles ─────────────────────────────────────────────────────────────────

describe('Styles', () => {
  const globalCss = fs.readFileSync(path.join(PROJECT_ROOT, 'src', 'styles', 'global.css'), 'utf-8');

  it('imports tailwindcss', () => {
    assert.match(globalCss, /@import\s+["']tailwindcss["']/);
  });

  it('imports catppuccin mocha', () => {
    assert.match(globalCss, /catppuccin.*mocha/);
  });

  it('imports monaspace font', () => {
    assert.match(globalCss, /monaspace/);
  });

  it('uses @custom-variant for dark mode', () => {
    assert.match(globalCss, /@custom-variant\s+dark/);
  });

  it('defines prose-catppuccin utility', () => {
    assert.match(globalCss, /@utility\s+prose-catppuccin/);
  });

  it('transitions.css exists', () => {
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'src', 'styles', 'transitions.css')));
  });
});
