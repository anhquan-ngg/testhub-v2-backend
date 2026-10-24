# Text question generation: batches, staging and background execution

## Uploaded-document RAG update (2026-10-23)

The generation UI now attaches PDF/PPTX and the same batch API also accepts
source.mode=document with an immutable version_id and optional knowledge query.
The AI worker coordinates extraction/index readiness before generating cited drafts.
See [RAG file generation setup and contract](rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23),
including the new business migration and both worker processes. Existing text API
contracts and the review/approval/commit flow remain available.

Implemented: generation, persisted batches, lecturer review and approved commit,
using `text-generation.v1`. `QuestionGenerationModule`
exposes lecturer-owned batch creation and polling. A dedicated Nest application
context dispatches a PostgreSQL outbox and processes BullMQ jobs through FastAPI.
Validated questions are persisted in separate AI staging tables. They are never
inserted into `Question` until the lecturer explicitly approves and commits them.
DOCX/XLSX import tables remain separate. The frontend workspace is
`/{locale}/lecturer/questions/generate`, linked from the question bank.

## Ownership and invocation

```typescript
// The background execution service invokes this through Nest DI.
const drafts = await this.generation.generateDrafts(
  { id: authenticatedUser.id, role: authenticatedUser.role },
  command,
);
```

The actor comes from authenticated server state. The worker reloads the
current active user and role from DB; never trust role/owner values in a browser
request or an old queue payload. Only `LECTURER` can generate, including when the
caller is an administrator. The DB lookup requires the chapter to be active,
inside the specified active topic, and the topic's `created_by` to equal actor ID.
Unknown, deleted, foreign and mismatched targets all return the same 404.
Ownership is rechecked after generation; a revoked target discards the result.
Commit rechecks the active owner/target policy inside its transaction.
This policy does not repair unrelated existing question CRUD authorization.

## Frozen application command

```json
{
  "topic_id": "11111111-1111-4111-8111-111111111111",
  "chapter_id": "22222222-2222-4222-8222-222222222222",
  "source": {
    "mode": "text",
    "text": "Tìm kiếm nhị phân hoạt động trên mảng đã sắp xếp và có độ phức tạp O(log n)."
  },
  "question_configs": [
    { "question_type": "SINGLE_CHOICE", "question_format": "KNOWLEDGE", "count": 3 },
    { "question_type": "MULTIPLE_CHOICE", "question_format": "APPLYING", "count": 2 }
  ],
  "language": "vi",
  "external_processing_consent": true
}
```

This is the body of the implemented `POST /question-generation-batches` route.
The frontend mirror is `../testhub-v2/src/types/question-generation.ts`.
Runtime validation is strict: no numeric/string/boolean coercion or extra fields;
UUID target IDs; trimmed text of 20–20,000 Unicode code points; 1–10
`question_configs` rows of `SINGLE_CHOICE | MULTIPLE_CHOICE` ×
`KNOWLEDGE | UNDERSTANDING | APPLYING | ADVANCED` × count, totalling 1–20
questions; Vietnamese only. Questions are generated in row order. The legacy
single-row form `question_type: SINGLE_CHOICE, question_format, count` is still
accepted and normalized to one row; sending both forms is rejected. The batch
stores `question_configs` (migration `20261023120000_add_generation_question_configs`
backfills old rows); `question_type`/`question_format` columns keep the first row
for older readers and `requested_count` is the total.
Document mode is implemented with an immutable version_id and optional query;
see [file generation](rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23).
Learning objectives and ESSAY generation remain unsupported. Explicit consent
is required before source content or queries are disclosed.
The batch stores the source snapshot and a `consented_at` timestamp.

Authenticated batch API: `POST /question-generation-batches`, returning
202 after durable persistence, with lecturer/JWT guards and an owner-scoped
`Idempotency-Key`. Use a class-validator DTO and preserve raw strict types before
the service schema (the current global pipe enables implicit conversion).
No synchronous generation route is added for this milestone: browser Axios has a
10-second timeout, while generation may take 30 seconds.

