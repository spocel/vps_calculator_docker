# 剩余价值计算器 V4

> 一个基于 Material Design 3 的现代化剩余价值计算器，帮助用户精确计算主机、域名等周期性服务的剩余价值。

## 🚀 在线体验

| 演示地址 | 状态 |
|---------|------|
| [主站点](https://) | 暂时关闭 |
| [Cloudflare Pages](https://vps-calculator-docker.pages.dev/) | ✅ 可用 |

## 📱 界面预览

<details>
<summary>点击查看界面截图</summary>

### 亮色模式
<img src="https://image.dooo.ng/c/2025/06/05/6840a1005714b.webp" alt="亮色模式界面">

### 暗色模式
<img src="https://image.dooo.ng/c/2025/06/05/6840a10e4d331.webp" alt="亮色模式界面">

</details>

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 💱 **多币种支持** | 支持 USD、EUR、CNY 等 11 种主流货币 |
| 🔄 **实时汇率** | 自动获取最新汇率数据 |
| 📅 **灵活周期** | 月付到五年付 |
| 🎯 **精准计算** | 自动计算剩余天数和价值 |
| 🎨 **全新界面** | 采用 Material Design 3 设计语言
| 🐳 **容器化部署** | 支持 Docker 一键部署
| 📷 **截图功能** | 一键截图并上传到图床
| 🌓 **主题模式** | 支持亮色/暗色模式切换
| 📊 **流量计算** | VPS流量价值分析和溢价计算

## 🚀 快速部署

### ☁️ Cloudflare Pages 部署（推荐）

这个项目是纯静态前端应用，非常适合部署到 Cloudflare Pages。

#### 方式一：Git 集成部署（推荐）

1. **Fork 本仓库**
   ```bash
   # 点击 GitHub 页面右上角的 Fork 按钮
   # 或者克隆到你的 GitHub 账户
   ```

2. **连接到 Cloudflare Pages**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 **Pages** 页面
   - 点击 **创建项目** > **连接到 Git**
   - 选择你 Fork 的仓库
   - 配置构建设置：
     ```
     项目名称: vps-calculator（或自定义名称）
     生产分支: main
     构建命令: （留空）
     构建输出目录: /
     根目录: /
     ```
   - 点击 **保存并部署**

3. **自动部署完成**
   - Cloudflare Pages 会自动分配一个 `*.pages.dev` 域名
   - 每次推送到 main 分支都会自动重新部署

#### 🚨 常见问题故障排除

**问题1: 出现 "npx wrangler deploy" 错误**
```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

**解决方案**：
- 这是因为构建命令配置错误导致的
- **正确配置**：构建命令必须**完全留空**
- 进入项目设置 → 构建和部署 → 将构建命令清空 → 保存并重新部署

**问题2: 网站无法访问或显示404**

**解决方案**：
- 检查构建输出目录是否设置为 `/`
- 确认 `index.html` 文件在项目根目录
- 查看部署日志是否有其他错误信息

**问题3: 样式或脚本加载失败**

**解决方案**：
- 确认所有文件路径使用相对路径（如 `./styles.css`）
- 检查文件名大小写是否正确
- 验证所有外部CDN资源是否可访问

#### 方式二：直接上传部署

1. **准备文件**
   ```bash
   # 下载或克隆项目
   git clone https://github.com/realnovicedev/vps_calculator_docker.git
   cd vps_calculator_docker
   
   # 只需要这些静态文件：
   # - index.html
   # - script.js
   # - styles.css
   # - version.js
   ```

2. **上传到 Cloudflare Pages**
   - 登录 Cloudflare Dashboard
   - 进入 **Pages** 页面
   - 点击 **创建项目** > **上传资产**
   - 将上述文件拖拽到上传区域
   - 输入项目名称，点击 **部署站点**

#### 自定义域名配置（可选）

1. **添加自定义域名**
   - 在 Pages 项目页面点击 **自定义域名**
   - 点击 **设置自定义域名**
   - 输入你的域名（如 `calculator.yourdomain.com`）

2. **配置 DNS**
   - 如果域名在 Cloudflare：自动配置
   - 如果域名在其他服务商：添加 CNAME 记录指向 `<your-project>.pages.dev`

3. **SSL 证书**
   - Cloudflare 会自动为自定义域名提供免费 SSL 证书

#### 环境变量和配置

本项目无需环境变量，但你可以通过以下方式自定义：

1. **修改图床配置**
   - 编辑 `script.js` 中的 `imgHost` 对象
   - 设置你自己的图床地址和 Token

2. **修改汇率 API**
   - 在 `script.js` 中修改 `fetchExchangeRate` 函数
   - 替换为你偏好的汇率数据源

#### 性能优化建议

1. **启用 Cloudflare 优化**
   - 在域名的 **Speed** 页面启用：
     - Auto Minify (CSS, JS, HTML)
     - Brotli 压缩
     - HTTP/2 和 HTTP/3

2. **缓存配置**
   - 静态资源已通过版本参数自动缓存刷新
   - 无需额外配置

3. **监控和分析**
   - 在 Pages 项目中查看 **Analytics**
   - 可配置 Google Analytics 或其他分析工具

### 🐳 Docker 部署

```bash
docker run -d --name=jsq -p 8089:80 bobby567/calculator:latest
```

### 🌐 其他平台部署

| 平台 | 部署方式 | 特点 |
|------|----------|------|
| **GitHub Pages** | 启用 GitHub Pages，选择 main 分支 | 免费，与 GitHub 集成 |
| **Vercel** | 导入项目，自动部署 | 快速，支持 Serverless |
| **Netlify** | 拖拽文件夹或连接 Git 仓库 | 简单易用，功能丰富 |

## 🔧 开发和自定义

### 本地开发

```bash
# 克隆项目
git clone https://github.com/realnovicedev/vps_calculator_docker.git
cd vps_calculator_docker

# 使用任何 HTTP 服务器运行
# 例如 Python
python -m http.server 8080

# 或者 Node.js
npx http-server

# 访问 http://localhost:8080
```

### 自定义配置

1. **修改图床设置**
   ```javascript
   // 在 script.js 中修改
   const imgHost = {
       type: "LskyPro", // 或 "EasyImages"
       url: "https://your-imghost.com",
       token: "your-token",
       copyFormat: "markdown" // 或 "url"
   };
   ```

2. **添加新功能**
   - 所有核心逻辑在 `script.js` 中
   - 样式在 `styles.css` 中使用 Material Design 3
   - HTML 结构在 `index.html` 中

## 🔗 相关链接

| 项目 | 链接 |
|------|------|
| 🏠 **本项目** | [GitHub](https://github.com/realnovicedev/vps_calculator_docker) |
| 🌱 **原项目** | [vps_surplus_value](https://github.com/Tomzhao1016/vps_surplus_value) |
| 📖 **Material Web** | [官方文档](https://material-web.dev/) |
| ☁️ **Cloudflare Pages** | [官方文档](https://developers.cloudflare.com/pages/) |

## 🙏 致谢

感谢以下项目和个人的贡献：

- [pengzhile](https://linux.do/t/topic/227730/26) - 实时汇率 API 代码
- [Dooongの公益图床](https://www.nodeseek.com/post-43196-1) - 提供图床服务
- [NodeSeek 编辑器增强脚本](https://www.nodeseek.com/post-74493-1) - 图床上传代码参考
- mjj - 大鸡腿

## 📄 许可协议

本项目遵循原项目的开源许可协议。
