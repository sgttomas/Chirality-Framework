Here’s a rewritten README.md for chirality-admin that blends human-centered framing, technical clarity, and explicit polyrepo integration points — while directly referencing the four critical backend files so contributors can see how the admin UI talks to the backend.

⸻

Chirality Admin

Polyrepo Node: chirality-admin
Role: Backend UI & orchestration interface for the Chirality Semantic Framework.

⸻

🌱 Purpose & Context

The Chirality Framework is a meta-operating system for meaning — an ontology-preserving scaffold for high-level knowledge work.
This Admin UI is the operational control center: it’s where you can push axioms, generate semantic matrices cell-by-cell, and inspect, iterate, and trace reasoning in real time.

The repo is one of several in the Chirality polyrepo:
	•	chirality-semantic-framework → Python backend + Neo4j graph store
	•	chirality-chat → Phase 2 instantiation for domain/problem context
	•	chirality-admin (this repo) → Orchestration & inspection interface

⸻

🧩 How This Fits the Polyrepo

This admin interface directly drives the Phase 1 canonical build of the Chirality Framework using the backend’s CLI and GraphQL API.

Key backend integration points:
	•	chirality_prompts.py — Prompt construction logic for each semantic stage
	•	chirality_graphql.py — GraphQL interface for pushing/pulling cells, stations, valleys
	•	semmul_cf14.py — Semantic multiplier utilities (cell-by-cell ops)
	•	chirality_cli.py — CLI pipeline that wraps all Phase 1 generation steps

The Admin UI calls the backend’s CLI commands (push-axioms, generate-c, generate-f, generate-d, verify-stages) via API routes like /api/orchestrate/run.

⸻

🖥️ What You Can Do Here

From the Admin UI, you can:
	•	Push Axioms — Load matrices A, B, and J from the NORMATIVE spec file
	•	Generate Semantic Matrices — Cell-by-cell production of C, F, and D matrices
	•	Inspect Cells — See row/column labels, semantic stage history, and context from the semantic valley
	•	Trace Reasoning — View intermediate stages for each cell, not just final output
	•	Monitor Pipelines — Real-time progress via the Pipeline Console

⸻

⚙️ Setup

1. Install Dependencies

npm install

2. Environment Variables

In admin-ui/.env.local:

NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql  # Backend GraphQL endpoint
OPENAI_API_KEY=sk-...                                   # Your OpenAI API key
OPENAI_MODEL=gpt-4.1-nano                               # Or any supported model
# ORCHESTRATOR_TOKEN=optional-secret

Make sure the backend (chirality-semantic-framework) is running and listening on the GraphQL endpoint above.

⸻

🚀 Running the Admin UI

npm run dev

Visit: http://localhost:3001

⸻

📡 Command Reference (CLI → UI)

CLI Command	Purpose	Triggered From
push-axioms	Load A, B, J matrices from NORMATIVE spec	Pipeline Console
generate-c	Build Requirements matrix C cell-by-cell	Pipeline Console
generate-f	Build Objectives matrix F cell-by-cell	Pipeline Console
generate-d	Build Solution Objectives matrix D cell-by-cell	Pipeline Console
verify-stages	Check intermediate stage persistence & integrity	Status/Verification UI


⸻

🔍 Inspection Tools
	•	Matrix Explorer — Grid view of any matrix with clickable cells
	•	Cell Inspector — Full semantic lineage for a given cell
	•	Pipeline Console — Start, stop, and monitor pipeline jobs
	•	Status API — /api/orchestrate/status returns active job info

⸻

🗺️ Development Flow
	1.	Start backend (chirality-semantic-framework) with Neo4j running.
	2.	Start admin UI from this repo.
	3.	Use Pipeline Console to:
	•	Push axioms from the normative spec (NORMATIVE_Chirality_Framework_14.2.1.1.txt)
	•	Generate semantic matrices
	•	Verify results via inspection tools
	4.	Iterate and refine prompts/backend logic as needed.

⸻

📖 Learn More
	•	Chirality Framework overview: See main README.md in chirality-semantic-framework
	•	Polyrepo architecture: See docs/polyrepo-architecture.md (in progress)
	•	Prompt templates: Inspect chirality_prompts.py in backend repo
	•	GraphQL schema: Inspect chirality_graphql.py in backend repo

⸻
