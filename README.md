# E-Banking Demo

A small banking interface: a login page, a dashboard with a balance, and
deposit and withdrawal. Plain HTML, CSS and JavaScript, no dependencies. Open
`project.html` to start.

## Pages

- `project.html` — login
- `dashboard.html` — balance, deposit, withdraw, logout

## Credentials

| Field | Value |
|---|---|
| Account number | `123456` |
| PIN | `9999` |

## What it does

`handleLogin` checks that both fields are filled, then navigates to the
dashboard. `processTransaction` verifies the credentials, validates the amount,
applies the change and re-renders the balance to two decimal places. A withdrawal
larger than the balance is refused and leaves the balance untouched.

## A warning worth reading

**The credentials are hardcoded in client-side JavaScript.** That is acceptable
for a teaching demo and unacceptable for anything real: anyone who opens the page
source can read them, and because all validation happens in the browser, a user
can simply edit the JavaScript to bypass every check.

This is a UI demonstration, not a banking application. A real one would:

- authenticate server-side, never in the page
- store password hashes rather than plaintext PINs, and compare them in constant time
- enforce every rule — balance, permissions, limits — on the server
- keep balances in a database with transactions, not in a JavaScript variable
- log and rate-limit attempts

The test suite covers the client-side rules only, because those are the only
rules this code has.

## Tests

```bash
node ebanking.test.js
```

13 checks, no dependencies. The suite extracts `dashboard.html`'s own `<script>`
block and evaluates it against a DOM stub, so it tests the shipped code rather
than a copy. It covers credential rejection, amount validation including
negatives and non-numeric input, balance arithmetic, the insufficient-funds
path, and field clearing after a successful transaction.

## Project layout

```
project.html     login page
dashboard.html   balance, deposit, withdraw
project.css      shared stylesheet
ebanking.test.js headless test suite
```
