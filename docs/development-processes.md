# Background development processes

Run these commands from the backend repository after `npm install`:

```powershell
npm run dev:up
npm run dev:status
npm run dev:logs
npm run dev:down
```

PM2 is a **local devDependency**; no global install is required. `dev:up` starts
one compiler, the API, the AI worker and the document/indexing worker in the
background. The command returns after a successful compile has started the three
application processes. This is process status, not a health check of Redis,
PostgreSQL, Python or S3. Inspect status/logs if an application subsequently exits.

Start the existing local PostgreSQL/Redis and Python service separately. Apply
required migrations before enabling the corresponding features. These commands
do not apply migrations, change `.env`, start containers, seed data or launch the
frontend. Applications use the existing environment, with `NODE_ENV=development`.
Starting workers permits normal processing of queued work, including paid AI calls
when the existing feature flags are enabled.

## Processes and reloads

| PM2 name | Responsibility |
| --- | --- |
| `testhub-compiler-dev` | One Nest compiler in watch mode |
| `testhub-api-dev` | HTTP API / realtime |
| `testhub-ai-worker-dev` | Knowledge-plan preparation and question generation |
| `testhub-document-worker-dev` | Document extraction and RAG indexing |

All applications use one `dist` directory. Only the compiler writes it. The dev
Nest config retains existing output and TypeScript has `noEmitOnError=true`.
Applications restart **after Nest reports a complete build with zero errors**,
instead of reacting to each partially written JS file. TypeScript errors appear
in compiler logs; existing application processes keep running the last valid
build. Fixing the error triggers compilation and reload automatically.

`dev:up` can be repeated: it refreshes the compiler/environment and reuses the same
application names. For `.env` changes, rerun `dev:up` to reload the applications;
the compiler watches TypeScript, not environment files. The existing `start:dev`
and production scripts remain available, but do not run a second compiler/API
against the same `dist`/port while this dev group is active. Use `dev:down` first.

PM2 restarts crashed processes with a delay and a bounded unstable restart count.
Graceful shutdown allows up to four minutes per process for active work to drain.
The IPC shutdown bridge supports Windows and forwards to Nest shutdown hooks.
`dev:up` waits up to ten minutes while compilation/restarts finish; Ctrl+C stops
waiting without stopping background processes. Use `dev:down` to stop the group.

## Logs

```powershell
npm run dev:logs
npm run dev:logs -- --lines 50
npm run dev:logs -- --only ai-worker
npm run dev:logs -- --only document-worker --lines 0
```

`--only` accepts `api`, `ai-worker`, `document-worker` or `compiler`. By default,
the viewer prints the last 20 complete lines from each stdout/stderr file, then
follows new writes. `--lines 0` skips completed historical lines. Every line is
labelled, including multiline errors; ANSI control sequences are removed:

```text
[testhub-compiler-dev] - Found 0 errors. Watching for file changes.
[testhub-api-dev] - Application is running on: http://localhost:3001
[testhub-ai-worker-dev] - Generation job started
[testhub-document-worker-dev] - Document extraction completed
```

The application messages above illustrate the prefix format; individual services
keep their existing log content. Ctrl+C closes the log viewer and leaves the
applications running. Full stdout/stderr files remain in `.tmp/pm2-dev/logs` after
`dev:down`. The files are not automatically rotated; stop the dev group before
clearing old logs if they grow large. Do not add sensitive request bodies or
credentials to application logs.

## Isolation and troubleshooting

Development PM2 state lives under `.tmp/pm2-dev` and is ignored by Git. The wrapper
also uses project/user-specific IPC sockets, including on Windows, where PM2's
default pipe names otherwise overlap across different `PM2_HOME` directories.
Production `ecosystem.config.cjs` and globally managed PM2 processes are untouched.
Use the `dev:*` commands to access this private group; global `pm2 status` targets
a different daemon. `dev:down` deletes only the four configured dev applications,
retains logs and leaves the private PM2 daemon idle. No boot-time autostart or
`pm2 save` is configured.

- **Build error:** inspect `dev:logs -- --only compiler`, fix TypeScript, and wait
  for the next successful build. On an initial error, `dev:up` exits nonzero while
  the compiler keeps watching; applications start when compilation succeeds.
- **Repeated application crashes:** inspect that application's logs and its
  existing environment/dependencies. Correct them, then rerun `dev:up`.
- **Port already in use:** stop the separately launched API that owns the port.
- **Another action running:** allow the other `dev:up`/`dev:down` to finish or
  cancel its terminal command. A stale control lock is recovered automatically
  when its owning PID no longer exists.
- **PM2 connection/start failure:** inspect `.tmp/pm2-dev/pm2.log` and OS process
  permissions. Never publish the complete PM2 state/environment files: they may
  contain inherited environment values.

## Verification

```powershell
npm run test:dev-runner
```

The tests use the real local PM2 and Nest compiler in a temporary fixture project
with synthetic applications. They cover background start, repeated startup,
successful reload, failed-compilation fencing, named multiline/Unicode logs,
graceful shutdown and teardown. They never start the actual API/workers or connect
to PostgreSQL, Redis, S3 or an AI provider.
