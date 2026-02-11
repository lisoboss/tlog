import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(import.meta.dirname, '..', 'src', 'config.ts');
const configSource = fs.readFileSync(configPath, 'utf-8');

// ─── SiteConfig interface ───────────────────────────────────────────────────

describe('SiteConfig interface', () => {
  it('defines SiteConfig interface', () => {
    assert.match(configSource, /interface\s+SiteConfig/);
  });

  it('has site field', () => {
    assert.match(configSource, /site:\s*string/);
  });

  it('has title field', () => {
    assert.match(configSource, /title:\s*string/);
  });

  it('has slogan field', () => {
    assert.match(configSource, /slogan:\s*string/);
  });

  it('has optional description', () => {
    assert.match(configSource, /description\?:\s*string/);
  });

  it('has optional bio', () => {
    assert.match(configSource, /bio\?:\s*string/);
  });

  it('has optional avatar', () => {
    assert.match(configSource, /avatar\?:\s*string/);
  });

  it('has social object with optional fields', () => {
    assert.match(configSource, /social:\s*\{/);
    assert.match(configSource, /github\?:\s*string/);
    assert.match(configSource, /email\?:\s*string/);
    assert.match(configSource, /rss\?:\s*boolean/);
  });

  it('has optional techStack', () => {
    assert.match(configSource, /techStack\?:\s*string\[\]/);
  });

  it('has homepage PostFilter', () => {
    assert.match(configSource, /homepage:\s*PostFilter/);
  });

  it('has optional googleAnalysis', () => {
    assert.match(configSource, /googleAnalysis\?:\s*string/);
  });

  it('has optional search toggle', () => {
    assert.match(configSource, /search\?:\s*boolean/);
  });
});

// ─── default config ─────────────────────────────────────────────────────────

describe('Default config values', () => {
  it('defaults site to localhost:4321', () => {
    assert.match(configSource, /site:\s*["']http:\/\/localhost:4321["']/);
  });

  it('defaults title to "Zen Blog"', () => {
    assert.match(configSource, /title:\s*["']Zen Blog["']/);
  });

  it('defaults search to true', () => {
    assert.match(configSource, /search:\s*true/);
  });

  it('defaults maxPosts to 5', () => {
    assert.match(configSource, /maxPosts:\s*5/);
  });

  it('defaults empty social', () => {
    assert.match(configSource, /social:\s*\{\}/);
  });
});

// ─── config loading ─────────────────────────────────────────────────────────

describe('Config loading', () => {
  it('reads from ZEN_BLOG_CONFIG env var', () => {
    assert.match(configSource, /process\.env\.ZEN_BLOG_CONFIG/);
  });

  it('parses JSON from env', () => {
    assert.match(configSource, /JSON\.parse/);
  });

  it('merges with defaults using spread', () => {
    assert.match(configSource, /\.\.\.\s*defaultConfig/);
  });

  it('handles parse errors gracefully', () => {
    assert.match(configSource, /catch/);
    assert.match(configSource, /using defaults|Failed to parse/i);
  });

  it('exports siteConfig', () => {
    assert.match(configSource, /export\s+(const|let)\s+siteConfig/);
  });
});

// ─── date utils ─────────────────────────────────────────────────────────────

describe('Date utils', () => {
  const datePath = path.resolve(import.meta.dirname, '..', 'src', 'utils', 'date.ts');
  const dateSource = fs.readFileSync(datePath, 'utf-8');

  it('exports formatDate function', () => {
    assert.match(dateSource, /export\s+function\s+formatDate/);
  });

  it('exports isPublished function', () => {
    assert.match(dateSource, /export\s+function\s+isPublished/);
  });

  it('formatDate uses en-US locale', () => {
    assert.match(dateSource, /en-US/);
  });

  it('isPublished compares to current date', () => {
    assert.match(dateSource, /new Date\(\)/);
  });
});

// ─── post utils ─────────────────────────────────────────────────────────────

describe('Post utils', () => {
  const postsPath = path.resolve(import.meta.dirname, '..', 'src', 'utils', 'posts.ts');
  const postsSource = fs.readFileSync(postsPath, 'utf-8');

  it('exports sortPostsByDate', () => {
    assert.match(postsSource, /export\s+function\s+sortPostsByDate/);
  });

  it('exports filterPublishedPosts', () => {
    assert.match(postsSource, /export\s+function\s+filterPublishedPosts/);
  });

  it('exports filterPosts', () => {
    assert.match(postsSource, /export\s+function\s+filterPosts/);
  });

  it('exports getPostsByTag', () => {
    assert.match(postsSource, /export\s+function\s+getPostsByTag/);
  });

  it('exports getAllTags', () => {
    assert.match(postsSource, /export\s+function\s+getAllTags/);
  });

  it('filterPublishedPosts excludes drafts', () => {
    assert.match(postsSource, /!post\.data\.draft/);
  });

  it('filterPublishedPosts checks isPublished', () => {
    assert.match(postsSource, /isPublished\(post\.data\.date\)/);
  });

  it('sortPostsByDate sorts descending', () => {
    assert.match(postsSource, /b\.data\.date\.valueOf\(\)\s*-\s*a\.data\.date\.valueOf\(\)/);
  });

  it('filterPosts supports tag inclusion', () => {
    assert.match(postsSource, /filter\.tags/);
  });

  it('filterPosts supports tag exclusion', () => {
    assert.match(postsSource, /filter\.excludeTags/);
  });

  it('filterPosts supports maxPosts limit', () => {
    assert.match(postsSource, /filter\.maxPosts/);
    assert.match(postsSource, /\.slice\(0,\s*filter\.maxPosts\)/);
  });

  it('PostFilter interface is exported', () => {
    assert.match(postsSource, /export\s+interface\s+PostFilter/);
  });
});
