import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME!,
    process.env.NEO4J_PASSWORD!
  )
);

export async function POST(request: NextRequest) {
  const session = driver.session();
  
  try {
    const body = await request.json();
    const { component_id, delete_type } = body;
    
    if (delete_type === 'component_and_related') {
      // Delete a component and all its related nodes (cells, terms, axes)
      const result = await session.run(`
        MATCH (c:Component {id: $componentId})
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:CONTAINS_TERM|RESOLVES_TO]->(term:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        
        WITH c, collect(DISTINCT cell) as cells, collect(DISTINCT term) as terms, collect(DISTINCT axis) as axes
        
        FOREACH (term IN terms | DELETE term)
        FOREACH (cell IN cells | DELETE cell)
        FOREACH (axis IN axes | DELETE axis)
        DELETE c
        
        RETURN count(c) as deleted_components
      `, { componentId: component_id });

      const deletedCount = result.records[0]?.get('deleted_components') || 0;
      
      return NextResponse.json({
        success: true,
        message: `Deleted component ${component_id} and all related nodes`,
        deleted_components: deletedCount
      });
    }
    
    if (delete_type === 'delete_all_at_station') {
      // Delete all components at a specific station - more thorough approach
      const { station } = body;
      
      // Step 1: Delete all relationships and related nodes
      await session.run(`
        MATCH (c:Component)-[:AT_STATION]->(s:Station {name: $station})
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)-[r1:CONTAINS_TERM|RESOLVES_TO]->(term:Term)
        OPTIONAL MATCH (c)-[r2:HAS_CELL]->(cell)
        OPTIONAL MATCH (c)-[r3:HAS_AXIS]->(axis:Axis)
        OPTIONAL MATCH (c)-[r4:AT_STATION]->(s)
        DELETE r1, r2, r3, r4, term, cell, axis
      `, { station });
      
      // Step 2: Delete the components themselves
      const result = await session.run(`
        MATCH (c:Component)-[:AT_STATION]->(s:Station {name: $station})
        DELETE c
        RETURN count(c) as deleted_components
      `, { station });

      const deletedCount = result.records[0]?.get('deleted_components') || 0;
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} components at station: ${station}`,
        deleted_components: deletedCount
      });
    }

    if (delete_type === 'list_components') {
      // List all components to see what's in the database
      const result = await session.run(`
        MATCH (c:Component)
        OPTIONAL MATCH (c)-[:AT_STATION]->(s:Station)
        RETURN c.id as id, c.name as name, c.kind as kind, c.station as station, 
               s.name as station_name, c.shape as shape
        ORDER BY c.id
      `);

      const components = result.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        kind: record.get('kind'),
        station: record.get('station'),
        station_name: record.get('station_name'),
        shape: record.get('shape')
      }));

      return NextResponse.json({
        success: true,
        components: components
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid delete_type. Use "component_and_related" or "list_components"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Neo4j delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete from Neo4j' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}