import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { join } from 'path'

interface InstantiationRequest {
  operation: 'semantic-matrix-c' | 'semantic-matrix-f' | 'semantic-matrix-d' | 'full-pipeline'
  problem_statement: string
  domain_context: string
  domain_pack_path?: string
  cf14_version: string
}

interface InstantiationResult {
  success: boolean
  component_id?: string
  matrix_name?: string
  station?: string
  operation_type?: string
  output_path?: string
  error?: string
  cf14_version: string
}

async function executeChiralityCLI(operation: string, domainPackPath?: string): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    const cliPath = join(process.cwd(), 'chirality_cli.py')
    const outputPath = join(process.cwd(), `temp_${operation}_${Date.now()}.json`)
    
    const args = [cliPath, '--api-base', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000', operation, '--out', outputPath]
    
    if (domainPackPath) {
      args.push('--domain-pack', domainPackPath)
    }
    
    // Enable semantic interpretations for all operations
    args.push('--run-interpretations')
    
    // Add ontology pack for enhanced interpretation
    const ontologyPackPath = join(process.cwd(), 'ontology/cf14.core.v2.1.1.json')
    args.push('--ontology-pack', ontologyPackPath)

    const childProcess = spawn('python3', args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        CHIRALITY_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000',
        NEO4J_URI: process.env.NEO4J_URI,
        NEO4J_USER: process.env.NEO4J_USER,
        NEO4J_PASSWORD: process.env.NEO4J_PASSWORD
      },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() })
      } else {
        resolve({ 
          success: false, 
          output: stdout.trim(),
          error: stderr || `Process exited with code ${code}`
        })
      }
    })

    childProcess.on('error', (error) => {
      resolve({
        success: false,
        output: '',
        error: error.message
      })
    })
  })
}

