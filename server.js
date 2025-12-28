const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = process.env.DB_PATH;
const db = new sqlite3.Database(dbPath);

// Create table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS optioncontracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Ticker TEXT NOT NULL,
    Strike REAL NOT NULL,
    Expiration TEXT NOT NULL,
    IV REAL,
    StockPrice REAL,
    Delta REAL,
    Gamma REAL,
    Theta REAL,
    Rho REAL,
    CurrentOptionPrice REAL,
    PurchaseOptionPrice REAL
  )`);
  // Add columns if they don't exist
  const columns = ['IV', 'StockPrice', 'Delta', 'Gamma', 'Theta', 'Rho', 'CurrentOptionPrice', 'PurchaseOptionPrice'];
  columns.forEach(col => {
    db.run(`ALTER TABLE optioncontracts ADD COLUMN ${col} REAL`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding column ${col}:`, err);
      }
    });
  });
});

app.get('/api/optioncontracts', (req, res) => {
  db.all('SELECT * FROM optioncontracts', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/optioncontracts', (req, res) => {
  const { Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice } = req.body;
  db.run('INSERT INTO optioncontracts (Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice });
  });
});

app.put('/api/optioncontracts/:id', (req, res) => {
  const id = req.params.id;
  const { Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice } = req.body;
  db.run('UPDATE optioncontracts SET Ticker = ?, Strike = ?, Expiration = ?, IV = ?, StockPrice = ?, Delta = ?, Gamma = ?, Theta = ?, Rho = ?, CurrentOptionPrice = ?, PurchaseOptionPrice = ? WHERE id = ?', [Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ id, Ticker, Strike, Expiration, IV, StockPrice, Delta, Gamma, Theta, Rho, CurrentOptionPrice, PurchaseOptionPrice });
  });
});

app.delete('/api/optioncontracts/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM optioncontracts WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted' });
  });
});

app.post('/api/refresh-contracts', async (req, res) => {
  try {
    const contracts = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM optioncontracts', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log('Refreshing', contracts.length, 'contracts');
    for (const contract of contracts) {
      console.log('Updating contract:', contract);
      try {
        await updateContractWithAPI(contract);
      } catch (err) {
        console.error('Failed to update contract', contract.id, err.message);
      }
    }
    res.json({ message: 'Refreshed' });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function updateContractWithAPI(contract) {
  const { Ticker, Strike, Expiration } = contract;
  console.log('Key set:', !!process.env.ALPACA_KEY, 'Secret set:', !!process.env.ALPACA_SECRET);
  // Use Expiration directly as it's already YYYY-MM-DD
  const fixedDate = Expiration;
  const url2 = `https://data.alpaca.markets/v2/stocks/${Ticker}/bars/latest`;
  const url = `https://data.alpaca.markets/v1beta1/options/snapshots/${Ticker}?feed=indicative&limit=1&strike_price_gte=${Strike}&strike_price_lte=${Strike}&expiration_date=${fixedDate}`;
  console.log('Fetching:', url);
  const auth = Buffer.from(`${process.env.ALPACA_KEY}:${process.env.ALPACA_SECRET}`).toString('base64');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  console.log('Response status:', response.status);
  if (!response.ok) {
    const text = await response.text();
    console.log('Response text:', text);
    throw new Error(`API error for ${Ticker}: ${response.status}`);
  }
  const data = await response.json();
  console.log('API data:', JSON.stringify(data, null, 2));
  // For data API, snapshots is an object
  const snap = Object.values(data.snapshots)[0];
  if (!snap) {
    throw new Error(`No snapshot for ${Ticker}`);
  }
  console.log('Snapshot:', snap);
  const iv = snap.impliedVolatility;
  const delta = snap.greeks.delta;
  const gamma = snap.greeks.gamma;
  const theta = snap.greeks.theta;
  const rho = snap.greeks.rho;
  const currentPrice = (snap.latestQuote.bp + snap.latestQuote.ap) / 2;
  const response2 = await fetch(url2, {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  const data2 = await response2.json();
  const stockPrice = data2.bar.vw;
  console.log('Stock price for', Ticker, 'is', stockPrice);
  

  console.log('Updating with:', { iv, delta, gamma, theta, rho, currentPrice, stockPrice });
  return new Promise((resolve, reject) => {
    db.run('UPDATE optioncontracts SET IV = ?, Delta = ?, Gamma = ?, Theta = ?, Rho = ?, CurrentOptionPrice = ?, StockPrice = ? WHERE id = ?', [iv, delta, gamma, theta, rho, currentPrice, stockPrice, contract.id], function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

app.listen(3000, () => console.log('Server running on port 3000'));