# semmul.py — semantic multiplication utilities (CSV + CLI + REPL)
from __future__ import annotations
from collections import OrderedDict
from typing import List, Dict, Tuple, Optional, Any
import json
import time
from openai import OpenAI
import csv
from pathlib import Path
# filepath: /Users/ryan/Desktop/ai-env/chirality-semantic-framework/semmul.py
import os, sys
script_name = os.path.basename(sys.argv[0])

class LRU:
    def __init__(self, capacity: int = 512):
        self.capacity = capacity
        self._d: OrderedDict[str, dict] = OrderedDict()
    def _mk(self, k: Tuple[str, str, str]) -> str:
        # normalize for stable caching
        t1, t2, ctx = k
        def norm(s: str) -> str:
            return " ".join(s.strip().split()).lower()
        return json.dumps({"t1": norm(t1), "t2": norm(t2), "ctx": norm(ctx or "")}, sort_keys=True)
    def get(self, k: Tuple[str, str, str]) -> Optional[dict]:
        key = self._mk(k)
        if key in self._d:
            self._d.move_to_end(key)
            return self._d[key]
        return None
    def set(self, k: Tuple[str, str, str], v: dict):
        key = self._mk(k)
        self._d[key] = v
        self._d.move_to_end(key)
        if len(self._d) > self.capacity:
            self._d.popitem(last=False)

class SemanticCombiner:
    """
    Provider: OpenAI
    Features implemented:
      (a) System prompt anchoring semantic multiplication
      (b) Batch API with strict JSON response
      (c) LRU cache for pair results
    """
    SYSTEM_PROMPT = (
        "You perform *semantic multiplication*.\n"
        "Given two terms, output a SINGLE word or SHORT PHRASE (≤ 4 words) that represents their "
        "INTERSECTION OF MEANING (not concatenation, not definition, not explanation).\n"
        "Return STRICT JSON ONLY with shape:\n"
        "{ \"results\": [ { \"term\": str, \"alternates\": [str, ...], \"confidence\": number } ... ] }\n"
        "- Each item corresponds to the input pair at the same index.\n"
        "- `term` must be ≤ 40 characters, ≤ 4 words.\n"
        "- Provide up to 3 `alternates` (may be empty).\n"
        "- `confidence` is a float in [0,1].\n"
        "Do not include any extra text."
    )

    def __init__(self, api_key: str, model: Optional[str] = None, cache_capacity: int = 512):
        self.client = OpenAI(api_key=api_key)
        # Centralized default model selection (env-driven with fallback)
        self.model = model or DEFAULT_TEXT_MODEL
        self.cache = LRU(cache_capacity)

    @staticmethod
    def _schema() -> dict:
        # Used as a hint inside the user message; the API enforces JSON via response_format.
        return {
            "type": "object",
            "properties": {
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "term": {"type": "string", "maxLength": 40},
                            "alternates": {"type": "array", "items": {"type": "string"}, "maxItems": 3},
                            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
                        },
                        "required": ["term"]
                    }
                }
            },
            "required": ["results"]
        }

    def combine_terms(self, term1: str, term2: str, context: str = "") -> dict:
        """
        Returns: {"term": str, "alternates":[...], "confidence": float}
        """
        cached = self.cache.get((term1, term2, context))
        if cached:
            return cached

        res = self.combine_batch([
            {"t1": term1, "t2": term2, "context": context}
        ])[0]
        self.cache.set((term1, term2, context), res)
        return res

    def combine_batch(self, pairs: List[Dict[str, str]]) -> List[dict]:
        """
        pairs: [{"t1": "...", "t2": "...", "context": "..."}]
        Returns list aligned with input order. Each item:
          {"term": str, "alternates":[...], "confidence": float}
        Uses cache where possible; only uncached pairs trigger an LLM call.
        """
        results: List[Optional[dict]] = [None] * len(pairs)
        to_query: List[Tuple[int, Dict[str, str]]] = []

        # Check cache first
        for i, p in enumerate(pairs):
            t1, t2, ctx = p.get("t1", ""), p.get("t2", ""), p.get("context", "")
            cached = self.cache.get((t1, t2, ctx))
            if cached:
                results[i] = cached
            else:
                to_query.append((i, {"t1": t1, "t2": t2, "context": ctx}))

        if to_query:
            # Make one LLM call for all uncached pairs
            llm_payload = {
                "pairs": to_query and [q[1] for q in to_query] or [],
                "output_schema": self._schema()
            }
            llm_json = self._call_llm_json(llm_payload)
            # Validate & align
            parsed = self._validate_and_clean(llm_json, expected=len(to_query))

            # Fill results + cache
            for (orig_idx, pair_dict), item in zip(to_query, parsed):
                # Post constraints: ≤ 4 words for "term"
                item["term"] = self._enforce_word_limit(item.get("term", ""), max_words=4)
                item["alternates"] = [self._enforce_word_limit(a, max_words=4) for a in item.get("alternates", [])][:3]
                # Default confidence if missing
                if "confidence" not in item or not isinstance(item["confidence"], (int, float)):
                    item["confidence"] = 0.5
                results[orig_idx] = item
                self.cache.set((pair_dict["t1"], pair_dict["t2"], pair_dict.get("context", "")), item)

        # All indices should be filled now
        return [r for r in results]  # type: ignore

    def _call_llm_json(self, user_obj: dict, attempts: int = 2, backoff: float = 0.8) -> dict:
        """
        Calls OpenAI Chat Completions with JSON-only response.
        Retries a couple times if JSON parsing fails.
        """
        last_err = None
        for attempt in range(attempts):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    temperature=0.2,
                    messages=[
                        {"role": "system", "content": self.SYSTEM_PROMPT},
                        {"role": "user", "content": json.dumps(user_obj, ensure_ascii=False)}
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=256
                )
                # Pylance: message.content can be Optional[str]; guard and coerce to str
                content: str = resp.choices[0].message.content or ""
                if not content.strip():
                    raise RuntimeError(
                        "LLM returned empty content; ensure response_format=json_object and model supports it."
                    )
                return json.loads(content)
            except Exception as e:
                last_err = e
                time.sleep(backoff * (attempt + 1))
        raise RuntimeError(f"LLM JSON response failed: {last_err}")

    @staticmethod
    def _validate_and_clean(obj: dict, expected: int) -> List[dict]:
        if not isinstance(obj, dict) or "results" not in obj or not isinstance(obj["results"], list):
            raise ValueError("Invalid JSON: missing 'results' array.")
        results = obj["results"]
        if len(results) != expected:
            # If model returned extra/fewer, truncate/pad with fallbacks
            if len(results) > expected:
                results = results[:expected]
            else:
                while len(results) < expected:
                    results.append({"term": "", "alternates": [], "confidence": 0.5})
        cleaned = []
        for item in results:
            term = (item.get("term") or "").strip()
            alts = item.get("alternates") or []
            conf = item.get("confidence", 0.5)
            if not term:
                term = ""
            if not isinstance(alts, list):
                alts = []
            cleaned.append({"term": term, "alternates": alts, "confidence": conf})
        return cleaned

    @staticmethod
    def _enforce_word_limit(s: str, max_words: int = 4) -> str:
        words = [w for w in s.strip().split() if w]
        return " ".join(words[:max_words])


