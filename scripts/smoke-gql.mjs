import assert from 'node:assert/strict';

// Test HTTP health endpoint
const healthRes = await fetch('http://localhost:8080/healthz');
assert.equal(healthRes.status, 200);
const healthData = await healthRes.json();
assert.equal(healthData.ok, true);
console.log('Health endpoint OK');

// Test GraphQL with introspection query
const gqlRes = await fetch('http://localhost:8080/graphql', {
  method:'POST',
  headers:{'content-type':'application/json'},
  body: JSON.stringify({ query:'{ __schema { queryType { name } } }' })
});

assert.equal(gqlRes.status, 200);
const gqlData = await gqlRes.json();
assert.equal(gqlData.data?.__schema?.queryType?.name, 'Query');
console.log('GQL OK');