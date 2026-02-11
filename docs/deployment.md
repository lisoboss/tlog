# 部署指南

## 静态部署

tlog 生成纯静态站点，可部署到任意静态托管平台。

### 构建

```bash
tlog build --input /path/to/blog
```

构建输出在 `<input>/.dist/` 目录下。

### Vercel

```bash
# 安装 tlog
npm i -g tlog

# 或在 Vercel 项目设置中：
# Build Command: npx tlog build --input . --output ./dist
# Output Directory: dist
```

### Netlify

```bash
# Build Command
npx tlog build --input . --output ./dist

# Publish Directory
dist
```

### GitHub Pages

使用 GitHub Actions：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx tlog build --output ./dist
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Cloudflare Pages

```bash
# Build Command
npx tlog build --input . --output ./dist

# Build Output Directory
dist
```

## Docker 部署

### 使用预构建镜像

```bash
docker build -t tlog /path/to/tlog-source

# 开发模式
docker run -v /path/to/blog:/blog -p 4321:4321 tlog dev

# 构建
docker run -v /path/to/blog:/blog tlog build
```

### Dockerfile 说明

```dockerfile
FROM node:22-alpine
WORKDIR /app

# 安装依赖
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY bin/ src/ public/ astro.config.mjs tailwind.config.mjs tsconfig.json ./

# 博客目录挂载点
VOLUME /blog
ENTRYPOINT ["node", "bin/cli.mjs", "--input", "/blog"]
```

### Docker Compose 示例

```yaml
services:
  blog:
    build: /path/to/tlog-source
    volumes:
      - ./my-blog:/blog
    ports:
      - "4321:4321"
    command: dev
```

## 自定义域名

在 `.config.toml` 中设置正确的 `url`：

```toml
[site]
url = "https://yourdomain.com"
```

这会影响 sitemap、RSS Feed 和 SEO 元数据中的链接。
