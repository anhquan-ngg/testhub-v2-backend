# TestHub Backend

## Overview

TestHub Backend is the NestJS REST and realtime service for an online examination system. It owns authentication sessions, business authorization, PostgreSQL data, question banks, exams, submissions, grading, storage access and background jobs. The sibling [web frontend](../testhub-v2/README.md) and [Python AI service](../testhub-ai-service/README.md) are separate applications.

This is a standalone **npm** repository, not an `apps/exam-core` monorepo package. Prisma is the schema source of truth; there is no active ZenStack policy layer or tRPC application API. Authorization is implemented in guards, services and repositories.

## Key Features

- **Accounts and sessions:** `ADMIN`, `LECTURER` and `STUDENT` roles, password login, Google/Outlook OAuth, refresh rotation and revocable sessions. Students have one active session; transferring devices during an exam requires responsible-lecturer/admin approval. Staff can retain multiple sessions.
- **Question banks and imports:** single-choice, multiple-choice and essay questions; subject ownership; arbitrary-depth chapter trees; staged DOCX/XLSX import with embedded images, validation, editing and explicit commit. Imports accept files up to 20 MiB and are not full exam-definition imports.
- **Exam authoring:** manual, random-count, type/cognitive-level and chapter-quota selection. Chapter quotas include descendants and allocate distinct questions across overlapping branches. Distribution delta supports bounded allocation adjustments; see the feature contract below.
- **Participation and monitoring:** registration, session-aware exam entry, answer persistence, submission, automatic choice grading, presence heartbeats, advisory browser violation events, SSE monitoring, retry grants and time extensions. This repository does not implement camera/MediaPipe proctoring.
- **Results and publishing:** submission/report PDFs, printable exams, revisioned private regrading drafts, explicit publication, grading audit history and durable in-app notifications. Publishing updates grades, audit and notification atomically; realtime delivery is best effort.
- **Learning documents:** consented PDF/PPTX uploads up to 20 MiB, immutable source versions, extraction previews, partial-extraction confirmation, library history, archive/unarchive and purge/quota workflows. Speaker notes are opt-in. Extraction, indexing and OCR-required states are distinct.
- **AI-assisted authoring:** text/document generation, source-scoped RAG, editable full-source knowledge plans and topic-by-cognitive-level matrices, durable batches, citation review and explicit approved commit. AI supports choice questions, not essays; at most 20 configuration rows and 20 questions total. Editing invalidates approval; only approved commit writes bank questions and any required chapter branches.

AI prompts currently request **Vietnamese questions**, independently of the frontend's English/Vietnamese interface. Citations and similarity scores do not prove correctness, answer entailment, cognitive level or full-document coverage. Source content and queries may be sent to external providers; obtain consent and review the deployed processing arrangements.

## Technology Stack

Versions below are resolutions in the committed [npm lockfile](package-lock.json), not exact pins for every manifest range.

| Area | Technology / locked version |
| --- | --- |
| HTTP framework | NestJS 11.1.9, Express 5.1.0 |
| Language | TypeScript 5.9.3; NodeNext modules, ES2023 target, `strictNullChecks` enabled; not full strict mode |
| Database | Prisma Client/CLI/pg adapter 7.8.0, `pg` 8.20.0; PostgreSQL |
| Queues / pub-sub | BullMQ 5.78.0, ioredis 5.11.1; Redis |
| Authentication | Passport, JWT, bcrypt; Google and Microsoft OAuth strategies |
| Realtime / validation | Socket.IO, SSE; class-validator/class-transformer and Zod 3.25.76 |
| Storage | AWS SDK v3 S3 / presigned URLs 3.1032.0 |
| Documents / printing | Mammoth, ExcelJS, JSZip, Cheerio, sharp 0.35.4; Puppeteer 24.34.0 |
| Quality / processes | Jest 30.2.0, ts-jest 29.4.5, ESLint, Prettier; local PM2 7.1.1 |
| Local infrastructure | Compose: PostgreSQL 17 Alpine and Redis 7 Alpine; application image: Node 22 Debian |
| Package management | npm; `package-lock.json` lockfile version 3 |

`@trpc/server` remains a development dependency but is not used by the application. [package.json](package.json) declares `private: true` and `UNLICENSED`; there is no `LICENSE` file or implied open-source license grant.

## Architecture and Project Structure

