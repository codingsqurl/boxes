require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const { seedReviews } = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes — mounted before static so /api/* never hits the filesystem
app.use('/api/contact', require('./routes/contact'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/quote',   require('./routes/quote'));

// Serve the static site from project root
app.use(express.static(path.join(__dirname, '..')));

// Fallback: any unmatched GET serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

async function start() {
  initDb();
  await seedReviews();
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Tree Hoppers server running at http://127.0.0.1:${PORT}`);
  });
}

start();
