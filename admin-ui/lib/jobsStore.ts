// Singleton in-memory job store shared across API routes.
// Replace with Redis or another external store for production.

import type { ChildProcessWithoutNullStreams } from 'child_process';

export type JobStatus = 'running' | 'failed' | 'completed';

export interface Job {
  id: string;
  cmd: string;
  args: Record<string, any>;
  process: ChildProcessWithoutNullStreams;
  logs: any[];
  status: JobStatus;
  exitCode?: number | null;
  startedAt: string;
  endedAt?: string;
  buf?: string; // stdout line buffer
}

// Note: Module-level singleton survives within the same Node process.
// On serverless, prefer Redis; on self-hosted, this is fine.
const jobs = new Map<string, Job>();

export function putJob(job: Job) {
  jobs.set(job.id, job);
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function deleteJob(id: string) {
  jobs.delete(id);
}

export function pushLog(id: string, entry: any, cap = 5000) {
  const job = jobs.get(id);
  if (!job) return;
  if (job.logs.length >= cap) job.logs.shift();
  job.logs.push(entry);
}

export default jobs;