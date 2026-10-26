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

APPROVED plans can be edited into a new REVIEW_REQUIRED revision. Existing batch
snapshots remain immutable. Stale edits/confirmation/generation return conflict;
reload the saved plan before retrying. Plan creation and batch submission are
idempotent for the same owner/key and payload. Reusing a key for other input is a
conflict. Uploaded reservations remain only in memory, not browser storage/URLs.

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
