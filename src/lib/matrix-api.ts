import { apolloClient } from '@/lib/apollo';
import {
  GET_COMPONENT_BY_ID,
  GET_LATEST_BY_STATION,
  GET_ALL_BY_STATION,
  GET_COMPONENTS_WITH_FILTER
} from '@/graphql/queries/matrix';

// Check feature flag for GraphQL vs REST API
const useGraphQL = process.env.NEXT_PUBLIC_USE_GRAPHQL === 'true';

// Types for backward compatibility with existing matrix components
export interface MatrixComponent {
  id: string;
  name: string;
  station?: string;
  kind?: 'matrix' | 'array' | 'scalar' | 'tensor';
  dimensions?: number[];
  ontology_id?: string;
  operation_type?: string;
  domain?: string;
  cf14_version?: string;
  ufo_type?: string;
  row_labels?: string[];
  col_labels?: string[];
  data: any[][];
  created_at?: string;
}

export interface ComponentFilter {
  station?: string;
  domain?: string;
  kind?: string;
}

export interface ComponentPagination {
  take?: number;
  skip?: number;
}

// Legacy REST API functions
async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function fetchMatrixByIdREST(id: string): Promise<MatrixComponent | null> {
  try {
    const json = await postJSON<{ success: boolean; component?: MatrixComponent }>(
      "/api/neo4j/query",
      { query_type: "get_matrix_by_id", component_id: id }
    );
    return json?.success && json?.component ? (json.component as MatrixComponent) : null;
  } catch {
    return null;
  }
}

async function fetchLatestByStationREST(station: string): Promise<MatrixComponent | null> {
  try {
    const json = await postJSON<{ success: boolean; component?: MatrixComponent }>(
      "/api/neo4j/query",
      { query_type: "get_latest_matrix_by_station", station }
    );
    return json?.success && json?.component ? (json.component as MatrixComponent) : null;
  } catch {
    return null;
  }
}

async function fetchAllByStationREST(station: string): Promise<MatrixComponent[]> {
  try {
    const json = await postJSON<{ success: boolean; components?: MatrixComponent[] }>(
      "/api/neo4j/query",
      { query_type: "get_all_by_station", station }
    );
    return json?.success && json?.components ? json.components : [];
  } catch {
    return [];
  }
}

// GraphQL helper functions
function transformGraphQLComponent(gqlComponent: any): MatrixComponent {
  // Convert normalized cells back to nested matrix format for backward compatibility
  const shape = gqlComponent.shape || [0, 0];
  const rows = shape[0];
  const cols = shape[1];
  
  const matrix_data: any[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  
  // Fill matrix from normalized cells
  gqlComponent.cells?.forEach((cell: any) => {
    if (cell.row < rows && cell.col < cols) {
      matrix_data[cell.row][cell.col] = {
        resolved: cell.resolved || '',
        raw_terms: cell.rawTerms || [],
        intermediate: cell.intermediate || [],
        operation: cell.operation || '',
        notes: cell.notes || ''
      };
    }
  });

  return {
    id: gqlComponent.id,
    name: gqlComponent.name,
    kind: gqlComponent.kind,
    station: gqlComponent.station,
    dimensions: shape,
    ontology_id: gqlComponent.ontologyId,
    operation_type: gqlComponent.operationType,
    domain: gqlComponent.domain,
    cf14_version: gqlComponent.cf14Version,
    ufo_type: gqlComponent.ufoType,
    row_labels: gqlComponent.rowLabels || [],
    col_labels: gqlComponent.colLabels || [],
    data: matrix_data,
    created_at: gqlComponent.createdAt
  };
}

async function fetchMatrixByIdGraphQL(id: string): Promise<MatrixComponent | null> {
  try {
    const { data } = await apolloClient.query({
      query: GET_COMPONENT_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only'
    });
    
    return data.component ? transformGraphQLComponent(data.component) : null;
  } catch (error) {
    console.error('GraphQL fetchMatrixById error:', error);
    return null;
  }
}

async function fetchLatestByStationGraphQL(station: string): Promise<MatrixComponent | null> {
  try {
    const { data } = await apolloClient.query({
      query: GET_LATEST_BY_STATION,
      variables: { station },
      fetchPolicy: 'network-only'
    });
    
    return data.latestComponentByStation ? transformGraphQLComponent(data.latestComponentByStation) : null;
  } catch (error) {
    console.error('GraphQL fetchLatestByStation error:', error);
    return null;
  }
}

async function fetchAllByStationGraphQL(station: string): Promise<MatrixComponent[]> {
  try {
    const { data } = await apolloClient.query({
      query: GET_ALL_BY_STATION,
      variables: { 
        station,
        pagination: { take: 50 } // reasonable default
      },
      fetchPolicy: 'network-only'
    });
    
    return data.components ? data.components.map(transformGraphQLComponent) : [];
  } catch (error) {
    console.error('GraphQL fetchAllByStation error:', error);
    return [];
  }
}

// Public API with feature flag fallback
export async function fetchMatrixById(id: string): Promise<MatrixComponent | null> {
  if (useGraphQL) {
    const result = await fetchMatrixByIdGraphQL(id);
    if (result) return result;
    
    // Fallback to REST if GraphQL fails
    console.warn('GraphQL fetchMatrixById failed, falling back to REST');
    return fetchMatrixByIdREST(id);
  }
  
  return fetchMatrixByIdREST(id);
}

export async function fetchLatestByStation(station: string): Promise<MatrixComponent | null> {
  if (useGraphQL) {
    const result = await fetchLatestByStationGraphQL(station);
    if (result) return result;
    
    // Fallback to REST if GraphQL fails
    console.warn('GraphQL fetchLatestByStation failed, falling back to REST');
    return fetchLatestByStationREST(station);
  }
  
  return fetchLatestByStationREST(station);
}

export async function fetchAllByStation(station: string): Promise<MatrixComponent[]> {
  if (useGraphQL) {
    const result = await fetchAllByStationGraphQL(station);
    if (result.length > 0) return result;
    
    // Fallback to REST if GraphQL fails
    console.warn('GraphQL fetchAllByStation failed, falling back to REST');
    return fetchAllByStationREST(station);
  }
  
  return fetchAllByStationREST(station);
}

// New GraphQL-only functions for advanced features
export async function fetchComponentsWithFilter(
  filter: ComponentFilter,
  pagination?: ComponentPagination
): Promise<MatrixComponent[]> {
  if (!useGraphQL) {
    throw new Error('Advanced filtering requires GraphQL API to be enabled');
  }

  try {
    const { data } = await apolloClient.query({
      query: GET_COMPONENTS_WITH_FILTER,
      variables: { 
        filter,
        pagination: pagination || { take: 20 },
        sort: { field: 'CREATED_AT', direction: 'DESC' }
      },
      fetchPolicy: 'network-only'
    });
    
    return data.components ? data.components.map(transformGraphQLComponent) : [];
  } catch (error) {
    console.error('GraphQL fetchComponentsWithFilter error:', error);
    return [];
  }
}