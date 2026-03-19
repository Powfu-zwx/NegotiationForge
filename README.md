# NegotiationForge

> 对抗式谈判模拟与决策推演引擎

选择一个谈判场景，与具有独立目标和策略的 AI 对手展开多轮博弈。谈判结束后，在每个关键决策节点生成替代路径，输出完整的博弈分叉树——让你在平行世界中看见每一个选择的后果。

---

## 核心功能

- **AI 谈判对手**：拥有独立目标、底线与策略的对手 Agent，表现出不完全理性
- **实时态势分析**：多维度评估议价力、信息优势、达成协议概率等指标
- **博弈分叉树**：在关键转折点生成替代策略，推演平行走向
- **复盘报告**：谈判结束后输出结构化的策略得失分析

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js · React · TypeScript |
| 后端 | Python · FastAPI |
| LLM | DeepSeek V3.2（主力）· 统一接口层支持多模型切换 |
| 数据库 | SQLite（开发）→ PostgreSQL（生产） |
| 部署 | Vercel（前端）· Railway（后端） |

---

## 快速开始

### 环境要求

- Python 3.11+
- Node.js 20+
- DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com)，支持支付宝/微信充值）

### 本地运行

**1. 克隆仓库**

```bash
git clone https://github.com/your-username/negotiationforge.git
cd negotiationforge
```

**2. 启动后端**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # 填入你的 API Key
uvicorn app.main:app --reload
```

**3. 启动前端**

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

**4. 访问应用**

打开浏览器访问 `http://localhost:3000`

---

## 项目结构

```
negotiationforge/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI 入口
│   │   ├── api/routes/       # API 路由
│   │   ├── core/             # 配置、依赖注入
│   │   └── llm/              # LLM 统一接口层
│   │       └── providers/    # DeepSeek / OpenAI / Gemini 适配器
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/
│   └── lib/
├── docs/                     # 设计文档
├── .gitignore
├── LICENSE
└── README.md
```

---

## 开发路线图

- [x] Phase 0：技术栈搭建，LLM 接口跑通
- [ ] Phase 1：核心谈判对话（场景系统 · 对手 Agent · 对话管理）
- [ ] Phase 2：博弈态势分析（关键节点识别 · 多维评分 · 复盘报告）
- [ ] Phase 3：博弈分叉树引擎（替代策略生成 · 平行推演 · 树结构存储）
- [ ] Phase 4：前端可视化（分叉树交互 · 态势面板 · 场景编辑器）
- [ ] Phase 5：打磨与发布

---

## 内置场景

| 场景 | 难度 | 说明 |
|------|------|------|
| 薪资谈判 | ★★☆ | 与 HR 谈入职薪资，双方信息不对称 |
| 商务合同议价 | ★★★ | B2B 采购合同，多议题并行 |
| 租房谈判 | ★☆☆ | 与房东协商价格和条款 |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。在开始之前，请阅读 `docs/CONTRIBUTING.md`。

---

## License

[MIT](./LICENSE)
