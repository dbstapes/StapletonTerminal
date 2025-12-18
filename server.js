const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let optionContracts = [];
let idCounter = 1;

app.get('/api/optioncontracts', (req, res) => {
  res.json(optionContracts);
});

app.post('/api/optioncontracts', (req, res) => {
  const { Ticker, Strike, Expiration } = req.body;
  const newContract = { id: idCounter++, Ticker, Strike: Number(Strike), Expiration: new Date(Expiration) };
  optionContracts.push(newContract);
  res.json(newContract);
});

app.put('/api/optioncontracts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { Ticker, Strike, Expiration } = req.body;
  const contract = optionContracts.find(c => c.id === id);
  if (contract) {
    contract.Ticker = Ticker;
    contract.Strike = Number(Strike);
    contract.Expiration = new Date(Expiration);
    res.json(contract);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/optioncontracts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = optionContracts.findIndex(c => c.id === id);
  if (index !== -1) {
    optionContracts.splice(index, 1);
    res.json({ message: 'Deleted' });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));