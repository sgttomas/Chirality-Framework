"use client";
import CanonInitForm from "@/components/CanonInitForm";
import { useEffect, useState } from "react";
import CanonPreview from "@/components/CanonPreview";
import { safeParse } from "@/lib/sanitize";

export default function Phase1Page() {
  const [list, setList] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/phase1/list").then(r => r.json()).then(j => setList(j.items || []));
  }, [refresh]);

  return (
    <div className="space-y-6">
      <p>Boot the **canonical, domain-agnostic seed** for the currently selected model; review; then canonize to Neo4j.</p>
      <CanonInitForm defaultPack="/Users/ryan/Desktop/ai-env/chirality-semantic-framework/ontology/cf14.core.pack.json" />
      <h2 className="text-lg font-semibold mt-8">Existing Canons</h2>
      <div className="space-y-3">
        {list.length === 0 ? <div>No canons stored yet.</div> :
          list.map((c, idx) => (
            <details key={idx} className="border rounded p-2">
              <summary className="cursor-pointer">{c.model} • v{c.cf_version} • {c.createdAt}</summary>
              <CanonPreview json={c} />
            </details>
          ))
        }
      </div>
    </div>
  );
}