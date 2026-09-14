const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'og_revision.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function generateLinkCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'REV-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initialize tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'parent')),
      display_name TEXT,
      link_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parent_children (
      parent_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (parent_id, child_id),
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('REVISION', 'TEST', 'HOMEWORK')),
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: Ensure link_code column exists if database was already created
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasLinkCode = tableInfo.some(col => col.name === 'link_code');
    if (!hasLinkCode) {
      db.exec('ALTER TABLE users ADD COLUMN link_code TEXT;');
    }
  } catch (err) {
    console.error('Migration error checking link_code column:', err);
  }

  // Ensure all existing students have a link code
  try {
    const studentsWithoutCode = db.prepare("SELECT id, username FROM users WHERE role = 'student' AND (link_code IS NULL OR link_code = '')").all();
    for (const stu of studentsWithoutCode) {
      let code = generateLinkCode();
      if (stu.username === 'alex_student') code = 'REV-1001';
      if (stu.username === 'emma_student') code = 'REV-1002';
      db.prepare('UPDATE users SET link_code = ? WHERE id = ?').run(code, stu.id);
    }
  } catch (err) {
    console.error('Error assigning link codes to students:', err);
  }

  seedDefaultData();
}

function seedDefaultData() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const { count } = countStmt.get();
  if (count > 0) {
    return; // Already initialized
  }

  console.log('Seeding initial demo data for OG REVISION...');

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, display_name, link_code)
    VALUES (?, ?, ?, ?, ?)
  `);

  const alexHash = bcrypt.hashSync('alex123', 8);
  const emmaHash = bcrypt.hashSync('emma123', 8);
  const sarahHash = bcrypt.hashSync('sarah123', 8);

  const resAlex = insertUser.run('alex_student', alexHash, 'student', 'Alex Turner', 'REV-1001');
  const resEmma = insertUser.run('emma_student', emmaHash, 'student', 'Emma Watson', 'REV-1002');
  const resSarah = insertUser.run('sarah_parent', sarahHash, 'parent', 'Sarah Turner', null);

  const alexId = Number(resAlex.lastInsertRowid);
  const emmaId = Number(resEmma.lastInsertRowid);
  const sarahId = Number(resSarah.lastInsertRowid);

  // Link Sarah to Alex and Emma
  const insertLink = db.prepare(`
    INSERT INTO parent_children (parent_id, child_id) VALUES (?, ?)
  `);
  insertLink.run(sarahId, alexId);
  insertLink.run(sarahId, emmaId);

  // Seed events for Alex around today
  const today = new Date();
  const formatDate = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const insertEvent = db.prepare(`
    INSERT INTO events (user_id, type, title, subject, date, start_time, end_time, description, completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Alex's schedule: REVISION, TEST, HOMEWORK
  insertEvent.run(
    alexId,
    'REVISION',
    'Maths: Quadratic Equations & Formula',
    'Mathematics',
    formatDate(0),
    '16:30',
    '17:45',
    'Practise 10 problem sets from textbook pages 142-146. Focus on discriminant formula.',
    0
  );

  insertEvent.run(
    alexId,
    'HOMEWORK',
    'Physics: Motion Graphs Worksheet',
    'Physics',
    formatDate(1),
    '17:00',
    '18:00',
    'Complete questions 1 through 8 on velocity-time graphs.',
    0
  );

  insertEvent.run(
    alexId,
    'TEST',
    'Biology Unit 2 Mid-Term Exam',
    'Biology',
    formatDate(3),
    '09:15',
    '10:45',
    'Covers Cell Structure, Enzymes, Photosynthesis, and Respiration. Hall B.',
    0
  );

  insertEvent.run(
    alexId,
    'REVISION',
    'Chemistry: Atomic Structure & Bonding',
    'Chemistry',
    formatDate(2),
    '15:00',
    '16:30',
    'Review ionic vs covalent bonding diagrams and write summary flashcards.',
    1
  );

  insertEvent.run(
    alexId,
    'HOMEWORK',
    'English: Macbeth Essay Draft',
    'English',
    formatDate(4),
    '18:00',
    '19:30',
    'Write 800-word analysis on Macbeth and Lady Macbeth ambition in Act 1.',
    0
  );

  insertEvent.run(
    alexId,
    'TEST',
    'History: Weimar Germany Assessment',
    'History',
    formatDate(7),
    '11:00',
    '12:15',
    'Key topics: Treaty of Versailles, hyperinflation of 1923, Stresemann era.',
    0
  );

  // Emma's schedule
  insertEvent.run(
    emmaId,
    'REVISION',
    'French: Vocab & Speaking Practice',
    'French',
    formatDate(0),
    '17:00',
    '18:00',
    'Revise holiday & environment themes vocabulary.',
    0
  );

  insertEvent.run(
    emmaId,
    'TEST',
    'Computer Science: Algorithms Quiz',
    'Computer Science',
    formatDate(2),
    '13:30',
    '14:30',
    'Binary search, bubble sort, and Big-O notation.',
    0
  );

  insertEvent.run(
    emmaId,
    'HOMEWORK',
    'Geography: Coastal Case Study',
    'Geography',
    formatDate(3),
    '16:00',
    '17:00',
    'Complete coastal erosion management options evaluation.',
    0
  );

  console.log('Demo seed completed successfully!');
}

module.exports = {
  db,
  initDb,
  generateLinkCode
};
