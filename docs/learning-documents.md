# Learning documents: upload and extraction (2026-10-21)

Indexing/embedding/retrieval is now implemented separately: see [RAG steps 3-5](rag-indexing.md). The extraction-only scope below describes steps 1-2.

Implemented scope: private, lecturer-owned PDF/PPTX uploads, immutable source
versions, background extraction, and page/slide text preview. This is ingestion
preparation, **not RAG generation**: no embedding, chunks, vector DB, retrieval,
citations or automatic bank inserts are included. Existing text generation and
its review/commit workflow remain available.

NestJS owns the business tables in PostgreSQL's `public` schema. Python owns the
`rag` schema in the same PostgreSQL database for chunks, embeddings and retrieval;
see [RAG setup](rag-indexing.md) for its separate role and SQL migrations. This
guide remains scoped to ingestion and extraction.

## Local setup

Do not replace existing environment files. The API and **separate document
worker** use the existing DATABASE_URL, Redis and AWS S3 configuration. Add/check
the AI integration variables from `.env.ai.example`:

```dotenv
AI_QUESTION_GENERATION_ENABLED=true
AI_SERVICE_BASE_URL=http://127.0.0.1:8000
AI_SERVICE_INTERNAL_TOKEN=<same secret as Python INTERNAL_API_TOKEN>
DOCUMENT_SERVICE_TIMEOUT_MS=55000
```

The integration flag currently gates both new text generation and document
uploads/processing. Existing document metadata/preview/revocation stay available
when it is disabled. There is no new paid API key for extraction. Python's Gemini
key is needed only for generation, and is never placed in NestJS or the browser.

Review migration `20261021090000_add_learning_documents`. Against your configured
**local development database only**, check and apply pending migrations:

```powershell
npx prisma migrate status
npx prisma migrate dev
npx prisma generate
npm run build
```

This migration adds two tables and two enums; it changes no existing bank data.
No migration/reset has been run against your existing database by this task.
If an API log reports `document_storage_unavailable`, an allowlisted Prisma code
is included when available: `P2021` means a missing table, `P2022` a missing column,
and `P1001` a connectivity issue. Check the actual local migration target and
regenerate/restart; do not reset the database based on a generic error.
Restart the API after generating/building. Run these in separate terminals:

```powershell
# testhub-v2-backend
npm run start:dev
npm run start:document-worker

# testhub-ai-service (Python 3.12)
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --env-file .env --host 127.0.0.1 --port 8000

# testhub-v2
npm run dev
```

PostgreSQL/Redis and the configured private S3 bucket must be available. The S3
browser CORS policy must allow the frontend origin, PUT and Content-Type. The
existing S3 adapter targets AWS; configuring MinIO is not part of this change.
`start:ai-worker` processes question generation; it does **not** process documents.

## UI demo

1. Log in as lecturer; own an active topic and chapter.
2. Open **Question bank → Learning documents** at
   `/{locale}/lecturer/questions/documents` (also linked from the AI workspace).
3. Enter title, topic/chapter, choose a text PDF or PPTX <=20 MiB, explicitly
   consent; optionally include PPTX notes. Upload.
4. Observe `UPLOADING → QUEUED → PROCESSING → EXTRACTED`. With the document worker
   stopped, QUEUED is expected and survives API/Redis restarts.
5. Open the document and preview paginated plain text with one-based page/slide
   positions. Notes have their own `NOTES` span at the same slide position.
6. An empty/image-only source is `OCR_REQUIRED`; mixed PDFs with detected
   image-only pages are also flagged. Partial text remains previewable but is
   not ready for RAG. Corrupt/encrypted sources fail with a safe error code.
7. Choose another file and **Upload a new version** to retain the older source.
   Use the version selector to compare extraction results.
8. A finished upload whose confirmation response was lost can be confirmed again
   from history. Do not create another document merely to retry confirmation.
   An incomplete/expired upload needs a new version and file upload.
9. Revoke a document to block future reads, confirmation, processing and result
   publication. This is access revocation, **not physical deletion** of S3 objects.

## Public API contract

