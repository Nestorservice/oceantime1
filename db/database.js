/**
 * TimeMaster JSON Database v3
 * Multi-user support — each user has isolated data
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'timemaster.json');

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'École', color: '#4DA8DA', icon: 'fas fa-graduation-cap' },
  { id: 2, name: 'Projets Dev', color: '#1E3A5F', icon: 'fas fa-code' },
  { id: 3, name: 'Personnel', color: '#E74C3C', icon: 'fas fa-user' },
  { id: 4, name: 'Révisions', color: '#F39C12', icon: 'fas fa-book' },
  { id: 5, name: 'Sport', color: '#8E44AD', icon: 'fas fa-dumbbell' },
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

const DEFAULT_DATA = {
  users: [],
  _nextId: { users: 1 },
};

class JsonDB {
  constructor() {
    if (fs.existsSync(DB_PATH)) {
      try {
        this.data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        // Ensure top-level keys exist
        if (!this.data.users) this.data.users = [];
        if (!this.data._nextId) this.data._nextId = { users: 1 };
        if (!this.data._nextId.users) this.data._nextId.users = 1;
      } catch (e) {
        console.warn('[DB] Fichier corrompu, reset...');
        this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    this.save();
    console.log('[DB] Base de données initialisée');
  }

  save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }

  // ── Global ID ──
  nextGlobalId(type) {
    const id = this.data._nextId[type] || 1;
    this.data._nextId[type] = id + 1;
    return id;
  }

  // ── Users ──
  findUserByEmail(email) {
    return this.data.users.find(u => u.email === email.toLowerCase());
  }

  createUser(name, email, hashedPassword) {
    const user = {
      id: this.nextGlobalId('users'),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      created_at: new Date().toISOString(),
      // Per-user data
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      tasks: [],
      time_blocks: [],
      pomodoro_sessions: [],
      settings: { ...DEFAULT_SETTINGS },
      _nextId: { categories: 6, tasks: 1, time_blocks: 1, pomodoro_sessions: 1 },
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  getUserById(id) {
    return this.data.users.find(u => u.id === Number(id));
  }

  // ── Per-user collection helpers ──
  _user(userId) {
    const u = this.getUserById(userId);
    if (!u) throw new Error('User not found');
    return u;
  }

  nextId(userId, collection) {
    const u = this._user(userId);
    if (!u._nextId) u._nextId = {};
    const id = u._nextId[collection] || 1;
    u._nextId[collection] = id + 1;
    return id;
  }

  getAll(userId, collection) {
    return this._user(userId)[collection] || [];
  }

  getById(userId, collection, id) {
    return this.getAll(userId, collection).find(item => item.id === Number(id));
  }

  insert(userId, collection, item) {
    const u = this._user(userId);
    if (!u[collection]) u[collection] = [];
    item.id = this.nextId(userId, collection);
    item.created_at = new Date().toISOString();
    u[collection].push(item);
    this.save();
    return item;
  }

  update(userId, collection, id, updates) {
    const arr = this._user(userId)[collection] || [];
    const idx = arr.findIndex(item => item.id === Number(id));
    if (idx === -1) return null;
    Object.assign(arr[idx], updates, { updated_at: new Date().toISOString() });
    this.save();
    return arr[idx];
  }

  delete(userId, collection, id) {
    const u = this._user(userId);
    u[collection] = (u[collection] || []).filter(item => item.id !== Number(id));
    this.save();
  }

  getSettings(userId) {
    const u = this._user(userId);
    if (!u.settings) u.settings = { ...DEFAULT_SETTINGS };
    return u.settings;
  }

  updateSettings(userId, updates) {
    const u = this._user(userId);
    if (!u.settings) u.settings = { ...DEFAULT_SETTINGS };
    Object.assign(u.settings, updates);
    this.save();
    return u.settings;
  }

  // ── Export / Import ──
  exportUserData(userId) {
    const u = this._user(userId);
    return {
      categories: u.categories,
      tasks: u.tasks,
      time_blocks: u.time_blocks,
      pomodoro_sessions: u.pomodoro_sessions,
      settings: u.settings,
    };
  }

  importUserData(userId, data) {
    const u = this._user(userId);
    if (data.categories) u.categories = data.categories;
    if (data.tasks) u.tasks = data.tasks;
    if (data.time_blocks) u.time_blocks = data.time_blocks;
    if (data.pomodoro_sessions) u.pomodoro_sessions = data.pomodoro_sessions;
    if (data.settings) Object.assign(u.settings, data.settings);
    this.save();
  }
}

module.exports = new JsonDB();
