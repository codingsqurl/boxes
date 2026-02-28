const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tree-hoppers.db');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);

    // ── Performance & durability pragmas ──────────────────────────────────────
    db.pragma('journal_mode = WAL');       // Concurrent reads + one writer
    db.pragma('foreign_keys = ON');        // Enforce referential integrity
    db.pragma('cache_size = -32000');      // 32MB page cache per connection
    db.pragma('mmap_size = 268435456');    // 256MB memory-mapped I/O
    db.pragma('synchronous = NORMAL');     // Safe with WAL, far faster than FULL
    db.pragma('temp_store = MEMORY');      // Keep temp tables in RAM
    db.pragma('busy_timeout = 5000');      // Wait 5s on write lock before erroring
    db.pragma('wal_autocheckpoint = 1000');// Checkpoint WAL every 1000 pages
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name  TEXT    NOT NULL,
      last_name   TEXT    NOT NULL,
      phone       TEXT    NOT NULL,
      email       TEXT    NOT NULL,
      service     TEXT    NOT NULL,
      city        TEXT    NOT NULL,
      message     TEXT,
      status      TEXT    NOT NULL DEFAULT 'new',
      notes       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author     TEXT    NOT NULL,
      rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      text       TEXT    NOT NULL CHECK(length(text) <= 2000),
      date       TEXT    NOT NULL,
      source     TEXT    NOT NULL,
      seeded     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seed_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name     TEXT NOT NULL,
      last_name      TEXT NOT NULL,
      phone          TEXT NOT NULL,
      email          TEXT NOT NULL,
      service        TEXT NOT NULL,
      city           TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      message        TEXT,
      status         TEXT NOT NULL DEFAULT 'pending',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      excerpt    TEXT NOT NULL,
      content    TEXT NOT NULL,
      image_url  TEXT,
      published  INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS google_reviews_cache (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      data      TEXT NOT NULL,
      cached_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'admin',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      key        TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      subject    TEXT NOT NULL,
      body       TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Indexes for fast queries under load ──────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_email    ON leads(email);

    CREATE INDEX IF NOT EXISTS idx_appts_date     ON appointments(preferred_date, preferred_time);
    CREATE INDEX IF NOT EXISTS idx_appts_status   ON appointments(status);

    CREATE INDEX IF NOT EXISTS idx_blog_slug      ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published, created_at DESC);

    CREATE TABLE IF NOT EXISTS email_verifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      token      TEXT    NOT NULL UNIQUE,
      type       TEXT    NOT NULL CHECK(type IN ('lead', 'appointment')),
      record_id  INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      used_at    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_verify_token ON email_verifications(token);
  `);

  // Migrate existing tables — ALTER TABLE is a no-op if column already exists
  try { db.exec(`ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`); } catch {}
  try { db.exec(`ALTER TABLE leads ADD COLUMN notes TEXT`); } catch {}
  try { db.exec(`ALTER TABLE leads ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { db.exec(`ALTER TABLE appointments ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`); } catch {}

  // Seed default email templates if not already present
  const defaultTemplates = [
    {
      key: 'quote_confirmation',
      label: 'Quote Request — Customer Confirmation',
      subject: `We got your request — Tree Hoppers`,
      body: `Hi {{firstName}},

Thanks for reaching out to Tree Hoppers! We've received your request and will be in touch within 24 hours.

Here's what you submitted:
  Service: {{service}}
  City:    {{city}}

If you need to reach us sooner:
  Call/Text: {{contactPhone}}
  Email:     {{contactEmail}}

Talk soon,
Paul & the Tree Hoppers crew`,
    },
    {
      key: 'appointment_confirmation',
      label: 'Appointment — Customer Confirmation',
      subject: `Appointment Confirmed — Tree Hoppers`,
      body: `Hi {{firstName}},

Your estimate appointment with Tree Hoppers has been scheduled!

  Service: {{service}}
  Date:    {{date}}
  Time:    {{time}}
  City:    {{city}}

We'll call you the day before to confirm. If you need to reschedule:
  Call/Text: {{contactPhone}}
  Email:     {{contactEmail}}

See you soon,
Paul & the Tree Hoppers crew`,
    },
    {
      key: 'email_verification',
      label: 'Email Verification — Confirm Your Address',
      subject: `Confirm your email — Tree Hoppers`,
      body: `Hi {{firstName}},

Thanks for reaching out to Tree Hoppers! One quick step — please confirm your email address by clicking the link below:

{{verifyLink}}

This link expires in 24 hours.

Once confirmed, you'll receive a full copy of your request details and we'll be in touch within 24 hours to discuss your project.

If you didn't contact Tree Hoppers, you can safely ignore this email.

— Paul & the Tree Hoppers crew`,
    },
  ];

  const insertTpl = db.prepare(
    `INSERT OR IGNORE INTO email_templates (key, label, subject, body) VALUES (?, ?, ?, ?)`
  );
  for (const t of defaultTemplates) {
    insertTpl.run(t.key, t.label, t.subject, t.body);
  }

  // Seed developer account from env if no developer exists yet
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const existing = db.prepare(`SELECT id FROM admin_users WHERE role = 'developer'`).get();
    if (!existing) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
      db.prepare(`INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, 'developer')`)
        .run(ADMIN_USERNAME, hash);
      console.log(`Developer account seeded for: ${ADMIN_USERNAME}`);
    }
  }

  console.log(`[db] Worker ${process.pid} initialized`);
}

module.exports = { getDb, initDb };
