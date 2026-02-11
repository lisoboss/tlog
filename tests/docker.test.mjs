import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const IMAGE_NAME = 'tlog-test';

function docker(args, opts = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf-8',
    timeout: opts.timeout || 120_000,
    cwd: opts.cwd || PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  });
}

function dockerWithStatus(args, opts = {}) {
  try {
    const stdout = docker(args, opts);
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status };
  }
}

function isDockerAvailable() {
  try {
    execFileSync('docker', ['info'], { stdio: 'pipe', timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tlog-docker-test-'));
}

// ─── Docker tests ───────────────────────────────────────────────────────────

describe('Docker', { skip: !isDockerAvailable() ? 'Docker not available' : false }, () => {
  let tmpDir;

  before(() => {
    // Build image
    docker(['build', '-t', IMAGE_NAME, '.'], { timeout: 300_000 });
  });

  after(() => {
    // Clean up image
    dockerWithStatus(['rmi', '-f', IMAGE_NAME]);
  });

  // ─── Dockerfile validation ────────────────────────────────────────────────

  describe('Dockerfile', () => {
    it('Dockerfile exists', () => {
      assert.ok(fs.existsSync(path.join(PROJECT_ROOT, 'Dockerfile')));
    });

    it('uses node:22-alpine base', () => {
      const dockerfile = fs.readFileSync(path.join(PROJECT_ROOT, 'Dockerfile'), 'utf-8');
      assert.match(dockerfile, /FROM\s+node:22-alpine/);
    });

    it('sets /blog as VOLUME', () => {
      const dockerfile = fs.readFileSync(path.join(PROJECT_ROOT, 'Dockerfile'), 'utf-8');
      assert.match(dockerfile, /VOLUME\s+\/blog/);
    });

    it('uses cli.mjs as ENTRYPOINT', () => {
      const dockerfile = fs.readFileSync(path.join(PROJECT_ROOT, 'Dockerfile'), 'utf-8');
      assert.match(dockerfile, /ENTRYPOINT.*cli\.mjs/);
    });

    it('sets --input /blog in ENTRYPOINT', () => {
      const dockerfile = fs.readFileSync(path.join(PROJECT_ROOT, 'Dockerfile'), 'utf-8');
      assert.match(dockerfile, /--input.*\/blog/);
    });
  });

  // ─── Image build ─────────────────────────────────────────────────────────

  describe('Image', () => {
    it('image was built successfully', () => {
      const out = docker(['images', '-q', IMAGE_NAME]);
      assert.ok(out.trim().length > 0, 'Image should exist');
    });

    it('image contains node', () => {
      const out = docker(['run', '--rm', IMAGE_NAME, 'node', '--version']);
      assert.match(out, /v22/);
    });

    it('image contains cli.mjs', () => {
      const out = docker(['run', '--rm', '--entrypoint', 'ls', IMAGE_NAME, 'bin/cli.mjs']);
      assert.match(out, /cli\.mjs/);
    });

    it('image contains astro.config.mjs', () => {
      const out = docker(['run', '--rm', '--entrypoint', 'ls', IMAGE_NAME, 'astro.config.mjs']);
      assert.match(out, /astro\.config\.mjs/);
    });

    it('image contains src directory', () => {
      const out = docker(['run', '--rm', '--entrypoint', 'ls', IMAGE_NAME, 'src/']);
      assert.match(out, /config\.ts/);
      assert.match(out, /content/);
      assert.match(out, /pages/);
    });
  });

  // ─── Container: help ─────────────────────────────────────────────────────

  describe('Container help', () => {
    it('shows help without command', () => {
      // Override entrypoint to pass no --input
      const out = docker([
        'run', '--rm', '--entrypoint', 'node', IMAGE_NAME,
        'bin/cli.mjs',
      ]);
      assert.match(out, /USAGE/);
      assert.match(out, /COMMANDS/);
    });
  });

  // ─── Container: init ─────────────────────────────────────────────────────

  describe('Container init', () => {
    before(() => {
      tmpDir = makeTmpDir();
    });

    after(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('init creates files in mounted volume', () => {
      docker([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'init',
      ]);

      assert.ok(fs.existsSync(path.join(tmpDir, '.config.toml')), '.config.toml should exist');
      assert.ok(fs.existsSync(path.join(tmpDir, 'hello-world.toml')), 'hello-world.toml should exist');
      assert.ok(fs.existsSync(path.join(tmpDir, 'hello-world.md')), 'hello-world.md should exist');
      assert.ok(fs.existsSync(path.join(tmpDir, '.public', 'favicon.svg')), 'favicon.svg should exist');
    });

    it('config content is valid TOML', () => {
      const content = fs.readFileSync(path.join(tmpDir, '.config.toml'), 'utf-8');
      assert.match(content, /\[site\]/);
      assert.match(content, /title\s*=\s*"My Blog"/);
    });
  });

  // ─── Container: new ──────────────────────────────────────────────────────

  describe('Container new', () => {
    before(() => {
      tmpDir = makeTmpDir();
      docker([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'init',
      ]);
    });

    after(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('creates new post files', () => {
      docker([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'new', 'docker-post',
      ]);

      assert.ok(fs.existsSync(path.join(tmpDir, 'docker-post.toml')));
      assert.ok(fs.existsSync(path.join(tmpDir, 'docker-post.md')));
    });

    it('new post has correct metadata', () => {
      const content = fs.readFileSync(path.join(tmpDir, 'docker-post.toml'), 'utf-8');
      assert.match(content, /title\s*=\s*"Docker Post"/);
      assert.match(content, /draft\s*=\s*true/);
    });

    it('fails for duplicate post', () => {
      const { exitCode } = dockerWithStatus([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'new', 'docker-post',
      ]);
      assert.notEqual(exitCode, 0);
    });
  });

  // ─── Container: build ─────────────────────────────────────────────────────

  describe('Container build', () => {
    before(() => {
      tmpDir = makeTmpDir();
      docker([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'init',
      ]);
    });

    after(() => {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('builds successfully', () => {
      docker([
        'run', '--rm',
        '-v', `${tmpDir}:/blog`,
        IMAGE_NAME, 'build',
      ], { timeout: 180_000 });

      const distDir = path.join(tmpDir, '.dist');
      assert.ok(fs.existsSync(distDir), '.dist should exist in mounted volume');
    });

    it('generates index.html', () => {
      const indexPath = path.join(tmpDir, '.dist', 'index.html');
      assert.ok(fs.existsSync(indexPath));
      const html = fs.readFileSync(indexPath, 'utf-8');
      assert.match(html, /<html/);
      assert.match(html, /My Blog/);
    });

    it('generates blog post', () => {
      const postPath = path.join(tmpDir, '.dist', 'blog', 'hello-world', 'index.html');
      assert.ok(fs.existsSync(postPath));
    });

    it('generates RSS feed', () => {
      assert.ok(fs.existsSync(path.join(tmpDir, '.dist', 'rss.xml')));
    });

    it('generates robots.txt', () => {
      assert.ok(fs.existsSync(path.join(tmpDir, '.dist', 'robots.txt')));
    });

    it('generates search endpoint', () => {
      assert.ok(fs.existsSync(path.join(tmpDir, '.dist', 'api', 'search.json')));
    });
  });

  // ─── Container: build without config ──────────────────────────────────────

  describe('Container build without config', () => {
    it('fails with clear error', () => {
      const emptyDir = makeTmpDir();
      try {
        const { exitCode, stderr } = dockerWithStatus([
          'run', '--rm',
          '-v', `${emptyDir}:/blog`,
          IMAGE_NAME, 'build',
        ]);
        assert.notEqual(exitCode, 0);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Container: custom output ─────────────────────────────────────────────

  describe('Container custom output', () => {
    it('builds to custom output directory', () => {
      const blogDir = makeTmpDir();
      try {
        docker([
          'run', '--rm',
          '-v', `${blogDir}:/blog`,
          IMAGE_NAME, 'init',
        ]);

        docker([
          'run', '--rm',
          '-v', `${blogDir}:/blog`,
          IMAGE_NAME, 'build', '--output', '/blog/custom-out',
        ], { timeout: 180_000 });

        assert.ok(
          fs.existsSync(path.join(blogDir, 'custom-out', 'index.html')),
          'index.html should be in custom output dir'
        );
      } finally {
        fs.rmSync(blogDir, { recursive: true, force: true });
      }
    });
  });
});