```text
testhub-v2-backend\
|-- src\
|   |-- main.ts                         # HTTP bootstrap, CORS, validation, cookies, Swagger
|   |-- app.module.ts                   # API module composition
|   |-- auth\, encryption\              # Sessions, OAuth, JWT, token hashing
|   |-- common\, prisma\                # Shared policies/helpers, PostgreSQL adapter
|   |-- users\, topics\, chapters\      # Accounts and owned question-bank hierarchy
|   |-- questions\, exams\              # Question authoring and exam selection
|   |-- exam-registrations\             # Registration lifecycle
|   |-- submission\, exam-print\        # Answers, grading/regrading, PDF/print output
|   |-- exam-runtime\, notification\    # Queues, REST, Socket.IO and SSE
|   |-- files\, s3\                     # File metadata and object storage
|   |-- question-imports\               # DOCX/XLSX staging, parsers and processor
|   |-- question-generation\            # Plans, batches, review/commit and AI worker module
|   |-- learning-documents\             # Documents, extraction/indexing and scoped RAG
|   |-- question-generation.worker.ts   # Dedicated AI application context
|   `-- document.worker.ts              # Dedicated extraction/indexing context
|-- prisma\schema.prisma                # Business schema source of truth
|-- prisma\migrations\                  # Versioned business migrations
|-- prisma.config.ts                    # CLI schema/migrations/database configuration
|-- docs\                               # Feature/operational documentation
|-- scripts\dev\, test\                 # Private dev process runner and E2E tests
|-- Dockerfile, docker-compose.yaml     # Shared image and optional local application profile
|-- ecosystem.config.cjs                # Production API process only
|-- ecosystem.dev.config.cjs            # Private development process group
|-- .github\workflows\deploy.yml         # master -> tests/build -> EC2 API deployment
`-- package.json, package-lock.json
```

| Process | Responsibility | Listener |
| --- | --- | --- |
| API | REST, Swagger, Socket.IO/SSE, exam-runtime and question-import processors | `PORT`, default `3001` |
| AI worker | Knowledge-plan preparation and question-generation batches; queue `ai-question-generation` | No HTTP port |
| Document worker | Extraction and RAG index checkpoints; queues `ai-document-processing` and `ai-document-indexing` | No HTTP port |
| Python AI service | Internal extraction, embedding/retrieval and generation; separate repository | Normally `8000` |

The API does not host the dedicated AI/document processors. PostgreSQL stores durable business commands/results; Redis delivers jobs and pub-sub. Worker execution/lease fences prevent stale writes. Recovery must not blindly reissue an ambiguous paid generation call; exactly-once provider billing is not guaranteed.

## Prerequisites

- **Node.js:** Prisma 7.8.0 requires `^20.19 || ^22.12 || >=24.0`. Prefer a supported Node 22 release at least 22.12 for consistency with the Docker image. The manifest has no `engines` or `packageManager` declaration; CI currently selects Node 20 without pinning a minor.
- **npm**, using the committed lockfile. Install development dependencies for Prisma CLI, compilation, tests and the private PM2 runner.
- **PostgreSQL and Redis:** reachable instances dedicated/configured for this application. Local Compose supplies ports `5432` and `6379`; no services start merely by installing dependencies.
- **Authentication configuration:** JWT/encryption secrets and both OAuth provider configurations. Strategies are registered unconditionally: password-only usage does not bypass their startup configuration.
- **AWS S3:** an existing bucket, credentials/permissions and browser-compatible bucket CORS for direct presigned uploads. Current code supplies explicit AWS credentials; it does not expose a custom endpoint/path-style MinIO configuration.
- **PDF rendering:** Puppeteer's downloaded browser or a compatible Chromium installation and required OS libraries/fonts. The Docker image installs Chromium itself.
- **Optional AI/RAG:** separately configured Python 3.12/FastAPI service. RAG additionally needs pgvector and the AI-owned schema/role in the same PostgreSQL database, as described under Service Integration.
- **Optional containers:** Docker Desktop with Linux containers and Docker Compose v2. Containers are an alternative local mode, not a requirement for a native setup.

## Environment Configuration

There is **no complete `.env.example`**. Create a local, untracked `.env` manually from the inventory below. [.env.ai.example](.env.ai.example) is only an AI integration supplement, not a usable full application template. Never copy real environment files, credentials, cookies or private keys into source control, documentation or shared logs.

### Core API, authentication and storage

