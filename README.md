# NegotiationForge

> 对抗式谈判模拟与决策推演引擎

NegotiationForge 是一个面向谈判训练、策略复盘与分叉推演的 AI 系统。  
你可以选择一个谈判场景，与具有独立目标、底线、情绪与策略切换能力的 AI 对手展开多轮博弈；谈判结束后，系统会继续做态势分析、关键转折点识别、复盘总结，以及关键节点上的替代路径推演。

本仓库当前包含一个完整可运行的前后端版本：

- 前端：Next.js 15 + React 19 + TypeScript
- 后端：FastAPI + Pydantic + SQLite
- LLM 适配：DeepSeek / OpenAI Compatible / Gemini

英文说明见 [README-EN.md](./README-EN.md)。

---

## 项目亮点

- AI 谈判对手：不是简单聊天机器人，而是带有目标、预算、底线与阶段策略的对手代理。
- 实时态势分析：对每一轮对话给出议价力、信息优势、关系温度、达成概率、满意度等评分。
- 关键转折识别：自动标记谈判中的关键节点，供赛后复盘与分叉推演使用。
- 博弈分叉树：在关键节点生成替代策略，并模拟后续两层反应链路。
- 复盘报告：输出结构化总结，帮助你知道哪里推动了结果，哪里拖垮了结果。
- 本地优先开发：默认 SQLite + 本地环境变量配置，上手成本低。

---

## 当前功能阶段

- [x] Phase 1：核心谈判会话
- [x] Phase 2：态势分析与关键转折点识别
- [x] Phase 3：关键节点分叉树生成与展示
- [ ] Phase 4：更完整的场景编辑器与可视化交互
- [ ] Phase 5：部署模板、数据持久化增强、多人协作与评测

---

## 项目结构

```text
NegotiationForge/
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ db/
│  │  ├─ llm/
│  │  ├─ models/
│  │  └─ services/
│  ├─ scenarios/
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  ├─ package.json
│  └─ .env.local.example
├─ docs/
├─ .github/
├─ CODE_OF_CONDUCT.md
├─ CONTRIBUTING.md
├─ CONTRIBUTING-EN.md
├─ LICENSE
├─ README.md
└─ README-EN.md
```

---

## 快速开始

### 1. 环境要求

- Python 3.11+
- Node.js 20+
- 一个可用的 LLM API Key
  - 默认推荐 DeepSeek
  - 也支持 OpenAI Compatible 和 Gemini

### 2. 克隆仓库

```bash
git clone https://github.com/<your-github-username>/NegotiationForge.git
cd NegotiationForge
```

### 3. 启动后端

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

macOS / Linux:

```bash
source .venv/bin/activate
```

安装依赖并配置环境变量：

```bash
pip install -r requirements.txt
cp .env.example .env
```

启动后端：

```bash
uvicorn app.main:app --reload
```

### 4. 启动前端

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

打开浏览器访问：

```text
http://localhost:3000
```

---

## 环境变量

后端环境变量示例在 [backend/.env.example](./backend/.env.example)。  
前端环境变量示例在 [frontend/.env.local.example](./frontend/.env.local.example)。

默认开发配置：

- 后端 API：`http://localhost:8000`
- 前端页面：`http://localhost:3000`

---

## 适用场景

- 谈判训练
- 话术演练
- 博弈路径复盘
- AI Agent 行为设计实验
- 人机对抗式决策界面原型

---

## 截图与演示

建议你在正式发布到 GitHub 前补充：

- 首页截图
- 正式谈判界面截图
- 赛后复盘截图
- 分叉树界面截图

可以把图片放到 `docs/images/` 后在 README 中引用。

---

## 开发说明

- 后端所有核心流程都使用异步 `async/await`
- LLM 调用统一通过 `backend/app/llm/factory.py`
- 分析、复盘、分叉树均是独立服务模块，方便继续扩展
- 当前默认数据库为 SQLite，本地开发体验优先

架构说明可见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

---

## 开源协作

欢迎提交 Issue 和 Pull Request。

- 中文贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- English contributing guide: [CONTRIBUTING-EN.md](./CONTRIBUTING-EN.md)
- 社区行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## 使用说明与免责声明

本项目主要用于：

- 研究
- 学习
- 交互设计实验
- 谈判训练与策略演练

请不要将本项目输出直接作为高风险法律、劳动、投资、医疗或商业决策的唯一依据。  
LLM 输出可能出现事实错误、偏见或不稳定行为，使用者需要自行判断和复核。

---

## License

本项目采用 [MIT License](./LICENSE) 开源。
