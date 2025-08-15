Here’s a drop-in doc you can add at chirality-admin/docs/CLI-to-UI.md.

⸻


# CLI ⇄ UI Integration Guide
**Repo:** `chirality-admin`  
**Scope:** How each Admin UI control maps to backend CLI commands and GraphQL calls — including payloads, logs, and expected graph effects.

---

## 0) Mental model (what talks to what)

[ Admin UI (Next.js) ]
│
├── GraphQL (reads/writes cells)
│     └──> chirality-semantic-framework  ── neo4j
│             (chirality_graphql.py)
│
└── Orchestrator API (runs CLI)
/api/orchestrate/run|logs|status|stop
└──> chirality_cli.py
└──> GraphQL (same as UI)
└──> neo4j

- **GraphQL** is used by the UI for *inspection* and small writes.  
- **CLI** is used for *pipelines*; the UI triggers it via the **orchestrator** endpoints.

---

## 1) Endpoints & clients

### Orchestrator API (UI → CLI)
- `POST /api/orchestrate/run` → start CLI job → `{ jobId }`
- `GET  /api/orchestrate/logs/{jobId}` → **SSE** log stream
- `GET  /api/orchestrate/status?jobId=…&limit=N` → job state (+ last N logs)
- `POST /api/orchestrate/stop` → cancel job

**Auth:** set `ORCHESTRATOR_TOKEN`; send `Authorization: Bearer <token>`.

