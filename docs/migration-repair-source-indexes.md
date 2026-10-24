# Local source-index migration recovery — 2026-10-25

## Confirmed cause

Database `testhub` on localhost:5432 applied the original
`20261023090000_add_document_question_generation` file from commit `70e8f6a`.
Commit `018c7dd` subsequently appended two source lookup indexes to that file.
The stored checksum therefore describes the original SQL, while the working
file and shadow replay include indexes that this database never received.

This produces TWO errors: an edited applied migration and schema drift. Adding
a migration alone cannot clear the edited-file checksum warning. No corruption
or lost application data was established by these errors.

## Repair performed

The historical migration file was left byte-for-byte unchanged, as requested.
Added `20261025090000_reconcile_question_generation_source_indexes/migration.sql`:
two ordinary non-unique CREATE INDEX IF NOT EXISTS statements, no row changes.
IF NOT EXISTS supports both original-history databases and fresh databases that
already create the indexes while replaying the current historical file.

The targeted script `scripts/repair-document-generation-migration.cjs`:

1. Verifies the current historical file matches exactly the known two-index
   revision, and the DB checksum matches a known original/current file version.
2. Checks all other successful migration checksums and rejects failed/missing/
   differently edited migrations or conflicting existing index definitions.
3. Defaults to preview. `--apply` first saves a full pg_dump custom-format backup,
   migration ledger snapshot and receipt under gitignored `.tmp/migration-backups/`.
4. In one transaction, applies the new index SQL, verifies index definitions and
   updates ONLY the verified historical ledger row's checksum. Its timestamps,
   execution logs and other migration records are preserved.
5. Leaves new migrations pending. Normal `prisma migrate dev` applies and records
   them using Prisma itself. It does not insert fabricated execution records.

The checksum update is an exceptional, narrowly verified reconciliation of an
already-modified history, not a routine way to silence drift. The usual remedy
is to restore the original migration file; this task explicitly prohibited
changing existing migration files. Changing a checksum before reproducing the
missing schema changes would merely conceal the mismatch.

The script uses local Docker `testhub_db`, database `testhub`, mapped port 5432,
and the container's local PostgreSQL role. It does not read .env files, print
credentials or connect to production. Unknown configurations must be reviewed
separately. Preview: `node scripts/repair-document-generation-migration.cjs`.

## Verification

- Recreated the exact checksum/index drift with all 22 original migrations and
  a synthetic data row in a disposable PostgreSQL container on port 55441.
- After repair, `prisma migrate dev` applied auth sessions and the new index
  migration, replayed the history in its shadow database and reported no drift.
  The synthetic row remained present. The old file hash remained unchanged.
- On the actual LOCAL database, a full backup was saved before repair; normal
  `prisma migrate dev` successfully applied `20261024090000_add_auth_sessions`
  and `20261025090000_reconcile_question_generation_source_indexes`, reporting
  that database and schema are in sync. No reset/db push/production deploy ran.

The new auth-session schema is now installed locally. Restart the API/frontend
if needed and log in again, because legacy tokens have no session ID.

For all future changes: add a new migration. Never append SQL to an applied one.
