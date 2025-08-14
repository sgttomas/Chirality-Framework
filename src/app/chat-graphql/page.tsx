'use client';

import Assistant from '@/components/assistant';
import { apolloClient } from '@/lib/apollo';
import { CREATE_CHAT_SESSION, ADD_CHAT_MESSAGE } from '@/graphql/queries/chat';
import { LATEST_BY_STATION } from '@/graphql/queries/matrix';
import * as React from 'react';

export default function GraphQLChatPage() {
  // Keep one session per page lifetime (you can scope differently)
  const sessionIdRef = React.useRef<string | null>(null);

  async function ensureSession(): Promise<string> {
    if (sessionIdRef.current) return sessionIdRef.current;
    
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_CHAT_SESSION,
        variables: { input: { name: 'GraphQL Chat Session', meta: { source: 'web' } } },
      });
      const id = data?.createChatSession?.id as string;
      if (!id) throw new Error('Failed to create chat session');
      sessionIdRef.current = id;
      return id;
    } catch (error) {
      console.error('Failed to create session:', error);
      // For demo purposes, create a fallback session ID
      const fallbackId = `session_${Date.now()}`;
      sessionIdRef.current = fallbackId;
      return fallbackId;
    }
  }

  function summarizeMatrix(c: any): string {
    if (!c) return 'I could not find a matrix to ground the answer.';
    const rows = c.rowLabels as string[];
    const cols = c.colLabels as string[];
    const head = `Found ${c.name ?? 'a component'} at station ${c.station}.`;
    
    // Take first row as a compact sample
    const r0 = c.cells?.filter((x: any) => x.row === 0).sort((a: any, b: any) => a.col - b.col) ?? [];
    const cells0 = r0.slice(0, Math.min(4, r0.length)).map((x: any, i: number) => `${cols[i]}: ${x.resolved}`);
    const preview = cells0.length ? `Row "${rows[0]}": ${cells0.join(' | ')}` : 'No cells available.';
    
    return `${head}\n${preview}`;
  }

  // Station helpers: human label <-> GraphQL enum
  const toStationEnum = (label: string): string => {
    const map: Record<string, string> = {
      'requirements': 'REQUIREMENTS',
      'objectives': 'OBJECTIVES',
      'verification': 'VERIFICATION',
      'validation': 'VALIDATION',
      'evaluation': 'EVALUATION',
      'problem statement': 'PROBLEM_STATEMENT'
    };
    return map[label.toLowerCase()] ?? 'REQUIREMENTS';
  };

  const detectStationLabel = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    if (lower.includes('requirement') || lower.includes('spec')) return 'Requirements';
    if (lower.includes('objective') || lower.includes('goal')) return 'Objectives';
    if (lower.includes('problem') || lower.includes('statement')) return 'Problem Statement';
    if (lower.includes('verification') || lower.includes('verify')) return 'Verification';
    if (lower.includes('validation') || lower.includes('validate')) return 'Validation';
    if (lower.includes('evaluate') || lower.includes('evaluation')) return 'Evaluation';
    return 'Requirements'; // Default station
  };

  async function _onAsk(prompt: string): Promise<string> {
    const sessionId = await ensureSession();

    try {
      // 1) log USER message (gracefully handle if GraphQL service isn't running)
      try {
        await apolloClient.mutate({
          mutation: ADD_CHAT_MESSAGE,
          variables: { input: { sessionId, content: prompt, role: 'USER', meta: { ui: 'assistant' } } },
        });
      } catch (error) {
        console.warn('Failed to log user message:', error);
      }

      // 2) retrieve something meaningful from the graph
      const stationLabel = detectStationLabel(prompt);
      const stationEnum = toStationEnum(stationLabel);
      
      // First try GraphQL, fall back to REST if needed
      let component = null;
      try {
        const { data } = await apolloClient.query({
          query: LATEST_BY_STATION,
          variables: { station: stationEnum },
          fetchPolicy: 'network-only',
        });
        component = data?.latestComponentByStation;
      } catch (graphqlError) {
        console.warn('GraphQL query failed, falling back to REST:', graphqlError);
        
        // Fallback to REST API
        try {
          const response = await fetch('/api/neo4j/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query_type: 'get_latest_matrix_by_station',
              station: stationLabel  // REST uses human-readable labels
            })
          });
          const json = await response.json();
          if (json.success && json.component) {
            // Transform REST response to match GraphQL structure
            const restComponent = json.component;
            component = {
              id: restComponent.id,
              name: restComponent.name,
              station: restComponent.station,
              shape: restComponent.shape,
              rowLabels: restComponent.axes?.[0]?.labels || [],
              colLabels: restComponent.axes?.[1]?.labels || [],
              cells: []
            };
            
            // Convert nested data to normalized cells
            for (let row = 0; row < restComponent.data.length; row++) {
              for (let col = 0; col < restComponent.data[row].length; col++) {
                const cellData = restComponent.data[row][col];
                if (cellData) {
                  component.cells.push({
                    row,
                    col,
                    resolved: cellData.resolved || cellData.value || cellData,
                    rawTerms: cellData.raw_terms || [],
                    intermediate: cellData.intermediate || []
                  });
                }
              }
            }
          }
        } catch (restError) {
          console.error('Both GraphQL and REST failed:', restError);
        }
      }

      // 3) craft assistant reply grounded in graph content
      const dataSource = component ? (process.env.NEXT_PUBLIC_USE_GRAPHQL === 'true' ? 'GraphQL' : 'REST fallback') : 'No data';
      const reply =
        `You asked: "${prompt}"\n\n` +
        `**Data Source**: ${dataSource}\n` +
        `**Station**: ${stationLabel}\n\n` +
        summarizeMatrix(component) +
        (component
          ? `\n\n**Tip**: Verify labels reflect the component's own row/col labels to avoid transpose bugs.\n**Component ID**: ${component.id}`
          : '\n\nTry asking about "requirements", "objectives", or "problem statement" to see semantic matrix data.');

      // 4) log ASSISTANT message (gracefully handle failures)
      try {
        await apolloClient.mutate({
          mutation: ADD_CHAT_MESSAGE,
          variables: { 
            input: { 
              sessionId, 
              content: reply, 
              role: 'ASSISTANT', 
              meta: { 
                grounded: !!component,
                station: stationLabel,  // human-readable label in meta
                dataSource,
                componentId: component?.id
              } 
            } 
          },
        });
      } catch (error) {
        console.warn('Failed to log assistant message:', error);
      }

      // 5) return content for UI
      return reply;
    } catch (error) {
      console.error('Error in onAsk:', error);
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">GraphQL-Powered Chat</h1>
          <p className="text-gray-600 mt-2">
            Demo of chat integration with GraphQL queries for semantic matrix data.
            Current API: {process.env.NEXT_PUBLIC_USE_GRAPHQL === 'true' ? 'GraphQL' : 'REST'} mode.
          </p>
          <div className="mt-3 text-sm text-gray-500">
            Try asking: &quot;Show me the latest requirements&quot;, &quot;What are our objectives?&quot;, &quot;Tell me about the problem statement&quot;
          </div>
        </header>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Assistant />
        </div>
        
        <footer className="mt-6 text-xs text-gray-400">
          This demonstrates GraphQL chat session persistence + semantic matrix grounding.
          Session ID: {sessionIdRef.current || 'Not created yet'}
        </footer>
      </div>
    </div>
  );
}