All routes below require existing cookie/JWT authentication and LECTURER role.
Current active lecturer, owned topic and active chapter are checked. Unknown,
foreign and revoked resources return 404, not a storage URL. Pagination is
`page >= 1`, `1 <= limit <= 100`, returning `{data,total,page,limit}`.

Legacy `/s3/*` signing/upload/delete routes explicitly reject the reserved
`learning-documents/` namespace, and root listings filter it out. They cannot
bypass this new owner-scoped API. Broader legacy S3 authorization is separate work.

| Method/path | Request / response |
| --- | --- |
| `POST /learning-documents` | `{title,topic_id,chapter_id,upload}` → 201 `{document_id,version_id,upload_url,upload_expires_at,max_bytes}` |
| `GET /learning-documents` | Optional `topic_id`, page/limit; document metadata and latest 50 version summaries |
| `GET /learning-documents/:id` | Document metadata and latest 50 version summaries |
| `POST /learning-documents/:id/versions` | Upload object → 201 upload reservation |
| `POST /learning-documents/:id/versions/:versionId/complete` | No body → 202 IDs/current status; replay does not enqueue a second execution |
| `GET /learning-documents/:id/versions/:versionId/content` | Paginated `{data:[{kind,position,text}],total,page,limit,unit_count,warnings,status,document_id,version_id}` |
| `DELETE /learning-documents/:id` | 204; revoke access, retain storage |

`upload` uses strict raw JSON types (no string-to-number/boolean conversion):

```json
{
  "file_name": "lecture.pdf",
  "source_type": "PDF",
  "mime_type": "application/pdf",
  "size": 12345,
  "include_notes": false,
  "consent": true
}
```

For PPTX use `source_type: "PPTX"` and MIME
`application/vnd.openxmlformats-officedocument.presentationml.presentation`.
Unknown fields, mismatched extension/MIME and PDF notes are rejected. Swagger
at `/api-docs` documents requests/routes. Main errors: 400 invalid input/type,
401/403 authentication/role, 404 unavailable ownership, 409 incomplete/expired
upload or extraction not ready, 503 unavailable integration/storage.

## Internal extraction contract

`POST /internal/documents/extract?source_type=PDF&include_notes=false` accepts
`application/octet-stream` and `X-Internal-Token`. NestJS sends only checked,
authorized bytes; Python never fetches arbitrary URLs or holds S3 credentials.
OpenAPI: `../testhub-ai-service/contracts/document-extraction.openapi.json`.
Response `document-extraction.v1`:

```json
{
  "contract_version": "document-extraction.v1",
  "source_type": "PDF",
  "source_sha256": "<SHA-256 of original bytes, 64 lowercase hex characters>",
  "parser_version": "pdf/6.21.1;text/v1",
  "include_notes": false,
  "status": "EXTRACTED",
  "unit_count": 1,
  "spans": [{"kind":"PAGE","position":1,"text":"Extracted text"}],
  "warnings": []
}
```

PDF uses PAGE; PPTX uses SLIDE and optional NOTES. Blank units retain their source
position. Both services validate manifest uniqueness/positions, type, character
limits and non-empty success; NestJS additionally verifies the original hash.
Content is plain text, not a faithful rendering or guaranteed reading order.
Tables/paragraphs in PPTX are read; chart/SmartArt/image text and formulas are not
fully reconstructed. Source file replacement never changes an older version.

## Persistence and reliability

- `LearningDocument` / `learning_documents`: owner, title, target, revocation and
  atomic next-version counter. `LearningDocumentVersion` /
  `learning_document_versions`: upload lease, original hash/key, consent timestamp,
  notes option, state, execution lease, artifact hash/key and parser version.
- Upload PUT URLs expire after one hour. Complete reads actual bytes within a
  20 MiB/30s bound, checks declared size/signature, and writes to a hash-specific
  private source key. Only then does a conditional UPLOADING→QUEUED write commit.
  Subsequent PUTs to the quarantine key cannot mutate this pinned source.
- QUEUED version rows are the durable dispatch commands, committed in the same
  update as source identity. Reconciliation runs every 5s, publishes up to 25
  due UUID-only jobs to `ai-document-processing`, and rechecks deliveries after
  60s. Redis failures back off to 5 minutes. API does not host this processor.
