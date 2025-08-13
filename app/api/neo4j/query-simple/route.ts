import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

export async function GET(req: NextRequest) {
  const station = req.nextUrl.searchParams.get('station')
  const session = neo4jDriver.session()
  try {
    const result = await session.executeRead(async tx => {
      const cypher = station
        ? `MATCH (c:Component)-[:AT_STATION]->(s:Station {id:toInteger($station)})
           RETURN c { .id, .name, .kind, .station, .dimensions, .operation_type, .ontology_id } AS component
           ORDER BY c.station, c.name`
        : `MATCH (c:Component)-[:AT_STATION]->(s:Station)
           RETURN c { .id, .name, .kind, .station, .dimensions, .operation_type, .ontology_id } AS component
           ORDER BY c.station, c.name`
      const res = await tx.run(cypher, { station })
      return res.records.map(r => r.get('component'))
    })
    return NextResponse.json({ components: result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  } finally {
    await session.close()
  }
}