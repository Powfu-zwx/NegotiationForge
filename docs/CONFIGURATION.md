# 配置说明

> NegotiationForge 前后端环境变量与常见配置组合

## 1. 后端环境变量

后端模板文件：[`backend/.env.example`](../backend/.env.example)

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `APP_ENV` | 运行环境标识 | `development` |
| `APP_HOST` | 服务监听地址 | `0.0.0.0` |
| `APP_PORT` | 服务监听端口 | `8000` |
| `DEBUG` | 是否开启调试 | `true` |
| `ALLOWED_ORIGINS` | 允许跨域来源 | `http://localhost:3000` |
| `LLM_PROVIDER` | 当前 LLM provider | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek Key | 空 |
| `DEEPSEEK_BASE_URL` | DeepSeek 接口地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | DeepSeek 模型名 | `deepseek-chat` |
| `OPENAI_API_KEY` | OpenAI Compatible Key | 空 |
| `OPENAI_BASE_URL` | OpenAI Compatible 地址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | OpenAI Compatible 模型名 | `gpt-4o-mini` |
| `GEMINI_API_KEY` | Gemini Key | 空 |
| `GEMINI_BASE_URL` | Gemini 地址 | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_MODEL` | Gemini 模型名 | `gemini-2.0-flash` |
| `DATABASE_URL` | 数据库连接串 | `sqlite+aiosqlite:///./negotiationforge.db` |

---

## 2. 前端环境变量

前端模板文件：[`frontend/.env.local.example`](../frontend/.env.local.example)

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | 前端访问的 API 根路径 | `http://localhost:8000/api/v1` |

---

## 3. Provider 切换

### DeepSeek

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### OpenAI Compatible

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### Gemini

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-2.0-flash
```

切换 provider 时，通常只需要：

1. 修改 `LLM_PROVIDER`
2. 配好对应 API Key
3. 确认 `BASE_URL` 与 `MODEL` 匹配

---

## 4. 数据库配置

当前默认配置：

```env
DATABASE_URL=sqlite+aiosqlite:///./negotiationforge.db
```

这意味着数据库文件会生成在 `backend/negotiationforge.db`。

SQLite 的优点：

- 本地开发成本低
- 无需单独安装数据库服务
- 启动快

如果后续需要更强的并发与协作能力，可以迁移到 PostgreSQL。

---

## 5. 前后端联调配置

本地联调最常见的组合是：

后端：

```env
APP_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

前端：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

如果你修改了后端端口，比如改成 `9000`，前端也要同步修改：

```env
NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
```

---

## 6. 常见配置错误

### 6.1 模型名和 Provider 不匹配

例如：

- `LLM_PROVIDER=deepseek`
- 但 `DEEPSEEK_MODEL` 却填了 Gemini 或 OpenAI 模型名

这种情况下，请求通常会失败。

### 6.2 Base URL 错误

如果你使用的是兼容 OpenAI 的第三方平台，需要把 `OPENAI_BASE_URL` 改成那个平台自己的地址，而不是保留默认 `api.openai.com`。

### 6.3 前端 API 地址缺少 `/api/v1`

当前前端请求默认都依赖 `/api/v1` 前缀，所以不要只写成：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

正确写法应为：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 7. 推荐配置策略

### 本地开发

- 使用 SQLite
- 使用 `deepseek-chat`
- 前后端都跑在本机

### 演示环境

- 保持 SQLite 或换成 PostgreSQL
- 使用更稳定的模型 provider
- 固定一个可控场景用于展示

### 后续生产化

- 增加更细的日志与监控
- 增加用户隔离与鉴权
- 增加更稳的异步任务与队列系统

---

## 8. 相关阅读

- [快速开始](./QUICKSTART.md)
- [架构说明](./ARCHITECTURE.md)
- [English Configuration](./CONFIGURATION-EN.md)
