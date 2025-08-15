"use client";
import FrameworkInitController from "@/components/CanonInitForm";
import { useEffect, useState } from "react";
import CanonPreview from "@/components/CanonPreview";

export default function Phase1Page() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/phase1/list").then(r => r.json()).then(j => setList(j.items || []));
  }, []);

  return (
    <div className="space-y-8">
      <FrameworkInitController defaultPack="/Users/ryan/Desktop/ai-env/chirality-semantic-framework/ontology/cf14.core.pack.json" />
      
      <div className="border-t pt-8">
        <h2 className="text-lg font-semibold mb-4">Stored Framework Configurations</h2>
        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="text-gray-500 text-sm">No framework configurations stored yet.</div>
          ) : (
            list.map((c, idx) => (
              <details key={idx} className="border rounded p-3">
                <summary className="cursor-pointer flex items-center justify-between">
                  <span>{c.model} • v{c.cf_version}</span>
                  <span className="text-xs text-gray-500">{c.createdAt}</span>
                </summary>
                <div className="mt-3">
                  <CanonPreview json={c} title={`Configuration ${idx + 1}`} />
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}