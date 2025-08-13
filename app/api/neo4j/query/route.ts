import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryType = searchParams.get('query_type')
  const componentId = searchParams.get('id')
  
  if (queryType === 'get_component_by_id' && componentId) {
    const session = neo4jDriver.session()
    try {
      const result = await session.run(`
        MATCH (c:Component {id: $componentId})
        OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:RESOLVES_TO]->(resolved:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        RETURN c,
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
      `, { componentId })

      if (result.records.length === 0) {
        return NextResponse.json(
          { success: false, error: `Component not found: ${componentId}` },
          { status: 404 }
        )
      }

      const record = result.records[0]
      const component = record.get('c').properties
      const cells = record.get('cells')
      const axes = record.get('axes')

      // Reconstruct matrix structure
      const shape = component.shape || [0, 0]
      const rows = shape[0]
      const cols = shape[1]
      
      const sortedAxes = axes.sort((a: any, b: any) => a.axis?.properties?.position - b.axis?.properties?.position)
      
      const matrix_data: any[][] = Array(rows).fill(null).map(() => Array(cols).fill(null))
      
      cells.forEach((cellData: any) => {
        if (cellData.cell) {
          const row = cellData.row
          const col = cellData.col
          if (row < rows && col < cols) {
            matrix_data[row][col] = {
              resolved: cellData.resolved || '',
              operation: cellData.operation || '',
              notes: cellData.notes || ''
            }
          }
        }
      })

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
      })
    } catch (error) {
      console.error('Neo4j component lookup error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to query component' },
        { status: 500 }
      )
    } finally {
      await session.close()
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Invalid query parameters' },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  console.log('NEO4J_URI set?', !!process.env.NEO4J_URI, 'NEO4J_USER set?', !!process.env.NEO4J_USER)
  const session = neo4jDriver.session({ database: 'neo4j' });
  
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
      
      // Sort axes by position with null checks
      const sortedAxes = axes
        .filter((a: any) => a.axis && a.axis.properties)
        .sort((a: any, b: any) => {
          const posA = a.axis.properties.position || 0;
          const posB = b.axis.properties.position || 0;
          return posA - posB;
        });
      
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
      // Robust query supporting both relationship and property-based station lookup
      const result = await session.run(`
        OPTIONAL MATCH (sByNum:Station {id:toInteger($station)})
        OPTIONAL MATCH (sByName:Station {name:$station})
        WITH coalesce(sByNum, sByName) AS s, $station AS st
        MATCH (c:Component)
        WHERE (s IS NOT NULL AND (c)-[:AT_STATION]->(s))
           OR (toString(c.station) = toString(st))
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
      
      const sortedAxes = axes
        .filter((a: any) => a.axis && a.axis.properties)
        .sort((a: any, b: any) => {
          const posA = a.axis.properties.position || 0;
          const posB = b.axis.properties.position || 0;
          return posA - posB;
        });
      
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
    
    if (query_type === 'get_all_by_station') {
      // Query to get all matrices at a specific station
      const result = await session.run(`
        MATCH (c:Component {station: $station})
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
        RETURN c, cells, axes
      `, { station });

      const components = result.records.map(record => {
        const component = record.get('c').properties;
        const cells = record.get('cells');
        const axes = record.get('axes');

        // Reconstruct matrix structure
        const shape = component.shape || [0, 0];
        const rows = shape[0];
        const cols = shape[1];
        
        const sortedAxes = axes.sort((a: any, b: any) => a.axis?.properties?.position - b.axis?.properties?.position);
        
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

        return {
          id: component.id,
          name: component.name,
          kind: component.kind,
          station: component.station,
          dimensions: shape,
          operation_type: component.operation_type,
          ontology_id: component.ontology_id,
          domain: component.domain,
          cf14_version: component.cf14_version,
          row_labels: sortedAxes[0]?.labels || [],
          col_labels: sortedAxes[1]?.labels || [],
          data: matrix_data
        };
      });

      return NextResponse.json({
        success: true,
        components: components
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