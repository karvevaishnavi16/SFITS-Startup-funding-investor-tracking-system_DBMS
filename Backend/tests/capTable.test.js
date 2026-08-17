const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyInvestmentDilution,
  assertValidEquity,
} = require("../services/capTable");

test("dilutes existing holders and adds a new investor", () => {
  const next = applyInvestmentDilution(
    [
      { founder_id: 1, investor_id: null, equity_percentage: 80 },
      { founder_id: 2, investor_id: null, equity_percentage: 20 },
    ],
    25,
    10,
    "Northstar Ventures",
  );

  assert.equal(next[0].equity_percentage, 60);
  assert.equal(next[1].equity_percentage, 15);
  assert.equal(next[2].equity_percentage, 25);
});

test("adds investment to an existing investor after dilution", () => {
  const next = applyInvestmentDilution(
    [
      { founder_id: 1, investor_id: null, equity_percentage: 70 },
      { founder_id: null, investor_id: 4, equity_percentage: 30 },
    ],
    10,
    4,
    "Nimbus Capital",
  );

  assert.equal(next[0].equity_percentage, 63);
  assert.equal(next[1].equity_percentage, 37);
});

test("rejects an invalid existing cap table", () => {
  assert.throws(
    () =>
      applyInvestmentDilution(
        [
          { founder_id: 1, investor_id: null, equity_percentage: 60 },
          { founder_id: 2, investor_id: null, equity_percentage: 50 },
        ],
        10,
        9,
        "Test Investor",
      ),
    /ownership must total 100%/,
  );
});

test("rejects invalid investment percentages", () => {
  assert.throws(() => assertValidEquity(0), /greater than 0/);
  assert.throws(() => assertValidEquity(100), /less than 100/);
  assert.throws(() => assertValidEquity("not-a-number"), /greater than 0/);
});
