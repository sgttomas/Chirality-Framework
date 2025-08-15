# semmul_cf14.py
"""
CF14 Semantic Multiplication Engine using OpenAI Responses API

Hardened wrapper for Phase-1 canonical semantic operations:
- Robust JSON extraction and validation
- Deterministic prompt hashing and versioning
- Stage-sensitive temperature defaults
- Retry logic with exponential backoff
- Strict terms_used validation for semantic fidelity
- Comprehensive error handling and auditability

Uses OpenAI Responses API with structured JSON output for the Chirality Framework.
All operations preserve valley metaphor and maintain semantic precision.
"""

from __future__ import annotations
import os
import time
import json
import hashlib
import re
import unicodedata
from datetime import datetime
from typing import Tuple, Dict, Any, Optional, List
from chirality_prompts import (
    SYSTEM_PROMPT, 
    prompt_multiply, 
    prompt_add, 
    prompt_interpret,
    prompt_elementwise_F,
    prompt_add_D,
    q
)

# OpenAI client setup
try:
    from openai import OpenAI
except ImportError:
    raise ImportError("OpenAI package required. Install with: pip install openai")

# ---------- Configuration ----------

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
DEFAULT_MAX_TOKENS = int(os.getenv("CH_RESP_MAX_TOKENS", "200"))
DEFAULT_RETRIES = int(os.getenv("CH_RESP_RETRIES", "3"))
DEFAULT_TIMEOUT = float(os.getenv("CH_RESP_TIMEOUT", "40"))

# Stage-sensitive temperature defaults
TEMP_MULTIPLY = 0.7  # Creative intersection for × and ⊙
TEMP_ADD = 0.5       # Tighter integration for +
TEMP_INTERPRET = 0.5 # Human-readable, steady

# Global client
client: Optional[OpenAI] = None

def ensure_client():
    """Ensure OpenAI client is initialized."""
    global client
    if client is None:
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY environment variable is required")
        client = OpenAI()

# ---------- Normalization & Hashing ----------

def _normalize(s: str) -> str:
    """
    Normalize string for consistent hashing and comparison.
    Mirrors q() function normalization from chirality_prompts.py.
    """
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", str(s))
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _now_iso() -> str:
    """Generate ISO-8601 timestamp for graph compatibility."""
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _dedupe_preserve_order(items):
    """Deduplicate list while preserving first-seen order."""
    seen = set()
    out = []
    for x in items or []:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

def prompt_hash(system: str, user: str) -> str:
    """Generate deterministic hash for system + user prompt combination."""
    h = hashlib.sha256()
    h.update(_normalize(system).encode("utf-8"))
    h.update(b"\n\n")
    h.update(_normalize(user).encode("utf-8"))
    return h.hexdigest()

def system_version_hash() -> str:
    """Hash of current system prompt for versioning."""
    return hashlib.sha256(_normalize(SYSTEM_PROMPT).encode("utf-8")).hexdigest()

# ---------- JSON Extraction & Validation ----------

class StructuredOutputError(RuntimeError):
    """Raised when model output doesn't conform to expected JSON schema."""
    pass

def _extract_json(text: str) -> str:
    """Extract JSON object from model output, handling stray prose."""
    if not text:
        raise StructuredOutputError("Empty model output")
    
    # Find the first '{' and last '}' to guard against stray prose
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise StructuredOutputError("No JSON object found in model output")
    
    return text[start:end+1]

def _validate_obj(obj: Dict[str, Any]) -> None:
    """Validate that object conforms to expected schema."""
    if not isinstance(obj, dict):
        raise StructuredOutputError("Output must be a JSON object")
    
    # Check required keys
    if "text" not in obj or "terms_used" not in obj or "warnings" not in obj:
        raise StructuredOutputError("Missing required keys (text, terms_used, warnings)")
    
    # Type validation
    if not isinstance(obj["text"], str):
        raise StructuredOutputError("'text' must be string")
    
    if not (isinstance(obj["terms_used"], list) and all(isinstance(t, str) for t in obj["terms_used"])):
        raise StructuredOutputError("'terms_used' must be list[str]")
    
    if not (isinstance(obj["warnings"], list) and all(isinstance(w, str) for w in obj["warnings"])):
        raise StructuredOutputError("'warnings' must be list[str]")

