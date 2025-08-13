CREATE CONSTRAINT station_id IF NOT EXISTS FOR (s:Station) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT component_id IF NOT EXISTS FOR (c:Component) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT term_value IF NOT EXISTS FOR (t:Term) REQUIRE t.value IS UNIQUE;

UNWIND [
  {id:1,name:'Problem Statement'},{id:2,name:'Requirements'},{id:3,name:'Objectives'},
  {id:4,name:'Verification'},{id:5,name:'Validation'},{id:6,name:'Evaluation'},
  {id:7,name:'Assessment'},{id:8,name:'Implementation'},{id:9,name:'Reflection'},
  {id:10,name:'Resolution'}
] AS s
MERGE (:Station {id:s.id, name:s.name});

MATCH (a:Station),(b:Station) WHERE b.id = a.id + 1
MERGE (a)-[:NEXT]->(b);