import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

export async function POST(req: NextRequest) {
  const { component } = await req.json()
  if (!component?.id) return NextResponse.json({ error: 'missing component.id' }, { status: 400 })

  const session = neo4jDriver.session()
  try {
    await session.executeWrite(async tx => {
      await tx.run(
        `MERGE (c:Component {id:$id})
         SET c.name=$name, c.kind=$kind, c.station=$station, c.dimensions=$dimensions,
             c.row_names=$row_names, c.column_names=$column_names,
             c.operation_type=$operation_type, c.ontology_id=$ontology_id, c.metadata=$metadata`,
        component
      )

      if (Array.isArray(component.cells)) {
        for (const cell of component.cells) {
          await tx.run(
            `MATCH (c:Component {id:$cid})
             MERGE (cell:Cell {component_id:$cid, row:$row, col:$col})
             SET cell.resolved=$resolved, cell.raw_terms=$raw_terms,
                 cell.operation=$operation, cell.semantic_derivation=$semantic_derivation
             MERGE (c)-[:HAS_CELL]->(cell)`,
            { cid: component.id, ...cell }
          )
        }
      }

      await tx.run(
        `MATCH (c:Component {id:$cid})
         MATCH (s:Station {id:$station})
         MERGE (c)-[:AT_STATION]->(s)`,
        { cid: component.id, station: component.station }
      )
    })

    return NextResponse.json({ ok: true, component_id: component.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  } finally {
    await session.close()
  }
}