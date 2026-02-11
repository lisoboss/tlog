# 内容系统

## 文章文件格式

每篇文章由两个同名文件组成：

```
my-post.toml    # 元数据
my-post.md      # 正文内容
```

文件名即为 URL slug（`/blog/my-post`）。

### TOML 元数据

```toml
[metadata]
title = "文章标题"
description = "简短描述"
date = 2026-02-11
tags = ["tag1", "tag2"]
draft = false
image = ""
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | ✅ | 文章标题 |
| `description` | string | ❌ | SEO 描述 |
| `date` | date | ✅ | 发布日期（TOML 原生日期格式） |
| `tags` | string[] | ❌ | 标签列表 |
| `draft` | boolean | ❌ | `true` 时不发布 |
| `image` | string | ❌ | 封面图 URL |

> 支持 `[metadata]` 包裹或扁平 TOML 格式。

### Markdown 正文

标准 Markdown 语法，由 Astro 内置的 Markdown 处理器渲染。

代码块语法高亮使用 Shiki，支持所有常见语言。

## 发布规则

文章在满足以下条件时才会在站点上显示：

1. `draft` 不为 `true`
2. `date` 不晚于当前日期

相关逻辑见 `src/utils/date.ts` 的 `isPublished()` 和 `src/utils/posts.ts` 的 `filterPublishedPosts()`。

## 内容加载流程

`src/content/loader.ts` 实现了 Astro Content Collection 的自定义 Loader：

1. 扫描 `ZEN_BLOG_DIR` 目录下所有 `.toml` 文件
2. 跳过以 `.` 开头的文件（如 `.config.toml`）
3. 对每个 `.toml` 文件：
   - 解析 TOML 元数据
   - 读取同名 `.md` 文件作为正文
   - 通过 `parseData()` 校验数据格式
   - 存入 Astro Content Store
4. 开发模式下注册 watcher，文件变更时自动重载

## 站点配置

用户博客目录下的 `.config.toml` 文件：

```toml
[site]
url = "https://example.com"       # 站点 URL（用于 sitemap/RSS）
title = "My Blog"                 # 站点标题
slogan = "Welcome to my blog."   # 标语
description = "A personal blog." # SEO 描述
bio = "Hello, I'm a developer." # 个人简介
avatar = ""                      # 头像 URL

[social]
github = "https://github.com/username"
email = "email@example.com"
rss = true                       # 是否开启 RSS Feed

[homepage]
maxPosts = 5                     # 首页最多展示文章数
tags = []                        # 只展示这些标签的文章
excludeTags = []                 # 排除这些标签的文章

[features]
techStack = ["JavaScript", "TypeScript", "Astro"]  # 技术栈展示
googleAnalysis = ""              # Google Analytics Measurement ID
search = true                    # 是否开启全文搜索
```

## 静态资源

用户博客目录下的 `.public/` 目录用于存放静态资源（如 favicon），对应 Astro 的 `publicDir` 配置。

`tlog init` 会自动生成一个 SVG favicon（取站点标题首字母）。
