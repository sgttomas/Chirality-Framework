import { NextRequest, NextResponse } from 'next/server'
import { neo4jDriver } from '@/lib/neo4j'

interface SemanticOperationV2 {
  type: 'multiplication' | 'addition' | 'cross_product' | 'element_wise_multiplication' | 'extraction' | 'truncation'
  timestamp: string
  model_vendor: string
  model_name: string
  model_version: string
  inputs: any[]
  output: any
  context?: {
    domain?: string
    station?: string
    component_id?: string
    operation_notes?: string
    cf14_version?: string
  }
}

interface OperationProvenance {
  operation_id: string
  type: string
  timestamp: string
  model_vendor: string
  model_name: string
  model_version: string
  input_count: number
  output_type: string
  context: any
}

async function recordSemanticOperation(operation: SemanticOperationV2, session: any): Promise<string> {
  // Create semantic operation event node
  const result = await session.run(`
    CREATE (op:SemanticOperation {
      type: $type,
      timestamp: $timestamp,
      model_vendor: $model_vendor,
      model_name: $model_name,
      model_version: $model_version,
      operation_id: randomUUID(),
      ufo_type: 'Event',
      context: $context,
      cf14_version: $cf14_version
    })
    RETURN op.operation_id as operation_id
  `, {
    type: operation.type,
    timestamp: operation.timestamp,
    model_vendor: operation.model_vendor,
    model_name: operation.model_name,
    model_version: operation.model_version,
    context: JSON.stringify(operation.context || {}),
    cf14_version: operation.context?.cf14_version || '2.1.1'
  })

  const operationId = result.records[0].get('operation_id')

  // Handle different input types
  if (Array.isArray(operation.inputs) && operation.inputs.length > 0) {
    // Check if inputs are matrices/arrays or simple terms
    for (let i = 0; i < operation.inputs.length; i++) {
      const input = operation.inputs[i]
      
      if (Array.isArray(input)) {
        // Matrix/array input
        await session.run(`
          MATCH (op:SemanticOperation {operation_id: $operation_id})
          CREATE (m:MatrixInput {
            matrix_index: $matrix_index,
            content: $content,
            dimensions: $dimensions,
            ufo_type: 'Mode'
          })
          CREATE (op)-[:USED_MATRIX]->(m)
        `, {
          operation_id: operationId,
          matrix_index: i,
          content: JSON.stringify(input),
          dimensions: Array.isArray(input[0]) ? [input.length, input[0].length] : [input.length]
        })
      } else if (typeof input === 'string') {
        // Term input
        await session.run(`
          MATCH (op:SemanticOperation {operation_id: $operation_id})
          MERGE (t:Term {value: $value, role: 'input', ufo_type: 'Mode'})
          CREATE (op)-[:USED_TERM]->(t)
        `, {
          operation_id: operationId,
          value: input
        })
      }
    }
  }

  // Handle output
  if (Array.isArray(operation.output)) {
    // Matrix/array output
    await session.run(`
      MATCH (op:SemanticOperation {operation_id: $operation_id})
      CREATE (m:MatrixOutput {
        content: $content,
        dimensions: $dimensions,
        ufo_type: 'Mode'
      })
      CREATE (op)-[:PRODUCED_MATRIX]->(m)
    `, {
      operation_id: operationId,
      content: JSON.stringify(operation.output),
      dimensions: Array.isArray(operation.output[0]) ? [operation.output.length, operation.output[0].length] : [operation.output.length]
    })
  } else if (typeof operation.output === 'string') {
    // Term output
    await session.run(`
      MATCH (op:SemanticOperation {operation_id: $operation_id})
      MERGE (t:Term {value: $value, role: 'output', ufo_type: 'Mode'})
      CREATE (op)-[:PRODUCED_TERM]->(t)
    `, {
      operation_id: operationId,
      value: operation.output
    })
  }

  // Link to component if specified in context
  if (operation.context?.component_id) {
    await session.run(`
      MATCH (op:SemanticOperation {operation_id: $operation_id})
      MATCH (c:Component {id: $component_id})
      CREATE (op)-[:DERIVES_COMPONENT]->(c)
    `, {
      operation_id: operationId,
      component_id: operation.context.component_id
    })
  }

  // Link to station if specified
  if (operation.context?.station) {
    await session.run(`
      MATCH (op:SemanticOperation {operation_id: $operation_id})
      MERGE (s:Station {name: $station})
      CREATE (op)-[:OCCURS_AT]->(s)
    `, {
      operation_id: operationId,
      station: operation.context.station
    })
  }

  return operationId
}

