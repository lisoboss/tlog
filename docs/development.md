# 开发指南

## 环境要求

- **Node.js** >= 18（推荐 v22+）
- **pnpm** >= 10

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 本地链接 CLI

将 `tlog` 命令链接到全局，方便在任意目录测试：

```bash
pnpm link --global
```

之后可以在任意目录使用 `tlog` 命令：

```bash
mkdir ~/test-blog && cd ~/test-blog
tlog init
tlog dev
```

### 直接调试

也可以直接运行 CLI 脚本：

```bash
node bin/cli.mjs init --input /tmp/test-blog
node bin/cli.mjs dev --input /tmp/test-blog
```

## 新增功能

### 添加页面

在 `src/pages/` 下创建 `.astro` 文件。Astro 使用文件系统路由：

| 文件 | 路由 |
|---|---|
| `src/pages/about.astro` | `/about` |
| `src/pages/blog/[slug].astro` | `/blog/:slug` |
| `src/pages/tags/[tag].astro` | `/tags/:tag` |

### 添加组件

在 `src/components/` 下创建 `.astro` 文件，在页面或布局中导入使用：

```astro
---
import MyComponent from '../components/MyComponent.astro';
---
<MyComponent title="Hello" />
```

### 添加配置项

1. 在 `src/config.ts` 的 `SiteConfig` 接口中添加字段
2. 在 `defaultConfig` 中设置默认值
3. 在 `bin/cli.mjs` 的 `loadUserConfig()` 中从 TOML 读取
4. 在 `init` 命令的模板 `.config.toml` 中添加该字段

### 修改内容加载逻辑

编辑 `src/content/loader.ts`。注意：

- Schema 定义在 `src/content/config.ts`，修改字段需同步
- `toDate()` 处理 TOML 日期类型转换
- 开发模式下的 watcher 需覆盖变更情况

### 添加样式

全局样式在 `src/styles/global.css`，使用 Tailwind CSS v4 语法。

Catppuccin 颜色变量通过 `var(--catppuccin-color-*)` 使用，常用：

| 变量 | 用途 |
|---|---|
| `--catppuccin-color-text` | 正文颜色 |
| `--catppuccin-color-base` | 背景色 |
| `--catppuccin-color-mauve` | 链接/强调色 |
| `--catppuccin-color-surface0` | 代码块背景 |
| `--catppuccin-color-overlay2` | 次要元素 |

## 构建与发布

### 构建测试

```bash
tlog build --input /path/to/test-blog
```

输出目录默认为 `<input>/.dist`。

### 发布到 npm

```bash
# 更新 package.json 中的版本号
pnpm version patch  # 或 minor / major

# 发布
pnpm publish
```

### Docker

#### 构建镜像

```bash
docker build -t tlog .
```

#### 初始化博客

```bash
docker run --rm -v /path/to/blog:/blog tlog init
```

会在挂载的目录下生成 `.config.toml`、示例文章和 favicon。

#### 开发模式

```bash
docker run --rm -v /path/to/blog:/blog -p 4321:4321 tlog dev
```

访问 `http://localhost:4321` 预览，修改挂载目录中的文件会自动热更新。

> 注意：Astro dev server 默认监听 `localhost`，容器内需要绑定 `0.0.0.0` 才能从宿主机访问。如果无法访问，尝试添加 `--host` 参数：
>
> ```bash
> docker run --rm -v /path/to/blog:/blog -p 4321:4321 tlog dev -- --host 0.0.0.0
> ```

#### 构建站点

```bash
docker run --rm -v /path/to/blog:/blog tlog build
```

构建产物输出到 `/path/to/blog/.dist/`。

也可以指定输出目录：

```bash
docker run --rm \
  -v /path/to/blog:/blog \
  -v /path/to/output:/output \
  tlog build --output /output
```

#### 预览构建结果

```bash
docker run --rm -v /path/to/blog:/blog -p 4321:4321 tlog preview
```

#### 创建新文章

```bash
docker run --rm -v /path/to/blog:/blog tlog new my-new-post
```

#### Docker Compose

创建 `docker-compose.yml`：

```yaml
services:
  blog:
    build: /path/to/tlog
    volumes:
      - ./my-blog:/blog
    ports:
      - "4321:4321"
    command: dev -- --host 0.0.0.0
```

```bash
docker compose up       # 启动开发服务器
docker compose run blog build   # 构建
docker compose run blog new my-post  # 新建文章
```

## 测试流程

由于项目目前没有自动化测试，建议手动验证：

1. **init**：在空目录执行 `tlog init`，检查生成的文件
2. **new**：执行 `tlog new test-post`，检查 TOML + MD 文件
3. **dev**：启动 dev server，访问各页面检查渲染
4. **build**：构建后检查 `.dist/` 输出
5. **边界情况**：无配置文件、重复文章名、草稿文章、未来日期文章
