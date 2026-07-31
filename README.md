# FitMateBOT

AI-powered fitness chatbot trained on WHO, ACE, and HHS guidelines. Built for an M.Sc. Computer Science thesis on fine-tuning a Mistral 7B model using QLoRA.

## Quick Start

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- API routes: http://localhost:3000/api/*

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (TypeScript) |
| Database | SQLite via better-sqlite3 |
| Model | Mistral 7B (QLoRA fine-tuned) via OpenCode-Zen API |
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
