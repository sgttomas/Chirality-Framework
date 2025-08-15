Here’s a README_chirality_cli.md that’s purely technical, focused on backend CLI usage, and tightly coupled with the chirality-admin UI workflow.

⸻

README — Chirality CLI (Phase 1 Canonical Build)

This document describes the Phase 1 CLI for the Chirality Semantic Framework.
It is the backend’s primary automation entrypoint, used both by human operators and by the chirality-admin UI’s orchestrator API.

⸻

📍 Purpose

The CLI exists to generate the canonical Chirality Framework components — cell-by-cell, with all intermediate semantic stages persisted to Neo4j — from the normative specification (NORMATIVE_Chirality_Framework_14.2.1.1.txt).

It does not instantiate domain/problem-specific content (that’s Phase 2, handled by chirality-chat).

⸻

⚙️ Commands

Command	Description	Matrix/Stage Impacted
push-axioms	Initialize matrices A, B, J from the normative spec	A, B, J
generate-c	Generate Requirements matrix C cell-by-cell (using semantic multiplication/addition rules)	C
generate-f	Generate Objectives matrix F cell-by-cell (from J and C)	F
generate-d	Generate Solution Objectives matrix D (from A and F)	D
verify-stages	Verify that all intermediate stages exist and match expected structure in Neo4j	All


⸻

📦 Installation

This CLI lives in the chirality-semantic-framework repo.

pip install -e .


⸻

🔑 Required Environment

Create a .env in the backend root:

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-nano
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=yourpassword


⸻

🖥️ Usage

Syntax

chirality-cli {push-axioms|generate-c|generate-f|generate-d|verify-stages} [options]


⸻

1) Push Axioms

Load matrices A, B, and J into Neo4j from the normative spec.

chirality-cli push-axioms \
  --api_base http://localhost:8080 \
  --spec NORMATIVE_Chirality_Framework_14.2.1.1.txt


⸻

2) Generate C

Build Requirements matrix C cell-by-cell.
Each cell: pull (i,j) context → generate → push stage → pull to verify.

chirality-cli generate-c \
  --api_base http://localhost:8080 \
  --matrix C \
  --rows all \
  --cols all


⸻

3) Generate F

Generate Objectives matrix F from J and C.

chirality-cli generate-f \
  --api_base http://localhost:8080 \
  --matrix F


⸻

4) Generate D

Generate Solution Objectives matrix D from A and F.

chirality-cli generate-d \
  --api_base http://localhost:8080 \
  --matrix D


⸻

5) Verify Stages

Ensure each cell in all matrices has its complete semantic stage history in Neo4j.

chirality-cli verify-stages \
  --api_base http://localhost:8080


⸻

🔄 Cell-Level Push/Pull Pattern

All generation commands follow the same cell-level loop:
	1.	Pull cell context: (station, valley, row_label, col_label)
	2.	Generate semantic stage via LLM (system + context prompts)
	3.	Push to Neo4j via GraphQL mutation
	4.	Pull immediately to verify
	5.	Iterate to next (i,j)

No whole-matrix shuttling — keeps functions predictable and composable.

⸻

📡 GraphQL Integration

CLI calls the backend’s GraphQL API (implemented in chirality_graphql.py) for:
	•	Pull cell context:

query {
  cell(station: "C", i: 0, j: 1) {
    station
    valley { id name layout }
    rowLabel
    colLabel
    stages { name content timestamp }
  }
}

	•	Push new stage:

mutation {
  pushCellStage(
    station: "C",
    i: 0,
    j: 1,
    stageName: "product",
    content: "..."
  ) { success }
}


⸻

🛠️ Admin UI Coupling

The chirality-admin orchestrator calls the CLI via /api/orchestrate/run, passing:

{
  "cmd": "generate-c",
  "args": {
    "api_base": "http://localhost:8080",
    "matrix": "C",
    "rows": "all",
    "cols": "all"
  }
}

Pipeline Console maps UI actions → CLI commands exactly, so operators don’t have to memorize syntax.

⸻

📜 Development Notes
	•	Keep prompts in chirality_prompts.py so UI + CLI are in sync.
	•	All cell context and stage persistence go through chirality_graphql.py.
	•	Use semmul_cf14.py for semantic operations (product, sum, interpretation).
	•	The CLI is orchestrated in chirality_cli.py; keep it minimal and composable.

⸻
