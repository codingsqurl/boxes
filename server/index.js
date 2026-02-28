require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const { seedReviews } = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
        'https://fonts.googleapis.com',
        'https://maps.googleapis.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://maps.gstatic.com', 'https://maps.googleapis.com'],
      mediaSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
        'https://maps.googleapis.com',
      ],
      frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Gzip all responses ────────────────────────────────────────────────────────
app.use(compression());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later.' },
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/contact',        apiLimiter, contactLimiter, require('./routes/contact'));
app.use('/api/schedule',       apiLimiter, require('./routes/schedule'));
app.use('/api/reviews',        apiLimiter, require('./routes/reviews'));
app.use('/api/quote',          apiLimiter, require('./routes/quote'));
app.use('/api/blog',           apiLimiter, require('./routes/blog'));
app.use('/api/google-reviews', apiLimiter, require('./routes/google-reviews'));
app.use('/api/admin',          apiLimiter, require('./routes/admin'));

// ── Uploaded blog images ──────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'data', 'uploads');
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

// ── Static files with caching ─────────────────────────────────────────────────
app.use('/css',      express.static(path.join(__dirname, '..', 'css'),      { maxAge: '1y', immutable: true }));
app.use('/js',       express.static(path.join(__dirname, '..', 'js'),       { maxAge: '1y', immutable: true }));
app.use('/icons',    express.static(path.join(__dirname, '..', 'icons'),    { maxAge: '1y', immutable: true }));
app.use('/pictures', express.static(path.join(__dirname, '..', 'pictures'), { maxAge: '1y', immutable: true }));
app.use('/pages',    express.static(path.join(__dirname, '..', 'pages'),    { maxAge: 0 }));

// HTML and root — no cache
app.use(express.static(path.join(__dirname, '..'), { maxAge: 0 }));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
let server;

async function start() {
  initDb();
  await seedReviews();
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tree Hoppers server running at http://0.0.0.0:${PORT}`);
  });
}

function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(() => { console.log('Server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();
