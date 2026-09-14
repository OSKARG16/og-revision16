const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, initDb, generateLinkCode } = require('./db');

// Initialize database & migrations
initDb();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self';"
  );
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Clean up expired sessions periodically
function cleanExpiredSessions() {
  try {
    db.prepare("DELETE FROM sessions WHERE datetime('now') > datetime(expires_at)").run();
  } catch (err) {
    console.error('Failed cleaning expired sessions:', err);
  }
}
setInterval(cleanExpiredSessions, 1000 * 60 * 60);

// Helper: Sanitize string input to prevent XSS and tag injections
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

// In-Memory Rate Limiting for Authentication endpoints
const authAttemptTracker = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 10;

function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  let record = authAttemptTracker.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WINDOW_MS };
    authAttemptTracker.set(ip, record);
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const waitMins = Math.max(1, Math.ceil((record.resetAt - now) / (60 * 1000)));
    return res.status(429).json({
      error: `Too many unsuccessful attempts. For security, please wait ${waitMins} minute(s) before trying again.`
    });
  }

  req.authTracker = { ip, record };
  next();
}

function recordAuthFailure(req) {
  if (req.authTracker) {
    req.authTracker.record.count += 1;
    authAttemptTracker.set(req.authTracker.ip, req.authTracker.record);
  }
}

function clearAuthFailure(req) {
  if (req.authTracker) {
    authAttemptTracker.delete(req.authTracker.ip);
  }
}

