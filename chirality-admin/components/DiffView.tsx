"use client";
import { useMemo } from "react";
import { diffJson } from "diff";

export default function DiffView({ a, b }: { a: any; b: any }) {
  const parts = useMemo(() => diffJson(a, b), [a, b]);
  return (
    <pre className="text-sm leading-5 bg-neutral-50 border p-3 overflow-auto">
      {parts.map((p, i) => (
        <span key={i} style={{ background: p.added ? "#e6ffed" : p.removed ? "#ffeef0" : "transparent" }}>
          {p.value}
        </span>
      ))}
    </pre>
  );
}