Persisted batch states are `WAITING_SOURCE`, `QUEUED`, `GENERATING`, `REVIEW_REQUIRED`, `FAILED`,
`COMPLETED`. Item states are `VALID`, `APPROVED`, `INVALID`, `REJECTED`, `COMMITTED`,
`SKIPPED`; the worker creates only `VALID` items after strict output validation.
`APPROVED` is an explicit lecturer decision; `VALID` is not approval. The frontend
type mirrors these persisted states. Cancellation/expiry are not implemented.

## Internal HTTP contract and bank mapping

The adapter resolves `topic` from DB; clients cannot supply a display label or
arbitrary internal URL. Empty topic names become null; names over 200 code points
are truncated for the provider prompt. Only these three fields leave NestJS:

```json
{
  "text": "Tìm kiếm nhị phân hoạt động trên mảng đã sắp xếp và có độ phức tạp O(log n).",
  "topic": "Cấu trúc dữ liệu",
  "question_configs": [
    { "question_type": "SINGLE_CHOICE", "question_format": "KNOWLEDGE", "count": 1 }
  ]
}
```

Python still accepts the older `question_format` + `count` request (single choice)
for compatibility; NestJS always sends `question_configs`.

`POST /internal/generate` uses `X-Internal-Token`. It receives no user cookie,
Gemini key, topic/chapter IDs, consent flag, or batch state. The application
service returns `{topic_id, chapter_id, questions}`. Every question contains
`question_text`, four distinct `{text,isCorrect}` choices, the requested
`question_type`/`question_format` of its position, and `correct_answer: null`.
`SINGLE_CHOICE` has exactly one correct choice; `MULTIPLE_CHOICE` has two or three
(never all four). The same rule applies to lecturer edits. NestJS independently
checks unknown fields, lengths, exact count, type/level per position, duplicate
texts and choices. Duplicate comparison
uses trimmed lower-case text in NestJS; Python additionally uses Unicode
`casefold`. This is structural validation, not proof of educational correctness.

`toQuestionBankDraft(question, chapterId)` is a pure serializer: `options` becomes
`JSON.stringify(question.options)` and `correct_answer` remains null. Call it
only after approval/authorization in the commit transaction. It neither marks an
item approved nor writes to Prisma.

## Configuration

Append the entries in `.env.ai.example` to the existing backend environment.
Do not copy it over your existing `.env`.

| Backend variable | Setting |
| --- | --- |
| `AI_QUESTION_GENERATION_ENABLED` | `false` by default; explicit `true` enables calls. |
| `AI_SERVICE_BASE_URL` | Private HTTP(S) origin, e.g. `http://127.0.0.1:8000`; no credentials, path, query or fragment. |
| `AI_SERVICE_INTERNAL_TOKEN` | Same secret as Python `INTERNAL_API_TOKEN`; 32–256 visible ASCII characters. |
| `AI_SERVICE_TIMEOUT_MS` | 35000 by default; total fetch/body deadline, range 1–185000. |

Generate the internal token locally with Python `secrets.token_urlsafe(32)` and
configure the same value on both services. Keep the Gemini key in Python only.
Settings are read once during Nest module initialization; restart after changes.
When disabled, no AI URL/token is required. Enabled invalid config fails startup
with variable names only. Python defaults to a 30000 ms generation deadline;
increase Nest's deadline when increasing Python's, allowing internal-network time.
Use a private network and HTTPS when the transport is not an isolated local
network. Redirects are refused to prevent token forwarding. Response bodies are
limited to 1 MiB, decoded as strict UTF-8 and validated as JSON.

The HTTP client sends one invocation. Python already owns up to three SDK
attempts within its deadline. Do not add automatic retries to this stateless
endpoint from NestJS: a lost response may already have incurred a provider charge.
BullMQ uses one attempt. Delivery and DB persistence retries are described below;
they do not repeat an already claimed provider invocation.

## Safe errors