function extractComponentIdFromOutput(output: string): string | null {
  // Try to extract component ID from CLI output
  const lines = output.split('\n')
  for (const line of lines) {
    if (line.includes('matrix_') && (line.includes('semantic') || line.includes('from_neo4j'))) {
      return line.trim()
    }
  }
  
  // Fallback: generate ID based on operation
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { 
      operation, 
      problem_statement, 
      domain_context, 
      domain_pack_path,
      cf14_version 
    }: InstantiationRequest = await request.json()

    // Validate required fields
    if (!operation || !problem_statement || !cf14_version) {
      return NextResponse.json({
        error: 'Missing required fields: operation, problem_statement, cf14_version',
        cf14_version: cf14_version || '2.1.1'
      }, { status: 400 })
    }

    // Validate CF14 version
    if (!cf14_version.startsWith('2.1')) {
      return NextResponse.json({
        error: `Unsupported CF14 version: ${cf14_version}. This endpoint requires v2.1.x`,
        cf14_version: cf14_version
      }, { status: 400 })
    }

    // Validate operation type
    const validOperations = ['semantic-matrix-c', 'semantic-matrix-f', 'semantic-matrix-d', 'full-pipeline']
    if (!validOperations.includes(operation)) {
      return NextResponse.json({
        error: `Invalid operation: ${operation}. Valid operations: ${validOperations.join(', ')}`,
        cf14_version: cf14_version
      }, { status: 400 })
    }

    // Execute the operation using the Python CLI
    const result = await executeChiralityCLI(operation, domain_pack_path)

    if (!result.success) {
      return NextResponse.json({
        error: `CLI execution failed: ${result.error}`,
        output: result.output,
        cf14_version: cf14_version
      }, { status: 500 })
    }

    // Extract component information from the result
    const componentId = extractComponentIdFromOutput(result.output) || `${operation}_${Date.now()}`
    
    const operationInfo = {
      'semantic-matrix-c': { 
        matrix_name: 'Matrix C (Requirements)', 
        station: 'Requirements',
        operation_type: 'multiplication'
      },
      'semantic-matrix-f': { 
        matrix_name: 'Matrix F (Objectives)', 
        station: 'Objectives',
        operation_type: 'element_wise_multiplication'
      },
      'semantic-matrix-d': { 
        matrix_name: 'Matrix D (Solution Objectives)', 
        station: 'Objectives',
        operation_type: 'addition'
      },
      'full-pipeline': { 
        matrix_name: 'Full Pipeline Results', 
        station: 'Multiple',
        operation_type: 'pipeline'
      }
    }

    const info = operationInfo[operation]

    const response: InstantiationResult = {
      success: true,
      component_id: componentId,
      matrix_name: info.matrix_name,
      station: info.station,
      operation_type: info.operation_type,
      output_path: result.output,
      cf14_version: cf14_version
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('CF14 v2.1.1 instantiation error:', error)
    return NextResponse.json({
      error: error.message,
      cf14_version: '2.1.1'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operation = searchParams.get('operation')

    if (operation) {
      // Return operation-specific information
      const operationDetails = {
        'semantic-matrix-c': {
          name: 'Semantic Matrix C Generation',
          description: 'Generate Requirements matrix using A * B = C semantic multiplication',
          station: 'Requirements',
          formula: 'C[i,j] := +(*(A[i,1], B[1,j]), *(A[i,2], B[2,j]), *(A[i,3], B[3,j]), *(A[i,4], B[4,j]))',
          inputs: ['Matrix A (3x4 Problem Statement)', 'Matrix B (4x4 Decision Framework)'],
          output: 'Matrix C (3x4 Requirements)'
        },
        'semantic-matrix-f': {
          name: 'Semantic Matrix F Generation',
          description: 'Generate Objectives matrix using J ⊙ C = F element-wise multiplication',
          station: 'Objectives',
          formula: 'F[i,j] := *(J[i,j], C[i,j])',
          inputs: ['Matrix J (3x4 Truncated Decisions)', 'Matrix C (3x4 Requirements)'],
          output: 'Matrix F (3x4 Objectives)'
        },
        'semantic-matrix-d': {
          name: 'Semantic Matrix D Generation',
          description: 'Generate Solution Objectives matrix using A + F = D semantic addition',
          station: 'Objectives',
          formula: 'D[i,j] := +(A[i,j], F[i,j])',
          inputs: ['Matrix A (3x4 Problem Statement)', 'Matrix F (3x4 Objectives)'],
          output: 'Matrix D (3x4 Solution Objectives)'
        },
        'full-pipeline': {
          name: 'Full CF14 v2.1.1 Pipeline',
          description: 'Execute complete pipeline through Problem Statement → Requirements → Objectives',
          station: 'Multiple',
          formula: 'Complete semantic valley progression',
          inputs: ['Problem Statement', 'Domain Context', 'Optional Domain Pack'],
          output: 'All matrices (A, B, C, J, F, D) with full provenance'
        }
      }

      const details = operationDetails[operation as keyof typeof operationDetails]
      if (details) {
        return NextResponse.json({
          operation: operation,
          ...details,
          cf14_version: '2.1.1'
        })
      } else {
        return NextResponse.json({
          error: `Unknown operation: ${operation}`,
          cf14_version: '2.1.1'
        }, { status: 404 })
      }
    }

    // Return general API information
    return NextResponse.json({
      api_name: 'CF14 v2.1.1 Instantiation API',
      version: '2.1.1',
      supported_operations: [
        'semantic-matrix-c',
        'semantic-matrix-f', 
        'semantic-matrix-d',
        'full-pipeline'
      ],
      domain_pack_support: true,
      ufo_annotations: true,
      stations_supported: [
        'Problem Statement',
        'Requirements', 
        'Objectives'
      ],
      future_stations: [
        'Verification',
        'Validation',
        'Evaluation',
        'Assessment',
        'Implementation',
        'Reflection',
        'Resolution'
      ]
    })

  } catch (error) {
    console.error('CF14 v2.1.1 API info error:', error)
    return NextResponse.json({
      error: error.message,
      cf14_version: '2.1.1'
    }, { status: 500 })
  }
}