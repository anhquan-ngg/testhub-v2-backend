# Knowledge plans for document question generation

The lecturer selects an owned subject and attaches a PDF/PPTX, without selecting
a bank chapter. Extraction/indexing remains asynchronous. The AI worker reads the
**complete authorized chunk manifest**, reconstructs pages/slides, and proposes a
tree plus a topic × cognitive-level matrix. It does not use a top-k retrieval
sample to claim full-document coverage.

Numbered Vietnamese/English chapter and section headings supply the first tree.
Without a clear outline, meaningful page/slide lines propose inferred topics;
repeated headers are deprioritized. This is a deterministic, source-derived
proposal, not a semantic classification model. The UI distinguishes extracted and
inferred nodes, shows evidence/source units, and requires lecturer confirmation.
Objectives are short templates for editing, not validated learning outcomes.

## Operator rollout

No migration is applied automatically by this change. Existing migrations are
unchanged. Apply to the configured databases after the usual backup/review:

1. In `testhub-ai-service`, run `migrations/002_optional_document_chapter.sql`
   using the existing RAG schema owner/operator process. It removes NOT NULL on
   `rag.document_indexes.chapter_id` and records technical schema version 2.
   See that repo's README for the existing dedicated-role/bootstrap procedure.
2. In this backend, run `npx prisma migrate deploy`, then `npx prisma generate`.
   New migration: `20261025120000_add_knowledge_plans`. It adds plans, immutable
   batch snapshots, item mappings, and permits chapter-less documents/batches.
   It retains all existing data. Do not reset the database or edit old migrations.
3. Deploy the Python service and backend API/workers before the frontend. Keep
   the document worker (`start:document-worker`) and AI worker (`start:ai-worker`)
   running, with the existing AI/RAG flags enabled. Restart workers after schema
   and code updates. The backend build is `npm run build`.

An old worker cannot process chapter-less planned batches. Rollback therefore
requires draining/archiving those batches before restoring old application code.
Migration files contain rollback comments; restoring NOT NULL requires assigning
or archiving chapter-less rows first.

## Public API

All routes use the existing JWT/cookie authentication and LECTURER role guard.
The browser cannot choose owner, technical index/profile or a bank target ID.

| Route | Request | Effect |
| --- | --- | --- |
| `POST /question-generation-plans` | `topic_id`, `version_id`, `question_configs`, consent=true; Idempotency-Key | Durable source preparation; 202 |
| `GET /question-generation-plans?page=1&limit=20` | pagination | Owned resumable plans |
| `GET /question-generation-plans/:id` | — | Source map, matrix, revision, `chapter_matches` |
| `PATCH /question-generation-plans/:id` | `{revision,matrix:{nodes,rows}}` | Save edits, increment revision, require confirmation again |
| `POST /question-generation-plans/:id/approve` | `{revision}` | Confirm the saved revision; no bank writes |
| `POST /question-generation-plans/:id/generate` | `{revision}`; Idempotency-Key | Freeze stored plan into a batch; 202 |

Nodes are flat `{id,parent_id,name,source_units}`. Rows contain an ID, node ID,
short objective, question type, source units and integer counts for KNOWLEDGE,
UNDERSTANDING, APPLYING and ADVANCED. Cycles/orphans, repeated IDs, unknown source
pages/slides, empty objectives/rows and totals outside 1–20 are rejected. There is
no configured tree-depth limit; resource bounds are 1,000 nodes, 20 rows/cells and
the existing extraction/index size limits. The UI reports leaf topics without a
matrix row; proposing a plan does not imply every topic will be assessed.
Outline rebuilding rejects duplicate node IDs before schema validation, and tree
traversal visits each ID at most once even for malformed cyclic input. Repeated
sibling names are qualified with evidence or a numeric suffix while reserving
original unique sibling names, so disambiguation cannot overwrite them.

APPROVED plans can be edited into a new REVIEW_REQUIRED revision. Existing batch
snapshots remain immutable. Stale edits/confirmation/generation return conflict;
reload the saved plan before retrying. Plan creation and batch submission are
idempotent for the same owner/key and payload. Reusing a key for other input is a
conflict. Uploaded reservations remain only in memory, not browser storage/URLs.

## Durable preparation progress and equivalent resume