**Client helpers (admin-ui/lib/orchestratorClient.ts):**
```ts
startJob(cmd, args)     // POST /run
streamLogs(jobId, cb)   // SSE /logs/{jobId}
getStatus(jobId, 10)    // GET /status
stopJob(jobId)          // POST /stop

GraphQL (UI ↔ Framework)

Typical query used by UI:

query CellInspector($st:String!,$mx:String!,$i:Int!,$j:Int!,$ont:Boolean!){
  pullCell(station:$st,matrix:$mx,row:$i,col:$j,includeOntologies:$ont){
    valley{ name version }
    station{ id name index }
    matrix{ id name rowLabels colLabels }
    cell{
      row col stage version value
      labels{rowLabel colLabel}
      anchors{ id kind text }
      traces{ phase promptHash modelId latencyMs createdAt }
      ontology{ curie label }
    }
    ontologies @include(if:$ont){ jsonldContext entities{ curie label } }
  }
}

Mutations (CLI uses via chirality_graphql.py):

mutation Upsert($in:UpsertCellStageInput!){
  upsertCellStage(input:$in){
    id version contentHash deduped
  }
}


⸻

2) Allowed CLI commands (Phase-1)
	•	push-axioms
	•	generate-c
	•	generate-f
	•	generate-d
	•	verify-stages

If you see semantic-init anywhere, it’s stale code. Use the commands above.

⸻

3) UI → CLI → Graph mapping (by screen)

A) Pipeline Console

UI Controls → Orchestrator /run → CLI → GraphQL → Neo4j → Logs → UI

UI action	/run payload (body)	CLI invoked	Graph effect	SSE events you’ll see
Push Axioms (A,B,J)	{ "cmd":"push-axioms", "args": { "api_base": "...", "spec":"NORMATIVE_...txt", "log_json": true }}	chirality_cli.py push-axioms	Writes A (axiom), B (axiom), J (axiomatic_truncation) stages per cell	run_start, stage_write {station:"Problem Statement", matrix:"A", stage:"axiom", ...}, stage_write {...B...}, stage_write {...J...}, job_complete
Generate C (Requirements)	{ "cmd":"generate-c", "args": { "api_base":"...", "rows":"0..2", "cols":"0..3", "ufo_propose": true, "log_json": true }}	generate-c	For each (i,j): context_loaded, product:k, sum, interpretation, final_resolved in C	stage_write per stage, optional ufo_proposed, job_complete
Generate F (Objectives)	{ "cmd":"generate-f", "args": { "api_base":"...", "rows":"0..2","cols":"0..3","log_json":true }}	generate-f	(i,j): context_loaded, element_wise, interpretation, final_resolved in F	stage_write…
Generate D (Solution Objectives)	{ "cmd":"generate-d", "args": { "api_base":"...", "rows":"0..2","cols":"0..3","log_json":true }}	generate-d	(i,j): context_loaded, sum, interpretation, final_resolved in D	stage_write…
Verify	{ "cmd":"verify-stages", "args":{ "api_base":"...", "station":"Requirements","matrix":"C" }}	verify-stages	No writes; emits list of missing finals	verify, job_complete
Stop job	POST /stop { jobId }	SIGTERM (fallback SIGKILL)	Marks job failed; no further writes	job_stop_requested, job_stopped/job_killed

What gets logged (JSON):

{ "event":"stage_write",
  "station":"Requirements","matrix":"C","i":0,"j":1,"stage":"sum",
  "version":2,"deduped":false,"modelId":"gpt-5","latencyMs":612,
  "promptHash":"...", "systemVersion":"..." }

The UI’s progress bar should count unique (i,j) seen in stage_write against the selected slice.

⸻

B) Matrix Explorer
	•	Data source: GraphQL pullCell(..., includeOntologies:false) for each visible (i,j).
	•	Displayed fields: rowLabel, colLabel, cell.stage, cell.value (preview), traces[0].modelId, traces[0].createdAt.
	•	Actions:
	•	Inspect → opens Cell Inspector.
	•	Rebuild → calls /run with the appropriate command/slice (usually single-cell rows/cols), listens on SSE.

⸻

C) Cell Inspector
	•	Data source: GraphQL pullCell(..., includeOntologies:true) for a single (i,j).
	•	Tabs:
	•	Timeline → renders cell.stage history in order (context_loaded → product:k... → sum → interpretation → final_resolved), showing promptHash, modelId, latencyMs.
	•	Ontology → renders ontologies.entities and cell.ontology (CURIE chips, definitions).
	•	Payload/Meta → shows labels, anchors, and any document JSON payloads (Phase-2).
	•	Actions (optional):
	•	Retry stage → narrow /run to a single cell (rows=i, cols=j) to re-execute.
	•	Propose UFO → GraphQL proposeUFOClaim with evidence { kind:"LLM_OUTPUT", promptHash, modelId, payload: cell.value }.

⸻

D) (Future) UFO Claims Desk
	•	Queries: ufoClaims(status: PROPOSED|ACCEPTED|REJECTED).
	•	Mutations: adjudicateUFOClaim, addEvidenceToUFOClaim.
	•	Evidence payloads: forward the CLI’s stage JSON (value + meta).

⸻

4) SSE events (names & resume behavior)

The logs endpoint emits named SSE events (recommended pattern):
	•	hello → handshake { jobId, status, startedAt }
	•	run_start → { cmd, args(normalized) }
	•	log → general (if not structured)
	•	stage_write → primary event for UI progress
	•	verify → verification results
	•	ufo_proposed → UFO claim submitted
	•	job_complete → { status, exitCode, endedAt }
	•	job_error → { exitCode }
	•	job_stop_requested, job_stopped, job_killed

Resume support: The SSE stream supports Last-Event-ID (or ?since= index). The server assigns monotonically increasing ids to log/stage_write messages so the UI can reconnect without duplication.

⸻

5) Environment & config

Admin UI (.env.local):

NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql
OPENAI_API_KEY=sk-...               # passed through to CLI subprocess
OPENAI_MODEL=gpt-5                  # default model for CLI
ORCHESTRATOR_TOKEN=dev-secret       # optional, recommended in prod

Backend (CLI expects):
	•	OPENAI_API_KEY (required)
	•	OPENAI_MODEL (optional; CLI flag overrides)
	•	GraphQL URL passed as --api-base arg from UI

⸻

6) UI control → exact payloads (copy/paste)

Start a small C build (single cell)

await startJob('generate-c', {
  api_base: process.env.NEXT_PUBLIC_GRAPHQL_URL!.replace('/graphql',''),
  rows: '1', cols: '2',
  ufo_propose: true,
  log_json: true
});

Push axioms (A,B,J)

await startJob('push-axioms', {
  api_base: process.env.NEXT_PUBLIC_GRAPHQL_URL!.replace('/graphql',''),
  spec: 'NORMATIVE_Chirality_Framework_14.2.1.1.txt',
  log_json: true
});

Verify C slice

await startJob('verify-stages', {
  api_base: process.env.NEXT_PUBLIC_GRAPHQL_URL!.replace('/graphql',''),
  station: 'Requirements', matrix: 'C'
});

Stream logs:

const es = streamLogs(jobId, (entry) => {
  if (entry.event === 'stage_write') { /* update progress */ }
});


⸻

7) Stage taxonomy (color map suggestion)

Stage	Meaning	Suggested Tag
context_loaded	Context anchored for (i,j)	processing
product:k	A(i,k) × B(k,j)	purple
sum	Reduced combination	blue
interpretation	Human-readable distillation	gold
final_resolved	Committed answer for (i,j)	green
element_wise	J ⊙ C (F build)	purple
axiom	A/B cell seeded	default
axiomatic_truncation	J cell seeded	default
error	Failure at any stage	red

Keep colors consistent across Matrix Explorer, Cell Inspector, Pipeline Console.

⸻

8) Troubleshooting

“invalid choice: ‘semantic-init’”
→ Old code or a stray caller. Valid commands: push-axioms, generate-c, generate-f, generate-d, verify-stages.

No logs in Pipeline Console
	•	Ensure admin UI started from admin-ui/ (so .env.local loads).
	•	Check ORCHESTRATOR_TOKEN in both server and client request headers.
	•	Confirm OPENAI_API_KEY is present (CLI will exit early without it).

Graph shows empty labels
	•	Run push-axioms first (it seeds labels for A/B/J).
	•	Ensure GraphQL gateway resolves axis labels for C/F/D.

Duplicates on reconnect
	•	Use SSE Last-Event-ID support (already implemented in logs endpoint).
	•	The client should not re-append logs older than the last event id it processed.

⸻

9) Ops & security checklist
	•	✅ Require Authorization: Bearer … on /api/orchestrate/* in non-dev.
	•	✅ Rate-limit /run (simple token bucket).
	•	✅ Redact secrets in logs (never print keys).
	•	✅ TTL-clean completed jobs (e.g., 1h) to free memory.
	•	✅ Idempotent writes: rely on deduped:true from GraphQL.

⸻

10) Quick validation flow (fresh dev box)
	1.	Start backend GraphQL + Neo4j (seed Phase-1 as needed).
	2.	cp admin-ui/.env.example admin-ui/.env.local and set values.
	3.	npm run dev in admin-ui.
	4.	Pipeline Console → push-axioms (spec path correct).
	5.	Matrix Explorer → A/B/J show axiom stages.
	6.	Pipeline Console → generate-c for a tiny slice.
	7.	Cell Inspector → see product:k → sum → interpretation → final_resolved.
	8.	Pipeline Console → verify-stages for C.

⸻

11) Appendix: cURL examples

Start a job:

curl -X POST http://localhost:3001/api/orchestrate/run \
  -H "Authorization: Bearer $ORCH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cmd":"generate-c",
    "args":{
      "api_base":"http://localhost:8080",
      "rows":"0..1","cols":"0..2",
      "log_json": true
    }
  }'

Stream logs:

curl -N -H "Accept: text/event-stream" \
  -H "Authorization: Bearer $ORCH_TOKEN" \
  http://localhost:3001/api/orchestrate/logs/<jobId>

Stop:

curl -X POST http://localhost:3001/api/orchestrate/stop \
  -H "Authorization: Bearer $ORCH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"<jobId>"}'

Status:

curl "http://localhost:3001/api/orchestrate/status?jobId=<jobId>&limit=10" \
  -H "Authorization: Bearer $ORCH_TOKEN"


⸻

References (backend contracts)
	•	chirality_prompts.py — stage/system prompts
	•	chirality_graphql.py — pullCell / upsertCellStage
	•	semmul_cf14.py — LLM wrappers (temps, JSON parse, meta)
	•	chirality_cli.py — CLI pipelines (push-axioms, generate-c/f/d, verify-stages)

