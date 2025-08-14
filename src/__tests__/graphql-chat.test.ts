/**
 * @jest-environment jsdom
 */

import { ApolloClient, InMemoryCache } from '@apollo/client';
import { MockLink, MockedResponse } from '@apollo/client/testing';
import { CREATE_CHAT_SESSION, ADD_CHAT_MESSAGE } from '../graphql/queries/chat';
import { LATEST_BY_STATION } from '../graphql/queries/matrix';

// Mock data for testing
const mockSessionId = 'session_12345';
const mockSessionResponse = {
  data: {
    createChatSession: {
      id: mockSessionId,
      name: 'Test Chat Session',
      createdAt: '2024-01-01T00:00:00Z'
    }
  }
};

const mockMatrixComponent = {
  id: 'component_abc123',
  name: 'Requirements Matrix',
  station: 'Requirements',
  shape: [3, 4],
  rowLabels: ['R1', 'R2', 'R3'],
  colLabels: ['C1', 'C2', 'C3', 'C4'],
  cells: [
    { row: 0, col: 0, resolved: 'User authentication system', rawTerms: ['auth', 'user'], intermediate: [] },
    { row: 0, col: 1, resolved: 'Security protocols', rawTerms: ['security'], intermediate: [] },
    { row: 0, col: 2, resolved: 'Data validation', rawTerms: ['validation'], intermediate: [] },
    { row: 0, col: 3, resolved: 'Error handling', rawTerms: ['error'], intermediate: [] }
  ]
};

const mockMatrixResponse = {
  data: {
    latestComponentByStation: mockMatrixComponent
  }
};

const mockAddMessageResponse = {
  data: {
    addChatMessage: {
      id: 'message_xyz789',
      content: 'Test message',
      role: 'USER',
      createdAt: '2024-01-01T00:00:00Z'
    }
  }
};

// Create mocks for GraphQL operations
const createSessionMock: MockedResponse = {
  request: {
    query: CREATE_CHAT_SESSION,
    variables: { input: { name: 'GraphQL Chat Session', meta: { source: 'web' } } }
  },
  result: mockSessionResponse
};

const getMatrixMock: MockedResponse = {
  request: {
    query: LATEST_BY_STATION,
    variables: { station: 'REQUIREMENTS' }  // enum value
  },
  result: mockMatrixResponse
};

const addUserMessageMock: MockedResponse = {
  request: {
    query: ADD_CHAT_MESSAGE,
    variables: {
      input: {
        sessionId: mockSessionId,
        content: 'Show me the latest requirements',
        role: 'USER',
        meta: { ui: 'assistant' }
      }
    }
  },
  result: mockAddMessageResponse
};

const addAssistantMessageMock: MockedResponse = {
  request: {
    query: ADD_CHAT_MESSAGE,
    variables: {
      input: {
        sessionId: mockSessionId,
        content: expect.stringContaining('Requirements Matrix'),
        role: 'ASSISTANT',
        meta: {
          grounded: true,
          station: 'Requirements',            // human label for meta is fine
          dataSource: 'GraphQL',
          componentId: mockMatrixComponent.id
        }
      }
    }
  },
  result: mockAddMessageResponse
};

