# Design Decisions

This file documents the architectural decisions made in this project and the reasoning behind them. It is a living document — updated as decisions are made, revisited, or reversed.

It is intended to be read by AI assistants and human collaborators alike. Every decision here should answer: **why does the system work this way?**

---

## Repository Structure

### Monorepo: `frontend/`, `backend/`, `ai-docs/`

All three concerns evolve together. A change in the backend API often requires a frontend update and an `ai-docs` update simultaneously. A monorepo keeps these in sync under one commit history, making it easy to see the full picture of any change. Separate repos would create coordination overhead for a solo or small team.

---

### `design.md` and `skills.md` as First-Class Artifacts

AI assistants working on this codebase have no memory of past decisions. Without documented reasoning, every session starts from scratch and risks contradicting earlier choices. Treating these files like code — versioned, committed, updated — gives any LLM (or new human collaborator) the context to contribute without derailing the architecture.

---

## Tech Stack

### PostgreSQL (relational only)

All life data in this system — grocery lists, purchase history, order approvals, and eventually finance and health records — is inherently structured. PostgreSQL's relational model maps cleanly to this: tables, foreign keys, and typed columns give strong guarantees without added complexity.

A single PostgreSQL instance serves all modules (Grocery, Finance, Health, etc.), keeping the data layer simple for a personal-scale Life OS.

---

### React Frontend

Component-based architecture maps cleanly to the domain modules (Grocery, Finance, Health). The notifications/approvals dashboard — where the user reviews and approves AI-drafted actions — requires reactive, real-time UI updates (WebSocket/SSE), which React handles well. It is also the most widely supported frontend ecosystem for Spring Boot backends.

---

### Spring Boot Backend

The Modular Monolith pattern is a natural fit for Spring Boot's package and Bean structure. Each life domain becomes an isolated Spring module. Spring AI additionally provides first-class function calling support, which is how backend services get exposed as LLM-callable tools in the Agentic layer.

---

### Ollama

---

### Modular Monolith over Microservices

Microservices introduce network boundaries, separate deployments, and distributed system complexity — none of which is justified at this scale for a personal Life OS. A Modular Monolith gives clean domain separation (each module is isolated) while remaining a single deployable unit. When/if a module like Finance grows large enough to warrant independence, it can be extracted later without rewriting the core.

---
