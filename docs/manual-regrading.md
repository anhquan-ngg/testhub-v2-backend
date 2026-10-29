# Manual submission regrading

## Scope and user journey

The existing automatic grader and notification bell are retained. Lecturers can
open **Exam report > Grade/regrade** for one completed submission, review answers
and attachments, and edit the score of every active question slot, including
single choice, multiple choice and essay answers.

1. **Save draft** stores the entire score set privately. Published student results,
   ratings and notifications do not change.
2. **Publish** requires a saved, unchanged draft and explicit confirmation. It
   updates question scores and the /10 total, records an immutable publication,
   and creates an in-app notification for that submission's student.
3. The notification opens `/result/{submissionId}`. No email/SMS or score content
   is sent. Offline students can retrieve the stored notification later.

The route in the frontend is
`/{locale}/lecturer/exams/{examId}/report/{submissionId}/grade`. Reasons are optional
(empty string), private to lecturers, and limited to 2,000 characters. Students do
not receive draft scores, reasons or publication history.

## Scoring

- Each active `SubmissionQuestions` slot has equal weight. The denominator is the
  actual attempt's active question count, not the current question bank/exam count.
- API scores are finite normalized numbers from 0 to 1, with at most two decimal
  places. The UI displays them as percentages. Every active slot must appear
  exactly once; missing, duplicate, deleted or foreign slots are rejected.
- Total = `round(sum(scores) * 10 / questionCount, 2)`, without early rounding of
  each question's /10 contribution. Example: `1, 0.5, 0.33` gives **6.10/10**.
- `is_correct` means full credit (`score === 1`); partial credit remains available
  through `score`.
- Existing rating thresholds remain: EXCELLENT >=9, GOOD >=7, AVERAGE >=5,
  otherwise POOR. Answers and question-bank correct answers are never rewritten.

## API

These cookie/JWT-protected endpoints require role LECTURER, ownership through
`Exam.lecturer_id`, and an active COMPLETED submission on an active exam. A foreign
submission returns 404. An unfinished/empty attempt returns 400.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| GET | `/submission/:id/regrade` | None | Workspace |
| PUT | `/submission/:id/regrade/draft` | `expected_revision`, `expected_grade_revision`, `scores`, `reason` | Workspace; 200 |
| POST | `/submission/:id/regrade/publish` | `revision` | Workspace; 201, including an idempotent replay |

A workspace contains `submission` (existing detailed shape plus
`grading_revision`), `draft` or null, and descending `history` publications.
`scores` contains `{ submission_question_id, score }` objects. `reason` may be
omitted (defaults to empty string). New drafts use `expected_revision: 0`; later
saves use the displayed draft revision. Always send the displayed submission's
`grading_revision` as `expected_grade_revision`.

A draft includes `revision`, `base_grade_revision`, `published_revision`,
`scores`, `reason`, `grader_id`, and `updated_at`. `published_revision` records the
last published **draft revision**, not the current public grade revision. History
records lecturer ID, time, reason, previous/new totals and per-question old/new
scores. Existing public submission endpoints do not include the new relations.

Stale saves/publications return 409 (`REGRADING_STALE_REVISION`): reload the
workspace and explicitly reconcile edits. A previously published revision may be
retried without duplicate audit/notification, even if a newer draft exists; the
response is the current workspace, not necessarily the old publication snapshot.

## Persistence and concurrency

`Submission.grading_revision` fences the public grade. The private draft and
append-only publication records live in separate tables. Saving and publishing
lock the submission and owning exam, then recheck ownership/status and revisions.
Concurrent saves cannot silently replace one another.

Publication writes question scores, total/rating, grade revision, audit, published
draft marker and one durable notification in the **same PostgreSQL transaction**.
A notification-write failure rolls all of them back. Socket.IO emission happens
only after commit and is best effort: a disconnected socket does not turn a
committed publication into an error. Exactly-once realtime delivery is not
promised; persisted notifications are the source of truth.

Automatic grading uses the same submission lock, increments the public grade
revision once and skips delayed/retried jobs once any public revision exists.
If an initial automatic grade runs after a draft was saved, publication returns
409; the lecturer reloads/resaves against the new grade revision. Existing rows
start at revision 0; their stored published scores remain unchanged by migration.
Answer writes lock the submission and recheck IN_PROGRESS status, so an in-flight
answer cannot overwrite a later manual publication. Legacy PATCH cannot change
score/rating or mutate a completed submission; callers must use this workflow.

## Rollout

Migration `20261029110000_add_submission_regrading` is additive and has rollback
instructions. It was exercised on a disposable test database, **not applied to the
application database**.

1. Review/approve pending migrations and back up the deployment database.
2. Apply approved migrations with the normal operator-controlled Prisma process
   (`npx prisma migrate deploy`), then regenerate the client (`npx prisma generate`).
3. Deploy/restart API and exam workers together, then deploy the frontend. Old
   workers do not understand grade revision fences and must not remain running
   alongside the new regrading workflow.
4. Check draft privacy, publication, notification bell and result link with test
   accounts before enabling lecturer access.

There are no new queues, external services, secrets or dependencies. Do not use
`migrate reset`. Downgrade the UI/API before removing the additive schema, export
publication history before any rollback, and stop grade workers during rollback.

## Verification

Portable validation/service tests:

```powershell
npx jest submission-regrade.service --runInBand
npx tsc --noEmit -p tsconfig.json --incremental false
```

`submission-regrade.integration.spec.ts` is opt-in. It requires an **empty,
disposable** PostgreSQL database named `testhub_regrade_test` on
`127.0.0.1:55441`, and equal `TESTHUB_REGRADE_DATABASE_URL` / `DATABASE_URL` values.
It never loads project environment files, resets an existing database or uses the
application Redis. It constructs the pre-feature schema offline, applies the
actual additive SQL migration and tests real Nest HTTP validation/roles,
ownership, draft privacy, concurrent save/publish, replay deduplication, rating,
rollback on notification failure, offline delivery and late automatic grading.

```powershell
# Set both URLs to the explicitly created disposable fixture database only.
npx jest submission-regrade.integration --runInBand
```

The suite refuses a nonempty database. Destroy its dedicated disposable fixture
after testing; do not point it at an application database. JWT identity is supplied
by a fixture guard; the existing RolesGuard and HTTP validation are real. Existing
auth-session tests separately cover real cookie/JWT authentication.
