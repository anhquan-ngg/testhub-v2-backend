# RAG steps 3-5: chunks, Google embedding and scoped retrieval

Implemented on 2026-10-21. Follow [document setup](learning-documents.md) first.
Steps 3-5 build/query indexes. Step 6 (uploaded-document question generation with
citations) is now implemented; see the section below. Text API compatibility remains.

## Architecture and state

- Next.js calls NestJS with the lecturer cookie, never Python/Google directly.
- NestJS owns `LearningDocumentIndex` / `public.learning_document_indexes`,
  authorization, consent, durable queued commands and public progress.
- Python owns `rag.index_profiles`, `rag.document_indexes`, `rag.chunks`,
  `rag.revoked_indexes` and `rag.schema_migrations`. Its dedicated login uses the
  **same PostgreSQL database**, not the NestJS login. No business-table writes.
- The document worker owns `ai-document-processing` and `ai-document-indexing`
  independently, one job each. API hosts no processors; no Celery/Kafka added.
- EXTRACTED versions are eligible for explicit indexing; OCR_REQUIRED is rejected.
- QUEUED -> INDEXING -> QUEUED (checkpoint) -> READY; transient errors/expired
  executions retry at most three consecutive times, then FAILED. Explicit retry
  resumes the same index. Revoke sets REVOKED in the document business transaction
  and dispatches a technical tombstone to Python.
- Version + immutable profile is unique; repeated start returns the existing row.
  Source versions and previous profiles are retained.

Each job prepares chunks **or** embeds at most 16 pending chunks, commits that
checkpoint in `rag`, then records progress in NestJS. After a lost reply, Python
replays READY or continues pending chunks. Execution UUIDs/leases fence duplicates
and late results; job IDs include the persisted step number. Queued DB rows form
a durable outbox, reconciled every five seconds, surviving Redis loss.
A crash between paying Google and saving vectors can repeat a call: exactly-once
billing is **not** guaranteed. Python persists a global invocation budget of
`3 * ceil(chunk_count / 16)` before calls. SDK attempts = 1; Nest HTTP retries = 0.
Manual retry does not reset that budget. Investigate exhausted indexes rather than
repeatedly clicking retry or automatically creating replacement indexes.

## 1. Local PostgreSQL and dedicated role

These are **operator-run local instructions**. No user DB migration was applied
by the coding session. Confirm host/database and back up data before changing a
PostgreSQL installation/image.

