import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// In-memory job store (use Redis in production)
const jobs = new Map<string, any>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cmd, args } = req.body;
  
  // Validate command
  const allowedCommands = ['push-axioms', 'generate-c', 'generate-f', 'generate-d', 'verify-stages'];
  if (!allowedCommands.includes(cmd)) {
    return res.status(400).json({ error: 'Invalid command' });
  }

  const jobId = uuidv4();
  
  // Build CLI arguments safely
  const cliPath = path.join(process.cwd(), '..', 'chirality_cli.py');
  const argv = ['python3', cliPath, cmd];
  
  // Add API base
  argv.push('--api-base', args.api_base || 'http://localhost:8080');
  
  // Add other arguments
  if (args.model) argv.push('--model', args.model);
  if (args.spec) argv.push('--spec', args.spec);
  if (args.rows) argv.push('--rows', args.rows);
  if (args.cols) argv.push('--cols', args.cols);
  if (args.station) argv.push('--station', args.station);
  if (args.matrix) argv.push('--matrix', args.matrix);
  
  // Add boolean flags
  if (args.ufo_propose) argv.push('--ufo-propose');
  if (args.dry_run) argv.push('--dry-run');
  if (args.stop_on_error) argv.push('--stop-on-error');
  if (args.log_json) argv.push('--log-json');
  
  // Spawn the process
  const proc = spawn(argv[0], argv.slice(1), {
    cwd: path.join(process.cwd(), '..'),
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  });
  
  // Store job info
  jobs.set(jobId, {
    id: jobId,
    cmd,
    args,
    process: proc,
    logs: [],
    status: 'running',
    startedAt: new Date().toISOString(),
  });
  
  // Capture output
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    const job = jobs.get(jobId);
    
    lines.forEach((line: string) => {
      // Try to parse as JSON log
      try {
        const parsed = JSON.parse(line);
        job.logs.push(parsed);
      } catch {
        // Plain text log
        job.logs.push({ 
          event: 'output', 
          message: line,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });
  
  proc.stderr.on('data', (data) => {
    const job = jobs.get(jobId);
    job.logs.push({ 
      event: 'error', 
      message: data.toString(),
      timestamp: new Date().toISOString(),
    });
  });
  
  proc.on('exit', (code) => {
    const job = jobs.get(jobId);
    job.status = code === 0 ? 'completed' : 'failed';
    job.exitCode = code;
    job.endedAt = new Date().toISOString();
    job.logs.push({ 
      event: code === 0 ? 'job_complete' : 'job_error',
      exitCode: code,
      timestamp: new Date().toISOString(),
    });
  });
  
  res.status(200).json({ jobId });
}