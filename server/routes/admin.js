const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const requireApiKey = require('../middleware/requireApiKey');

// All admin routes require API key
router.use(requireApiKey);

// ── File upload setup ─────────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `blog-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only jpg, png, webp images allowed'));
  },
});

// ── LEADS ─────────────────────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const db = getDb();
  const leads = db.prepare(`
    SELECT id, first_name, last_name, phone, email, service, city, message,
           status, notes, created_at
    FROM leads ORDER BY created_at DESC
  `).all();
  res.json(leads);
});

router.patch('/leads/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const VALID_STATUSES = ['new', 'contacted', 'quoted', 'closed'];
  const { status, notes } = req.body;

  if (status && !VALID_STATUSES.includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  const db = getDb();
  const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  if (status !== undefined) db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  if (notes !== undefined)  db.prepare('UPDATE leads SET notes = ? WHERE id = ?').run(notes, id);

  res.json({ success: true });
});

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────
router.get('/appointments', (req, res) => {
  const db = getDb();
  const appts = db.prepare(`
    SELECT id, first_name, last_name, phone, email, service, city,
           preferred_date, preferred_time, message, status, created_at
    FROM appointments ORDER BY preferred_date ASC, preferred_time ASC
  `).all();
  res.json(appts);
});

router.patch('/appointments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  const db = getDb();
  const result = db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Appointment not found' });
  res.json({ success: true });
});

// ── BLOG ──────────────────────────────────────────────────────────────────────
router.get('/blog', (req, res) => {
  const db = getDb();
  const posts = db.prepare(`
    SELECT id, title, slug, excerpt, image_url, published, created_at
    FROM blog_posts ORDER BY created_at DESC
  `).all();
  res.json(posts);
});

router.post('/blog', upload.single('image'), (req, res) => {
  const { title, excerpt, content, published } = req.body;

  const errors = [];
  if (!title?.trim())   errors.push('title is required');
  if (!excerpt?.trim()) errors.push('excerpt is required');
  if (!content?.trim()) errors.push('content is required');
  if (errors.length > 0) return res.status(400).json({ errors });

  const slug = title.trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO blog_posts (title, slug, excerpt, content, image_url, published)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title.trim(), slug, excerpt.trim(), content.trim(), image_url, published === 'true' ? 1 : 0);

    res.status(201).json({ success: true, id: result.lastInsertRowid, slug });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Slug already exists — change the title slightly' });
    throw err;
  }
});

router.patch('/blog/:id', upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const db = getDb();
  const post = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { title, excerpt, content, published } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  if (title !== undefined)     db.prepare('UPDATE blog_posts SET title = ? WHERE id = ?').run(title.trim(), id);
  if (excerpt !== undefined)   db.prepare('UPDATE blog_posts SET excerpt = ? WHERE id = ?').run(excerpt.trim(), id);
  if (content !== undefined)   db.prepare('UPDATE blog_posts SET content = ? WHERE id = ?').run(content.trim(), id);
  if (published !== undefined) db.prepare('UPDATE blog_posts SET published = ? WHERE id = ?').run(published === 'true' ? 1 : 0, id);
  if (image_url !== undefined) db.prepare('UPDATE blog_posts SET image_url = ? WHERE id = ?').run(image_url, id);

  res.json({ success: true });
});

router.delete('/blog/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const db = getDb();
  const result = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Post not found' });
  res.json({ success: true });
});

module.exports = router;