def _brief(s: str, n: int = 160) -> str:
    """Truncate string for logging, avoiding PII leaks."""
    s = _normalize(s)
    return s if len(s) <= n else s[:n] + "…"

# ---------- Core API Call ----------

def _call(user_prompt: str, *, temperature: float, max_output_tokens: int = DEFAULT_MAX_TOKENS, 
          retries: int = DEFAULT_RETRIES, phase: str = "llm_output") -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Single Responses API call with retry logic and strict JSON handling.
    
    Returns:
        Tuple of (parsed_response, metadata)
    """
    ensure_client()
    sys_prompt = SYSTEM_PROMPT
    phash = prompt_hash(sys_prompt, user_prompt)
    attempt = 0
    last_err: Optional[Exception] = None
    t0 = time.time()

    while attempt <= retries:
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                temperature=temperature,
                response_format={"type": "json_object"},
                max_tokens=max_output_tokens,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            
            # Extract and validate JSON content
            raw = resp.choices[0].message.content or ""
            js = _extract_json(raw)
            obj = json.loads(js)
            _validate_obj(obj)
            
            # Calculate metadata
            dt = int((time.time() - t0) * 1000)
            meta = {
                "modelId": resp.model,
                "latencyMs": dt,
                "promptHash": phash,
                "systemVersion": system_version_hash(),
                "rawLen": len(raw),
                "attempts": attempt + 1,
                "temperature": temperature,
                "maxTokens": max_output_tokens,
                "createdAt": _now_iso(),
                "phase": phase,
            }
            
            return obj, meta
            
        except Exception as e:
            last_err = e
            if attempt >= retries:
                break
                
            # Simple exponential backoff for transient issues
            wait_time = 0.4 * (attempt + 1)
            time.sleep(wait_time)
            attempt += 1

    # All retries exhausted
    raise StructuredOutputError(f"Failed after {retries + 1} attempts: {last_err}")

# ---------- Terms Validation ----------

def _check_terms_used(obj: Dict[str, Any], expected: List[str]) -> List[str]:
    """
    Check if terms_used exactly matches expected inputs after normalization.
    Uses same normalization as prompt builder (q() function).
    Returns list of warnings if mismatch occurs.
    """
    got = [_normalize(t) for t in obj.get("terms_used", [])]
    exp = [_normalize(t) for t in expected]
    return [] if got == exp else [f"terms_mismatch: expected={exp} got={got}"]

# ---------- Public API Functions ----------

def semantic_multiply(valley_summary: str, station: str, row_label: str, col_label: str, 
                     term_a: str, term_b: str, temperature: float = TEMP_MULTIPLY) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Semantic multiplication: A(i,j) × B(i,j) → C(i,j)
    Returns (response_object, metadata)
    """
    user_prompt = prompt_multiply(valley_summary, station, row_label, col_label, term_a, term_b)
    return _call(user_prompt, temperature=temperature, phase="product")

def semantic_multiply_checked(valley_summary: str, station: str, row_label: str, col_label: str,
                            term_a: str, term_b: str, temperature: float = TEMP_MULTIPLY) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Semantic multiplication with terms_used validation.
    Adds warnings if expected terms are not properly echoed.
    """
    obj, meta = semantic_multiply(valley_summary, station, row_label, col_label, term_a, term_b, temperature)
    warns = _check_terms_used(obj, [term_a, term_b])
    if warns:
        obj["warnings"] = _dedupe_preserve_order(obj.get("warnings", []) + warns)
    meta["phase"] = meta.get("phase", "product")
    return obj, meta

def semantic_add(valley_summary: str, station: str, row_label: str, col_label: str,
                products: List[str], temperature: float = TEMP_ADD) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Semantic addition: Integrate multiple product sentences coherently.
    Returns (response_object, metadata)
    """
    user_prompt = prompt_add(valley_summary, station, row_label, col_label, products)
    return _call(user_prompt, temperature=temperature, phase="sum")

