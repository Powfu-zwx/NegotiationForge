# 快速开始

> 从零启动 NegotiationForge 的本地开发环境

## 1. 环境要求

开始前请确认本机已安装：

- Python 3.11+
- Node.js 20+
- npm
- 一个可用的 LLM API Key

推荐优先准备：

- DeepSeek API Key

因为仓库默认示例环境变量已经以 DeepSeek 为第一默认项。

---

## 2. 克隆仓库

```bash
git clone https://github.com/Powfu-zwx/NegotiationForge.git
cd NegotiationForge
```

如果你通过 SSH 推送仓库，也可以用：

```bash
git clone git@github.com:Powfu-zwx/NegotiationForge.git
cd NegotiationForge
```

---

## 3. 启动后端

进入后端目录：

```bash
cd backend
```

创建虚拟环境：

```bash
python -m venv .venv
```

### Windows 激活方式

```powershell
.venv\Scripts\activate
```

### macOS / Linux 激活方式

```bash
source .venv/bin/activate
```

安装依赖：

```bash
pip install -r requirements.txt
```

复制环境变量模板：

```bash
cp .env.example .env
```

如果你在 Windows PowerShell 下执行复制命令，也可以用：

```powershell
Copy-Item .env.example .env
```

然后编辑 `.env`，至少保证以下变量有效：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

启动后端：

```bash
uvicorn app.main:app --reload
```

成功后可以访问：

- `http://localhost:8000/`
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

---

## 4. 启动前端

打开新终端，进入前端目录：

```bash
cd frontend
```

安装依赖：

```bash
npm install
```

复制前端环境变量模板：

```bash
cp .env.local.example .env.local
```

Windows PowerShell 也可以用：

```powershell
Copy-Item .env.local.example .env.local
```

确认 `.env.local` 中的 API 地址正确：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

启动前端：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:3000
```

---

## 5. 第一次完整操作流程

建议你按下面这条路径体验：

1. 进入首页，选择一个可用谈判场景
2. 创建 session，进入正式谈判界面
3. 连续发送几轮消息，观察右侧态势分析
4. 手动结束谈判，或让会话自动进入终态
5. 点击生成复盘报告
6. 点击生成博弈分叉树
7. 查看主线节点与替代路径

---

## 6. 常见启动问题

### 6.1 后端报 `No module named 'aiosqlite'`

说明当前 Python 环境依赖没有装完整，重新执行：

```bash
pip install -r requirements.txt
```

### 6.2 前端能开，但请求后端失败

优先排查：

- 后端是否真的运行在 `http://localhost:8000`
- `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL` 是否正确
- 浏览器控制台是否有跨域或网络错误

### 6.3 复盘或分叉树生成失败

优先检查：

- API Key 是否有效
- Base URL 是否正确
- 当前网络是否稳定
- 对应模型名是否可用

### 6.4 GitHub 推送失败

如果 HTTPS 443 在当前网络环境不可用，建议改用 SSH，并通过 `ssh.github.com:443` 走 GitHub 的 SSH over 443。

---

## 7. 推荐开发顺序

如果你要继续扩展这个项目，建议顺序如下：

1. 先新增更多谈判场景
2. 再扩展分析与复盘质量
3. 再增强 fork tree 的深度和交互
4. 最后处理用户体系、部署和协作能力

---

## 8. 进一步阅读

- [配置说明](./CONFIGURATION.md)
- [架构说明](./ARCHITECTURE.md)
- [English Quick Start](./QUICKSTART-EN.md)
