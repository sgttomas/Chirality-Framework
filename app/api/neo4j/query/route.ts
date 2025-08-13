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
    const { query_type, component_id, station } = body;
    
    if (query_type === 'get_matrix_by_id') {
      // Query to get a specific matrix component by ID
      const result = await session.run(`
        MATCH (c:Component {id: $componentId})
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:CONTAINS_TERM]->(term:Term)
        OPTIONAL MATCH (cell)-[:RESOLVES_TO]->(resolved:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        RETURN c, 
               collect({
                 cell: cell,
                 row: cell.row,
                 col: cell.col,
                 resolved: resolved.value,
                 operation: cell.operation,
                 notes: cell.notes,
                 terms: collect(term.value)
               }) as cells,
               collect({
                 axis: axis,
                 name: axis.name,
                 position: axis.position,
                 labels: axis.labels
               }) as axes
      `, { componentId: component_id });

      if (result.records.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Component not found' },
          { status: 404 }
        );
      }

      const record = result.records[0];
      const component = record.get('c').properties;
      const cells = record.get('cells');
      const axes = record.get('axes');

      // Reconstruct matrix structure
      const shape = component.shape;
      const rows = shape[0];
      const cols = shape[1];
      
      // Sort axes by position
      const sortedAxes = axes.sort((a: any, b: any) => a.axis.properties.position - b.axis.properties.position);
      
      // Create matrix grid
      const matrix_data: any[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
      
      cells.forEach((cellData: any) => {
        if (cellData.cell) {
          const row = cellData.row;
          const col = cellData.col;
          if (row < rows && col < cols) {
            matrix_data[row][col] = {
              resolved: cellData.resolved || '',
              raw_terms: cellData.terms || [],
              operation: cellData.operation || '',
              notes: cellData.notes || ''
            };
          }
        }
      });

      return NextResponse.json({
        success: true,
        component: {
          id: component.id,
          name: component.name,
          kind: component.kind,
          station: component.station,
          shape: shape,
          axes: sortedAxes.map((a: any) => ({
            name: a.name,
            labels: a.labels
          })),
          data: matrix_data
        }
      });
    }
    
    if (query_type === 'get_latest_matrix_by_station') {
      // Query to get the most recent matrix at a specific station
      const result = await session.run(`
        MATCH (c:Component)-[:AT_STATION]->(s:Station {name: $station})
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:RESOLVES_TO]->(resolved:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        WITH c, 
             collect({
               cell: cell,
               row: cell.row,
               col: cell.col,
               resolved: resolved.value,
               operation: cell.operation,
               notes: cell.notes
             }) as cells,
             collect({
               axis: axis,
               name: axis.name,
               position: axis.position,
               labels: axis.labels
             }) as axes
        ORDER BY c.id DESC
        LIMIT 1
        RETURN c, cells, axes
      `, { station });

      if (result.records.length === 0) {
        return NextResponse.json(
          { success: false, error: `No matrix found at station: ${station}` },
          { status: 404 }
        );
      }

      const record = result.records[0];
      const component = record.get('c').properties;
      const cells = record.get('cells');
      const axes = record.get('axes');

      // Reconstruct matrix structure (same logic as above)
      const shape = component.shape;
      const rows = shape[0];
      const cols = shape[1];
      
      const sortedAxes = axes.sort((a: any, b: any) => a.axis.properties.position - b.axis.properties.position);
      
      const matrix_data: any[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
      
      cells.forEach((cellData: any) => {
        if (cellData.cell) {
          const row = cellData.row;
          const col = cellData.col;
          if (row < rows && col < cols) {
            matrix_data[row][col] = {
              resolved: cellData.resolved || '',
              operation: cellData.operation || '',
              notes: cellData.notes || ''
            };
          }
        }
      });

      return NextResponse.json({
        success: true,
        component: {
          id: component.id,
          name: component.name,
          kind: component.kind,
          station: component.station,
          shape: shape,
          axes: sortedAxes.map((a: any) => ({
            name: a.name,
            labels: a.labels
          })),
          data: matrix_data
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid query_type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Neo4j query error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to query Neo4j' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}