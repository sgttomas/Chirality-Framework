import { useEffect, useRef, useState } from 'react';
import { streamLogs } from './orchestratorClient';

export function useJobLogs(jobId?: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setLogs([]);
    setJobInfo(null);
    setProgress({ completed: 0, total: 0 });
    
    const es = streamLogs(
      jobId, 
      (entry) => {
        // Keep list bounded
        setLogs((prev) => {
          const next = prev.length > 5000 ? prev.slice(1) : prev.slice();
          next.push(entry);
          return next;
        });
        
        // Track progress from progress events
        if (entry.event === 'progress' && entry.stage === 'final_resolved') {
          setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        }
      }, 
      () => setConnected(false),
      (hello) => {
        setJobInfo(hello);
        // Calculate expected total from args
        if (hello.args) {
          const rows = Array.isArray(hello.args.rows) ? hello.args.rows.length : 
                      hello.args.rows?.split(',').length || 1;
          const cols = Array.isArray(hello.args.cols) ? hello.args.cols.length : 
                      hello.args.cols?.split(',').length || 1;
          setProgress({ completed: 0, total: rows * cols });
        }
      }
    );
    
    esRef.current = es;
    setConnected(true);
    return () => {
      es.close();
      setConnected(false);
    };
  }, [jobId]);

  return { logs, connected, jobInfo, progress };
}