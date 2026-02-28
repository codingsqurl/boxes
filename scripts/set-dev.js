#!/usr/bin/env node
/**
 * Create or update the developer account.
 *
 * Usage:
 *   node scripts/set-dev.js <username> <password>
 *
 * Examples:
 *   node scripts/set-dev.js codingsqurl "MyStr0ngP@ss!"
 *
 * • If a developer account already exists, its username and password are updated.
 * • If no developer account exists, one is created.
 * • Run this once after first clone or any time you need to reset credentials.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path   = require('path');
const fs     = require('fs');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('');
  console.error('  Usage: node scripts/set-dev.js <username> <password>');
  console.error('');
  console.error('  Example:');
  console.error('    node scripts/set-dev.js codingsqurl "MyStr0ngP@ss!"');
  console.error('');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tree-hoppers.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure the table exists (safe to run before server has ever booted)
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const hash = bcrypt.hashSync(password, 12);

const existing = db.prepare(`SELECT id, username FROM admin_users WHERE role = 'developer'`).get();

if (existing) {
  db.prepare(`UPDATE admin_users SET username = ?, password_hash = ? WHERE id = ?`)
    .run(username, hash, existing.id);
  console.log(`Developer account updated: "${existing.username}" → "${username}"`);
} else {
  db.prepare(`INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'developer')`)
    .run(username, hash);
  console.log(`Developer account created: "${username}"`);
}

db.close();
console.log('Done. Start the server and log in with these credentials.');