# CSV batch processing utility
def process_csv(input_path: str, output_path: Optional[str] = None, model: Optional[str] = None, batch_size: int = 64) -> str:
    """
    Process a CSV of semantic multiplications using the batch API.

    Input CSV requirements:
      - Headers: 't1','t2' are required; optional 'context'.
      - Each row will be semantically multiplied as (t1 * t2) with the given context.

    Output CSV columns:
      - t1, t2, context, term, alternates, confidence

    Returns: the output CSV path written.

    Notes:
      - Uses OPENAI_API_KEY from environment (see ensure_api_key()).
      - 'alternates' is written as a semicolon-separated list.
    """
    ensure_api_key()
    in_path = Path(input_path).expanduser().resolve()
    if not in_path.exists():
        raise FileNotFoundError(f"Input CSV not found: {in_path}")

    out_path = Path(output_path).expanduser().resolve() if output_path else in_path.with_suffix(".out.csv")

    # Prepare model + client-backed combiner
    selected_model = model or os.getenv("OPENAI_MODEL") or os.getenv("OPENAI_TEXT_MODEL") or "gpt-4.1-nano"
    combiner = SemanticCombiner(api_key=os.getenv("OPENAI_API_KEY", ""), model=selected_model)

    rows: List[Dict[str, str]] = []
    with in_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"t1", "t2"}
        missing = [c for c in required if c not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"Input CSV missing required columns: {', '.join(missing)}. Found: {reader.fieldnames or '[]'}")
        for r in reader:
            rows.append({
                "t1": (r.get("t1") or "").strip(),
                "t2": (r.get("t2") or "").strip(),
                "context": (r.get("context") or "").strip(),
            })

    # Batch in chunks to control token use
    results: List[dict] = []
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        # map to expected input
        pairs = [{"t1": b["t1"], "t2": b["t2"], "context": b.get("context","")} for b in batch]
        outs = combiner.combine_batch(pairs)
        results.extend(outs)

    # Write output CSV
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["t1", "t2", "context", "term", "alternates", "confidence"])
        for src, res in zip(rows, results):
            alts = res.get("alternates") or []
            conf = res.get("confidence")
            writer.writerow([
                src.get("t1",""),
                src.get("t2",""),
                src.get("context",""),
                res.get("term",""),
                "; ".join(a for a in alts if a),
                f"{conf:.3f}" if isinstance(conf, (int, float)) else "",
            ])

    return str(out_path)


