export type StationRef = { id: string; label: string };

export type Lens = { label: string; meaning: string };

export type Canon = {
  cf_version: string;
  model: string;
  station_default: StationRef;
  matrix_default: string; // e.g., "A"
  principles: string[];
  row_family: Lens[];
  col_family: Lens[];
  // optional metadata
  createdAt?: string;
  id?: string; // Neo4j id/uuid
};