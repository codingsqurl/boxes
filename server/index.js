require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const cluster = require('cluster');
const os      = require('os');

// ── Cluster — one worker per CPU core ─────────────────────────────────────────
if (cluster.isPrimary) {
  const numWorkers = process.env.NODE_ENV === 'production' ? os.cpus().length : 1;
  console.log(`Primary ${process.pid} spawning ${numWorkers} worker(s)`);
  for (let i = 0; i < numWorkers; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} exited (${signal || code}) — respawning`);
    cluster.fork();
  });
  return; // primary does nothing else
}

// ── Worker ────────────────────────────────────────────────────────────────────
const express  = require('express');
const path     = require('path');
const helmet   = require('helmet');
const cors     = require('cors');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { initDb }      = require('./db');
const { seedReviews } = require('./seed');

const app  = express();
const PORT = process.env.PORT || 3000;

// Correct IP detection behind load balancers / reverse proxies
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://maps.googleapis.com', 'https://www.googletagmanager.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      mediaSrc:    ["'self'"],
      connectSrc:  ["'self'", 'https://maps.googleapis.com', 'https://www.google-analytics.com'],
      frameSrc:    ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS — lock to SITE_URL in production ────────────────────────────────────
const allowedOrigin = process.env.SITE_URL || null;
app.use(cors({
  origin: allowedOrigin
    ? (origin, cb) => (!origin || origin === allowedOrigin ? cb(null, true) : cb(new Error('CORS: origin not allowed')))
    : true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Request timeout — kill hung connections after 30s ────────────────────────
app.use((req, res, next) => {
  const t = setTimeout(() => {
    if (!res.headersSent) res.status(503).json({ error: 'Request timeout' });
  }, 30_000);
  res.on('finish', () => clearTimeout(t));
  res.on('close',  () => clearTimeout(t));
  next();
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 150,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Form submissions: 10 per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many submissions, please try again later.' },
});

// Login brute-force: 10 failed attempts per 15 min per IP, then locked out
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Admin API: generous but bounded
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

// ── In-memory response cache for hot public routes ───────────────────────────
const responseCache = new Map();

function cacheFor(ttlMs) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const hit = responseCache.get(key);
    if (hit && Date.now() - hit.ts < ttlMs) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(hit.data);
    }
    const origJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) responseCache.set(key, { data, ts: Date.now() });
      return origJson(data);
    };
    next();
  };
}

// ── API routes ────────────────────────────────────────────────────────────────
// Login gets its own brute-force limiter on top of the admin limiter
app.use('/api/admin/login',    loginLimiter);
app.use('/api/contact',        apiLimiter, contactLimiter, require('./routes/contact'));
app.use('/api/schedule',       apiLimiter, contactLimiter, require('./routes/schedule'));
app.use('/api/verify',         apiLimiter,                require('./routes/verify'));
app.use('/api/reviews',        apiLimiter, cacheFor(5 * 60_000),        require('./routes/reviews'));
app.use('/api/quote',          apiLimiter,                               require('./routes/quote'));
app.use('/api/blog',           apiLimiter, cacheFor(2 * 60_000),        require('./routes/blog'));
app.use('/api/google-reviews', apiLimiter, cacheFor(24 * 60 * 60_000),  require('./routes/google-reviews'));
app.use('/api/admin',          adminLimiter,                             require('./routes/admin'));

// ── Uploaded blog images ──────────────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'data', 'uploads');
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

// ── Static files with aggressive caching ─────────────────────────────────────
app.use('/css',      express.static(path.join(__dirname, '..', 'css'),      { maxAge: '1y', immutable: true }));
app.use('/js',       express.static(path.join(__dirname, '..', 'js'),       { maxAge: '1y', immutable: true }));
app.use('/icons',    express.static(path.join(__dirname, '..', 'icons'),    { maxAge: '1y', immutable: true }));
app.use('/pictures', express.static(path.join(__dirname, '..', 'pictures'), { maxAge: '1y', immutable: true }));
app.use('/pages',    express.static(path.join(__dirname, '..', 'pages'),    { maxAge: 0 }));
app.use(express.static(path.join(__dirname, '..'), { maxAge: 0 }));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
let server;

async function start() {
  initDb();
  // Only worker 1 seeds to avoid concurrent DB writes at startup
  if (cluster.worker.id === 1) await seedReviews();

  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Worker ${process.pid} listening on :${PORT}`);
  });

  // Tune keep-alive for high-traffic — must exceed load balancer timeout (typically 60s)
  server.keepAliveTimeout = 65_000;
  server.headersTimeout   = 66_000;
}

function shutdown(signal) {
  console.log(`Worker ${process.pid}: ${signal} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();
