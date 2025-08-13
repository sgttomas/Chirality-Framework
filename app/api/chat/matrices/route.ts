import { NextRequest, NextResponse } from 'next/server';
import { neo4jDriver } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const session = neo4jDriver.session();
  
  try {
    // Query for all available matrices and their basic info
    const result = await session.run(`
      MATCH (c:Component)-[:AT_STATION]->(s:Station)
      OPTIONAL MATCH (c)-[:HAS_CELL]->(cell:Cell)
      WITH c, s, count(cell) as cell_count
      RETURN c.id as id, c.name as name, c.station as station, 
             s.name as station_name, c.shape as shape, cell_count
      ORDER BY c.station, c.name
    `);

    const matrices = result.records.map(record => {
      const shape = record.get('shape');
      const cellCount = record.get('cell_count');
      
      // Generate relevant_cells info based on matrix dimensions
      const relevantCells = [];
      if (shape && Array.isArray(shape) && shape.length >= 2) {
        let [rows, cols] = shape;
        
        // Handle complex Neo4j integer format
        if (typeof rows === 'object' && rows.low !== undefined) {
          rows = rows.low;
        }
        if (typeof cols === 'object' && cols.low !== undefined) {
          cols = cols.low;
        }
        
        // Convert potentially BigInt values to numbers
        const numRows = typeof rows === 'bigint' ? Number(rows) : Number(rows);
        const numCols = typeof cols === 'bigint' ? Number(cols) : Number(cols);
        
        if (!isNaN(numRows) && !isNaN(numCols)) {
          for (let i = 1; i <= Math.min(numRows, 3); i++) {
            for (let j = 1; j <= Math.min(numCols, 3); j++) {
              relevantCells.push(`(${i},${j})`);
            }
          }
        }
      }

      return {
        id: record.get('id'),
        name: record.get('name'),
        station: record.get('station'),
        station_name: record.get('station_name'),
        shape: shape,
        cell_count: cellCount?.toNumber() || 0,
        relevant_cells: relevantCells
      };
    });

    return NextResponse.json({
      success: true,
      matrices: matrices,
      total_count: matrices.length
    });

  } catch (error) {
    console.error('Error fetching matrices:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch matrices',
        matrices: []
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}