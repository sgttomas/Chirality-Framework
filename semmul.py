#!/usr/bin/env python3
"""
CF14 Semantic Kernel (normative, structure-first)

- Code is scaffolding; meaning is produced by the model in its context window.
- Python builds strict frames for each primitive semantic operation and preserves full lineage.
- Deterministic where appropriate (semantic addition is concatenation).
- Uses OpenAI API with JSON-only outputs for robust chaining.

Public, CLI-facing helpers (back-compat with chirality_cli.py):
  ensure_api_key()                   -> exits if missing
  semantic_multiply(a, b)           -> str
  semantic_multiply_full(a, b, ...) -> SemanticResult
  semantic_add(terms)               -> str
  semantic_add_full(terms, ...)     -> SemanticResult
  semantic_interpret(...)           -> dict[column_view,row_view,synthesis]
  semantic_interpret_full(...)      -> SemanticResult
  semantic_cross_product(seed,lens) -> str
  semantic_cross_product_full(...)  -> SemanticResult
  initial_vector(...)               -> dict (IV for bootstrap)
"""

from __future__ import annotations

import os
import sys
import json
import logging
import time
import random
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

CF_VERSION = os.getenv("CF14_VERSION", "14.2.1.1")
DEFAULT_TEXT_MODEL = (
    os.getenv("CHIRALITY_MODEL")
    or os.getenv("OPENAI_TEXT_MODEL")
    or os.getenv("OPENAI_MODEL")
    or "gpt-4o"   # Using best available model
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S'
)

# OpenAI client
try:
    from openai import OpenAI
except Exception:
    OpenAI = None

_client: Optional["OpenAI"] = None


def ensure_api_key():
    """Hard enforcement: exit when API key missing to prevent meaningless join-only generation."""
    if not os.getenv("OPENAI_API_KEY"):
        logging.error("OPENAI_API_KEY not set. CF14 semantic generation requires a language model.")
        raise SystemExit(1)


def get_openai_client() -> "OpenAI":
    """Lazy singleton client; requires ensure_api_key() first."""
    global _client
    if _client is None:
        if OpenAI is None:
            logging.error("OpenAI SDK not available. Install `openai` package.")
            raise SystemExit(1)
        _client = OpenAI()  # reads OPENAI_API_KEY
    return _client


# -----------------------------------------------------------------------------
# Core types
# -----------------------------------------------------------------------------

class SemanticOperation(Enum):
    MULTIPLY = "MULTIPLY"        # semantic multiplication (LLM)
    ADD = "ADD"                  # semantic addition (deterministic concatenation)
    INTERPRET = "INTERPRET"      # interpret via column lens, row lens, then synthesize (LLM)
    CROSS_PRODUCT = "CROSS_PRODUCT"  # tensor-like expansion / lens-based expansion (LLM)


@dataclass
class OntologyContext:
    row_label: Optional[str] = None
    row_meaning: Optional[str] = None
    col_label: Optional[str] = None
    col_meaning: Optional[str] = None
    station: Optional[str] = None
    matrix: Optional[str] = None
    # room for future: subject/domain/UFO if you choose to pass them here


@dataclass
class SemanticFrame:
    operation: SemanticOperation
    terms: List[str] = field(default_factory=list)
    ontology: Optional[OntologyContext] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SemanticResult:
    resolved: str
    inputs: Dict[str, Any]
    ontology: Dict[str, Any]
    intermediates: List[Dict[str, Any]]
    operation: str
    meta: Dict[str, Any] = field(default_factory=dict)


# -----------------------------------------------------------------------------
# Small utilities
# -----------------------------------------------------------------------------

def _norm(s: Optional[str]) -> str:
    if not s:
        return ""
    return " ".join(str(s).strip().split())


def _json(obj: Any) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return str(obj)


