import assert from 'node:assert/strict';

const r = await fetch('http://localhost:3000/api/neo4j/query', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({ query_type:'ping' })
});

assert.equal(r.status, 200);
const j = await r.json();
assert.equal(j.ok, true);
console.log('REST OK');