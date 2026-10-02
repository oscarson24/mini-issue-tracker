# Mini Issue Tracker — Implementation Plan

> Status: **APPROVED — in progress.** PRs target `main`.
> Items marked ✅ are the chosen/recommended defaults. The plan below assumes them.

---

## 1. Goals & Scope

### Core features
1. View a list of issues (title, description, timestamps, status `Open` / `Resolved`).
2. Add a new issue via a form.
3. Mark an issue as resolved via a button.
4. Filter the list: **All / Open / Resolved**.

### Non-functional requirements
- Frontend: **React**
- Backend: **C# .NET** Web API, **Entity Framework Core** as ORM, **Swagger** UI for docs
- Database: **SQL Server**
- Whole stack runs with **Docker** (one command to start)

### Out of scope (can be added later)
Authentication, users/assignees, editing/deleting issues, pagination, comments.

---

## 2. Decisions

### 2.1 Docker strategy
| Option | Description | Pros | Cons |
|---|---|---|---|
| **A** | `docker-compose.yml` with 3 services: `db` (SQL Server), `api` (.NET), `web` (React built & served by Nginx) | One command (`docker compose up`), prod-like, reproducible | Rebuild image to see code changes |
| **B** | Only SQL Server in Docker; run API (`dotnet run`) and React (`npm run dev`) locally | Fastest dev loop, easy debugging | Requires .NET SDK + Node installed locally; not "fully dockerized" |
| ✅ **C** | **A + a `docker-compose.override.yml` for development** (hot reload: `dotnet watch` and Vite dev server with mounted source) | Best of both: `docker compose up` = dev with hot reload; `docker compose -f docker-compose.yml up` = prod-like | Slightly more config files |

**Recommendation: C.** Key details:
- Nginx in the `web` container proxies `/api/*` → `api:8080`, so the browser talks to a single origin (no CORS headaches in prod-like mode). In dev, Vite's `server.proxy` does the same.
- `db` has a **healthcheck** (`sqlcmd ... SELECT 1`); `api` uses `depends_on: condition: service_healthy`.
- DB data persisted in a named volume (`mssql-data`).
- Secrets (SA password, connection string) in a `.env` file (git-ignored) with a committed `.env.example`.

> Note: the official SQL Server image is **x64 only**. On Apple Silicon it runs under emulation (works, slower). On Windows it's fine (Docker Desktop with WSL2 backend).

### 2.2 Backend versions & style
| Decision | Options | Choice |
|---|---|---|
| .NET version | .NET 8 (LTS) / .NET 10 (LTS) | ✅ **.NET 10 LTS** |
| API style | Controllers / Minimal APIs | ✅ **Controllers** |
| Swagger | Swashbuckle.AspNetCore / built-in OpenAPI + Swagger UI | ✅ **Swashbuckle** (Swagger UI at `/swagger`) |
| Migrations | Auto-apply on startup (with retry) / separate step | ✅ **Auto-apply on startup** |
| "Resolve" endpoint | `PATCH /api/issues/{id}/resolve` / `PUT /api/issues/{id}` | ✅ **PATCH …/resolve** (idempotent) |

### 2.3 Frontend
| Decision | Options | Choice |
|---|---|---|
| Tooling | Vite / Next.js | ✅ **Vite + React** |
| Language | TypeScript / JavaScript | ✅ **TypeScript** |
| Styling | Plain CSS / CSS Modules / Tailwind / MUI | ✅ **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) |
| API layer | Calls inside components / **dedicated `services/` layer** | ✅ **`services/` layer**: a shared HTTP client + an `issueService` that owns every API method |
| Data fetching | `fetch` + custom hook / TanStack Query | ✅ **`fetch` (inside services) + `useIssues` hook** |
| Filtering | Server-side (`?status=Open`) / client-side | ✅ **Server-side** |