| Variable | Requirement / default | Purpose and constraints |
| --- | --- | --- |
| `DATABASE_URL` | Required; no application fallback | PostgreSQL URL for the pg pool and Prisma CLI. URL-encode reserved password characters. |
| `PORT` | Optional; `3001` | API listener. |
| `NODE_ENV` | Set explicitly for the deployment | `production` makes authentication cookies secure; use HTTPS in production. |
| `FRONTEND_URL` | Required for usable browser authentication | Comma-separated exact frontend origins, normally `http://localhost:3000` locally. Omit spaces around commas. Used by CORS, gateways and auth Origin checks; no permissive browser fallback. |
| `REDIS_URL` | Optional; otherwise `127.0.0.1:6379` | Supports `redis://`/`rediss://`, credentials and database path. Host fallback does not supply a password. |
| `REDIS_PASSWORD` | Optional for runtime; match Redis configuration | Used when the URL does not supply a password. Compose Redis requires a password. |
| `JWT_ACCESS_SECRET` | Required; no default | Use a strong random secret of at least 64 characters. Frontend server verification must use the same value. |
| `JWT_REFRESH_SECRET` | Required; no default | Separate strong random refresh secret, not a reuse of the access secret. |
| `JWT_ACCESS_EXPIRES` | Optional; `15m` | Positive duration such as `15m`, `1h` or `900s`; do not use a unitless numeric environment string. |
| `JWT_REFRESH_EXPIRES` | Optional; `7d` | Absolute refresh-session lifetime; same duration syntax. |
| `AUTH_REFRESH_GRACE_SECONDS` | Optional; `10` | Integer from `1` to `30` for refresh rotation overlap. |
| `ENCRYPTION_SECRET` | Required; no default | Code checks at least 32 characters and derives a key; use an independently generated secret. |
| `GOOGLE_CLIENT_ID` | Required by registered strategy | Google OAuth application ID. |
| `GOOGLE_CLIENT_SECRET` | Required by registered strategy | Google OAuth application secret. |
| `GOOGLE_CALLBACK_URL` | Required by registered strategy | Registered backend callback, locally `http://localhost:3001/auth/google/callback`. |
| `OUTLOOK_CLIENT_ID` | Required for registered strategy | Microsoft OAuth application ID; no disable flag. |
| `OUTLOOK_CLIENT_SECRET` | Required for registered strategy | Microsoft OAuth application secret. |
| `OUTLOOK_CALLBACK_URL` | Configure for OAuth | Registered backend callback, locally `http://localhost:3001/auth/outlook/callback`. |
| `AWS_REGION` | Optional; `ap-southeast-1` | Region containing the existing bucket. |
| `AWS_ACCESS_KEY_ID` | Required for storage operations | Explicit credentials are passed to the SDK; do not assume an ambient IAM-role fallback. |
| `AWS_SECRET_ACCESS_KEY` | Required for storage operations | Secret corresponding to the access key. |
| `AWS_S3_BUCKET_NAME` | Required; no default | Existing bucket; startup does not create it. |

For a new local file, create it **only if absent**, then edit it in the IDE. Replace every `REPLACE_*` value below; these are placeholders, not working credentials or real defaults. The URL/origins are an example local topology, not provisioned resources.

```powershell
if (-not (Test-Path -LiteralPath .env)) {
    New-Item -ItemType File -Path .env | Out-Null
}
```

```dotenv
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://REPLACE_DB_USER:REPLACE_URL_ENCODED_PASSWORD@127.0.0.1:5432/REPLACE_DB_NAME
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=REPLACE_REDIS_PASSWORD
JWT_ACCESS_SECRET=REPLACE_WITH_AT_LEAST_64_RANDOM_CHARACTERS
JWT_REFRESH_SECRET=REPLACE_WITH_A_DIFFERENT_STRONG_RANDOM_SECRET
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
ENCRYPTION_SECRET=REPLACE_WITH_AN_INDEPENDENT_RANDOM_SECRET
GOOGLE_CLIENT_ID=REPLACE_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
OUTLOOK_CLIENT_ID=REPLACE_OUTLOOK_CLIENT_ID
OUTLOOK_CLIENT_SECRET=REPLACE_OUTLOOK_CLIENT_SECRET
OUTLOOK_CALLBACK_URL=http://localhost:3001/auth/outlook/callback
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=REPLACE_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=REPLACE_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=REPLACE_EXISTING_BUCKET_NAME
AI_QUESTION_GENERATION_ENABLED=false
AI_RAG_ENABLED=false
```

### AI integration and document limits

| Variable | Requirement / default | Purpose and constraints |
| --- | --- | --- |
| `AI_QUESTION_GENERATION_ENABLED` | Optional; `false` | Exactly `true` or `false`. Disabling skips validation of base URL/token/generation timeout, not core API/auth/storage configuration. |
| `AI_SERVICE_BASE_URL` | Required when AI enabled; no runtime fallback | HTTP(S) origin only, such as `http://127.0.0.1:8000`; no credentials, path, query or fragment. The client appends internal routes. |
| `AI_SERVICE_INTERNAL_TOKEN` | Required when AI enabled | Match Python `INTERNAL_API_TOKEN`; 32-256 visible ASCII characters, no spaces/control characters. Sent as `X-Internal-Token`. |
| `AI_SERVICE_TIMEOUT_MS` | Optional; `35000` | Integer `1..185000`. Text HTTP deadline; grounded generation uses `max(85000, AI_SERVICE_TIMEOUT_MS)`. Coordinate with Python deadlines below. |
| `DOCUMENT_SERVICE_TIMEOUT_MS` | Optional; `55000` | Integer `100..55000`; extraction HTTP deadline, validated even when generation is disabled. |
| `AI_RAG_ENABLED` | Optional; `false` | Exactly `true` or `false`; effective only with AI integration enabled. Python separately needs `RAG_ENABLED=true`. |
| `DOCUMENT_MAX_ACTIVE_PER_OWNER` | Optional; `100` | Positive integer active-document quota per owner. |
| `DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER` | Optional; `524288000` (500 MiB) | Positive integer byte quota per owner. |
| `DOCUMENT_UPLOAD_ABANDON_GRACE_MS` | Optional; `86400000` (24 hours) | Positive integer grace for abandoned upload reservations. |

Missing/invalid/nonpositive document quota/grace values fall back to their defaults. The 20 MiB individual document limit is a code constant, not another environment variable. Restart API/workers after integration environment changes.

