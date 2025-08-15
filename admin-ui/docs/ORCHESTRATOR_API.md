# Chirality Admin – Orchestrator API

This API lets the admin UI start, monitor, stream logs for, and stop backend CLI jobs (chirality_cli.py).

All endpoints live under:
```
/api/orchestrate/
```

---

## 🔐 Authentication

Set `ORCHESTRATOR_TOKEN` in `.env.local` (UI) and backend env.
Requests must include:
```
Authorization: Bearer <ORCHESTRATOR_TOKEN>
```

If `ORCHESTRATOR_TOKEN` is unset, auth is disabled.

---

## 📜 Endpoints

### 1. Start a job

**POST** `/api/orchestrate/run`

Starts a chirality_cli.py job.

**Body:**
```json
{
  "cmd": "generate-c",
  "args": {
    "api_base": "http://localhost:8000",
    "model": "gpt-4o-mini",
    "rows": "0..2",
    "cols": "0..2",
    "ufo_propose": true,
    "dry_run": false
  }
}
```

**Allowed cmd values:**
- `push-axioms`
- `generate-c`
- `generate-f`
- `generate-d`
- `verify-stages`

**Notes:**
- Strict arg validation for rows, cols, station, matrix, and safe spec paths.
- Returns immediately with jobId.

**Response:**
```json
{ "jobId": "uuid-v4" }
```

---

### 2. Stream job logs (SSE)

**GET** `/api/orchestrate/logs/{jobId}`

Server-Sent Events stream.
Each `data:` message is a JSON log object.

**Example client:**
```javascript
const es = new EventSource(`/api/orchestrate/logs/${jobId}`);
es.onmessage = (e) => {
  const entry = JSON.parse(e.data);
  console.log('Log:', entry);
};
```

---

### 3. Get job status

**GET** `/api/orchestrate/status?jobId={id}&limit=10`

Poll job state and optionally get the last N logs.

**Response:**
```json
{
  "id": "af0c0dbe-...",
  "cmd": "generate-c",
  "args": { "rows": "0..1", "cols": "0..1" },
  "status": "running",
  "exitCode": null,
  "startedAt": "2025-08-14T05:22:03.102Z",
  "logs": [
    { "event": "stage_write", "matrix": "C", "cell": "0,0", ... }
  ]
}
```

---

### 4. Stop a job

**POST** `/api/orchestrate/stop`

Cancels a running job with SIGTERM (falls back to SIGKILL after 8s if needed).

**Body:**
```json
{ "jobId": "af0c0dbe-..." }
```

**Response:**
```json
{ "ok": true, "message": "Stop signal sent", "jobId": "af0c0dbe-..." }
```

**Log entries added:**
- `job_stop_requested`
- `job_stopped` (or `job_killed`)

---

### 5. Get system metrics

**GET** `/api/orchestrate/metrics`

Returns aggregate statistics across all jobs.

**Response:**
```json
{
  "jobs": {
    "running": 2,
    "failed": 1,
    "completed": 15,
    "total": 18,
    "successRate": 83
  },
  "logs": {
    "total": 1247,
    "avgPerJob": 69
  },
  "performance": {
    "avgJobDurationMs": 45230,
    "avgJobDurationSec": 45
  },
  "timestamp": "2025-08-15T10:30:45.123Z"
}
```

---

## 🔄 Typical Flow in PipelineConsole.tsx

1. **Start job** → POST `/run` → get jobId.
2. **Stream logs** → connect to `/logs/{jobId}` for real-time updates with named events.
3. **Poll status** (optional) → `/status?jobId=...&limit=10` for dashboard refreshes.
4. **Poll metrics** → `/metrics` for system-wide statistics.
5. **Stop job** → `/stop` to cancel.

---

## 🛠 Implementation Notes

- All jobs are tracked in a shared in-memory store (`lib/jobsStore.ts`).
- Logs are kept in memory (capped at 5,000 entries per job).
- For production or serverless, replace the store with Redis or a DB.
- SSE keeps the connection open; send `: keep-alive` every 15s.
- Jobs are TTL-cleaned 1h after completion.

---

## 🎯 Client Library Usage

Import the orchestrator client for clean API calls:

```typescript
import { startJob, stopJob, getStatus, getMetrics, buildArgs } from '../lib/orchestratorClient';
import { useJobLogs } from '../lib/useJobLogs';

// Start a job
const { jobId } = await startJob('generate-c', buildArgs({
  api_base: 'http://localhost:8080',
  rows: [0,1,2],
  cols: '0..3',
  ufo_propose: true,
  log_json: true,
}));

// Stream logs with React hook (now includes progress tracking)
const { logs, connected, jobInfo, progress } = useJobLogs(jobId);

// Progress bar: {progress.completed} / {progress.total} cells

// Stop a job
await stopJob(jobId);

// Poll status
const status = await getStatus(jobId, 10);

// Get system metrics
const metrics = await getMetrics();
```

## 🚀 New Features

### Named SSE Events
- **hello**: Initial job metadata with resume capability
- **log**: Individual log entries with sequential IDs
- **job_complete**: Final status when job finishes
- **job_gone**: Notification when job is cleaned up
- **progress**: Real-time progress signals for UX

### Resume from Disconnect
SSE streams support resuming from the last event:
```typescript
// Browser automatically sends Last-Event-ID header on reconnect
// Or manually specify: /logs/{jobId}?since=123
```

### Rate Limiting
- **Default**: 5 requests per minute, refills at 2/second
- **429 Response**: Clear error message with retry guidance
- **Per-client**: Based on IP address or X-Forwarded-For

### Progress Tracking
- **Automatic**: Calculates expected cells from rows × cols
- **Real-time**: Updates as stages complete
- **Visual**: Ready for progress bars and completion indicators

---

## 🚀 Production Considerations

### Security
- Set `ORCHESTRATOR_TOKEN` to a strong random value
- Rate limit the `/run` endpoint
- Validate all file paths and arguments

### Scaling
- Replace in-memory store with Redis
- Use Redis pub/sub for log streaming
- Consider process limits and resource monitoring

### Monitoring
- Log all job starts/stops for audit trails
- Monitor job durations and failure rates
- Set up alerting for stuck or long-running jobs

---

## 📁 File Structure

```
admin-ui/
├── lib/
│   ├── jobsStore.ts              # Shared job store
│   ├── orchestratorClient.ts     # Typed API client
│   └── useJobLogs.ts            # React hook for SSE logs
├── pages/api/orchestrate/
│   ├── run.ts                   # Start jobs
│   ├── stop.ts                  # Cancel jobs  
│   ├── status.ts                # Poll job status
│   └── logs/[jobId].ts          # SSE log stream
└── docs/
    └── ORCHESTRATOR_API.md      # This documentation
```

---

## 🧪 Testing

### Basic Smoke Test
```bash
# Start a simple job
curl -X POST http://localhost:3001/api/orchestrate/run \
  -H "Content-Type: application/json" \
  -d '{"cmd":"generate-c","args":{"api_base":"http://localhost:8080","rows":"0","cols":"0","dry_run":true}}'

# Check status
curl "http://localhost:3001/api/orchestrate/status?jobId=YOUR_JOB_ID"

# Stop if needed
curl -X POST http://localhost:3001/api/orchestrate/stop \
  -H "Content-Type: application/json" \
  -d '{"jobId":"YOUR_JOB_ID"}'
```

### With Authentication
Add header to all requests:
```bash
-H "Authorization: Bearer YOUR_ORCHESTRATOR_TOKEN"
```

This orchestration API provides complete control over your Chirality Framework pipeline while maintaining semantic fidelity and operational safety.