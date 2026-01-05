function Component2() {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({ Ticker: '', Strike: '', Expiration: '', PurchaseOptionPrice: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [accountBalance, setAccountBalance] = useState(0);
  const [weightedDelta, setWeightedDelta] = useState(0);
  const [weightedLeverage, setWeightedLeverage] = useState(0);
  const [kellyFraction, setKellyFraction] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [kellyRatio, setKellyRatio] = useState(0);

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    calculateKelly();
  }, [contracts, accountBalance]);

  const calculateKelly = () => {
    if (contracts.length === 0) return;

    const totalPurchasePrice = contracts.reduce((sum, contract) => sum + (parseFloat(contract.PurchaseOptionPrice) || 0), 0);

    if (totalPurchasePrice === 0) return;

    let weightedDeltaSum = 0;
    let weightedLeverageSum = 0;
    let totalCurrentValue = 0;

    contracts.forEach(contract => {
      const purchasePrice = parseFloat(contract.PurchaseOptionPrice) || 0;
      const weight = purchasePrice / totalPurchasePrice;
      const delta = parseFloat(contract.Delta) || 0;
      const stockPrice = parseFloat(contract.StockPrice) || 0;
      const currentOptionPrice = parseFloat(contract.CurrentOptionPrice) || 0;

      weightedDeltaSum += weight * delta;

      if (currentOptionPrice > 0) {
        const leverage = stockPrice / currentOptionPrice;
        weightedLeverageSum += weight * leverage;
      }

      totalCurrentValue += currentOptionPrice * 100;
    });

    const kelly = weightedDeltaSum - ((1 - weightedDeltaSum) / weightedLeverageSum);

    const currValue = accountBalance > 0 ? totalCurrentValue / accountBalance : 0;
    const ratio = kelly !== 0 ? currValue / kelly : 0;

    setWeightedDelta(weightedDeltaSum);
    setWeightedLeverage(weightedLeverageSum);
    setKellyFraction(kelly);
    setCurrentValue(currValue);
    setKellyRatio(ratio);
  };

  const fetchContracts = async () => {
    const response = await fetch('http://localhost:3000/api/optioncontracts');
    const data = await response.json();
    setContracts(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:3000/api/optioncontracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    // Refresh data after adding new contract
    await handleRefresh();
    setForm({ Ticker: '', Strike: '', Expiration: '', PurchaseOptionPrice: '' });
  };

  const handleEdit = (contract) => {
    setEditingId(contract.id);
    setForm({ 
      Ticker: contract.Ticker, 
      Strike: contract.Strike, 
      Expiration: contract.Expiration,
      PurchaseOptionPrice: contract.PurchaseOptionPrice || ''
    });
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:3000/api/optioncontracts/${id}`, { method: 'DELETE' });
    fetchContracts();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('http://localhost:3000/api/refresh-contracts', { method: 'POST' });
      fetchContracts();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <h2>Option Contracts</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>Account Balance: $</label>
        <input 
          type="number" 
          step="0.01" 
          value={accountBalance} 
          onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
        />
      </div>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Ticker" value={form.Ticker} onChange={(e) => setForm({...form, Ticker: e.target.value.toUpperCase()})} required />
        <input type="number" placeholder="Strike" value={form.Strike} onChange={(e) => setForm({...form, Strike: e.target.value})} required />
        <input type="date" value={form.Expiration} onChange={(e) => setForm({...form, Expiration: e.target.value})} required />
        <input type="number" step="0.01" placeholder="Purchase Option Price" value={form.PurchaseOptionPrice} onChange={(e) => setForm({...form, PurchaseOptionPrice: e.target.value})} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {contracts.map(contract => (
          <li key={contract.id}>
            <div className="contract-info">
              {contract.Ticker} - Strike: {contract.Strike} - Exp: {contract.Expiration} - Purchase: {contract.PurchaseOptionPrice} - Delta: {contract.Delta} - Current Price: {contract.CurrentOptionPrice}
            </div>
            <button onClick={() => handleDelete(contract.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <div className="calculations">
        <h3>Kelly Criterion Calculations</h3>
        <p>Weighted Portfolio Delta: {weightedDelta.toFixed(4)}</p>
        <p>Weighted Portfolio Leverage: {weightedLeverage.toFixed(4)}</p>
        <p>Kelly Fraction: {kellyFraction.toFixed(4)}</p>
        <p>Current Value (Total Contract Value / Account Balance): {currentValue.toFixed(4)}</p>
        <p>Kelly Ratio (Current Value / Kelly Fraction): {kellyRatio.toFixed(4)}</p>
      </div>
      <button onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh Data'}</button>
    </div>
  );
}