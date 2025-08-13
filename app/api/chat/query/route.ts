import { NextRequest, NextResponse } from 'next/server';
import { neo4jDriver } from '@/lib/neo4j';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QueryContext {
  matrices: any[];
  relevant_cells: any[];
  query_intent: string;
  problem_context: string;
}

export async function POST(request: NextRequest) {
  const session = neo4jDriver.session();
  
  try {
    const body = await request.json();
    const { message, conversation_history } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Step 1: Analyze query intent and extract relevant keywords
    const keywords = extractKeywords(message);
    const intent = analyzeIntent(message, keywords);

    // Step 2: Query Neo4j for relevant matrix data
    const context = await queryRelevantData(session, keywords, intent);

    // Step 3: Generate response based on Neo4j data
    const response = await generateResponse(message, context, conversation_history);

    return NextResponse.json({
      response: response.content,
      matrices_referenced: response.matrices_referenced,
      neo4j_queries: context.matrices.length,
      confidence: response.confidence,
      intent: intent
    });

  } catch (error) {
    console.error('Chat query error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat query' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

function extractKeywords(message: string): string[] {
  // Extract key terms that might relate to framework concepts
  const frameworkTerms = [
    'requirements', 'objectives', 'solution', 'matrix', 'decisions',
    'normative', 'operative', 'evaluative', 'data', 'information', 'knowledge', 'wisdom',
    'direction', 'leadership', 'standards', 'implementation', 'execution', 'performance',
    'evaluation', 'decision-making', 'feedback', 'assessment', 'quality', 'refinement',
    'necessity', 'sufficiency', 'completeness', 'consistency', 'guiding', 'applying', 'judging', 'reviewing'
  ];

  const words = message.toLowerCase().split(/\s+/);
  return frameworkTerms.filter(term => 
    words.some(word => word.includes(term) || term.includes(word))
  );
}

function analyzeIntent(message: string, keywords: string[]): string {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('what') || messageLower.includes('show')) {
    return 'information_request';
  } else if (messageLower.includes('how') || messageLower.includes('why')) {
    return 'explanation_request';
  } else if (messageLower.includes('compare') || messageLower.includes('difference')) {
    return 'comparison_request';
  } else if (messageLower.includes('matrix') && (messageLower.includes('cell') || messageLower.includes('element'))) {
    return 'matrix_lookup';
  } else {
    return 'general_query';
  }
}

async function queryRelevantData(session: any, keywords: string[], intent: string): Promise<QueryContext> {
  try {
    // Step 1: Get the instantiated problem statement for context
    const problemStatementResult = await session.run(`
      MATCH (doc:Document)
      RETURN doc.topic as topic, doc.created_at as created_at
      ORDER BY doc.created_at DESC
      LIMIT 1
    `);

    let problemContext = "knowledge domain instantiation";
    if (problemStatementResult.records.length > 0) {
      problemContext = problemStatementResult.records[0].get('topic') || problemContext;
    }

    // Step 2: Query for comprehensive cell-level knowledge
    let cellsResult;
    if (keywords.length > 0) {
      const keywordPattern = keywords.join('|');
      cellsResult = await session.run(`
        MATCH (c:Component)-[:AT_STATION]->(s:Station)
        MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:CONTAINS_TERM]->(term:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        WHERE cell.resolved =~ '(?i).*(${keywordPattern}).*'
           OR (term IS NOT NULL AND (term.resolved =~ '(?i).*(${keywordPattern}).*' OR term.raw =~ '(?i).*(${keywordPattern}).*'))
        WITH c, s, cell, collect(DISTINCT term) as terms, collect(DISTINCT axis) as axes
        RETURN c.id as component_id, c.name as component_name, 
               c.station as station, s.name as station_name,
               c.ontology as component_ontology,
               cell.position as position, cell.resolved as resolved, 
               cell.raw_terms as raw_terms, cell.operation as operation,
               cell.notes as cell_notes,
               terms, axes
        ORDER BY c.station, c.id
        LIMIT 15
      `);
    } else {
      // Get comprehensive cell data for general queries
      cellsResult = await session.run(`
        MATCH (c:Component)-[:AT_STATION]->(s:Station)
        MATCH (c)-[:HAS_CELL]->(cell:Cell)
        OPTIONAL MATCH (cell)-[:CONTAINS_TERM]->(term:Term)
        OPTIONAL MATCH (c)-[:HAS_AXIS]->(axis:Axis)
        WITH c, s, cell, collect(DISTINCT term) as terms, collect(DISTINCT axis) as axes
        RETURN c.id as component_id, c.name as component_name, 
               c.station as station, s.name as station_name,
               c.ontology as component_ontology,
               cell.position as position, cell.resolved as resolved, 
               cell.raw_terms as raw_terms, cell.operation as operation,
               cell.notes as cell_notes,
               terms, axes
        ORDER BY c.station, c.id
        LIMIT 20
      `);
    }

    const relevant_cells = cellsResult.records.map(record => {
      const terms = record.get('terms') || [];
      return {
        component_id: record.get('component_id'),
        component_name: record.get('component_name'),
        station: record.get('station'),
        station_name: record.get('station_name'),
        component_ontology: record.get('component_ontology'),
        position: record.get('position') || 'unknown',
        resolved: record.get('resolved'),
        raw_terms: record.get('raw_terms'),
        operation: record.get('operation'),
        cell_notes: record.get('cell_notes'),
        terms: terms.map(term => ({
          resolved: term?.resolved,
          raw: term?.raw
        })),
        axes: record.get('axes')
      };
    });

    // Step 3: Get matrix structure for context
    const matricesResult = await session.run(`
      MATCH (c:Component)-[:AT_STATION]->(s:Station)
      RETURN DISTINCT c.id as id, c.name as name, c.station as station, 
             s.name as station_name, c.shape as shape, c.ontology as ontology
      ORDER BY c.station, c.name
    `);

    const matrices = matricesResult.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      station: record.get('station'),
      station_name: record.get('station_name'),
      shape: record.get('shape'),
      ontology: record.get('ontology')
    }));

    return {
      matrices,
      relevant_cells,
      query_intent: intent,
      problem_context: problemContext
    };

  } catch (error) {
    console.error('Neo4j query error:', error);
    return {
      matrices: [],
      relevant_cells: [],
      query_intent: intent,
      problem_context: "knowledge domain instantiation"
    };
  }
}

