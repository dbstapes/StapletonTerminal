function calculatePresentThetaEfficiency(leapTheta, leapPrice, riskFreeRate) {
  if (
    typeof leapTheta !== 'number' || Number.isNaN(leapTheta) ||
    typeof leapPrice !== 'number' || Number.isNaN(leapPrice) ||
    typeof riskFreeRate !== 'number' || Number.isNaN(riskFreeRate)
  ) {
    throw new TypeError('leapTheta, leapPrice, and riskFreeRate must be valid numbers');
  }

  const dailyRiskFreeRate = riskFreeRate / 365;
  const dailyRiskFreeYield = leapPrice * dailyRiskFreeRate;
  const dailyCost = Math.abs(leapTheta);
  const efficiencyScore = dailyRiskFreeYield - dailyCost;
  const status = efficiencyScore < 0 ? 'THUMBS_DOWN' : 'THUMBS_UP';

  return {
    dailyRiskFreeRate,
    dailyRiskFreeYield,
    dailyCost,
    efficiencyScore,
    status
  };
}

module.exports = {
  calculatePresentThetaEfficiency
};