**Frontend layering** (components never call `fetch` directly):
```
components  ──►  hooks (useIssues)  ──►  services (issueService)  ──►  services/apiClient  ──►  /api
```
- `services/apiClient.ts` — base URL, JSON headers, response parsing, converts non-2xx / ProblemDetails into a typed `ApiError`.
- `services/issueService.ts` — `getAll(status?)`, `getById(id)`, `create(data)`, `resolve(id)`. Single place to change endpoints.
- Hooks consume the service; components consume hooks. Easy to mock the service in tests.

### 2.4 Testing
| Layer | Choice |
|---|---|
| Backend | ✅ xUnit + `WebApplicationFactory` integration tests (EF Core SQLite in-memory for speed) |
| Frontend | ✅ Vitest + React Testing Library (service tests with mocked `fetch`; component tests with mocked service) |
| Optional | Testcontainers (real SQL Server in tests) — skipped unless requested |

---

## 3. Architecture

```
 Browser
   │  http://localhost:3000 (prod-like)  /  http://localhost:5173 (dev)
   ▼
┌─────────────────┐   /api/*    ┌──────────────────┐   EF Core   ┌───────────────────┐
│ web (Nginx /    │ ──────────► │ api (.NET 10)    │ ──────────► │ db (SQL Server    │
│ Vite dev server)│             │ :8080  /swagger  │             │ 2022) :1433       │
└─────────────────┘             └──────────────────┘             └───────────────────┘
                                                                   volume: mssql-data
```

### Repository layout
```
mini-issue-tracker/
├── backend/
│   ├── IssueTracker.Api/
│   │   ├── Controllers/IssuesController.cs
│   │   ├── Data/AppDbContext.cs
│   │   ├── Data/Migrations/
│   │   ├── Models/Issue.cs, IssueStatus.cs
│   │   ├── Dtos/CreateIssueRequest.cs, IssueResponse.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   ├── IssueTracker.Api.Tests/
│   └── IssueTracker.slnx
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── apiClient.ts          # shared fetch wrapper + ApiError
│   │   │   └── issueService.ts       # all Issue API methods
│   │   ├── hooks/useIssues.ts
│   │   ├── components/
│   │   │   ├── IssueList.tsx
│   │   │   ├── IssueItem.tsx
│   │   │   ├── IssueForm.tsx
│   │   │   ├── StatusFilter.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── types/issue.ts
│   │   ├── index.css                 # @import "tailwindcss";
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── nginx.conf
│   ├── vite.config.ts                # react() + tailwindcss() plugins, /api proxy
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.override.yml
├── .env.example
├── .gitignore
├── PLAN.md
└── README.md
```

---

## 4. Data Model

**Table `Issues`**

| Column | Type | Rules |
|---|---|---|
| `Id` | `int` identity | PK |
| `Title` | `nvarchar(200)` | required, trimmed, 1–200 chars |
| `Description` | `nvarchar(2000)` | optional, ≤ 2000 chars |
| `Status` | `nvarchar(20)` | `Open` \| `Resolved` (enum stored as string), default `Open`, indexed |
| `CreatedAt` | `datetimeoffset` | set by server (UTC) |
| `UpdatedAt` | `datetimeoffset` | set by server on every change |
| `ResolvedAt` | `datetimeoffset` NULL | set when resolved |

---

## 5. API Contract

Base path: `/api/issues` — documented at `http://localhost:8080/swagger`

| Method | Route | Description | Responses |
|---|---|---|---|
| `GET` | `/api/issues?status={Open\|Resolved}` | List issues (newest first); `status` optional | `200` list, `400` invalid status |
| `GET` | `/api/issues/{id}` | Get one issue | `200`, `404` |
| `POST` | `/api/issues` | Create issue `{ title, description }` | `201` + `Location` header, `400` validation (ProblemDetails) |
| `PATCH` | `/api/issues/{id}/resolve` | Mark as resolved (idempotent) | `200` updated issue, `404` |

Example response:
```json
{
  "id": 1,
  "title": "Login button not working",
  "description": "Clicking login does nothing on Safari",
  "status": "Open",
  "createdAt": "2026-10-02T21:30:00+00:00",
  "updatedAt": "2026-10-02T21:30:00+00:00",
  "resolvedAt": null
}
```

---

## 6. Task Breakdown

