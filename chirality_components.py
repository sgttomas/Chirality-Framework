
from __future__ import annotations
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

@dataclass
class Axis:
    name: str
    labels: List[str]

@dataclass
class Cell:
    resolved: str
    raw_terms: List[str] = field(default_factory=list)
    intermediate: List[str] = field(default_factory=list)
    operation: str = "*"
    notes: Optional[str] = None

@dataclass
class Component:
    id: str
    kind: str              # "array" | "matrix" | "tensor"
    station: Optional[str]
    name: Optional[str] = None
    axes: List[Axis] = field(default_factory=list)
    shape: List[int] = field(default_factory=list)
    ontology: Dict[str, Any] = field(default_factory=dict)
    data: Any = field(default_factory=list)

@dataclass
class ChiralityDocument:
    version: str = "1.0"
    topic: str = "generating reliable knowledge"
    created_at: str = datetime.utcnow().isoformat() + "Z"
    components: List[Component] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_json(self, pretty: bool = True) -> str:
        if pretty:
            return json.dumps(asdict(self), indent=2, ensure_ascii=False)
        return json.dumps(asdict(self), ensure_ascii=False)

def make_array(id: str, name: str, station: Optional[str], labels: List[str], cells: List[Cell], ontology: Optional[Dict[str, Any]]=None) -> Component:
    return Component(
        id=id,
        kind="array",
        station=station,
        name=name,
        axes=[Axis(name="items", labels=labels)],
        shape=[len(labels)],
        ontology=ontology or {},
        data=[[asdict(c) for c in cells]]
    )

def make_matrix(id: str, name: str, station: Optional[str],
                row_labels: List[str], col_labels: List[str],
                cells_2d: List[List[Cell]], ontology: Optional[Dict[str, Any]]=None) -> Component:
    assert len(cells_2d) == len(row_labels), "rows mismatch"
    for r in cells_2d:
        assert len(r) == len(col_labels), "cols mismatch"
    return Component(
        id=id,
        kind="matrix",
        station=station,
        name=name,
        axes=[Axis(name="rows", labels=row_labels), Axis(name="cols", labels=col_labels)],
        shape=[len(row_labels), len(col_labels)],
        ontology=ontology or {},
        data=[[asdict(c) for c in row] for row in cells_2d]
    )

def make_tensor(id: str, name: str, station: Optional[str],
                axes: List[Axis], shape: List[int],
                flat_cells: List[Cell], ontology: Optional[Dict[str, Any]]=None) -> Component:
    def nest(cells, dims):
        if len(dims) == 1:
            row = cells[:dims[0]]
            del cells[:dims[0]]
            return [asdict(c) for c in row]
        size = dims[0]
        out = []
        for _ in range(size):
            out.append(nest(cells, dims[1:]))
        return out

    total = 1
    for d in shape:
        total *= d
    assert len(flat_cells) == total, f"expected {total} cells, got {len(flat_cells)}"

    cells_copy = flat_cells[:]
    data = nest(cells_copy, shape)

    return Component(
        id=id,
        kind="tensor",
        station=station,
        name=name,
        axes=axes,
        shape=shape,
        ontology=ontology or {},
        data=data
    )