Errors use `{statusCode,error,message,details:{code}}`; raw input/provider bodies,
SDK messages and tokens are never attached or logged. Client logs contain only
event, safe code and upstream HTTP status. A Python 401 is an integration token
failure, not an expired browser session; returning it as browser 401 would trigger
the existing frontend refresh flow incorrectly.

| Failure | Nest status | Code |
| --- | --- | --- |
| Command invalid | 400 | `AI_REQUEST_INVALID` |
| Consent absent/false | 400 | `CONSENT_REQUIRED` |
| Caller not lecturer | 403 | `AI_ROLE_FORBIDDEN` |
| Target unavailable to caller | 404 | `AI_TARGET_NOT_FOUND` |
| Integration disabled | 503 | `AI_GENERATION_DISABLED` |
| Python 401/403 | 502 | `AI_SERVICE_AUTH_FAILED` |
| Python 422 after local validation | 502 | `AI_SERVICE_CONTRACT_MISMATCH` |
| Python 502 | 502 | `AI_PROVIDER_FAILED` |
| Python 429/503 or connection/redirect failure | 503 | `AI_SERVICE_UNAVAILABLE` |
| Python 504 or local deadline | 504 | `AI_SERVICE_TIMEOUT` |
| Invalid/mismatched/oversized output | 502 | `AI_OUTPUT_INVALID` |
| Other upstream status | 502 | `AI_SERVICE_FAILED` |

Python's existing generic 502 cannot distinguish invalid provider JSON from other
provider failures. Keep that ambiguity; do not infer whether a retry is safe.

## Verification

```powershell
# Backend only: deterministic HTTP transport, schema and owner-policy tests.
npm test -- question-generation --runInBand

# Real HTTP across both repos; provider is fake, no Gemini call or DB required.
$env:TESTHUB_AI_PYTHON = (Resolve-Path '..\testhub-ai-service\.venv\Scripts\python.exe').Path
npm test -- question-generation --runInBand
Remove-Item Env:TESTHUB_AI_PYTHON

# In the Python repo:
.\.venv\Scripts\python.exe -m pytest -q
```

`TESTHUB_AI_PYTHON` enables the opt-in integration suite. It launches test-only
FastAPI on a random loopback port, validates identical versioned JSON fixtures,
exercises the production routes with a fake provider, and stops the child process.
Standalone backend CI skips that cross-repo suite and the opt-in DB/Redis suite. Fixtures live in
`src/question-generation/fixtures/text-generation.v1.json` and
`../testhub-ai-service/contracts/text-generation.v1.json`; update them together.

A real Gemini verification needs Python's configured model/key and external API
access; mocked/contract tests are not evidence that that account has quota.
On 2026-10-16, a separate Node client → real FastAPI → real Gemini invocation
using this sample passage returned one validated `SINGLE_CHOICE` question. That
check exercised no DB or public batch route and is not an educational-quality
benchmark. No credentials were printed or written to these fixtures.
For local manual verification, start the Python service using its README, open
`http://127.0.0.1:8000/docs`, authenticate with its internal token, and send
`internal_request` from the fixture. This validates the real provider independently
of the public batch API.

## Persistence and execution

| Prisma model / SQL table | Purpose |
| --- | --- |
| `QuestionGenerationBatch` / `question_generation_batches` | Owner, target, normalized source/config, contract version, consent timestamp, idempotency hash, state/counters and execution lease. |
| `QuestionGenerationItem` / `question_generation_items` | Immutable original JSON, current draft JSON, revision, validation fields, fingerprint, reviewer/timestamps and committed bank mapping. |
| `QuestionGenerationAttempt` / `question_generation_attempts` | One execution per batch, validated result checkpoint and safe outcome (`RUNNING/SUCCEEDED/FAILED/UNKNOWN`). Python's individual SDK retries are not separate attempts here. |
| `QuestionGenerationOutbox` / `question_generation_outbox` | Durable dispatch command, delivery count, backoff and next reconciliation time. |
| `QuestionGenerationReview` / `question_generation_reviews` | Transactional edit/approval/rejection/commit audit: actor, revision, before/after status and data, committed question ID. |

