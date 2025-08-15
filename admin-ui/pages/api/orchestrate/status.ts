import type { NextApiRequest, NextApiResponse } from 'next';
import { getJob } from '../../../lib/jobsStore';

// CORS helper
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res);
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const jobId = req.query.jobId as string | undefined;
  if (!jobId || typeof jobId !== 'string') return res.status(400).json({ error: 'Missing jobId' });

  const job = getJob(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { id, cmd, args, status, exitCode, startedAt, endedAt, logs } = job;

  // Optional: return only the last N logs
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;
  const trimmedLogs = limit > 0 && Array.isArray(logs) ? logs.slice(-limit) : undefined;

  return res.status(200).json({
    id,
    cmd,
    args,
    status,
    exitCode,
    startedAt,
    endedAt,
    ...(trimmedLogs ? { logs: trimmedLogs } : {}),
  });
}