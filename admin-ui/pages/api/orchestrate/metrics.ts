import type { NextApiRequest, NextApiResponse } from 'next';
import jobs from '../../../lib/jobsStore';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  let running = 0;
  let failed = 0; 
  let completed = 0;
  let totalLogs = 0;
  let avgLatency = 0;
  let totalLatency = 0;
  let jobsWithLatency = 0;

  // Aggregate metrics from all jobs
  for (const job of jobs.values()) {
    if (job.status === 'running') running++;
    else if (job.status === 'failed') failed++;
    else if (job.status === 'completed') completed++;
    
    totalLogs += job.logs?.length || 0;
    
    // Calculate average job duration for completed jobs
    if (job.endedAt && job.startedAt) {
      const duration = new Date(job.endedAt).getTime() - new Date(job.startedAt).getTime();
      totalLatency += duration;
      jobsWithLatency++;
    }
  }
  
  avgLatency = jobsWithLatency > 0 ? Math.round(totalLatency / jobsWithLatency) : 0;
  const total = running + failed + completed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.status(200).json({ 
    jobs: {
      running, 
      failed, 
      completed, 
      total,
      successRate
    },
    logs: {
      total: totalLogs,
      avgPerJob: total > 0 ? Math.round(totalLogs / total) : 0
    },
    performance: {
      avgJobDurationMs: avgLatency,
      avgJobDurationSec: Math.round(avgLatency / 1000)
    },
    timestamp: new Date().toISOString()
  });
}