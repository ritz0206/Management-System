# Management-System

> **A personal Life OS** — one system to collect, automate, and make sense of every dimension of your life.

---

## Vision

Modern life generates a constant stream of data — groceries, finances, investments, health, documents, vehicles — scattered across apps, receipts, and memory. **Management-System** brings all of it into one place, turning raw life data into clear insights and autonomous action.

The goal is a unified platform where you can analyse trends, visualise patterns, and make informed decisions about anything specific to your own life — powered by an AI layer that grows smarter the more you use it.

---

## Current Focus: Grocery Management

The first module tackles everyday grocery management: tracking purchases, predicting what you'll need, building shopping lists, and integrating with delivery platforms like DMart — all with your approval before anything is actioned.

This module serves as the blueprint for every domain that follows.

---

## Roadmap

### Phase 1 — Repository & AI Context Engineering
- Monorepo structure: `frontend/`, `backend/`, `ai-docs/`
- `design.md` — system architecture and decision log for AI-assisted development
- `skills.md` — tool manifests defining exact interfaces the AI can invoke

### Phase 2 — Core Application & Data Layer
- PostgreSQL with the `pgvector` extension for unified relational + vector storage
- React frontend: grocery lists, order history, and a notifications/approvals dashboard
- Spring Boot REST APIs for CRUD operations

### Phase 3 — Compound AI (RAG)
- Spring AI integrated with `PgVectorStore`
- Ingestion pipeline: products and order history chunked, embedded, and stored as vectors
- Open-source LLM (Llama 3 / Mistral via Ollama) for context-aware queries
  - *"What ingredients am I missing for Carbonara, based on my current inventory?"*

### Phase 4 — AI Agent (Tool Execution)
- Spring Boot services exposed as LLM-callable tools via Spring AI Function Calling
- Agent decides which tools to call based on the query and acts on the result
  - *"Add milk if we're out"* → checks inventory → conditionally updates the grocery list

### Phase 5 — Agentic AI (Autonomous Life OS)
- **Think → Plan → Act → Review** loop implemented in Spring Boot (ReAct pattern)
- Weekly `@Scheduled` cron job analyses purchase history, predicts needs, builds a DMart cart, and checks it against budget rules
- Human-in-the-loop: all actions saved as `PENDING_APPROVAL` and surfaced via WebSocket/SSE notifications in React — nothing executes without your confirmation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Java, Spring Boot, Spring AI |
| Database | PostgreSQL + pgvector |
| LLM Runtime | Ollama (Llama 3 / Mistral) |
| Embeddings | all-MiniLM (local) |

---

## Architectural Philosophy

**Modular by design.** Each life domain (Grocery, Finance, Health, Documents) is an isolated Spring Boot module. The core agentic loop is domain-agnostic — adding a new area of your life means writing new tools as Spring Beans. The orchestration layer needs no changes.

**AI as infrastructure, not an afterthought.** The AI layer is designed alongside the application from day one, not bolted on later. Documentation (`design.md`, `skills.md`) is treated as first-class code, giving any LLM the context it needs to contribute meaningfully to development.

---

## Planned Life OS Modules

- [x] Grocery Management *(in progress)*
- [ ] Finance & Investments
- [ ] Health & Fitness
- [ ] Documents & Records
- [ ] Vehicle Management
- [ ] Career & Goals

---

## Contributing

This is a personal project in active development. Architecture decisions and design rationale are documented in [`design.md`](./design.md). Refer to [`skills.md`](./skills.md) for the canonical tool interfaces before proposing integrations.