# -------------------------
# Example (single + batch)
# -------------------------
# combiner = SemanticCombiner(api_key="YOUR_OPENAI_KEY")
# r1 = combiner.combine_terms("Values", "Necessary", "Normative × Determinacy")
# rN = combiner.combine_batch([
#     {"t1":"Values","t2":"Necessary","context":"Normative × Determinacy"},
#     {"t1":"Actions","t2":"Contingent","context":"Normative × Determinacy"},
#     {"t1":"Benchmarks","t2":"Fundamental","context":"Normative × Determinacy"},
#     {"t1":"Benchmarks","t2":"Best Practices","context":"Normative × Determinacy"}
# ])

# Optional import: if python-dotenv isn't installed, fall back to a no-op and suppress Pylance warning
try:
    from dotenv import load_dotenv  # type: ignore[reportMissingImports]
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False
load_dotenv()  # loads OPENAI_API_KEY from .env if available

# Centralized default text model and shared OpenAI client
DEFAULT_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4.1-nano"
_client: Optional[OpenAI] = None

def get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()  # uses OPENAI_API_KEY from environment
    return _client

def ensure_api_key():
    if not os.getenv("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set. Create a .env with OPENAI_API_KEY=...", file=sys.stderr)
        sys.exit(1)

def semantic_multiply(a: str, b: str) -> str:
    """
    Ask the model for the 'semantic multiplication' of two terms.
    Supports quick single lookups for ad‑hoc use; for bulk use, prefer --csv.
    """
    client = get_openai_client()
    model = DEFAULT_TEXT_MODEL
    prompt = (
        "Semantic multiplication (*): combine two terms into a single coherent concept.\n"
        "Examples:\n"
        "sufficient * reason = justification\n"
        "analysis * judgment = informed decision\n"
        "precision * durability = reliability\n"
        "probability * consequence = risk\n\n"
        f"Now compute: {a} * {b} ="
    )

    last_err = None
    for attempt in range(2):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            content = resp.choices[0].message.content or ""
            text = content.strip()
            if "=" in text:
                text = text.split("=", 1)[-1].strip()
            return text
        except Exception as e:
            last_err = e
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"semantic_multiply failed: {last_err}")

def semantic_interpret(*, cell: str,
                       col_label: str, col_meaning: str,
                       row_label: str, row_meaning: str,
                       station: Optional[str] = None) -> Dict[str, str]:
    """
    Interpret a semantic cell through column and row ontology perspectives.
    
    Contract per NORMATIVE CF14 v2.1.1:
    1. First interpret through column ontology lens
    2. Then interpret through row ontology lens  
    3. Synthesize into final narrative integrating both perspectives
    
    Args:
        cell: The semantic result to interpret
        col_label: Column ontology label
        col_meaning: Column ontology meaning/definition
        row_label: Row ontology label  
        row_meaning: Row ontology meaning/definition
        station: Optional station context for interpretation
        
    Returns:
        Dict with keys: "column_view", "row_view", "synthesis"
    """
    return _call_llm_for_interpretation(
        cell=cell,
        col_label=col_label, col_meaning=col_meaning,
        row_label=row_label, row_meaning=row_meaning,
        station=station
    )

# CF14 v2.1.1 Interpretation System
SYSTEM_PROMPT_INTERPRET = (
    "You are an interpretation kernel inside the CF14 Chirality Framework. "
    "You must generate reliable knowledge. Follow the order of operations: "
    "1) semantic multiplication, 2) semantic addition, then produce interpretations. "
    "Return concise, plain-language outputs. Avoid fabricating facts."
)

USER_PROMPT_TEMPLATE = """\
You are resolving meaning for a single matrix cell in CF14.

Cell (post Step-1): {cell}

Column lens:
  - label: {col_label}
  - meaning: {col_meaning}

Row lens:
  - label: {row_label}
  - meaning: {row_meaning}

Task:
1) Column view: Interpret the cell through the column ontology lens (one concise paragraph).
2) Row view: Interpret the cell through the row ontology lens (one concise paragraph).
3) Synthesis: Integrate both perspectives into a single concise narrative that preserves both constraints.

Constraints:
- Be specific but concise (2–4 sentences per view, 3–6 sentences for synthesis).
- Use only provided content; do not invent external facts.
- The objective is generating reliable knowledge.

{station_hint}

Output a single JSON object with keys: "column_view", "row_view", "synthesis".
"""

def _station_hint(station: Optional[str]) -> str:
    if not station:
        return ""
    return f"In this context, the current station is '{station}'. Adjust tone/aim accordingly."

