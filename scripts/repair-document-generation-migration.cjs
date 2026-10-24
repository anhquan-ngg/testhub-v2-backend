// Targeted, local-only recovery. Preview by default; --apply backs up before writing.
// No environment files or credentials are read or logged by this script.
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = '20261023090000_add_document_question_generation';
const repair = '20261025090000_reconcile_question_generation_source_indexes';
const knownOriginal = [
  '9cca84e09b66877093c48170a94a17eaa5d0bd6c9e863034163a4927aa406e37',
  '18aad014faaaaedb029527d4b97ad7a760099ac73754236100406eb293ec0f2b',
];
const knownCurrentLf = '0f3fbe0a688f78b5964ab6905e03093c1402c2a4066ebcc1812dc6b941c76044';
const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !['--apply', '--test'].includes(arg))) {
  throw new Error('Usage: node scripts/repair-document-generation-migration.cjs [--apply] [--test]');
}
const apply = args.has('--apply');
const test = args.has('--test');
const container = test ? 'testhub_migration_repair_test' : 'testhub_db';
const database = test ? 'testhub_migration_repair_test' : 'testhub';
const sha = value => createHash('sha256').update(value).digest('hex');
const sqlLiteral = value => "'" + String(value).replaceAll("'", "''") + "'";
const historicalFile = path.join(root, 'prisma', 'migrations', migration, 'migration.sql');
const historicalBytes = fs.readFileSync(historicalFile);
const historicalHash = sha(historicalBytes);
if (sha(historicalBytes.toString('utf8').replaceAll('\r\n', '\n')) !== knownCurrentLf) {
  throw new Error('Historical file differs from the verified two-index change; stop for manual review');
}
const repairFile = path.join(root, 'prisma', 'migrations', repair, 'migration.sql');
const repairBytes = fs.readFileSync(repairFile);
const repairHash = sha(repairBytes);

function docker(argv, options = {}) {
  return execFileSync('docker', argv, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options });
}
function query(sql) {
  return docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', database,
    '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'], { input: sql });
}

const ports = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', container]));
const expectedPort = test ? '55441' : '5432';
if (!ports['5432/tcp']?.some(port => port.HostPort === expectedPort)) throw new Error('Unexpected local database port mapping');
const actualDatabase = query('SELECT current_database();').trim();
if (actualDatabase !== database) throw new Error('Unexpected database');

const history = JSON.parse(query(`SELECT coalesce(json_agg(row_to_json(m) ORDER BY m.started_at), '[]'::json)
  FROM public._prisma_migrations m;`).trim());
const successful = history.filter(row => row.finished_at && !row.rolled_back_at);
if (history.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error('Unresolved failed migration; stop for manual review');
const target = successful.filter(row => row.migration_name === migration);
if (target.length !== 1) throw new Error('Expected exactly one completed document-generation migration');
if (![...knownOriginal, historicalHash].includes(target[0].checksum)) throw new Error('Unrecognized stored checksum; refusing to rewrite history');

// Refuse to hide any other edited/missing migration, including a changed repair file.
for (const row of successful) {
  if (row.migration_name === migration) continue;
  if (!/^[a-zA-Z0-9_]+$/.test(row.migration_name)) throw new Error('Unexpected migration name');
  const file = path.join(root, 'prisma', 'migrations', row.migration_name, 'migration.sql');
  const source = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const allowed = [sha(source), sha(source.replaceAll('\n', '\r\n'))];
  if (!allowed.includes(row.checksum)) throw new Error('Another migration checksum differs: ' + row.migration_name);
}
if (successful.filter(row => row.migration_name === repair).length > 1) throw new Error('Duplicate repair migration records');

const indexValidation = `DO $verify$
DECLARE column_name text; found_count integer;
BEGIN
  FOREACH column_name IN ARRAY ARRAY['source_version_id', 'source_index_id'] LOOP
    IF to_regclass('public.question_generation_batches_' || column_name || '_idx') IS NOT NULL THEN
      SELECT count(*) INTO found_count
      FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_namespace ns ON ns.oid = idx.relnamespace
      JOIN pg_am am ON am.oid = idx.relam
      WHERE ns.nspname = 'public'
        AND idx.relname = 'question_generation_batches_' || column_name || '_idx'
        AND i.indrelid = 'public.question_generation_batches'::regclass
        AND i.indisvalid AND i.indisready AND NOT i.indisunique
        AND i.indnatts = 1 AND i.indnkeyatts = 1 AND am.amname = 'btree'
        AND i.indpred IS NULL AND i.indexprs IS NULL
        AND pg_get_indexdef(i.indexrelid, 1, true) = column_name;
      IF found_count <> 1 THEN RAISE EXCEPTION 'Unexpected existing index definition'; END IF;
    END IF;
  END LOOP;
END $verify$;`;
query(indexValidation);
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', container, database,
  migration, oldChecksum: target[0].checksum, verifiedFileChecksum: historicalHash,
  repairMigration: repair, repairAlreadyRecorded: successful.some(row => row.migration_name === repair) }, null, 2));
