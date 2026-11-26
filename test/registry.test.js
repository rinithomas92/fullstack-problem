const test = require("node:test");
const assert = require("node:assert");
const { Registry } = require("../src/registry");

function deskWithHolder() {
  const reg = new Registry("ops");
  reg.addHolder("ops", "alice", 50, "Alice", "eligible");
  reg.issue(100);
  return reg;
}

// Problem 1
test("only the issuer can add a holder", () => {
  const reg = new Registry("ops");
  assert.strictEqual(reg.addHolder("mallory", "alice").code, "unauthorized");
  assert.strictEqual(reg.addHolder(undefined, "alice").code, "unauthorized");
  assert.strictEqual(reg.addHolder("", "alice").code, "unauthorized");
  assert.strictEqual(reg.getHolders().length, 0);
  assert.deepStrictEqual(reg.addHolder("ops", "alice"), { ok: true, holder: "alice" });
});

test("empty, duplicate and invalid holders are rejected", () => {
  const reg = new Registry("ops");
  assert.strictEqual(reg.addHolder("ops", "").code, "invalid");
  assert.strictEqual(reg.addHolder("ops", "   ").code, "invalid");
  assert.strictEqual(reg.addHolder("ops", undefined).code, "invalid");
  assert.strictEqual(reg.addHolder("ops", "bob", 0).code, "invalid");
  assert.strictEqual(reg.addHolder("ops", "bob", 10, "", "vip").code, "invalid");
  reg.addHolder("ops", "bob");
  assert.strictEqual(reg.addHolder("ops", "BOB").code, "conflict");
});

// Problem 2
test("issue requires an amount greater than 0", () => {
  const reg = new Registry("ops");
  assert.strictEqual(reg.issue(0).ok, false);
  assert.strictEqual(reg.issue(-5).ok, false);
  assert.strictEqual(reg.issue(NaN).ok, false);
  assert.deepStrictEqual(reg.issue(25), { ok: true, pool: 25 });
});

test("successful redeem cuts both the pool and remaining", () => {
  const reg = deskWithHolder();
  const result = reg.redeem("alice", 20);
  assert.deepStrictEqual(result, { ok: true, pool: 80, holder: "alice", remaining: 30 });
  assert.strictEqual(reg.getPool().pool, 80);
  assert.strictEqual(reg.remaining("alice").remaining, 30);
});

test("failed redeems are explicit and change nothing", () => {
  const reg = deskWithHolder();
  assert.strictEqual(reg.redeem("nobody", 10).code, "not_found");
  assert.strictEqual(reg.redeem("alice", 0).code, "invalid");
  assert.strictEqual(reg.redeem("alice", 51).code, "invalid");
  assert.strictEqual(reg.getPool().pool, 100);
  assert.strictEqual(reg.remaining("alice").remaining, 50);
});

test("redeem cannot take the pool below 0", () => {
  const reg = new Registry("ops");
  reg.addHolder("ops", "alice", 50);
  reg.issue(10);
  assert.strictEqual(reg.redeem("alice", 20).ok, false);
  assert.strictEqual(reg.getPool().pool, 10);
});

// Problem 3
test("never listed is different from 0 remaining", () => {
  const reg = deskWithHolder();
  assert.strictEqual(reg.remaining("nobody").code, "not_found");
  reg.redeem("alice", 50);
  assert.deepStrictEqual(reg.remaining("alice"), { ok: true, holder: "alice", remaining: 0 });
});

test("registries do not share holders", () => {
  const a = new Registry("ops");
  const b = new Registry("ops");
  a.addHolder("ops", "alice");
  assert.strictEqual(a.getHolders().length, 1);
  assert.strictEqual(b.getHolders().length, 0);
});

test("getHolders returns copies", () => {
  const reg = deskWithHolder();
  reg.getHolders()[0].remaining = 9999;
  assert.strictEqual(reg.remaining("alice").remaining, 50);
});
