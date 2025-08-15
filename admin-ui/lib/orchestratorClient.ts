// Thin client for /api/orchestrate/* endpoints.
// Keeps PipelineConsole/MatrixExplorer/CellInspector lean.

export type OrchestratorCmd =
  | 'push-axioms'
  | 'generate-c'
  | 'generate-f'
  | 'generate-d'
  | 'verify-stages';

export type StartArgs = {
  api_base: string;
  model?: string;
  rows?: string | number[];     // "0..3" | "0,2" | [0,2,3]
  cols?: string | number[];
  // push-axioms only:
  spec?: string;
  // verify-stages only:
  station?: string;
  matrix?: 'A' | 'B' | 'J' | 'C' | 'F' | 'D';
  // flags:
  ufo_propose?: boolean;
  dry_run?: boolean;
  stop_on_error?: boolean;
  log_json?: boolean;
};

export type StartResponse = { jobId: string };

export type JobStatus = 'running' | 'failed' | 'completed';

export type StatusResponse = {
  id: string;
  cmd: OrchestratorCmd;
  args: Record<string, any>;
  status: JobStatus;
  exitCode: number | null;
  startedAt: string;
  endedAt?: string;
  logs?: any[];
};

const authHeader = () =>
  process.env.NEXT_PUBLIC_ORCH_TOKEN
    ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ORCH_TOKEN}` }
    : {};

// --- start job ---------------------------------------------------------------
export async function startJob(cmd: OrchestratorCmd, args: StartArgs): Promise<StartResponse> {
  const res = await fetch('/api/orchestrate/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ cmd, args }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`run failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// --- stop job ---------------------------------------------------------------
export async function stopJob(jobId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch('/api/orchestrate/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`stop failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// --- get status --------------------------------------------------------------
export async function getStatus(jobId: string, limit = 0): Promise<StatusResponse> {
  const url = new URL('/api/orchestrate/status', window.location.origin);
  url.searchParams.set('jobId', jobId);
  if (limit) url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), { headers: { ...authHeader() } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`status failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// --- get metrics -------------------------------------------------------------
export async function getMetrics(): Promise<any> {
  const res = await fetch('/api/orchestrate/metrics', { headers: { ...authHeader() } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`metrics failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// --- stream logs (SSE) -------------------------------------------------------
export type LogHandler = (entry: any) => void;

export function streamLogs(
  jobId: string, 
  onLog: LogHandler, 
  onEnd?: () => void,
  onHello?: (data: any) => void
): EventSource {
  // Note: Next API route already sets correct SSE headers.
  const es = new EventSource(`/api/orchestrate/logs/${encodeURIComponent(jobId)}`);
  
  // Handle different event types
  es.addEventListener('hello', (e: MessageEvent) => {
    try { 
      const data = JSON.parse(e.data);
      onHello?.(data); 
    } catch {}
  });
  
  es.addEventListener('log', (e: MessageEvent) => {
    try { onLog(JSON.parse(e.data)); }
    catch { onLog({ event: 'output', message: e.data, ts: new Date().toISOString() }); }
  });
  
  es.addEventListener('job_complete', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onLog({ event: 'job_complete', ...data });
    } catch {}
    es.close();
    onEnd?.();
  });
  
  es.addEventListener('job_gone', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onLog({ event: 'job_gone', ...data });
    } catch {}
    es.close();
    onEnd?.();
  });
  
  es.onerror = () => {
    // Most browsers auto-retry SSE; we close to let caller decide.
    es.close();
    onEnd?.();
  };
  
  return es;
}

// --- small helpers -----------------------------------------------------------

// Normalize rows/cols values to the CLI's string form (e.g., [0,1,2] -> "0,1,2")
export function normalizeSlice(v?: string | number[]): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.join(',');
  return String(v);
}

// Build a standard args object safely
export function buildArgs(base: StartArgs): StartArgs {
  return {
    ...base,
    rows: normalizeSlice(base.rows),
    cols: normalizeSlice(base.cols),
  };
}