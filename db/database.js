/**
 * TimeMaster SQLite Database
 * Persistent storage — survives Railway redeployments with a volume
 * Uses better-sqlite3 for synchronous, fast, zero-config SQLite
 */
const Database = require('better-sqlite3');
const path = require('path');

// Use /data for Railway volume mount, fallback to ./db locally
const DB_DIR = process.env.DB_PATH || path.join(__dirname);
const DB_FILE = path.join(DB_DIR, 'timemaster.db');

const db = new Database(DB_FILE);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// ── Schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#666',
    icon TEXT DEFAULT 'fas fa-tag',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER,
    priority INTEGER DEFAULT 2,
    due_date TEXT,
    due_time TEXT,
    status TEXT DEFAULT 'pending',
    reminder_minutes_before INTEGER DEFAULT 10,
    voice_reminder INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS time_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    category_id INTEGER,
    color TEXT DEFAULT '#4DA8DA',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER,
    duration_minutes INTEGER DEFAULT 25,
    type TEXT DEFAULT 'work',
    completed INTEGER DEFAULT 0,
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('[DB] SQLite initialisée:', DB_FILE);

// ── Default categories for new users ──
const DEFAULT_CATEGORIES = [
  { name: 'École', color: '#4DA8DA', icon: 'fas fa-graduation-cap' },
  { name: 'Projets Dev', color: '#1E3A5F', icon: 'fas fa-code' },
  { name: 'Personnel', color: '#E74C3C', icon: 'fas fa-user' },
  { name: 'Révisions', color: '#F39C12', icon: 'fas fa-book' },
  { name: 'Sport', color: '#8E44AD', icon: 'fas fa-dumbbell' },
];

const DEFAULT_SETTINGS = {
  morning_briefing_time: '07:30',
  morning_briefing_enabled: 'true',
  tts_voice: 'default',
  tts_lang: 'fr-FR',
  alarm_volume: '0.8',
  pomodoro_work_minutes: '25',
  pomodoro_break_minutes: '5',
  pomodoro_long_break_minutes: '15',
  hyperfocus_check_enabled: 'true',
  hyperfocus_check_interval_minutes: '120',
  theme: 'light',
  language: 'fr',
  notification_sound: 'chime',
  auto_start_break: 'false',
  daily_goal: '5',
};

// ── Prepared statements ──
const stmts = {
  findUserByEmail: db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser: db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)'),

  insertCategory: db.prepare('INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)'),
  getCategories: db.prepare('SELECT * FROM categories WHERE user_id = ?'),
  getCategoryById: db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?'),
  updateCategory: db.prepare('UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color), icon = COALESCE(?, icon) WHERE id = ? AND user_id = ?'),
  deleteCategory: db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?'),

  insertTask: db.prepare('INSERT INTO tasks (user_id, title, description, category_id, priority, due_date, due_time, status, reminder_minutes_before, voice_reminder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  getTasks: db.prepare('SELECT * FROM tasks WHERE user_id = ?'),
  getTaskById: db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?'),
  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?'),

  insertBlock: db.prepare('INSERT INTO time_blocks (user_id, title, start_time, end_time, category_id, color) VALUES (?, ?, ?, ?, ?, ?)'),
  getBlocks: db.prepare('SELECT * FROM time_blocks WHERE user_id = ?'),
  getBlockById: db.prepare('SELECT * FROM time_blocks WHERE id = ? AND user_id = ?'),
  deleteBlock: db.prepare('DELETE FROM time_blocks WHERE id = ? AND user_id = ?'),

  insertPomodoro: db.prepare('INSERT INTO pomodoro_sessions (user_id, task_id, duration_minutes, type, completed, started_at) VALUES (?, ?, ?, ?, ?, ?)'),
  getPomodoros: db.prepare('SELECT * FROM pomodoro_sessions WHERE user_id = ?'),
  getPomodoroById: db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ? AND user_id = ?'),

  getSettings: db.prepare('SELECT key, value FROM settings WHERE user_id = ?'),
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (?, ?, ?)'),
};

// ── Database API (drop-in replacement for the JSON version) ──
class SqliteDB {

  // ── Users ──
  findUserByEmail(email) {
    return stmts.findUserByEmail.get(email);
  }

