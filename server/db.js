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
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
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
      text       TEXT    NOT NULL,
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
  `);

  // Migrate existing leads table if status/notes columns are missing
  try { db.exec(`ALTER TABLE leads ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`); } catch {}
  try { db.exec(`ALTER TABLE leads ADD COLUMN notes TEXT`); } catch {}

  console.log('Database initialized');
}

module.exports = { getDb, initDb };
