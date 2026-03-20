# Contributing

Thanks for your interest in NegotiationForge.

The project is still evolving quickly. Issues, suggestions, and pull requests are welcome, but please keep changes focused and easy to review.

## Before You Start

- Read [README-EN.md](./README-EN.md)
- Review [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- For large changes, open an issue first and explain the direction

## Good Contributions

- bug fixes
- documentation improvements
- frontend / backend usability improvements
- new scenarios
- better tests
- scoped feature enhancements aligned with the project direction

## Changes That Need Discussion First

- large refactors
- new heavyweight dependencies
- breaking API changes
- unrelated cleanup bundled into functional work

## Branches and Commits

- Keep each PR focused on one problem
- Prefer clear commit messages, for example:
  - `fix: handle summary fallback on upstream failure`
  - `feat: add fork tree polling panel`
  - `docs: rewrite open source README`

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Checks Before Opening a PR

### Backend

```bash
python -m compileall backend/app
```

### Frontend

```bash
cd frontend
npx tsc --noEmit
npm run build
```

## Coding Expectations

- Keep backend flows asynchronous where possible
- Route LLM calls through `backend/app/llm/factory.py`
- Keep shared data models in `backend/app/models/`
- Keep frontend types centralized in `frontend/lib/`
- Avoid adding dependencies casually
- Never commit secrets, databases, or local environment files

## Good Issue Reports Include

- what happened
- how to reproduce it
- expected behavior
- actual behavior
- logs or screenshots
- environment details

## Good PR Descriptions Include

- what problem is being solved
- the main files changed
- any notable risks
- what you validated locally

## License

By contributing to this repository, you agree that your contribution will be distributed under the MIT License of this project.