async function generateResponse(message: string, context: QueryContext, history: Message[]): Promise<{
  content: string;
  matrices_referenced: string[];
  confidence: number;
}> {
  const { matrices, relevant_cells, query_intent, problem_context } = context;

  if (matrices.length === 0) {
    return {
      content: "I don't have access to any instantiated framework data yet. Please instantiate a domain first using the Domain Instantiation interface.",
      matrices_referenced: [],
      confidence: 0.9
    };
  }

  // Use OpenAI to generate contextual response with deep cell-level knowledge
  const response = await generateLLMResponse(message, context, history);
  
  const referencedMatrices = [...new Set(relevant_cells.map(cell => cell.component_id))];

  return {
    content: response.content,
    matrices_referenced: referencedMatrices,
    confidence: response.confidence
  };
}

async function generateLLMResponse(message: string, context: QueryContext, history: Message[]): Promise<{
  content: string;
  confidence: number;
}> {
  const { relevant_cells, problem_context, matrices } = context;
  
  try {
    // Build comprehensive knowledge context for LLM
    const cellsContext = relevant_cells.map(cell => ({
      matrix: cell.component_name,
      station: cell.station_name,
      position: cell.position,
      content: cell.resolved,
      operation: cell.operation,
      raw_terms: cell.raw_terms,
      notes: cell.cell_notes,
      ontology: cell.component_ontology
    }));

    const knowledgeContext = {
      problem_statement: problem_context,
      framework_operations: {
        "A × B = C": "Problem Statement × Decisions → Requirements",
        "J × C = F": "Judgment × Requirements → Objectives", 
        "A + F = D": "Problem Statement + Objectives → Solutions"
      },
      instantiated_knowledge: cellsContext,
      matrices_structure: matrices.map(m => ({
        name: m.name,
        station: m.station_name,
        ontology: m.ontology
      }))
    };

    const systemPrompt = `You are an expert assistant analyzing an instantiated Chirality Framework for the problem: "${problem_context}".

## THE CHIRALITY FRAMEWORK

The Chirality Framework is a meta-ontological, system-agnostic methodology for mapping the solution space to a problem statement in the context of knowledge work. It creates a structured set of semantic relationships that have coherent meaning across the problem solving process and can be used as "semantic anchors" to guide analysis across stages of solving a problem, traversing a "semantic valley".

### Semantic Valley Progression
The framework follows this logical progression:
Problem Statement → Requirements → Objectives → Verification → Validation → Evaluation → Assessment → Implementation → Reflection → Resolution

### Semantic Operations
**Semantic Multiplication (*)**: Combines meanings into a coherent concept representing the semantic intersection of terms.
Examples: 'sufficient' * 'reason' = 'justification', 'analysis' * 'judgment' = 'informed decision'

**Semantic Addition (+)**: Concatenates words or sentence fragments to form longer statements.

### Core Matrix Operations
1. **A × B = C**: Problem Statement (3×4) × Decisions (4×4) → Requirements (3×4)
2. **J(i,j) × C(i,j) = F(i,j)**: Element-wise multiplication of Judgment (3×4) × Requirements → Objectives  
3. **D(i,j) = A(i,j) + 'applied to frame the problem;' + F(i,j) + 'to resolve the problem.'**

### Axiomatic Matrices
**Matrix A (Problem Statement)**: 3×4 matrix with rows [Normative, Operative, Evaluative] and columns [Guiding, Applying, Judging, Reviewing]. Elements: Direction/Leadership/Standards, Implementation/Execution/Performance, Evaluation/Decision-making/Feedback, Assessment/Quality Control/Refinement.

**Matrix B (Decisions)**: 4×4 matrix with rows [Data, Information, Knowledge, Wisdom] and columns [Necessity, Sufficiency, Completeness, Consistency].

**Matrix J (Judgment)**: Truncated 3×4 version of Matrix B (removing Wisdom row).

Your role is to:
1. Apply deep Chirality Framework expertise to analyze instantiated knowledge
2. Reference specific matrix elements and their ontological meanings
3. Show understanding of semantic operations and the semantic valley progression
4. Generate insights grounded in both framework theory and actual cell content
5. Connect user questions to specific matrix positions and semantic relationships

Use the instantiated knowledge to provide expert-level responses that demonstrate mastery of the Chirality Framework methodology.`;

    const userPrompt = `Knowledge Context: ${JSON.stringify(knowledgeContext, null, 2)}

User Question: "${message}"

Please provide a detailed response that:
1. References specific instantiated knowledge from the cells
2. Shows understanding of the semantic operations and relationships
3. Connects the user's question to the actual framework content
4. Provides actionable insights based on the instantiated knowledge
5. Uses specific cell positions and content in your reasoning`;

    // Using OpenAI Responses API (2025) instead of Chat Completions
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        instructions: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        store: true
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API failed: ${openaiResponse.statusText}`);
    }

    const openaiResult = await openaiResponse.json();
    const generatedContent = openaiResult.content;

    if (generatedContent) {
      return {
        content: generatedContent,
        confidence: 0.9
      };
    }
    
    throw new Error('No content generated from OpenAI');

  } catch (error) {
    console.error('LLM generation error:', error);
    
    // Fallback to structured response with actual cell content
    return generateStructuredFallback(message, context);
  }
}

function generateStructuredFallback(message: string, context: QueryContext): {
  content: string;
  confidence: number;
} {
  const { relevant_cells, problem_context } = context;
  
  let response = `Based on your instantiated Chirality Framework for "${problem_context}", here's what I found:\n\n`;
  
  if (relevant_cells.length > 0) {
    response += `**Relevant Knowledge Elements:**\n`;
    relevant_cells.slice(0, 4).forEach((cell, i) => {
      response += `${i + 1}. **${cell.component_name}** (${cell.station_name})\n`;
      response += `   • Position: ${cell.position}\n`;
      response += `   • Content: ${cell.resolved}\n`;
      if (cell.operation) {
        response += `   • Generated via: ${cell.operation === '*' ? 'Semantic Multiplication' : 'Semantic Addition'}\n`;
      }
      response += `\n`;
    });
  }
  
  response += `This knowledge was systematically generated through the Chirality Framework's semantic operations for your specific problem domain.`;
  
  return {
    content: response,
    confidence: 0.7
  };
}

function generateInformationResponse(cells: any[], matrices: any[]): string {
  if (cells.length === 0) {
    return `I have access to ${matrices.length} matrices in your framework: ${matrices.map(m => m.name).join(', ')}. What specific information would you like to know about?`;
  }

  const cellsByMatrix = groupCellsByMatrix(cells);
  let response = "Based on your instantiated framework, here's the relevant information:\n\n";

  Object.entries(cellsByMatrix).forEach(([matrixName, matrixCells]) => {
    response += `**${matrixName}:**\n`;
    matrixCells.slice(0, 3).forEach((cell: any) => {
      response += `- ${cell.resolved}\n`;
    });
    response += '\n';
  });

  return response;
}

function generateExplanationResponse(cells: any[], matrices: any[], message: string): string {
  if (cells.length === 0) {
    return "I'd be happy to explain concepts from your framework. Could you be more specific about which aspect you'd like me to explain?";
  }

  const relevantCell = cells[0];
  let response = `Let me explain this concept from your ${relevantCell.component_name}:\n\n`;
  response += `**${relevantCell.resolved}**\n\n`;
  
  if (relevantCell.operation) {
    response += `This was generated through ${relevantCell.operation === '*' ? 'semantic multiplication' : 'semantic addition'} `;
    response += `using the framework's systematic approach. `;
  }

  if (relevantCell.raw_terms && Array.isArray(relevantCell.raw_terms)) {
    response += `The underlying concepts are: ${relevantCell.raw_terms.join(' and ')}.`;
  }

  return response;
}

function generateComparisonResponse(cells: any[], matrices: any[]): string {
  if (cells.length < 2) {
    return "I need more data points to make a meaningful comparison. Could you be more specific about what you'd like me to compare?";
  }

  const cellsByMatrix = groupCellsByMatrix(cells);
  
  if (Object.keys(cellsByMatrix).length > 1) {
    let response = "Here's a comparison across your framework matrices:\n\n";
    
    Object.entries(cellsByMatrix).forEach(([matrixName, matrixCells]) => {
      response += `**${matrixName}:**\n`;
      response += `- ${matrixCells[0].resolved}\n\n`;
    });
    
    return response;
  } else {
    let response = "Comparing elements within the same matrix:\n\n";
    cells.slice(0, 3).forEach((cell, index) => {
      response += `${index + 1}. ${cell.resolved}\n`;
    });
    return response;
  }
}

function generateMatrixLookupResponse(cells: any[], matrices: any[], message: string): string {
  // Extract potential matrix/cell references from the message
  const matrixMatch = message.match(/matrix\s*([a-z])/i);
  const cellMatch = message.match(/\((\d+),(\d+)\)/);

  if (matrixMatch && cellMatch) {
    const targetMatrix = matrixMatch[1].toUpperCase();
    const [, row, col] = cellMatch;
    
    const relevantCell = cells.find(cell => 
      cell.component_id.includes(targetMatrix) || 
      cell.component_name.includes(targetMatrix)
    );

    if (relevantCell) {
      return `Matrix ${targetMatrix}(${row},${col}): ${relevantCell.resolved}`;
    }
  }

  // Fallback to general matrix information
  if (cells.length > 0) {
    return `Here's information from ${cells[0].component_name}: ${cells[0].resolved}`;
  }

  return `I have the following matrices available: ${matrices.map(m => m.name).join(', ')}. Please specify which matrix and cell you'd like to examine.`;
}

function generateGeneralResponse(cells: any[], matrices: any[], message: string): string {
  // Check if question is about datasheet/framework structure
  if (message.toLowerCase().includes('datasheet') || message.toLowerCase().includes('defining') || message.toLowerCase().includes('instantiate')) {
    return generateDatasheetResponse(cells, matrices);
  }
  
  if (cells.length > 0) {
    const randomCell = cells[Math.floor(Math.random() * Math.min(cells.length, 3))];
    return `From your framework, this might be relevant: ${randomCell.resolved}\n\nThis comes from ${randomCell.component_name} and was generated through ${randomCell.operation === '*' ? 'semantic multiplication' : 'semantic addition'}.`;
  }

  return '';
}

function generateDatasheetResponse(cells: any[], matrices: any[]): string {
  const matrixSummary = matrices.map(m => `• **${m.name}** (${m.station})`).join('\n');
  
  let response = `Based on your instantiated Chirality Framework for "generating a datasheet for defining problem statements," here's the framework structure:\n\n`;
  response += `**Available Knowledge Matrices:**\n${matrixSummary}\n\n`;
  
  if (cells.length > 0) {
    response += `**Key Framework Elements:**\n`;
    cells.slice(0, 3).forEach((cell, i) => {
      response += `${i + 1}. ${cell.resolved} (${cell.component_name})\n`;
    });
    response += `\n`;
  }
  
  response += `**Framework Operations Applied:**\n`;
  response += `• A × B = C (Problem Statement × Decisions → Requirements)\n`;
  response += `• J × C = F (Judgment × Requirements → Objectives)\n`;
  response += `• A + F = D (Problem Statement + Objectives → Solutions)\n\n`;
  
  response += `This systematic approach helps structure the problem of creating datasheets for knowledge domain instantiation.`;
  
  return response;
}

function generateFallbackResponse(matrices: any[]): string {
  return `I have access to your instantiated framework with ${matrices.length} matrices: ${matrices.map(m => m.name).join(', ')}. Could you rephrase your question or ask about specific requirements, objectives, or solutions?`;
}

function groupCellsByMatrix(cells: any[]): { [key: string]: any[] } {
  return cells.reduce((acc, cell) => {
    const matrixName = cell.component_name || cell.component_id;
    if (!acc[matrixName]) {
      acc[matrixName] = [];
    }
    acc[matrixName].push(cell);
    return acc;
  }, {});
}