### Compose and tooling settings

These are distinct from host runtime settings. Configure existing database/Redis credentials correctly before using Compose; changing initialization variables does not change accounts in an already initialized volume.

| Variable | Compose / tooling behavior |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose initialization/URL construction. File fallbacks are `postgres`, `postgres`, `testhub`; the password fallback is local-development-only, not a production recommendation. |
| `REDIS_PASSWORD` | Compose fallback is the local-development value `redis_password`; use a deliberate matching value. |
| `DOCKER_DATABASE_URL` | Optional complete container URL, overriding construction; use host `postgres`, not `localhost`. Useful for encoded passwords/query options. |
| `DOCKER_AI_SERVICE_BASE_URL` | Optional container override; default `http://host.docker.internal:8000`. |
| `PORT` | Host API port in the generation profile; container listener stays `3001`. |
| `PUPPETEER_EXECUTABLE_PATH` | Puppeteer library setting for a preinstalled browser; Docker sets `/usr/bin/chromium`. |
| `PUPPETEER_SKIP_DOWNLOAD` | Puppeteer install setting; Docker sets `true` because it installs Chromium separately. Do not skip a native download without another usable browser. |
| `NODE_OPTIONS` | Node/tooling options; deployment sets a memory limit for Prisma generation. |
| `TESTHUB_DEV_PM2` | Runner-set isolation marker (`1`); do not configure it manually or bypass the `dev:*` wrappers. |
| `PM2_HOME` | Private runner sets its own ignored state location; use `dev:*` wrappers, not global PM2 commands. |

`TESTHUB_DEV_RUN`, `PM2_DISCRETE_MODE` and `PM2_SILENT` are runner-internal settings, not ordinary application configuration. Test-only `TESTHUB_*` controls are listed under Testing and Code Quality. Python provider keys, RAG database credentials and generation-provider selection belong only in the AI service, never in this backend or frontend.

## Installation and Local Development

Run commands from this repository root. From the workspace root shown in this project:

```powershell
Set-Location 'D:\HUST\20251\GR2\testhub\sources\testhub-v2-backend'
node --version
npm --version
npm ci
```

Create/configure the local environment as above. `npm ci` replaces `node_modules` according to the lockfile and may install Puppeteer's browser; it does not provision the application database, bucket or OAuth applications.

### Database and infrastructure setup

Use existing local PostgreSQL/Redis, or deliberately start the infrastructure-only Compose services after reviewing [docker-compose.yaml](docker-compose.yaml):

```powershell
docker compose up -d postgres redis
```

This starts infrastructure and writes persistent volumes. It does **not** start the API, workers, Python, frontend or S3; PostgreSQL's image lacks pgvector. Match the host `.env` credentials to the actual initialized services. Never delete/recreate existing volumes to resolve a configuration mismatch.

Prisma configuration reads `DATABASE_URL` even for generation. Generate the client and inspect migration state:

```powershell
npx prisma generate
npx prisma migrate status
```

`generate` writes generated client files but does not apply database changes. `migrate status` connects to the configured database and is a status check, not permission to migrate. After confirming the target is the intended local database, reviewing pending SQL and backing up existing data, an operator may explicitly apply approved migrations:

```powershell
# DATABASE MUTATION: only against the reviewed, intended local database.
npx prisma migrate deploy
npx prisma generate
```

There is no automatic migration/seed on application or container startup. Do not substitute `db:sync`/`db push`: custom partial indexes and migration history matter. For schema development, `npx prisma migrate dev --name describe_change` creates/applies migrations and may request a reset; use only a disposable/local development database, never accept a reset of shared data. Do not edit historical migrations.

**Seed limitation:** `npm run seed` references missing `prisma\seed.ts`; no working seed/bootstrap-admin workflow is provided. Use the supported account flow and an approved account/role provisioning procedure, not a claimed built-in seed command.

### Choose one backend process mode

**API-only watch mode** is enough for non-AI API work; exam-runtime/import queues still require Redis:

```powershell
npm run start:dev
```

**Manual API plus dedicated workers:** build once, then run each process in a separate terminal from this root:

```powershell
npm run build
npm run start:prod
```

```powershell
npm run start:ai-worker
```

```powershell
npm run start:document-worker
```

The worker scripts execute built JavaScript and do not watch/rebuild sources. `start:prod` names the compiled entrypoint; cookie security still depends on `NODE_ENV`, not the script name. Do not rebuild the shared `dist` while competing compilers are running.

**Coordinated development group:** alternatively, the private local PM2 runner starts one watch compiler, API and both workers:

```powershell
npm run dev:up
npm run dev:status
npm run dev:logs
# When finished:
npm run dev:down
```

It reloads applications only after a zero-error build. `.env` changes need `dev:up` again. Closing logs does not stop processes; `dev:down` does. Do not run this group alongside a manual/container API or workers on the same port/queues. Starting enabled workers can process existing queued work and incur provider charges. See [development processes](docs/development-processes.md).

