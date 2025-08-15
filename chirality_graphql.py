# chirality_graphql.py
# Enriched GraphQL client for Chirality Phase-1
# - Rich PullCell (valley/station/axes/matrix/cell + ontologies + JSON-LD context)
# - Stage upsert with contentHash for idempotency
# - UFO claim helpers (propose/adjudicate/add evidence)
# - Small utilities: robust session, hashing, valley summary

from __future__ import annotations
import os
import time
import uuid
import json
import hashlib
import requests
from typing import Any, Dict, Optional, List, Tuple, Union

# ---------- GraphQL documents ----------

_GQL_PULL_CELL_RICH = """
query PullCell($station: String!, $matrix: String!, $row: Int!, $col: Int!, $includeOntologies: Boolean = true) {
  valley { id name version stations { id name index } ontology @include(if: $includeOntologies) { id iri curie label definition version source } }
  station(id: $station) { id name index ontology @include(if: $includeOntologies) { id iri curie label definition version source } axes {
    row { name labels ontology @include(if: $includeOntologies) { id iri curie label definition version source } }
    col { name labels ontology @include(if: $includeOntologies) { id iri curie label definition version source } }
  }}
  matrix(id: $matrix, station: $station) {
    id name stationId rowLabels colLabels
    ontology @include(if: $includeOntologies) { id iri curie label definition version source }
    cell(row: $row, col: $col) {
      row col stage version value
      labels { rowLabel colLabel }
      anchors { id kind text }
      traces { phase promptHash modelId latencyMs createdAt }
      ontology @include(if: $includeOntologies) { id iri curie label definition version source }
    }
  }
  ontologies @include(if: $includeOntologies) {
    jsonldContext
    entities { id iri curie label definition version source
      alignments { relation confidence target { id iri curie label } evidenceIds }
    }
  }
}
"""

# Per-cell stage upsert with content addressing for idempotency
_GQL_UPSERT_CELL_STAGE = """
mutation UpsertCellStage($input: CellStageInput!) {
  upsertCellStage(input: $input) { ok id version contentHash deduped }
}
"""

# UFO claim helpers
_GQL_PROPOSE_UFO = """
mutation ProposeUFO($input: ProposeUFOClaimInput!) {
  proposeUFOClaim(input: $input) {
    id status confidence
    ufoRef { curie label }
    subject { __typename ... on Cell { row col } ... on Station { name } ... on Matrix { id name } ... on Valley { name } }
    evidence { id kind source createdAt }
  }
}
"""

_GQL_ADJUDICATE_UFO = """
mutation AdjudicateUFO($id: ID!, $status: ClaimStatus!, $note: String) {
  adjudicateUFOClaim(id: $id, status: $status, note: $note) {
    id status note adjudicatedBy adjudicatedAt
  }
}
"""

_GQL_ADD_EVIDENCE = """
mutation AddEvidence($id: ID!, $evidence: EvidenceInput!) {
  addEvidenceToUFOClaim(id: $id, evidence: $evidence) {
    id confidence evidence { id kind source createdAt }
  }
}
"""

# ---------- HTTP + GraphQL helpers ----------

# module-level session + config
_SESSION: Optional[requests.Session] = None
_DEFAULT_TIMEOUT = float(os.getenv("CH_GQL_TIMEOUT", "40"))
_DEFAULT_CONNECT_TIMEOUT = float(os.getenv("CH_GQL_CONNECT_TIMEOUT", "3.05"))
_DEFAULT_RETRIES = int(os.getenv("CH_GQL_RETRIES", "5"))
_AUTH_TOKEN = os.getenv("CH_GQL_BEARER")  # set to your API token if needed
_USER_AGENT = os.getenv("CH_USER_AGENT", "chirality-phase1/1.0")

def _make_session() -> requests.Session:
    s = requests.Session()
    try:
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        retry = Retry(
            total=_DEFAULT_RETRIES,
            backoff_factor=0.4,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["POST"])
        )
        s.mount("http://", HTTPAdapter(max_retries=retry))
        s.mount("https://", HTTPAdapter(max_retries=retry))
    except Exception:
        pass
    headers = {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        "User-Agent": _USER_AGENT,
        "X-Trace-Id": str(uuid.uuid4()),
    }
    if _AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {_AUTH_TOKEN}"
    s.headers.update(headers)
    return s

