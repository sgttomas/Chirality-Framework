export async function GET() {
  return Response.json({
    ok: true,
    service: 'next-js-frontend',
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime())
  });
}