The API is normally `http://localhost:3001`, with Swagger at `http://localhost:3001/api-docs`. `GET /` returns `Hello World!`; it is not a database/storage/provider readiness contract. Start frontend and Python separately using their READMEs; no backend command starts them.

## Common Commands

| Command | Purpose / side effects |
| --- | --- |
| `npm ci` | Install locked dependencies; replaces `node_modules`, may download a browser. |
| `npm run start` / `npm run start:dev` | Nest start / watch API. |
| `npm run start:debug` | Watch API with debugger. |
| `npm run build` | Compile Nest and rewrite aliases with tsc-alias; writes `dist`. |
| `npm run start:prod` | Run compiled API; requires build and configured runtime. |
| `npm run start:ai-worker` | Run compiled AI worker; can consume paid generation work. |
| `npm run start:document-worker` | Run compiled extraction/indexing worker; embeddings can incur charges. |
| `npm run dev:up` / `npm run dev:down` | Start/reload or stop the private four-process development group. |
| `npm run dev:status` / `npm run dev:logs` | Inspect private dev processes; redact logs before sharing. |
| `npx prisma generate` | Generate client from the schema; writes generated files, no schema migration. |
| `npx prisma migrate status` | Inspect configured database migration state; connects to DB. |
| `npx prisma migrate deploy` | **Database mutation:** apply pending migrations, explicit operator approval required. |
| `npx prisma migrate dev --name describe_change` | **Database mutation:** create/apply development migration; may request reset. |
| `npm run db:sync` | **Database mutation:** `prisma db push`, potentially destructive; not the installation workflow. |
| `npm run seed` | **Not usable:** script points to missing `prisma\seed.ts`. |
| `npx tsc --noEmit -p tsconfig.json --incremental false` | Typecheck without JS/build-info output; no dedicated npm typecheck script. |
| `npx eslint "{src,apps,libs,test}/**/*.ts"` | Lint without automatic fixes. |
| `npm run lint` | **Source mutation:** ESLint uses `--fix`. |
| `npm run format` | **Source mutation:** Prettier uses `--write` on source/test files. |
| `npm test -- --runInBand` | Jest source suites; optional integrations require explicit fixture settings. |
| `npm run test:watch` / `npm run test:debug` | Watch / inspector test modes. |
| `npm run test:cov` | Jest coverage; writes `coverage`. |
| `npm run test:e2e` | Real AppModule E2E; requires application dependencies/configuration. |
| `npm run test:dev-runner` | Synthetic PM2/compiler lifecycle tests; starts isolated fixture processes. |

Commands are documentation, not evidence they were executed or passed. Never run migrations, reset, seed, infrastructure startup or deployment against an unverified/shared target.

## Testing and Code Quality

Jest discovers colocated `src\**\*.spec.ts` using ts-jest and the `@/` source alias. E2E configuration is [test/jest-e2e.json](test/jest-e2e.json); its test initializes the real AppModule rather than a dependency-free mock. Do not point integration tests at an application database or flush shared Redis.

A focused offline example and non-fixing quality checks:

```powershell
npx jest --runInBand pdf.service.spec exam-report.service.spec
npx tsc --noEmit -p tsconfig.json --incremental false
npx eslint "{src,apps,libs,test}/**/*.ts"
```

These are narrower than a full test/build run; they do not establish production readiness. Coverage targets from unrelated workspace instructions are not verified coverage results here.

| Opt-in control | Fixture / boundary |
| --- | --- |
| `TESTHUB_AI_DATABASE_URL`, `TESTHUB_AI_REDIS_URL` | Generation persistence/queue integration; use disposable loopback resources and inspect the fixture's safeguards. |
| `TESTHUB_KNOWLEDGE_DATABASE_URL` | Knowledge-plan integration with its isolated database fixture. |
| `TESTHUB_TREE_DATABASE_URL` | Chapter-tree PostgreSQL integration; use its documented isolated fixture. |
| `TESTHUB_REGRADE_DATABASE_URL` | Regrading fixture; must equal `DATABASE_URL`, empty DB `testhub_regrade_test` at loopback port `55441`. Never substitute an application DB. |
| `TESTHUB_IMPORT_INTEGRATION` | Opt-in import integration; inspect fixture setup before enabling. |
| `TESTHUB_AI_PYTHON` | Nest/FastAPI HTTP contract fixture using a selected Python executable and synthetic dependencies. |
| `TESTHUB_DOCUMENT_SIM_URL`, `TESTHUB_PLAN_SIM_URL` | Explicit local document/knowledge-plan HTTP simulations. |
| `IMPORT_TEST_FRONTEND`, `IMPORT_TEST_API`, `IMPORT_TEST_SECRET` | Separate import browser smoke harness only, not application environment settings. |

Read [AI tests](docs/ai-question-generation.md), [document verification](docs/learning-documents.md), [knowledge-plan tests](docs/knowledge-plans.md), [chapter tests](docs/chapter-hierarchy.md), [regrading tests](docs/manual-regrading.md) and [import testing](src/question-imports/testing/README.md) for each fixture's setup and safeguards. A skipped/collected suite is not a passing execution. Synthetic HTTP contract tests do not prove real provider access or quality.