def _llm_json(messages: List[Dict[str, str]], model: Optional[str] = None, 
              max_retries: int = 3) -> Dict[str, Any]:
    """
    Call the OpenAI API with JSON-only output.
    Returns parsed dict; if parsing fails, returns {"_raw": "..."}.
    Includes retry logic for transient errors.
    """
    ensure_api_key()
    client = get_openai_client()
    model = model or DEFAULT_TEXT_MODEL
    
    last_error = None
    for attempt in range(max_retries):
        try:
            # Add exponential backoff with jitter for retries
            if attempt > 0:
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                logging.debug(f"Retry {attempt + 1}/{max_retries} after {wait_time:.1f}s")
                time.sleep(wait_time)
            
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.0,
                response_format={"type": "json_object"},
                max_tokens=512
            )
            
            # Extract content from response
            content = resp.choices[0].message.content
            
            if not content:
                logging.warning("LLM returned empty content")
                return {"_raw": ""}
            
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                logging.warning(f"LLM returned non-JSON; stashing raw output under _raw: {e}")
                return {"_raw": _norm(content)}
                
        except Exception as e:
            last_error = e
            if hasattr(e, 'status_code'):
                if e.status_code in [429, 500, 502, 503, 504]:
                    logging.debug(f"Transient error {e.status_code}, will retry")
                    continue
            logging.warning(f"LLM call error: {e}")
    
    # All retries exhausted
    raise RuntimeError(f"LLM call failed after {max_retries} attempts: {last_error}")


# -----------------------------------------------------------------------------
# Prompts
# -----------------------------------------------------------------------------

SYSTEM_MULTIPLY = (
    "You are the semantic multiplication kernel in the CF14 Chirality Framework.\n"
    "Combine the two input terms into ONE concise phrase for generating reliable knowledge.\n"
    "This is the semantic INTERSECTION of meaning, not concatenation.\n"
    "No external facts. Output JSON with key: product."
)

SYSTEM_INTERPRET = (
    "You are the interpretation kernel in the CF14 Chirality Framework.\n"
    "Task: Interpret the provided cell through the COLUMN lens, then the ROW lens, then synthesize both.\n"
    "Be specific, concise (2-4 sentences per view, 3-6 for synthesis).\n"
    "No external facts. Output JSON with keys: column_view, row_view, synthesis."
)

SYSTEM_CROSS = (
    "You are the semantic cross-product kernel in the CF14 Chirality Framework.\n"
    "Expand the seed through the lens perspective into a higher-dimensional semantic tensor.\n"
    "Create a hierarchy of meaning by exploring the seed through the lens.\n"
    "No external facts. Output JSON with keys: expansion, items (list of expanded concepts), rationale."
)


# -----------------------------------------------------------------------------
# Kernel
# -----------------------------------------------------------------------------

