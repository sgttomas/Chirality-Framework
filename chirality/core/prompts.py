# chirality_prompts.py
"""
Prompt templates and canonical system message for the Chirality Framework Phase-1 build.

The core metaphor: Wayfinding through an unknown semantic valley.
Each station is a landmark in this valley.
Each matrix cell is a coordinate (row_label × col_label) inside that landmark.
Your job as the LLM: preserve and integrate meaning while mapping it faithfully into the valley's meta-ontology.
"""

import re
import unicodedata
import json

def q(s: str) -> str:
    """Normalize unicode, collapse whitespace, and escape for prompt embedding."""
    if s is None:
        return ""
    # Normalize unicode to NFKC (e.g., curly quotes → straight)
    s = unicodedata.normalize("NFKC", str(s))
    # Collapse internal whitespace while preserving single spaces
    s = re.sub(r"\s+", " ", s).strip()
    # Escape for embedding between quotes in our prompts
    # Use json.dumps then strip outer quotes for robust escaping
    return json.dumps(s, ensure_ascii=False)[1:-1]

def _ensure_valley_summary(valley_summary: str) -> str:
    return valley_summary.strip() or "Semantic Valley: Problem Statement → Requirements → Objectives → Solution Objectives"

# Canonical system prompt — used for all semantic operations
SYSTEM_PROMPT = """\
You are the semantic engine for the Chirality Framework (Phase-1 canonical build).

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
- Do NOT include code fences, prose, or any text outside the JSON object.
"""

def generate_valley_summary(valley: dict | None, station: dict | None) -> str:
    """
    Build a compact 'valley map' like:
      Semantic Valley: Problem Statement → [Requirements] → Objectives → Solution Objectives
    The current station is bracketed.
    Expects GraphQL shapes:
      valley = { "stations": [ { "name": str, "index": int }, ... ] }
      station = { "index": int, "name": str }
    """
    if not valley or not isinstance(valley, dict):
        return "Semantic Valley: Problem Statement → Requirements → Objectives → Solution Objectives"
    stations = valley.get("stations") or []
    names = []
    for i, s in enumerate(stations):
        names.append(s.get("name", f"Station {i}"))
    if not names:
        names = ["Problem Statement", "Requirements", "Objectives", "Solution Objectives"]
    cur = (station or {}).get("index", None)
    if isinstance(cur, int) and 0 <= cur < len(names):
        names[cur] = f"[{names[cur]}]"
    return f"Semantic Valley: {' → '.join(names)}"

# === User-prompt templates ===

def prompt_multiply(valley_summary, station, row_label, col_label, term_a, term_b):
    valley_summary = _ensure_valley_summary(valley_summary)
    return f"""\
Role: expert in conceptual synthesis within station "{q(station)}" of the semantic valley.

Valley map:
{valley_summary}

Position:
- Row axis: "{q(row_label)}"
- Column axis: "{q(col_label)}"

Task (semantic multiplication, ×):
Fuse these meanings at their intersection. Preserve both identities; remain within the station's scope.
- "{q(term_a)}"
- "{q(term_b)}"

Output JSON ONLY (no extra text). "terms_used" must include EXACT normalized echoes of both inputs:
{{"text": "", "terms_used": ["{q(term_a)}","{q(term_b)}"], "warnings": []}}
"""

def prompt_add(valley_summary, station, row_label, col_label, products: list[str]):
    valley_summary = _ensure_valley_summary(valley_summary)
    product_lines = "\n".join(f'- "{q(p)}"' for p in (products or []))
    return f"""\
Role: expert integrator within station "{q(station)}" of the semantic valley.

Valley map:
{valley_summary}

Position:
- Row axis: "{q(row_label)}"
- Column axis: "{q(col_label)}"

Task (semantic addition, +):
Integrate the following product sentences into one coherent statement WITHOUT flattening distinctions:
{product_lines if product_lines else "- (no products provided)"}

Output JSON ONLY (no extra text). If products are empty, add "warnings": ["missing_input:products"]:
{{"text": "", "terms_used": [], "warnings": []}}
"""

def prompt_interpret(valley_summary, station, row_label, col_label, summed_text):
    valley_summary = _ensure_valley_summary(valley_summary)
    return f"""\
Role: explanatory interpreter for stakeholders unfamiliar with the framework.

Valley map:
{valley_summary}

Position:
- Row axis: "{q(row_label)}"
- Column axis: "{q(col_label)}"

Input:
"{q(summed_text)}"

Task (interpretation):
Re-express in clear language for stakeholders, preserving ontology and anchors.

Output JSON ONLY (no extra text):
{{"text": "", "terms_used": [], "warnings": []}}
"""

def prompt_elementwise_F(valley_summary, row_label, col_label, j_term, c_term):
    valley_summary = _ensure_valley_summary(valley_summary)
    return f"""\
Role: expert in conceptual synthesis within station "Objectives" of the semantic valley.

Valley map:
{valley_summary}

Position (SAME coordinate across inputs):
- Row axis: "{q(row_label)}"
- Column axis: "{q(col_label)}"

Task (element-wise multiplication for Objectives, ⊙):
Intersect the Objective frame and the Requirement for the SAME coordinate (i,j). Preserve both identities.
- J(i,j): "{q(j_term)}"
- C(i,j): "{q(c_term)}"

Output JSON ONLY (no extra text). "terms_used" must include EXACT normalized echoes of both inputs:
{{"text": "", "terms_used": ["{q(j_term)}","{q(c_term)}"], "warnings": []}}
"""

def prompt_add_D(valley_summary, row_label, col_label, a_val, f_val):
    valley_summary = _ensure_valley_summary(valley_summary)
    composed = f'{q(a_val)} applied to frame the problem; {q(f_val)} to resolve the problem.'
    return f"""\
Role: narrative synthesizer within station "Solution Objectives".

Valley map:
{valley_summary}

Position:
- Row axis: "{q(row_label)}"
- Column axis: "{q(col_label)}"

Task (semantic addition, +):
Compose a single sentence in the pattern:
"{q(a_val)} applied to frame the problem; {q(f_val)} to resolve the problem."

Output JSON ONLY (no extra text). "terms_used" must echo A and F exactly:
{{"text": "{composed}", "terms_used": ["{q(a_val)}","{q(f_val)}"], "warnings": []}}
"""