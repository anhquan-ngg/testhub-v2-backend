# Local knowledge-plan dependency simulation

This is a local contract fixture for the backend's real `RagClient` HTTP path.
No sign-in, workspace binding, cloud upload, Google call or real token is used.
The mock started from the AI service's exported `rag-indexing.openapi.json` and
was narrowed to the outline and planned-generation requests exercised here.
All other operations return 501. It does not simulate PostgreSQL authorization
or assert LLM quality; those are covered by separate Python/PostgreSQL tests.

Run with Postman CLI >=1.70:

```powershell
postman simulation run postman/simulations/knowledge-plan.sim.yaml --port 4519 --output ndjson --no-history
# In another terminal, from the backend repo:
$env:TESTHUB_PLAN_SIM_URL='http://127.0.0.1:4519'
npm test -- knowledge-plan.http --runInBand
```

The `internal` path routing key preserves the production client's absolute
`/internal/rag/...` paths; the member handles `/rag/...`. The fixture's public
test token is deliberately synthetic. It returns a source-wide outline, ordered
planned questions with exact quotes/hashes, and a retryable 503 when the outline
title is `fixture-unavailable`. Restart the simulation after changing handlers.
Stop it with Ctrl+C. Do not enable body logging with real documents.

Verified locally: outline parsing, forwarding two independent cognitive cells,
response validation and sanitized retryability after a dependency outage (3 tests).
