function Component2() {
  const [contracts, setContracts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ Ticker: '', Strike: '', Expiration: '' });

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
    setForm({ Ticker: '', Strike: '', Expiration: '' });
    fetchContracts();
  };

  const handleEdit = (contract) => {
    setEditingId(contract.id);
    setForm({ Ticker: contract.Ticker, Strike: contract.Strike, Expiration: contract.Expiration.split('T')[0] });
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
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ Ticker: '', Strike: '', Expiration: '' }); }}>Cancel</button>}
      </form>
      <ul>
        {contracts.map(contract => (
          <li key={contract.id}>
            {contract.Ticker} - {contract.Strike} - {new Date(contract.Expiration).toLocaleDateString()}
            <button onClick={() => handleEdit(contract)}>Edit</button>
            <button onClick={() => handleDelete(contract.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}