import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DATA_DIR: set this env var in Railway to point at a persistent volume (e.g. /data)
const DATA_DIR = process.env.DATA_DIR || __dirname;
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'pins.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    place TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('home','travel')),
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin_id INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: databases created before the notes column was added need it
// backfilled. CREATE TABLE IF NOT EXISTS does not alter existing tables, so
// add the column when missing (idempotent on every boot).
const pinColumns = db.prepare('PRAGMA table_info(pins)').all().map(c => c.name);
if (!pinColumns.includes('notes')) {
  db.exec("ALTER TABLE pins ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
}

const app = express();
app.use(cors());
app.use(express.json());
// Photos are private to signed-in family. requireAuth is hoisted from below.
app.use('/uploads', (req, res, next) => requireAuth(req, res, next), express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const clients = new Set();
const VALID_PIN_TYPES = new Set(['home', 'travel']);

function normalizePinInput(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const place = typeof body.place === 'string' ? body.place.trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (!name || !place) return { error: 'Name and place are required.' };
  if (!VALID_PIN_TYPES.has(type)) return { error: 'Pin type must be home or travel.' };
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'Invalid latitude.' };
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { error: 'Invalid longitude.' };
  return { value: { name, place, type, lat, lon, notes } };
}

// --- Auth (shared family password, HMAC-signed session cookie) ---
const SESSION_COOKIE = 'family_atlas_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days - family devices stay signed in
const IS_PROD = Boolean(process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT);
let devSecret = null;

function getPassword() {
  const p = process.env.FAMILY_ATLAS_PASSWORD?.trim();
  if (p) return p;
  if (IS_PROD) throw new Error('FAMILY_ATLAS_PASSWORD is required in production.');
  return 'family-demo';
}
function getSecret() {
  const s = process.env.FAMILY_ATLAS_SESSION_SECRET?.trim();
  if (s) return s;
  if (IS_PROD) throw new Error('FAMILY_ATLAS_SESSION_SECRET is required in production.');
  if (!devSecret) {
    devSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[auth] FAMILY_ATLAS_SESSION_SECRET not set - using an ephemeral dev secret.');
  }
  return devSecret;
}
function safeEqual(a, b) {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
function makeSession() {
  const payload = `${Date.now() + SESSION_TTL_MS}.${crypto.randomBytes(16).toString('hex')}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
function verifySession(value) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expiresAt = Number(exp);
  if (!nonce || Number.isNaN(expiresAt) || expiresAt < Date.now()) return false;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${expiresAt}.${nonce}`).digest('hex');
  return safeEqual(sig, expected);
}
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}
function isAuthed(req) {
  return verifySession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
}
function setSessionCookie(res, value) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${IS_PROD ? '; Secure' : ''}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PROD ? '; Secure' : ''}`);
}
function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Authentication required.' });
}

app.post('/api/auth/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!safeEqual(password, getPassword())) return res.status(401).json({ error: 'Incorrect password.' });
  setSessionCookie(res, makeSession());
  res.json({ authenticated: true });
});
app.get('/api/auth/session', (req, res) => res.json({ authenticated: isAuthed(req) }));
app.post('/api/auth/logout', (req, res) => { clearSessionCookie(res); res.json({ ok: true }); });

// Gate every /api route below this line except the /api/auth/* endpoints above.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  requireAuth(req, res, next);
});

// --- API routes ---

app.get('/api/pins', (req, res) => {
  const pins = db.prepare(`
    SELECT p.*, COUNT(ph.id) AS photo_count
    FROM pins p
    LEFT JOIN photos ph ON ph.pin_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at ASC
  `).all();
  res.json(pins);
});

app.post('/api/pins', (req, res) => {
  const parsed = normalizePinInput(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { name, place, type, lat, lon, notes } = parsed.value;
  const result = db.prepare('INSERT INTO pins (name, place, type, lat, lon, notes) VALUES (?, ?, ?, ?, ?, ?)').run(name, place, type, lat, lon, notes);
  const pin = db.prepare('SELECT *, 0 AS photo_count FROM pins WHERE id = ?').get(result.lastInsertRowid);
  broadcast({ type: 'add', pin });
  res.status(201).json(pin);
});

app.patch('/api/pins/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id.' });
  const existing = db.prepare('SELECT * FROM pins WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Pin not found.' });
  const parsed = normalizePinInput({ ...existing, ...req.body });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { name, place, type, lat, lon, notes } = parsed.value;
  db.prepare('UPDATE pins SET name=?, place=?, type=?, lat=?, lon=?, notes=? WHERE id=?').run(name, place, type, lat, lon, notes, id);
  const updated = db.prepare(`
    SELECT p.*, COUNT(ph.id) AS photo_count
    FROM pins p LEFT JOIN photos ph ON ph.pin_id = p.id
    WHERE p.id = ? GROUP BY p.id
  `).get(id);
  broadcast({ type: 'edit', pin: updated });
  res.json(updated);
});

app.delete('/api/pins/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id.' });
  const photos = db.prepare('SELECT filename FROM photos WHERE pin_id = ?').all(id);
  for (const p of photos) {
    try {
      unlinkSync(join(UPLOADS_DIR, p.filename));
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.error(error);
      }
    }
  }
  const result = db.prepare('DELETE FROM pins WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pin not found.' });
  broadcast({ type: 'remove', id });
  res.json({ ok: true });
});

app.get('/api/pins/:id/photos', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos WHERE pin_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(photos);
});

app.post('/api/pins/:id/photos', upload.array('photos', 20), (req, res) => {
  const pinId = Number(req.params.id);
  const pin = db.prepare('SELECT id FROM pins WHERE id = ?').get(pinId);
  if (!pin) return res.status(404).json({ error: 'Pin not found.' });
  const saved = (req.files || []).map(f => {
    const result = db.prepare('INSERT INTO photos (pin_id, filename, original_name) VALUES (?, ?, ?)').run(pinId, f.filename, f.originalname);
    return db.prepare('SELECT * FROM photos WHERE id = ?').get(result.lastInsertRowid);
  });
  broadcast({ type: 'photo_add', pinId });
  res.json(saved);
});

app.delete('/api/photos/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Not found.' });
  try {
    unlinkSync(join(UPLOADS_DIR, photo.filename));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error(error);
    }
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  broadcast({ type: 'photo_remove', pinId: photo.pin_id });
  res.json({ ok: true });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) client.write(payload);
}

// --- Static frontend ---
// Must come after API routes but before error handler
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  const DIST = join(__dirname, 'dist');
  app.use(express.static(DIST));
  // SPA catch-all: serve index.html for any unmatched GET
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      res.sendFile(join(DIST, 'index.html'));
    } else {
      next();
    }
  });
}

// --- Error handler (must be last) ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
