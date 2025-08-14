// bench/bench.ts
import { setTimeout as sleep } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';

type Station = 'REQUIREMENTS' | 'OBJECTIVES' | 'VERIFICATION' | 'VALIDATION' | 'EVALUATION';

const GRAPH_URL = process.env.NEXT_PUBLIC_GRAPH_API ?? 'http://localhost:8080/graphql';
const LEGACY_URL = process.env.NEXT_PUBLIC_LEGACY_API ?? 'http://localhost:3000';

const RUNS = Number(process.env.BENCH_RUNS ?? 30);        // total requests per case
const CONCURRENCY = Number(process.env.BENCH_CONC ?? 5);  // parallelism
const STATION: Station = (process.env.BENCH_STATION as Station) ?? 'VERIFICATION';
const COMPONENT_ID = process.env.BENCH_COMPONENT_ID;      // optional, for by-id test

// --- helpers ---
function median(ns: number[]) { const arr = [...ns].sort((a,b)=>a-b); const m = Math.floor(arr.length/2); return arr.length%2?arr[m]:(arr[m-1]+arr[m])/2; }
function p95(ns: number[]) { const arr = [...ns].sort((a,b)=>a-b); const idx = Math.ceil(arr.length*0.95)-1; return arr[Math.max(0, Math.min(idx, arr.length-1))]; }
function kb(n: number) { return (n/1024).toFixed(1)+' KB'; }
function sha256(s: string) { return createHash('sha256').update(s).digest('hex').slice(0,8); }

async function postJSON(url: string, body: any) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text(); // capture size before JSON parse
  const json = JSON.parse(text);
  return { json, size: text.length };
}

// --- requests ---
async function graphLatestByStation(station: Station) {
  const query = `
    query LatestByStation($station: Station!) {
      latestComponentByStation(station: $station) {
        id name station shape rowLabels colLabels
        cells(orderBy:[{row:ASC},{col:ASC}]) { row col resolved }
      }
    }`;
  return postJSON(GRAPH_URL, { query, variables: { station } });
}

async function graphComponentById(id: string) {
  const query = `
    query GetComponentById($id: ID!) {
      component(id:$id) {
        id name station shape rowLabels colLabels
        cells(orderBy:[{row:ASC},{col:ASC}]) { row col resolved }
      }
    }`;
  return postJSON(GRAPH_URL, { query, variables: { id } });
}

async function graphAllByStation(station: Station) {
  const query = `
    query GetAllByStation($station: Station!) {
      components(filter:{station:$station}, pagination:{take:50}, sort:{field:CREATED_AT,direction:DESC}) {
        id name station shape
      }
    }`;
  return postJSON(GRAPH_URL, { query, variables: { station } });
}

async function restLatestByStation(station: Station) {
  return postJSON(`${LEGACY_URL}/api/neo4j/query`, { query_type: 'get_latest_matrix_by_station', station });
}
async function restComponentById(id: string) {
  return postJSON(`${LEGACY_URL}/api/neo4j/query`, { query_type: 'get_matrix_by_id', component_id: id });
}
async function restAllByStation(station: Station) {
  return postJSON(`${LEGACY_URL}/api/neo4j/query`, { query_type: 'get_all_by_station', station });
}

// --- runner ---
async function runCase(label: string, fn: () => Promise<{json:any,size:number}>) {
  const lat: number[] = [];
  const sizes: number[] = [];
  const digests: string[] = [];

  // warmup
  for (let i=0;i<Math.min(3, RUNS);i++) { try { await fn(); } catch {} }

  const tasks = Array.from({length: RUNS}, (_,i)=>i);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const cur = idx++;
      const t0 = performance.now();
      try {
        const { json, size } = await fn();
        const t1 = performance.now();
        lat.push(t1 - t0);
        sizes.push(size);
        digests.push(sha256(JSON.stringify(json)));
      } catch (e:any) {
        const t1 = performance.now();
        lat.push(t1 - t0);
        sizes.push(0);
        digests.push('ERROR');
      }
      // tiny jitter to avoid lockstep
      await sleep(5);
    }
  }
  await Promise.all(Array.from({length: CONCURRENCY}, worker));

  const ok = digests.filter(d => d !== 'ERROR').length;
  console.log(`\n${label}`);
  console.log(`  requests: ${RUNS} (ok ${ok}, err ${RUNS-ok})  conc=${CONCURRENCY}`);
  console.log(`  p50: ${lat.length?lat.sort((a,b)=>a-b)[Math.floor(lat.length/2)].toFixed(1):'n/a'} ms  p95: ${p95(lat).toFixed(1)} ms`);
  console.log(`  avg size: ${kb(sizes.reduce((a,b)=>a+b,0)/Math.max(1,sizes.length))}`);
  const digestSet = new Set(digests);
  if (digestSet.has('ERROR')) digestSet.delete('ERROR');
  console.log(`  distinct payload digests (sha256/8): ${[...digestSet].slice(0,5).join(', ')}${digestSet.size>5?' …':''}`);
}

async function main() {
  console.log('--- Chirality Bench ---');
  console.log(`GRAPH_URL=${GRAPH_URL}`);
  console.log(`LEGACY_URL=${LEGACY_URL}`);
  console.log(`STATION=${STATION}  RUNS=${RUNS}  CONCURRENCY=${CONCURRENCY}\n`);

  // 1) latest by station
  await runCase(`GraphQL latest by station (${STATION})`, () => graphLatestByStation(STATION));
  await runCase(`REST    latest by station (${STATION})`, () => restLatestByStation(STATION));

  // 2) by id (only if id provided)
  if (COMPONENT_ID) {
    await runCase(`GraphQL component by id (${COMPONENT_ID})`, () => graphComponentById(COMPONENT_ID));
    await runCase(`REST    component by id (${COMPONENT_ID})`, () => restComponentById(COMPONENT_ID));
  } else {
    console.log('\n[skip] component by id — set BENCH_COMPONENT_ID to enable');
  }

  // 3) list by station
  await runCase(`GraphQL list by station (${STATION})`, () => graphAllByStation(STATION));
  await runCase(`REST    list by station (${STATION})`, () => restAllByStation(STATION));
}

main().catch(e => { console.error(e); process.exit(1); });