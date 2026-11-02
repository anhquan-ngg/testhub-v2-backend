# PostgreSQL transaction query serialization

## Reason

With Prisma 7.8.0 and `@prisma/adapter-pg`, Prisma can dispatch relation queries
concurrently on one transaction connection, even inside one awaited Prisma call.
`pg` 8 warns that querying an already-busy client is deprecated; the warning
announces removal of this behavior in `pg` 9.

Prisma 7.10.1's published adapter still permits concurrent dispatch. The matching
upstream issue is [#29407](https://github.com/prisma/orm/issues/29407); proposed
fixes [#29468](https://github.com/prisma/orm/pull/29468) and
[#29979](https://github.com/prisma/orm/pull/29979) were unmerged when checked.

## Local workaround

[PrismaService](../src/prisma/prisma.service.ts) uses
[SerializedPrismaPg](../src/prisma/serialized-prisma-pg.ts), a wrapper around the
installed adapter's public transaction methods. No dependency patch or upgrade
is required.

- Each transaction has its own FIFO queue for queries, savepoints and release.
- Query errors still reach the caller; an error does not block queued rollback.
- Commit/rollback release waits for earlier operations to settle. Prisma retains
  responsibility for issuing the actual COMMIT/ROLLBACK SQL.
- Independent transactions and non-transactional pooled queries remain parallel.
- This does not change Prisma's timeout policy or cancel in-flight driver queries.

After normal application restart/rebuild, all PrismaService consumers use the
wrapper. No migration or database change is required. Do not hide the warning or
upgrade to `pg` 9 merely because this workaround is present.

## Validation and removal

Run `npx jest --runInBand --runTestsByPath src/prisma/serialized-prisma-pg.spec.ts src/prisma/prisma.service.spec.ts`.
Tests use the real installed adapter with a synthetic pool connection, without
opening a database connection. They reproduce baseline concurrent dispatch and
check serialization, errors, release, savepoints and independent concurrency.

When a stable Prisma release includes the upstream fix, verify its behavior and
update client, CLI and adapter together. Then replace SerializedPrismaPg with
PrismaPg and remove this wrapper and its workaround-specific tests. A later
Prisma release must not be assumed fixed solely from its version number.