class SemanticKernel:
    """
    Pure dispatcher:
      - MULTIPLY / INTERPRET / CROSS_PRODUCT go to the LLM with structured prompts.
      - ADD is deterministic concatenation (no LLM).
    """

    def __init__(self, model: Optional[str] = None):
        self.model = model or DEFAULT_TEXT_MODEL

    def execute(self, frame: SemanticFrame) -> SemanticResult:
        op = frame.operation
        ontology_dict = asdict(frame.ontology) if frame.ontology else {}
        intermediates: List[Dict[str, Any]] = []

        if op == SemanticOperation.ADD:
            # Deterministic concatenation (semantic '+')
            terms = [_norm(t) for t in frame.terms if _norm(t)]
            resolved = "; ".join(terms)
            intermediates.append({
                "phase": "add_concat",
                "value": resolved,
                "terms": terms
            })
            return SemanticResult(
                resolved=resolved,
                inputs={"terms": frame.terms},
                ontology=ontology_dict,
                intermediates=intermediates,
                operation=op.value,
                meta={"cf_version": CF_VERSION, "model": "deterministic"}
            )

        if op == SemanticOperation.MULTIPLY:
            ensure_api_key()
            a = _norm(frame.terms[0] if frame.terms else "")
            b = _norm(frame.terms[1] if len(frame.terms) > 1 else "")
            messages = [
                {"role": "system", "content": SYSTEM_MULTIPLY},
                {"role": "user", "content": _json({"a": a, "b": b, "ontology": ontology_dict})},
            ]
            obj = _llm_json(messages, model=self.model)
            product = _norm(obj.get("product") or obj.get("_raw") or "")
            intermediates.append({"phase": "llm_product", "value": product, "raw": obj})
            return SemanticResult(
                resolved=product,
                inputs={"a": a, "b": b},
                ontology=ontology_dict,
                intermediates=intermediates,
                operation=op.value,
                meta={"cf_version": CF_VERSION, "model": self.model}
            )

        if op == SemanticOperation.INTERPRET:
            ensure_api_key()
            cell = _norm(frame.terms[0] if frame.terms else "")
            
            # Build payload with optional phase context
            payload = {
                "cell": cell,
                "lenses": {
                    "col": {"label": ontology_dict.get("col_label", ""), "meaning": ontology_dict.get("col_meaning", "")},
                    "row": {"label": ontology_dict.get("row_label", ""), "meaning": ontology_dict.get("row_meaning", "")},
                },
                **({"station": ontology_dict.get("station")} if ontology_dict.get("station") else {})
            }
            
            # Add phase context if provided
            if "phases" in frame.metadata:
                payload["context"] = frame.metadata["phases"]
            
            messages = [
                {"role": "system", "content": SYSTEM_INTERPRET},
                {"role": "user", "content": _json(payload)},
            ]
            obj = _llm_json(messages, model=self.model)

            if "_raw" in obj and not any(k in obj for k in ("column_view", "row_view", "synthesis")):
                # Non-JSON or unexpected schema → stash raw into synthesis
                intermediates.append({"phase": "llm_interpret_raw", "value": obj["_raw"]})
                resolved_synth = obj["_raw"]
                out = {"column_view": "", "row_view": "", "synthesis": resolved_synth}
            else:
                col_view = _norm(obj.get("column_view"))
                row_view = _norm(obj.get("row_view"))
                resolved_synth = _norm(obj.get("synthesis"))
                out = {"column_view": col_view, "row_view": row_view, "synthesis": resolved_synth}
                intermediates.append({"phase": "llm_interpret", "value": out, "raw": obj})

            return SemanticResult(
                resolved=resolved_synth,
                inputs={"cell": cell},
                ontology=ontology_dict,
                intermediates=intermediates,
                operation=op.value,
                meta={"cf_version": CF_VERSION, "model": self.model}
            )

        if op == SemanticOperation.CROSS_PRODUCT:
            ensure_api_key()
            seed = _norm(frame.terms[0] if frame.terms else "")
            lens = _norm(frame.terms[1] if len(frame.terms) > 1 else "")
            messages = [
                {"role": "system", "content": SYSTEM_CROSS},
                {"role": "user", "content": _json({"seed": seed, "lens": lens, "ontology": ontology_dict})},
            ]
            obj = _llm_json(messages, model=self.model)
            expansion = _norm(obj.get("expansion") or obj.get("_raw") or "")
            items = obj.get("items", [])
            rationale = obj.get("rationale", "")
            intermediates.append({
                "phase": "llm_cross", 
                "value": expansion, 
                "items": items,
                "rationale": rationale,
                "raw": obj
            })
            return SemanticResult(
                resolved=expansion,
                inputs={"seed": seed, "lens": lens},
                ontology=ontology_dict,
                intermediates=intermediates,
                operation=op.value,
                meta={"cf_version": CF_VERSION, "model": self.model}
            )

        # Unknown op
        raise ValueError(f"Unsupported operation: {op}")


# Singleton kernel (simple accessor)
_kernel: Optional[SemanticKernel] = None

def get_kernel(model: Optional[str] = None) -> SemanticKernel:
    global _kernel
    if _kernel is None or (model and _kernel.model != model):
        _kernel = SemanticKernel(model=model)
    return _kernel


# -----------------------------------------------------------------------------
# Public, CLI-facing helpers (backward-compatible signatures)
# -----------------------------------------------------------------------------

def semantic_multiply(a: str, b: str,
                      ontology: Optional[OntologyContext] = None,
                      metadata: Optional[Dict[str, Any]] = None) -> str:
    """Return ONLY the product string (legacy shape used by chirality_cli.py)."""
    res = semantic_multiply_full(a, b, ontology=ontology, metadata=metadata)
    return res.resolved


def semantic_multiply_full(a: str, b: str,
                           ontology: Optional[OntologyContext] = None,
                           metadata: Optional[Dict[str, Any]] = None) -> SemanticResult:
    kernel = get_kernel()
    frame = SemanticFrame(
        operation=SemanticOperation.MULTIPLY,
        terms=[a, b],
        ontology=ontology,
        metadata=metadata or {}
    )
    return kernel.execute(frame)


