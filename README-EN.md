# NegotiationForge

> An adversarial negotiation simulator and decision rehearsal engine

NegotiationForge is an AI system for negotiation training, tactical review, and counterfactual path exploration.  
You can pick a scenario, negotiate with an AI opponent that has its own goals, constraints, emotional state, and strategy shifts, then review the session through live analysis, turning-point detection, recap generation, and fork-tree simulation.

Chinese documentation is available in [README.md](./README.md).

---

## Highlights

- AI negotiation opponent with goals, budget, bottom line, and phase-based strategy changes
- Live tactical scoring for leverage, information advantage, relationship, agreement probability, and satisfaction
- Turning-point detection for critical moves in the mainline conversation
- Fork-tree simulation that explores alternative moves from key negotiation moments
- Structured post-session recap for strategy review and improvement
- Local-first development workflow with SQLite and simple environment-based setup

---

## Current Status

- [x] Phase 1: Core negotiation loop
- [x] Phase 2: Situation analysis and turning-point detection
- [x] Phase 3: Fork-tree generation and visualization
- [ ] Phase 4: Scenario editor and richer visual interaction
- [ ] Phase 5: Deployment templates, stronger persistence, collaboration, and evaluation

---

## Repository Layout

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

## Quick Start

### 1. Requirements

- Python 3.11+
- Node.js 20+
- A working LLM API key
  - DeepSeek is the default recommendation
  - OpenAI-compatible and Gemini endpoints are also supported

### 2. Clone the repository

```bash
git clone https://github.com/<your-github-username>/NegotiationForge.git
cd NegotiationForge
```

### 3. Run the backend

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

Install dependencies and configure environment variables:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Start the API server:

```bash
uvicorn app.main:app --reload
```

### 4. Run the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment Variables

- Backend example: [backend/.env.example](./backend/.env.example)
- Frontend example: [frontend/.env.local.example](./frontend/.env.local.example)

Default local setup:

- Backend API: `http://localhost:8000`
- Frontend UI: `http://localhost:3000`

---

## Typical Use Cases

- Negotiation training
- Conversation strategy rehearsal
- Counterfactual decision analysis
- AI agent behavior experiments
- Human-AI adversarial interface prototyping

---

## Screenshots

Before publishing the repository publicly, it is worth adding:

- landing page screenshot
- live negotiation screenshot
- recap modal screenshot
- fork-tree screenshot

Place assets under `docs/images/` and reference them from the README.

---

## Development Notes

- The backend uses asynchronous `async/await` flows throughout the core path
- All LLM calls go through `backend/app/llm/factory.py`
- Analysis, recap, and fork-tree generation are split into dedicated services
- SQLite is the default persistence layer for local development

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for architecture notes.

---

## Contributing

Issues and pull requests are welcome.

- Chinese guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- English guide: [CONTRIBUTING-EN.md](./CONTRIBUTING-EN.md)
- Community rules: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

---

## Disclaimer

This project is intended for:

- research
- learning
- interface experiments
- negotiation practice and tactical rehearsal

Do not use the output of this project as the sole basis for high-stakes legal, employment, investment, medical, or business decisions.  
LLM output may be incorrect, biased, or unstable, and should always be reviewed critically.

---

## License

This project is released under the [MIT License](./LICENSE).
