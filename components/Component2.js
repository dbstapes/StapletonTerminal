function Component2() {
  const [contracts, setContracts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ Ticker: '', Strike: '', Expiration: '', PurchaseOptionPrice: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const response = await fetch('http://localhost:3000/api/optioncontracts');
    const data = await response.json();
    setContracts(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await fetch(`http://localhost:3000/api/optioncontracts/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setEditingId(null);
    } else {
      await fetch('http://localhost:3000/api/optioncontracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      // Refresh data after adding new contract
      await handleRefresh();
      return;
    }
    setForm({ Ticker: '', Strike: '', Expiration: '', PurchaseOptionPrice: '' });
    fetchContracts();
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
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Ticker" value={form.Ticker} onChange={(e) => setForm({...form, Ticker: e.target.value.toUpperCase()})} required />
        <input type="number" placeholder="Strike" value={form.Strike} onChange={(e) => setForm({...form, Strike: e.target.value})} required />
        <input type="date" value={form.Expiration} onChange={(e) => setForm({...form, Expiration: e.target.value})} required />
        <input type="number" step="0.01" placeholder="Purchase Option Price" value={form.PurchaseOptionPrice} onChange={(e) => setForm({...form, PurchaseOptionPrice: e.target.value})} />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ Ticker: '', Strike: '', Expiration: '', PurchaseOptionPrice: '' }); }}>Cancel</button>}
      </form>
      <ul>
        {contracts.map(contract => (
          <li key={contract.id}>
            <div>{contract.Ticker} - Strike: {contract.Strike} - Exp: {contract.Expiration}</div>
            {contract.IV && <div>IV: {contract.IV}</div>}
            {contract.StockPrice && <div>Stock Price: {contract.StockPrice}</div>}
            {contract.Delta && <div>Delta: {contract.Delta}</div>}
            {contract.Gamma && <div>Gamma: {contract.Gamma}</div>}
            {contract.Theta && <div>Theta: {contract.Theta}</div>}
            {contract.Rho && <div>Rho: {contract.Rho}</div>}
            {contract.CurrentOptionPrice && <div>Current Option Price: {contract.CurrentOptionPrice}</div>}
            {contract.PurchaseOptionPrice && <div>Purchase Option Price: {contract.PurchaseOptionPrice}</div>}
            <button onClick={() => handleEdit(contract)}>Edit</button>
            <button onClick={() => handleDelete(contract.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <button onClick={handleRefresh} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh Data'}</button>
    </div>
  );
}