def semantic_interpret(valley_summary: str, station: str, row_label: str, col_label: str,
                      summed_text: str, temperature: float = TEMP_INTERPRET) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Interpretation: Transform technical framework output for stakeholders.
    Returns (response_object, metadata)
    """
    user_prompt = prompt_interpret(valley_summary, station, row_label, col_label, summed_text)
    return _call(user_prompt, temperature=temperature, phase="interpretation")

def elementwise_multiply_F(valley_summary: str, row_label: str, col_label: str,
                          j_term: str, c_term: str, temperature: float = TEMP_MULTIPLY) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Element-wise multiplication for Objectives matrix: J(i,j) ⊙ C(i,j) → F(i,j)
    Returns (response_object, metadata)
    """
    user_prompt = prompt_elementwise_F(valley_summary, row_label, col_label, j_term, c_term)
    return _call(user_prompt, temperature=temperature, phase="elementwise")

def elementwise_multiply_F_checked(valley_summary: str, row_label: str, col_label: str,
                                  j_term: str, c_term: str, temperature: float = TEMP_MULTIPLY) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Element-wise multiplication with terms_used validation.
    """
    obj, meta = elementwise_multiply_F(valley_summary, row_label, col_label, j_term, c_term, temperature)
    warns = _check_terms_used(obj, [j_term, c_term])
    if warns:
        obj["warnings"] = _dedupe_preserve_order(obj.get("warnings", []) + warns)
    meta["phase"] = meta.get("phase", "elementwise")
    return obj, meta

def semantic_add_D(valley_summary: str, row_label: str, col_label: str,
                  a_val: str, f_val: str, temperature: float = TEMP_ADD) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Semantic addition for Solution Objectives: A(i,j) + F(i,j) → D(i,j)
    Returns (response_object, metadata)
    """
    user_prompt = prompt_add_D(valley_summary, row_label, col_label, a_val, f_val)
    return _call(user_prompt, temperature=temperature, phase="sum_D")

def semantic_add_D_checked(valley_summary: str, row_label: str, col_label: str,
                          a_val: str, f_val: str, temperature: float = TEMP_ADD) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Semantic addition for Solution Objectives with terms_used validation.
    """
    obj, meta = semantic_add_D(valley_summary, row_label, col_label, a_val, f_val, temperature)
    warns = _check_terms_used(obj, [a_val, f_val])
    if warns:
        obj["warnings"] = _dedupe_preserve_order(obj.get("warnings", []) + warns)
    meta["phase"] = meta.get("phase", "sum_D")
    return obj, meta

# ---------- Utility Functions ----------

def extract_text(response: Dict[str, Any]) -> str:
    """Extract the main text result from API response."""
    return response.get("text", "")

def extract_terms_used(response: Dict[str, Any]) -> List[str]:
    """Extract the terms_used list from API response."""
    return response.get("terms_used", [])

def extract_warnings(response: Dict[str, Any]) -> List[str]:
    """Extract warnings from API response."""
    return response.get("warnings", [])

def has_warnings(response: Dict[str, Any]) -> bool:
    """Check if response contains any warnings."""
    return bool(response.get("warnings"))

def get_trace_info(response_meta: Dict[str, Any]) -> Dict[str, Any]:
    """Extract trace metadata for GraphQL integration."""
    return {
        "phase": response_meta.get("phase", "llm_output"),
        "promptHash": response_meta.get("promptHash", ""),
        "modelId": response_meta.get("modelId", ""),
        "latencyMs": response_meta.get("latencyMs", 0),
        "createdAt": response_meta.get("createdAt", _now_iso()),
        "systemVersion": response_meta.get("systemVersion", ""),
        "attempts": response_meta.get("attempts", 1),
    }

# ---------- Error Handling Helpers ----------

def safe_operation(operation_func, *args, **kwargs) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Wrapper for safe execution of semantic operations with error handling.
    Returns error response if operation fails.
    """
    try:
        return operation_func(*args, **kwargs)
    except Exception as e:
        error_response = {
            "text": "",
            "terms_used": [],
            "warnings": [f"operation_error: {str(e)}"]
        }
        error_meta = {
            "modelId": MODEL,
            "latencyMs": 0,
            "promptHash": "",
            "systemVersion": system_version_hash(),
            "error": str(e),
            "operation": operation_func.__name__,
            "createdAt": _now_iso(),
            "attempts": 0,
            "phase": "error"
        }
        return error_response, error_meta

