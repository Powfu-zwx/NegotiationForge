# Quick Start

> Get NegotiationForge running locally from scratch

## 1. Requirements

Before you begin, make sure you have:

- Python 3.11+
- Node.js 20+
- npm
- one usable LLM API key

Recommended first choice:

- DeepSeek API key

The repository examples are already oriented around DeepSeek as the default provider.

---

## 2. Clone the repository

```bash
git clone https://github.com/Powfu-zwx/NegotiationForge.git
cd NegotiationForge
```

If you prefer SSH:

```bash
git clone git@github.com:Powfu-zwx/NegotiationForge.git
cd NegotiationForge
```

---

## 3. Start the backend

Enter the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

### Windows activation

```powershell
.venv\Scripts\activate
```

### macOS / Linux activation

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy the environment template:

```bash
cp .env.example .env
```

On Windows PowerShell you can also use:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and make sure at least these values are valid:

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Once it is up, you can open:

- `http://localhost:8000/`
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

---

## 4. Start the frontend

Open another terminal and enter the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Copy the frontend environment template:

```bash
cp .env.local.example .env.local
```

Or on Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Confirm the API base URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 5. First complete walkthrough

Recommended first pass:

1. open the homepage and choose a scenario
2. create a session and enter the live negotiation screen
3. exchange several rounds with the AI opponent
4. finish the session manually or let it end naturally
5. generate the recap report
6. trigger the fork tree
7. inspect the mainline plus alternative branches

---

## 6. Common startup issues

### 6.1 Backend reports `No module named 'aiosqlite'`

That usually means dependencies were not installed in the active Python environment. Run:

```bash
pip install -r requirements.txt
```

### 6.2 The frontend opens, but backend requests fail

Check:

- whether the backend is really running at `http://localhost:8000`
- whether `NEXT_PUBLIC_API_URL` in `frontend/.env.local` is correct
- whether the browser console shows a network or CORS error

### 6.3 Recap or fork-tree generation fails

Check:

- whether the API key is valid
- whether the base URL is correct
- whether the network is stable
- whether the configured model name exists for that provider

### 6.4 GitHub push fails

If HTTPS 443 is blocked in your network, switch to SSH and route GitHub traffic through `ssh.github.com:443`.

---

## 7. Suggested development order

If you plan to keep building this project, a good order is:

1. add more negotiation scenarios
2. improve analysis and recap quality
3. expand fork-tree depth and interactivity
4. then address accounts, deployment, and collaboration

---

## 8. Further Reading

- [Configuration](./CONFIGURATION-EN.md)
- [Architecture](./ARCHITECTURE-EN.md)
- [中文快速开始](./QUICKSTART.md)
