function Component2() {
  const [contracts, setContracts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ Ticker: '', Strike: '', Expiration: '', IV: '', StockPrice: '', Delta: '', Gamma: '', Theta: '', Rho: '', CurrentOptionPrice: '', PurchaseOptionPrice: '' });

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
    }
    setForm({ Ticker: '', Strike: '', Expiration: '', IV: '', StockPrice: '', Delta: '', Gamma: '', Theta: '', Rho: '', CurrentOptionPrice: '', PurchaseOptionPrice: '' });
    fetchContracts();
  };

  const handleEdit = (contract) => {
    setEditingId(contract.id);
    setForm({ 
      Ticker: contract.Ticker, 
      Strike: contract.Strike, 
      Expiration: contract.Expiration.split('T')[0],
      IV: contract.IV || '',
      StockPrice: contract.StockPrice || '',
      Delta: contract.Delta || '',
      Gamma: contract.Gamma || '',
      Theta: contract.Theta || '',
      Rho: contract.Rho || '',
      CurrentOptionPrice: contract.CurrentOptionPrice || '',
      PurchaseOptionPrice: contract.PurchaseOptionPrice || ''
    });
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:3000/api/optioncontracts/${id}`, { method: 'DELETE' });
    fetchContracts();
  };

  return (
    <div>
      <h2>Option Contracts</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Ticker" value={form.Ticker} onChange={(e) => setForm({...form, Ticker: e.target.value})} required />
        <input type="number" placeholder="Strike" value={form.Strike} onChange={(e) => setForm({...form, Strike: e.target.value})} required />
        <input type="date" value={form.Expiration} onChange={(e) => setForm({...form, Expiration: e.target.value})} required />
        <input type="number" step="0.01" placeholder="IV" value={form.IV} onChange={(e) => setForm({...form, IV: e.target.value})} />
        <input type="number" step="0.01" placeholder="Stock Price" value={form.StockPrice} onChange={(e) => setForm({...form, StockPrice: e.target.value})} />
        <input type="number" step="0.01" placeholder="Delta" value={form.Delta} onChange={(e) => setForm({...form, Delta: e.target.value})} />
        <input type="number" step="0.01" placeholder="Gamma" value={form.Gamma} onChange={(e) => setForm({...form, Gamma: e.target.value})} />
        <input type="number" step="0.01" placeholder="Theta" value={form.Theta} onChange={(e) => setForm({...form, Theta: e.target.value})} />
        <input type="number" step="0.01" placeholder="Rho" value={form.Rho} onChange={(e) => setForm({...form, Rho: e.target.value})} />
        <input type="number" step="0.01" placeholder="Current Option Price" value={form.CurrentOptionPrice} onChange={(e) => setForm({...form, CurrentOptionPrice: e.target.value})} />
        <input type="number" step="0.01" placeholder="Purchase Option Price" value={form.PurchaseOptionPrice} onChange={(e) => setForm({...form, PurchaseOptionPrice: e.target.value})} />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ Ticker: '', Strike: '', Expiration: '', IV: '', StockPrice: '', Delta: '', Gamma: '', Theta: '', Rho: '', CurrentOptionPrice: '', PurchaseOptionPrice: '' }); }}>Cancel</button>}
      </form>
      <ul>
        {contracts.map(contract => (
          <li key={contract.id}>
            <div>{contract.Ticker} - Strike: {contract.Strike} - Exp: {new Date(contract.Expiration).toLocaleDateString()}</div>
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
    </div>
  );
}