```mermaid
sequenceDiagram
    participant UI as Lecturer client
    participant API as NestJS API
    participant DB as PostgreSQL
    participant W as Dedicated AI worker
    participant Q as BullMQ / Redis
    participant AI as FastAPI
    UI->>API: POST batch + cookie + Idempotency-Key
    API->>DB: Transaction: batch + outbox
    API-->>UI: 202 + batch_id
    W->>DB: Reconcile outbox
    W->>Q: Stable job ID, batch UUID only
    Q->>W: Deliver job
    W->>DB: Claim QUEUED -> GENERATING + attempt/lease
    W->>AI: One bounded POST /internal/generate
    AI-->>W: Validated JSON
    W->>DB: Checkpoint result
    W->>DB: Transaction: items + REVIEW_REQUIRED
    UI->>API: GET batch / items
    API->>DB: Owner-scoped reads
    API-->>UI: State and drafts
```

- Reuse a 16–128 character `Idempotency-Key` for transport retries of the same
  normalized command. Owner/key uniqueness and the canonical request hash make
  simultaneous identical submissions reuse one batch/outbox. Changed input with
  the same key returns 409. A new key intentionally creates a new generation.
- Redis is not required to accept the batch. Run the dedicated worker to dispatch
  accepted work; the API process does not start this AI processor. Every 5 seconds
  the worker reconciles expired leases and up to 50 due outbox rows. Redis readiness
  checks avoid offline command accumulation. Redis commands have a 10-second
  timeout; failed delivery backs off from 5 seconds to 5 minutes. Queued commands
  are rechecked every 60 seconds, including commands already dispatched to Redis.
- Worker concurrency is 2 per process. Multiple deliveries/processes are fenced
  by a DB `QUEUED -> GENERATING` conditional update and execution UUID. Queue
  attempts = 1; max stalled redelivery = 1. A redelivery can reclaim an unclaimed
  command, but cannot call AI again for an already claimed execution.
- The execution lease is 5 minutes, longer than the maximum configured Nest
  HTTP deadline of 185 seconds. There is one FastAPI HTTP invocation; Python owns
  up to 3 provider attempts inside its deadline. Upstream errors become a durable
  `FAILED` batch with a safe `error_code`, not a 5xx on the earlier POST response.
- Validated output is checkpointed before creating items. DB persistence is
  retried at most 3 times (100/200 ms waits) without repeating AI. After worker
  death, expired leases with a valid checkpoint finalize items transactionally.
  Without one, the batch becomes `FAILED/AI_EXECUTION_INTERRUPTED` and its attempt
  `UNKNOWN`; a response might have been billed but never durably received. An
  explicitly new request/key is required to generate again. No exactly-once
  provider billing guarantee is claimed.
- Completion and failure writes require the current execution/state. Completion
  also checks the active lecturer and current target ownership/chapter membership.
  Item insertion failure rolls back the batch transition. Unique batch/index and
  item/question constraints support duplicate-safe bank commit.
- JSON drafts keep `options` as an array. The approved commit calls
  `toQuestionBankDraft` to serialize options to the bank's JSON string column.
  `VALID` means structural validation, not lecturer approval or educational quality.

## Run and demo locally

1. Review the full migration chain used by `GenerationBatchRepository`, in order
   (each directory below contains `prisma/migrations/<name>/migration.sql`):
   - `20261019090000_add_ai_generation_staging`: batches, items, attempts and outbox.
   - `20261019100000_add_ai_review_commit`: review audit, item revisions/approval
     and committed-question relationships.
   - `20261021090000_add_learning_documents`: learning documents, immutable versions
     and their owner/topic/chapter relationships.
   - `20261021100000_add_document_indexes`: business document indexes and version FK.
   - `20261023090000_add_document_question_generation`: WAITING_SOURCE, source-mode,
     source version/index/profile/query and preparation-stage columns, item provenance,
     source FKs and lookup indexes.
   - `20261023120000_add_generation_question_configs`: backfilled, required JSONB
     `question_configs`.

   On an existing local development database with migration history already in
   sync, run `npx prisma migrate deploy` then `npx prisma generate`. Review migration
   status first (`npx prisma migrate status`); do not reset a database to resolve
   drift. Verify all six migrations against the actual DB/schema configured for
   the API, AI worker and document worker, including the tables/columns/FKs listed
   above. Batch reads select `sourceVersion` even for text batches, so learning-document
   schema is required too. Review pending SQL before applying it; these instructions
   do not establish that your runtime DB has been migrated. Python's technical `rag`
   schema has separate operator-run setup in [the RAG guide](rag-indexing.md).