// Helper: Extract session token
function getSessionToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// Authentication Middleware
function authenticate(req, res, next) {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const sessionStmt = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.username, u.role, u.display_name, u.link_code
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND datetime('now') <= datetime(s.expires_at)
  `);

  const user = sessionStmt.get(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name || user.username,
    link_code: user.link_code || null
  };
  req.token = token;
  next();
}

// --- AUTH ROUTES ---

// Register new user (NO EMAIL REQUIRED, PROTECTED)
app.post('/api/auth/register', rateLimitAuth, (req, res) => {
  try {
    const { username, password, role, display_name, childLink } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }
    const cleanUsername = sanitize(username);
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and dashes.' });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    if (role !== 'student' && role !== 'parent') {
      return res.status(400).json({ error: 'Role must be either student or parent.' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken. Please choose another.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const cleanDisplayName = sanitize(display_name) || cleanUsername;
    const studentLinkCode = role === 'student' ? generateLinkCode() : null;

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, display_name, link_code)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertResult = insertUser.run(cleanUsername, passwordHash, role, cleanDisplayName, studentLinkCode);
    const userId = Number(insertResult.lastInsertRowid);

    // If parent and initial childLink supplied (child username + linkCode)
    if (role === 'parent' && childLink && childLink.username && childLink.linkCode) {
      const targetChild = db.prepare(`
        SELECT id FROM users
        WHERE LOWER(username) = LOWER(?) AND role = 'student' AND UPPER(link_code) = UPPER(?)
      `).get(sanitize(childLink.username), sanitize(childLink.linkCode));

      if (targetChild) {
        db.prepare('INSERT OR IGNORE INTO parent_children (parent_id, child_id) VALUES (?, ?)').run(userId, targetChild.id);
      }
    }

    // Create session token (expires in 7 days)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);

    clearAuthFailure(req);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        username: cleanUsername,
        role,
        display_name: cleanDisplayName,
        link_code: studentLinkCode
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// Login with rate limiting protection
app.post('/api/auth/login', rateLimitAuth, (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      recordAuthFailure(req);
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const cleanUsername = sanitize(username);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);
    if (!user) {
      recordAuthFailure(req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      recordAuthFailure(req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    clearAuthFailure(req);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

    res.json({
      message: 'Signed in successfully!',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name || user.username,
        link_code: user.link_code || null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Logout (Session Invalidation)
app.post('/api/auth/logout', authenticate, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    res.json({ message: 'Signed out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to sign out.' });
  }
});

// --- STUDENT SPECIFIC PRIVACY ROUTES ---

// Get student link code
app.get('/api/student/link-code', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only student accounts have parent link codes.' });
  }

  const user = db.prepare('SELECT link_code FROM users WHERE id = ?').get(req.user.id);
  res.json({ linkCode: user.link_code });
});

// Regenerate student link code (for privacy rotation)
app.post('/api/student/regenerate-code', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only student accounts have parent link codes.' });
  }

  try {
    const newCode = generateLinkCode();
    db.prepare('UPDATE users SET link_code = ? WHERE id = ?').run(newCode, req.user.id);
    res.json({ linkCode: newCode, message: 'Your Parent Link Code has been updated.' });
  } catch (err) {
    console.error('Error regenerating link code:', err);
    res.status(500).json({ error: 'Failed to regenerate link code.' });
  }
});

// --- PARENT / CHILDREN ROUTES (STRICT ACCESS CONTROL) ---

// Get linked children for logged-in parent
app.get('/api/parent/children', authenticate, (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Only parent accounts can manage children.' });
  }

  try {
    const children = db.prepare(`
      SELECT u.id, u.username, u.display_name, pc.created_at as linked_at
      FROM parent_children pc
      JOIN users u ON pc.child_id = u.id
      WHERE pc.parent_id = ?
      ORDER BY u.display_name ASC
    `).all(req.user.id);

    res.json(children);
  } catch (err) {
    console.error('Error getting linked children:', err);
    res.status(500).json({ error: 'Failed to load children accounts.' });
  }
});

// Link a child account securely using Username + Private Link Code
app.post('/api/parent/link-student', authenticate, (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Only parent accounts can link children.' });
  }

  const { username, linkCode } = req.body;
  if (!username || !linkCode) {
    return res.status(400).json({ error: 'Please enter both the student username and parent link code.' });
  }

  try {
    const cleanUsername = sanitize(username);
    const cleanCode = sanitize(linkCode).toUpperCase();

    const student = db.prepare(`
      SELECT id, username, display_name, link_code
      FROM users
      WHERE LOWER(username) = LOWER(?) AND role = 'student'
    `).get(cleanUsername);

    if (!student || !student.link_code || student.link_code.toUpperCase() !== cleanCode) {
      return res.status(400).json({
        error: 'Invalid student username or link code. Please check the code in your child\'s OG REVISION account.'
      });
    }

    db.prepare(`
      INSERT OR IGNORE INTO parent_children (parent_id, child_id)
      VALUES (?, ?)
    `).run(req.user.id, student.id);

    // Return current linked children list
    const children = db.prepare(`
      SELECT u.id, u.username, u.display_name, pc.created_at as linked_at
      FROM parent_children pc
      JOIN users u ON pc.child_id = u.id
      WHERE pc.parent_id = ?
      ORDER BY u.display_name ASC
    `).all(req.user.id);

    res.json({
      message: `Successfully verified and linked ${student.display_name || student.username}!`,
      children
    });
  } catch (err) {
    console.error('Error linking child:', err);
    res.status(500).json({ error: 'Failed to link child account.' });
  }
});

// Unlink a child
app.delete('/api/parent/children/:childId', authenticate, (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Only parent accounts can unlink children.' });
  }

  const childId = Number(req.params.childId);
  try {
    db.prepare('DELETE FROM parent_children WHERE parent_id = ? AND child_id = ?').run(req.user.id, childId);
    res.json({ message: 'Child unlinked successfully.' });
  } catch (err) {
    console.error('Error unlinking child:', err);
    res.status(500).json({ error: 'Failed to unlink child.' });
  }
});

// --- CALENDAR EVENTS ROUTES (PROTECTED & ISOLATED) ---

// Get events (student sees own; parent can specify ?studentId=X if explicitly linked)
app.get('/api/events', authenticate, (req, res) => {
  try {
    let targetUserId = req.user.id;

    if (req.user.role === 'parent') {
      const studentId = Number(req.query.studentId);
      if (!studentId) {
        return res.status(400).json({ error: 'Please select a child to view their calendar.' });
      }

      // Check if parent is authorized and linked to this student
      const link = db.prepare('SELECT 1 FROM parent_children WHERE parent_id = ? AND child_id = ?').get(req.user.id, studentId);
      if (!link) {
        return res.status(403).json({ error: 'Access denied: You are not authorized to view this calendar.' });
      }
      targetUserId = studentId;
    }

    const { type, month } = req.query;
    let query = 'SELECT * FROM events WHERE user_id = ?';
    const params = [targetUserId];

    if (type && ['REVISION', 'TEST', 'HOMEWORK'].includes(type.toUpperCase())) {
      query += ' AND type = ?';
      params.push(type.toUpperCase());
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query += ' AND date LIKE ?';
      params.push(`${month}%`);
    }

    query += ' ORDER BY date ASC, start_time ASC, id ASC';

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Failed to load calendar events.' });
  }
});

// Create new event (STUDENT ONLY - Parents cannot create/edit)
app.post('/api/events', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Permission denied: Only students can add items to their calendar.' });
  }

  try {
    const { type, title, subject, date, start_time, end_time, description } = req.body;

    if (!type || !['REVISION', 'TEST', 'HOMEWORK'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Event type must be REVISION, TEST, or HOMEWORK.' });
    }

    const cleanTitle = sanitize(title);
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const cleanSubject = sanitize(subject);
    if (!cleanSubject) {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid date (YYYY-MM-DD) is required.' });
    }

    const cleanStartTime = start_time ? sanitize(start_time) : null;
    const cleanEndTime = end_time ? sanitize(end_time) : null;
    const cleanDescription = description ? sanitize(description) : '';

    const insertStmt = db.prepare(`
      INSERT INTO events (user_id, type, title, subject, date, start_time, end_time, description, completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    const result = insertStmt.run(
      req.user.id,
      type.toUpperCase(),
      cleanTitle,
      cleanSubject,
      date,
      cleanStartTime,
      cleanEndTime,
      cleanDescription
    );

    const created = db.prepare('SELECT * FROM events WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create calendar item.' });
  }
});

