function normalizeRate(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError(`${fieldName} must be a valid number`);
  }
  if (value < 0) {
    throw new RangeError(`${fieldName} must be greater than or equal to 0`);
  }
  return value > 1 ? value / 100 : value;
}

function normalizeVolatility(sigma, fallback) {
  const raw = typeof sigma === 'number' && !Number.isNaN(sigma) ? sigma : fallback;
  if (typeof raw !== 'number' || Number.isNaN(raw) || raw <= 0) {
    return 0.25;
  }
  return raw > 1 ? raw / 100 : raw;
}

function standardNormalCdf(x) {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const t = 1 / (1 + p * Math.abs(x));
  const polynomial = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const density = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - density * polynomial;
  return x >= 0 ? cdf : 1 - cdf;
}

function standardNormalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function parseContractNumber(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function daysToExpiration(expiration) {
  if (!expiration) {
    return 30;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${expiration}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function getD1D2(S, K, T, r, sigma, q) {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
    return null;
  }
  const numerator = Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T;
  const denominator = sigma * Math.sqrt(T);
  const d1 = numerator / denominator;
  const d2 = d1 - denominator;
  return { d1, d2 };
}

function blackScholesCallPrice(S, K, T, r, sigma, q) {
  const values = getD1D2(S, K, T, r, sigma, q);
  if (!values) {
    return 0;
  }
  const { d1, d2 } = values;
  return (S * Math.exp(-q * T) * standardNormalCdf(d1)) - (K * Math.exp(-r * T) * standardNormalCdf(d2));
}

function blackScholesCallDelta(S, K, T, r, sigma, q) {
  const values = getD1D2(S, K, T, r, sigma, q);
  if (!values) {
    return 0;
  }
  return Math.exp(-q * T) * standardNormalCdf(values.d1);
}

function blackScholesCallThetaDaily(S, K, T, r, sigma, q) {
  const values = getD1D2(S, K, T, r, sigma, q);
  if (!values) {
    return 0;
  }
  const { d1, d2 } = values;
  const firstTerm = -((S * Math.exp(-q * T) * standardNormalPdf(d1) * sigma) / (2 * Math.sqrt(T)));
  const secondTerm = -r * K * Math.exp(-r * T) * standardNormalCdf(d2);
  const thirdTerm = q * S * Math.exp(-q * T) * standardNormalCdf(d1);
  const annualTheta = firstTerm + secondTerm + thirdTerm;
  return annualTheta / 365;
}

// Daily charm approximation: next-day delta - current delta
function blackScholesCallCharmDaily(S, K, T, r, sigma, q) {
  const currentDelta = blackScholesCallDelta(S, K, T, r, sigma, q);
  const nextT = Math.max(1 / 3650, T - (1 / 365));
  const nextDelta = blackScholesCallDelta(S, K, nextT, r, sigma, q);
  return nextDelta - currentDelta;
}

function buildContractStates(portfolioContracts, r) {
  return portfolioContracts.map((contract) => {
    const spot = parseContractNumber(contract.StockPrice, 0);
    const strike = parseContractNumber(contract.Strike, 0);
    const dte = daysToExpiration(contract.Expiration);
    const sigma = normalizeVolatility(parseContractNumber(contract.IV, NaN), 0.25);
    const purchasePrice = Math.max(0.01, parseContractNumber(contract.PurchaseOptionPrice, parseContractNumber(contract.CurrentOptionPrice, 0.01)));
    const quantity = Math.max(1, Math.floor(parseContractNumber(contract.ContractsHeld, 1)));
    const initialT = Math.max(1 / 3650, dte / 365);
    const startingDelta = parseContractNumber(contract.Delta, blackScholesCallDelta(spot, strike, initialT, r, sigma, 0));

    return {
      id: contract.id,
      ticker: contract.Ticker || `Contract ${contract.id}`,
      spot,
      strike,
      dte,
      sigma,
      quantity,
      purchasePrice,
      delta: Math.max(0, Math.min(1, startingDelta))
    };
  }).filter((contract) => contract.spot > 0 && contract.strike > 0);
}

function generateTradeDegradationSeries({
  r,
  bankroll,
  crunchLimit = 0.40,
  simulationDays,
  portfolioContracts = []
}) {
  if (typeof bankroll !== 'number' || Number.isNaN(bankroll) || bankroll <= 0) {
    throw new RangeError('bankroll must be greater than 0');
  }
  if (!Array.isArray(portfolioContracts) || portfolioContracts.length === 0) {
    throw new TypeError('portfolioContracts must be a non-empty array');
  }
  if (typeof crunchLimit !== 'number' || Number.isNaN(crunchLimit) || crunchLimit < 0) {
    throw new RangeError('crunchLimit must be greater than or equal to 0');
  }

  const normalizedRate = normalizeRate(r, 'r');
  const requestedSimulationDays = typeof simulationDays === 'number' && !Number.isNaN(simulationDays)
    ? Math.max(1, Math.floor(simulationDays))
    : 90;

  const contractStates = buildContractStates(portfolioContracts, normalizedRate);
  if (contractStates.length === 0) {
    throw new Error('No valid contracts available for projection');
  }

  const totalPurchasePrice = contractStates.reduce((sum, contract) => sum + (contract.purchasePrice * contract.quantity), 0);
  const weights = {};
  contractStates.forEach((contract) => {
    const contractCost = contract.purchasePrice * contract.quantity;
    weights[contract.id] = totalPurchasePrice > 0 ? contractCost / totalPurchasePrice : 0;
  });

  let remainingBankroll = bankroll;
  const series = [];

  for (let day = 0; day <= requestedSimulationDays; day += 1) {
    let weightedDelta = 0;
    let weightedLeverage = 0;
    let totalCurrentValue = 0;
    let totalDailyThetaCost = 0;
    const crunchByContract = {};
    const charmByContract = {};

    contractStates.forEach((contract) => {
      const T = Math.max(1 / 3650, (contract.dte - day) / 365);
      const q = 0;
      const optionPrice = Math.max(0.01, blackScholesCallPrice(contract.spot, contract.strike, T, normalizedRate, contract.sigma, q));
      const thetaDaily = blackScholesCallThetaDaily(contract.spot, contract.strike, T, normalizedRate, contract.sigma, q);
      const charmDaily = blackScholesCallCharmDaily(contract.spot, contract.strike, T, normalizedRate, contract.sigma, q);

      if (day > 0) {
        contract.delta = Math.max(0, Math.min(1, contract.delta + charmDaily));
      }

      const weight = weights[contract.id] || 0;
      weightedDelta += weight * contract.delta;
      weightedLeverage += weight * (contract.spot / optionPrice);
      totalCurrentValue += optionPrice * 100 * contract.quantity;

      const rentStrike = contract.spot * 1.10;
      const rentTerm = 14 / 365;
      const rentCost = blackScholesCallPrice(contract.spot, rentStrike, rentTerm, normalizedRate, contract.sigma, q);
      crunchByContract[contract.id] = rentCost > 0
        ? Math.abs(thetaDaily * 14) / rentCost
        : Number.POSITIVE_INFINITY;

      charmByContract[contract.id] = charmDaily;
      totalDailyThetaCost += Math.abs(thetaDaily) * 100 * contract.quantity;
    });

    if (day > 0) {
      remainingBankroll = Math.max(1, remainingBankroll - totalDailyThetaCost);
    }

    const kellyFraction = weightedLeverage > 0
      ? weightedDelta - ((1 - weightedDelta) / weightedLeverage)
      : 0;
    const currentValue = remainingBankroll > 0 ? totalCurrentValue / remainingBankroll : 0;
    const component2KellyRatio = kellyFraction !== 0 ? currentValue / kellyFraction : 0;
    // Will be normalized after series build so day 0 matches Component2 exactly.
    const kellyRatio = component2KellyRatio;

    series.push({
      day,
      weightedDelta,
      weightedLeverage,
      kellyFraction,
      currentValue,
      kellyRatio,
      component2KellyRatio,
      remainingBankroll,
      totalDailyThetaCost,
      crunchByContract,
      charmByContract
    });
  }

  // Normalize projection Kelly so it anchors to Component2 on day 0,
  // then rises with charm-driven delta growth and bankroll decay.
  if (series.length > 0) {
    const baselineKelly = series[0].component2KellyRatio || 0;
    const baselineDelta = series[0].weightedDelta || 0;
    series.forEach((point) => {
      const deltaFactor = baselineDelta > 0 ? point.weightedDelta / baselineDelta : 1;
      const bankrollFactor = point.remainingBankroll > 0 ? bankroll / point.remainingBankroll : 1;
      point.kellyRatio = baselineKelly * deltaFactor * bankrollFactor;
    });
  }

  return series;
}

function detectThresholdBreaches(series, maxKellyLimit, crunchLimit) {
  const events = [];

  const kellyEvent = series.find((point) => point.kellyRatio >= maxKellyLimit);
  if (kellyEvent) {
    events.push({
      type: 'KELLY_BREACH',
      day: kellyEvent.day,
      value: kellyEvent.kellyRatio
    });
  }

  const crunchEvent = series.find((point) => {
    return Object.values(point.crunchByContract).some((crunch) => crunch >= crunchLimit);
  });
  if (crunchEvent) {
    events.push({
      type: 'CRUNCH_BREACH',
      day: crunchEvent.day,
      value: Math.max(...Object.values(crunchEvent.crunchByContract))
    });
  }

  return events;
}

function generateOptionProjection(params) {
  const series = generateTradeDegradationSeries(params);
  const maxKellyLimit = params.maxKellyLimit === undefined ? 0.50 : params.maxKellyLimit;
  const crunchLimit = params.crunchLimit === undefined ? 0.40 : params.crunchLimit;
  const events = detectThresholdBreaches(series, maxKellyLimit, crunchLimit);
  return { series, events };
}

module.exports = {
  blackScholesCallPrice,
  blackScholesCallDelta,
  blackScholesCallThetaDaily,
  blackScholesCallCharmDaily,
  detectThresholdBreaches,
  generateOptionProjection,
  generateTradeDegradationSeries,
  standardNormalCdf
};
