require('dotenv').config();

const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { createDefaultWorkspaceContent, validateWorkspaceContent } = require('./workspace-content');

const app = express();
const port = Number(process.env.PORT || 3000);
const cookieName = 'orange_session';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in .env.');
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'orange_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function createSessionCookie(res, user) {
  const token = jwt.sign({ sub: String(user.id) }, jwtSecret, { expiresIn: '7d' });
  res.cookie(cookieName, token, cookieOptions);
}

async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, display_name, email, notifications_enabled, created_at FROM users WHERE id = ?',
    [id],
  );
  return rows[0] || null;
}

async function getWorkspaceContent(userId) {
  const defaults = JSON.stringify(createDefaultWorkspaceContent());
  await pool.execute(
    'INSERT IGNORE INTO workspace_content (user_id, content) VALUES (?, ?)',
    [userId, defaults],
  );
  const [rows] = await pool.execute(
    'SELECT content FROM workspace_content WHERE user_id = ?',
    [userId],
  );
  const content = rows[0]?.content;
  return typeof content === 'string' ? JSON.parse(content) : content;
}

function publicUser(user) {
  return {
    id: user.id,
    displayName: user.display_name,
    email: user.email,
    notificationsEnabled: Boolean(user.notifications_enabled),
    createdAt: user.created_at,
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[cookieName];
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = Number(payload.sub);
    return next();
  } catch {
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  req.cookies = sessionCookie
    ? { [cookieName]: decodeURIComponent(sessionCookie.slice(cookieName.length + 1)) }
    : {};
  next();
});

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.execute('SELECT id, display_name, email, password_hash, notifications_enabled, created_at FROM users LIMIT 0');
    await pool.execute('SELECT user_id, content, updated_at FROM workspace_content LIMIT 0');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database readiness check failed:', error.code || error.message);
    return res.status(503).json({
      error: 'MySQL is unavailable or the app schema is missing. Start MySQL, configure .env, and run schema.sql.',
    });
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (displayName.length < 2 || displayName.length > 60) {
    return res.status(400).json({ error: 'Your name must be between 2 and 60 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Your password must be between 8 and 72 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await pool.getConnection();
    let user;
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      const [result] = await connection.execute(
        'INSERT INTO users (display_name, email, password_hash) VALUES (?, ?, ?)',
        [displayName, email, passwordHash],
      );
      await connection.execute(
        'INSERT INTO workspace_content (user_id, content) VALUES (?, ?)',
        [result.insertId, JSON.stringify(createDefaultWorkspaceContent())],
      );
      const [rows] = await connection.execute(
        'SELECT id, display_name, email, notifications_enabled, created_at FROM users WHERE id = ?',
        [result.insertId],
      );
      user = rows[0];
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    createSessionCookie(res, user);
    return res.status(201).json({ user: publicUser(user), content: createDefaultWorkspaceContent() });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  try {
    const [rows] = await pool.execute(
      'SELECT id, display_name, email, password_hash, notifications_enabled, created_at FROM users WHERE email = ?',
      [email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'That email and password do not match.' });
    }

    const content = await getWorkspaceContent(user.id);
    createSessionCookie(res, user);
    return res.json({ user: publicUser(user), content });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) {
      res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }
    return res.json({ user: publicUser(user), content: await getWorkspaceContent(user.id) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'You have been signed out.' });
});

app.put('/api/profile', requireAuth, async (req, res, next) => {
  const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
  if (displayName.length < 2 || displayName.length > 60) {
    return res.status(400).json({ error: 'Your name must be between 2 and 60 characters.' });
  }

  try {
    await pool.execute('UPDATE users SET display_name = ? WHERE id = ?', [displayName, req.userId]);
    const user = await getUserById(req.userId);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/content', requireAuth, async (req, res, next) => {
  if (!validateWorkspaceContent(req.body.content)) {
    return res.status(400).json({ error: 'Content is invalid or contains text longer than 500 characters.' });
  }

  try {
    const content = JSON.stringify(req.body.content);
    await pool.execute(
      'INSERT INTO workspace_content (user_id, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = ?',
      [req.userId, content, content],
    );
    return res.json({ content: req.body.content });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/settings', requireAuth, async (req, res, next) => {
  if (typeof req.body.notificationsEnabled !== 'boolean') {
    return res.status(400).json({ error: 'Choose whether notifications are enabled.' });
  }

  try {
    await pool.execute(
      'UPDATE users SET notifications_enabled = ? WHERE id = ?',
      [req.body.notificationsEnabled, req.userId],
    );
    const user = await getUserById(req.userId);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.use('/api', (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => {
  console.log(`Orange dashboard is running at http://localhost:${port}`);
});