2. Configure PostgreSQL, `REDIS_URL` (and `REDIS_PASSWORD` if applicable), and the
   AI variables above. Set `AI_QUESTION_GENERATION_ENABLED=true` in both Nest API
   and worker environments. Start Python/FastAPI using its README.
3. Start the API with `npm run start:dev`. In another terminal in this repo, run
   `npm run build` then `npm run start:ai-worker`. Rebuild/restart the dedicated
   worker after source changes. Current deployment automation starts the API;
   production worker registration/monitoring is a separate deployment action.
4. Log in as a lecturer and use that session's `access_token` cookie in an HTTP
   client (Postman cookie jar or browser fetch below). This repository's JWT
   strategy extracts the cookie; a Bearer header alone does not authenticate it.
   Choose a topic/chapter owned by that lecturer.

From the signed-in frontend's browser console (replace the two IDs):

```javascript
const api = 'http://localhost:3001';
const command = {
  topic_id: '<owned-topic-uuid>',
  chapter_id: '<owned-chapter-uuid>',
  source: { mode: 'text', text: 'Binary search operates on a sorted array and has logarithmic time complexity.' },
  question_type: 'SINGLE_CHOICE', question_format: 'KNOWLEDGE', count: 2,
  language: 'vi', external_processing_consent: true,
};
const key = crypto.randomUUID(); // keep this same value when retrying this submission
const accepted = await fetch(`${api}/question-generation-batches`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
  body: JSON.stringify(command),
});
const batch = await accepted.json(); // expect HTTP 202, {batch_id,status,status_url}
const status = await fetch(`${api}${batch.status_url}`, { credentials: 'include' }).then(r => r.json());
// Repeat the status GET until REVIEW_REQUIRED or FAILED; do not repeat POST with new keys.
const items = await fetch(`${api}${batch.status_url}/items?page=1&limit=20`, { credentials: 'include' }).then(r => r.json());
console.log(status, items);
```

Use matching localhost/127.0.0.1 hostnames for cookie behavior and configure the
frontend origin in `FRONTEND_URL`. Poll GET every 1–2 seconds and stop at a terminal
state. `GET /question-generation-batches/:id` excludes source/attempt/job details.
`GET /:id/items` returns `{data,total,page,limit}`, with page >= 1 and limit 1–100.
Unknown/foreign batches and their items return 404. The UUID is not an access grant.

You can demonstrate `QUEUED` with the worker stopped, then start the worker and
show `REVIEW_REQUIRED` and the items. The `Question` bank table remains unchanged
until explicit approval and commit. Open the frontend AI workspace to edit,
approve/reject, select and confirm saving. No cancel or automatic retry API is
included. Source/result retention, per-owner quotas and cost
budgets still require decisions; no automatic source cleanup policy is assumed.

## PostgreSQL/Redis integration tests

Use disposable loopback services and a database name ending in `_test`:

```powershell
docker run --detach --rm --name testhub-ai-test-pg -e POSTGRES_PASSWORD=ai-local-test -e POSTGRES_DB=testhub_ai_test -p 127.0.0.1:55439:5432 postgres:17-alpine
docker run --detach --rm --name testhub-ai-test-redis -p 127.0.0.1:56389:6379 redis:7-alpine
$env:TESTHUB_AI_DATABASE_URL = 'postgresql://postgres:ai-local-test@127.0.0.1:55439/testhub_ai_test'
$env:TESTHUB_AI_REDIS_URL = 'redis://127.0.0.1:56389'
npm test -- question-generation --runInBand --cacheDirectory .tmp/jest-ai
Remove-Item Env:TESTHUB_AI_DATABASE_URL, Env:TESTHUB_AI_REDIS_URL
docker stop testhub-ai-test-pg testhub-ai-test-redis
```

