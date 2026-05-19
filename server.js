require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const SQLiteStoreFactory = require('connect-sqlite3');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const publicDir = path.join(rootDir, 'public');
const dbPath = path.join(dataDir, 'p4.db');
const sessionSecret = process.env.SESSION_SECRET || 'p4-session-secret';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production.');
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date_key TEXT NOT NULL,
    time TEXT NOT NULL,
    desc TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const SQLiteStore = SQLiteStoreFactory(session);

app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: 'p4.sid',
  store: new SQLiteStore({ db: 'sessions.db', dir: dataDir }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 14
  }
}));

app.use('/public', express.static(publicDir));
app.use('/assets', express.static(path.join(rootDir, 'assets')));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }
  next();
}

app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.sendFile(path.join(publicDir, 'login.html'));
  }
  return res.sendFile(path.join(publicDir, 'app.html'));
});

app.get('/app', requireAuth, (req, res) => {
  res.sendFile(path.join(publicDir, 'app.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, user });
});

app.post('/api/register', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || password.length < 4) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'username_taken' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  req.session.userId = info.lastInsertRowid;
  res.json({ ok: true, user: { id: info.lastInsertRowid, username } });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'bad_credentials' });
  }
  req.session.userId = user.id;
  res.json({ ok: true, user: { id: user.id, username: user.username } });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/schedule', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const rows = db.prepare(`
    SELECT id, date_key, time, desc, completed
    FROM tasks
    WHERE user_id = ?
    ORDER BY date_key ASC, time ASC, id ASC
  `).all(userId);

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.date_key]) grouped[row.date_key] = [];
    grouped[row.date_key].push({
      id: row.id,
      time: row.time,
      desc: row.desc,
      completed: !!row.completed
    });
  }
  res.json({ schedule: grouped });
});

app.post('/api/schedule', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const date_key = String(req.body.date_key || '').trim();
  const time = String(req.body.time || '').trim();
  const desc = String(req.body.desc || '').trim();
  const completed = req.body.completed ? 1 : 0;
  if (!date_key || !time || !desc) {
    return res.status(400).json({ error: 'invalid_input' });
  }

  const info = db.prepare(`
    INSERT INTO tasks (user_id, date_key, time, desc, completed)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, date_key, time, desc, completed);

  res.json({ ok: true, id: info.lastInsertRowid });
});

app.patch('/api/schedule/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);
  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
  if (!task) {
    return res.status(404).json({ error: 'not_found' });
  }

  const fields = [];
  const values = [];
  if (typeof req.body.time === 'string') { fields.push('time = ?'); values.push(req.body.time.trim()); }
  if (typeof req.body.desc === 'string') { fields.push('desc = ?'); values.push(req.body.desc.trim()); }
  if (typeof req.body.completed !== 'undefined') { fields.push('completed = ?'); values.push(req.body.completed ? 1 : 0); }
  if (typeof req.body.date_key === 'string') { fields.push('date_key = ?'); values.push(req.body.date_key.trim()); }
  if (!fields.length) {
    return res.status(400).json({ error: 'no_changes' });
  }

  values.push(id, userId);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
  res.json({ ok: true });
});

app.delete('/api/schedule/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`P4 app running on port ${port}`);
});
