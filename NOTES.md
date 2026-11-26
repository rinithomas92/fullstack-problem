# Approach, assumptions and tradeoffs

## How to run

```bash
node src/server.js                  # prints a random issuer token for this run
ISSUER_TOKEN=my-secret node src/server.js   # or choose the token
npm test                            # 15 tests, Node's built-in runner, no dependencies
```

Open `http://127.0.0.1:3000` and paste the issuer token into **Issuer sign-in** to add holders.

## Safety note on the supplied repo

The `.git` folder in the supplied zip had executable `pre-commit` and `post-checkout` hooks that download and run a remote script. I did not run any git command in that repo. I copied only the source files into a fresh repository and worked there.

## The principle behind all three fixes

1. **The server decides, the page only displays.** Identity, validation and state changes all live on the server.
2. **Missing input is an error, never a default.** No caller is not the issuer, and no amount is not 0.
3. **Check everything first, then change state.** A failed operation leaves nothing half-done.
4. **Failures are explicit results**: `{ ok: false, code, error }` with a matching HTTP status (400 / 401 / 404 / 409). Real bugs are logged and return 500.

## Problem 1: only the issuer can add holders

| Before | After |
|---|---|
| Caller came from an editable box saved in localStorage | Caller is derived on the server from an issuer bearer token |
| Missing caller defaulted to `"ops"` (the issuer) | No token means no caller, which returns 401 |
| `addHolder` never checked the caller | `addHolder` checks the caller against the issuer |
| Empty ids were accepted | Empty, duplicate (case-insensitive) ids, bad allocations and statuses are rejected |

**Tradeoff:** a single shared issuer token is the smallest change that makes identity server-side. In production I would use real sign-in (SSO with MFA), sessions and roles, plus an audit log of who added what.

## Problem 2: issue and redeem

- `issue` rejects anything that isn't a number greater than 0.
- `redeem` checks the amount, that the holder is listed, the remaining allocation and the pool **before** changing anything, then cuts **both** the pool and remaining.
- The server no longer turns a missing amount into 0, and the try/catch that hid crashes is gone.
- The page reads the real pool through a new `pool` action. Redeem is now a form where the operator chooses the amount, instead of a click that always redeemed 10. Results and errors are shown.

**Assumption:** a redeem cannot take the pool below 0. The brief didn't say; I chose the safe option and would confirm it.

## Problem 3: missing vs 0, filters, labels, shared state

- `remaining` returns 404 `not_found` for a holder that was never listed, and `{ ok: true, remaining: 0 }` for a real 0. The page shows "Not listed" separately.
- The Eligible / Restricted / All buttons filter the rows.
- Labels are built as a `<b>` element with `textContent`. They show bold, and user-entered labels can never inject HTML.
- `holders` belongs to each `Registry` instance, not the module. `getHolders` returns copies.

## Open questions I would ask

1. Should `issue` and `redeem` also be issuer-only? The brief only restricted adds, so I kept their behaviour.
2. Can **restricted** holders redeem? The brief doesn't say, so it's unchanged.
3. Should amounts be whole units only? Today any positive number is accepted. For real money or units I would store integers in the smallest unit.
4. State is in memory and resets on restart. A real desk needs a database, with transactions around redeem.
