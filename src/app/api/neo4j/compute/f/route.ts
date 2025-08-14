import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

const semMul = (a: string, b: string) => {
  const A = String(a).toLowerCase().split(/\s+/)
  const B = String(b).toLowerCase().split(/\s+/)
  const inter = A.find(t => B.includes(t))
  return inter ?? `${A[0]}-${B[0]}`
}

async function loadMatrixById(tx: any, id: string) {
  const r = await tx.run(
    `MATCH (c:Component {id:$id})
     OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
     RETURN c, collect(cell) AS cells`,
    { id }
  )
  if (!r.records.length) throw new Error(`Component not found: ${id}`)
  const c = r.records[0].get('c')
  const cells = r.records[0].get('cells') || []
  const dims = c.properties.dimensions || c.properties.shape || [0, 0]
  const rows = Number(dims?.[0] || 0)
  const cols = Number(dims?.[1] || 0)
  const data: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
  for (const cell of cells) {
    if (!cell) continue
    const r1 = (cell.properties.row ?? 0) - 1
    const c1 = (cell.properties.col ?? 0) - 1
    if (r1 >= 0 && r1 < rows && c1 >= 0 && c1 < cols) data[r1][c1] = cell.properties.resolved || ''
  }
  return { rows, cols, data }
}

export async function POST(req: NextRequest) {
  const session = neo4jDriver.session({ database: 'neo4j' })
  try {
    const payload = await req.json().catch(() => ({}))
    // Defaults aligned to your DB ids
    const idC: string = payload?.idC ?? 'C'
    const idB: string = payload?.idB ?? 'B'

    const { C, B } = await session.executeRead(async tx => {
      const C = await loadMatrixById(tx, idC)
      const B = await loadMatrixById(tx, idB)
      return { C, B }
    })

    // J is first 3 rows of B (3x4)
    const J = B.data.slice(0, 3)
    const Cmat = C.data
    if (!J.length || !Cmat.length) throw new Error('Empty J or C data')
    if (J.length !== Cmat.length || (J[0]?.length || 0) !== (Cmat[0]?.length || 0)) {
      return NextResponse.json(
        {
          success: false,
          error: `Shape mismatch: J ${J.length}x${J[0]?.length || 0} vs C ${Cmat.length}x${Cmat[0]?.length || 0}`
        },
        { status: 400 }
      )
    }

    const F: string[][] = J.map((row, i) => row.map((val, j) => semMul(val, Cmat[i][j])))

    // Prepare batched cells for UNWIND (1-based indices)
    const cells = [] as { row: number; col: number; resolved: string }[]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        cells.push({ row: i + 1, col: j + 1, resolved: F[i][j] })
      }
    }

    await session.executeWrite(async tx => {
      // Upsert F component
      await tx.run(
        `MERGE (c:Component {id:$id})
         SET c.name=$name, c.kind='matrix', c.station=$station,
             c.dimensions=$dimensions, c.shape=$dimensions,
             c.row_names=$row_names, c.column_names=$column_names,
             c.operation_type='elementwise', c.ontology_id='cf14.core.v2.1.1'
         WITH c
         OPTIONAL MATCH (c)-[:HAS_CELL]->(old:Cell) DETACH DELETE old`,
        {
          id: 'F',
          name: 'Matrix F (Objectives)',
          station: 3,
          dimensions: [3, 4],
          row_names: ['Normative', 'Operative', 'Evaluative'],
          column_names: ['Necessity', 'Sufficiency', 'Completeness', 'Consistency']
        }
      )

      // Batch write cells + terms
      await tx.run(
        `UNWIND $cells AS cell
         MATCH (c:Component {id:'F'})
         MERGE (x:Cell {component_id:'F', row:cell.row, col:cell.col})
         SET   x.resolved = cell.resolved,
               x.raw_terms = [],
               x.operation = '⊙',
               x.semantic_derivation = ''
         MERGE (c)-[:HAS_CELL]->(x)
         FOREACH (_ IN CASE WHEN cell.resolved IS NOT NULL AND trim(cell.resolved) <> '' THEN [1] ELSE [] END |
           MERGE (t:Term {value: cell.resolved})
           MERGE (x)-[:RESOLVES_TO]->(t)
         )`,
        { cells }
      )

      // Link to Station 3 by id or name if present
      await tx.run(
        `MATCH (c:Component {id:'F'})
         OPTIONAL MATCH (sId:Station {id: 3})
         OPTIONAL MATCH (sName:Station {name: 'Objectives'})
         WITH c, coalesce(sId, sName) AS s
         FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
           MERGE (c)-[:AT_STATION]->(s)
         )`
      )
    })

    return NextResponse.json({ success: true, component_id: 'F', dimensions: [3, 4] })
  } catch (e: any) {
    console.error('Matrix F computation error:', e)
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  } finally {
    await session.close()
  }
}