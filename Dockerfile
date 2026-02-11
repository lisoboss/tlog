FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy project source
COPY bin/ bin/
COPY src/ src/
COPY public/ public/
COPY astro.config.mjs tailwind.config.mjs tsconfig.json ./

# Create fallback content dir
RUN mkdir -p src/content/blog

# Blog source is mounted at /blog
VOLUME /blog

ENTRYPOINT ["node", "bin/cli.mjs", "--input", "/blog"]
