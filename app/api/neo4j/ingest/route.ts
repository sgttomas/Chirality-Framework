import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

interface ChiralityDocument {
  version: string;
  topic: string;
  created_at: string;
  components: Component[];
  meta: Record<string, any>;
}

interface Component {
  id: string;
  kind: string;
  station: string | null;
  name: string | null;
  axes: Axis[];
  shape: number[];
  ontology: Record<string, any>;
  data: Cell[][];
}

interface Axis {
  name: string;
  labels: string[];
}

interface Cell {
  resolved: string;
  raw_terms: string[];
  intermediate: string[];
  operation: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const session = neo4jDriver.session();
  
  try {
    const body: ChiralityDocument = await request.json();
    
    // Create the Document node
    const docResult = await session.run(
      `
      CREATE (d:Document {
        version: $version,
        topic: $topic,
        created_at: $created_at,
        meta: $meta
      })
      RETURN d
      `,
      {
        version: body.version,
        topic: body.topic,
        created_at: body.created_at,
        meta: JSON.stringify(body.meta)
      }
    );

    const docNodeId = docResult.records[0].get('d').identity.low;
    
    // Process each component
    for (const component of body.components) {
      // Create Component node
      const compResult = await session.run(
        `
        MATCH (d:Document) WHERE id(d) = $docId
        CREATE (c:Component {
          id: $id,
          kind: $kind,
          station: $station,
          name: $name,
          shape: $shape,
          ontology: $ontology
        })
        CREATE (d)-[:HAS_COMPONENT]->(c)
        RETURN c
        `,
        {
          docId: docNodeId,
          id: component.id,
          kind: component.kind,
          station: component.station,
          name: component.name,
          shape: component.shape,
          ontology: JSON.stringify(component.ontology)
        }
      );

      const compNodeId = compResult.records[0].get('c').identity.low;

      // Create Axis nodes
      for (let axisIdx = 0; axisIdx < component.axes.length; axisIdx++) {
        const axis = component.axes[axisIdx];
        await session.run(
          `
          MATCH (c:Component) WHERE id(c) = $compId
          CREATE (a:Axis {
            name: $name,
            position: $position,
            labels: $labels
          })
          CREATE (c)-[:HAS_AXIS]->(a)
          `,
          {
            compId: compNodeId,
            name: axis.name,
            position: axisIdx,
            labels: axis.labels
          }
        );
      }

      // Create Cell nodes
      for (let row = 0; row < component.data.length; row++) {
        for (let col = 0; col < component.data[row].length; col++) {
          const cell = component.data[row][col];
          
          const cellResult = await session.run(
            `
            MATCH (c:Component) WHERE id(c) = $compId
            CREATE (cell:Cell {
              row: $row,
              col: $col,
              resolved: $resolved,
              operation: $operation,
              notes: $notes
            })
            CREATE (c)-[:HAS_CELL]->(cell)
            RETURN cell
            `,
            {
              compId: compNodeId,
              row: row,
              col: col,
              resolved: cell.resolved,
              operation: cell.operation,
              notes: cell.notes || null
            }
          );

          const cellNodeId = cellResult.records[0].get('cell').identity.low;

          // Create Term nodes for raw_terms
          for (const term of cell.raw_terms) {
            await session.run(
              `
              MATCH (cell:Cell) WHERE id(cell) = $cellId
              CREATE (t:Term {
                value: $value,
                type: 'raw'
              })
              CREATE (cell)-[:CONTAINS_TERM]->(t)
              `,
              {
                cellId: cellNodeId,
                value: term
              }
            );
          }

          // Create Term nodes for intermediate terms
          for (const term of cell.intermediate) {
            await session.run(
              `
              MATCH (cell:Cell) WHERE id(cell) = $cellId
              CREATE (t:Term {
                value: $value,
                type: 'intermediate'
              })
              CREATE (cell)-[:CONTAINS_TERM]->(t)
              `,
              {
                cellId: cellNodeId,
                value: term
              }
            );
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Chirality document successfully ingested into Neo4j',
      documentId: docNodeId
    });

  } catch (error) {
    console.error('Neo4j ingestion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest document' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}