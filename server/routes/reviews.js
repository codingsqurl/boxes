const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const requireApiKey = require('../middleware/requireApiKey');

// GET /api/reviews — public
router.get('/', (req, res) => {
  const db = getDb();
  const reviews = db.prepare(
    'SELECT id, author, rating, text, date, source FROM reviews ORDER BY id ASC'
  ).all();
  res.json(reviews);
});

// POST /api/reviews — admin only
router.post('/', requireApiKey, (req, res) => {
  const { author, rating, text, date, source } = req.body;

  const errors = [];
  if (!author?.trim())  errors.push('author is required');
  if (!text?.trim())    errors.push('text is required');
  if (!date?.trim())    errors.push('date is required');
  if (!source?.trim())  errors.push('source is required');
  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) errors.push('rating must be 1-5');

  if (errors.length > 0) return res.status(400).json({ errors });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO reviews (author, rating, text, date, source) VALUES (?, ?, ?, ?, ?)'
  ).run(author.trim(), ratingNum, text.trim(), date.trim(), source.trim());

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// DELETE /api/reviews/:id — admin only
router.delete('/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const db = getDb();
  const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(id);

  if (result.changes === 0) return res.status(404).json({ error: 'Review not found' });
  res.json({ success: true });
});

module.exports = router;
