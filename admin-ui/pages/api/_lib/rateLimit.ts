// Simple token bucket rate limiter
// Protects orchestrator endpoints from accidental DDoS

const buckets = new Map<string, { tokens: number; ts: number }>();

export function rateLimit(key: string, limit = 10, refillPerSec = 5): boolean {
  const now = Date.now();
  const sec = 1000;
  
  // Get or create bucket
  const bucket = buckets.get(key) ?? { tokens: limit, ts: now };
  
  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.ts) / sec;
  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillPerSec);
  bucket.ts = now;
  
  // Check if we have tokens available
  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return false;
  }
  
  // Consume one token
  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return true;
}

// Clean up old buckets periodically (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.ts < cutoff) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);