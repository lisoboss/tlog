import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Read the loader source directly and test its logic patterns
// (Cannot import directly due to Astro dependencies)

const loaderPath = path.resolve(import.meta.dirname, '..', 'src', 'content', 'loader.ts');
const loaderSource = fs.readFileSync(loaderPath, 'utf-8');

const configPath = path.resolve(import.meta.dirname, '..', 'src', 'content', 'config.ts');
const configSource = fs.readFileSync(configPath, 'utf-8');

// ─── toDate logic ────────────────────────────────────────────────────────────

describe('Content loader: toDate logic', () => {
  // Re-implement the toDate function from loader.ts for testing
  function toDate(value) {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && 'toDate' in value) {
      return value.toDate();
    }
    const d = new Date(String(value));
    if (isNaN(d.getTime())) throw new Error(`Invalid date value: ${value}`);
    return d;
  }

  it('handles Date instance', () => {
    const d = new Date('2026-01-15');
    assert.deepEqual(toDate(d), d);
  });

  it('handles string date', () => {
    const d = toDate('2026-01-15');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 0); // January
    assert.equal(d.getDate(), 15);
  });

  it('handles object with toDate method (TOML date)', () => {
    const tomlDate = { toDate: () => new Date('2025-06-01') };
    const d = toDate(tomlDate);
    assert.equal(d.getFullYear(), 2025);
  });

  it('throws on invalid date', () => {
    assert.throws(() => toDate('not-a-date'), /Invalid date value/);
  });

  it('handles ISO string', () => {
    const d = toDate('2026-02-11T10:00:00Z');
    assert.equal(d.getFullYear(), 2026);
  });
});

// ─── loader source structure ─────────────────────────────────────────────────

describe('Content loader: source validation', () => {
  it('exports blogLoader function', () => {
    assert.match(loaderSource, /export\s+function\s+blogLoader/);
  });

  it('filters out dotfiles', () => {
    assert.match(loaderSource, /!f\.startsWith\(['"]\.['"]?\)/);
  });

  it('only processes .toml files', () => {
    assert.match(loaderSource, /\.endsWith\(['"]\.toml['"]\)/);
  });

  it('reads corresponding .md file', () => {
    assert.match(loaderSource, /\.md/);
  });

  it('supports [metadata] section and flat TOML', () => {
    assert.match(loaderSource, /parsed\.metadata\s*\?\?\s*parsed/);
  });

  it('sets deferredRender to true', () => {
    assert.match(loaderSource, /deferredRender:\s*true/);
  });

  it('includes file watcher for dev mode', () => {
    assert.match(loaderSource, /context\.watcher/);
  });
});

// ─── content collection schema ──────────────────────────────────────────────

describe('Content collection schema', () => {
  it('defines blog collection', () => {
    assert.match(configSource, /defineCollection/);
    assert.match(configSource, /blog/);
  });

  it('has required title field', () => {
    assert.match(configSource, /title:\s*z\.string\(\)/);
  });

  it('has optional description', () => {
    assert.match(configSource, /description:\s*z\.string\(\)\.optional\(\)/);
  });

  it('has coerced date field', () => {
    assert.match(configSource, /date:\s*z\.coerce\.date\(\)/);
  });

  it('has optional tags array', () => {
    assert.match(configSource, /tags:\s*z\.array\(z\.string\(\)\)\.optional\(\)/);
  });

  it('has optional draft boolean', () => {
    assert.match(configSource, /draft:\s*z\.boolean\(\)\.optional\(\)/);
  });

  it('has optional image field', () => {
    assert.match(configSource, /image:\s*z\.string\(\)\.optional\(\)/);
  });

  it('uses blogLoader with ZEN_BLOG_DIR fallback', () => {
    assert.match(configSource, /ZEN_BLOG_DIR/);
    assert.match(configSource, /\.\/src\/content\/blog/);
  });
});
