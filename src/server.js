const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Registry } = require("./registry");

const registry = new Registry("ops");
const publicDir = path.join(__dirname, "..", "public");

// The issuer is identified by a server-side secret, never by a value the page sends.
// Set ISSUER_TOKEN to choose it; otherwise a random one is generated and printed at start.
const ISSUER_TOKEN = process.env.ISSUER_TOKEN || crypto.randomBytes(16).toString("hex");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const STATUS_BY_CODE = {
  invalid: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
};

function toNumber(value) {
  if (value == null || value === "") {
    return 0;
    // PROBLEM 2
  }
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

// Returns the issuer name when the request carries the issuer token, otherwise null.
function callerFromRequest(req, reg, token) {
  const header = req.headers["authorization"] || "";
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) {
    return null;
  }
  const given = Buffer.from(match[1].trim());
  const expected = Buffer.from(token);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null;
  }
  return reg.issuer;
}

function handle(reg, action, payload, caller) {
  payload = payload || {};

  if (action === "add") {
    // No default caller: a request without the issuer token is not the issuer.
    const allocation =
      payload.allocation == null || payload.allocation === "" ? 100 : Number(payload.allocation);
    return reg.addHolder(
      caller,
      payload.holder,
      allocation,
      payload.label || "",
      payload.status || "eligible"
    );
  }

  if (action === "issue") {
    return reg.issue(toNumber(payload.amount));
    // PROBLEM 2
  }

  if (action === "redeem") {
    try {
      // PROBLEM 2
      return reg.redeem(payload.holder, toNumber(payload.amount));
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  if (action === "remaining") {
    return reg.remaining(payload.holder);
    // PROBLEM 3
  }

  if (action === "list") {
    return reg.getHolders();
  }

  return null;
}

function statusFor(result) {
  if (result && typeof result === "object" && result.ok === false) {
    return STATUS_BY_CODE[result.code] || 400;
  }
  return 200;
}

function send(res, status, body, type) {
  if (Buffer.isBuffer(body)) {
    res.writeHead(status, { "Content-Type": type || "application/octet-stream" });
    res.end(body);
    return;
  }
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type || "application/json; charset=utf-8" });
  res.end(data);
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch (_error) {
        send(res, 400, { ok: false, error: "bad json" });
        return;
      }
      const caller = callerFromRequest(req, registry, ISSUER_TOKEN);
      const result = handle(registry, body.action, body, caller);
      send(res, statusFor(result), result);
    });
    return;
  }

  if (req.method !== "GET") {
    send(res, 405, "method", "text/plain; charset=utf-8");
    return;
  }

  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const full = path.normalize(path.join(publicDir, urlPath));
  if (!full.startsWith(publicDir)) {
    send(res, 403, "no", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(full, (error, data) => {
    if (error) {
      send(res, 404, "not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, types[path.extname(full)] || "application/octet-stream");
  });
});

if (require.main === module) {
  const port = 3000;
  server.listen(port, "127.0.0.1", () => {
    console.log("desk on http://127.0.0.1:" + port);
    if (!process.env.ISSUER_TOKEN) {
      console.log("issuer token for this run: " + ISSUER_TOKEN);
    }
  });
}

module.exports = { handle, callerFromRequest, statusFor, server };
