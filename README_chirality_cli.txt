# Chirality CLI (tiny)

Minimal command-line tool to turn CSV lists/grids into Chirality JSON components.

## Install / Run
This is a plain Python script; no external deps.

```bash
python3 chirality_cli.py -h
```

## Modes

### 1) Matrix from a single grid CSV
Assumes a spreadsheet-style CSV:
- top-left cell is empty,
- first row has column labels,
- first column has row labels,
- the rest are data cells (resolved strings).

```
,Determinacy,Sufficiency,Completeness,Consistency
Normative,Essential Values,Justifiable Values,Comprehensive Values,Probabilistic Values
Operative,Essential Principles,Valid Principles,Comprehensive Principles,Probabilistic Principles
Evaluative,Essential Objectives,Adequate Objectives,Comprehensive Objectives,Probabilistic Objectives
```

Command:
```bash
python3 chirality_cli.py matrix-grid \
  --grid C_grid.csv \
  --title "Matrix C" \
  --station "Requirements" \
  --rows_name "Normative/Operative/Evaluative" \
  --cols_name "Determinacy/Sufficiency/Completeness/Consistency" \
  --out C.json
```

### 2) Matrix from rows.csv + cols.csv + data.csv
- `rows.csv`: a single column file of row labels
- `cols.csv`: a single row file of column labels
- `data.csv`: rectangular data (len(rows) × len(cols))

Command:
```bash
python3 chirality_cli.py matrix-lists \
  --rows rows.csv \
  --cols cols.csv \
  --data data.csv \
  --title "Matrix C" \
  --station "Requirements" \
  --rows_name "Normative/Operative/Evaluative" \
  --cols_name "Determinacy/Sufficiency/Completeness/Consistency" \
  --out C.json
```

### 3) Array from a single list
`list.csv` is one item per row.
```bash
python3 chirality_cli.py array \
  --list R.csv \
  --title "Array R" \
  --axis_name "deliverable_topics" \
  --station "Assessment" \
  --out R.json
```

## Output
A JSON document with one component inside `components[]`, following the schema used by `chirality_components.py`.
