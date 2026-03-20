# 贡献指南

感谢你对 NegotiationForge 的关注。

这个项目目前仍处于快速演进阶段。欢迎你提交 Issue、改进建议和 Pull Request，但请尽量遵循下面这些约定，这样维护成本会低很多。

## 开始之前

- 先阅读 [README.md](./README.md)
- 先看一眼 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- 大改动前，先提一个 Issue 说明你的目标和方案

## 适合提交的内容

- Bug 修复
- 文档修正
- 前后端体验优化
- 新场景补充
- 测试完善
- 明确边界内的功能增强

## 不建议直接提交的大改动

- 大规模重构但没有先讨论
- 引入新的重型依赖
- 破坏现有 API 兼容性的改动
- 与项目方向无关的“顺手优化”

## 分支与提交建议

- 保持单个 PR 聚焦一个问题
- 提交信息尽量明确，例如：
  - `fix: handle summary fallback on upstream failure`
  - `feat: add fork tree polling panel`
  - `docs: rewrite open source README`

## 本地开发

### 后端

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 前端

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## 提交前检查

### 后端

```bash
python -m compileall backend/app
```

### 前端

```bash
cd frontend
npx tsc --noEmit
npm run build
```

## 代码风格

- 后端优先保持异步 `async/await`
- LLM 调用统一走 `backend/app/llm/factory.py`
- 数据结构统一放在 `backend/app/models/`
- 前端类型优先集中在 `frontend/lib/`
- 不随意引入新依赖
- 不提交密钥、数据库、构建产物或本地环境文件

## Issue 建议写法

如果你提 Issue，尽量包含：

- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 日志或截图
- 运行环境

## Pull Request 建议写法

PR 描述里建议写清楚：

- 这个改动解决了什么问题
- 改了哪些主要文件
- 有没有潜在风险
- 你做了哪些验证

## License

向本仓库提交代码，即表示你同意你的贡献在本项目的 MIT License 下分发。
