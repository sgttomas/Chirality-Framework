"""
Cell-by-cell semantic resolver for precise CF14 operations.

Implements semantic multiplication, addition, and interpretation
on individual matrix cells using structured prompts and JSON responses.
"""

import os
import json
import time
import hashlib
import unicodedata
import re
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime

try:
    from openai import OpenAI  # type: ignore
except Exception:
    OpenAI = None  # Defer hard failure until actually instantiated

from .types import Cell, Matrix


def normalize_text(s: str) -> str:
    """Normalize unicode and whitespace for consistent processing."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", str(s))
    s = re.sub(r"\s+", " ", s).strip()
    return s


def escape_for_prompt(s: str) -> str:
    """Escape string for safe embedding in prompts."""
    return json.dumps(normalize_text(s), ensure_ascii=False)[1:-1]


class CellResolver:
    """Handles semantic operations on individual matrix cells."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        if OpenAI is None:
            raise ImportError("OpenAI package required. Install with: pip install openai")

        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key required")
        
        self.client = OpenAI(api_key=api_key)
        self.model = model
        
        # Temperature settings for different operations
        self.temperatures = {
            "multiply": 0.7,  # Creative intersection
            "add": 0.5,       # Tighter integration
            "interpret": 0.5  # Clear explanation
        }
    
    def _get_system_prompt(self) -> str:
        """Get the standard CF14 system prompt."""
        return """You are the semantic engine for the Chirality Framework (Phase-1 canonical build).

The Chirality Framework is a meta-operating system for meaning. It frames knowledge work as wayfinding through an unknown semantic valley:
- The valley is the conceptual space for this domain.
- Stations are landmarks (each has a distinct role in meaning transformation).
- Rows and columns are fixed ontological axes; preserve them at all times.
- A cell is a coordinate: (row_label × col_label) at a given station.

Mission:
- Operate ONLY within the provided valley + station context.
- Apply exactly ONE semantic operation per call: multiplication (×), addition (+), or interpretation (separate lens).
- Preserve the identity of source terms; integrate them, do not overwrite them.
- Resolve ambiguity inside the operation; do not delete it.
- Keep every output traceable to its sources.

Voice & style (vibe):
- Confident, concrete, humane; no fluff or marketing language.
- Prefer strong verbs and specific nouns over abstractions.
- Avoid hedging ("might", "could") unless uncertainty is essential and then state it plainly.
- Length: × and + = 1–2 sentences. Interpretation ≤ 2 sentences, stakeholder-friendly, ontology-preserving.

Output contract (STRICT):
- Return ONLY a single JSON object with keys: "text", "terms_used", "warnings".
- "terms_used" must echo the exact provided source strings (after normalization) that you actually integrated.
- If any required input is missing/empty, include a warning like "missing_input:<name>".
- Do NOT include code fences, prose, or any text outside the JSON object."""

    def _generate_valley_summary(self, station: str) -> str:
        """Generate valley summary with current station highlighted."""
        stations = ["Problem Statement", "Requirements", "Objectives", "Solution Objectives"]
        
        # Find and bracket current station
        for i, s in enumerate(stations):
            if station.lower() in s.lower() or s.lower() in station.lower():
                stations[i] = f"[{s}]"
                break
        
        return f"Semantic Valley: {' → '.join(stations)}"

    def multiply_terms(self, term_a: str, term_b: str, station: str, 
                      row_label: str = "", col_label: str = "") -> Dict[str, Any]:
        """
        Perform semantic multiplication on two terms.
        
        Args:
            term_a: First term to multiply
            term_b: Second term to multiply  
            station: Current semantic valley station
            row_label: Row ontology label for context
            col_label: Column ontology label for context
            
        Returns:
            Dict with keys: text, terms_used, warnings
        """
        valley_summary = self._generate_valley_summary(station)
        
        user_prompt = f"""Role: expert in conceptual synthesis within station "{escape_for_prompt(station)}" of the semantic valley.

Valley map:
{valley_summary}

Position:
- Row axis: "{escape_for_prompt(row_label)}"
- Column axis: "{escape_for_prompt(col_label)}"

Task (semantic multiplication, ×):
Fuse these meanings at their intersection. Preserve both identities; remain within the station's scope.
- "{escape_for_prompt(term_a)}"
- "{escape_for_prompt(term_b)}"

Output JSON ONLY (no extra text). "terms_used" must include EXACT normalized echoes of both inputs:
{{"text": "", "terms_used": ["{escape_for_prompt(term_a)}","{escape_for_prompt(term_b)}"], "warnings": []}}"""

        return self._call_openai("multiply", user_prompt)

    def add_terms(self, products: List[str], station: str,
                  row_label: str = "", col_label: str = "") -> Dict[str, Any]:
        """
        Perform semantic addition on multiple product terms.
        
        Args:
            products: List of product terms to add
            station: Current semantic valley station  
            row_label: Row ontology label for context
            col_label: Column ontology label for context
            
        Returns:
            Dict with keys: text, terms_used, warnings
        """
        valley_summary = self._generate_valley_summary(station)
        
        product_lines = "\n".join(f'- "{escape_for_prompt(p)}"' for p in (products or []))
        
        user_prompt = f"""Role: expert integrator within station "{escape_for_prompt(station)}" of the semantic valley.

Valley map:
{valley_summary}

Position:
- Row axis: "{escape_for_prompt(row_label)}"
- Column axis: "{escape_for_prompt(col_label)}"

Task (semantic addition, +):
Integrate the following product sentences into one coherent statement WITHOUT flattening distinctions:
{product_lines if product_lines else "- (no products provided)"}

Output JSON ONLY (no extra text). If products are empty, add "warnings": ["missing_input:products"]:
{{"text": "", "terms_used": [], "warnings": []}}"""

        return self._call_openai("add", user_prompt)

    def interpret_term(self, summed_text: str, station: str,
                      row_label: str = "", col_label: str = "") -> Dict[str, Any]:
        """
        Interpret a term for stakeholder clarity.
        
        Args:
            summed_text: Text to interpret
            station: Current semantic valley station
            row_label: Row ontology label for context  
            col_label: Column ontology label for context
            
        Returns:
            Dict with keys: text, terms_used, warnings
        """
        valley_summary = self._generate_valley_summary(station)
        
        user_prompt = f"""Role: explanatory interpreter for stakeholders unfamiliar with the framework.

Valley map:
{valley_summary}

Position:
- Row axis: "{escape_for_prompt(row_label)}"
- Column axis: "{escape_for_prompt(col_label)}"

Input:
"{escape_for_prompt(summed_text)}"

Task (interpretation):
Re-express in clear language for stakeholders, preserving ontology and anchors.

Output JSON ONLY (no extra text):
{{"text": "", "terms_used": [], "warnings": []}}"""

        return self._call_openai("interpret", user_prompt)

    def _call_openai(self, operation: str, user_prompt: str, max_retries: int = 3) -> Dict[str, Any]:
        """Make OpenAI API call with retry logic."""
        system_prompt = self._get_system_prompt()
        temperature = self.temperatures.get(operation, 0.5)
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    temperature=temperature,
                    max_tokens=200,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ]
                )
                
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response from OpenAI")
                
                # Parse JSON response
                try:
                    result = json.loads(content.strip())
                    
                    # Validate required keys
                    if not isinstance(result, dict):
                        raise ValueError("Response is not a JSON object")
                    
                    required_keys = ["text", "terms_used", "warnings"]
                    for key in required_keys:
                        if key not in result:
                            result[key] = [] if key in ["terms_used", "warnings"] else ""
                    
                    return result
                    
                except json.JSONDecodeError as e:
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    raise ValueError(f"Invalid JSON response: {e}")
                
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise RuntimeError(f"OpenAI call failed after {max_retries} attempts: {e}")
        
        # Fallback if all retries fail
        return {
            "text": f"ERROR: Failed to process {operation}",
            "terms_used": [],
            "warnings": [f"openai_failure: {operation}"]
        }