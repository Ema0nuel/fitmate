# FitMateBOT

AI-powered fitness chatbot trained on WHO, ACE, and HHS guidelines. Built for an M.Sc. Computer Science thesis on fine-tuning a Mistral 7B model using QLoRA.

## Quick Start

```bash
npm install
npm run dev
```

Create a local `.env` file before starting the app:

```dotenv
OPENROUTER_API_KEY=your_openrouter_key
LLM_API_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openrouter/free
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_X_TITLE=FitMate
```

- App: http://localhost:3000
- API routes: http://localhost:3000/api/*

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (TypeScript) |
| Database | SQLite via better-sqlite3 |
| Model runtime | OpenRouter Free Models Router via a server-side Next.js API route |
| Model reporting | The resolved OpenRouter model ID is stored with each response |
| Guardrails | Rule-based regex domain enforcement |

## Project Docs

- `CONTEXT.md` — full project context, thesis details, training results
- `AGENTS.md` — Next.js agent rules
- `instructions/ARCHITECTURE.md` — system architecture & data flow
- `instructions/GUARDRAIL-POLICY.md` — AI behavioral rules & domain boundaries
- `instructions/BUILD-GUIDE.md` — setup instructions

## Training Data

Located in `policy/` — 346 Q&A pairs from:
- American Council on Exercise (ACE) Exercise Library
- WHO Healthy Diet Fact Sheet
- WHO Physical Activity Guidelines
- U.S. HHS Physical Activity Guidelines

## License

Academic research project — not for commercial use.