if (!apply) {
  console.log('Preview only: database and migration files unchanged. Re-run with --apply after reviewing.');
  process.exit(0);
}

// A full custom-format backup and a history receipt are saved only in gitignored .tmp.
const stamp = new Date().toISOString().replaceAll(/[^0-9]/g, '') + '-' + randomUUID();
const backupDirectory = path.join(root, '.tmp', 'migration-backups', stamp);
fs.mkdirSync(backupDirectory, { recursive: true });
const containerBackup = '/tmp/testhub-before-migration-repair-' + stamp + '.dump';
docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', database, '--format=custom', '--file', containerBackup]);
docker(['cp', container + ':' + containerBackup, path.join(backupDirectory, 'database.dump')]);
if (fs.statSync(path.join(backupDirectory, 'database.dump')).size === 0) throw new Error('Backup is empty');
fs.writeFileSync(path.join(backupDirectory, 'migration-history-before.json'), JSON.stringify(history, null, 2));
fs.writeFileSync(path.join(backupDirectory, 'receipt.json'), JSON.stringify({ database, migration,
  previousChecksum: target[0].checksum, reconciledChecksum: historicalHash, repair, repairHash }, null, 2));

// Physical schema repair and its checksum reconciliation commit together. Only the
// one verified checksum is changed; no completed timestamp or execution log is rewritten.
const statement = `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path TO public;
SELECT pg_advisory_xact_lock(17021025, 1);
LOCK TABLE public._prisma_migrations IN EXCLUSIVE MODE;
DO $guard$ BEGIN
  IF (SELECT count(*) FROM public._prisma_migrations WHERE id = ${sqlLiteral(target[0].id)}
    AND migration_name = ${sqlLiteral(migration)} AND checksum = ${sqlLiteral(target[0].checksum)}
    AND finished_at IS NOT NULL AND rolled_back_at IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Migration history changed since preview; repair aborted';
  END IF;
END $guard$;
${indexValidation}
${repairBytes.toString('utf8')}
${indexValidation}
UPDATE public._prisma_migrations SET checksum = ${sqlLiteral(historicalHash)}
WHERE id = ${sqlLiteral(target[0].id)} AND checksum = ${sqlLiteral(target[0].checksum)};
COMMIT;`;
query(statement);
if (sha(fs.readFileSync(historicalFile)) !== historicalHash) throw new Error('Historical file changed concurrently');
const proof = query(`SELECT json_build_object('checksum', checksum,
  'sourceIndexes', (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN
    ('question_generation_batches_source_version_id_idx','question_generation_batches_source_index_id_idx')),
  'repairRecords', (SELECT count(*) FROM public._prisma_migrations WHERE migration_name=${sqlLiteral(repair)} AND finished_at IS NOT NULL AND rolled_back_at IS NULL))
  FROM public._prisma_migrations WHERE id=${sqlLiteral(target[0].id)};`).trim();
console.log('Committed targeted repair. Verification: ' + proof);
console.log('Backup: ' + path.relative(root, backupDirectory));
console.log('Historical migration file unchanged. Other pending migrations were not applied.');
console.log('Run prisma migrate dev next: Prisma will apply and record pending migrations normally.');