Plan preparation allows **20 minutes without observed measurable source progress**,
with a **hard total cap of 60 minutes** per preparation window. Extraction becoming
usable, the first authorized index/profile pin, an increased completed-chunk
high-water mark, or the index becoming READY advances the durable progress clock.
Polling, retries, rate-limit errors, lease recovery, status churn and `updated_at`
do not advance it. A fresh worker resumes the persisted checkpoint rather than
starting a fresh window. Both deadlines are checked before preparation, after
outline I/O and on retryable failures. Idle failure uses `PLAN_SOURCE_TIMEOUT`;
the hard cap uses `PLAN_SOURCE_TOTAL_TIMEOUT`, with total-cap precedence.
Explicit `POST /question-generation-plans/:id/retry` for an eligible FAILED plan
renews both clocks and clears the observation baseline, retaining the original
creation timestamp, immutable source, existing index/profile and idempotency keys.

Owned detail GET adds `source_progress`, either null or:

```typescript
{
  stage: 'EXTRACTING' | 'INDEXING' | 'OUTLINING';
  completed_chunks: number;
  total_chunks: number;
  percent: number | null;
  index_status: string | null;
  error_code: string | null;
}
```

The summary reads current counters from the exact authorized pinned index even
while the plan remains WAITING_SOURCE. Percent is floored and clamped to 0..100;
a zero/unknown denominator yields null, never a fabricated 0/0 completion. A READY
index is OUTLINING. Unpinned usable sources are INDEXING with zero counters and
null percent. Unusable sources are EXTRACTING. Missing/revoked/foreign pinned
indexes and plans outside WAITING_SOURCE/PREPARING/FAILED return null. The error is
the current index error, otherwise the source extraction error. This field exposes
no profile/index IDs, storage keys, execution tokens or leases. GET performs no
writes, preparation, index starts or retries.

Creating an equivalent active plan returns the existing plan with `reused: true`.
Equivalence requires the same owner, topic, immutable source version and exact
normalized **ordered** question configs. Different config order/content creates
a different plan. Failed/review/approved or foreign plans are not candidates.
An owner/source-scoped PostgreSQL transaction advisory lock serializes concurrent
creates. Durable owner/key aliases bind every admitted key to its original plan:
same-key/same-hash replay still returns that plan after it becomes terminal;
same-key/different-hash remains a conflict. A genuinely new plan returns
`reused: false`. Ordinary polling never creates a plan.

### Preparation migration rollout

Additive migration `20261125130000_plan_preparation_progress` adds preparation
start/progress clocks, JSONB observation checkpoints and the owner-scoped request
key alias table. It backfills original keys. Legacy plans conservatively retain
their original creation time for both clocks and a baseline of their existing
source/index state; deployment itself does not count as progress or renew a
window. Old overdue plans may fail immediately and require explicit retry.

Operator commands from this backend directory, using the established deployment
environment (these commands were **not** executed against a database here):

```powershell
npx --no-install prisma migrate deploy
npx --no-install prisma generate
npm run build
```

Apply pending migrations and regenerate the client before deploying the updated
API/AI worker, then deploy frontend. No new environment variable is required.
This change does not apply migrations or restart workers. Offline client setup
and schema validation, without loading `.env` or connecting to a database:

```powershell
npx --no-install prisma generate --config src\auth\testing\prisma-fixture.config.ts
npx --no-install prisma validate --config src\auth\testing\prisma-fixture.config.ts
```

## Explicit OCR recovery from a saved plan

Ordinary upload extraction explicitly sends `ocr_mode=off`; detecting thin or
image-backed units never authorizes a provider call. A lecturer must save the
matrix, review the selected scope and explicitly consent to each initial OCR or
retry action. Source positions are derived from nonempty saved matrix rows on
the server; the browser cannot submit positions, object keys or another source.

| Route | Strict JSON body | Response |
| --- | --- | --- |
| `POST /question-generation-plans/:id/ocr` | `{revision: positive integer, consent: true}` | 202 `{version_id}` |
| `POST /question-generation-plans/:id/ocr/retry` | `{revision: positive integer, consent: true, version_id: failed OCR child UUID}` | 202 `{version_id}` |
| `GET /learning-documents/versions/:versionId` | none | Owned safe version summary, `document_id`, `quality`, `ocr_request`, indexes |

`/knowledge-plans` is a compatibility alias for the plan routes. Authentication,
LECTURER role, current ownership/topic, saved revision, source readiness, archive
state and library byte quota are rechecked before admission. Only REVIEW_REQUIRED
or APPROVED plans may request recovery. Same-origin plan/revision initial requests
return the same child; explicit retries are additionally keyed by failed child ID.
Owner/plan locks and a database expression unique index enforce this identity.
No plan, batch, original extraction or source object is overwritten. The new
version pins the same checked hash/options and owns a separate immutable source
object, artifact and eventual index. Full source bytes count against library quota.

