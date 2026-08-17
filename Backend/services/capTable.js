const EPSILON = 0.01;

function assertValidEquity(value) {
  const equity = Number(value);

  if (!Number.isFinite(equity) || equity <= 0 || equity >= 100) {
    throw new Error("Equity percentage must be greater than 0 and less than 100.");
  }

  return equity;
}

function roundPercentage(value) {
  return Number(Number(value).toFixed(4));
}

/**
 * Creates the next cap-table snapshot after a new investment.
 * `holders` contains the ownership snapshot immediately before the investment.
 */
function applyInvestmentDilution(holders, equityAcquired, investorId, investorName) {
  const equity = assertValidEquity(equityAcquired);

  if (!Array.isArray(holders) || holders.length === 0) {
    throw new Error("A startup must have an existing ownership snapshot before investment.");
  }

  const currentTotal = holders.reduce(
    (sum, holder) => sum + Number(holder.equity_percentage || 0),
    0,
  );

  if (Math.abs(currentTotal - 100) > EPSILON) {
    throw new Error("Existing cap table is invalid: ownership must total 100%.");
  }

  const dilutionFactor = (100 - equity) / 100;
  const next = holders.map((holder) => ({
    ...holder,
    equity_percentage: roundPercentage(
      Number(holder.equity_percentage) * dilutionFactor,
    ),
  }));

  const existingInvestor = next.find(
    (holder) =>
      holder.investor_id !== null &&
      holder.investor_id !== undefined &&
      Number(holder.investor_id) === Number(investorId),
  );

  if (existingInvestor) {
    existingInvestor.equity_percentage = roundPercentage(
      existingInvestor.equity_percentage + equity,
    );
  } else {
    next.push({
      founder_id: null,
      investor_id: investorId,
      investor_name: investorName,
      founder_name: null,
      equity_percentage: equity,
    });
  }

  const nextTotal = next.reduce(
    (sum, holder) => sum + Number(holder.equity_percentage || 0),
    0,
  );

  if (Math.abs(nextTotal - 100) > EPSILON) {
    throw new Error("Calculated cap table is invalid: ownership must total 100%.");
  }

  return next;
}

module.exports = {
  EPSILON,
  assertValidEquity,
  applyInvestmentDilution,
  roundPercentage,
};
