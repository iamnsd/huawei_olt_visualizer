const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('ont.db');

app.use(cors());
app.use(express.json());

// Эндпоинт для поиска
app.get('/search', (req, res) => {
    const query = req.query.q || '';
    db.all("SELECT id, desc FROM ont WHERE desc LIKE ?", [`%${query}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Эндпоинт для получения деталей ONT
app.get('/ont/:id', (req, res) => {
    const ontId = req.params.id;
    db.get("SELECT * FROM ont WHERE id = ?", [ontId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

app.listen(5000, () => console.log('Server running on port 5000'));
