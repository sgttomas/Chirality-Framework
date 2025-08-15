#!/usr/bin/env python3
# chirality_cli.py — Phase-1 canonical (compact)
from __future__ import annotations

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import os, sys, json, argparse, logging, traceback
from typing import List, Tuple, Iterable, Dict, Any

from normative_spec import parse_normative_spec
from chirality_graphql import (
    pull_cell_with_context, upsert_cell_stage,
    valley_summary_from_graph, stable_cell_id, propose_ufo_claim
)
from chirality_prompts import (
    prompt_multiply, prompt_add, prompt_interpret,
    prompt_elementwise_F, prompt_add_D
)
import semmul_cf14 as sm

LOG = logging.getLogger("chirality-cli")
logging.basicConfig(level=os.getenv("LOGLEVEL","INFO"), format="%(message)s")

# ---- UFO defaults ------------------------------------------------------------
UFO_DEFAULTS = {
    ("Requirements","C"):            {"curie":"UFO:Requirement",   "relation":"CLOSE_MATCH","confidence":0.75},
    ("Objectives","F"):              {"curie":"UFO:Objective",     "relation":"CLOSE_MATCH","confidence":0.70},
    ("Solution Objectives","D"):     {"curie":"UFO:Recommendation","relation":"CLOSE_MATCH","confidence":0.70},
}
def ufo_for(station: str, matrix: str): return UFO_DEFAULTS.get((station,matrix))

# ---- small utils -------------------------------------------------------------
def _int_list(spec: str|None, default: List[int]) -> List[int]:
    if not spec: return default
    out: List[int] = []
    for tok in spec.split(","):
        tok = tok.strip()
        if not tok: continue
        if ".." in tok:
            a,b = tok.split(".."); out += list(range(int(a), int(b)+1))
        else: out.append(int(tok))
    seen=set(); res=[]
    for n in out:
        if n not in seen: seen.add(n); res.append(n)
    return res

def _iter_cells(rows: List[int], cols: List[int]) -> Iterable[Tuple[int,int]]:
    for i in rows:
        for j in cols:
            yield (i,j)

def _labels(ctx: Dict[str,Any], i:int, j:int) -> Tuple[str|None, str|None]:
    m = ctx.get("matrix") or {}
    rows = m.get("rowLabels") or []
    cols = m.get("colLabels") or []
    return (rows[i] if i < len(rows) else None, cols[j] if j < len(cols) else None)

def _log_stage(args, station, matrix, i, j, stage, upsert_result, meta=None):
    ver = upsert_result["upsertCellStage"]["version"]
    ded = upsert_result["upsertCellStage"]["deduped"]
    if args.log_json:
        rec = {"event":"stage_write","station":station,"matrix":matrix,"i":i,"j":j,
               "stage":stage,"version":ver,"deduped":ded}
        if meta:
            rec.update({k:meta.get(k) for k in ("modelId","latencyMs","promptHash","systemVersion")})
        LOG.info(json.dumps(rec, ensure_ascii=False))
    else:
        LOG.info(f"{station}/{matrix}[{i},{j}] {stage} → v{ver}{' (deduped)' if ded else ''}")

def _infer_k_from_graph(api: str) -> int:
    a0 = pull_cell_with_context(api, "Problem Statement","A",0,0, include_ontologies=False)
    b0 = pull_cell_with_context(api, "Decisions","B",0,0, include_ontologies=False)
    a_cols = len((a0.get("matrix") or {}).get("colLabels") or [])
    b_rows = len((b0.get("matrix") or {}).get("rowLabels") or [])
    if a_cols != b_rows:
        raise ValueError(f"Shape mismatch: A.cols={a_cols} != B.rows={b_rows}. Seed axioms first.")
    return a_cols