export async function POST(request: NextRequest) {
  const session = neo4jDriver.session()

  try {
    const operation: SemanticOperationV2 = await request.json()

    // Validate required fields
    const requiredFields = ['type', 'timestamp', 'model_vendor', 'model_name', 'model_version', 'inputs', 'output']
    for (const field of requiredFields) {
      if (!operation[field]) {
        return NextResponse.json({
          error: `Missing required field: ${field}`
        }, { status: 400 })
      }
    }

    // Validate operation type
    const validTypes = ['multiplication', 'addition', 'cross_product', 'element_wise_multiplication', 'extraction', 'truncation']
    if (!validTypes.includes(operation.type)) {
      return NextResponse.json({
        error: `Invalid operation type: ${operation.type}. Valid types: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Record the operation
    const operationId = await recordSemanticOperation(operation, session)

    return NextResponse.json({
      success: true,
      operation_id: operationId,
      type: operation.type,
      cf14_version: operation.context?.cf14_version || '2.1.1'
    })

  } catch (error) {
    console.error('Semantic operation recording error:', error)
    return NextResponse.json({
      error: error.message,
      cf14_version: '2.1.1'
    }, { status: 500 })
  } finally {
    await session.close()
  }
}

export async function GET(request: NextRequest) {
  const session = neo4jDriver.session()

  try {
    const { searchParams } = new URL(request.url)
    const operationType = searchParams.get('type')
    const componentId = searchParams.get('component_id')
    const station = searchParams.get('station')
    const domain = searchParams.get('domain')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = `
      MATCH (op:SemanticOperation)
    `
    let params: any = {}
    const conditions: string[] = []

    if (operationType) {
      conditions.push('op.type = $operation_type')
      params.operation_type = operationType
    }

    if (componentId) {
      query += `
        MATCH (op)-[:DERIVES_COMPONENT]->(c:Component {id: $component_id})
      `
      params.component_id = componentId
    }

    if (station) {
      query += `
        MATCH (op)-[:OCCURS_AT]->(s:Station {name: $station})
      `
      params.station = station
    }

    if (domain) {
      conditions.push('op.context CONTAINS $domain')
      params.domain = `"domain":"${domain}"`
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += `
      OPTIONAL MATCH (op)-[:USED_TERM]->(input_term:Term)
      OPTIONAL MATCH (op)-[:PRODUCED_TERM]->(output_term:Term)
      OPTIONAL MATCH (op)-[:USED_MATRIX]->(input_matrix:MatrixInput)
      OPTIONAL MATCH (op)-[:PRODUCED_MATRIX]->(output_matrix:MatrixOutput)
      OPTIONAL MATCH (op)-[:OCCURS_AT]->(station:Station)
      
      RETURN op,
             collect(DISTINCT input_term.value) as input_terms,
             collect(DISTINCT output_term.value) as output_terms,
             collect(DISTINCT {
               index: input_matrix.matrix_index,
               dimensions: input_matrix.dimensions
             }) as input_matrices,
             collect(DISTINCT {
               dimensions: output_matrix.dimensions
             }) as output_matrices,
             station.name as station_name
      ORDER BY op.timestamp DESC
      LIMIT $limit
    `

    params.limit = limit

    const result = await session.run(query, params)

    const operations: OperationProvenance[] = result.records.map(record => {
      const op = record.get('op').properties
      const context = op.context ? JSON.parse(op.context) : {}
      
      return {
        operation_id: op.operation_id,
        type: op.type,
        timestamp: op.timestamp,
        model_vendor: op.model_vendor,
        model_name: op.model_name,
        model_version: op.model_version,
        input_count: record.get('input_terms').length + record.get('input_matrices').length,
        output_type: record.get('output_terms').length > 0 ? 'term' : 'matrix',
        context: {
          ...context,
          station: record.get('station_name'),
          cf14_version: op.cf14_version || '2.1.1'
        }
      }
    })

    // Get operation statistics
    const statsResult = await session.run(`
      MATCH (op:SemanticOperation)
      WHERE op.cf14_version = '2.1.1' OR op.cf14_version IS NULL
      RETURN 
        count(op) as total_operations,
        collect(DISTINCT op.type) as operation_types,
        min(op.timestamp) as earliest_operation,
        max(op.timestamp) as latest_operation
    `)

    const stats = statsResult.records[0]

    return NextResponse.json({
      operations: operations,
      statistics: {
        total_operations: stats.get('total_operations').toNumber(),
        operation_types: stats.get('operation_types'),
        earliest_operation: stats.get('earliest_operation'),
        latest_operation: stats.get('latest_operation')
      },
      query_params: {
        type: operationType,
        component_id: componentId,
        station: station,
        domain: domain,
        limit: limit
      },
      cf14_version: '2.1.1'
    })

  } catch (error) {
    console.error('Operation query error:', error)
    return NextResponse.json({
      error: error.message,
      cf14_version: '2.1.1'
    }, { status: 500 })
  } finally {
    await session.close()
  }
}