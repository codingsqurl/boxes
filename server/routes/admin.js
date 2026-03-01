const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { requireApiKey, requireDeveloper } = require('../middleware/auth');

// ── First-time setup ──────────────────────────────────────────────────────────
router.get('/setup', (req, res) => {
  const db = getDb();
  const { n } = db.prepare('SELECT COUNT(*) as n FROM admin_users').get();
  res.json({ needsSetup: n === 0 });
});

router.post('/setup', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const { n } = db.prepare('SELECT COUNT(*) as n FROM admin_users').get();
  if (n > 0) return res.status(403).json({ error: 'Setup already complete' });

  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'developer')`)
    .run(username.trim(), hash);
  res.status(201).json({ ok: true });
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db = getDb();
  const user = db.prepare(`SELECT * FROM admin_users WHERE username = ?`).get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const apiKey = user.role === 'developer'
    ? process.env.DEVELOPER_API_KEY
    : process.env.ADMIN_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API keys not configured in .env' });

  res.json({ apiKey, role: user.role, username: user.username });
});

// ── User management (developer only) ─────────────────────────────────────────
router.get('/users', requireDeveloper, (req, res) => {
  const db = getDb();
  const users = db.prepare(`SELECT id, username, role, created_at FROM admin_users ORDER BY created_at ASC`).all();
  res.json(users);
});

router.post('/users', requireDeveloper, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!['admin', 'developer'].includes(role)) return res.status(400).json({ error: 'Role must be admin or developer' });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 12);
  try {
    const result = db.prepare(`INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)`).run(username, hash, role);
    res.status(201).json({ id: result.lastInsertRowid, username, role });
  } catch {
    res.status(409).json({ error: 'Username already exists' });
  }
});

router.delete('/users/:id', requireDeveloper, (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT * FROM admin_users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'developer') return res.status(403).json({ error: 'Cannot delete a developer account' });
  db.prepare(`DELETE FROM admin_users WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

router.patch('/users/:id/password', requireDeveloper, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password required' });
  const db = getDb();
  const user = db.prepare(`SELECT id FROM admin_users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`UPDATE admin_users SET password_hash = ? WHERE id = ?`).run(hash, req.params.id);
  res.json({ ok: true });
});

// All other admin routes require API key
router.use(requireApiKey);

// ── Change own password ───────────────────────────────────────────────────────
router.patch('/me/password', (req, res) => {
  const { username, currentPassword, newPassword } = req.body || {};
  if (!username || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'username, currentPassword, and newPassword are required' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const db   = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

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

function deleteImageFile(imageUrl) {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  const filepath = path.join(uploadDir, filename);
  fs.unlink(filepath, err => {
    if (err && err.code !== 'ENOENT') console.error('[admin] Failed to delete image:', err.message);
  });
}

// ── LEADS ─────────────────────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const db = getDb();
  const leads = db.prepare(`
    SELECT id, first_name, last_name, phone, email, service, city, message,
           status, notes, email_verified, created_at
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
           preferred_date, preferred_time, message, status, email_verified, created_at
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
  const post = db.prepare('SELECT id, image_url FROM blog_posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const { title, excerpt, content, published } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  // Delete old image from disk when a new one is uploaded
  if (image_url && post.image_url) deleteImageFile(post.image_url);

  if (title !== undefined)     db.prepare('UPDATE blog_posts SET title = ? WHERE id = ?').run(title.trim(), id);
  if (excerpt !== undefined)   db.prepare('UPDATE blog_posts SET excerpt = ? WHERE id = ?').run(excerpt.trim(), id);
  if (content !== undefined)   db.prepare('UPDATE blog_posts SET content = ? WHERE id = ?').run(content.trim(), id);
  if (published !== undefined) db.prepare('UPDATE blog_posts SET published = ? WHERE id = ?').run(published === 'true' ? 1 : 0, id);
  if (image_url !== undefined) db.prepare('UPDATE blog_posts SET image_url = ? WHERE id = ?').run(image_url, id);

  res.json({ success: true });
});

// ── EMAIL TEMPLATES (developer only) ─────────────────────────────────────────
router.get('/templates', requireDeveloper, (req, res) => {
  const db = getDb();
  const templates = db.prepare(
    'SELECT key, label, subject, body, updated_at FROM email_templates ORDER BY key ASC'
  ).all();
  res.json(templates);
});

router.patch('/templates/:key', requireDeveloper, (req, res) => {
  const { subject, body } = req.body || {};
  if (!subject?.trim()) return res.status(400).json({ error: 'Subject is required' });
  if (!body?.trim())    return res.status(400).json({ error: 'Body is required' });

  const db = getDb();
  const tpl = db.prepare('SELECT key FROM email_templates WHERE key = ?').get(req.params.key);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  db.prepare(
    `UPDATE email_templates SET subject = ?, body = ?, updated_at = datetime('now') WHERE key = ?`
  ).run(subject.trim(), body.trim(), req.params.key);

  res.json({ success: true });
});

// ── SUGGESTIONS ───────────────────────────────────────────────────────────────
// Any logged-in user can submit
router.post('/suggestions', (req, res) => {
  const { message, username } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (message.trim().length > 1000) return res.status(400).json({ error: 'Message must be under 1000 characters' });

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO suggestions (username, message) VALUES (?, ?)'
  ).run((username || 'unknown').trim(), message.trim());

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// Only developer can read and dismiss suggestions
router.get('/suggestions', requireDeveloper, (req, res) => {
  const db = getDb();
  const suggestions = db.prepare(
    'SELECT id, username, message, created_at FROM suggestions ORDER BY created_at DESC'
  ).all();
  res.json(suggestions);
});

router.delete('/suggestions/:id', requireDeveloper, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const db = getDb();
  const result = db.prepare('DELETE FROM suggestions WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Suggestion not found' });
  res.json({ ok: true });
});

router.delete('/blog/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const db = getDb();
  const post = db.prepare('SELECT image_url FROM blog_posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(id);
  deleteImageFile(post.image_url);

  res.json({ success: true });
});

module.exports = router;
