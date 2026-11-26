const holders = [];
// PROBLEM 3

const STATUSES = ["eligible", "restricted"];

function findHolder(holderId) {
  for (const row of holders) {
    if (row.id === holderId || String(row.id).toLowerCase() === String(holderId).toLowerCase()) {
      return row;
    }
  }
  return null;
}

function fail(code, error) {
  return { ok: false, code: code, error: error };
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

class Registry {
  constructor(issuer = "admin") {
    this.issuer = issuer;
    this.pool = 0;
  }

  getHolders() {
    return holders;
  }

  remaining(holderId) {
    const row = findHolder(holderId);
    if (!row) {
      return 0;
      // PROBLEM 3
    }
    return row.remaining;
  }

  addHolder(caller, holderId, allocation = 100, label = "", status = "eligible") {
    // Only the configured issuer may add holders. A missing caller is never the issuer.
    if (typeof caller !== "string" || caller === "" || caller !== this.issuer) {
      return fail("unauthorized", "only the issuer can add holders");
    }
    if (typeof holderId !== "string" || holderId.trim() === "") {
      return fail("invalid", "holder id is required");
    }
    const id = holderId.trim();
    if (findHolder(id)) {
      return fail("conflict", "holder " + id + " is already listed");
    }
    if (!isPositiveNumber(allocation)) {
      return fail("invalid", "allocation must be a number greater than 0");
    }
    const holderStatus = status || "eligible";
    if (!STATUSES.includes(holderStatus)) {
      return fail("invalid", "status must be eligible or restricted");
    }

    holders.push({
      id: id,
      remaining: allocation,
      label: label || id,
      status: holderStatus,
    });
    console.log("added " + id + " by " + caller);
    return { ok: true, holder: id };
  }

  getPool() {
    return { ok: true, pool: this.pool };
  }

  issue(amount) {
    if (!isPositiveNumber(amount)) {
      return fail("invalid", "amount must be a number greater than 0");
    }
    this.pool = this.pool + amount;
    return { ok: true, pool: this.pool };
  }

  redeem(holderId, amount) {
    // Validate everything first; change state only when the redeem will succeed.
    if (!isPositiveNumber(amount)) {
      return fail("invalid", "amount must be a number greater than 0");
    }
    const row = findHolder(holderId);
    if (!row) {
      return fail("not_found", "holder is not listed");
    }
    if (amount > row.remaining) {
      return fail("invalid", "amount exceeds remaining allocation of " + row.remaining);
    }
    if (amount > this.pool) {
      return fail("invalid", "amount exceeds the issued pool of " + this.pool);
    }

    this.pool = this.pool - amount;
    row.remaining = row.remaining - amount;
    return { ok: true, pool: this.pool, holder: row.id, remaining: row.remaining };
  }
}

module.exports = { Registry, findHolder };
