# Local source-index migration recovery

## Comment-only checksum recovery — 2026-10-29

### Confirmed cause

The actual local database has 25 successful migration records, with no failed or
rolled-back records. Exactly one applied migration differs from its local file:
`20261025090000_reconcile_question_generation_source_indexes`.

| Version | SHA256 |
| --- | --- |
| Applied database record / Git `a2c3077` | `4c5712c66b7bd90ffc63c46d620235291f81fac4903c8b3ad34515f345ff2bc6` |
| File after Git `64e167e` | `62189714bafebeee51f47cf85e35cae2f400b7f13e55405f7590b58a3f0c3a42` |

The later commit replaced only the `-- Down:` comment. The two executable
`CREATE INDEX IF NOT EXISTS` statements are identical, and both expected btree
indexes already exist on `source_version_id` and `source_index_id`. Prisma checks
migration file contents, including comments, so this is a real checksum mismatch.
It does not establish data corruption or missing indexes. This is a different
incident from the older document-generation repair described later in this file.

### Repair performed

1. Used container-local `psql` in `BEGIN READ ONLY` transactions to inspect the
   migration ledger and index definitions. No credentials or environment files
   were read or printed.
2. Preserved the pre-repair migration bytes and a ledger/index baseline in local
   session artifacts. Existing uncommitted feature work, including README, was
   left unchanged. No application database dump was necessary for a file-only
   repair that performs no database writes.
3. Retrieved the original file from Git commit
   `a2c3077bf03eb441c80f59b93b52e88341bf7303`, required its SHA256 to equal the
   recorded database checksum, checked executable SQL equivalence, and wrote the
   exact original Buffer bytes back to the working file.
4. Kept the safer rollback guidance in this document instead of editing the
   already-applied SQL file again. The restored historical Down comment is not
   automatically executed by Prisma and must not be used as a blind rollback.
5. Rechecked all applied migration checksums, the complete ledger baseline and
   both index definitions. No ledger row or database object was changed. The
   regrading migration remains pending by explicit user choice.

The central restore operation used Node rather than PowerShell `>`/`Out-File`,
which can alter encoding or newlines. Run from the backend repository only, after
checking the target database checksum, preserving the existing file and ensuring
there are no concurrent file edits. These hashes are specific to this incident:

```powershell
@'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const file = 'prisma\\migrations\\20261025090000_reconcile_question_generation_source_indexes\\migration.sql';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = '4c5712c66b7bd90ffc63c46d620235291f81fac4903c8b3ad34515f345ff2bc6';
const current = fs.readFileSync(file);
const original = execFileSync('git', [
  'show',
  'a2c3077bf03eb441c80f59b93b52e88341bf7303:prisma/migrations/20261025090000_reconcile_question_generation_source_indexes/migration.sql',
]);
if (sha(original) !== expected) throw new Error('Unexpected original checksum');
if (sha(current) === expected) process.exit(0);
if (sha(current) !== '62189714bafebeee51f47cf85e35cae2f400b7f13e55405f7590b58a3f0c3a42') {
  throw new Error('Current file differs from the inspected version; stop');
}
fs.writeFileSync(file, original);
if (!fs.readFileSync(file).equals(original)) throw new Error('Saved bytes differ');
console.log(sha(original));
'@ | node -
```

The forward slashes inside the Git object expression are Git tree syntax, not a
Windows filesystem path. Do not replace them with backslashes.

### Rollback safety and verification boundaries

- Retain any index that existed before reconciliation, including indexes created
  by `20261023090000_add_document_question_generation`. Drop an index only when a
  pre-run inventory proves it was absent and created by this reconciliation. If
  that inventory is unavailable, leave both indexes intact. No index was dropped
  during this repair.
- All 25 successful migration checksums now match local migration files, allowing
  Prisma-compatible LF/CRLF variants; the restored file matches its recorded hash
  exactly. Full ledger records and both index definitions match the baseline.
- These checks verify the reported edited-file cause and the affected indexes;
  they do not substitute for a full shadow replay or establish zero schema drift
  everywhere in the database. `prisma migrate status` alone is not a drift test.
- `20261029110000_add_submission_regrading` is still pending. `prisma migrate dev`
  was deliberately not run: it could apply that migration. The user can run it
  later against the confirmed local database when ready to install regrading.
  If it reports any further drift/reset request, stop and investigate; do not
  accept a reset just because the checksum incident has been repaired.
- No reset, `db push`, checksum-ledger update, migration resolution, pending
  migration application, production operation, commit or deployment occurred.
- Do not use `scripts/repair-document-generation-migration.cjs --apply` for this
  incident: it targets a different migration. Do not use `migrate resolve
  --applied` to repair an already-successful migration's edited-file checksum.
  A new migration alone cannot clear a historical checksum mismatch.
- Preserve applied files byte-for-byte, even when improving comments. Put
  corrected operator guidance in documentation; put new schema SQL in a new
  migration. Databases that applied a different historical version must first
  have their own ledger checked rather than inheriting this repair blindly.

## Earlier document-generation/index-drift recovery — 2026-10-25

### Confirmed cause

Database `testhub` on localhost:5432 applied the original
`20261023090000_add_document_question_generation` file from commit `70e8f6a`.
Commit `018c7dd` subsequently appended two source lookup indexes to that file.
The stored checksum therefore describes the original SQL, while the working
file and shadow replay include indexes that this database never received.

This produces TWO errors: an edited applied migration and schema drift. Adding
a migration alone cannot clear the edited-file checksum warning. No corruption
or lost application data was established by these errors.

### Repair performed

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

### Verification

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