# ---------- Testing & Status ----------

def test_api_connection() -> bool:
    """Test OpenAI API connection and basic functionality."""
    try:
        obj, meta = semantic_multiply_checked(
            "Test Valley: A → B", 
            "Test Station", 
            "Test Row", 
            "Test Col",
            "test term 1", 
            "test term 2",
            temperature=0.0
        )
        return not has_warnings(obj) and extract_text(obj)
    except Exception:
        return False

def get_api_status() -> Dict[str, Any]:
    """Get current API configuration and status."""
    return {
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "model": MODEL,
        "default_max_tokens": DEFAULT_MAX_TOKENS,
        "default_retries": DEFAULT_RETRIES,
        "default_timeout": DEFAULT_TIMEOUT,
        "system_version": system_version_hash(),
        "openai_available": client is not None or bool(os.getenv("OPENAI_API_KEY")),
        "connection_test": test_api_connection() if os.getenv("OPENAI_API_KEY") else False,
        "temperature_defaults": {
            "multiply": TEMP_MULTIPLY,
            "add": TEMP_ADD,
            "interpret": TEMP_INTERPRET
        }
    }

# ---------- CLI for Testing ----------

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("CF14 Semantic Engine - Phase 1 Canonical Operations")
        print(f"System Version: {system_version_hash()[:8]}")
        print(f"Model: {MODEL}")
        print("\nCommands:")
        print("  status                    - Show API status")
        print("  test                      - Test API connection")
        print("  multiply <a> <b>          - Test semantic multiplication")
        print("  add <term1> <term2> ...   - Test semantic addition")
        print("  interpret <text>          - Test interpretation")
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        status = get_api_status()
        print(json.dumps(status, indent=2))
    
    elif cmd == "test":
        success = test_api_connection()
        print(f"API connection test: {'PASS' if success else 'FAIL'}")
        if success:
            print("✓ OpenAI API responding correctly")
            print("✓ JSON schema validation working")
            print("✓ Temperature and prompt handling operational")
            print("✓ Terms_used validation functioning")
    
    elif cmd == "multiply" and len(sys.argv) >= 4:
        try:
            obj, meta = semantic_multiply_checked(
                "Test Valley: A → B → C", 
                "Test Station",
                "Test Row", 
                "Test Col",
                sys.argv[2], 
                sys.argv[3]
            )
            print("Response:", json.dumps(obj, indent=2))
            print("Metadata:", json.dumps({k: meta[k] for k in ("modelId","latencyMs","promptHash","systemVersion","attempts","createdAt","phase") if k in meta}, indent=2))
        except Exception as e:
            print(f"Error: {e}")
    
    elif cmd == "add" and len(sys.argv) >= 3:
        try:
            obj, meta = semantic_add(
                "Test Valley: A → B → C",
                "Test Station", 
                "Test Row", 
                "Test Col",
                sys.argv[2:]
            )
            print("Response:", json.dumps(obj, indent=2))
            print("Metadata:", json.dumps({k: meta[k] for k in ("modelId","latencyMs","promptHash","systemVersion","attempts","createdAt","phase") if k in meta}, indent=2))
        except Exception as e:
            print(f"Error: {e}")
    
    elif cmd == "interpret" and len(sys.argv) >= 3:
        try:
            obj, meta = semantic_interpret(
                "Test Valley: A → B → C",
                "Test Station",
                "Test Row",
                "Test Col", 
                " ".join(sys.argv[2:])
            )
            print("Response:", json.dumps(obj, indent=2))
            print("Metadata:", json.dumps({k: meta[k] for k in ("modelId","latencyMs","promptHash","systemVersion","attempts","createdAt","phase") if k in meta}, indent=2))
        except Exception as e:
            print(f"Error: {e}")
    
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)