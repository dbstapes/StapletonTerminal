function Component3() {
  const { useState, useEffect } = React;
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [contractsSnapshot, setContractsSnapshot] = useState([]);
  const [efficiencyById, setEfficiencyById] = useState({});
  const [efficiencyLoading, setEfficiencyLoading] = useState(false);
  const [serviceError, setServiceError] = useState('');

  const sanitizeRiskFreeRateInput = (value) => {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, parsed);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchEfficiency = async () => {
      const rawRiskFreeRateInput = sanitizeRiskFreeRateInput(riskFreeRate);

      if (contractsSnapshot.length === 0) {
        setEfficiencyById({});
        setEfficiencyLoading(false);
        setServiceError('');
        return;
      }

      setEfficiencyLoading(true);
      setServiceError('');

      try {
        const results = await Promise.all(
          contractsSnapshot.map(async (contract) => {
            const S = parseFloat(contract.StockPrice) || 0;
            const theta = parseFloat(contract.Theta) || 0;
            const leapPrice = parseFloat(contract.CurrentOptionPrice) || parseFloat(contract.PurchaseOptionPrice) || 0;
            const sigma = parseFloat(contract.IV) || 0;

            if (S <= 0 || leapPrice <= 0 || sigma <= 0) {
              return {
                id: contract.id,
                leapPrice,
                theta,
                stockPrice: S,
                sigma,
                efficiency: null,
                error: 'Missing StockPrice, LEAP Price, or IV'
              };
            }

            const response = await fetch('http://localhost:3000/api/net-strategy-efficiency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                S,
                leapTheta: theta,
                leapPrice,
                sigma,
                r: rawRiskFreeRateInput
              })
            });

            if (!response.ok) {
              const payload = await response.json().catch(() => ({}));
              return {
                id: contract.id,
                leapPrice,
                theta,
                stockPrice: S,
                sigma,
                efficiency: null,
                error: payload.error || `Request failed for ${contract.Ticker}`
              };
            }

            const efficiency = await response.json();

            return {
              id: contract.id,
              leapPrice,
              theta,
              stockPrice: S,
              sigma,
              efficiency
            };
          })
        );

        if (cancelled) return;

        const nextMap = {};
        results.forEach((result) => {
          nextMap[result.id] = {
            leapPrice: result.leapPrice,
            theta: result.theta,
            stockPrice: result.stockPrice,
            sigma: result.sigma,
            error: result.error || '',
            ...(result.efficiency || {})
          };
        });

        setEfficiencyById(nextMap);
      } catch (error) {
        if (!cancelled) {
          setServiceError('Unable to calculate Theta-to-Rent ratio from service.');
        }
      } finally {
        if (!cancelled) {
          setEfficiencyLoading(false);
        }
      }
    };

    fetchEfficiency();

    return () => {
      cancelled = true;
    };
  }, [contractsSnapshot, riskFreeRate]);

  const renderNetEfficiencyVisualization = ({ contracts }) => {
    const firstAppliedRate = Object.values(efficiencyById).find((row) => row && typeof row.appliedRiskFreeRate === 'number');
    const appliedRiskFreeRate = firstAppliedRate ? firstAppliedRate.appliedRiskFreeRate : null;

    const rows = contracts.map((contract) => {
      const efficiency = efficiencyById[contract.id];

      return {
        id: contract.id,
        ticker: contract.Ticker,
        strike: contract.Strike,
        expiration: contract.Expiration,
        leapPrice: efficiency ? efficiency.leapPrice : (parseFloat(contract.CurrentOptionPrice) || parseFloat(contract.PurchaseOptionPrice) || 0),
        theta: efficiency ? efficiency.theta : (parseFloat(contract.Theta) || 0),
        efficiency
      };
    });

    const maxMagnitude = rows.reduce((max, row) => {
      const score = row.efficiency && typeof row.efficiency.incomeEfficiency === 'number' ? row.efficiency.incomeEfficiency : 0;
      return Math.max(max, score);
    }, 0.0001);

    return (
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ marginBottom: '10px' }}>Theta-to-Rent Ratio (Income Ceiling)</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ marginRight: '8px' }}>Risk-Free Rate (annual, decimal or %):</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={riskFreeRate}
            onChange={(e) => setRiskFreeRate(e.target.value)}
          />
          {appliedRiskFreeRate !== null && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#9e9e9e' }}>
              Applied Rate: {(appliedRiskFreeRate * 100).toFixed(2)}%
            </div>
          )}
        </div>
        {efficiencyLoading && <p>Calculating income efficiency from service...</p>}
        {serviceError && <p style={{ color: '#ff8a80' }}>{serviceError}</p>}

        {rows.length === 0 ? (
          <p>No contracts to visualize.</p>
        ) : (
          <div>
            {rows.map((row) => {
              const hasEfficiency = !!row.efficiency && typeof row.efficiency.incomeEfficiency === 'number';
              const scoreMagnitude = hasEfficiency ? row.efficiency.incomeEfficiency : 0;
              const widthPercent = Math.max(5, (scoreMagnitude / maxMagnitude) * 100);
              const isCrunch = hasEfficiency && row.efficiency.incomeEfficiencyStatus === 'MARGIN_CRUNCH';

              return (
                <div key={row.id} style={{ marginBottom: '10px', background: '#1b1b1b', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <strong>{row.ticker} {row.strike} {row.expiration}</strong>
                    <span>{hasEfficiency ? (isCrunch ? '🔴 MARGIN_CRUNCH' : '🟢 HEALTHY_MARGIN') : 'Calculating...'}</span>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#ccc' }}>
                    Theta: {row.theta.toFixed(4)} | LEAP Price: ${row.leapPrice.toFixed(2)}
                    {hasEfficiency
                      ? ` | Est. 2W Premium: $${row.efficiency.estimatedShortPremium.toFixed(4)} | 14D Theta Cost: $${row.efficiency.incomeEfficiencyTotalCost.toFixed(4)}`
                      : ''}
                  </div>
                  {!hasEfficiency && row.efficiency && row.efficiency.error && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#ff8a80' }}>
                      {row.efficiency.error}
                    </div>
                  )}
                  <div style={{ marginTop: '8px', background: '#2c2c2c', borderRadius: '6px', height: '14px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        background: hasEfficiency ? (isCrunch ? '#d50000' : '#00c853') : '#777',
                        transition: 'width 250ms ease'
                      }}
                    />
                  </div>
                  {hasEfficiency && (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: isCrunch ? '#ff8a80' : '#86ffb0' }}>
                      Income Efficiency Ratio: {(row.efficiency.incomeEfficiency * 100).toFixed(2)}% | Trigger: 50.00%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Component2
      heading="Option Contracts - Theta-to-Rent Ratio"
      onContractsChange={setContractsSnapshot}
      visualizationRenderer={renderNetEfficiencyVisualization}
    />
  );
}
