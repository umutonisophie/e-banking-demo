// Headless test for the e-banking demo.
//
// The transaction logic lives in dashboard.html's own <script> block, so it is
// extracted and evaluated against a DOM stub rather than duplicated here.
//
// Run with:  node ebanking.test.js

const fs = require("fs");
const path = require("path");

const failures = [];
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failures.push(name);
}

// Build a fresh stub for the dashboard, evaluate its script, and return handles.
function loadDashboard() {
  const nodes = {};
  function node(id) {
    return {
      id,
      value: "",
      className: "",
      innerText: "",
    };
  }
  for (const id of ["account-input", "pin-input", "amount-input",
                    "balance-display", "message"]) {
    nodes[id] = node(id);
  }

  global.document = { getElementById: (id) => nodes[id] || null };
  global.window = {};

  const source = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf8");
  const blocks = source.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  if (blocks.length === 0) {
    console.error("FAIL  no <script> block found in dashboard.html");
    process.exit(1);
  }
  const js = blocks
    .map((b) => b.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, ""))
    .join("\n;\n");

  // Build the script as a function body and return its declarations. A bare
  // eval() runs in the caller's scope, so `let`/`function` bindings created
  // inside it are not visible to the test - returning them explicitly is the
  // reliable way to get at the page's own state.
  const factory = new Function(
    "document", "window", "alert",
    `${js}\nreturn { processTransaction, getBalance: () => balance };`
  );
  const api = factory(global.document, global.window, () => {});

  return { nodes, transact: api.processTransaction, balance: api.getBalance };
}

const VALID_ACCOUNT = "123456";
const VALID_PIN = "9999";

function transact(d, type, amount, account = VALID_ACCOUNT, pin = VALID_PIN) {
  d.nodes["account-input"].value = account;
  d.nodes["pin-input"].value = pin;
  d.nodes["amount-input"].value = String(amount);
  d.transact(type);
  return d.nodes.message.innerText;
}

// --- Authentication ---------------------------------------------------------
{
  const d = loadDashboard();
  const bad = transact(d, "deposit", 100, "000000", "1111");
  check("wrong credentials are rejected", /Invalid Account Number or PIN/.test(bad));
  check("a rejected transaction does not change the balance",
    d.balance() === 1000 && d.nodes["balance-display"].innerText === "");
}

// --- Validation -------------------------------------------------------------
{
  const d = loadDashboard();
  check("a negative amount is rejected", /valid monetary amount/.test(transact(d, "deposit", -50)));
  check("zero is rejected", /valid monetary amount/.test(transact(d, "deposit", 0)));
  check("a non-numeric amount is rejected",
    /valid monetary amount/.test(transact(d, "deposit", "abc")));
}

// --- Deposit and withdrawal -------------------------------------------------
{
  const d = loadDashboard();
  check("a valid deposit succeeds", /Successfully deposited \$50\.00/.test(transact(d, "deposit", 50)));
  check("the balance increases", d.balance() === 1050);
  check("the displayed balance is formatted to two places",
    d.nodes["balance-display"].innerText === "1050.00");

  // The page's message is "Successfully withdrew", not "Successfully withdrawn".
  check("a valid withdrawal succeeds",
    /Successfully withdrew \$200\.00/.test(transact(d, "withdraw", 200)));
  check("the balance decreases", d.balance() === 850);
}

// --- Insufficient funds -----------------------------------------------------
{
  const d = loadDashboard();
  const msg = transact(d, "withdraw", 5000);
  check("withdrawing more than the balance is denied",
    /Insufficient funds/.test(msg));
  check("a denied withdrawal leaves the balance untouched", d.balance() === 1000);
}

// --- Field clearing ---------------------------------------------------------
{
  const d = loadDashboard();
  transact(d, "deposit", 25);
  check("the amount field is cleared after a successful transaction",
    d.nodes["amount-input"].value === "");
}

console.log("");
if (failures.length) {
  console.log(`${failures.length} FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("All checks passed.");
