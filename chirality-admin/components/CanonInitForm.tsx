"use client";
import { useState } from "react";

export default function CanonInitForm({ defaultPack }: { defaultPack?: string }) {
  const [packPath, setPackPath] = useState(defaultPack || "");
  const [matrix, setMatrix] = useState("A");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function runInit() {
    setLoading(true);
    setResult("");
    const r = await fetch("/api/phase1/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packPath, matrix })
    });
    setLoading(false);
    setResult(await r.text());
  }

  async function canonize() {
    if (!result) return;
    await fetch("/api/phase1/canonize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: result
    }).then(async (r) => {
      const j = await r.json();
      alert(j.success ? `Canon stored with id ${j.id}` : `Failed: ${j.error}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
        <label>Pack path</label>
        <input className="border p-2" value={packPath} onChange={e=>setPackPath(e.target.value)} placeholder="/abs/path/to/cf14.core.pack.json" />
        <label>Matrix</label>
        <select className="border p-2 w-32" value={matrix} onChange={e=>setMatrix(e.target.value)}>
          <option value="A">A (default start)</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button className="border px-3 py-2" onClick={runInit} disabled={loading}>Run initialization</button>
        <button className="border px-3 py-2" onClick={canonize} disabled={!result}>Canonize → Neo4j</button>
      </div>

      <pre className="bg-neutral-50 border p-3 overflow-auto text-sm h-96">{result || (loading ? "Running…" : "Results will appear here")}</pre>
    </div>
  );
}