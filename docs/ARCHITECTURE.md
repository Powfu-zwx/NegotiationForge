# 架构说明

## 目录职责

### backend/app/api/routes/
各业务模块的 HTTP 路由。每个文件对应一类资源：
- `health.py`：健康检查，Phase 0 验证技术栈
- `chat.py`：谈判对话接口（Phase 1）
- `scenarios.py`：场景管理（Phase 1）
- `analysis.py`：态势分析（Phase 2）
- `tree.py`：分叉树生成与查询（Phase 3）

### backend/app/core/
跨模块共享的基础设施：
- `config.py`：从环境变量加载配置，单例模式
- `dependencies.py`：FastAPI 依赖注入（Phase 1+）

### backend/app/llm/
LLM 统一接口层，核心设计原则：上层代码不感知具体模型。

```
llm/
├── base.py          # 抽象基类 LLMProvider，定义 chat() 接口
└── providers/
    ├── deepseek.py  # DeepSeek 适配器（默认）
    ├── openai.py    # OpenAI 适配器（备用）
    └── gemini.py    # Gemini 适配器（备用）
```

切换模型只需修改 `.env` 中的 `LLM_PROVIDER`，代码零改动。

## 关键设计决策

**为什么 LLM 接口层要抽象？**
分叉树推演阶段需要同时调用两种模型：主线用高质量模型，推演用轻量模型。
抽象层让这个混用策略在不侵入业务逻辑的前提下实现。

**为什么用 SQLite 而不是直接 PostgreSQL？**
Phase 0~2 阶段无需考虑并发，SQLite 零配置、零运维，专注产品逻辑。
迁移时只需修改 `DATABASE_URL`，SQLAlchemy ORM 层代码不变。
