function normalizeSigma(sigma) {
  const normalized = sigma > 1 ? sigma / 100 : sigma;
  return normalized;
}

function normalizeRate(r) {
  if (r < 0) {
    throw new RangeError('r must be greater than or equal to 0');
  }
  return r > 1 ? r / 100 : r;
}

function standardNormalCdf(x) {
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const t = 1 / (1 + p * Math.abs(x));
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

function blackScholesCallPrice(S, K, T, sigma, r) {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
    return 0;
  }

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const callPrice = (S * standardNormalCdf(d1)) - (K * Math.exp(-r * T) * standardNormalCdf(d2));
  return Math.max(0, callPrice);
}

function calculateIncomeEfficiencyRatio(dailyLeapTheta, estimatedTwoWeekPremium) {
  if (
    typeof dailyLeapTheta !== 'number' || Number.isNaN(dailyLeapTheta) ||
    typeof estimatedTwoWeekPremium !== 'number' || Number.isNaN(estimatedTwoWeekPremium)
  ) {
    throw new TypeError('dailyLeapTheta and estimatedTwoWeekPremium must be valid numbers');
  }

  if (estimatedTwoWeekPremium <= 0) {
    throw new RangeError('estimatedTwoWeekPremium must be greater than 0');
  }

  const totalCost = Math.abs(dailyLeapTheta * 14);
  const efficiency = totalCost / estimatedTwoWeekPremium;
  const status = efficiency > 0.50 ? 'MARGIN_CRUNCH' : 'HEALTHY_MARGIN';

  return {
    totalCost,
    efficiency,
    status
  };
}

function calculateNetStrategyEfficiency(S, leapTheta, leapPrice, sigma, r) {
  const inputs = { S, leapTheta, leapPrice, sigma, r };
  const hasInvalidType = Object.values(inputs).some((value) => typeof value !== 'number' || Number.isNaN(value));

  if (hasInvalidType) {
    throw new TypeError('S, leapTheta, leapPrice, sigma, and r must be valid numbers');
  }

  if (S <= 0 || leapPrice <= 0) {
    throw new RangeError('S and leapPrice must be greater than 0');
  }

  const normalizedSigma = normalizeSigma(sigma);
  const normalizedRate = normalizeRate(r);
  if (normalizedSigma <= 0) {
    throw new RangeError('sigma must be greater than 0');
  }

  const T = 14 / 365;
  const K = S * 1.10;

  const estimatedShortPremium = blackScholesCallPrice(S, K, T, normalizedSigma, normalizedRate);
  const incomeEfficiency = calculateIncomeEfficiencyRatio(leapTheta, estimatedShortPremium);
  const twoWeekRiskFreeReturn = leapPrice * normalizedRate * (14 / 365);
  const twoWeekThetaCost = Math.abs(leapTheta) * 14;
  const twoWeekStrategyReturn = estimatedShortPremium - twoWeekThetaCost;
  const netScore = twoWeekStrategyReturn - twoWeekRiskFreeReturn;
  const twoWeekStrategyReturnRate = leapPrice > 0 ? twoWeekStrategyReturn / leapPrice : 0;
  const twoWeekRiskFreeReturnRate = normalizedRate * (14 / 365);
  const beatsRiskFreeRate = twoWeekStrategyReturn > twoWeekRiskFreeReturn;
  const status = beatsRiskFreeRate ? 'THUMBS_UP' : 'THUMBS_DOWN';

  return {
    netScore,
    estimatedShortPremium,
    incomeEfficiency: incomeEfficiency.efficiency,
    incomeEfficiencyStatus: incomeEfficiency.status,
    incomeEfficiencyTotalCost: incomeEfficiency.totalCost,
    status,
    appliedRiskFreeRate: normalizedRate,
    beatsRiskFreeRate,
    twoWeekStrategyReturn,
    twoWeekRiskFreeReturn,
    twoWeekStrategyReturnRate,
    twoWeekRiskFreeReturnRate,
    twoWeekThetaCost
  };
}

module.exports = {
  calculateNetStrategyEfficiency,
  calculateIncomeEfficiencyRatio
};
