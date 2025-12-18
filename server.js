const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

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
    Expiration TEXT NOT NULL
  )`);
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
  const { Ticker, Strike, Expiration } = req.body;
  db.run('INSERT INTO optioncontracts (Ticker, Strike, Expiration) VALUES (?, ?, ?)', [Ticker, Strike, Expiration], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, Ticker, Strike, Expiration });
  });
});

app.put('/api/optioncontracts/:id', (req, res) => {
  const id = req.params.id;
  const { Ticker, Strike, Expiration } = req.body;
  db.run('UPDATE optioncontracts SET Ticker = ?, Strike = ?, Expiration = ? WHERE id = ?', [Ticker, Strike, Expiration, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ id, Ticker, Strike, Expiration });
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

app.listen(3000, () => console.log('Server running on port 3000'));