PM2 lifecycle tests create isolated fixtures/processes rather than exercising the real DB/Redis/AI. Documentation-only edits need link/heading/fence/script checks and `git diff --check`, not application builds, databases or provider probes.

## Service Integration

### Frontend and public API

Frontend `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001` and is built into the frontend bundle. There is **no global `/api` or `/api/v1` prefix**. Swagger UI is `/api-docs`; representative routes are:

| Routes | Responsibility |
| --- | --- |
| `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | Authentication/session lifecycle; Google/Outlook login and callbacks are also under `/auth`. |
| `/users`, `/topics`, `/chapters`, `/questions` | Accounts and question banks; chapter subtree/ancestor APIs support nested trees. |
| `/exams`, `/exam-registrations` | Exam definitions, selections and registration. |
| `/submission`, `/submission/:id/regrade`, `/exams/:id/print` | Attempts/answers, regrading and PDF/print operations. |
| `/exam-runtime` | Runtime status/ping/violations, student/monitor SSE, roster, retry grants and extensions. |
| `/files`, `/s3`, `/notification` | File metadata/presigned access, legacy storage routes and notifications. |
| `/learning-documents` | Library/version/extraction, index/retry/retrieval APIs. |
| `/question-generation-plans`, `/question-generation-batches` | Durable plans, generation, revisioned review and approved commit. |

HTTP JWT guards extract the `access_token` cookie; Swagger's bearer declaration does not make HTTP bearer tokens interchangeable with cookies. There is no global auth guard: route/role checks vary, and legacy `/s3` routes are not JWT-guarded. Do not describe every endpoint as authenticated or every error/pagination response as identical. Common list responses are flat `{ data, total, page, limit }`.

Frontend server-only `NEXT_JWT_ACCESS_SECRET` must match backend `JWT_ACCESS_SECRET`. The legacy frontend fallback `NEXT_JWT_SECRET` is used only when the primary is absent; an empty primary does not fall back. These verification secrets are never `NEXT_PUBLIC_*`. Browser requests need credentials; state-changing auth operations require an `Origin` matching `FRONTEND_URL`. Use the same hostname locally (`localhost` versus `127.0.0.1` matters); cross-host deployments need an appropriate same-host reverse proxy/BFF so frontend route verification receives the cookies. Cookies are httpOnly, SameSite=Lax and secure in production; the refresh cookie is scoped to `/auth/refresh`.

Socket.IO namespaces are `/notifications` and `/exam-runtime`; connections validate access tokens/sessions, not query-supplied identity. Session revocation is periodically checked. SSE clients use credentials and their own reconnect/resynchronization behavior. Notifications are persisted before best-effort emission. Upload flow is reservation -> browser PUT to presigned S3 URL -> backend confirmation; a successful reservation does not prove upload completion.

### Python AI, RAG and evidence

Nest calls the private Python 3.12/FastAPI service, normally port `8000`, with `X-Internal-Token`. Keep this service internal. Browser code never receives this token, a provider key or database credentials. The current extraction pipeline does not perform OCR: `OCR_REQUIRED` is not usable generation context. `EXTRACTED` does not imply a `READY` index, and eligible partial extraction requires explicit confirmation.

| Internal route | Ownership / effect |
| --- | --- |
| `POST /internal/generate` | Text question drafts; backend validates the returned question contract. |
| `POST /internal/documents/extract` | Bounded PDF/PPTX bytes, not an arbitrary source URL; no LLM generation. |
| `GET /internal/rag/profile` | Immutable indexing/embedding profile. |
| `POST /internal/rag/prepare`, `/internal/rag/step` | Chunk preparation and bounded embedding checkpoints. |
| `POST /internal/rag/outline` | Full authorized source-derived outline; not a top-k sample or LLM coverage guarantee. |
| `POST /internal/rag/retrieve`, `/internal/rag/generate` | Scoped embedding retrieval / cited question generation. |
| `POST /internal/rag/revoke` | Eventual technical tombstone after business revocation; not guaranteed physical deletion. |

RAG uses the **same PostgreSQL database** through a separate AI login/schema, not Nest's business-table credentials. Default `postgres:17-alpine` has no pgvector extension. An operator must install a compatible server extension, review/run Python's `migrations\000_bootstrap.sql` as the appropriate DBA, set the dedicated role password securely, then apply `001_rag.sql` and `002_optional_document_chapter.sql` as the AI schema owner. Prisma migrations cover business tables only; runtime never performs this AI bootstrap. Follow [RAG setup](docs/rag-indexing.md) and the [AI README](../testhub-ai-service/README.md), including backup/restore cautions before changing database images/volumes.

Python-only settings include `INTERNAL_API_TOKEN`, `RAG_ENABLED`, `RAG_DATABASE_URL`, `GEMINI_API_KEY` and provider selection. Switching generation to **9Router changes generation only**: embeddings remain Google's `gemini-embedding-001`, 768 dimensions, and `GEMINI_API_KEY` remains required with RAG. Optional generation fallback may involve another provider. Do not put provider keys in Nest/frontend or assume readiness proves provider quota/model access.

| Operation | Nest HTTP deadline | Python deadline with default generation settings |
| --- | --- | --- |
| Text generation | `35000` ms by default | `30000` ms default generation deadline |
| Extraction | `55000` ms by default | `45000` ms default extraction deadline |
| Grounded generation | `max(85000, AI_SERVICE_TIMEOUT_MS)` | Derived `max(75000, generation deadline + 15000)` ms; an explicit Python override must be at least generation deadline + 15000 ms |

Keep Nest's deadline above the configured Python deadline plus network allowance, and coordinate proxy/client timeouts too. For example, a Python generation deadline of `110000` ms derives a `125000` ms grounded deadline; deliberately setting Nest `AI_SERVICE_TIMEOUT_MS=130000` covers that path. This is an example override, not the default, and also changes the text HTTP timeout. Nest's supported maximum is `185000` ms; not every Python timeout configuration fits it. Do not add retries at every layer: Nest clients do not retry provider invocations, and durable recovery distinguishes persisted results from ambiguous calls.

Python `/health` proves process liveness only. `/ready` checks database/schema only when Python `RAG_ENABLED` is enabled; neither proves provider readiness. Diagnose the actual internal response code without exposing raw provider bodies or tokens.

In particular, a valid RAG `422` with `RAG_INSUFFICIENT_EVIDENCE` is a **nonretryable evidence refusal**, not `AI_OUTPUT_INVALID`. Nest maps it and legacy context-shortage codes to `AI_INSUFFICIENT_EVIDENCE`. Only bounded, in-request slot/reason diagnostics are retained/exposed through owned batch details; missing issues mean unknown affected slots. Do not automatically retry paid generation, split the batch, accept partial drafts or write bank rows after refusal. Source citations must remain scoped and be rechecked after editing; approvals must match current revisions.

## Deployment and Production

### Existing EC2 workflow

[deploy.yml](.github/workflows/deploy.yml) triggers on pushes to **`master`**. It installs dependencies, generates Prisma Client, runs Jest with `--passWithNoTests`, builds and uploads artifacts, then uses SSH/rsync on EC2, installs dependencies including dev tools, generates Prisma Client and runs `prisma migrate deploy`. Lint is commented out. A green pipeline does not establish opt-in integrations, provider readiness or full E2E correctness.

The production [PM2 configuration](ecosystem.config.cjs) and workflow manage **`testhub-api` only**. They do not deploy/start/restart dedicated AI/document workers or the Python/frontend services, and do not provision RAG/pgvector or S3. Verification currently inspects PM2 status/logs, not an external end-to-end health check. Infrastructure such as TLS/reverse proxy and actual database hosting must be confirmed for the target deployment, not inferred from this README.

Operators must separately coordinate reviewed schema changes and compatible API/worker/Python releases before enabling the frontend feature. Restart all affected processors after code/config changes and drain in-flight work safely; old workers must not bypass new session, source, revision or grading fences. Configure production secrets/HTTPS/origins explicitly. Pushes to `master`, deployment commands and migrations have real production side effects and require approval.

### Local container alternative, not production orchestration

After the existing database has the required pgvector/RAG setup, migrations and backend environment, start Python separately and stop competing host backend processes. Then the opt-in profile can build/start the shared Nest image and both workers:

```powershell
# Starts infrastructure/application processes and can consume queued paid work.
docker compose --profile generation up -d --build
docker compose --profile generation ps
docker compose --profile generation logs -f --tail 50 api ai-worker document-worker
# Stop only the application processes, retaining infrastructure:
docker compose --profile generation stop api ai-worker document-worker
```

The profile overrides AI/RAG flags to `true`, `NODE_ENV` to `development`, database/Redis hosts to `postgres`/`redis`, Python to `host.docker.internal:8000` by default, and publishes the API on host loopback. Python must be reachable through Docker Desktop's host gateway; bind it appropriately and restrict access with the firewall. Frontend and storage remain separate. Profile environment changes need recreation (`up`), not just `restart`.

The multi-stage Node 22 image generates Prisma/builds on Linux, installs Chromium/fonts, runs as non-root and excludes host secrets/dependencies. The final image does not include the Prisma migration tooling/schema directory for an operator migration job. Build/start does not migrate or seed. API healthcheck is `GET /`; workers have no HTTP readiness endpoint. Shutdown allows four minutes to drain work. See [container setup](docs/docker-generation.md).

Never use `down -v` against valuable data. Even ordinary `down` removes containers and can lose a manually installed pgvector package despite surviving volumes; prefer targeted stop for an existing local setup. Do not publish plain `docker compose config` output: interpolation can reveal secrets; `docker compose config --quiet` validates without dumping resolved configuration.

## Troubleshooting

| Symptom | Checks / safe action |
| --- | --- |
| Prisma/Node startup failure | Check the exact Node version against Prisma's engine range, `npm ci` state, `DATABASE_URL`, generated client and reviewed migration status. Do not run reset or db push as a repair shortcut. |
| OAuth error despite password-only usage | Both strategies are constructed at startup. Supply real registered provider configuration; there is no OAuth-disable switch. |
| Browser login 403, recurring 401 or redirect | Check exact Origin/`FRONTEND_URL`, credentialed requests, secure-cookie HTTPS, cookie hostname and frontend verification secret equality. Old pre-session tokens require a fresh login; inspect session-transfer state. |
| Redis authentication/connection error | Native host uses loopback; containers use `redis`. Match actual password and URL credentials. A blank host password does not match Compose's password-protected Redis. |
| S3 upload/view failure | Check existing bucket/region, explicit key permissions, bucket CORS and the browser's completed PUT before confirmation. Current service has no generic MinIO endpoint setting. |
| Batch remains queued / source never ready | Check the correct dedicated worker, DB outbox/progress and Python integration flags. Extraction is not indexing; confirm eligible PARTIAL sources explicitly. Avoid duplicate competing worker groups. |
| RAG unavailable or missing nullable chapter column | Review pgvector availability, dedicated role/grants and AI migrations 000/001/002 plus business migration status. Do not grant AI access to the question bank or replace a live image/volume blindly. |
| AI timeout / provider failure | Compare Nest/Python/proxy deadlines and sanitized error codes. Process/readiness probes do not test provider access. 9Router does not replace Google embeddings. |
| `AI_INSUFFICIENT_EVIDENCE` | Treat as a valid refusal; review source coverage, requested slots and safe diagnostics. Do not relabel it a schema error or automatically issue another paid request. |
| `AI_OUTPUT_INVALID` | A different failure: returned structure/count/type/citations did not satisfy the contract. Inspect sanitized status, not raw model output in shared logs. |
| Revision conflict / ambiguous commit or regrade | Reload saved state/history and reconcile before retrying. Edits invalidate approval; do not create a duplicate batch or overwrite a newer published grade. |
| Chromium missing / PDF 503 | Ensure a usable browser/libraries/fonts. Submission PDF preparation/rendering each have per-process limits of two active requests plus four waiters; a full queue returns 503. Missing-image fallbacks and report font fallback are separate concerns. |
| Stale dev code / port collision | Use one compiler/process mode; inspect private `dev:logs`, fix build errors, rerun `dev:up` after env edits and stop only identified competing processes. |
| Missing seed / broken old setup command | No full environment template, working seed or ZenStack generation command is supplied. Follow the manual configuration and Prisma migration sequence here. |

Bundled report WOFF2 fonts are copied from `src\submission\fonts` at build time; missing assets use a system-font fallback. PDF rendering and HTTP liveness do not independently prove result completeness or correctness. Do not share raw logs containing identities, tokens, source text or signed URLs.

## Further Documentation

| Document | Scope |
| --- | --- |
| [Development processes](docs/development-processes.md) | Private PM2 group, compile/reload fencing, logs and shutdown. |
| [Local Docker generation](docs/docker-generation.md) | Prerequisites, container/host environment mapping and safe stop/recreate behavior. |
| [Authentication sessions](docs/auth-sessions.md) | Cookie/session contract, transfers, rollout and verification. |
| [AI question generation](docs/ai-question-generation.md) | Staging, durable execution, safe errors, review/commit and integration fixtures. |
| [Learning documents](docs/learning-documents.md) | Upload/extraction contract, operational limits, source lifecycle and tests. |
| [RAG indexing](docs/rag-indexing.md) | pgvector/bootstrap/role setup, AI migrations, indexing/retrieval and grounded generation. |
| [Knowledge plans](docs/knowledge-plans.md) | Source-derived outlines, matrix revisions, retrieval scope and approved chapter resolution. |
| [AI architecture flow](docs/architecture/AI_QUESTION_GENERATION_FLOW.md) | Cross-service flow, evidence diagnostics and limitations. |
| [Chapter hierarchy](docs/chapter-hierarchy.md) | Recursive trees, ownership and overlapping selection quotas. |
| [Exam distribution delta](docs/exam-distribution-delta.md) | Global transfer budget and separate print/online semantics. |
| [Manual regrading](docs/manual-regrading.md) | Private drafts, publication, atomic audit/notifications and concurrency. |
| [Prisma pg serialization](docs/prisma-pg-serialization.md) | Local transaction-adapter workaround and removal conditions. |
| [Migration repair notes](docs/migration-repair-source-indexes.md) | Historical recovery context; not routine fresh-install instructions. |
| [Import testing](src/question-imports/testing/README.md) / [parser fixtures](src/question-imports/parsers/fixtures/README.md) | Isolated import/browser checks, formats and fixture guidance. |
| [Backend agent guide](AGENTS.md) | Repository-specific conventions and safety rules. |
| [Frontend README](../testhub-v2/README.md) / [AI README](../testhub-ai-service/README.md) | Separate application setup, configuration and deployment boundaries. |

Feature documents may include dated rollout snapshots or platform-specific examples. Use current source/configuration as the executable contract and review pending migrations against the actual target; this README does not certify live infrastructure or provider availability.
