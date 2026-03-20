# Configuration

> Environment variables and common setup combinations for NegotiationForge

## 1. Backend environment variables

Backend template file: [`backend/.env.example`](../backend/.env.example)

| Variable | Description | Default |
| --- | --- | --- |
| `APP_ENV` | Runtime environment label | `development` |
| `APP_HOST` | Bind host | `0.0.0.0` |
| `APP_PORT` | Bind port | `8000` |
| `DEBUG` | Debug mode | `true` |
| `ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `LLM_PROVIDER` | Active LLM provider | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek key | empty |
| `DEEPSEEK_BASE_URL` | DeepSeek base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | DeepSeek model name | `deepseek-chat` |
| `OPENAI_API_KEY` | OpenAI-compatible key | empty |
| `OPENAI_BASE_URL` | OpenAI-compatible base URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | OpenAI-compatible model name | `gpt-4o-mini` |
| `GEMINI_API_KEY` | Gemini key | empty |
| `GEMINI_BASE_URL` | Gemini base URL | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///./negotiationforge.db` |

---

## 2. Frontend environment variables

Frontend template file: [`frontend/.env.local.example`](../frontend/.env.local.example)

| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL used by frontend API requests | `http://localhost:8000/api/v1` |

---

## 3. Provider switching

### DeepSeek

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

### OpenAI-compatible

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

To switch providers, you usually only need to:

1. change `LLM_PROVIDER`
2. set the matching API key
3. make sure `BASE_URL` and `MODEL` match that provider

---

## 4. Database configuration

Current default:

```env
DATABASE_URL=sqlite+aiosqlite:///./negotiationforge.db
```

That means the database file will live under `backend/negotiationforge.db`.

Why SQLite is used by default:

- very low local setup cost
- no separate database service required
- fast startup for development

If you later need stronger concurrency or collaboration support, PostgreSQL is the natural upgrade path.

---

## 5. Frontend/backend local pairing

The most common local setup is:

Backend:

```env
APP_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

If you change the backend port, for example to `9000`, update the frontend accordingly:

```env
NEXT_PUBLIC_API_URL=http://localhost:9000/api/v1
```

---

## 6. Common configuration mistakes

### 6.1 Model name does not match provider

Example:

- `LLM_PROVIDER=deepseek`
- but `DEEPSEEK_MODEL` is set to a Gemini or OpenAI model

That will usually fail at runtime.

### 6.2 Wrong base URL

If you are using a third-party OpenAI-compatible platform, set `OPENAI_BASE_URL` to that platform's URL instead of the default OpenAI endpoint.

### 6.3 Frontend API URL missing `/api/v1`

Do not set:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 7. Recommended setup patterns

### Local development

- SQLite
- `deepseek-chat`
- frontend and backend both on localhost

### Demo environment

- SQLite or PostgreSQL
- a stable model provider
- one fixed scenario for a predictable walkthrough

### Future productionization

- stronger logging and monitoring
- user isolation and auth
- a more robust async task or queue layer

---

## 8. Related Docs

- [Quick Start](./QUICKSTART-EN.md)
- [Architecture](./ARCHITECTURE-EN.md)
- [中文配置说明](./CONFIGURATION.md)