- Dedicated worker concurrency is 1. DB QUEUED→PROCESSING claims use unique
  execution tokens and 120s leases. Late results, duplicate deliveries, revoked
  documents and transferred topics cannot publish results under the old owner.
- Source GET and artifact PUT have 30s deadlines; internal HTTP <=55s. Python's
  45s total deadline includes intake and parser execution. Child is killed and
  awaited on timeout/cancellation; capacity is released. No Gemini/embedding
  call occurs during extraction, so bounded retries do not repeat paid requests.
- Up to 3 extraction attempts, with backoff for transient transport/storage
  failures. Stale leases return to QUEUED, or FAILED once exhausted. Permanent
  invalid output/type/source hash errors fail without automatic retry. Queue
  publication retries are independent of extraction attempts.
- Text artifacts are private S3 JSON, <=8 MiB, scoped to version/execution and
  hash-verified on read. Metadata excludes private keys, source bodies and leases.
  Business tables are owned by NestJS; there is no AI DB or `rag` schema yet.

## Parser limits and operational limits

Limits: 20 MiB input, 500 pages/slides, 1,000,000 extracted Unicode characters,
5,000 PPTX ZIP entries, 100 MiB cumulative actual decompressed ZIP bytes. ZIP
entries are read within the remaining budget and repacked before parsing; unsafe
paths, encrypted entries and unsupported methods are rejected. No archive is
extracted onto the filesystem. PDFs are processed by pypdf; PPTX by python-pptx.

Python permits two extraction requests per process and waits <=100ms for a slot.
On Linux/POSIX child limits add 768 MiB virtual address space, 40s CPU and an 8 MiB
output file cap. **Windows local development has the killable wall deadline but
no equivalent OS memory/CPU cap in this implementation**. Use the Linux container
with deployment resource limits for untrusted production uploads. Every replica
multiplies local capacity; distributed quotas are later work.

Unconfirmed/expired uploads and obsolete execution artifacts can remain in S3.
Physical cleanup, retention duration, per-owner quotas, OCR, document sharing,
rename/restore and a complete version-history browser beyond the latest 50 remain
open work. Configure lifecycle/retention only after the policy is approved; no
automatic purge or TTL is promised. Generation from an uploaded document is
implemented; see the [RAG setup and file generation guide](rag-indexing.md).

## Verification commands and boundaries

```powershell
# Python production parser and existing generation tests (no provider calls):
.\.venv\Scripts\python.exe -m pytest -q

# Backend unit/HTTP tests; optional suites skip without their explicit URLs:
npm test -- learning-documents --runInBand

# Real Nest client → FastAPI → real PDF/PPTX parser, plus existing fake-LLM contract:
$env:TESTHUB_AI_PYTHON = (Resolve-Path '..\testhub-ai-service\.venv\Scripts\python.exe').Path
npm test -- ai-fastapi.integration --runInBand
Remove-Item Env:TESTHUB_AI_PYTHON

# Transport failure simulation, terminal 1 (synthetic markers ONLY):
postman simulation run postman/simulations/document-extraction.sim.yaml --port 4961 --no-history
# Terminal 2:
$env:TESTHUB_DOCUMENT_SIM_URL = 'http://127.0.0.1:4961'
npm test -- learning-documents --runInBand
Remove-Item Env:TESTHUB_DOCUMENT_SIM_URL
```

The local Postman mock is derived from the new internal contract; it is **not a
parser** and never accepts real documents/credentials. It exists to exercise
production fetch, deadlines, 503, proxy HTML and invalid JSON. No remote workspace
was searched/published because the API is owned by these local repositories.

`document.repository.integration.spec.ts` is opt-in with
`TESTHUB_AI_DATABASE_URL` pointing to a disposable loopback database ending in
`_test`. It creates/drops only its UUID-named schema; it never resets an existing
database. This checks concurrent version allocation, duplicate claims, expired
leases, owner transfer and revocation. Use the disposable DB setup described in
`ai-question-generation.md`. No real user DB, S3 bucket or paid provider is used
by the default tests. A successful build/mock test does not establish live S3
CORS/IAM, a migrated runtime DB or production deployment.