def _session() -> requests.Session:
    global _SESSION
    if _SESSION is None:
        _SESSION = _make_session()
    return _SESSION

class GraphQLError(RuntimeError):
    def __init__(self, messages: str, errors: Any):
        super().__init__(messages)
        self.errors = errors

def _format_gql_errors(errors: Any) -> str:
    # errors is typically a list of {message, path, extensions:{code,...}}
    parts = []
    if isinstance(errors, list):
        for e in errors:
            msg = e.get("message", "Unknown error")
            path = ".".join(map(str, e.get("path", []))) if isinstance(e.get("path"), list) else ""
            code = (e.get("extensions") or {}).get("code", "")
            parts.append(f"{msg} [path:{path} code:{code}]")
    else:
        parts.append(str(errors))
    return "; ".join(parts) or "GraphQL error"

def gql(api_base: str, query: str, variables: Dict[str, Any], *, retry_on_gql_rate_limit: bool = True) -> Dict[str, Any]:
    url = api_base.rstrip("/") + "/graphql"
    payload = {"query": query, "variables": variables}
    s = _session()
    t0 = time.time()
    resp = s.post(url, json=payload, timeout=(_DEFAULT_CONNECT_TIMEOUT, _DEFAULT_TIMEOUT))
    elapsed = int((time.time() - t0) * 1000)

    # HTTP-level errors
    resp.raise_for_status()
    data = resp.json()

    # GraphQL-level errors (HTTP 200 but body has errors)
    if "errors" in data and data["errors"]:
        msg = _format_gql_errors(data["errors"])
        # Simple retry if rate-limited at GQL layer
        if retry_on_gql_rate_limit and "RATE_LIMIT" in msg.upper():
            time.sleep(0.5)  # tiny backoff; HTTPAdapter already retries on 429
            resp = s.post(url, json=payload, timeout=(_DEFAULT_CONNECT_TIMEOUT, _DEFAULT_TIMEOUT))
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data and data["errors"]:
                raise GraphQLError(_format_gql_errors(data["errors"]), data["errors"])
        else:
            raise GraphQLError(msg, data["errors"])

    d = data.get("data")
    if d is None:
        raise GraphQLError("GraphQL response missing 'data' field", data)
    # Optionally log success + ms
    # print(f"GQL {elapsed}ms: {variables.get('station')}/{variables.get('matrix')} ({variables.get('row')},{variables.get('col')})")
    return d

# ---------- Content addressing & tiny utils ----------

def content_hash(*parts: Any) -> str:
    """
    Deterministic SHA-256 over a list of parts (converted to JSON-ish bytes).
    Used to make stage upserts idempotent across retries or replays.
    """
    h = hashlib.sha256()
    for p in parts:
        if p is None: 
            h.update(b"null")
        elif isinstance(p, (dict, list, tuple)):
            h.update(json.dumps(p, sort_keys=True, ensure_ascii=False).encode("utf-8"))
        else:
            h.update(str(p).encode("utf-8"))
    return h.hexdigest()

def valley_summary_from_graph(valley: Dict[str, Any] | None, station: Dict[str, Any] | None) -> str:
    """
    Build a compact valley map like:
      Semantic Valley: Problem Statement → [Requirements] → Objectives → Solution Objectives
    Brackets mark the current station (by index).
    """
    if not valley or not isinstance(valley, dict):
        return "Semantic Valley: Problem Statement → Requirements → Objectives → Solution Objectives"
    stations = valley.get("stations") or []
    names: List[str] = []
    for i, s in enumerate(stations):
        names.append(s.get("name", f"Station {i}"))
    if not names:
        names = ["Problem Statement", "Requirements", "Objectives", "Solution Objectives"]
    cur = (station or {}).get("index", None)
    if isinstance(cur, int) and 0 <= cur < len(names):
        names[cur] = f"[{names[cur]}]"
    return f"Semantic Valley: {' → '.join(names)}"

# ---------- Public API: Pull (rich), Push stage (idempotent), UFO ops ----------

