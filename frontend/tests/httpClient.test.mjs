import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createHttpClient } from "../src/httpClient.ts";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test("concurrent reads deduplicate and cache expires after 15 seconds", async () => {
  const waiting = deferred();
  let calls = 0;
  let time = 1000;
  const http = createHttpClient("https://example.test", async () => {
    calls += 1;
    if (calls === 1) await waiting.promise;
    return json({ count: calls });
  }, () => time);
  const first = http.request("/analytics/overview", {}, "session", 15_000);
  const second = http.request("/analytics/overview", {}, "session", 15_000);
  assert.equal(calls, 1);
  waiting.resolve();
  assert.deepEqual(await first, await second);
  time += 14_999;
  assert.deepEqual(await http.request("/analytics/overview", {}, "session", 15_000), { count: 1 });
  time += 1;
  assert.deepEqual(await http.request("/analytics/overview", {}, "session", 15_000), { count: 2 });
});

test("cache and pending requests are isolated by token, scope and date range", async () => {
  const calls = [];
  const http = createHttpClient("https://example.test", async (url, options) => {
    const result = { url, token: options.headers.get("Authorization") };
    calls.push(result);
    return json(result);
  });
  const scopes = [
    ["a", "/analytics/funnel?consultant_id=2&start_date=2026-01-01"],
    ["b", "/analytics/funnel?consultant_id=2&start_date=2026-01-01"],
    ["a", "/analytics/funnel?consultant_id=3&start_date=2026-01-01"],
    ["a", "/analytics/funnel?consultant_id=2&start_date=2026-02-01"],
  ];
  const results = await Promise.all(scopes.map(([token, path]) => http.request(path, {}, token, 15_000)));
  assert.equal(calls.length, 4);
  for (const [index, [token, path]] of scopes.entries()) {
    assert.deepEqual(await http.request(path, {}, token, 15_000), results[index]);
  }
  assert.equal(calls.length, 4);
});

test("successful writes invalidate reads and late old reads cannot refill the cache", async () => {
  const oldResponse = deferred();
  const freshResponse = deferred();
  let reads = 0;
  let changes = 0;
  const http = createHttpClient("https://example.test", async (_url, options) => {
    if (options.method === "PUT") return new Response(null, { status: 204 });
    reads += 1;
    return reads === 1 ? oldResponse.promise : freshResponse.promise;
  });
  const unsubscribe = http.subscribe(() => { changes += 1; });
  const old = http.request("/analytics/overview", {}, "a", 15_000);
  assert.equal(await http.request("/clients/1", { method: "PUT", body: "{}" }, "a"), undefined);
  assert.equal(changes, 1);
  const fresh = http.request("/analytics/overview", {}, "a", 15_000);
  oldResponse.resolve(json({ count: 1 }));
  await old;
  const alsoFresh = http.request("/analytics/overview", {}, "a", 15_000);
  assert.equal(reads, 2); // the old request's cleanup must not remove the new in-flight entry
  freshResponse.resolve(json({ count: 2 }));
  assert.deepEqual(await fresh, { count: 2 });
  assert.deepEqual(await alsoFresh, { count: 2 });
  assert.deepEqual(await http.request("/analytics/overview", {}, "a", 15_000), { count: 2 });
  unsubscribe();
  await http.request("/clients/1", { method: "PUT" }, "a");
  assert.equal(changes, 1);
});

test("logout clears cached and pending data without starting more requests", async () => {
  let calls = 0;
  let changes = 0;
  const waiting = deferred();
  const http = createHttpClient("https://example.test", async () => {
    calls += 1;
    return calls === 2 ? waiting.promise : json({ count: calls });
  });
  http.subscribe(() => { changes += 1; });
  await http.request("/analytics/overview", {}, "a", 15_000);
  const pending = http.request("/analytics/revenue", {}, "a", 15_000);
  http.clearCache();
  waiting.resolve(json({ count: 2 }));
  await pending;
  assert.equal(changes, 0);
  await http.request("/analytics/overview", {}, "a", 15_000);
  await http.request("/analytics/revenue", {}, "a", 15_000);
  assert.equal(calls, 4);
});

test("failed requests are retried, failed writes do not invalidate successful cached reads", async () => {
  let calls = 0;
  let changes = 0;
  const http = createHttpClient("https://example.test", async (_url, options) => {
    calls += 1;
    return calls === 1 || options.method === "POST" ? json({ detail: "Unavailable" }, 503) : json({ ok: true });
  });
  http.subscribe(() => { changes += 1; });
  await assert.rejects(http.request("/analytics/overview", {}, "a", 15_000), (error) => error instanceof ApiError && error.status === 503);
  await http.request("/analytics/overview", {}, "a", 15_000);
  await assert.rejects(http.request("/clients", { method: "POST", body: "{}" }, "a"));
  await http.request("/analytics/overview", {}, "a", 15_000);
  assert.equal(calls, 3);
  assert.equal(changes, 0);
});

test("non-cacheable reads such as /auth/me still verify each completed request", async () => {
  let calls = 0;
  const http = createHttpClient("https://example.test", async () => json({ count: ++calls }));
  await http.request("/auth/me", {}, "a");
  await http.request("/auth/me", {}, "a");
  assert.equal(calls, 2);
});

test("aborting one search never cancels another search with the same URL", async () => {
  const calls = [];
  const http = createHttpClient("https://example.test", (_url, options) => new Promise((resolve, reject) => {
    calls.push({ resolve, signal: options.signal });
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  const first = new AbortController();
  const second = new AbortController();
  const a = http.request("/clients?keyword=test", { signal: first.signal }, "a");
  const b = http.request("/clients?keyword=test", { signal: second.signal }, "a");
  first.abort();
  await assert.rejects(a, { name: "AbortError" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].signal.aborted, false);
  calls[1].resolve(json({ data: [] }));
  assert.deepEqual(await b, { data: [] });
});

test("GET omits Content-Type while JSON writes and authentication retain required headers", async () => {
  const calls = [];
  const http = createHttpClient("https://example.test", async (_url, options) => {
    calls.push(options);
    return json({ ok: true });
  });
  await http.request("/analytics/overview", {}, "a");
  await http.request("/clients", { method: "POST", body: "{}" }, "a");
  assert.equal(calls[0].headers.get("Content-Type"), null);
  assert.equal(calls[0].headers.get("Authorization"), "Bearer a");
  assert.equal(calls[1].headers.get("Content-Type"), "application/json");
});