def semantic_add(terms: List[str], context: Optional[Dict[str, Any]] = None) -> str:
    """
    Deterministic semantic addition: concatenate terms into a coherent statement with '; '.
    Returns ONLY the resolved statement – use semantic_add_full for complete lineage.
    """
    res = semantic_add_full(terms, None, context or {})
    return res.resolved


def semantic_add_full(terms: List[str],
                      ontology: Optional[OntologyContext] = None,
                      metadata: Optional[Dict[str, Any]] = None) -> SemanticResult:
    kernel = get_kernel()
    frame = SemanticFrame(
        operation=SemanticOperation.ADD,
        terms=terms,
        ontology=ontology,
        metadata=metadata or {}
    )
    return kernel.execute(frame)


def semantic_interpret(*, cell: str,
                       col_label: str, col_meaning: str,
                       row_label: str, row_meaning: str,
                       station: Optional[str] = None,
                       phase0_join: Optional[str] = None,
                       phase1_product: Optional[str] = None,
                       phase1_sum: Optional[str] = None) -> Dict[str, str]:
    """
    Interpret semantic cell through column and row lenses.
    Returns dict: {"column_view", "row_view", "synthesis"} for CLI compatibility.
    
    Optional phase parameters allow passing minimal context from prior operations.
    """
    kernel = get_kernel()
    ontology = OntologyContext(
        row_label=row_label, row_meaning=row_meaning,
        col_label=col_label, col_meaning=col_meaning,
        station=station
    )
    
    # Build metadata with phase context if provided
    meta = {}
    if phase0_join or phase1_product or phase1_sum:
        meta["phases"] = {
            "phase0_join": phase0_join or "",
            "phase1_product": phase1_product or "",
            "phase1_sum": phase1_sum or ""
        }
    
    frame = SemanticFrame(
        operation=SemanticOperation.INTERPRET,
        terms=[cell],
        ontology=ontology,
        metadata=meta
    )
    result = kernel.execute(frame)
    
    # Extract structured output from last intermediate
    last = result.intermediates[-1] if result.intermediates else {}
    payload = last.get("value", {}) if last.get("phase") in ("llm_interpret", "llm_interpret_raw") else {}
    return {
        "column_view": payload.get("column_view", "") if isinstance(payload, dict) else "",
        "row_view": payload.get("row_view", "") if isinstance(payload, dict) else "",
        "synthesis": result.resolved or (payload if isinstance(payload, str) else "")
    }


def semantic_interpret_full(cell: str,
                            ontology: OntologyContext,
                            metadata: Optional[Dict[str, Any]] = None) -> SemanticResult:
    kernel = get_kernel()
    frame = SemanticFrame(
        operation=SemanticOperation.INTERPRET,
        terms=[cell],
        ontology=ontology,
        metadata=metadata or {}
    )
    return kernel.execute(frame)


def semantic_cross_product(seed: str, lens: str,
                           ontology: Optional[OntologyContext] = None,
                           metadata: Optional[Dict[str, Any]] = None) -> str:
    res = semantic_cross_product_full(seed, lens, ontology=ontology, metadata=metadata)
    return res.resolved


def semantic_cross_product_full(seed: str, lens: str,
                                ontology: Optional[OntologyContext] = None,
                                metadata: Optional[Dict[str, Any]] = None) -> SemanticResult:
    kernel = get_kernel()
    frame = SemanticFrame(
        operation=SemanticOperation.CROSS_PRODUCT,
        terms=[seed, lens],
        ontology=ontology,
        metadata=metadata or {}
    )
    return kernel.execute(frame)


# -----------------------------------------------------------------------------
# Initial Vector Generation (Corrected Schema)
# -----------------------------------------------------------------------------

