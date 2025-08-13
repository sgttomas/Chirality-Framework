"use client";

import React, { useEffect, useState } from "react";

// Tolerant types: your API may return Cell objects or plain dicts
type CellLike = { resolved?: string } | { [k: string]: any } | string | null | undefined;
interface MatrixComponent {
  id: string;
  name: string;
  station?: string;
  row_labels?: string[];
  col_labels?: string[];
  data: CellLike[][];
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

function MatrixTable({ component }: { component: MatrixComponent }) {
  const rows = component.row_labels ?? Array.from({ length: component.data?.length ?? 0 }, (_, i) => `Row ${i + 1}`);
  const cols = component.col_labels ?? Array.from({ length: component.data?.[0]?.length ?? 0 }, (_, j) => `Col ${j + 1}`);

  return (
    <div className="rounded-md border overflow-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 bg-white border px-3 py-2 text-left">&nbsp;</th>
            {cols.map((c, j) => (
              <th key={j} className="top-0 bg-white border px-3 py-2 text-left whitespace-pre">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {component.data?.map((row, i) => (
            <tr key={i}>
              <th className="sticky left-0 bg-white border px-3 py-2 text-left font-medium whitespace-pre">
                {rows[i] ?? `Row ${i + 1}`}
              </th>
              {row.map((cell, j) => (
                <td key={j} className="border px-3 py-2 align-top whitespace-pre-wrap">
                  {cellText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatricesPage() {
  const [requirements, setRequirements] = useState<MatrixComponent | null>(null);
  const [objectives, setObjectives] = useState<MatrixComponent | null>(null); // latest in "Objectives" station (F or D)
  const [idsInput, setIdsInput] = useState("");
  const [byIds, setByIds] = useState<MatrixComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLatest() {
    setLoading(true);
    setError(null);
    try {
      const [req, obj] = await Promise.all([
        fetchLatestByStation("Requirements"),
        fetchLatestByStation("Objectives"),
      ]);
      setRequirements(req);
      setObjectives(obj);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load latest matrices.");
    } finally {
      setLoading(false);
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
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Matrices</h1>
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
      </header>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Latest by station</h2>
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
              <div key={comp.id} className="space-y-2">
                <div className="font-medium">
                  {comp.name}{" "}
                  <span className="text-gray-500 text-sm">
                    (station: {comp.station ?? "n/a"}, id: {comp.id})
                  </span>
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