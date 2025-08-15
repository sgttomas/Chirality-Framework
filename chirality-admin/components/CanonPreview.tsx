"use client";
import { useMemo, useState } from "react";

type Props = { json: any; className?: string; title?: string };

export default function CanonPreview({ json, className = "", title = "Preview" }: Props) {
  const [copied, setCopied] = useState(false);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return String(json ?? "");
    }
  }, [json]);

  const highlighted = useMemo(() => syntaxHighlight(pretty), [pretty]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* no-op */
    }
  }

  function onDownload() {
    const blob = new Blob([pretty], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (title?.toLowerCase().replace(/\s+/g, "_") || "canon") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`border rounded bg-white ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            aria-label="Copy JSON"
            title="Copy JSON"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
            aria-label="Download JSON"
            title="Download JSON"
          >
            Download
          </button>
        </div>
      </div>

      {/* Pretty JSON with lightweight syntax highlighting */}
      <pre
        className="text-sm leading-5 p-3 overflow-auto whitespace-pre-wrap font-mono"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

/**
 * Minimal client-side syntax highlighting for JSON strings.
 * Wraps tokens in spans with utility classes (Tailwind-friendly).
 */
function syntaxHighlight(json: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Escape first
  let text = esc(json);

  // Strings (keys + values)
  text = text.replace(
    /(\"(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\\"])*\"(\s*:)?)/g,
    (match) => {
      if (/:$/.test(match)) {
        // key
        return `<span class="text-purple-700">${match}</span>`;
      }
      // string value
      return `<span class="text-green-700">${match}</span>`;
    }
  );

  // Numbers
  text = text.replace(
    /\b(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)\b/g,
    `<span class="text-blue-700">$1</span>`
  );

  // Booleans & null
  text = text
    .replace(/\b(true|false)\b/g, `<span class="text-orange-700">$1</span>`)
    .replace(/\b(null)\b/g, `<span class="text-gray-500 italic">$1</span>`);

  // Punctuation accents (optional, subtle)
  text = text
    .replace(/([\{\}\[\]])/g, `<span class="text-gray-800 font-semibold">$1</span>`)
    .replace(/([:,])/g, `<span class="text-gray-500">$1</span>`);

  return text;
}