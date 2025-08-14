import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

export async function POST(request: NextRequest) {
  const session = neo4jDriver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' })
  try {
    const { scope = 'cf14', recreateStations = true } = await request.json().catch(() => ({ scope: 'cf14' }))
    let deletedCount = 0

    await session.executeWrite(async tx => {
      if (scope === 'cf14') {
        const countRes = await tx.run('MATCH (n) WHERE n:Component OR n:Cell OR n:Axis OR n:Term RETURN count(n) AS deleted')
        deletedCount = countRes.records[0]?.get('deleted')?.toNumber() || 0
        await tx.run('MATCH (n) WHERE n:Component OR n:Cell OR n:Axis OR n:Term DETACH DELETE n')
        console.log(`[Clean Setup] CF14 scope: deleted ${deletedCount} CF14 nodes`)
      } else if (scope === 'all') {
        const countRes = await tx.run('MATCH (n) RETURN count(n) AS deleted')
        deletedCount = countRes.records[0]?.get('deleted')?.toNumber() || 0
        await tx.run('MATCH (n) DETACH DELETE n')
        console.log(`[Clean Setup] ALL scope: deleted ${deletedCount} nodes`)
      }
    })

    await session.executeWrite(async tx => {
      await tx.run('CREATE CONSTRAINT component_id IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE')
      await tx.run('CREATE CONSTRAINT term_value IF NOT EXISTS FOR (t:Term) REQUIRE t.value IS UNIQUE')
      await tx.run('CREATE CONSTRAINT axis_key IF NOT EXISTS FOR (a:Axis) REQUIRE (a.component_id, a.position) IS UNIQUE')
    })

    if (scope !== 'cf14' || recreateStations) {
      await session.executeWrite(async tx => {
        await tx.run(`
          UNWIND [
            {id:1,name:'Problem Statement'},{id:2,name:'Requirements'},{id:3,name:'Objectives'},
            {id:4,name:'Verification'},{id:5,name:'Validation'},{id:6,name:'Evaluation'},
            {id:7,name:'Assessment'},{id:8,name:'Implementation'},{id:9,name:'Reflection'},
            {id:10,name:'Resolution'}
          ] AS s
          MERGE (st:Station {id:s.id})
          SET st.name = s.name
        `)
        await tx.run(`
          MATCH (a:Station),(b:Station)
          WHERE b.id = a.id + 1
          MERGE (a)-[:NEXT]->(b)
        `)
      })
      console.log('[Clean Setup] Stations recreated with NEXT links')
    }

    console.log(`[Clean Setup] Success: scope=${scope}, deleted=${deletedCount}, recreateStations=${recreateStations}`)
    return NextResponse.json({ success: true, scope, deletedCount, recreateStations })
  } catch (e: any) {
    console.error('clean-setup error:', e)
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  } finally {
    await session.close()
  }
}