The suite creates/drops its own UUID-named PostgreSQL schema and Redis prefix;
it never resets a shared schema or flushes Redis. It generates a fresh schema
with the installed Prisma CLI. It runs actual Nest HTTP routes (JWT identity is
injected only in the test; real RolesGuard remains), actual DB transactions,
BullMQ/Redis including the dedicated Nest worker module, and a local fake AI
HTTP server. It covers acceptance, strict DTOs despite the global pipe,
idempotent concurrency, duplicate jobs, owner isolation, revoked users, output
errors, 429/503/504/deadlines, rollback, saved-result recovery, UNKNOWN outcomes,
lost Redis jobs, safe polling, review revision conflicts, owner revocation,
concurrent commit/edit and audit failure rollback. Unit tests cover unavailable Redis and bounded
DB retries. This does not verify Gemini quota, real login or production deployment.

## Diagnosing `ai_staging_storage_unavailable`

This event wraps an unexpected database/client failure during target authorization,
batch creation or polling/history reads. The event alone does not identify its
cause. Logs include only a fixed `operation`, allowlisted `error_type` and, when
available, a Prisma `prisma_code`. Query/error messages, metadata, stack traces,
source text and connection strings are excluded. HTTP remains a sanitized 503.

| Diagnostic | Check |
| --- | --- |
| `P2021` | Missing table: verify the full migration chain in local setup step 1 on the DB/schema actually used by the API and both workers. Check generation batches/items/attempts/outbox/reviews and learning documents/versions/indexes, including the sourceVersion relation selected by batch reads. |
| `P2022` | Missing column/schema mismatch: verify staging/review, learning-document, document-index, document-question-generation and question-config migrations. Check item revision/review fields, batch source/preparation fields, item provenance, required question_configs and their version/index/document FKs; regenerate the client and rebuild after schema changes. |
| `P1001` | DB connectivity: running PostgreSQL, host/port and configured connection target. |
| `PrismaClientValidationError` / `TypeError` | A stale generated client is possible; run `npx prisma generate`, rebuild and restart API/worker. Use the operation to narrow the lookup. |

For a configured **local** development DB, first run `npx prisma migrate status`
in the backend repo. Do not reset a populated database or apply migrations merely
because a generic event was logged. Check that the relevant migrations are applied
to the same DB/schema the processes use, and restart after configuration changes.
If running the compiled API, use `npm run build` before `npm run start:prod` to
obtain the diagnostic fields. A DB probe with no Prisma code remains unclassified;
do not infer that Gemini credentials caused it. These checks are guidance, not
evidence that the current runtime database was inspected.

## Review and approved bank commit API

All routes require the authenticated lecturer's cookie and current ownership.
Review/commit remain available when new AI generation is disabled.

| Method/path below `/question-generation-batches` | Body / response |
| --- | --- |
| `GET /?page=1&limit=10&topic_id=<optional UUID>` | Owned batches, `{data,total,page,limit}`; no source/attempt/token fields. |
| `PATCH /:id/items/:itemId` | `{revision, data: GeneratedSingleChoiceQuestion}` → updated item. Full draft replacement; strict raw types, no unknown fields. |
| `POST /:id/items/:itemId/review` | `{revision, decision: "APPROVE" \| "REJECT"}` → updated item. |
| `POST /:id/commit` | `{items:[{id,revision}]}` (1–20 distinct items) → `{batch_id,status,questions:[{item_id,question_id}]}`. HTTP 200 for success/replay. |

Example approval: `{ "revision": 1, "decision": "APPROVE" }`. Approval increments
revision (1 → 2). Commit must use the **returned** approved revision:

