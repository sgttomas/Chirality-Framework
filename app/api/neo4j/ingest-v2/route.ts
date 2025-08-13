import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

interface CF14Component {
  id: string
  name: string
  kind: 'matrix' | 'array' | 'scalar' | 'tensor'
  station: string
  dimensions: number[]
  ontology_id: string
  operation_type: string
  ufo_type?: string
  created_at?: string
  row_names?: string[]
  col_names?: string[]
  domain?: string
  cells?: Array<{
    row: number
    col: number
    resolved: string
    operation: string
    raw_terms?: string[]
    intermediate?: string[]
    notes?: string
  }>
}

interface CF14Document {
  version: string
  meta: {
    source: string
    mode: string
    ontology_id: string
    timestamp: string
    domain?: string
    [key: string]: any
  }
  components: CF14Component[]
}

async function validateComponent(component: CF14Component): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Required fields validation
  const requiredFields = ['id', 'name', 'kind', 'station', 'dimensions', 'ontology_id', 'operation_type']
  for (const field of requiredFields) {
    if (!component[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate ontology version
  if (component.ontology_id && !component.ontology_id.startsWith('cf14.core.v2.1')) {
    errors.push(`Unsupported ontology version: ${component.ontology_id}. Expected cf14.core.v2.1.x`)
  }

  // Validate dimensions
  if (component.dimensions) {
    if (!Array.isArray(component.dimensions) || component.dimensions.length === 0) {
      errors.push('Dimensions must be a non-empty array')
    }
    
    // Validate specific matrix dimensions
    if (component.kind === 'matrix') {
      const [rows, cols] = component.dimensions
      if (component.name.includes('Matrix A') && (rows !== 3 || cols !== 4)) {
        errors.push('Matrix A must be 3x4 per CF14 v2.1.1 specification')
      }
      if (component.name.includes('Matrix B') && (rows !== 4 || cols !== 4)) {
        errors.push('Matrix B must be 4x4 per CF14 v2.1.1 specification')
      }
      if (component.name.includes('Matrix C') && (rows !== 3 || cols !== 4)) {
        errors.push('Matrix C must be 3x4 per CF14 v2.1.1 specification')
      }
    }
    
    if (component.kind === 'array' && component.name.includes('Array P')) {
      const [rows, cols] = component.dimensions
      if (rows !== 1 || cols !== 4) {
        errors.push('Array P must be 1x4 per CF14 v2.1.1 specification')
      }
    }
    
    if (component.kind === 'scalar' && component.name.includes('Array H')) {
      const [rows, cols] = component.dimensions
      if (rows !== 1 || cols !== 1) {
        errors.push('Array H must be 1x1 per CF14 v2.1.1 specification')
      }
    }
  }

  // Validate cells if present
  if (component.cells) {
    const [expectedRows, expectedCols] = component.dimensions
    const expectedCellCount = expectedRows * expectedCols
    
    if (component.cells.length !== expectedCellCount) {
      errors.push(`Expected ${expectedCellCount} cells for ${expectedRows}x${expectedCols} component, got ${component.cells.length}`)
    }
    
    // Validate cell positions
    for (const cell of component.cells) {
      if (cell.row < 1 || cell.row > expectedRows) {
        errors.push(`Cell row ${cell.row} out of bounds (1-${expectedRows})`)
      }
      if (cell.col < 1 || cell.col > expectedCols) {
        errors.push(`Cell col ${cell.col} out of bounds (1-${expectedCols})`)
      }
      if (!cell.resolved) {
        errors.push(`Cell (${cell.row},${cell.col}) missing resolved value`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

async function ingestComponentV2(component: CF14Component, session: any): Promise<string> {
  // Create component node with CF14 v2.1.1 properties
  const componentResult = await session.run(`
    CREATE (c:Component {
      id: $id,
      name: $name,
      kind: $kind,
      station: $station,
      dimensions: $dimensions,
      ontology_id: $ontology_id,
      operation_type: $operation_type,
      ufo_type: $ufo_type,
      created_at: $created_at,
      row_names: $row_names,
      col_names: $col_names,
      domain: $domain
    })
    RETURN c.id as component_id
  `, {
    id: component.id,
    name: component.name,
    kind: component.kind,
    station: component.station,
    dimensions: component.dimensions,
    ontology_id: component.ontology_id,
    operation_type: component.operation_type,
    ufo_type: component.ufo_type || 'Endurant',
    created_at: component.created_at || new Date().toISOString(),
    row_names: component.row_names || [],
    col_names: component.col_names || [],
    domain: component.domain || 'general'
  })

  const componentId = componentResult.records[0].get('component_id')

  // Create cells with enhanced metadata
  if (component.cells) {
    for (const cell of component.cells) {
      await session.run(`
        MATCH (c:Component {id: $component_id})
        CREATE (cell:Cell {
          row: $row,
          col: $col,
          resolved: $resolved,
          operation: $operation,
          raw_terms: $raw_terms,
          intermediate: $intermediate,
          notes: $notes,
          ufo_type: 'Mode'
        })
        CREATE (c)-[:HAS_CELL]->(cell)
        
        // Create resolved term with provenance
        MERGE (term:Term {
          value: $resolved, 
          role: 'resolved', 
          ufo_type: 'Mode'
        })
        CREATE (cell)-[:RESOLVES_TO]->(term)
        
        // Create raw terms
        UNWIND $raw_terms as raw_term
        MERGE (raw:Term {
          value: raw_term,
          role: 'raw',
          ufo_type: 'Mode'
        })
        CREATE (cell)-[:CONTAINS_TERM]->(raw)
      `, {
        component_id: componentId,
        row: cell.row,
        col: cell.col,
        resolved: cell.resolved,
        operation: cell.operation,
        raw_terms: cell.raw_terms || [],
        intermediate: cell.intermediate || [],
        notes: cell.notes || ''
      })
    }
  }

  // Link to station
  await session.run(`
    MATCH (c:Component {id: $component_id})
    MERGE (s:Station {name: $station})
    SET s.ufo_type = 'Situation'
    CREATE (c)-[:AT_STATION]->(s)
    CREATE (c)-[:POSITIONED_AT]->(s)
  `, {
    component_id: componentId,
    station: component.station
  })

  return componentId
}

export async function POST(request: NextRequest) {
  const session = neo4jDriver.session()

  try {
    const data = await request.json()
    
    // Handle both single component and full document structures
    let components: CF14Component[] = []
    let documentMeta: any = {}

    if (data.component) {
      // Single component format (legacy compatibility)
      components = [data.component]
      documentMeta = data.meta || {}
    } else if (data.components) {
      // Full document format (CF14 v2.1.1)
      components = data.components
      documentMeta = data.meta || {}
    } else {
      throw new Error('Invalid request format. Expected component or components field.')
    }

    const results = []
    const errors = []

    // Process each component
    for (const component of components) {
      try {
        // Validate component
        const validation = await validateComponent(component)
        if (!validation.valid) {
          errors.push({
            component_id: component.id,
            errors: validation.errors
          })
          continue
        }

        // Ingest component
        const componentId = await ingestComponentV2(component, session)
        results.push({
          component_id: componentId,
          name: component.name,
          station: component.station,
          kind: component.kind
        })

      } catch (error) {
        errors.push({
          component_id: component.id,
          error: error.message
        })
      }
    }

    // Create document node if we have document metadata
    if (documentMeta.ontology_id) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await session.run(`
        CREATE (d:Document {
          id: $id,
          version: $version,
          ontology_id: $ontology_id,
          source: $source,
          mode: $mode,
          timestamp: $timestamp,
          domain: $domain,
          ufo_type: 'Artifact'
        })
        RETURN d.id as document_id
      `, {
        id: documentId,
        version: data.version || '2.1.1',
        ontology_id: documentMeta.ontology_id,
        source: documentMeta.source || 'api',
        mode: documentMeta.mode || 'ingest-v2',
        timestamp: documentMeta.timestamp || new Date().toISOString(),
        domain: documentMeta.domain || 'general'
      })

      // Link components to document
      for (const result of results) {
        await session.run(`
          MATCH (d:Document {id: $document_id})
          MATCH (c:Component {id: $component_id})
          CREATE (d)-[:HAS_COMPONENT]->(c)
        `, {
          document_id: documentId,
          component_id: result.component_id
        })
      }

      results.push({
        document_id: documentId,
        type: 'document'
      })
    }

    return NextResponse.json({
      success: true,
      results: results,
      errors: errors,
      ingested_count: results.filter(r => r.component_id).length,
      error_count: errors.length,
      cf14_version: '2.1.1'
    })

  } catch (error) {
    console.error('CF14 v2.1.1 ingestion error:', error)
    return NextResponse.json({
      error: error.message,
      cf14_version: '2.1.1'
    }, { status: 500 })

  } finally {
    await session.close()
  }
}