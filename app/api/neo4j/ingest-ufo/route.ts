import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME!,
    process.env.NEO4J_PASSWORD!
  )
);

// Station definitions from Chirality Framework
const SEMANTIC_VALLEY_STATIONS = [
  'Problem Statement',
  'Requirements', 
  'Objectives',
  'Verification',
  'Validation',
  'Evaluation',
  'Assessment',
  'Implementation',
  'Reflection',
  'Resolution'
];

interface ChiralityDocument {
  version: string;
  topic: string;
  created_at: string;
  components: Component[];
  meta: Record<string, any>;
}

interface Component {
  id: string;
  kind: string;  // 'matrix', 'tensor', 'array'
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
  const session = driver.session();
  
  try {
    const body: ChiralityDocument = await request.json();
    
    // 1. Create/Update Semantic Valley if not exists
    await session.run(`
      MERGE (sv:SemanticValley {name: "chirality_framework"})
      SET sv.ufo_type = "Situation"
    `);

    // 2. Create Stations and their sequence
    for (let i = 0; i < SEMANTIC_VALLEY_STATIONS.length; i++) {
      const station = SEMANTIC_VALLEY_STATIONS[i];
      await session.run(`
        MATCH (sv:SemanticValley {name: "chirality_framework"})
        MERGE (s:Station {name: $stationName, position: $position})
        SET s.ufo_type = "Situation"
        MERGE (sv)-[:HAS_STATION]->(s)
      `, { stationName: station, position: i });

      // Link stations sequentially
      if (i > 0) {
        const prevStation = SEMANTIC_VALLEY_STATIONS[i - 1];
        await session.run(`
          MATCH (prev:Station {name: $prevName})
          MATCH (curr:Station {name: $currName})
          MERGE (prev)-[:NEXT]->(curr)
        `, { prevName: prevStation, currName: station });
      }
    }
    
    // 3. Create the Document node (UFO: Artifact)
    const docResult = await session.run(`
      CREATE (d:Document {
        version: $version,
        topic: $topic,
        created_at: $created_at,
        meta: $meta,
        ufo_type: "Artifact"
      })
      RETURN d
    `, {
      version: body.version,
      topic: body.topic,
      created_at: body.created_at,
      meta: JSON.stringify(body.meta)
    });

    const docNodeId = docResult.records[0].get('d').identity.low;
    
    // 4. Link Document to Semantic Valley
    await session.run(`
      MATCH (d:Document) WHERE id(d) = $docId
      MATCH (sv:SemanticValley {name: "chirality_framework"})
      MERGE (d)-[:TRAVERSES]->(sv)
    `, { docId: docNodeId });

    // 5. Process each component
    for (const component of body.components) {
      // Create Component node (UFO: Endurant)
      const componentLabel = component.kind === 'matrix' ? 'Matrix' :
                            component.kind === 'tensor' ? 'Tensor' : 'Array';
      
      const compResult = await session.run(`
        MATCH (d:Document) WHERE id(d) = $docId
        CREATE (c:Component:${componentLabel} {
          id: $id,
          kind: $kind,
          station: $station,
          name: $name,
          shape: $shape,
          ontology: $ontology,
          ufo_type: "Endurant"
        })
        CREATE (d)-[:HAS_COMPONENT]->(c)
        RETURN c
      `, {
        docId: docNodeId,
        id: component.id,
        kind: component.kind,
        station: component.station,
        name: component.name,
        shape: component.shape,
        ontology: JSON.stringify(component.ontology)
      });

      const compNodeId = compResult.records[0].get('c').identity.low;

      // Link Component to Station if specified
      if (component.station) {
        await session.run(`
          MATCH (c:Component) WHERE id(c) = $compId
          MATCH (s:Station {name: $stationName})
          MERGE (c)-[:AT_STATION]->(s)
        `, { compId: compNodeId, stationName: component.station });
      }

      // Create KnowledgeField and ProblemStatement nodes
      if (body.topic) {
        await session.run(`
          MATCH (c:Component) WHERE id(c) = $compId
          MERGE (kf:KnowledgeField {name: $topic})
          SET kf.ufo_type = "Kind"
          MERGE (c)-[:PERTAINS_TO]->(kf)
        `, { compId: compNodeId, topic: body.topic });
      }

      // Create Axis nodes (UFO: Quality)
      for (let axisIdx = 0; axisIdx < component.axes.length; axisIdx++) {
        const axis = component.axes[axisIdx];
        await session.run(`
          MATCH (c:Component) WHERE id(c) = $compId
          CREATE (a:Axis {
            name: $name,
            position: $position,
            labels: $labels,
            ufo_type: "Quality"
          })
          CREATE (c)-[:HAS_AXIS]->(a)
        `, {
          compId: compNodeId,
          name: axis.name,
          position: axisIdx,
          labels: axis.labels
        });
      }

      // Create Cell nodes (UFO: Mode) and Term nodes
      for (let row = 0; row < component.data.length; row++) {
        for (let col = 0; col < component.data[row].length; col++) {
          const cell = component.data[row][col];
          
          const cellResult = await session.run(`
            MATCH (c:Component) WHERE id(c) = $compId
            CREATE (cell:Cell {
              row: $row,
              col: $col,
              resolved: $resolved,
              operation: $operation,
              notes: $notes,
              ufo_type: "Mode"
            })
            CREATE (c)-[:HAS_CELL]->(cell)
            RETURN cell
          `, {
            compId: compNodeId,
            row: row,
            col: col,
            resolved: cell.resolved,
            operation: cell.operation,
            notes: cell.notes || null
          });

          const cellNodeId = cellResult.records[0].get('cell').identity.low;

          // Create Term nodes for raw_terms (UFO: Mode)
          for (const term of cell.raw_terms) {
            await session.run(`
              MATCH (cell:Cell) WHERE id(cell) = $cellId
              CREATE (t:Term {
                value: $value,
                type: 'raw',
                ufo_type: "Mode"
              })
              CREATE (cell)-[:CONTAINS_TERM]->(t)
            `, {
              cellId: cellNodeId,
              value: term
            });
          }

          // Create Term nodes for intermediate terms (UFO: Mode)
          for (const term of cell.intermediate) {
            await session.run(`
              MATCH (cell:Cell) WHERE id(cell) = $cellId
              CREATE (t:Term {
                value: $value,
                type: 'intermediate',
                ufo_type: "Mode"
              })
              CREATE (cell)-[:CONTAINS_TERM]->(t)
            `, {
              cellId: cellNodeId,
              value: term
            });
          }

          // Create resolved term (UFO: Mode)
          await session.run(`
            MATCH (cell:Cell) WHERE id(cell) = $cellId
            CREATE (t:Term {
              value: $value,
              type: 'resolved',
              ufo_type: "Mode"
            })
            CREATE (cell)-[:RESOLVES_TO]->(t)
          `, {
            cellId: cellNodeId,
            value: cell.resolved
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Chirality document successfully ingested with UFO ontology',
      documentId: docNodeId,
      ontology: 'UFO-C + Chirality Framework'
    });

  } catch (error) {
    console.error('Neo4j UFO ingestion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to ingest document with UFO ontology' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}