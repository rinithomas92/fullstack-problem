const test = require("node:test");
const assert = require("node:assert");

process.env.ISSUER_TOKEN = "test-issuer-token";
const { server } = require("../src/server");

let base;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = "http://127.0.0.1:" + server.address().port;
});

test.after(() => {
  server.close();
});

async function call(action, payload, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  const response = await fetch(base + "/api", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(Object.assign({ action: action }, payload || {})),
  });
  return { status: response.status, body: await response.json() };
}

test("add without the issuer token is 401, even when the body claims a caller", async () => {
  const noToken = await call("add", { holder: "carol", caller: "ops" });
  assert.strictEqual(noToken.status, 401);
  const wrongToken = await call("add", { holder: "carol" }, "guess");
  assert.strictEqual(wrongToken.status, 401);
});

test("issuer can add, issue and redeem end to end", async () => {
  const added = await call("add", { holder: "carol", allocation: "40", label: "Carol" }, "test-issuer-token");
  assert.strictEqual(added.status, 200);

  assert.strictEqual((await call("issue", { amount: "100" })).body.pool, 100);
  assert.strictEqual((await call("pool")).body.pool, 100);

  const redeemed = await call("redeem", { holder: "carol", amount: 15 });
  assert.deepStrictEqual(redeemed.body, { ok: true, pool: 85, holder: "carol", remaining: 25 });
});

test("missing amounts are rejected, not treated as 0", async () => {
  const issue = await call("issue", {});
  assert.strictEqual(issue.status, 400);
  assert.strictEqual(issue.body.error, "amount is required");
  const redeem = await call("redeem", { holder: "carol", amount: "" });
  assert.strictEqual(redeem.status, 400);
});

test("redeem for an unlisted holder is a 404 result, not a crash", async () => {
  const before = (await call("pool")).body.pool;
  const result = await call("redeem", { holder: "ghost", amount: 5 });
  assert.strictEqual(result.status, 404);
  assert.strictEqual((await call("pool")).body.pool, before);
});

test("remaining distinguishes not listed from 0", async () => {
  assert.strictEqual((await call("remaining", { holder: "ghost" })).status, 404);
  await call("redeem", { holder: "carol", amount: 25 });
  const zero = await call("remaining", { holder: "carol" });
  assert.strictEqual(zero.status, 200);
  assert.strictEqual(zero.body.remaining, 0);
});

test("unknown actions are rejected", async () => {
  assert.strictEqual((await call("explode")).status, 400);
});
