'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface MatrixProgress {
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  operation: string
  description: string
  cf14_version?: string
  station?: string
}

interface InstantiationResult {
  matrix_id: string
  operation: string
  current_cell: string
  result: string
  progress: number
}

export default function InstantiatePage() {
  const [problemStatement, setProblemStatement] = useState('')
  const [domainContext, setDomainContext] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [matrices, setMatrices] = useState<MatrixProgress[]>([
    { name: 'Matrix C (Requirements)', status: 'pending', operation: 'A * B = C', description: 'Problem Statement × Decision Framework → Requirements', station: 'Requirements', cf14_version: '2.1.1' },
    { name: 'Matrix J (Truncated Decisions)', status: 'pending', operation: 'J = B[1:3]', description: 'First 3 rows of Decision Framework', station: 'Objectives', cf14_version: '2.1.1' },
    { name: 'Matrix F (Objectives)', status: 'pending', operation: 'J ⊙ C = F', description: 'Element-wise: Truncated Decisions ⊙ Requirements → Objectives', station: 'Objectives', cf14_version: '2.1.1' },
    { name: 'Matrix D (Solution Objectives)', status: 'pending', operation: 'A + F = D', description: 'Problem Statement + Objectives → Solution Objectives', station: 'Objectives', cf14_version: '2.1.1' }
  ])
  const [currentResult, setCurrentResult] = useState<InstantiationResult | null>(null)
  const [completedMatrices, setCompletedMatrices] = useState<string[]>([])
  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState<string | null>(null)

  const domains = [
    'software_engineering',
    'business_strategy',
    'research_methods',
    'academic_research',
    'technical_design',
    'policy_development',
    'product_development',
    'scientific_analysis'
  ]

  const domainDisplayNames: Record<string, string> = {
    'software_engineering': 'Software Engineering',
    'business_strategy': 'Business Strategy',
    'research_methods': 'Research Methods',
    'academic_research': 'Academic Research',
    'technical_design': 'Technical Design',
    'policy_development': 'Policy Development',
    'product_development': 'Product Development',
    'scientific_analysis': 'Scientific Analysis'
  }

  const handleDomainToggle = (domain: string) => {
    setDomainContext(prev => {
      const contexts = prev.split(', ').filter(Boolean)
      const displayName = domainDisplayNames[domain] || domain
      if (contexts.includes(displayName)) {
        return contexts.filter(c => c !== displayName).join(', ')
      } else {
        return [...contexts, displayName].join(', ')
      }
    })
  }

  const handleCleanSetup = async () => {
    try {
      setCleaning(true)
      setCleanMsg(null)
      const res = await fetch('/api/neo4j/clean-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'cf14', recreateStations: true })
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
      const data = JSON.parse(text)
      setCleanMsg(`Cleaned CF14 graph: deleted ${data.deletedCount} nodes`)
      console.log('[Clean Setup] success:', data)
    } catch (e: any) {
      const msg = e?.message || String(e)
      setCleanMsg(`Clean failed: ${msg}`)
      console.error('[Clean Setup] error:', msg)
    } finally {
      setCleaning(false)
    }
  }

  const startInstantiation = async () => {
    if (!problemStatement.trim()) return

    setIsProcessing(true)
    setCurrentResult(null)
    setCompletedMatrices([])

    try {
      // Reset matrix status
      setMatrices(prev => prev.map(m => ({ ...m, status: 'pending' })))

      // Step 0: Clean database (ensures clean slate - no duplicate matrices)
      try {
        const res = await fetch('/api/neo4j/clean-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'cf14', recreateStations: true })
        })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          console.warn('[Clean Setup] non-OK:', res.status, t)
        } else {
          console.log('[Clean Setup] success')
        }
      } catch (e) {
        console.warn('[Clean Setup] failed but continuing:', e)
      }

      // Step 0.5: Ensure axiom matrices A and B exist
      try {
        const aResponse = await fetch('/api/neo4j/ingest-ufo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: "2.1.1",
            topic: "generating reliable knowledge",
            created_at: new Date().toISOString(),
            components: [{
              id: "A",
              kind: "matrix",
              station: "Problem Statement",
              name: "Matrix A (Problem Statement)",
              axes: [
                { name: "rows", labels: ["Normative", "Operative", "Evaluative"] },
                { name: "cols", labels: ["Necessity", "Sufficiency", "Completeness", "Consistency"] }
              ],
              shape: [3, 4],
              ontology: { operation: "axiom", ufo_type: "Endurant", domain: "general" },
              data: [
                [
                  { resolved: "Direction", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Implementation", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Evaluation", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Assessment", raw_terms: [], intermediate: [], operation: "axiom" }
                ],
                [
                  { resolved: "Leadership", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Execution", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Decision-making", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Quality Control", raw_terms: [], intermediate: [], operation: "axiom" }
                ],
                [
                  { resolved: "Standards", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Performance", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Feedback", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Refinement", raw_terms: [], intermediate: [], operation: "axiom" }
                ]
              ]
            }],
            meta: { source: "instantiate_setup", cf14_version: "2.1.1" }
          })
        })
        
        const bResponse = await fetch('/api/neo4j/ingest-ufo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: "2.1.1",
            topic: "generating reliable knowledge",
            created_at: new Date().toISOString(),
            components: [{
              id: "B",
              kind: "matrix",
              station: "Problem Statement",
              name: "Matrix B (Decision Framework)",
              axes: [
                { name: "rows", labels: ["Necessity", "Sufficiency", "Completeness", "Consistency"] },
                { name: "cols", labels: ["Necessity", "Sufficiency", "Completeness", "Consistency"] }
              ],
              shape: [4, 4],
              ontology: { operation: "axiom", ufo_type: "Endurant", domain: "general" },
              data: [
                [
                  { resolved: "Essential Facts", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Adequate Inputs", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Comprehensive Records", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Reliable Records", raw_terms: [], intermediate: [], operation: "axiom" }
                ],
                [
                  { resolved: "Critical Context", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Sufficient Detail", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Holistic View", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Congruent Patterns", raw_terms: [], intermediate: [], operation: "axiom" }
                ],
                [
                  { resolved: "Fundamental Understanding", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Adequate Insight", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Full Comprehension", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Coherent Framework", raw_terms: [], intermediate: [], operation: "axiom" }
                ],
                [
                  { resolved: "Vital Judgment", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Sound Reasoning", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Thorough Prudence", raw_terms: [], intermediate: [], operation: "axiom" },
                  { resolved: "Harmonious Principles", raw_terms: [], intermediate: [], operation: "axiom" }
                ]
              ]
            }],
            meta: { source: "instantiate_setup", cf14_version: "2.1.1" }
          })
        })
        
        if (aResponse.ok && bResponse.ok) {
          console.log('[Axiom Setup] A and B matrices established')
        }
      } catch (e) {
        console.warn('[Axiom Setup] failed:', e)
      }

      // Step 1: Generate Matrix C (A * B = C) using CF14 v2.1.1
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix C') ? { ...m, status: 'processing' } : m
      ))

      const selectedDomain = domains.find(d => domainContext.includes(domainDisplayNames[d] || d))
      const domainPackPath = selectedDomain ? `ontology/domains/${selectedDomain}/cf14.domain.${selectedDomain}.v1.0.json` : undefined

      const matrixCResponse = await fetch('/api/neo4j/instantiate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'semantic-matrix-c',
          problem_statement: problemStatement,
          domain_context: domainContext,
          domain_pack_path: domainPackPath,
          cf14_version: '2.1.1'
        })
      })

      if (!matrixCResponse.ok) {
        throw new Error('Failed to generate Matrix C')
      }

      const matrixCResult = await matrixCResponse.json()
      console.log('[Matrix C] Generated with automatic canonical ID enforcement')
      setCompletedMatrices(prev => [...prev, 'C'])
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix C') ? { ...m, status: 'completed' } : m
      ))

      // Step 2: Generate Matrix J (Truncated B)
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix J') ? { ...m, status: 'processing' } : m
      ))

      const matrixJResult = { component_id: 'matrix_J_truncated' } // J is computed from B directly
      setCompletedMatrices(prev => [...prev, matrixJResult.component_id])
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix J') ? { ...m, status: 'completed' } : m
      ))

      // Step 3: Generate Matrix F (J ⊙ C = F)
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix F') ? { ...m, status: 'processing' } : m
      ))

      const fUrl = '/api/neo4j/compute/f'
      const fInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idC: 'C', idB: 'B' })
      }
      const matrixFResponse = await fetch(fUrl, fInit)

      if (!matrixFResponse.ok) {
        const status = matrixFResponse.status
        let bodyText = ''
        try { bodyText = await matrixFResponse.text() } catch {}
        const msg = `Failed to generate Matrix F (HTTP ${status})` + (bodyText ? ` — ${bodyText}` : '')
        console.error('[Matrix F] request failed:', { url: fUrl, status, bodyText })
        throw new Error(msg)
      }

      const matrixFResult = await matrixFResponse.json()
      console.log('[Matrix F] success:', matrixFResult)
      setCompletedMatrices(prev => [...prev, matrixFResult.component_id || 'F'])
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix F') ? { ...m, status: 'completed' } : m
      ))

      // Step 4: Generate Matrix D (A + F = D)
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix D') ? { ...m, status: 'processing' } : m
      ))

      const matrixDResponse = await fetch('/api/neo4j/instantiate-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'semantic-matrix-d',
          problem_statement: problemStatement,
          domain_context: domainContext,
          domain_pack_path: domainPackPath,
          cf14_version: '2.1.1'
        })
      })

      if (!matrixDResponse.ok) {
        throw new Error('Failed to generate Matrix D')
      }

      const matrixDResult = await matrixDResponse.json()
      setCompletedMatrices(prev => [...prev, matrixDResult.component_id || 'D'])
      setMatrices(prev => prev.map(m => 
        m.name.includes('Matrix D') ? { ...m, status: 'completed' } : m
      ))

      setCurrentResult({
        matrix_id: 'domain_instantiated_v2_1_1',
        operation: 'Complete CF14 v2.1.1 Framework Application',
        current_cell: 'All matrices generated through Objectives station',
        result: `Domain successfully instantiated with CF14 v2.1.1${selectedDomain ? ` using ${domainDisplayNames[selectedDomain]} domain pack` : ''}`,
        progress: 100
      })

    } catch (error) {
      console.error('CF14 v2.1.1 Instantiation error:', error)
      setMatrices(prev => prev.map(m => 
        m.status === 'processing' ? { ...m, status: 'error' } : m
      ))
      setCurrentResult({
        matrix_id: 'error',
        operation: 'Error in CF14 v2.1.1 Application',
        current_cell: 'Process failed',
        result: `Error: ${error.message}`,
        progress: 0
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusIcon = (status: MatrixProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <Circle className="h-5 w-5 text-red-500" />
      case 'pending':
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const overallProgress = (matrices.filter(m => m.status === 'completed').length / matrices.length) * 100

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">CF14 v2.1.1 Domain Instantiation</h1>
        <p className="text-gray-600">Apply the Chirality Framework v2.1.1 to your specific problem domain</p>
        <div className="text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-1 inline-block">
          Enhanced with Array P/H support, domain packs, and UFO annotations
        </div>
      </div>

      {/* Clean CF Graph Button */}
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleCleanSetup}
          disabled={cleaning || isProcessing}
          variant="outline"
          size="sm"
          className="bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700"
        >
          {cleaning ? 'Cleaning...' : 'Clean CF Graph'}
        </Button>
        {cleanMsg && (
          <span className="text-sm text-gray-600">{cleanMsg}</span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Define Your Problem Domain</CardTitle>
          <CardDescription>
            Describe the problem you want to analyze using the Chirality Framework
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Problem Statement</label>
            <Textarea
              placeholder="e.g., How do we generate reliable knowledge from large language models?"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="min-h-[100px]"
              disabled={isProcessing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Domain Context (optional)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {domains.map((domain) => {
                const displayName = domainDisplayNames[domain] || domain
                return (
                  <Badge
                    key={domain}
                    variant={domainContext.includes(displayName) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => !isProcessing && handleDomainToggle(domain)}
                  >
                    {displayName}
                  </Badge>
                )
              })}
            </div>
            <Textarea
              placeholder="Additional context about your domain..."
              value={domainContext}
              onChange={(e) => setDomainContext(e.target.value)}
              className="min-h-[60px]"
              disabled={isProcessing}
            />
          </div>

          <Button 
            onClick={startInstantiation}
            disabled={!problemStatement.trim() || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying Framework...
              </>
            ) : (
              'Start Instantiation'
            )}
          </Button>
        </CardContent>
      </Card>

      {(isProcessing || completedMatrices.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>CF14 v2.1.1 Framework Application Progress</CardTitle>
            <CardDescription>
              Generating semantic matrices through Problem Statement → Requirements → Objectives stations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={overallProgress} className="w-full" />
            
            <div className="space-y-3">
              {matrices.map((matrix, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                  {getStatusIcon(matrix.status)}
                  <div className="flex-1">
                    <div className="font-medium">{matrix.name}</div>
                    <div className="text-sm text-gray-500">{matrix.operation}</div>
                    <div className="text-xs text-gray-400">{matrix.description}</div>
                    {matrix.station && (
                      <div className="text-xs text-blue-500">Station: {matrix.station}</div>
                    )}
                  </div>
                  {matrix.status === 'completed' && (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Complete
                    </Badge>
                  )}
                  {matrix.status === 'error' && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      Error
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {currentResult && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="font-medium text-green-800">✓ {currentResult.operation}</div>
                <div className="text-sm text-green-600">{currentResult.result}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {completedMatrices.length === matrices.length && completedMatrices.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-green-800">
                CF14 v2.1.1 Domain Successfully Instantiated!
              </h3>
              <p className="text-green-600">
                Your problem domain has been processed through CF14 v2.1.1 (Problem Statement → Requirements → Objectives).
                Enhanced with domain pack support and UFO annotations.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/chat'}>
                  Chat with Framework
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/matrices">View Matrices</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}