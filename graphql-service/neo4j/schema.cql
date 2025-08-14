// ---------- UNIQ constraints (ids) ----------
CREATE CONSTRAINT component_id IF NOT EXISTS
FOR (c:Component) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT cell_id IF NOT EXISTS
FOR (n:Cell) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT document_id IF NOT EXISTS
FOR (d:Document) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT chat_session_id IF NOT EXISTS
FOR (s:ChatSession) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT chat_message_id IF NOT EXISTS
FOR (m:ChatMessage) REQUIRE m.id IS UNIQUE;

// ---------- Helpful indexes ----------
CREATE INDEX component_station IF NOT EXISTS
FOR (c:Component) ON (c.station);

CREATE INDEX component_createdAt IF NOT EXISTS
FOR (c:Component) ON (c.createdAt);

CREATE INDEX cell_row IF NOT EXISTS
FOR (n:Cell) ON (n.row);

CREATE INDEX cell_col IF NOT EXISTS
FOR (n:Cell) ON (n.col);

// ---------- (Optional) Composite—if you store componentId on Cell ----------
/*
CREATE CONSTRAINT cell_component_row_col IF NOT EXISTS
FOR (n:Cell) REQUIRE (n.componentId, n.row, n.col) IS UNIQUE;
*/