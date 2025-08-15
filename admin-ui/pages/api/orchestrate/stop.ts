import type { NextApiRequest, NextApiResponse } from 'next';
import jobs, { getJob, pushLog } from '../../../lib/jobsStore';

function requireAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const token = process.env.ORCHESTRATOR_TOKEN;
  if (!token) return true; // auth disabled
  const hdr = req.headers.authorization || '';
  if (hdr !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const jobId = (req.body?.jobId || req.query?.jobId) as string | undefined;
  if (!jobId || typeof jobId !== 'string') return res.status(400).json({ error: 'Missing jobId' });

  const job = getJob(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Already finished?
  if (job.status !== 'running') {
    return res.status(200).json({ ok: true, message: `Job already ${job.status}`, status: job.status });
  }

  try {
    // Try graceful shutdown first
    const ok = job.process.kill('SIGTERM');
    const ts = new Date().toISOString();
    pushLog(jobId, { event: 'job_stop_requested', signal: 'SIGTERM', ts });

    // Fallback to SIGKILL if it won't die in time
    const killTimeout = setTimeout(() => {
      try {
        job.process.kill('SIGKILL');
        pushLog(jobId, { event: 'job_killed', signal: 'SIGKILL', ts: new Date().toISOString() });
      } catch {}
    }, 8000);

    // Wait for exit to finalize status (but don't hold the request open)
    job.process.once('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(killTimeout);
      job.status = 'failed';
      job.exitCode = code ?? null;
      job.endedAt = new Date().toISOString();
      pushLog(jobId, {
        event: 'job_stopped',
        exitCode: code,
        signal,
        ts: job.endedAt,
      });
      // Optionally: jobs.delete(jobId) later via TTL in run.ts
    });

    return res.status(200).json({ ok: true, message: 'Stop signal sent', jobId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to stop job' });
  }
}