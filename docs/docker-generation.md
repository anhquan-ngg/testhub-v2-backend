# Local question generation with Docker Compose

The `generation` profile starts the Nest API, AI worker and document/indexing
worker alongside the existing PostgreSQL and Redis services. Python AI and the
frontend remain on the host. Run commands from the backend repository.

## One-time prerequisites

1. Docker Desktop must be running with Linux containers. Keep the existing
   Compose project/directory so its `postgres_data` and `redis_data` volumes are
   reused. The Postgres image, container names, ports and volumes are unchanged.
   This profile does not install pgvector: the existing database must already
   have the extension, dedicated AI role and RAG schema/migrations described in
   [RAG setup](rag-indexing.md). Do not replace/recreate a Postgres container to
   upgrade its image without checking how pgvector was installed and backing up.
2. Keep a configured backend `.env` (runtime-only, never copied into the image).
   Existing auth/JWT, OAuth, encryption, S3, consent and AI settings are still
   required. API and both workers receive the same configuration. In particular:

   | Setting                                             | Local Compose behavior                                                                                                                                                                                                  |
   | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Must match the existing initialized database, not just desired new values. Changing them does not change existing database accounts.                                                                                    |
   | `DATABASE_URL`                                      | Overridden inside containers with a URL using the above credentials and host `postgres:5432`; the host-side `.env` value is untouched.                                                                                  |
   | `DOCKER_DATABASE_URL` (optional)                    | Explicit full container URL to preserve nondefault database login, URL-encoded password or query options. Host must be `postgres` for this stack, not `localhost`. Use this for passwords with reserved URL characters. |
   | `REDIS_URL`, `REDIS_PASSWORD`                       | Container URL is `redis://redis:6379` (DB 0); password matches the existing Compose Redis configuration.                                                                                                                |
   | `AI_QUESTION_GENERATION_ENABLED`, `AI_RAG_ENABLED`  | Forced to `true` by this opt-in profile. Starting workers may process existing queued work and incur provider charges.                                                                                                  |
   | `AI_SERVICE_INTERNAL_TOKEN`                         | Existing value must match Python's `INTERNAL_API_TOKEN`; never place the Gemini key in NestJS.                                                                                                                          |
   | `AI_SERVICE_BASE_URL`                               | Container URL defaults to `http://host.docker.internal:8000`, not container loopback.                                                                                                                                   |
   | `DOCKER_AI_SERVICE_BASE_URL` (optional)             | Override if host Python uses a different port.                                                                                                                                                                          |
   | `PORT`                                              | Host API port, default `3001`; the container listens on `3001` regardless.                                                                                                                                              |
   | `FRONTEND_URL`                                      | Keep the actual host browser origin (normally `http://localhost:3000`).                                                                                                                                                 |
   | `NODE_ENV`                                          | `development` for this local profile, preserving non-HTTPS localhost auth cookies. Not a production deployment.                                                                                                         |

   For S3-compatible storage running on the host, ensure any configured internal
   endpoints are reachable from containers. Browser presigned URLs must also be
   reachable from the browser. This profile does not provision or change storage.

3. Check pending Prisma migrations separately with `npx prisma migrate status`.
   Review and explicitly apply the required migrations to the confirmed local
   database before starting workers. **No migration, seed, reset or db push runs
   at image build/startup.** Do not blindly apply unrelated pending migrations.
   See [knowledge plans](knowledge-plans.md),
   [documents](learning-documents.md) and [RAG setup](rag-indexing.md).
4. Start Python in its own terminal, with its existing environment and RAG DB
   configuration (the host still uses `127.0.0.1:5432` for Compose PostgreSQL):

   ```powershell
   Set-Location ..\testhub-ai-service
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --env-file .env --host 0.0.0.0 --port 8000
   ```

   Binding `0.0.0.0` permits connections through Docker Desktop's host gateway.
   Restrict access with the host firewall; do not expose this internal service to
   the Internet. Wait for startup and verify readiness on the host:

   ```powershell
   Invoke-RestMethod http://127.0.0.1:8000/ready
   ```

   `/ready` verifies configured readiness, not a real Gemini generation. Python
   must stay running; Compose cannot health-gate a service outside this project.

5. Stop the host-managed backend group with `npm run dev:down`, or stop manually
   started API/worker terminals. Do not leave competing host workers consuming
   the same queues or a second API occupying the host port. Stop only the backend
   processes, not Python. Frontend still starts separately.

## Start with one command

```powershell
docker compose --profile generation up -d --build
```

This builds one shared image for all three Nest processes, waits for Postgres
and Redis healthchecks, then starts the API and workers. No `npm install`, local
`npm run build` or separate worker terminals are needed for container execution.
Default `docker compose up -d` remains infrastructure-only.

The image builds/generates Prisma Client on Linux; no host `node_modules`, `dist`,
`.env`, private key, local data or continuity file enters the build context.
Chromium is installed for the existing PDF routes. API runs as the unprivileged
`node` user and is published only on host loopback. Workers expose no ports.

## Status, logs, restart and stop

```powershell
docker compose --profile generation ps
docker compose --profile generation logs -f --tail 50 api ai-worker document-worker
Invoke-RestMethod http://127.0.0.1:3001/
```

Use your `PORT` in the last command if changed. The API healthcheck checks its
HTTP listener, not end-to-end provider/storage availability. Workers have no HTTP
endpoint; inspect their startup/queue logs and actual batch/index progress.
Do not share unredacted logs or run plain `docker compose config` for diagnostics:
resolved configuration can expose runtime secrets. Use `config --quiet` instead.

After code or `.env` changes, repeat the one-command startup to rebuild/recreate
as necessary. There is no source bind mount or TypeScript watch in this profile.
This does not rebuild host `dist` or affect PM2's compiler.

To stop only API/workers and retain infrastructure and database containers:

```powershell
docker compose --profile generation stop api ai-worker document-worker
```

Shutdown allows up to four minutes for Nest/BullMQ to drain active work. Avoid
force-killing workers during provider calls: ambiguous attempts are not
transparently safe to reissue. No paid retry behavior was changed.

Do not use `down -v`: it deletes persistent data. Ordinary `down` also removes
containers, which can remove a manually installed pgvector package even though
volumes survive; prefer the targeted `stop` above for the existing local setup.

## Troubleshooting and functional check

- DB login/missing tables: confirm Compose credentials match the initialized DB
  and review required migrations. `localhost` inside a container is not the host
  or Postgres service. Keep Python and Nest on the same database.
- Python connection refused: keep Python bound to `0.0.0.0`, check Windows firewall
  and `DOCKER_AI_SERVICE_BASE_URL`. A host-only `127.0.0.1` bind may not be reachable
  through Docker Desktop's gateway.
- Wrong/disabled feature config after editing: rerun `up -d --build` rather than
  `restart`, because `restart` does not apply changed Compose environment.
- Queued plans/batches: inspect `ai-worker`. Extraction or indexing stuck: inspect
  `document-worker`, Python readiness and S3 configuration.
- Validate a real run manually: upload a text PDF/PPTX, wait for extraction/index,
  confirm a knowledge plan, generate a fresh batch, review then commit approved
  questions and confirm repeated commit creates no duplicate. Infrastructure/API
  health alone does not establish this E2E outcome.

## Isolated configuration regression tests

```powershell
node --test scripts\compose.test.cjs
```

Tests resolve a copied Compose file in a temporary directory with synthetic env,
never the real `.env`. They verify opt-in services, container URLs/overrides,
shared flags, worker commands, existing infrastructure volumes and API exposure.
They do not start services, touch user databases or invoke Python/Gemini.
