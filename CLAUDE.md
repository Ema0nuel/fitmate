# FitMateBOT — Claude Code Instructions

> **ALWAYS READ THESE FILES BEFORE WRITING OR MODIFYING ANY CODE:**
>
> **Product & Design Context (what we're building and why):**
> - `PRODUCT.md` — product truth: users, purpose, positioning, constraints, principles
> - `DESIGN.md` — design system: tokens, components, rules, the visual world
> - `.impeccable/design.json` — machine-readable design sidecar (tonal ramps, shadows, motion, component snippets)
> - `surface-briefs/` — UX briefs for each surface (landing, onboarding, chat)
>
> **Technical Context (how it's built):**
> - `CONTEXT.md` — full project context, thesis requirements, training results, hardware decisions
> - `AGENTS.md` — Next.js agent rules and breaking change warnings
> - `instructions/ARCHITECTURE.md` — system architecture, data flow, tech stack decisions
> - `instructions/GUARDRAIL-POLICY.md` — AI behavioral rules, domain boundaries, banned topics
> - `instructions/BUILD-GUIDE.md` — setup steps, environment variables, dev workflow

---

## Project Identity

- **Title:** Fine-Tuning a Large Language Model (LLM) Agent for a Fitness Chatbot System
- **Type:** M.Sc. Computer Science research project (postgraduate thesis)
- **Researcher:** Emmanuel (Amadigwe Charles in formal documents)
- **Status:** Fine-tuning complete (89.3% token accuracy), building the web app system

---

## Architecture — Option A (Locked)

**Full Stack: Python FastAPI backend + React/Next.js frontend**

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React/Next.js (TypeScript) | Chat UI, user onboarding, profile management |
| Backend | Next.js API Routes (TypeScript) | Orchestration: chat logic, guardrails, data access |
| Database | SQLite (better-sqlite3) | User profiles, chat history, saved preferences |
| Remote DB | Supabase/PostgreSQL | Production data (future migration from SQLite) |
| Vector DB | ChromaDB or Pinecone | RAG pipeline (not yet implemented) |
| Model | Mistral 7B (fine-tuned via QLoRA) | Served via OpenCode-Zen API (displayed as Mistral 7B) |
| Guardrails | Rule-based regex patterns | Domain boundary enforcement (see GUARDRAIL-POLICY.md) |

### Why this architecture
- **Single server** — everything (frontend + API routes + database) runs in one Next.js process. No CORS, no cross-origin issues, one deploy target.
- **SQLite locally** allows development and thesis demo without cloud DB setup
- **Next.js API Routes** match the thesis Chapter Three data flow and deploy cleanly to Vercel
- **Ported from Python FastAPI** — the original Python backend logic was converted to TypeScript (`lib/guardrails.ts`, `lib/chat.ts`, `lib/db.ts`)

---

## Design System — "The Movement Companion"

**North Star:** Vibrant, motivating, aspirational — like a premium fitness app that makes you want to move. Apple Health / Fitness as the structural reference.

| Token | Value | Usage |
|---|---|---|
| Primary | Forest Green (#16a34a) | Buttons, links, active states — action only |
| Primary Light | Emerald (#22c55e) | Hover states, success indicators |
| Primary Deep | Deep Forest (#15803d) | Pressed states, high-contrast text-on-green |
| Background | Clean White (#ffffff) | Page default |
| Muted | Off-White (#f5f5f5) | Secondary surfaces, inputs |
| Foreground | Charcoal (#171717) | Primary text |
| Border | Light Border (#e5e5e5) | Cards, dividers, inputs |

**Typography:** Geist Sans (UI), Geist Mono (evidence citations)
**Radius:** Minimum 8px everywhere — no sharp edges
**Depth:** Flat at rest, shadows on interaction only

### Design Rules (non-negotiable)
1. **The Green Budget Rule** — Green is for action only. Never as background fill or text on neutral surfaces.
2. **The Evidence Hierarchy Rule** — Source citations use Geist Mono, always visible, never buried.
3. **The Flat-By-Default Rule** — Surfaces flat at rest. Shadows only on hover/focus/overlay.
4. **The No-Sharp-Edges Rule** — Minimum 8px border radius on every user-facing element.

### MVP Surfaces (build order)
1. **Landing** (`/`) — Hero + mock chat preview + CTA → onboarding
2. **Onboarding** (`/onboarding`) — 4-step profile setup (name → stats → level → goals)
3. **Chat** (`/chat`) — Core product — messages, AI responses, source citations

Full briefs: `surface-briefs/fitmate-full-mvp.md`

---

## Non-Negotiable Constraints

1. **TypeScript** for the frontend (updated from CONTEXT.md's JS-only — project was scaffolded in TS)
2. **Ludwig must never appear** in any code, comment, or documentation — sole method is QLoRA
3. **Model is NOT self-hosted** — inference via HuggingFace Inference API
4. **Backend is Next.js API Routes (TypeScript)** — ported from Python FastAPI; all server logic lives in `app/api/` and `lib/`
5. **No mobile app** — web only
6. **Guardrails must be strict** — fitness + adjacent health topics only; no politics, coding, relationships, etc.
7. **No sign-up/sign-in for now** — SQLite stores local user data without authentication
8. **When touching ML dependencies** (`trl`, `transformers`, `peft`, `bitsandbytes`) — check installed version first, do not assume from older tutorials
9. **Design tokens are normative** — DESIGN.md and `.impeccable/design.json` define the visual system. Never invent colors, fonts, spacing, or component styles outside these documents.
10. **No UI without design context** — before writing any React component or CSS, read DESIGN.md and the relevant surface brief. Every visual decision must trace back to a token or rule.

---

## Development Workflow

### Running the app
```bash
# Single command — serves frontend + API routes
cd fitmate && npm run dev

# Frontend: http://localhost:3000
# API routes: http://localhost:3000/api/*
# Database: ./fitmate.db (auto-created on first request)
```

### File structure
```
fitmate/
├── CLAUDE.md               # This file — Claude Code instructions
├── PRODUCT.md              # Product truth (users, purpose, constraints)
├── DESIGN.md               # Design system (tokens, components, rules)
├── CONTEXT.md              # Full project context (thesis, training, decisions)
├── AGENTS.md               # Next.js agent rules
├── .env.local              # Environment vars (LLM API key, DB path) — gitignored
├── .impeccable/
│   ├── config.local.json   # Impeccable hook config
│   └── design.json         # Design sidecar (tonal ramps, shadows, components)
├── surface-briefs/
│   └── fitmate-full-mvp.md # UX brief for all MVP surfaces
├── instructions/
│   ├── ARCHITECTURE.md     # System architecture & data flow
│   ├── GUARDRAIL-POLICY.md # AI behavioral rules & domain boundaries
│   └── BUILD-GUIDE.md      # Setup steps & environment config
├── policy/                 # Training data (Q&A JSON files)
├── app/                    # Next.js pages + API routes
│   ├── layout.tsx          # Root layout (Geist fonts, metadata)
│   ├── page.tsx            # Landing page (/)
│   ├── globals.css         # Design tokens as CSS custom properties
│   └── api/                # API route handlers (server-side)
│       ├── utils.ts        # Shared helpers (ensureDb, errorResponse, parseBody)
│       ├── health/route.ts
│       ├── users/route.ts
│       ├── users/[userId]/route.ts
│       ├── profiles/route.ts
│       ├── profiles/[userId]/route.ts
│       ├── onboarding/status/route.ts
│       ├── goals/route.ts
│       ├── goals/[userId]/route.ts
│       ├── goals/detail/[goalId]/route.ts
│       ├── conversations/route.ts
│       ├── conversations/[userId]/route.ts
│       ├── conversations/[userId]/chat-history/route.ts
│       ├── chat/route.ts          # Core LLM chat endpoint
│       ├── workout-plans/route.ts
│       ├── workout-plans/[userId]/route.ts
│       ├── workout-plans/detail/[planId]/route.ts
│       ├── workout-plans/[planId]/exercises/route.ts
│       ├── workout-exercises/[exerciseId]/route.ts
│       ├── exercises/route.ts
│       ├── nutrition/route.ts
│       ├── nutrition/[userId]/route.ts
│       ├── nutrition/detail/[entryId]/route.ts
│       ├── progress/route.ts
│       ├── progress/[userId]/route.ts
│       ├── progress/detail/[entryId]/route.ts
│       ├── memory/[userId]/route.ts
│       └── memory/conversation/[conversationId]/route.ts
├── lib/                    # Server-side business logic
│   ├── db.ts               # SQLite database (better-sqlite3, 11 tables, 35 CRUD functions)
│   ├── guardrails.ts       # Domain enforcement (6-tier regex pattern matching)
│   ├── chat.ts             # Chat pipeline (prompt building, LLM calls, orchestration)
│   └── api.ts              # Frontend API client (relative fetch calls)
├── components/             # React components
└── package.json
```

---

## Task Tracking

When starting any task:
1. **Read PRODUCT.md** — understand what we're building and for whom
2. **Read DESIGN.md** — understand the visual system and design rules
3. **Read the relevant surface brief** from `surface-briefs/` if the task involves UI
4. Read CONTEXT.md for project context (thesis, training, hardware)
5. Read AGENTS.md for Next.js rules
6. Read the relevant instruction file from `instructions/`
7. Check `policy/` files if the task relates to training data or domain knowledge
8. Update this file or instruction docs if architecture or design decisions change

### For UI tasks specifically
- All visual decisions come from DESIGN.md tokens and rules — never invent colors, fonts, or spacing
- Follow the surface brief's layout, interaction, and state specifications
- Source citations must be visible by default (The Evidence Hierarchy Rule)
- Use 21st dev components as starting points, customize to match DESIGN.md tokens