Current Compose uses `postgres:17-alpine`, which lacks pgvector. Install the server
extension matching the server major version using the
[official instructions](https://github.com/pgvector/pgvector#installation).
A supported Docker Postgres 17 image is `pgvector/pgvector:pg17`. Moving from
Alpine should use a verified logical backup/restore or a reviewed upgrade; do not
delete the existing volume or blindly attach it to a different image. Compose is
intentionally unchanged. Native Windows PostgreSQL needs the upstream Windows
extension installation; Python's psycopg package does not install pgvector.

Check as DBA in the **same local database** as NestJS:

```sql
SELECT current_database(), current_user;
SELECT name, default_version, installed_version
FROM pg_available_extensions WHERE name = 'vector';
```

No row for vector means install it first. From the backend directory, open psql
(replace `testhub` with your actual local database):

```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d testhub -W
```

In psql, use forward slashes and quote the filename. Relative paths resolve from
the **psql client's working directory**, which may differ when using SQL Shell.
The relative example below assumes psql was launched from the backend directory:

```text
\set ON_ERROR_STOP on
\i '../testhub-ai-service/migrations/000_bootstrap.sql'
```

For Windows SQL Shell, use the absolute path instead (adapt the checkout location):

```text
\r
\set ON_ERROR_STOP on
\i 'D:/HUST/20251/GR2/testhub/sources/testhub-ai-service/migrations/000_bootstrap.sql'
```

Do not paste the `testhub=#` prompt. `\r` clears unfinished SQL when the prompt is
`testhub-#`; it does not roll back a transaction. Do not use an unquoted Windows
path such as `D:\HUST\...` with `\i`: backslashes delimit psql meta-commands and
can leave only `D:` as the filename, producing `D:: Permission denied`.
The include reads a file on the machine running **psql**, not the DB server; a
psql client inside Docker cannot see a Windows path unless the file is mounted.

Only after bootstrap finishes without errors, verify that the role exists:

```sql
SELECT rolname FROM pg_roles WHERE rolname = 'testhub_ai';
```

If this returns `testhub_ai`, set its password:

```text
\password testhub_ai
```

`role "testhub_ai" does not exist` means role creation has not succeeded. Fix the
earliest bootstrap error before trying the password command again. In particular,
bootstrap creates `vector` before the role, so a missing server extension stops
setup before role creation. If a correctly quoted absolute path still fails, check
that the file exists and is readable by the OS account running psql.

Set the real password interactively, keeping it out of SQL/Git/shell history.
Bootstrap creates extension, role and isolated schema, with no business-table
grants. Review any pre-existing login/schema, PUBLIC grants and role memberships.
Verify as DBA (also audit other business tables):

```sql
SELECT has_schema_privilege('testhub_ai', 'rag', 'USAGE') AS rag_usage,
       has_table_privilege('testhub_ai', 'public.questions', 'SELECT') AS bank_read,
       has_table_privilege('testhub_ai', 'public.questions', 'INSERT') AS bank_write;
```

Expected true, false, false; remove unintended grants if necessary. Connect **as
testhub_ai**, enter its password and apply AI-owned DDL:

```powershell
psql -h 127.0.0.1 -p 5432 -U testhub_ai -d testhub -W -v ON_ERROR_STOP=1 -f ../testhub-ai-service/migrations/001_rag.sql
```

Apply additive Prisma migrations yourself against the confirmed **local** backend
DATABASE_URL (already applied migrations are skipped):

```powershell
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run build
```

New migrations: `20261021090000_add_learning_documents`, then
`20261021100000_add_document_indexes`. Prisma owns business tables only; do not
model Python rag tables in Prisma. Runtime never applies migrations automatically.

## 2. Configuration and processes

AI `.env`: retain existing generation/token configuration and add:

```dotenv
RAG_ENABLED=true
RAG_DATABASE_URL=postgresql://testhub_ai:CHANGE_ME@127.0.0.1:5432/testhub
```

Replace placeholder locally; URL-encode password characters. Keep the existing
`GEMINI_API_KEY`: generation and embedding share it through separate clients.
No second Google key; no key in NestJS/frontend. The project/key needs access and
quota for `gemini-embedding-001`.

Backend API **and document worker** `.env`:

```dotenv
AI_QUESTION_GENERATION_ENABLED=true
AI_RAG_ENABLED=true
AI_SERVICE_BASE_URL=http://127.0.0.1:8000
# Existing AI_SERVICE_INTERNAL_TOKEN matches Python INTERNAL_API_TOKEN.
```

Restart processes after env changes. Separate terminals:

```powershell
# AI repo, Python 3.12
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000
# Backend repo
npm run start:dev
# Backend repo, after build
npm run start:document-worker
# Frontend repo
npm run dev
```

`GET http://127.0.0.1:8000/ready` verifies rag migration v1/connectivity; 503 means
storage/schema unavailable. `/health` is liveness only. Neither calls Google.
Windows retains the subprocess-capable Proactor loop; async psycopg runs in an
owned selector-loop thread. Do not force the main app to SelectorEventLoop:
PDF/PPTX extraction requires subprocess support.

## 3. Demo and API contracts

Open `/vi/lecturer/questions/documents`. Upload/confirm a consented PDF/PPTX,
wait for EXTRACTED, inspect source, click create/check index and watch progress to
READY. Enter a knowledge query and retrieve. Results show original page/slide/
notes, exact source text and similarity. `UNASSESSED` means no guarantee of
relevance, coverage or factual correctness. Retrieval does not create questions
or write the bank. Indexed content **and search queries** are sent to Google.

| Public NestJS endpoint | Result |
| --- | --- |
| POST `/learning-documents/:id/versions/:versionId/index` | 202 idempotent summary |
| POST `/learning-documents/indexes/:indexId/retry` | 202 resume FAILED checkpoint |
| GET `/learning-documents/:id` | Version `indexes[]`, no object keys |
| POST `/learning-documents/retrieve` | 200 scoped candidates |

```json
{"version_ids":["11111111-1111-4111-8111-111111111111"],"query":"How does a stack work?","top_k":6}
```

API accepts up to ten distinct versions; current UI searches the selected version.
Browser cannot supply owner/profile/index scope. NestJS rejects the **whole**
request if any version is foreign/revoked/not READY for the current profile and
rechecks all requested versions after I/O. Python filters owner/profile/index IDs
inside SQL and rechecks technical scope after search. NestJS validates returned
source identities, hashes, offsets and text hashes. Revoke is immediate for public
reads; technical tombstones are eventual. An already in-flight call may have sent
data to Google. Physical vector/source purge and retention remain separate policies.

Internal Python, all X-Internal-Token protected:
`GET /internal/rag/profile`; `POST /internal/rag/prepare`, `/step`, `/retrieve`,
`/revoke` (204). Schemas: `../testhub-ai-service/contracts/rag-indexing.openapi.json`.
Regenerate in AI repo with `python scripts/export_rag_contract.py`.
Internal errors: `detail: {code, retryable}`. Public: invalid input 400, inaccessible
scope 404, source/index/profile conflict 409, empty context 422, integration error
503. Inspect persisted error_code; no raw source/provider diagnostics in logs.
429/503/timeouts can retry within budgets; model/key configuration errors cannot.

## Profile and resource limits

- `gemini-embedding-001`, 768 dimensions, RETRIEVAL_DOCUMENT / RETRIEVAL_QUERY,
  manual L2 normalization; reject wrong dimensions, nonfinite and zero vectors.
  Model 2 has different aggregation/task semantics, not an interchangeable env
  override. [Google documentation](https://ai.google.dev/gemini-api/docs/embeddings).
- SHA256 profile covers model, dimensions, tasks, normalization and chunk algorithm/
  budgets. Deterministic UUID5 chunk IDs under each business index UUID.
- Separate PAGE/SLIDE/NOTES windows. Prefer paragraph/line/sentence/word boundaries:
  target 1200 UTF-8 bytes, max 1800, overlap <=200; preserve exact text and Unicode
  **codepoint** offsets (not UTF-16 or byte offsets). Conservative byte budgeting
  is not an exact tokenizer measurement. Max 5000 chunks, batch 16, no truncation.
- Exact filtered pgvector cosine search, max 40 candidates -> max 8 selected,
  max 2 per source unit, <=12000 UTF-8 context bytes. No universal similarity cutoff.
  HNSW/hybrid/reranking require evaluation first.
- JSON actual bytes <=8 MiB; four intake slots, 10s intake. Two RAG work slots,
  100ms admission, 40s overall request. Google: 25s network/30s total, one attempt.
  Nest: 55s HTTP / 120s execution lease; Python 50s embedding lease.
  DB: 5s statements / 2s lock timeout / pool 4 connections per process.
- No distributed cost quota, relevance target, purge policy or SLA is implied.

## Verification and boundaries

Default tests do not read real .env, mutate user DB/S3 or call Google. See
[document tests](learning-documents.md#verification-commands-and-boundaries).
The Nest-to-FastAPI suite now also exercises prepare -> step -> retrieval -> revoke,
with explicit synthetic vectors/in-memory storage, **not** PostgreSQL persistence.

Google SDK HTTP simulation, terminal 1 in AI repo:

```powershell
postman simulation run postman/simulations/google-embedding.sim.yaml --port 4962 --no-history
```

Terminal 2:

```powershell
$env:RUN_EMBEDDING_SIMULATION='1'
.\.venv\Scripts\python.exe -m pytest tests/test_embedding_simulation.py -q
Remove-Item Env:RUN_EMBEDDING_SIMULATION
```

Mock derived from Google's batchEmbedContents contract, checked against SDK 1.75.0.
It proves adapter/SDK HTTP handling for 200/429/403, not real quota or semantic
quality. Synthetic credentials/text only: logs can include x-goog-api-key and
source bodies. No remote workspace/mock was published.

Real pgvector tests require a manually prepared **disposable loopback *_test DB**
with extension vector and no existing rag schema. Set RAG_TEST_DATABASE_URL and run
`python -m pytest tests/test_vector_repository.py -q`. Tests refuse foreign hosts,
non-test names and pre-existing rag schema, create/drop only their own rag schema,
and never use RAG_DATABASE_URL. They cover SQL replay, leases, cosine filtering,
revocation and late-prepare tombstones; skipped by default. Backend business DB
tests use the existing TESTHUB_AI_DATABASE_URL isolation described in the document
guide. Builds/mocks do not establish live DB/S3/browser/Google E2E success.


## 4. Generate questions directly from an attached file (2026-10-23)

The question generation form now accepts one PDF/PPTX (20 MiB maximum) instead of
pasted source text. Choose topic/chapter, attach the file, optionally include PPTX
notes and enter a knowledge focus, set cognitive level/count, consent and submit.
Uploading/confirmation happens before batch creation. The created batch ID is
resumable from history/URL; source preparation continues when the lecturer leaves.
Once drafts arrive, expand **Source evidence** to inspect page/slide/notes quotes,
edit, explicitly approve, select and commit through the existing workflow.

### Apply the additional business migration locally

A new additive migration is required:
`20261023090000_add_document_question_generation`. No new Python rag SQL migration
is required. After confirming the backend points to your LOCAL database, run from
the backend repository yourself:

```powershell
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run build
```

Restart the API, Python service and both dedicated workers after updating code.
Keep existing RAG flags/key/DB/internal token settings above. Required processes:

- Python FastAPI (`--env-file .env`), PostgreSQL/pgvector, Redis, object storage.
- NestJS API, `npm run start:document-worker` (extraction/indexing), and
  `npm run start:ai-worker` (preparation coordination and generation).
- Next.js frontend. Rebuild the workers after changing TypeScript.

### Public command and durable preparation

The existing `POST /question-generation-batches` accepts the additional source:

```json
{
  "topic_id": "11111111-1111-4111-8111-111111111111",
  "chapter_id": "22222222-2222-4222-8222-222222222222",
  "source": {
    "mode": "document",
    "version_id": "33333333-3333-4333-8333-333333333333",
    "query": "Stack ordering and applications"
  },
  "question_configs": [
    { "question_type": "SINGLE_CHOICE", "question_format": "KNOWLEDGE", "count": 3 },
    { "question_type": "MULTIPLE_CHOICE", "question_format": "APPLYING", "count": 2 }
  ],
  "language": "vi",
  "external_processing_consent": true
}
```

Require the existing Idempotency-Key header. `version_id` must be an accessible,
consented, upload-confirmed version belonging to the exact selected topic/chapter.
No browser owner/index/profile/object key is accepted. Optional query is <=400
Unicode codepoints; blank uses the topic name/document title. The existing text
command and text-generation.v1 contract are unchanged for API consumers.

- A document command creates WAITING_SOURCE plus its durable outbox. Polling shows
  preparation_stage EXTRACTING / INDEXING / READY and safe sourceVersion metadata.
- The AI worker checks preparation without creating an LLM attempt. Once extraction
  is EXTRACTED it starts/replays the version's index, pins index/profile IDs, waits
  for READY, then conditionally promotes the batch to QUEUED. The document worker
  owns the actual index checkpoints; no worker waits minutes holding an HTTP slot.
- Preparation has a 20-minute wall-clock budget from batch creation, including
  outages/worker downtime. Expiry fails with AI_SOURCE_TIMEOUT. Source revocation,
  OCR_REQUIRED, failed extraction or failed index stops generation. Resolve failed
  indexing in the document workspace before creating a new batch.
- QUEUED -> GENERATING -> REVIEW_REQUIRED uses the existing single-execution claim,
  5-minute lease, durable result checkpoint and recovery. Recovery does not invoke
  the LLM again. Ambiguous model calls are not automatically retried.

### Grounded generation and evidence

`POST /internal/rag/generate` is X-Internal-Token protected and versioned as
rag-generation.v1, included in the generated RAG OpenAPI. NestJS supplies authorized
owner/profile/index IDs, query and ordered question_configs. Python retrieves up to
eight chunks using existing budgets, prompts Gemini with those exact chunks,
validates question structure/count/answers/duplicates and checks each citation ID
and verbatim quote against retrieved context. It checks the whole scope again after
the LLM call. NestJS then rechecks active document/index ownership, immutable source
hashes, chunk identity/text hashes and result shape before staging.

RAG generation has a 75s overall deadline; NestJS uses 85s for this endpoint. It
shares the existing generation semaphore/client and bounded SDK retry policy.
Retrieval and embedding limits are unchanged. Default RAG transport is bounded to
1 MiB output; other RAG endpoints retain 256 KB. Internal service failures have
sanitized codes (RAG_OUTPUT_INVALID / RAG_GENERATION_TIMEOUT / etc.), without
source/provider messages. There is no fallback to unrelated/general-knowledge
questions when the source is missing or output evidence is invalid.

Every staged item has optional `provenance` separate from editable `data`:
contract_version, profile_id, UNASSESSED quality and citations containing original
source chunks/positions/hashes plus exact evidence quotes. Structural/quote checks
**do not prove entailment or factual correctness**. Lecturers must assess whether
evidence supports the correct answer and whether the document coverage is adequate.
Retrieval selects a bounded context; this release does not guarantee whole-file
coverage. If the source cannot support the requested count, generation fails;
try fewer questions or a narrower knowledge focus.

Edits preserve original provenance and add AI_SOURCE_RECHECK_AFTER_EDIT; evidence
is not automatically regenerated for edits. Approval still requires a new revision.
Commit writes only bank-shaped question data; the staging item's question_id keeps
its provenance linked to the bank question. Source/version/index references use
restrictive FKs; revoking a document hides affected batches and prevents later use.
Physical source/vector retention and existing bank question deletion are separate
policies, unchanged by this feature.

### Operational limits and verification

In-memory upload checkpoints reuse the same reservation after a confirmed upload;
ambiguous batch creation reuses its idempotency key while the page remains open.
Reload before batch creation loses that browser checkpoint; inspect document/batch
history before resubmitting. Upload reservation creation itself is not idempotent,
so interrupted uploads may leave unused documents/artifacts. Cleanup/retention is
not added here. Never store signed URLs, source text or tokens in URL/localStorage.

New tests cover strict document DTOs, source/target/consent checks, waiting without
an LLM attempt, stale results, bounded preparation, exact/fabricated citations,
shared-slot cleanup, and Nest-to-FastAPI grounded generation. The existing local
Postman Google simulation now covers embedding plus structured generation over
real SDK HTTP (synthetic vectors/model replies). The backend opt-in DB/Redis suite
also defines source FK/recovery/edit/approval/commit coverage. Passing mock/HTTP
checks does not establish live Google grounding quality, S3/CORS, PostgreSQL/Redis
or browser E2E. Run the opt-in suites and a real consented document demo locally.