Each phase ends with a verifiable checkpoint and a commit.

### Phase 0 — Repo setup
- [x] 0.1 Create a feature branch `feature/initial-implementation` from `main`
- [x] 0.2 Add `.gitignore` (.NET + Node), `.env.example`, folder structure
- [x] 0.3 Verify prerequisites: Docker 29.5 ✅, .NET SDK 10.0.102 ✅, Node ❌ not installed (only needed for running frontend tests/tools outside Docker)

**Checkpoint:** clean structure committed.

### Phase 1 — Database & Docker base
- [x] 1.1 `docker-compose.yml` with `db` service (`mcr.microsoft.com/mssql/server:2022-latest`), `ACCEPT_EULA`, `MSSQL_SA_PASSWORD` from `.env`, named volume, healthcheck
- [x] 1.2 `docker compose up db` and confirm it becomes healthy (SQL Server 2022 CU25, healthy in ~5s)

**Checkpoint:** SQL Server reachable on `localhost:1433`.

### Phase 2 — Backend (.NET API)
- [x] 2.1 `dotnet new webapi --use-controllers` → `IssueTracker.Api`; solution (`IssueTracker.slnx`, the .NET 10 default format) + test project
- [x] 2.2 Add packages: `Microsoft.EntityFrameworkCore.SqlServer` 10.0.12, `Microsoft.EntityFrameworkCore.Design` 10.0.12, `Swashbuckle.AspNetCore` 10.2.3
- [x] 2.3 `Issue` entity + `IssueStatus` enum; `AppDbContext` with Fluent config (lengths, string-enum conversion, index on `Status`)
- [x] 2.4 Connection string from config/env var (`ConnectionStrings__Default`, fails fast if missing); `EnableRetryOnFailure`
- [x] 2.5 Initial migration (`InitialCreate`); applied on startup via `Database.MigrateAsync()` (SQL Server only)
- [x] 2.6 DTOs + validation (DataAnnotations → automatic 400 ProblemDetails)
- [x] 2.7 `IssuesController` with the 4 endpoints from section 5
- [x] 2.8 Swagger UI at `/swagger` in **all** environments (it is the project's documentation); XML comments; enums as strings
- [x] 2.9 CORS policy from `Cors:AllowedOrigins` (`http://localhost:5173` in Development)
- [x] 2.10 Seed data (3 sample issues) in Development when the table is empty
- [x] 2.11 Integration tests — 19 passing (SQLite in-memory + `FakeTimeProvider` for deterministic timestamps)
- [x] 2.12 Multi-stage `Dockerfile` (`sdk:10.0` build → `aspnet:10.0` runtime, non-root, port 8080); `api` service added to compose

Notes: HTTPS redirection removed — the API serves plain HTTP on 8080 inside Docker (TLS, if needed, belongs at a reverse proxy).
For running the API outside Docker: `dotnet user-secrets set ConnectionStrings:Default "Server=localhost,1433;Database=IssueTracker;User Id=sa;Password=<pw>;TrustServerCertificate=True"` in `backend/IssueTracker.Api`.

**Checkpoint ✅:** tests pass; `docker compose up db api` → Swagger at `http://localhost:8080/swagger`; create/resolve/filter/400/404 verified against SQL Server; data survives restart.

### Phase 3 — Frontend (React + Tailwind)
- [x] 3.1 Vite 8 + React 19 + TypeScript 6 scaffold (`react-ts` template, oxlint) — generated inside a `node:22-alpine` container
- [x] 3.2 Tailwind CSS 4.3 via `@tailwindcss/vite`; `@import "tailwindcss";` in `index.css`
- [x] 3.3 `types/issue.ts`: `Issue`, `IssueStatus`, `StatusFilter`, `CreateIssueRequest`, length limits
- [x] 3.4 **Services layer**
  - `services/apiClient.ts`: `request<T>()` + `apiClient.get/post/patch`, base URL `/api` (overridable via `VITE_API_BASE_URL`), typed `ApiError` (status, message, camelCase `fieldErrors`), network failures → status 0, aborts passed through
  - `services/issueService.ts`: `getAll(status?, signal?)`, `getById(id)`, `create(data)`, `resolve(id)`
- [x] 3.5 `useIssues(filter)` hook: aborts stale requests, exposes `issues`, `loading`, `error`, `createIssue`, `resolveIssue`, `refresh`; list updated in place after create/resolve (no refetch)
- [x] 3.6 `IssueForm`: required/length validation, disabled while submitting, clears on success, server field errors shown inline
- [x] 3.7 `IssueList` / `IssueItem` / `StatusBadge`: title, description, created/updated/resolved timestamps, badge, "Mark as resolved" with inline error
- [x] 3.8 `StatusFilter`: All / Open / Resolved segmented buttons (`aria-pressed`), server-side filtering
- [x] 3.9 Empty / loading skeleton / error-with-retry states; responsive (stacks below `md`)
- [x] 3.10 Vite dev proxy `/api` → `API_PROXY_TARGET` (default `http://localhost:8080`)
- [x] 3.11 Tests — 24 passing (Vitest 5 + RTL): apiClient, issueService, IssueForm, App flows with mocked service; lint clean
- [x] 3.12 Multi-stage `Dockerfile` (`node:22-alpine` → `nginx:1.29-alpine`) + `nginx.conf` (SPA fallback, `/api` proxy, immutable asset caching)

**Checkpoint ✅:** Nginx image served the app on :3000 against the real API; verified in Chrome: validation, create, resolve, Open/Resolved filters, no console errors.

### Phase 4 — Full Docker Compose
- [ ] 4.1 Add `web` service to `docker-compose.yml` (`api` already added in Phase 2) (`web` on `3000:80`, `api` on `8080:8080`, `depends_on` with healthcheck)
- [ ] 4.2 `docker-compose.override.yml` for dev: `dotnet watch` with mounted `backend/`, Vite dev server with mounted `frontend/` (port 5173), `ASPNETCORE_ENVIRONMENT=Development`
- [ ] 4.3 Verify both modes:
  - Dev: `docker compose up --build` → http://localhost:5173
  - Prod-like: `docker compose -f docker-compose.yml up --build` → http://localhost:3000

**Checkpoint:** fresh clone + `.env` + one command = working app.

### Phase 5 — Docs & wrap-up
- [ ] 5.1 README: prerequisites, setup, run commands, URLs, running tests, troubleshooting (port 1433 in use, SA password complexity rules)
- [ ] 5.2 Final manual smoke test: create → appears as Open → resolve → filter Open/Resolved
- [ ] 5.3 Code review pass, then PR to `main`

---

## 7. Acceptance Criteria
- [ ] Issue list shows title, description, timestamps, and Open/Resolved status
- [ ] New issue can be created from the form and appears immediately
- [ ] "Mark as resolved" changes status and sets `resolvedAt`
- [ ] Filter shows All / only Open / only Resolved
- [ ] All frontend HTTP calls go through `src/services/` (no `fetch` in components/hooks)
- [ ] UI styled with Tailwind CSS
- [ ] API exposes GET/POST/PATCH endpoints, documented in Swagger UI
- [ ] Data persisted in SQL Server via EF Core (survives container restarts)
- [ ] Entire stack starts with `docker compose up`

## 8. Risks & Notes
- **SA password policy:** SQL Server refuses to start with a weak password (min 8 chars, 3 of: upper/lower/digit/symbol).
- **Startup ordering:** handled by DB healthcheck + EF retry.
- **Memory:** SQL Server container needs ~2 GB RAM; make sure Docker Desktop allows it.
- **Hot reload on Windows mounts:** file watching across Docker bind mounts can be unreliable; dev override sets `CHOKIDAR_USEPOLLING` / `DOTNET_USE_POLLING_FILE_WATCHER=true`.
- **Branching:** work happens on `feature/initial-implementation`, branched from `main`; the PR targets `main`.
- **Node.js is not installed locally:** the frontend builds and runs inside Docker. Running frontend tests or `npm` commands on the host needs Node 22 LTS (or run them via `docker compose run web ...`).
