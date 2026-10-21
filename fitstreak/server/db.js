import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..');
export const DATA_DIR = path.join(APP_ROOT, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const DEFAULT_DB_PATH = path.join(DATA_DIR, 'fitstreak.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  program_id TEXT,
  schedule TEXT,
  best_streak INTEGER NOT NULL DEFAULT 0,
  sub_status TEXT NOT NULL DEFAULT 'unpaid',
  cycle_start TEXT,
  cycle_end TEXT,
  cycle_number INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS subscription_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  completion_rate REAL NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subhist_user ON subscription_history(user_id);
CREATE TABLE IF NOT EXISTS workout_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  day_id TEXT NOT NULL,
  program_id TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  sets_done INTEGER NOT NULL DEFAULT 0,
  total_volume REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, date, day_id)
);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON workout_logs(user_id, date);
CREATE TABLE IF NOT EXISTS workout_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  reps REAL,
  weight REAL,
  done INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sets_log ON workout_sets(log_id);
CREATE TABLE IF NOT EXISTS body_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  body_fat REAL,
  waist REAL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_body_user ON body_logs(user_id, date);
CREATE TABLE IF NOT EXISTS flex_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  image_file TEXT,
  workout_log_id INTEGER REFERENCES workout_logs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS flex_likes (
  post_id INTEGER NOT NULL REFERENCES flex_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threads_cat ON threads(category);
CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_replies_thread ON replies(thread_id);
`;

/**
 * Open (and migrate) the database.
 * @param {string} [dbPath] file path or ':memory:'
 * @returns {{db: DatabaseSync, fresh: boolean}}
 */
export function openDb(dbPath = process.env.FITSTREAK_DB || DEFAULT_DB_PATH) {
  let fresh = true;
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    fresh = !fs.existsSync(dbPath);
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return { db, fresh };
}

/** Run fn inside a transaction. */
export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
