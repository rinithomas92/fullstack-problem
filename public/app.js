// The issuer token is kept in memory for this tab only. It is sent as a bearer token,
// and the server decides who the caller is. The page never names the caller itself.
const tokenInput = document.getElementById("issuer-token");
const addResult = document.getElementById("add-result");
const holderIdInput = document.getElementById("holder-id");
const labelInput = document.getElementById("label");
const allocationInput = document.getElementById("allocation");
const statusInput = document.getElementById("status");
const poolLine = document.getElementById("pool");
const issueAmountInput = document.getElementById("issue-amount");
const issueResult = document.getElementById("issue-result");
const redeemHolderInput = document.getElementById("redeem-holder");
const redeemAmountInput = document.getElementById("redeem-amount");
const redeemResult = document.getElementById("redeem-result");
const lookupIdInput = document.getElementById("lookup-id");
const lookupResult = document.getElementById("lookup-result");
const rowsEl = document.getElementById("rows");

let statusFilter = "all";
let rows = [];

async function api(action, payload) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenInput.value.trim();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  try {
    const response = await fetch("/api", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    });
    return await response.json();
  } catch (_error) {
    return { ok: false, error: "could not reach the desk API" };
  }
}

function showResult(el, result, okText) {
  if (result && result.ok === false) {
    el.textContent = "Failed: " + result.error;
    el.className = "result error";
  } else {
    el.textContent = okText;
    el.className = "result ok";
  }
}

async function refresh() {
  const pool = await api("pool");
  poolLine.textContent = pool && pool.ok ? String(pool.pool) : "unavailable";
  rows = await api("list");
  render();
}

function render() {
  const visible = rows;
  // PROBLEM 3
  rowsEl.innerHTML = "";
  visible.forEach((holder) => {
    const item = document.createElement("li");
    item.textContent = "<b>" + holder.label + "</b> " + holder.id + " remaining=" + holder.remaining;
    // PROBLEM 3
    item.addEventListener("click", function () {
      // Selecting a row only fills the redeem form; the operator chooses the amount.
      redeemHolderInput.value = holder.id;
      redeemAmountInput.focus();
    });
    rowsEl.appendChild(item);
  });

  document.querySelectorAll(".filters button").forEach((button) => {
    button.className = button.getAttribute("data-filter") === statusFilter ? "on" : "";
  });
}

async function addHolder() {
  const result = await api("add", {
    holder: holderIdInput.value,
    allocation: allocationInput.value,
    label: labelInput.value,
    status: statusInput.value,
  });
  showResult(addResult, result, "Added " + holderIdInput.value.trim());
  refresh();
}

async function issue() {
  const result = await api("issue", { amount: issueAmountInput.value });
  showResult(issueResult, result, result.ok ? "Issued. Pool is now " + result.pool : "");
  refresh();
}

async function redeem() {
  const result = await api("redeem", {
    holder: redeemHolderInput.value,
    amount: redeemAmountInput.value,
  });
  showResult(
    redeemResult,
    result,
    result.ok ? "Redeemed. " + result.holder + " has " + result.remaining + " remaining" : ""
  );
  refresh();
}

async function lookup() {
  const value = await api("remaining", { holder: lookupIdInput.value });
  lookupResult.textContent = "remaining=" + value;
}

document.getElementById("add").addEventListener("click", addHolder);
document.getElementById("issue").addEventListener("click", issue);
document.getElementById("redeem").addEventListener("click", redeem);
document.getElementById("lookup").addEventListener("click", lookup);
document.querySelectorAll(".filters button").forEach((button) => {
  button.addEventListener("click", function () {
    statusFilter = button.getAttribute("data-filter");
    render();
  });
});

refresh();
