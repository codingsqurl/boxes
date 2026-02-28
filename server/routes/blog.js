const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/blog — all published posts, with optional pagination
router.get('/', (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  const db = getDb();
  const posts = db.prepare(`
    SELECT id, title, slug, excerpt, image_url, created_at
    FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json(posts);
});

// GET /api/blog/:slug — single post
router.get('/:slug', (req, res) => {
  const db = getDb();
  const post = db.prepare(`
    SELECT id, title, slug, excerpt, content, image_url, created_at
    FROM blog_posts WHERE slug = ? AND published = 1
  `).get(req.params.slug);

  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

module.exports = router;