describe('GraphQL Chat Integration', () => {
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
    return 'Requirements';
  };

  // Helper function to simulate the chat flow logic
  async function simulateChatFlow(apolloClient: ApolloClient<any>, prompt: string): Promise<string> {
    // 1. Create session
    const sessionResult = await apolloClient.mutate({
      mutation: CREATE_CHAT_SESSION,
      variables: { input: { name: 'GraphQL Chat Session', meta: { source: 'web' } } }
    });
    const sessionId = sessionResult.data?.createChatSession?.id;

    // 2. Log user message
    await apolloClient.mutate({
      mutation: ADD_CHAT_MESSAGE,
      variables: { input: { sessionId, content: prompt, role: 'USER', meta: { ui: 'assistant' } } }
    });

    // 3. Detect station from prompt (human label) and map to enum for the query
    const stationLabel = detectStationLabel(prompt);
    const stationEnum = toStationEnum(stationLabel);

    // 4. Fetch matrix data
    const matrixResult = await apolloClient.query({
      query: LATEST_BY_STATION,
      variables: { station: stationEnum },
      fetchPolicy: 'network-only'
    });

    const component = matrixResult.data?.latestComponentByStation;

    // 5. Generate response with robust row/col rendering (no undefineds)
    const reply = component
      ? (() => {
          const rows: string[] = component.rowLabels ?? [];
          const cols: string[] = component.colLabels ?? [];
          const r0 = (component.cells ?? [])
            .filter((x: any) => x.row === 0)
            .sort((a: any, b: any) => a.col - b.col);
          const cells0 = r0
            .slice(0, Math.min(4, r0.length))
            .map((x: any, i: number) => `${cols[i]}: ${x.resolved}`);
          const preview = cells0.length ? `Row "${rows[0]}": ${cells0.join(' | ')}` : 'No cells available.';
          return `Found ${component.name} at station ${component.station}.\n${preview}`;
        })()
      : 'No matrix data found';

    // 6. Log assistant message
    await apolloClient.mutate({
      mutation: ADD_CHAT_MESSAGE,
      variables: {
        input: {
          sessionId,
          content: reply,
          role: 'ASSISTANT',
          meta: {
            grounded: !!component,
            station: stationLabel,       // human-readable label in meta
            dataSource: 'GraphQL',
            componentId: component?.id
          }
        }
      }
    });

    return reply;
  }

  const mocks: MockedResponse[] = [
    createSessionMock,
    getMatrixMock,
    addUserMessageMock,
    addAssistantMessageMock
  ];

  it('should create session (mocked) and return id', async () => {
    const client = new ApolloClient({
      link: new MockLink(mocks, false),
      cache: new InMemoryCache()
    });

    const result1 = await client.mutate({
      mutation: CREATE_CHAT_SESSION,
      variables: { input: { name: 'GraphQL Chat Session', meta: { source: 'web' } } }
    });

    expect(result1.data?.createChatSession?.id).toBe(mockSessionId);
    expect(result1.data?.createChatSession?.name).toBe('Test Chat Session');
  });

  it('should fetch matrix data and respect row/col labels', async () => {
    const client = new ApolloClient({
      link: new MockLink(mocks, false),
      cache: new InMemoryCache()
    });

    const result = await client.query({
      query: LATEST_BY_STATION,
      variables: { station: 'REQUIREMENTS' },  // GraphQL enum value
      fetchPolicy: 'network-only'
    });

    const component = result.data?.latestComponentByStation;
    
    expect(component).toBeDefined();
    expect(component.name).toBe('Requirements Matrix');
    expect(component.station).toBe('Requirements');
    expect(component.rowLabels).toEqual(['R1', 'R2', 'R3']);
    expect(component.colLabels).toEqual(['C1', 'C2', 'C3', 'C4']);
    expect(component.cells).toHaveLength(4);
    expect(component.cells[0].resolved).toBe('User authentication system');
  });

  it('should complete full chat flow with semantic grounding', async () => {
    const client = new ApolloClient({
      link: new MockLink(mocks, false),
      cache: new InMemoryCache()
    });

    const response = await simulateChatFlow(client, 'Show me the latest requirements');
    
    expect(response).toContain('Requirements Matrix');
    expect(response).toContain('station Requirements');
    expect(response).toContain('User authentication system');
    expect(response).toContain('Security protocols');
  });

  it('should detect stations from user prompts (human label)', () => {
    expect(detectStationLabel('Show me the latest requirements')).toBe('Requirements');
    expect(detectStationLabel('What are our objectives?')).toBe('Objectives');
    expect(detectStationLabel('Tell me about the problem statement')).toBe('Problem Statement');
    expect(detectStationLabel('General question')).toBe('Requirements');
  });

  it('should map station labels to GraphQL enums', () => {
    expect(toStationEnum('Requirements')).toBe('REQUIREMENTS');
    expect(toStationEnum('objectives')).toBe('OBJECTIVES');
    expect(toStationEnum('Problem Statement')).toBe('PROBLEM_STATEMENT');
    expect(toStationEnum('verification')).toBe('VERIFICATION');
    expect(toStationEnum('unknown station')).toBe('REQUIREMENTS'); // default
  });

  it('should handle null matrix response gracefully', async () => {
    const nullMatrixMock: MockedResponse = {
      request: {
        query: LATEST_BY_STATION,
        variables: { station: 'REQUIREMENTS' }
      },
      result: {
        data: {
          latestComponentByStation: null
        }
      }
    };

    const nullMocks = [createSessionMock, nullMatrixMock, addUserMessageMock];
    const client = new ApolloClient({
      link: new MockLink(nullMocks, false),
      cache: new InMemoryCache()
    });

    const response = await simulateChatFlow(client, 'Show me requirements');
    expect(response).toBe('No matrix data found');
  });

  it('should preserve semantic integrity in responses', () => {
    const component = mockMatrixComponent;
    
    // Test that resolved content is properly displayed
    const cells = component.cells.filter(c => c.row === 0).sort((a, b) => a.col - b.col);
    const preview = cells.slice(0, 4).map((cell, i) => `${component.colLabels[i]}: ${cell.resolved}`);
    
    expect(preview).toEqual([
      'C1: User authentication system',
      'C2: Security protocols', 
      'C3: Data validation',
      'C4: Error handling'
    ]);

    // Test that raw terms are preserved for provenance
    expect(component.cells[0].rawTerms).toEqual(['auth', 'user']);
    expect(component.cells[1].rawTerms).toEqual(['security']);
  });
});

