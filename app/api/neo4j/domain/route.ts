import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface DomainPack {
  id: string
  extends: string
  domain: string
  axiomatic_matrices?: Record<string, any>
  custom_arrays?: Record<string, any>
  graph_extensions?: {
    additional_node_types?: any[]
    additional_relationships?: any[]
    domain_specific_attributes?: Record<string, any>
  }
  validation_overrides?: Record<string, any>
}

interface CF14Ontology {
  id: string
  version: string
  ontology_registry: {
    version: string
    date: string
    domains_supported: string[]
    modalities: Record<string, string[]>
    external_mappings: Record<string, string>
  }
  stations: any[]
  components: any[]
  semantic_operations: any[]
  graph_schema: any
}

async function loadCoreOntology(): Promise<CF14Ontology> {
  try {
    const ontologyPath = join(process.cwd(), 'ontology', 'cf14.core.v2.1.1.json')
    const ontologyContent = await readFile(ontologyPath, 'utf-8')
    return JSON.parse(ontologyContent)
  } catch (error) {
    throw new Error(`Failed to load core ontology: ${error.message}`)
  }
}

async function loadDomainPack(domainPackPath: string): Promise<DomainPack> {
  try {
    const fullPath = join(process.cwd(), domainPackPath)
    const domainContent = await readFile(fullPath, 'utf-8')
    return JSON.parse(domainContent)
  } catch (error) {
    throw new Error(`Failed to load domain pack: ${error.message}`)
  }
}

function validateDomainPack(domainPack: DomainPack, coreOntology: CF14Ontology): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required fields
  if (!domainPack.id) errors.push('Missing required field: id')
  if (!domainPack.extends) errors.push('Missing required field: extends')
  if (!domainPack.domain) errors.push('Missing required field: domain')

  // Check compatibility
  if (domainPack.extends !== coreOntology.id) {
    errors.push(`Domain pack incompatible. Expected: ${coreOntology.id}, Got: ${domainPack.extends}`)
  }

  // Validate axiomatic matrices if present
  if (domainPack.axiomatic_matrices) {
    for (const [matrixName, matrixData] of Object.entries(domainPack.axiomatic_matrices)) {
      const coreMatrix = coreOntology.components.find(c => c.name === matrixName)
      if (coreMatrix && matrixData.dimensions) {
        if (JSON.stringify(matrixData.dimensions) !== JSON.stringify(coreMatrix.dimensions)) {
          errors.push(`Matrix ${matrixName} dimensions mismatch. Expected: ${coreMatrix.dimensions}, Got: ${matrixData.dimensions}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

function mergeOntologyWithDomain(coreOntology: CF14Ontology, domainPack: DomainPack): CF14Ontology {
  // Deep clone core ontology
  const merged = JSON.parse(JSON.stringify(coreOntology))

  // Update registry to include domain
  if (!merged.ontology_registry.domains_supported.includes(domainPack.domain)) {
    merged.ontology_registry.domains_supported.push(domainPack.domain)
  }

  // Merge axiomatic matrices
  if (domainPack.axiomatic_matrices) {
    Object.entries(domainPack.axiomatic_matrices).forEach(([name, matrix]) => {
      const existingComponent = merged.components.find(c => c.name === name)
      if (existingComponent) {
        existingComponent.cells = matrix.cells
        existingComponent.domain_specific = true
        existingComponent.domain = domainPack.domain
      }
    })
  }

  // Merge graph extensions
  if (domainPack.graph_extensions) {
    if (domainPack.graph_extensions.additional_node_types) {
      merged.graph_schema.node_types.push(...domainPack.graph_extensions.additional_node_types)
    }
    if (domainPack.graph_extensions.additional_relationships) {
      merged.graph_schema.relationships.push(...domainPack.graph_extensions.additional_relationships)
    }
  }

  return merged
}

export async function POST(request: NextRequest) {
  try {
    const { domain_pack_path, validate_only = false } = await request.json()

    if (!domain_pack_path) {
      return NextResponse.json({ error: 'Missing domain_pack_path parameter' }, { status: 400 })
    }

    // Load core ontology
    const coreOntology = await loadCoreOntology()

    // Load domain pack
    const domainPack = await loadDomainPack(domain_pack_path)

    // Validate compatibility
    const validation = validateDomainPack(domainPack, coreOntology)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: `Domain pack validation failed: ${validation.errors.join(', ')}`,
        errors: validation.errors
      }, { status: 400 })
    }

    if (validate_only) {
      return NextResponse.json({ 
        valid: true, 
        domain: domainPack.domain,
        compatible_with: coreOntology.id,
        domain_pack_id: domainPack.id
      })
    }

    // Merge ontologies
    const mergedOntology = mergeOntologyWithDomain(coreOntology, domainPack)

    return NextResponse.json({ 
      success: true,
      merged_ontology: mergedOntology,
      domain: domainPack.domain,
      domain_pack_id: domainPack.id,
      core_ontology_id: coreOntology.id
    })

  } catch (error) {
    console.error('Domain pack error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (domain) {
      // Return domain-specific components
      try {
        const domainPackPath = `ontology/domains/${domain}/cf14.domain.${domain}.v1.0.json`
        const domainPack = await loadDomainPack(domainPackPath)
        return NextResponse.json({ 
          domain_pack: domainPack,
          path: domainPackPath
        })
      } catch (error) {
        return NextResponse.json({ 
          error: `Domain pack not found for domain: ${domain}`,
          suggested_path: `ontology/domains/${domain}/cf14.domain.${domain}.v1.0.json`
        }, { status: 404 })
      }
    }

    // Return list of available domains
    const coreOntology = await loadCoreOntology()
    return NextResponse.json({ 
      available_domains: coreOntology.ontology_registry.domains_supported,
      ontology_version: coreOntology.version,
      ontology_id: coreOntology.id
    })

  } catch (error) {
    console.error('Domain query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}