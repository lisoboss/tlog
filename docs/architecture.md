# tlog 架构设计

## 概述

tlog 是一个基于 [Astro](https://astro.build) 的极简博客生成器。用户通过 CLI 在任意目录初始化博客，使用 TOML + Markdown 编写文章，tlog 负责构建为静态站点。

## 核心设计思路

```
用户博客目录 (inputDir)          tlog 包 (packageRoot)
┌──────────────────────┐        ┌──────────────────────────┐
│ .config.toml         │        │ bin/cli.mjs              │
│ .public/favicon.svg  │  CLI   │ src/                     │
│ hello-world.toml     │ ────►  │   config.ts              │
│ hello-world.md       │        │   content/loader.ts      │
│                      │        │   layouts/               │
│ .dist/ (输出)        │ ◄────  │   pages/                 │
└──────────────────────┘  构建  │   components/            │
                                │ astro.config.mjs         │
                                └──────────────────────────┘
```

**关键机制**：CLI 通过环境变量将用户目录信息传递给 Astro 构建系统：

| 环境变量 | 作用 |
|---|---|
| `ZEN_BLOG_DIR` | 用户博客源目录路径 |
| `ZEN_BLOG_OUTPUT` | 构建输出目录路径 |
| `ZEN_BLOG_CONFIG` | 用户配置 (JSON 序列化) |

## 目录结构

```
tlog/
├── bin/
│   └── cli.mjs              # CLI 入口，命令解析与 Astro 调用
├── src/
│   ├── config.ts             # 站点配置类型定义与加载
│   ├── env.d.ts              # Astro 环境类型声明
│   ├── content/
│   │   ├── config.ts         # Astro Content Collections 定义
│   │   └── loader.ts         # 自定义 TOML+MD 内容加载器
│   ├── components/           # Astro 组件
│   │   ├── BlogPreview.astro # 博客预览卡片
│   │   ├── Card.astro        # 通用卡片
│   │   ├── Footer.astro      # 页脚
│   │   ├── Header.astro      # 导航栏
│   │   ├── Pagination.astro  # 分页
│   │   ├── PostDate.astro    # 日期显示
│   │   ├── PostTags.astro    # 标签显示
│   │   ├── Search.astro      # 全文搜索
│   │   ├── SocialLinks.astro # 社交链接
│   │   ├── TechStack.astro   # 技术栈展示
│   │   ├── ThemeToggle.astro # 深色/浅色模式切换
│   │   └── TypingEffect.astro# 打字效果
│   ├── layouts/
│   │   ├── BaseLayout.astro  # 基础 HTML 布局
│   │   ├── BlogPost.astro    # 文章页布局
│   │   └── Layout.astro      # 通用页面布局
│   ├── pages/
│   │   ├── index.astro       # 首页
│   │   ├── archive.astro     # 归档页
│   │   ├── robots.txt.ts     # robots.txt 生成
│   │   ├── rss.xml.js        # RSS Feed 生成
│   │   ├── api/
│   │   │   └── search.json.ts# 搜索 API 端点
│   │   ├── blog/
│   │   │   ├── [...page].astro # 博客列表分页
│   │   │   └── [slug].astro    # 文章详情页
│   │   └── tags/
│   │       ├── index.astro     # 标签列表页
│   │       └── [tag].astro     # 标签筛选页
│   ├── scripts/
│   │   └── theme.ts          # 主题切换脚本
│   ├── styles/
│   │   ├── global.css        # 全局样式 (Catppuccin 主题)
│   │   └── transitions.css   # 页面过渡动画
│   └── utils/
│       ├── date.ts           # 日期格式化与发布判断
│       └── posts.ts          # 文章过滤、排序工具
├── public/                   # Astro 静态资源
├── astro.config.mjs          # Astro 配置
├── tailwind.config.mjs       # Tailwind CSS 配置
├── tsconfig.json             # TypeScript 配置
├── Dockerfile                # Docker 容器部署
└── package.json              # 包依赖与元信息
```

## 模块说明

### CLI (`bin/cli.mjs`)

CLI 是用户与 tlog 交互的唯一入口。

**命令流程**：

1. 解析命令行参数 (`command`, `--input`, `--output`)
2. 根据命令分发：
   - `init` → 在目标目录生成模板文件
   - `new <name>` → 创建 `<name>.toml` + `<name>.md`
   - `dev` / `build` / `preview` → 读取用户配置，通过 `fork()` 调用 Astro CLI

**Astro 调用方式**：

```js
// 动态查找 astro 的 CLI 入口
const astroBin = getAstroBin();

// 以 fork 方式在 packageRoot 下运行 astro，通过 env 传递用户配置
fork(astroBin, ['build'], {
  cwd: packageRoot,
  env: {
    ZEN_BLOG_DIR: inputDir,
    ZEN_BLOG_OUTPUT: outputDir,
    ZEN_BLOG_CONFIG: JSON.stringify(config),
  },
});
```

### 内容加载器 (`src/content/loader.ts`)

自定义的 Astro Content Collection Loader，负责从用户目录加载文章。

**核心逻辑**：

1. 读取 `ZEN_BLOG_DIR`（或回退到 `./src/content/blog`）下所有 `.toml` 文件
2. 跳过以 `.` 开头的文件（如 `.config.toml`）
3. 解析 TOML 元数据 + 对应 `.md` 文件内容
4. 注册到 Astro Content Store
5. 开发模式下监听文件变更自动重载

**文章数据结构**（schema 定义在 `src/content/config.ts`）：

```typescript
{
  title: string;          // 必填
  description?: string;   // 可选
  date: Date;             // 必填，支持 TOML 原生日期
  tags?: string[];        // 可选
  draft?: boolean;        // 可选，草稿不发布
  image?: string;         // 可选，封面图
}
```

### 配置系统 (`src/config.ts`)

从环境变量 `ZEN_BLOG_CONFIG` 读取 JSON 配置，合并默认值。

**配置接口**：

```typescript
interface SiteConfig {
  site: string;           // 站点 URL
  title: string;          // 站点标题
  slogan: string;         // 一句话介绍
  description?: string;   // SEO 描述
  bio?: string;           // 个人简介
  avatar?: string;        // 头像 URL
  social: {
    github?: string;
    linkedin?: string;
    email?: string;
    rss?: boolean;
  };
  techStack?: string[];   // 技术栈展示
  homepage: PostFilter;   // 首页文章筛选
  googleAnalysis?: string;// Google Analytics ID
  search?: boolean;       // 启用搜索
}
```

### 文章工具 (`src/utils/posts.ts`)

提供文章过滤与排序功能：

- `filterPublishedPosts()` — 排除草稿和未来日期文章
- `sortPostsByDate()` — 按日期降序排序
- `filterPosts(posts, filter)` — 按标签包含/排除 + 数量限制
- `getPostsByTag()` — 按标签获取文章
- `getAllTags()` — 获取所有标签列表

### 样式系统

基于 **Tailwind CSS v4** + **Catppuccin** 主题色：

- 浅色模式：Catppuccin Latte
- 深色模式：Catppuccin Mocha
- 代码高亮：Shiki（`catppuccin-frappe` / `catppuccin-mocha`）
- 字体：Monaspace Xenon（等宽）
- 深色模式通过 `class` 策略切换（`<html class="dark">`）

## 数据流

```
用户执行 tlog build
       │
       ▼
  CLI 解析参数
       │
       ▼
  读取 .config.toml → 解析为 SiteConfig
       │
       ▼
  fork(astro build) with env:
    ZEN_BLOG_DIR, ZEN_BLOG_OUTPUT, ZEN_BLOG_CONFIG
       │
       ▼
  Astro 启动 → config.ts 从 env 读取配置
       │
       ▼
  Content Loader 从 ZEN_BLOG_DIR 加载 .toml + .md
       │
       ▼
  Pages 渲染（使用 components + layouts）
       │
       ▼
  输出到 ZEN_BLOG_OUTPUT（默认 <input>/.dist）
```
