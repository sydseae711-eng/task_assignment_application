# Task Assignment System

A full-stack Task Assignment application: Developers, Tasks (with nested Subtasks), Skills, and automatic LLM-based skill detection when a task is created without explicit skills.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + Axios |
| Backend | Node.js + Express 5 + TypeScript (ESM) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg` driver adapter) |
| LLM | Google Gemini (`@google/generative-ai`), default model `gemini-3.5-flash-lite` |
| Containerization | Docker + Docker Compose, frontend served via Nginx |

## Quick Start — Docker (recommended)

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env
```

Edit `.env` and set `GEMINI_API_KEY` to a real key (free tier: https://aistudio.google.com/apikey) — the only value that must be changed. Everything else below is optional and already has a working default:

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | *(none — required)* | Gemini API key used for LLM skill detection |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Which Gemini model to call |
| `MAX_SUBTASK_DEPTH` | `3` | Max subtask nesting depth allowed per task |
| `MAX_SUBTASKS_PER_LEVEL` | `10` | Max direct subtasks any single task/subtask can have |
| `POSTGRES_USER` | `postgres` | Postgres username |
| `POSTGRES_PASSWORD` | `mysecretpassword` | Postgres password |
| `POSTGRES_DB` | `mydatabase` | Postgres database name |

All seven are read by `docker-compose.yml` from the root `.env`; only `GEMINI_API_KEY` has no default and must be supplied.

```bash
docker-compose up --build
```

- Frontend: http://localhost:80
- Backend API: http://localhost:3000/api
- Postgres: localhost:5432

The `server` container pushes the schema and seeds the database (Alice, Bob, Carol, Dave) automatically on every start — idempotent, safe to restart.

```bash
docker-compose down       # stop
docker-compose down -v    # stop + wipe the DB volume for a completely fresh start
```

## Local Development (without Docker)

Prerequisites: Node.js 20+, PostgreSQL running locally (or just run `docker-compose up postgres` for the DB alone and develop the app outside Docker).

### Backend

```bash
cd server
npm install
```

Create `server/.env`:
```
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/mydatabase?schema=public
GEMINI_API_KEY=your_key_here
# All optional, shown with their defaults — uncomment and edit only if you want a different value:
# GEMINI_MODEL=gemini-3.5-flash-lite
# MAX_SUBTASK_DEPTH=3
# MAX_SUBTASKS_PER_LEVEL=10
```

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev     # http://localhost:3000
```

### Frontend

```bash
cd client
npm install
npm run dev     # http://localhost:5173 — proxies /api to localhost:3000
```

## Running Tests

A small, high-signal unit test suite (28 tests) covers the core business rules — skill-assignment validation, the subtask Done-gating check, subtask depth/breadth limit checks, and LLM skill-name parsing on the backend; subtask-title validation and the task-list merge-update logic on the frontend. Deliberately scoped rather than exhaustive, given the assignment's time box — every test is a plain function call against plain data, no database, no mocking, no browser involved.

```bash
cd server && npm test    # 19 tests, node --test
cd client && npm test    # 9 tests, node --test via tsx
```

## System Design

### Architecture

The React SPA talks to the Express API over `/api`; the API is the only thing that talks to Postgres (via Prisma). The backend is layered so each piece has exactly one job:

```
routes/        URL → handler mapping only, no logic
controllers/    translate HTTP (req/res) ↔ a plain service function call, nothing else
services/       all business logic and Prisma queries — no Express types used here at all
```

This means every service function can be called and unit-tested directly, with no HTTP context or mocking required. A single Express error-handling middleware sits at the end of the request pipeline and maps everything to a consistent JSON error shape: custom application errors (`AppError`, carrying their own HTTP status) are respected as-is; Prisma's own error codes (unique-constraint violations, foreign-key failures, not-found, validation errors) are mapped to the appropriate 4xx status; anything unrecognized falls back to a 500 without leaking internal detail to the client.

### Database Schema

- **Developer** — `name` (unique), skills via `DeveloperSkill`, tasks assigned via `Task.developerId`.
- **Skill** — `name` (unique), shared across developers and tasks (seeded: Frontend, Backend).
- **Task** — `title`, `status` (`TODO`/`DONE`), optional `developerId`, optional `parentId` (self-referential), skills via `TaskSkill`.

Many-to-many relations (`Developer`↔`Skill`, `Task`↔`Skill`) use explicit join tables rather than Prisma's implicit many-to-many, leaving room to add fields to the relationship itself later (e.g. an `assignedAt` timestamp) and keeping the schema explicit for more complex queries. `Task.parentId` is self-referential, so a subtask is simply a `Task` row with a parent — no separate schema, and no fixed nesting-depth ceiling baked into the data model itself. Foreign-key columns (`Task.developerId`, `Task.parentId`, `TaskSkill.skillId`, `DeveloperSkill.skillId`) are explicitly indexed, since Postgres doesn't auto-index scalar FK columns and the subtask-completion check (below) filters directly on `parentId` on every status change.

Seed data (idempotent upserts, safe to re-run): Alice (Frontend), Bob (Backend), Carol (Frontend + Backend), Dave (Backend).

### Business Rules

Enforced in the service layer, not left to the UI or the database alone:

- **Skill-matching assignment** — a developer can only be assigned to a task or subtask if they have *every* skill it requires. Checked independently at both creation time (if a `developerId` is supplied directly) and on every later reassignment. A task/subtask requiring zero skills is open to any developer — there's nothing to check it against.
- **Recursive completion gating** — a task can only transition to `DONE` once every subtask beneath it, at every depth, is also `DONE`. The frontend mirrors this check to disable the status control before an invalid change is even attempted, but the backend is the authoritative check regardless of what the UI allows.
- **Independent subtask assignment** — each subtask is its own independently assignable unit, matched against its *own* required skills, with no requirement to share a developer or skill set with its parent or siblings. A parent task's own skill requirement is never inferred or aggregated from its subtasks' skills.

### Subtasks

A subtask shares every property a task has (title, skills, status, developer) — modeled as a `Task` row pointing at a parent via `parentId`, not a separate entity. The creation form mirrors this recursively: one component renders a single subtask's fields and, if it has children of its own, renders itself again for each one — the same shape as the underlying data. The entire task and its whole subtask tree are created in a single Prisma nested `create` call, so creation is atomic: if any part fails, nothing is created, not even the root task.

Reading tasks back works the opposite way — the whole table is fetched flat (Prisma has no native support for arbitrary-depth recursive includes) and reassembled into the nested tree in application memory before being returned.

Developer assignment for subtasks is only available after creation, from the task list — not on the creation form itself. This is deliberate: a subtask's own skill set isn't known client-side until it's resolved (manually or by the LLM, see below), so there's nothing to correctly filter an eligible-developer list against until the task actually exists.

Nesting depth and the number of subtasks allowed at any single level are both capped — default depth 3, default 10 subtasks per level, both configurable (`MAX_SUBTASK_DEPTH`/`MAX_SUBTASKS_PER_LEVEL` env vars on the backend, `client/src/config.ts` on the frontend, enforced independently on both sides). Neither limit is spec-mandated; both exist to keep a single request's size and recursive work bounded rather than genuinely unlimited. The two compound multiplicatively rather than additively (the worst case at the defaults is `10 + 10² + 10³ = 1,110` total nodes, roughly 44KB) — a deliberate, tunable judgment call rather than a fixed rule, which is why both live behind configuration rather than being hardcoded.

### LLM Skill Detection

Whenever a task or subtask is created without an explicit `skillIds` list, the backend — not the frontend — calls Gemini with the task's title and a prompt listing the skill catalog, queried fresh from the database on every call so it stays correct as skills are added over time. The model's response is matched only against skills that already exist in the catalog, case-insensitively; anything it returns that doesn't match a real skill is dropped rather than inserted as a new one, so a task can never end up requiring a skill nobody actually has. If nothing usable comes back at all — an empty result, or a response that can't be parsed as a list of names — the task is created with no required skills rather than guessing or defaulting to every skill; a task with no required skills is, by the business rule above, open to any developer. If the Gemini call itself fails after retrying, task creation is aborted entirely instead of silently falling back, preserving the same all-or-nothing guarantee the nested subtask create already has. Skill resolution — whether user-specified or LLM-derived — always completes before any database write, and any directly-supplied developer is validated against the final resolved skill set, not the raw request.

### Containerization

The backend runs via `tsx` directly, in both local development and inside the Docker image — there's no separate `tsc`-compiled build step for the server. This keeps the runtime identical in every environment the code actually runs in, which matters specifically because Node's native ESM module resolution is strict about relative-import file extensions, and Prisma's own generated client code uses extensionless internal imports that can't be hand-edited (the client is regenerated fresh on every build). Running everything through the same interpreter sidesteps that mismatch entirely rather than working around it per-case. The frontend is a multi-stage build — a Vite production build served by Nginx, which also proxies `/api` to the backend and handles single-page-app fallback routing for client-side routes. The `server` container pushes the schema and seeds the database on every start (both idempotent), so a complete, working stack comes up from one `docker-compose up --build` with no separate manual migration step. Postgres credentials and the Gemini model/subtask-limit overrides are all parameterized through environment variables with safe defaults, rather than hardcoded into the compose file.

## API Documentation

Base path: `/api`. Success responses are wrapped as `{ "data": ... }`; errors as `{ "error": string, "details"?: unknown }`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | List all tasks as a nested tree, including subtasks at every depth |
| GET | `/api/tasks/:id` | Get a single task, including its subtask subtree |
| POST | `/api/tasks` | Create a task (optional nested `subtasks`, `skillIds`, `developerId`) |
| PATCH | `/api/tasks/:id` | Update `title` / `status` / `developerId` |
| GET | `/api/developers` | List developers with their skills |
| GET | `/api/developers/:id` | Get a single developer |
| GET | `/api/skills` | List all skills |
| GET | `/api/skills/:id` | Get a single skill |

**`POST /api/tasks` request body** — `title` is the only required field; everything else is optional:
```json
{
  "title": "As a logged-in user, I want to update my profile information",
  "skillIds": [1, 2],
  "developerId": 3,
  "subtasks": [
    { "title": "Backend endpoint", "skillIds": [2] },
    { "title": "Frontend form" }
  ]
}
```
- Omitting `skillIds` on the task, or on any individual subtask, triggers LLM-based skill detection for that node independently — it's resolved per-node, not inherited from siblings or the parent.
- Each entry in `subtasks` has the same shape recursively (`title`, optional `skillIds`, optional nested `subtasks`), up to the configured depth/per-level limits.

**`PATCH /api/tasks/:id` request body** — any subset of these fields; omitted fields are left untouched:
```json
{ "status": "DONE" }
```
```json
{ "developerId": null }
```
- `developerId: null` explicitly unassigns the developer; omitting the field entirely leaves the current assignment as-is.

## Library / Dependency Justification

- **Prisma 7 + `@prisma/adapter-pg`** — type-safe queries and migrations. The driver-adapter pattern talks to Postgres directly via the `pg` driver, avoiding the traditional bundled native query-engine binary entirely — no binary-compatibility surface to worry about when containerizing.
- **Explicit join tables** (`DeveloperSkill`, `TaskSkill`) instead of Prisma's implicit many-to-many — clearer schema, room to extend (e.g. an `assignedAt` timestamp) later.
- **Express 5** — native async error handling (a rejected promise from an `async` route handler is automatically forwarded to the error middleware), no `express-async-errors` package needed.
- **`tsx`** (dev *and* production, both client and server) — runs TypeScript directly with no separate compile step, and is the one runtime proven to work consistently across local development, the test suite, and the Docker image.
- **Vite + Tailwind CSS v4** — fast dev server, minimal config, utility-first styling with no separate CSS files to maintain.
- **axios** — simpler API than raw `fetch`, room for interceptors later.
- **Google Gemini (`@google/generative-ai`)** — free-tier LLM API per the assignment's own suggestion, used only for the narrow task of skill classification from a title.
- **Node's built-in test runner (`node --test`), not Jest/Vitest** — the test suite is small, pure-function unit tests with zero mocking and no DOM/component rendering needed, so a full framework wasn't warranted. `tsx` (already a server dependency) runs the same tests against the client's TypeScript, keeping the total new-dependency footprint to one shared tool rather than a second framework.

## Assumptions


**Database Design**
- Status is limited to `TODO`/`DONE` — the spec's `"To-do", "Done", etc."` leaves room for more, but no third status is implemented anywhere.
- Many-to-many relations use explicit join tables (`DeveloperSkill`, `TaskSkill`) rather than Prisma's implicit many-to-many.
- `Developer.name` and `Skill.name` are unique — not stated in the spec, assumed for data integrity and idempotent seeding.

**Backend API**
- Task updates also allow changing `title`, beyond the spec's explicit two (developer reassignment, status change).
- No Delete operation exists anywhere (Tasks, Developers, or Skills) — the spec never mentions delete.
- The response envelope (`{ "data": ... }` / `{ "error": ... }`) and specific HTTP status codes are implementation conventions, not spec-mandated.

**Frontend**
- The developer dropdown on the creation page is disabled until at least one skill is selected, since eligibility can't be computed before skills are known.

**Subtasks**
- A subtask's developer assignment is fully independent of its parent's — matched only against its own required skills, with no skill or developer inheritance in either direction. The spec doesn't resolve this either way.
- "All its subtasks must be Done" is interpreted as every descendant at every depth, not just direct children.
- Subtask nesting depth and per-level count are capped (configurable, default depth 3 / 10 per level) purely as an engineering safeguard — no limit is specified in the spec.
- Subtask developer-assignment is only available after creation, extending the spec's "no developer needed at task creation" rule to subtasks by inference.

**LLM Skill Detection**
- Model choice (`gemini-3.5-flash-lite`) — the spec only suggests Gemini as an option, not a specific model.
- An empty or unparseable LLM result yields zero required skills, not a fallback to "all skills" or a blocked creation.
- An LLM suggestion that doesn't match an existing skill is dropped, never auto-created as a new skill.
- A failed Gemini API call aborts task creation entirely rather than falling back to a default.
- Retry count (2) and backoff timing are implementation choices, not spec-mandated.

**Containerization**
- Container topology (three separate services: Postgres, server, client) and using Nginx to serve/proxy the frontend are implementation choices — the spec only requires the whole solution be containerized and runnable via `docker-compose`.
- Schema push and seeding run automatically on every container start, rather than as a separate manual migration step.

**Cross-cutting**
- No authentication or authorization exists anywhere — the spec never mentions it, and a real production deployment of this would need it.
- No pagination or rate limiting — the dataset is assumed small enough not to need it for this assignment's scope.
- Skills are a fixed, closed catalog matching the seed table exactly — no create/update/delete exists for skills anywhere, consistent with the spec's explicit "Read only" requirement for that entity.

## Known Limitations / Follow-Ups

Not blocking, listed for transparency:

- No drag-and-drop subtask reordering, bulk status changes, or search/filter on the task list.
- A task marked `DONE` isn't automatically reverted if a descendant subtask is later reverted to `TODO` — only the forward `TODO → DONE` transition is validated.
- No pagination or rate limiting on the API.
- Subtask developer-assignment is only available from the Task List page, not at creation time (by design — see System Design → Subtasks above).
- Subtask nesting is capped at depth 3 / 10 per level by default, not spec-mandated — added to keep request size and recursive work bounded, and configurable since the exact numbers are a judgment call. The two limits compound multiplicatively rather than additively (worst case ~1,110 nodes / ~44KB at these defaults).
