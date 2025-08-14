import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}

export async function GET() {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}