describe('Semantic Matrix Summarization', () => {
  it('should generate semantic summaries preserving label integrity', () => {
    const summarizeMatrix = (c: any): string => {
      if (!c) return 'I could not find a matrix to ground the answer.';
      const rows: string[] = c.rowLabels ?? [];
      const cols: string[] = c.colLabels ?? [];
      const head = `Found ${c.name ?? 'a component'} at station ${c.station}.`;
      
      const r0 = (c.cells ?? []).filter((x: any) => x.row === 0).sort((a: any, b: any) => a.col - b.col);
      const cells0 = r0.slice(0, Math.min(4, r0.length)).map((x: any, i: number) => `${cols[i]}: ${x.resolved}`);
      const preview = cells0.length ? `Row "${rows[0]}": ${cells0.join(' | ')}` : 'No cells available.';
      
      return `${head}\n${preview}`;
    };

    const summary = summarizeMatrix(mockMatrixComponent);
    
    expect(summary).toContain('Found Requirements Matrix at station Requirements');
    expect(summary).toContain('Row "R1"');
    expect(summary).toContain('C1: User authentication system');
    expect(summary).toContain('C2: Security protocols');
    expect(summary).not.toContain('undefined');
    expect(summary).not.toContain('null');
  });

  it('should handle missing data gracefully', () => {
    const summarizeMatrix = (c: any): string => {
      if (!c) return 'I could not find a matrix to ground the answer.';
      const rows: string[] = c.rowLabels ?? [];
      const cols: string[] = c.colLabels ?? [];
      const head = `Found ${c.name ?? 'a component'} at station ${c.station}.`;
      
      const r0 = (c.cells ?? []).filter((x: any) => x.row === 0).sort((a: any, b: any) => a.col - b.col);
      const cells0 = r0.slice(0, Math.min(4, r0.length)).map((x: any, i: number) => `${cols[i]}: ${x.resolved}`);
      const preview = cells0.length ? `Row "${rows[0]}": ${cells0.join(' | ')}` : 'No cells available.';
      
      return `${head}\n${preview}`;
    };

    // Test with missing data
    const emptyMatrix = {
      name: 'Empty Matrix',
      station: 'Test',
      rowLabels: [],
      colLabels: [],
      cells: []
    };

    const summary = summarizeMatrix(emptyMatrix);
    expect(summary).toContain('Found Empty Matrix at station Test');
    expect(summary).toContain('No cells available');
    expect(summary).not.toContain('undefined');
  });
});