import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import jobs, { putJob, pushLog, Job } from '../../../lib/jobsStore';
import { rateLimit } from '../_lib/rateLimit';

// --- helpers -----------------------------------------------------------------

function requireAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const token = process.env.ORCHESTRATOR_TOKEN;
  if (!token) return true; // disabled
  const hdr = req.headers.authorization || '';
  if (hdr !== `Bearer ${token}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

const ALLOWED_CMDS = new Set(['push-axioms', 'generate-c', 'generate-f', 'generate-d', 'verify-stages']);
const STATIONS = new Set(['Problem Statement', 'Decisions', 'Truncated Decisions', 'Requirements', 'Objectives', 'Solution Objectives']);
const MATRICES = new Set(['A','B','J','C','F','D']);

function validateArgs(cmd: string, args: any): string | null {
  if (!ALLOWED_CMDS.has(cmd)) return 'Invalid command';
  if (!args || typeof args !== 'object') return 'Missing args';
  // api_base required for all except pure local dry-runs
  if (!args.api_base || typeof args.api_base !== 'string') return 'Missing args.api_base';
  // rows/cols like "0..3" or "0,2" or arrays of ints
  const rangeRe = /^(\d+\.\.\d+|\d+(?:,\d+)*)$/;
  const checkList = (v: any) =>
    Array.isArray(v) ? v.every((n) => Number.isInteger(n) && n >= 0) : typeof v === 'string' ? rangeRe.test(v) : v == null;
  if (!checkList(args.rows)) return 'Bad rows format';
  if (!checkList(args.cols)) return 'Bad cols format';
  if (cmd === 'push-axioms') {
    if (!args.spec || typeof args.spec !== 'string') return 'Missing args.spec';
    // lock spec file to repo root or a /specs dir
    const allowedDir = path.join(process.cwd(), '..');
    const resolved = path.resolve(allowedDir, args.spec);
    if (!resolved.startsWith(allowedDir)) return 'spec path not allowed';
  }
  if (cmd === 'verify-stages') {
    if (args.station && !STATIONS.has(args.station)) return 'Invalid station';
    if (args.matrix && !MATRICES.has(args.matrix)) return 'Invalid matrix';
  }
  return null;
}

function buildArgv(cmd: string, args: any): string[] {
  const cliPath = path.join(process.cwd(), '..', 'chirality_cli.py');
  const argv = ['python3', cliPath, cmd, '--api-base', args.api_base];
  const add = (k: string, v: any) => { argv.push(k, String(v)); };
  if (args.model) add('--model', args.model);
  if (args.spec && cmd === 'push-axioms') add('--spec', args.spec);
  if (args.rows != null) add('--rows', Array.isArray(args.rows) ? args.rows.join(',') : args.rows);
  if (args.cols != null) add('--cols', Array.isArray(args.cols) ? args.cols.join(',') : args.cols);
  if (args.station && cmd === 'verify-stages') add('--station', args.station);
  if (args.matrix && cmd === 'verify-stages') add('--matrix', args.matrix);
  // flags
  if (args.ufo_propose) argv.push('--ufo-propose');
  if (args.dry_run) argv.push('--dry-run');
  if (args.stop_on_error) argv.push('--stop-on-error');
  if (args.log_json) argv.push('--log-json');
  return argv;
}

// --- handler -----------------------------------------------------------------

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  // Rate limiting: 5 requests per minute with 2/sec refill
  const clientKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'local';
  if (!rateLimit(`run:${clientKey}`, 5, 2)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 5 runs per minute.' });
  }

  const { cmd, args } = req.body || {};
  const err = validateArgs(cmd, args);
  if (err) return res.status(400).json({ error: err });

  const jobId = uuidv4();
  const argv = buildArgv(cmd, args);

  // Normalize args for logging and deduplication
  const normalized = {
    ...args,
    rows: Array.isArray(args.rows) ? args.rows.join(',') : args.rows,
    cols: Array.isArray(args.cols) ? args.cols.join(',') : args.cols,
  };

  // Spawn from repo root (parent of admin-ui)
  const cwd = path.join(process.cwd(), '..');

  const proc = spawn(argv[0], argv.slice(1), {
    cwd,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      // Ensure backend sees the model & API key if set here
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_MODEL: process.env.OPENAI_MODEL || '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  const job: Job = {
    id: jobId,
    cmd,
    args: normalized,
    process: proc,
    logs: [],
    status: 'running',
    startedAt: new Date().toISOString(),
    buf: '',
  };
  putJob(job);

  // Log the effective run parameters for debugging and deduplication
  pushLog(jobId, { 
    event: 'run_start', 
    cmd, 
    args: normalized, 
    argv: argv.slice(2), // CLI args without python/script
    timestamp: new Date().toISOString() 
  });

  proc.stdout.on('data', (chunk: Buffer) => {
    // robust line buffering
    job.buf += chunk.toString('utf8');
    let idx: number;
    while ((idx = job.buf.indexOf('\n')) >= 0) {
      const line = job.buf.slice(0, idx);
      job.buf = job.buf.slice(idx + 1);
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        pushLog(jobId, parsed);
        
        // Emit progress signals for stage_write events
        if (parsed.event === 'stage_write') {
          pushLog(jobId, {
            event: 'progress',
            station: parsed.station,
            matrix: parsed.matrix,
            row: parsed.i,
            col: parsed.j,
            stage: parsed.stage,
            timestamp: new Date().toISOString()
          });
        }
      } catch {
        pushLog(jobId, { event: 'output', message: trimmed, timestamp: new Date().toISOString() });
      }
    }
  });

  proc.stderr.on('data', (data: Buffer) => {
    pushLog(jobId, { event: 'error', message: data.toString(), timestamp: new Date().toISOString() });
  });

  proc.on('exit', (code) => {
    const j = jobs.get(jobId);
    if (j) {
      j.status = code === 0 ? 'completed' : 'failed';
      j.exitCode = code ?? null;
      j.endedAt = new Date().toISOString();
      pushLog(jobId, { event: j.status === 'completed' ? 'job_complete' : 'job_error', exitCode: code, timestamp: j.endedAt });
      // optional TTL cleanup later
      setTimeout(() => { jobs.delete(jobId); }, 60 * 60 * 1000); // 1h
    }
  });

  // return job id immediately
  res.status(200).json({ jobId });
}