`ocr_request` exposes origin_plan_id, origin_revision, parent_version_id,
retry_of_version_id (nullable), server-selected positions, pages, deliveries and
status PENDING|COMPLETED|INCOMPLETE. Each page has position, status
PENDING|COMPLETED|NO_TEXT|FAILED|BUDGET_EXHAUSTED|DISABLED and an optional nullable
allowlisted reason. Quality also exposes ocr_candidate_units (all detected
candidates), ocr_units (positions with successfully added transcript), and
ocr_pages. COMPLETED request processing is not a semantic evidence guarantee.

The existing DB outbox/lease worker sends at most 30 positions per delivery and
preserves earlier successful transcripts in a hash-checked checkpoint. A smaller
Python PAGE_LIMIT continues only after demonstrable progress; at most 500
deliveries are allowed. Provider, timeout, daily-budget, disabled/cache and
ambiguous transport/storage outcomes do not automatically repeat paid work.
An expired targeted lease finishes INCOMPLETE, not QUEUED. Terminal versions with
unresolved selected positions never become EXTRACTED. Explicit retry requires a
terminal INCOMPLETE child of the same saved revision, retries only its unresolved
selected positions, preserves previous successful spans, and creates another
immutable version. A repeated retry click returns that same new version.

Polling/reloading only reads GET metadata. Once usable, the lecturer explicitly
creates a NEW plan from the recovered version using the original question_configs
(which plan detail now returns). PARTIAL use still requires explicit confirmation;
new plan preparation creates/pins its own index. Existing plans, frozen batches
and failed generations are never automatically rerun or redirected.

Deployment requires the additive offline migration
`20261125120000_document_plan_ocr` (nullable JSONB metadata and partial expression
unique index), followed by normal Prisma client generation. This implementation
does not apply it, contact providers, or change existing data. Review/apply using
the established operator process before deploying code that reads the new column.

## Retrieval and bank writes

Each nonempty matrix cell supplies its own title/objective/level query and allowed
page/slide units. SQL applies owner/profile/index/READY and source-unit filters
**before** nearest-neighbor top-k. Query embeddings are batched (up to 16), but
retrieval remains per cell. Each cell gets at most two excerpts; all contexts
together are bounded to 72 KB. Missing cell evidence fails the batch rather than
substituting another topic. One bounded LLM invocation generates ordered slots.
Every slot can cite only its own excerpts. Both services revalidate sources;
scope is checked again after the model call. Durable result recovery retains
plan IDs and citations without another paid generation attempt.

Only the existing explicit approve-and-commit API writes bank questions:

- Lock the batch, then the owned subject, inside one transaction.
- Resolve selected question slots from the frozen plan, never model-supplied IDs.
- Walk only their required ancestor paths iteratively. Match active siblings in
  the same subject/parent using NFKC, whitespace normalization and case folding;
  preserve accents. This is conservative name matching, not fuzzy semantic merging.
- Reuse a single match; reject ambiguous bank matches. Create missing ancestors
  and target chapters only now. Unselected branches are not created.
- Write questions and `target_chapter_id` atomically. Any conflict rolls back
  chapters/questions together. Concurrent planned commits serialize per subject;
  lost-response replays return existing mappings.

Manual chapter operations can still create duplicate names, so matches are checked
again at commit. A lecturer resolves ambiguity by editing/confirming a plan and
generating a new batch; a previously generated batch keeps its original targets.
Edited question text retains its planned target and original evidence, requiring
fresh approval and source/target review. Citation matching does not prove factual
correctness, answer entailment, correct cognitive level or semantic topic fit.

## Verification

- Unit/contract tests: `npm test -- --runInBand`.
- PostgreSQL tests: set `TESTHUB_KNOWLEDGE_DATABASE_URL` to a disposable loopback
  database ending `_test`, then run `knowledge-plan.integration.spec.ts`.
  Each run creates/removes its own UUID-named schema; no user database is reset.
- Real NestJS client HTTP: see the local Postman simulation instructions in
  `../postman/simulations/knowledge-plan.context.md`.
- Python tests cover full-source outlines, inferred topics, deep trees, per-cell
  evidence isolation, missing evidence and post-call revocation. Opt-in pgvector
  tests verify page 50 remains retrievable with identical vectors, as filtering
  occurs before LIMIT 40, and verify chapter-less technical indexes.

`CONTINUITY.md` files remain local handoff notes and are ignored/untracked.
