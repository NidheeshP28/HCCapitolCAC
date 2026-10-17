// Main-thread side of solver.worker.js: one worker, promise per request, results cached by request.
let worker, seq = 0;
const pending = new Map(), loaded = new Set(), cache = new Map();

function call(op, args) {
  if (!worker) {
    worker = new Worker(new URL("./solver.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data: { id, result, error } }) => {
      const p = pending.get(id);
      pending.delete(id);
      error ? p?.reject(new Error(error)) : p?.resolve(result);
    };
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, ...args });
  });
}

export function solve(fips, county, op, args) {
  if (!loaded.has(fips)) {
    loaded.add(fips);
    call("load", { fips, zips: county.zips.map((z) => [z.lat, z.lon, z.w]), sites: county.sites.map((s) => [s.lat, s.lon, s.q ?? 0]) });
  }
  const key = JSON.stringify([fips, op, args]);
  if (!cache.has(key)) {
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(key, call(op, { fips, ...args }).catch((e) => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}