def initial_vector(
    question: str,
    station1: dict,              # {"id","label"}
    rows_station1: list,         # [{"label","meaning"}, ...]
    cols_station1: list,         # [{"label","meaning"}, ...]
    matrix_station1: str = "A"
) -> dict:
    """
    Generate Initial Vector from a question - bootstraps the semantic space.
    
    Returns the corrected schema:
      {
        "station": {"id","label"},
        "matrix": "A",
        "cell": {"i": 1, "j": 1},
        "subject": "...",
        "domain": "...",
        "ufo": {"endurant","perdurant","quality","relator"},
        "lenses": {"row":{"label","meaning"}, "col":{"label","meaning"}},
        "principles": [...],
        "notes": "..."
      }
    """
    ensure_api_key()
    
    # Build prompt for IV generation
    payload = {
        "question": question.strip(),
        "station": station1,
        "matrix": matrix_station1,
        "cell": {"i": 1, "j": 1},
        "row_family": rows_station1[:3],  # First 3 rows
        "col_family": cols_station1[:4],  # First 4 cols
        "instructions": "Generate Initial Vector with exact schema"
    }
    
    messages = [
        {
            "role": "system", 
            "content": (
                "You are the CF14 Initial Vector kernel. Generate the bootstrap configuration "
                "for the Chirality Framework semantic operations.\n"
                "Start at Station 1 (Problem Statement), Matrix A, Cell (1,1).\n"
                "Choose appropriate row/col lenses from the provided families.\n"
                "Extract subject and domain from the question.\n"
                "Assign all four UFO categories.\n"
                "Output JSON with keys: station, matrix, cell, subject, domain, ufo, lenses, principles, notes."
            )
        },
        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}
    ]
    
    obj = _llm_json(messages, model=DEFAULT_TEXT_MODEL)
    
    # Helper to safely extract with defaults
    def _get(d, k, default): 
        v = d.get(k)
        return v if isinstance(v, type(default)) else default
    
    # Build IV with guaranteed structure
    iv = {
        "station": _get(obj, "station", station1),
        "matrix": _get(obj, "matrix", matrix_station1),
        "cell": _get(obj, "cell", {"i": 1, "j": 1}),
        "subject": _get(obj, "subject", "general knowledge work"),
        "domain": _get(obj, "domain", "General"),
        "ufo": _get(obj, "ufo", {
            "endurant": "",
            "perdurant": "",
            "quality": "",
            "relator": ""
        }),
        "lenses": _get(obj, "lenses", {
            "row": rows_station1[0] if rows_station1 else {"label": "Normative", "meaning": ""},
            "col": cols_station1[0] if cols_station1 else {"label": "Guiding", "meaning": ""}
        }),
        "principles": _get(obj, "principles", [
            "Semantic multiplication before addition (order of operations)",
            "Interpret through column lens, then row lens, then synthesize",
            "Use only provided content - no external facts"
        ]),
        "notes": _get(obj, "notes", "Bootstrap configuration for CF14 semantic operations")
    }
    
    return iv


# -----------------------------------------------------------------------------
# Simple CLI for local smoke tests
# -----------------------------------------------------------------------------

def main():
    """Minimal CLI for testing semantic operations."""
    if len(sys.argv) == 1:
        print(f"Chirality Framework Semantic Kernel v{CF_VERSION}")
        print("\nUsage:")
        print("  python semmul.py multiply <term1> <term2>")
        print("  python semmul.py add <term1> <term2> ...")
        print("  python semmul.py interpret <cell> <col_label> <row_label> [station]")
        print("  python semmul.py cross <seed> <lens>")
        print("\nThis kernel implements ONLY the primitive semantic operations.")
        print("All semantic work happens in the LLM context window.")
        return

    op = sys.argv[1].lower()

    if op == "multiply" and len(sys.argv) >= 4:
        ensure_api_key()
        result = semantic_multiply(sys.argv[2], sys.argv[3])
        print(f"{sys.argv[2]} * {sys.argv[3]} = {result}")

    elif op == "add" and len(sys.argv) >= 3:
        # No key required for ADD (deterministic)
        result = semantic_add(sys.argv[2:])
        print(f"Semantic sum: {result}")

    elif op == "interpret" and len(sys.argv) >= 5:
        ensure_api_key()
        out = semantic_interpret(
            cell=sys.argv[2],
            col_label=sys.argv[3],
            col_meaning="",
            row_label=sys.argv[4],
            row_meaning="",
            station=sys.argv[5] if len(sys.argv) > 5 else None
        )
        print(json.dumps(out, indent=2, ensure_ascii=False))
        
    elif op == "cross" and len(sys.argv) >= 4:
        ensure_api_key()
        result = semantic_cross_product(sys.argv[2], sys.argv[3])
        print(f"Cross product: {result}")

    else:
        print(f"Unknown operation or invalid arguments: {' '.join(sys.argv[1:])}")


if __name__ == "__main__":
    main()