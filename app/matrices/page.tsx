"use client";

import React, { useEffect, useState } from "react";

// CF14 v2.1.1 enhanced types
type CellLike = { 
  resolved?: string;
  operation?: string;
  raw_terms?: string[];
  notes?: string;
} | { [k: string]: any } | string | null | undefined;

interface MatrixComponent {
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
  data: CellLike[][];
  created_at?: string;
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function fetchMatrixById(id: string): Promise<MatrixComponent | null> {
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

async function fetchLatestByStation(station: string): Promise<MatrixComponent | null> {
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

function cellText(cell: CellLike): string {
  if (cell == null) return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "object" && "resolved" in cell) {
    return String((cell as any).resolved ?? "");
  }
  return String(cell ?? "");
}

function getCellDetails(cell: CellLike): { operation?: string; rawTerms?: string[]; notes?: string } {
  if (typeof cell === "object" && cell != null) {
    return {
      operation: (cell as any).operation,
      rawTerms: (cell as any).raw_terms,
      notes: (cell as any).notes
    };
  }
  return {};
}

function getComponentTypeIcon(kind?: string): string {
  switch (kind) {
    case 'matrix': return '📊'
    case 'array': return '📋'
    case 'scalar': return '🔢'
    case 'tensor': return '🧮'
    default: return '📄'
  }
}

function MatrixTable({ component }: { component: MatrixComponent }) {
  const rows = component.row_labels ?? Array.from({ length: component.data?.length ?? 0 }, (_, i) => `Row ${i + 1}`);
  const cols = component.col_labels ?? Array.from({ length: component.data?.[0]?.length ?? 0 }, (_, j) => `Col ${j + 1}`);

  return (
    <div className="space-y-4">
      {/* CF14 v2.1.1 Component Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="space-y-1">
          <div className="font-medium text-gray-700">Type</div>
          <div className="flex items-center space-x-1">
            <span>{getComponentTypeIcon(component.kind)}</span>
            <span>{component.kind || 'matrix'}</span>
          </div>
        </div>
        {component.dimensions && (
          <div className="space-y-1">
            <div className="font-medium text-gray-700">Dimensions</div>
            <div>{component.dimensions.join(' × ')}</div>
          </div>
        )}
        {component.operation_type && (
          <div className="space-y-1">
            <div className="font-medium text-gray-700">Operation</div>
            <div className="text-blue-600">{component.operation_type}</div>
          </div>
        )}
        {component.domain && (
          <div className="space-y-1">
            <div className="font-medium text-gray-700">Domain</div>
            <div className="text-purple-600">{component.domain}</div>
          </div>
        )}
      </div>

      {component.cf14_version && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
          CF14 v{component.cf14_version} | Ontology: {component.ontology_id || 'unknown'}
        </div>
      )}

      {/* Matrix Data Table */}
      <div className="rounded-md border overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 bg-white border px-3 py-2 text-left">&nbsp;</th>
              {cols.map((c, j) => (
                <th key={j} className="top-0 bg-white border px-3 py-2 text-left whitespace-pre text-sm">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {component.data?.map((row, i) => (
              <tr key={i}>
                <th className="sticky left-0 bg-white border px-3 py-2 text-left font-medium whitespace-pre text-sm">
                  {rows[i] ?? `Row ${i + 1}`}
                </th>
                {row.map((cell, j) => {
                  const details = getCellDetails(cell);
                  return (
                    <td key={j} className="border px-3 py-2 align-top group relative">
                      <div className="whitespace-pre-wrap text-sm">
                        {cellText(cell)}
                      </div>
                      {/* CF14 v2.1.1 Cell Metadata Tooltip */}
                      {(details.operation || details.rawTerms || details.notes) && (
                        <div className="opacity-0 group-hover:opacity-100 absolute z-10 bottom-full left-0 mb-2 p-3 bg-black text-white text-xs rounded-lg shadow-lg max-w-xs transition-opacity">
                          {details.operation && (
                            <div><strong>Operation:</strong> {details.operation}</div>
                          )}
                          {details.rawTerms && details.rawTerms.length > 0 && (
                            <div><strong>Raw terms:</strong> {details.rawTerms.join(', ')}</div>
                          )}
                          {details.notes && (
                            <div><strong>Notes:</strong> {details.notes}</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatricesPage() {
  const [requirements, setRequirements] = useState<MatrixComponent | null>(null);
  const [objectives, setObjectives] = useState<MatrixComponent | null>(null); // latest in "Objectives" station (F or D)
  const [allStations, setAllStations] = useState<Record<string, MatrixComponent[]>>({});
  const [idsInput, setIdsInput] = useState("");
  const [byIds, setByIds] = useState<MatrixComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [availableDomains, setAvailableDomains] = useState<string[]>(['all']);

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLatest() {
    setLoading(true);
    setError(null);
    try {
      // CF14 v2.1.1 supports multiple stations
      const stations = ['Problem Statement', 'Requirements', 'Objectives'];
      const stationPromises = stations.map(station => 
        fetchAllByStation(station).then(components => ({ station, components }))
      );
      
      const [req, obj] = await Promise.all([
        fetchLatestByStation("Requirements"),
        fetchLatestByStation("Objectives"),
      ]);
      
      const stationResults = await Promise.all(stationPromises);
      const stationMap: Record<string, MatrixComponent[]> = {};
      stationResults.forEach(({ station, components }) => {
        stationMap[station] = components;
      });
      
      setRequirements(req);
      setObjectives(obj);
      setAllStations(stationMap);
      
      // Extract available domains
      const domains = new Set<string>(['all']);
      Object.values(stationMap).flat().forEach(comp => {
        if (comp.domain && comp.domain !== 'general') {
          domains.add(comp.domain);
        }
      });
      setAvailableDomains(Array.from(domains));
      
    } catch (e: any) {
      setError(e?.message ?? "Failed to load latest matrices.");
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchAllByStation(station: string): Promise<MatrixComponent[]> {
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

  async function loadByIds() {
    const ids = idsInput
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(ids.map((id) => fetchMatrixById(id)));
      setByIds(results.filter(Boolean) as MatrixComponent[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load by IDs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">CF14 v2.1.1 Matrices</h1>
            <p className="text-sm text-gray-600">Semantic matrices with enhanced provenance and domain support</p>
          </div>
          <div className="flex items-center gap-2">
            <a className="underline" href="/instantiate">Instantiate new</a>
            <button
              onClick={loadLatest}
              className="border rounded px-3 py-1 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? "Loading…" : "Reload latest"}
            </button>
          </div>
        </div>
        
        {/* Domain Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by domain:</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {availableDomains.map(domain => (
              <option key={domain} value={domain}>
                {domain === 'all' ? 'All Domains' : domain}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* CF14 v2.1.1 Station Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">CF14 v2.1.1 Stations Overview</h2>
        <div className="grid gap-6">
          {Object.entries(allStations).map(([station, components]) => {
            const filteredComponents = selectedDomain === 'all' 
              ? components 
              : components.filter(comp => comp.domain === selectedDomain || (!comp.domain && selectedDomain === 'general'));
            
            if (filteredComponents.length === 0) return null;
            
            return (
              <div key={station} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-lg">{station}</h3>
                  <span className="text-sm text-gray-500">{filteredComponents.length} component(s)</span>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredComponents.map((component) => (
                    <div key={component.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{component.name}</div>
                        <div className="text-xs text-gray-500">ID: {component.id}</div>
                      </div>
                      <MatrixTable component={component} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Fallback to legacy view if no station data */}
        {Object.keys(allStations).length === 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium">Requirements (latest)</div>
              {!requirements ? (
                <div className="text-sm text-gray-500">Not found yet.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-500">ID: {requirements.id}</div>
                  <MatrixTable component={requirements} />
                </>
              )}
            </div>
            <div className="space-y-2">
              <div className="font-medium">Objectives (latest)</div>
              {!objectives ? (
                <div className="text-sm text-gray-500">Not found yet.</div>
              ) : (
                <>
                  <div className="text-sm text-gray-500">ID: {objectives.id}</div>
                  <MatrixTable component={objectives} />
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Fetch by ID(s)</h2>
        <div className="flex items-start gap-3 flex-wrap">
          <textarea
            value={idsInput}
            onChange={(e) => setIdsInput(e.target.value)}
            className="border rounded px-3 py-2 w-full max-w-xl h-24"
            placeholder="Enter one or more component IDs, separated by spaces, commas, or newlines"
          />
          <button
            onClick={loadByIds}
            className="border rounded px-3 py-2 hover:bg-gray-50"
            disabled={loading}
          >
            Load by IDs
          </button>
        </div>
        {!!byIds.length && (
          <div className="space-y-6">
            {byIds.map((comp) => (
              <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{comp.name}</div>
                  <div className="text-sm text-gray-500">
                    Station: {comp.station ?? "n/a"} | ID: {comp.id}
                  </div>
                </div>
                <MatrixTable component={comp} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}