def _ufo(args, station, matrix, i, j, evidence_obj, evidence_meta):
    if not args.ufo_propose: return
    cfg = ufo_for(station, matrix)
    if not cfg: return
    try:
        _ = propose_ufo_claim(
            args.api_base,
            subject_id=stable_cell_id(station, matrix, i, j),
            ufo_curie=cfg["curie"], relation=cfg["relation"], confidence=cfg["confidence"],
            evidence=[{"kind":"LLM_OUTPUT","source":f"phase1.{matrix}.{station}.sum",
                       "payload":evidence_obj,"promptHash":evidence_meta.get("promptHash"),
                       "modelId":evidence_meta.get("modelId")}],
            note=f"Auto-proposed for {station}/{matrix}[{i},{j}]"
        )
        if not args.log_json:
            LOG.info(f"UFO proposed: {cfg['curie']} for {station}/{matrix}[{i},{j}]")
    except Exception as e:
        LOG.warning(f"UFO proposal failed for {station}/{matrix}[{i},{j}]: {e}")

# ---- commands ---------------------------------------------------------------
def cmd_push_axioms(args):
    spec = parse_normative_spec(args.spec)
    model = args.model
    def push_matrix(station, name, M, stage):
        rows, cols, cells = M["rows"], M["cols"], M["cells"]
        for i,row in enumerate(cells):
            for j,val in enumerate(row):
                if args.dry_run:
                    LOG.info(f"[dry-run] {station}/{name}[{i},{j}] {stage}: {str(val)[:120]}"); continue
                res = upsert_cell_stage(args.api_base, station=station, matrix=name, row=i, col=j,
                    stage=stage, value=str(val), model_id=model, prompt_hash=f"{stage}:{name}:{i}:{j}",
                    labels={"rowLabel": rows[i], "colLabel": cols[j]},
                    meta={"source":"normative_spec","systemVersion":"axiom"})
                _log_stage(args, station,name,i,j,stage,res)
                _ = pull_cell_with_context(args.api_base, station,name,i,j, include_ontologies=False)
    push_matrix("Problem Statement","A", spec["A"], "axiom")
    push_matrix("Decisions","B", spec["B"], "axiom")
    push_matrix("Truncated Decisions","J", spec["J"], "axiomatic_truncation")