// Edit event (STUDENT ONLY - on their own events)
app.put('/api/events/:id', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Permission denied: Only students can edit calendar items.' });
  }

  const eventId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own calendar items.' });
  }

  try {
    const { type, title, subject, date, start_time, end_time, description, completed } = req.body;

    const eventType = type && ['REVISION', 'TEST', 'HOMEWORK'].includes(type.toUpperCase())
      ? type.toUpperCase()
      : existing.type;

    const eventTitle = title ? sanitize(title) : existing.title;
    const eventSubject = subject ? sanitize(subject) : existing.subject;
    const eventDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : existing.date;
    const eventCompleted = completed !== undefined ? (completed ? 1 : 0) : existing.completed;

    const updateStmt = db.prepare(`
      UPDATE events
      SET type = ?, title = ?, subject = ?, date = ?, start_time = ?, end_time = ?, description = ?, completed = ?
      WHERE id = ?
    `);

    updateStmt.run(
      eventType,
      eventTitle,
      eventSubject,
      eventDate,
      start_time !== undefined ? sanitize(start_time) : existing.start_time,
      end_time !== undefined ? sanitize(end_time) : existing.end_time,
      description !== undefined ? sanitize(description) : existing.description,
      eventCompleted,
      eventId
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    res.json(updated);
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update calendar item.' });
  }
});

// Toggle completion status (STUDENT ONLY)
app.patch('/api/events/:id/toggle', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Permission denied: Only students can modify calendar items.' });
  }

  const eventId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only modify your own calendar items.' });
  }

  try {
    const newStatus = existing.completed ? 0 : 1;
    db.prepare('UPDATE events SET completed = ? WHERE id = ?').run(newStatus, eventId);
    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    res.json(updated);
  } catch (err) {
    console.error('Error toggling event:', err);
    res.status(500).json({ error: 'Failed to toggle status.' });
  }
});

// Delete event (STUDENT ONLY)
app.delete('/api/events/:id', authenticate, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Permission denied: Only students can delete calendar items.' });
  }

  const eventId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own calendar items.' });
  }

  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete calendar item.' });
  }
});

// Handle unmapped API routes with JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Fallback for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err && !res.headersSent) {
      res.status(err.status || 500).end();
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  OG REVISION server running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`=========================================`);
});