def pull_cell_with_context(
    api_base: str, station: str, matrix: str, row: int, col: int, include_ontologies: bool = True
) -> Dict[str, Any]:
    """
    Pull a single cell with full valley/station/matrix context and, optionally, ontology pack.
    Returns a dict with keys: valley, station, matrix, ontologies (optional).
    """
    return gql(
        api_base,
        _GQL_PULL_CELL_RICH,
        {"station": station, "matrix": matrix, "row": row, "col": col, "includeOntologies": include_ontologies},
    )

def upsert_cell_stage(
    api_base: str,
    *,
    station: str,
    matrix: str,
    row: int,
    col: int,
    stage: str,
    value: str,
    model_id: str,
    prompt_hash: str,
    labels: Optional[Dict[str, str]] = None,
    anchors: Optional[List[Dict[str, Any]]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Upsert a per-cell stage with a contentHash so replays are idempotent.
    contentHash = sha256(station,matrix,row,col,stage,value,promptHash)  (+ labels/meta for extra strictness)
    """
    payload = {
        "station": station,
        "matrix": matrix,
        "row": row,
        "col": col,
        "stage": stage,
        "value": value,
        "modelId": model_id,
        "promptHash": prompt_hash,
        "labels": labels or {},
        "anchors": anchors or [],
        "meta": meta or {},
        "canonical": True,
        "contentHash": content_hash(station, matrix, row, col, stage, value, prompt_hash, labels or {}, anchors or [], meta or {}),
    }
    return gql(api_base, _GQL_UPSERT_CELL_STAGE, {"input": payload})

# ---------- UFO claim helpers ----------

def propose_ufo_claim(
    api_base: str,
    *,
    subject_id: str,
    ufo_curie: str,
    relation: str,      # "EXACT_MATCH"|"CLOSE_MATCH"|...
    confidence: float,  # 0..1
    evidence: List[Dict[str, Any]],
    note: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Propose a UFO alignment for a valley/ station/ matrix/ cell (subject is a stable id in your graph).
    Evidence items look like:
      {"kind":"LLM_OUTPUT","source":"phase1.C.product:k=2","payload":{...},"promptHash":"...","modelId":"..."}
    """
    inp = {
        "subjectId": subject_id,
        "ufoCurie": ufo_curie,
        "relation": relation,
        "confidence": confidence,
        "evidence": evidence,
        "note": note,
    }
    return gql(api_base, _GQL_PROPOSE_UFO, {"input": inp})

def adjudicate_ufo_claim(api_base: str, *, claim_id: str, status: str, note: Optional[str] = None) -> Dict[str, Any]:
    """
    Adjudicate a UFO claim: status in {"PROPOSED","ACCEPTED","REJECTED","SUPERSEDED"} (enum spelled server-side).
    """
    return gql(api_base, _GQL_ADJUDICATE_UFO, {"id": claim_id, "status": status, "note": note})

def add_evidence_to_ufo_claim(
    api_base: str, *, claim_id: str, evidence: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Append additional evidence to an existing UFO claim (e.g., human note, embedding neighbor, ontology match).
    """
    return gql(api_base, _GQL_ADD_EVIDENCE, {"id": claim_id, "evidence": evidence})

# ---------- Convenience: stable subject ids (optional) ----------

def stable_cell_id(station_id: str, matrix_id: str, row: int, col: int) -> str:
    """
    Derive a stable id for a cell (deterministic across services), e.g.:
      "cell:sha256:3a1f…"
    Uses IDs instead of display names to remain stable across renames.
    """
    h = content_hash(f"stationId={station_id}", f"matrixId={matrix_id}", f"row={row}", f"col={col}")
    return f"cell:sha256:{h}"

# ---------- Usage Guards and Batch Helpers ----------

def safe_pull_cell_with_context(
    api_base: str, station: str, matrix: str, row: int, col: int, include_ontologies: bool = True
) -> Dict[str, Any]:
    """
    Pull cell with safe handling of optional fields.
    Returns dict with guaranteed keys: valley, station, matrix, ontologies (empty if not included).
    """
    ctx = pull_cell_with_context(api_base, station, matrix, row, col, include_ontologies)
    return {
        "valley": ctx.get("valley") or {},
        "station": ctx.get("station") or {},
        "matrix": ctx.get("matrix") or {},
        "ontologies": ctx.get("ontologies") or {"jsonldContext": {}, "entities": []}
    }