def _call_llm_for_interpretation(cell: str,
                                 col_label: str, col_meaning: str,
                                 row_label: str, row_meaning: str,
                                 station: Optional[str]) -> Dict[str, str]:
    """
    Call LLM for semantic interpretation using structured output.
    Returns a dict with keys: column_view, row_view, synthesis.
    """
    # Non-exiting check: Step-2 is optional; if no key, return empty sections
    if not os.getenv("OPENAI_API_KEY"):
        return {"column_view": "", "row_view": "", "synthesis": ""}

    client = get_openai_client()
    model = DEFAULT_TEXT_MODEL
    
    messages: Any = [
        {"role": "system", "content": SYSTEM_PROMPT_INTERPRET},
        {"role": "user", "content": USER_PROMPT_TEMPLATE.format(
            cell=cell,
            col_label=col_label, col_meaning=col_meaning or "(none provided)",
            row_label=row_label, row_meaning=row_meaning or "(none provided)",
            station_hint=_station_hint(station),
        )}
    ]

    last_err = None
    for attempt in range(2):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.0,
                response_format={"type": "json_object"},
                max_tokens=512
            )
            content = resp.choices[0].message.content or ""
            
            # Parse JSON response
            try:
                obj = json.loads(content)
                return {
                    "column_view": obj.get("column_view", "").strip(),
                    "row_view": obj.get("row_view", "").strip(),
                    "synthesis": obj.get("synthesis", "").strip(),
                }
            except json.JSONDecodeError:
                # Fallback: non-JSON model output; place full text in synthesis
                return {
                    "column_view": "",
                    "row_view": "",
                    "synthesis": content.strip(),
                }
        except Exception as e:
            last_err = e
            time.sleep(0.8 * (attempt + 1))
    
    # Final fallback on failure
    return {"column_view": "", "row_view": "", "synthesis": ""}

    # --- Option B: Responses API (if you prefer) ---
    # resp = client.responses.create(
    #     model="gpt-4.1-nano",
    #     input=prompt,
    #     temperature=0.2,
    # )
    # return resp.output_text.strip()

def main():
    ensure_api_key()
    args = sys.argv[1:]

    # Usage:
    #   python {script_name} termA termB
    #   python {script_name} --csv input.csv [--out output.csv] [--model gpt-4.1-nano] [--batch 64]
    #   python {script_name}       # starts REPL
    if not args:
        print("Semantic multiplication REPL (press Enter on an empty line to quit).")
        while True:
            try:
                a = input("First term: ").strip()
                if not a:
                    break
                b = input("Second term: ").strip()
                if not b:
                    break
                res = semantic_multiply(a, b)
                print(f"{a} * {b} = {res}\n")
            except KeyboardInterrupt:
                print("\nExiting.")
                break
        return

    # CSV mode
    if args[0] == "--csv" or (len(args) == 1 and args[0].lower().endswith(".csv")):
        # Normalize flags
        input_csv = args[1] if args[0] == "--csv" and len(args) >= 2 else args[0]
        output_csv = None
        model = None
        batch_size = 64

        # Parse optional flags
        i = 2 if args[0] == "--csv" else 1
        while i < len(args):
            if args[i] in ("--out", "-o") and i + 1 < len(args):
                output_csv = args[i+1]
                i += 2
            elif args[i] == "--model" and i + 1 < len(args):
                model = args[i+1]
                i += 2
            elif args[i] == "--batch" and i + 1 < len(args):
                try:
                    batch_size = max(1, int(args[i+1]))
                except ValueError:
                    print(f"WARNING: Invalid --batch value '{args[i+1]}', defaulting to 64.", file=sys.stderr)
                    batch_size = 64
                i += 2
            else:
                print(f"WARNING: Unrecognized argument '{args[i]}' ignored.", file=sys.stderr)
                i += 1

        try:
            out_path = process_csv(input_csv, output_csv, model=model, batch_size=batch_size)
            print(f"Wrote results to: {out_path}")
        except Exception as e:
            print(f"ERROR (CSV mode): {e}", file=sys.stderr)
            sys.exit(2)
        return

    # If two or more non-flag args provided, treat first two as terms
    if len(args) >= 2 and not args[0].startswith("-") and not args[1].startswith("-"):
        a = args[0]
        b = args[1]
        res = semantic_multiply(a, b)
        print(f"{a} * {b} = {res}")
        return

    # Fallback: show a brief help
        print(f"""\
Usage:
    python {script_name} termA termB
    python {script_name} --csv input.csv [--out output.csv] [--model gpt-4.1-nano] [--batch 64]
    python {script_name}
CSV input must include columns: t1,t2,[context]
Results CSV will include: t1,t2,context,term,alternates,confidence
""")

if __name__ == "__main__":
    main()