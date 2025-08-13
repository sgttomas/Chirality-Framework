
from chirality_components import (
    Axis, Cell, Component, ChiralityDocument,
    make_array, make_matrix, make_tensor
)

# Build a tiny demo with a 1x1 'C' matrix cell
doc = ChiralityDocument(meta={"framework": "Chirality", "note": "Schema demo only"})
rows = ["Normative"]
cols = ["Determinacy"]
cell = Cell(
    resolved="Foundational principles; value‑driven actions; foundational benchmarks; critical benchmarks",
    raw_terms=[
        "Values * Essential",
        "Actions * Relevant",
        "Benchmarks * Fundamental",
        "Benchmarks * Vital"
    ],
    intermediate=[
        "Foundational principles",
        "Value-driven actions",
        "Foundational benchmarks",
        "Critical benchmarks"
    ],
    operation="*",
    notes="C(1,1) from A×B → C"
)

comp_C = make_matrix(
    id="C_demo",
    name="C",
    station="Requirements",
    row_labels=rows,
    col_labels=cols,
    cells_2d=[[cell]],
    ontology={
        "rows_meaning": "Normative / Operative / Evaluative (here: Normative)",
        "cols_meaning": "Determinacy / Sufficiency / Completeness / Consistency (here: Determinacy)"
    }
)

doc.components.append(comp_C)

import json, pathlib
path = pathlib.Path("/mnt/data/chirality_components_example.json")
path.write_text(doc.to_json(pretty=True))
print("Wrote", path)