  createUser(name, email, hashedPassword) {
    const info = stmts.createUser.run(name, email.toLowerCase(), hashedPassword);
    const userId = info.lastInsertRowid;

    // Seed default categories
    const insertCat = db.transaction(() => {
      for (const cat of DEFAULT_CATEGORIES) {
        stmts.insertCategory.run(userId, cat.name, cat.color, cat.icon);
      }
    });
    insertCat();

    // Seed default settings
    const insertSettings = db.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        stmts.upsertSetting.run(userId, key, value);
      }
    });
    insertSettings();

    return this.getUserById(userId);
  }

  getUserById(id) {
    return stmts.getUserById.get(Number(id));
  }

  // ── Generic helpers (keep API compatible) ──
  _user(userId) {
    const u = this.getUserById(userId);
    if (!u) throw new Error('User not found');
    return u;
  }

  getAll(userId, collection) {
    this._user(userId); // validate user exists
    switch (collection) {
      case 'categories': return stmts.getCategories.all(userId);
      case 'tasks': return stmts.getTasks.all(userId);
      case 'time_blocks': return stmts.getBlocks.all(userId);
      case 'pomodoro_sessions': return stmts.getPomodoros.all(userId);
      default: return [];
    }
  }

  getById(userId, collection, id) {
    const numId = Number(id);
    switch (collection) {
      case 'categories': return stmts.getCategoryById.get(numId, userId);
      case 'tasks': return stmts.getTaskById.get(numId, userId);
      case 'time_blocks': return stmts.getBlockById.get(numId, userId);
      case 'pomodoro_sessions': return stmts.getPomodoroById.get(numId, userId);
      default: return null;
    }
  }

  insert(userId, collection, item) {
    this._user(userId);
    let info;
    switch (collection) {
      case 'categories':
        info = stmts.insertCategory.run(userId, item.name, item.color || '#666', item.icon || 'fas fa-tag');
        return this.getById(userId, 'categories', info.lastInsertRowid);
      case 'tasks':
        info = stmts.insertTask.run(userId, item.title, item.description || '', item.category_id || null, item.priority || 2, item.due_date || null, item.due_time || null, item.status || 'pending', item.reminder_minutes_before || 10, item.voice_reminder !== false ? 1 : 0);
        return this.getById(userId, 'tasks', info.lastInsertRowid);
      case 'time_blocks':
        info = stmts.insertBlock.run(userId, item.title, item.start_time || null, item.end_time || null, item.category_id || null, item.color || '#4DA8DA');
        return this.getById(userId, 'time_blocks', info.lastInsertRowid);
      case 'pomodoro_sessions':
        info = stmts.insertPomodoro.run(userId, item.task_id || null, item.duration_minutes || 25, item.type || 'work', item.completed ? 1 : 0, item.started_at || new Date().toISOString());
        return this.getById(userId, 'pomodoro_sessions', info.lastInsertRowid);
      default: return null;
    }
  }

  update(userId, collection, id, updates) {
    const numId = Number(id);
    const existing = this.getById(userId, collection, numId);
    if (!existing) return null;

    // Build dynamic UPDATE
    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    delete merged.id;
    delete merged.user_id;

    const cols = Object.keys(merged);
    const vals = Object.values(merged);
    const setClause = cols.map(c => `${c} = ?`).join(', ');
    db.prepare(`UPDATE ${collection} SET ${setClause} WHERE id = ? AND user_id = ?`).run(...vals, numId, userId);

    return this.getById(userId, collection, numId);
  }

  delete(userId, collection, id) {
    const numId = Number(id);
    switch (collection) {
      case 'categories': stmts.deleteCategory.run(numId, userId); break;
      case 'tasks': stmts.deleteTask.run(numId, userId); break;
      case 'time_blocks': stmts.deleteBlock.run(numId, userId); break;
      default: break;
    }
  }

  // ── Settings ──
  getSettings(userId) {
    this._user(userId);
    const rows = stmts.getSettings.all(userId);
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  updateSettings(userId, updates) {
    this._user(userId);
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        stmts.upsertSetting.run(userId, key, String(value));
      }
    });
    tx();
    return this.getSettings(userId);
  }
}

module.exports = new SqliteDB();