```json
{
  "items": [{ "id": "44444444-4444-4444-8444-444444444444", "revision": 2 }]
}
```

```mermaid
stateDiagram-v2
    [*] --> VALID: validated generation
    VALID --> APPROVED: explicit approval / revision + 1
    VALID --> REJECTED: reject / revision + 1
    APPROVED --> VALID: edit / clear approval / revision + 1
    APPROVED --> REJECTED: reject / revision + 1
    REJECTED --> VALID: edit / revision + 1
    REJECTED --> APPROVED: explicit approval / revision + 1
    APPROVED --> COMMITTED: explicit selected commit
    COMMITTED --> COMMITTED: replay / same mapping
```

- Saves and decisions check the expected revision; stale requests return 409.
  Edits clear the previous reviewer/time and reset status to `VALID`. The original
  provider JSON is preserved. Invalid drafts must be corrected before approval.
- Mutations lock the batch row first, then check active ownership, chapter/topic
  membership and state. Concurrent reviews/edits/overlapping commits serialize.
  COMMITTED/SKIPPED items are immutable in this workflow.
- Commit accepts selected APPROVED revisions with reviewer metadata, revalidates
  JSON and calls `toQuestionBankDraft`. Bank inserts, item mappings, batch state
  and audit events share one transaction. Any stale/unapproved/invalid item or
  storage/audit failure rolls back the entire selection. No external HTTP/S3
  calls occur in this transaction.
- Commit keeps the approved revision. Retrying the same selection returns its
  existing bank mappings, even after COMPLETED. A hard-deleted mapping returns
  409 rather than recreating a question. Soft deletion never triggers recreation.
- Partial commit leaves REVIEW_REQUIRED while VALID/INVALID/APPROVED drafts
  remain. A successful commit closes the batch as COMPLETED when every item is
  COMMITTED/REJECTED/SKIPPED; editing is then closed. Rejecting all items alone
  leaves review open for correction. `finished_at` is the generation finish time;
  items expose `reviewed_at` and `committed_at` separately.
- Audit rows store actor, action, revision, before/after snapshots and bank ID.
  They are business records, not logs. Retention and a public audit browser are
  not implemented. Semantic similarity/bank-wide content deduplication remain
  future work; replay protection applies to the same staging item.
- Errors: 400 invalid input, 404 unavailable/foreign resource, 409 stale revision
  or state, 503 storage failure. After an ambiguous commit failure reload or retry
  the same selection; do not regenerate to recover a bank write.

## Frontend demo

1. Start Nest API, FastAPI, Redis and the worker after reviewing/applying both
   local migrations. Log in as a lecturer with an owned topic/chapter.
2. Open **Question bank → AI question generation** at
   `/{locale}/lecturer/questions/generate`. Choose targets, passage/count/level and
   explicit consent, then generate. Topic/chapter can be preselected from the bank.
3. The URL keeps the batch ID; reopen it or select a recent batch to resume.
   Polling stops at REVIEW_REQUIRED, FAILED or COMPLETED. No source/service token
   is written to browser local storage.
4. Edit text/options/correct answer/level and save. Approve each desired question
   explicitly. Editing an approved draft requires another approval. Reject unwanted
   questions. Select only approved questions, inspect the confirmation list and save.
5. Committed cards show bank IDs; return to the bank to see ordinary question rows.
   Rejected/unselected drafts are not inserted. Conflicts reload current data;
   use **Reload** to check network/storage failures.

Labels support vi/en; generated content remains Vietnamese. Unsaved edits disable
commit; changed item revisions clear their selection. Failed creation requests
reuse the same key for identical normalized input within the mounted page. A
browser reload loses this in-memory key: inspect recent batches before submitting
again after an ambiguous creation. The Document/RAG UI supports PDF/PPTX attachments,
preparation polling and draft review; see [file generation](rag-indexing.md#4-generate-questions-directly-from-an-attached-file-2026-10-23).
Operational quotas remain outside this release.
