function Component4() {
  const { useState, useEffect, useRef } = React;
  const [contractsSnapshot, setContractsSnapshot] = useState([]);
  const [bankroll, setBankroll] = useState(0);
  const [projectionData, setProjectionData] = useState(null);
  const [riskFreeRate, setRiskFreeRate] = useState(0.045);
  const [simulationDays, setSimulationDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Auto-run projection when inputs change
  useEffect(() => {
    if (contractsSnapshot.length > 0 && bankroll > 0) {
      runProjection();
    }
  }, [contractsSnapshot, bankroll, simulationDays, riskFreeRate]);

  const runProjection = async () => {
    if (contractsSnapshot.length === 0 || bankroll <= 0) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        r: riskFreeRate,
        bankroll,
        crunchLimit: 0.40,
        simulationDays,
        portfolioContracts: contractsSnapshot
      };

      const response = await fetch('http://localhost:3000/api/options-strategy-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Projection request failed');
      }

      setProjectionData(data);
    } catch (error) {
      console.error('Projection error:', error);
      setProjectionData(null);
    } finally {
      setLoading(false);
    }
  };

  // Chart rendering effect
  useEffect(() => {
    if (!chartRef.current || !projectionData || typeof echarts === 'undefined') {
      return undefined;
    }

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;
    const series = projectionData.series || [];
    const events = projectionData.events || [];
    const maxDay = series.length > 0 ? series[series.length - 1].day : 0;
    const kellyEvent = events.find((event) => event.type === 'KELLY_BREACH');
    const crunchEvent = events.find((event) => event.type === 'CRUNCH_BREACH');
    const maxKellyValue = Math.max(1.25, ...series.map((point) => point.kellyRatio || 0));
    const maxCrunchValue = 1;

    const option = {
      backgroundColor: '#111',
      animation: false,
      grid: [
        { left: 70, right: 30, top: 40, height: 220 },
        { left: 70, right: 30, top: 340, height: 220 }
      ],
      axisPointer: {
        link: [{ xAxisIndex: [0, 1] }],
        label: { backgroundColor: '#555' }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 17, 17, 0.95)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: (params) => {
          const dayPoint = params.find((item) => item.seriesName === 'Kelly Ratio' || item.seriesName.includes('Crunch'));
          const kellyPoint = params.find((item) => item.seriesName === 'Kelly Ratio');
          const day = dayPoint ? dayPoint.value[0] : '-';
          const kellyValue = kellyPoint ? kellyPoint.value[1].toFixed(4) : 'n/a';
          const crunchLines = params
            .filter((item) => item.seriesName.includes('Crunch') && item.value)
            .map((item) => `${item.seriesName}: ${item.value[1].toFixed(3)}`)
            .join('<br/>');
          return [
            `<strong>Day ${day}</strong>`,
            `Portfolio Kelly Ratio: ${kellyValue}`,
            crunchLines || 'No crunch data'
          ].join('<br/>');
        }
      },
      xAxis: [
        {
          type: 'value',
          gridIndex: 0,
          min: 0,
          max: maxDay,
          axisLabel: { show: false, color: '#ccc' },
          axisLine: { lineStyle: { color: '#666' } },
          splitLine: { lineStyle: { color: '#222' } }
        },
        {
          type: 'value',
          gridIndex: 1,
          min: 0,
          max: maxDay,
          name: 'Day',
          nameLocation: 'middle',
          nameGap: 35,
          axisLabel: { color: '#ccc' },
          axisLine: { lineStyle: { color: '#666' } },
          splitLine: { lineStyle: { color: '#222' } }
        }
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          min: 0,
          max: maxKellyValue,
          name: 'Kelly Ratio',
          nameTextStyle: { color: '#ccc' },
          axisLabel: { color: '#ccc' },
          axisLine: { lineStyle: { color: '#666' } },
          splitLine: { lineStyle: { color: '#222' } }
        },
        {
          type: 'value',
          gridIndex: 1,
          min: 0,
          max: maxCrunchValue,
          name: 'Margin Crunch',
          nameTextStyle: { color: '#ccc' },
          axisLabel: {
            color: '#ccc',
            formatter: (value) => value.toFixed(2)
          },
          axisLine: { lineStyle: { color: '#666' } },
          splitLine: { lineStyle: { color: '#222' } }
        }
      ],
      series: [
        {
          name: 'Kelly Ratio',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          showSymbol: false,
          smooth: true,
          lineStyle: { color: '#4fc3f7', width: 3 },
          data: series.map((point) => [point.day, point.kellyRatio]),
          markArea: {
            silent: true,
            itemStyle: { opacity: 0.16 },
            data: [
              [{ xAxis: 0, yAxis: 0, itemStyle: { color: '#fdd835' } }, { xAxis: maxDay, yAxis: 0.25 }],
              [{ xAxis: 0, yAxis: 0.25, itemStyle: { color: '#00c853' } }, { xAxis: maxDay, yAxis: 0.50 }],
              [{ xAxis: 0, yAxis: 0.50, itemStyle: { color: '#fdd835' } }, { xAxis: maxDay, yAxis: 1.0 }],
              [{ xAxis: 0, yAxis: 1.0, itemStyle: { color: '#d50000' } }, { xAxis: maxDay, yAxis: maxKellyValue }]
            ]
          }
        },
        {
          name: 'Kelly Yellow Alert',
          type: 'scatter',
          xAxisIndex: 0,
          yAxisIndex: 0,
          symbol: 'diamond',
          symbolSize: 18,
          itemStyle: { color: '#ffeb3b', borderColor: '#8c6d1f', borderWidth: 2 },
          data: kellyEvent ? [[kellyEvent.day, kellyEvent.value]] : []
        }
      ]
    };

    // Add a line for each contract's margin crunch
    const crunchColors = ['#ffb74d', '#81c784', '#e57373', '#64b5f6', '#ffb74d', '#9575cd'];
    if (series.length > 0 && series[0].crunchByContract) {
      const contractIds = Object.keys(series[0].crunchByContract);
      let isFirstCrunchSeries = true;
      contractIds.forEach((contractId, idx) => {
        const contractName = contractsSnapshot.find((c) => String(c.id) === String(contractId))?.Ticker || `Contract ${contractId}`;
        const markArea = isFirstCrunchSeries
          ? {
              silent: true,
              itemStyle: { opacity: 0.16 },
              data: [
                [{ xAxis: 0, yAxis: 0, itemStyle: { color: '#00c853' } }, { xAxis: maxDay, yAxis: 0.40 }],
                [{ xAxis: 0, yAxis: 0.40, itemStyle: { color: '#d50000' } }, { xAxis: maxDay, yAxis: maxCrunchValue }]
              ]
            }
          : undefined;

        option.series.push({
          name: `${contractName} Crunch`,
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          showSymbol: false,
          smooth: true,
          lineStyle: { color: crunchColors[idx % crunchColors.length], width: 2.5 },
          data: series.map((point) => [point.day, point.crunchByContract[contractId] || 0]),
          markArea
        });
        isFirstCrunchSeries = false;
      });
    }

    chart.setOption(option, true);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [projectionData, contractsSnapshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const renderProjectionVisualization = () => {
    const events = projectionData ? projectionData.events || [] : [];
    const kellyEvent = events.find((event) => event.type === 'KELLY_BREACH');
    const crunchEvent = events.find((event) => event.type === 'CRUNCH_BREACH');

    return (
      <div className="projection-panel">
        <div className="projection-controls" style={{ maxWidth: '600px', marginBottom: '20px' }}>
          <div className="projection-control-group">
            <label>Risk-Free Rate (r)</label>
            <input
              type="number"
              step="0.0001"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0.045)}
            />
          </div>
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px' }}>Simulation Horizon</label>
            <div className="simulation-radio-group">
              {[30, 60, 90, 180].map((value) => (
                <label key={value} className="simulation-radio-option">
                  <input
                    type="radio"
                    name="simulationDays"
                    value={value}
                    checked={simulationDays === value}
                    onChange={() => setSimulationDays(value)}
                  />
                  <span>{value}d</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={runProjection}
              disabled={loading || contractsSnapshot.length === 0 || bankroll <= 0}
            >
              {loading ? 'Projecting...' : 'Re-run Projection'}
            </button>
          </div>
        </div>

        {projectionData && (
          <>
            <div className="projection-event-summary">
              <div className="projection-event-card">
                <h4>Kelly Yellow Alert</h4>
                <p>{kellyEvent ? `Day ${kellyEvent.day} at Kelly Ratio ${kellyEvent.value.toFixed(4)}` : 'No Kelly yellow-zone alert within selected horizon.'}</p>
              </div>
              <div className="projection-event-card">
                <h4>Portfolio Crunch Breach</h4>
                <p>{crunchEvent ? `Day ${crunchEvent.day} at ${crunchEvent.value.toFixed(3)}` : 'No breach within selected horizon.'}</p>
              </div>
            </div>
            <div ref={chartRef} className="projection-chart"></div>
          </>
        )}
        {!projectionData && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <p>Loading projection...</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Component2
      heading="Option Contracts - Degradation Projection"
      onContractsChange={setContractsSnapshot}
      onAccountBalanceChange={setBankroll}
      visualizationRenderer={renderProjectionVisualization}
    />
  );
}
