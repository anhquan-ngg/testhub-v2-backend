# Exam distribution delta (BY_TYPE / BY_CHAPTER)

Delta lets each generated exam deviate by a few questions from the configured
distribution while the total question count stays exactly N. Full design:
`docs/graduation-thesis/ke-hoach-delta-phan-phoi-de-thi.md` in the workspace root.

## Semantics

- Configured quotas `q_i` and applied counts `x_i`; `sum(x_i) == sum(q_i) == N`.
- Transfer budget: `D = 1/2 * sum|x_i - q_i| <= d`, where `d` is `Exam.distribution_delta` in `{0, 1, 2}` (default 0 = exact).
- BY_TYPE: moves stay within the same `question_type` and only between adjacent `question_format` levels.
- BY_CHAPTER: moves are between configured chapters of the same topic (whole active subtree, see `chapter-hierarchy.md`).
- Planner is deterministic for a seed (`common/quota-planner.ts`); capacity-aware (`common/distribution-delta.ts`).
- If no feasible variation exists but the baseline is valid, the baseline is used and the reason is recorded. The saved `distribution` is never rewritten.

## Data model

- `Exam.distribution_delta Int @default(0)`.
- `Exam.distribution_delta_online Boolean @default(false)`; print always applies delta, online only when this flag is true and delta > 0.
- `Submission.selection_metadata Json?`: slim, versioned `DistributionDeltaSummary { v: 1, seed, requested_delta, applied_d, status, reason?, moves: [{from, to}] }`. Never exposed to students. Submissions created before this feature have `null`.

Migrations (generated offline, **not applied** to any database; apply explicitly in order):

1. `20261101090000_add_exam_distribution_delta`
2. `20261101091000_add_online_distribution_delta`

Both are additive and backwards compatible.

## API

- `POST /exams` / `PATCH /exams/:id` accept `distribution_delta` (0..2) and `distribution_delta_online`.
  Delta > 0 on a mode other than BY_TYPE/BY_CHAPTER returns 400; switching to an unsupported mode resets both fields; delta 0 resets the online flag.
- `POST /exams/distribution-delta/check` body `{ topic_id, mode, distribution (JSON string), distribution_delta? }`
  returns `{ baseline_feasible, delta_requested, max_feasible_d, total_questions, warnings: [{ code, message }] }`.
  Codes: `BASELINE_INSUFFICIENT`, `NO_FEASIBLE_VARIATION`, `DELTA_ABOVE_MAX_FEASIBLE`, `DELTA_HIGH_FOR_TOTAL` (d=2 with N < 40).
  The UI only warns at configuration time; saving is never blocked.

## Notes

- `generateBlankExamPdf(examId)` has no per-copy seed and uses the baseline distribution.
- Capacity is read outside the selection transaction; if it changed, selection falls back to the baseline.
- Tests: `npx jest src/common src/exams src/exam-print src/exam-runtime src/submission`.