def cmd_generate_C(args):
    model, api = args.model, args.api_base
    rows = args.rows or [0,1,2]; cols = args.cols or [0,1,2,3]; K = _infer_k_from_graph(api)
    for (i,j) in _iter_cells(rows, cols):
        try:
            ctx = pull_cell_with_context(api, "Requirements","C", i,j, include_ontologies=True)
            row_label, col_label = _labels(ctx,i,j)
            valley = valley_summary_from_graph(ctx.get("valley"), ctx.get("station"))
            if not args.dry_run:
                res = upsert_cell_stage(api,"Requirements","C",i,j,"context_loaded","",model,
                    f"context:C:{i}:{j}", labels={"rowLabel":row_label,"colLabel":col_label},
                    meta={"valleyStation":(ctx.get('station') or {}).get('name'),
                          "rowLabel":row_label,"colLabel":col_label})
                _log_stage(args,"Requirements","C",i,j,"context_loaded",res)
            else:
                LOG.info(f"[dry-run] C[{i},{j}] context_loaded; then {K} products → sum → interpret"); continue
            products=[]
            for k in range(K):
                a = pull_cell_with_context(api,"Problem Statement","A", i,k, include_ontologies=False)
                b = pull_cell_with_context(api,"Decisions","B", k,j, include_ontologies=False)
                a_val = (((a.get("matrix") or {}).get("cell") or {}).get("value")) or ""
                b_val = (((b.get("matrix") or {}).get("cell") or {}).get("value")) or ""
                user = prompt_multiply(valley,"Requirements",row_label,col_label,a_val,b_val)
                obj, meta = sm.semantic_multiply_checked(user, a_val, b_val, temperature=0.7)
                products.append(obj["text"])
                res = upsert_cell_stage(api,"Requirements","C",i,j,f"product:k={k}",obj["text"],meta["modelId"],
                    meta["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                    meta={**meta,"a_pos":[i,k],"b_pos":[k,j],"terms_used":obj.get("terms_used",[]),
                         "valleyStation":"Requirements","rowLabel":row_label,"colLabel":col_label})
                _log_stage(args,"Requirements","C",i,j,f"product:k={k}",res,meta)
            user_add = prompt_add(valley,"Requirements",row_label,col_label,products)
            obj_sum, meta_sum = sm.semantic_add(user_add, temperature=0.5)
            res = upsert_cell_stage(api,"Requirements","C",i,j,"sum",obj_sum["text"],meta_sum["modelId"],
                meta_sum["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta_sum,"valleyStation":"Requirements","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Requirements","C",i,j,"sum",res,meta_sum)
            user_it = prompt_interpret(valley,"Requirements",row_label,col_label,obj_sum["text"])
            obj_it, meta_it = sm.semantic_interpret(user_it, temperature=0.5)
            res = upsert_cell_stage(api,"Requirements","C",i,j,"interpretation",obj_it["text"],meta_it["modelId"],
                meta_it["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta_it,"valleyStation":"Requirements","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Requirements","C",i,j,"interpretation",res,meta_it)
            res = upsert_cell_stage(api,"Requirements","C",i,j,"final_resolved",obj_it["text"],model,
                f"final:C:{i}:{j}")
            _log_stage(args,"Requirements","C",i,j,"final_resolved",res)
            _ufo(args,"Requirements","C",i,j, obj_sum, meta_sum)
        except Exception as e:
            tb = traceback.format_exc(limit=1)
            if not args.dry_run:
                res = upsert_cell_stage(api,"Requirements","C",i,j,"error","",model,f"error:C:{i}:{j}",
                    labels={"rowLabel":row_label,"colLabel":col_label} if 'row_label' in locals() else {},
                    meta={"error":str(e),"trace":tb})
                _log_stage(args,"Requirements","C",i,j,"error",res)
            LOG.error(f"C[{i},{j}] failed: {e}")
            if args.stop_on_error: raise

def cmd_generate_F(args):
    model, api = args.model, args.api_base
    rows = args.rows or [0,1,2]; cols = args.cols or [0,1,2,3]
    for (i,j) in _iter_cells(rows, cols):
        try:
            ctx = pull_cell_with_context(api,"Objectives","F", i,j, include_ontologies=True)
            row_label, col_label = _labels(ctx,i,j)
            valley = valley_summary_from_graph(ctx.get("valley"), ctx.get("station"))
            if not args.dry_run:
                res = upsert_cell_stage(api,"Objectives","F",i,j,"context_loaded","",model,
                    f"context:F:{i}:{j}", labels={"rowLabel":row_label,"colLabel":col_label},
                    meta={"valleyStation":(ctx.get('station') or {}).get('name'),
                          "rowLabel":row_label,"colLabel":col_label})
                _log_stage(args,"Objectives","F",i,j,"context_loaded",res)
            else:
                LOG.info(f"[dry-run] F[{i},{j}] context_loaded; then J⊙C → interpret"); continue
            jv = pull_cell_with_context(api,"Truncated Decisions","J", i,j, include_ontologies=False)
            cv = pull_cell_with_context(api,"Requirements","C", i,j, include_ontologies=False)
            j_val = (((jv.get("matrix") or {}).get("cell") or {}).get("value")) or ""
            c_val = (((cv.get("matrix") or {}).get("cell") or {}).get("value")) or ""
            user = prompt_elementwise_F(valley, row_label, col_label, j_val, c_val)
            obj, meta = sm.semantic_multiply_checked(user, j_val, c_val, temperature=0.7)
            res = upsert_cell_stage(api,"Objectives","F",i,j,"element_wise",obj["text"],meta["modelId"],
                meta["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta,"terms_used":obj.get("terms_used",[]),
                      "valleyStation":"Objectives","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Objectives","F",i,j,"element_wise",res,meta)
            user_it = prompt_interpret(valley,"Objectives",row_label,col_label,obj["text"])
            obj_it, meta_it = sm.semantic_interpret(user_it, temperature=0.5)
            res = upsert_cell_stage(api,"Objectives","F",i,j,"interpretation",obj_it["text"],meta_it["modelId"],
                meta_it["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta_it,"valleyStation":"Objectives","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Objectives","F",i,j,"interpretation",res,meta_it)
            res = upsert_cell_stage(api,"Objectives","F",i,j,"final_resolved",obj_it["text"],model,
                f"final:F:{i}:{j}")
            _log_stage(args,"Objectives","F",i,j,"final_resolved",res)
            _ufo(args,"Objectives","F",i,j, obj, meta)
        except Exception as e:
            tb = traceback.format_exc(limit=1)
            if not args.dry_run:
                res = upsert_cell_stage(api,"Objectives","F",i,j,"error","",model,f"error:F:{i}:{j}",
                    labels={"rowLabel":row_label,"colLabel":col_label} if 'row_label' in locals() else {},
                    meta={"error":str(e),"trace":tb})
                _log_stage(args,"Objectives","F",i,j,"error",res)
            LOG.error(f"F[{i},{j}] failed: {e}")
            if args.stop_on_error: raise

def cmd_generate_D(args):
    model, api = args.model, args.api_base
    rows = args.rows or [0,1,2]; cols = args.cols or [0,1,2,3]
    for (i,j) in _iter_cells(rows, cols):
        try:
            ctx = pull_cell_with_context(api,"Solution Objectives","D", i,j, include_ontologies=True)
            row_label, col_label = _labels(ctx,i,j)
            valley = valley_summary_from_graph(ctx.get("valley"), ctx.get("station"))
            if not args.dry_run:
                res = upsert_cell_stage(api,"Solution Objectives","D",i,j,"context_loaded","",model,
                    f"context:D:{i}:{j}", labels={"rowLabel":row_label,"colLabel":col_label},
                    meta={"valleyStation":(ctx.get('station') or {}).get('name'),
                          "rowLabel":row_label,"colLabel":col_label})
                _log_stage(args,"Solution Objectives","D",i,j,"context_loaded",res)
            else:
                LOG.info(f"[dry-run] D[{i},{j}] context_loaded; then A+F → interpret"); continue
            a = pull_cell_with_context(api,"Problem Statement","A", i,j, include_ontologies=False)
            f = pull_cell_with_context(api,"Objectives","F", i,j, include_ontologies=False)
            a_val = (((a.get("matrix") or {}).get("cell") or {}).get("value")) or ""
            f_val = (((f.get("matrix") or {}).get("cell") or {}).get("value")) or ""
            user = prompt_add_D(valley, row_label, col_label, a_val, f_val)
            obj, meta = sm.semantic_add(user, temperature=0.5)
            res = upsert_cell_stage(api,"Solution Objectives","D",i,j,"sum",obj["text"],meta["modelId"],
                meta["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta,"terms_used":obj.get("terms_used",[]),
                      "valleyStation":"Solution Objectives","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Solution Objectives","D",i,j,"sum",res,meta)
            user_it = prompt_interpret(valley,"Solution Objectives",row_label,col_label,obj["text"])
            obj_it, meta_it = sm.semantic_interpret(user_it, temperature=0.5)
            res = upsert_cell_stage(api,"Solution Objectives","D",i,j,"interpretation",obj_it["text"],meta_it["modelId"],
                meta_it["promptHash"], labels={"rowLabel":row_label,"colLabel":col_label},
                meta={**meta_it,"valleyStation":"Solution Objectives","rowLabel":row_label,"colLabel":col_label})
            _log_stage(args,"Solution Objectives","D",i,j,"interpretation",res,meta_it)
            res = upsert_cell_stage(api,"Solution Objectives","D",i,j,"final_resolved",obj_it["text"],model,
                f"final:D:{i}:{j}")
            _log_stage(args,"Solution Objectives","D",i,j,"final_resolved",res)
            _ufo(args,"Solution Objectives","D",i,j, obj, meta)
        except Exception as e:
            tb = traceback.format_exc(limit=1)
            if not args.dry_run:
                res = upsert_cell_stage(api,"Solution Objectives","D",i,j,"error","",model,f"error:D:{i}:{j}",
                    labels={"rowLabel":row_label,"colLabel":col_label} if 'row_label' in locals() else {},
                    meta={"error":str(e),"trace":tb})
                _log_stage(args,"Solution Objectives","D",i,j,"error",res)
            LOG.error(f"D[{i},{j}] failed: {e}")
            if args.stop_on_error: raise

def cmd_verify(args):
    rows = args.rows or [0,1,2]; cols = args.cols or [0,1,2,3]; problems=[]
    for (i,j) in _iter_cells(rows, cols):
        ctx = pull_cell_with_context(args.api_base, args.station, args.matrix, i, j, include_ontologies=False)
        cell = (ctx.get("matrix") or {}).get("cell") or {}
        if cell.get("stage") != "final_resolved" or not cell.get("value"):
            problems.append({"i":i,"j":j,"stage":cell.get("stage")})
    if args.log_json: LOG.info(json.dumps({"event":"verify","station":args.station,"matrix":args.matrix,"issues":problems}, ensure_ascii=False))
    elif problems:
        LOG.info(f"Issues in {args.station}/{args.matrix}:")
        for p in problems: LOG.info(f"  [{p['i']},{p['j']}] missing_final (stage={p['stage']})")
    else: LOG.info(f"OK: {args.station}/{args.matrix} selection complete.")

# ---- argparse / main ---------------------------------------------------------
def main() -> int:
    if not os.getenv("OPENAI_API_KEY"):
        LOG.error("OPENAI_API_KEY is required"); return 1

    ap = argparse.ArgumentParser("chirality-cli (Phase-1 canonical)")
    sub = ap.add_subparsers(dest="command", required=True)

    p0 = sub.add_parser("push-axioms"); p0.add_argument("--spec", required=True); p0.add_argument("--api-base", required=True)
    p0.add_argument("--model", default=os.getenv("OPENAI_MODEL","gpt-4o")); p0.add_argument("--dry-run", action="store_true")
    p0.add_argument("--log-json", action="store_true")

    pc = sub.add_parser("generate-c"); pc.add_argument("--api-base", required=True)
    pc.add_argument("--model", default=os.getenv("OPENAI_MODEL","gpt-4o"))
    pc.add_argument("--rows", type=lambda s: _int_list(s,[0,1,2])); pc.add_argument("--cols", type=lambda s: _int_list(s,[0,1,2,3]))
    pc.add_argument("--ufo-propose", action="store_true"); pc.add_argument("--dry-run", action="store_true")
    pc.add_argument("--stop-on-error", action="store_true"); pc.add_argument("--log-json", action="store_true")

    pf = sub.add_parser("generate-f"); pf.add_argument("--api-base", required=True)
    pf.add_argument("--model", default=os.getenv("OPENAI_MODEL","gpt-4o"))
    pf.add_argument("--rows", type=lambda s: _int_list(s,[0,1,2])); pf.add_argument("--cols", type=lambda s: _int_list(s,[0,1,2,3]))
    pf.add_argument("--ufo-propose", action="store_true"); pf.add_argument("--dry-run", action="store_true")
    pf.add_argument("--stop-on-error", action="store_true"); pf.add_argument("--log-json", action="store_true")

    pd = sub.add_parser("generate-d"); pd.add_argument("--api-base", required=True)
    pd.add_argument("--model", default=os.getenv("OPENAI_MODEL","gpt-4o"))
    pd.add_argument("--rows", type=lambda s: _int_list(s,[0,1,2])); pd.add_argument("--cols", type=lambda s: _int_list(s,[0,1,2,3]))
    pd.add_argument("--ufo-propose", action="store_true"); pd.add_argument("--dry-run", action="store_true")
    pd.add_argument("--stop-on-error", action="store_true"); pd.add_argument("--log-json", action="store_true")

    pv = sub.add_parser("verify-stages"); pv.add_argument("--api-base", required=True)
    pv.add_argument("--station", required=True, choices=[
        "Problem Statement","Decisions","Truncated Decisions","Requirements","Objectives","Solution Objectives"])
    pv.add_argument("--matrix", required=True, choices=["A","B","J","C","F","D"])
    pv.add_argument("--rows", type=lambda s: _int_list(s,[0,1,2])); pv.add_argument("--cols", type=lambda s: _int_list(s,[0,1,2,3]))
    pv.add_argument("--log-json", action="store_true")

    args = ap.parse_args()
    try:
        if   args.command == "push-axioms":   cmd_push_axioms(args)
        elif args.command == "generate-c":    cmd_generate_C(args)
        elif args.command == "generate-f":    cmd_generate_F(args)
        elif args.command == "generate-d":    cmd_generate_D(args)
        elif args.command == "verify-stages": cmd_verify(args)
        else:
            LOG.error(f"Unknown command: {args.command}"); return 1
        return 0
    except KeyboardInterrupt:
        LOG.warning("Cancelled"); return 130
    except Exception as e:
        LOG.error(f"Unexpected error: {e}")
        LOG.debug("Traceback:", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())