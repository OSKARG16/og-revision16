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

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year_group TEXT NOT NULL CHECK(year_group IN ('Y7', 'Y8', 'Y9', 'GCSE')),
      subject TEXT NOT NULL,
      test_date TEXT NOT NULL,
      test_name TEXT,
      marks TEXT,
      raw_result TEXT NOT NULL,
      growth_tier TEXT NOT NULL CHECK(growth_tier IN ('EMERGING', 'DEVELOPING', 'SECURE', 'MASTERING')),
      created_at TEXT DEFAULT (datetime('now')),
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
  seedTestResultsIfEmpty();
}

function seedTestResultsIfEmpty() {
  try {
    const testCount = db.prepare('SELECT COUNT(*) as count FROM test_results').get();
    if (testCount.count === 0) {
      const alex = db.prepare("SELECT id FROM users WHERE username = 'alex_student'").get();
      const emma = db.prepare("SELECT id FROM users WHERE username = 'emma_student'").get();

      const insertTestResult = db.prepare(`
        INSERT INTO test_results (user_id, year_group, subject, test_date, test_name, marks, raw_result, growth_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (alex) {
        insertTestResult.run(alex.id, 'Y9', 'Mathematics', 'October 2026', 'Algebra & Graphs Checkpoint', '46/50', 'MASTERING', 'MASTERING');
        insertTestResult.run(alex.id, 'Y9', 'Biology', 'November 2026', 'Cell Biology Assessment', '38/50', 'SECURE', 'SECURE');
        insertTestResult.run(alex.id, 'Y9', 'English Literature', 'December 2026', 'Poetry Analysis Midterm', '32/50', 'DEVELOPING', 'DEVELOPING');
        insertTestResult.run(alex.id, 'Y9', 'History', 'January 2027', 'Weimar Republic Assessment', '24/50', 'EMERGING', 'EMERGING');
        insertTestResult.run(alex.id, 'GCSE', 'Mathematics', 'February 2027', 'GCSE Paper 1 Foundation/Higher Mock', '68/80', '8', 'MASTERING');
        insertTestResult.run(alex.id, 'GCSE', 'Physics', 'March 2027', 'Forces & Motion Exam', '54/80', '6', 'SECURE');
      }

      if (emma) {
        insertTestResult.run(emma.id, 'GCSE', 'Computer Science', 'November 2026', 'Paper 1 Algorithms Mock', '72/80', '9', 'MASTERING');
        insertTestResult.run(emma.id, 'GCSE', 'French', 'December 2026', 'Grammar & Listening Assessment', '58/80', '7', 'SECURE');
      }
    }
  } catch (err) {
    console.error('Error seeding test results:', err);
  }
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

  // Seed initial test results for Alex and Emma if empty
  try {
    const testCount = db.prepare('SELECT COUNT(*) as count FROM test_results').get();
    if (testCount.count === 0) {
      const insertTestResult = db.prepare(`
        INSERT INTO test_results (user_id, year_group, subject, test_date, test_name, marks, raw_result, growth_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Alex (Y9 & GCSE)
      insertTestResult.run(alexId, 'Y9', 'Mathematics', 'October 2026', 'Algebra & Graphs Checkpoint', '46/50', 'MASTERING', 'MASTERING');
      insertTestResult.run(alexId, 'Y9', 'Biology', 'November 2026', 'Cell Biology Assessment', '38/50', 'SECURE', 'SECURE');
      insertTestResult.run(alexId, 'Y9', 'English Literature', 'December 2026', 'Poetry Analysis Midterm', '32/50', 'DEVELOPING', 'DEVELOPING');
      insertTestResult.run(alexId, 'Y9', 'History', 'January 2027', 'Weimar Republic Assessment', '24/50', 'EMERGING', 'EMERGING');
      insertTestResult.run(alexId, 'GCSE', 'Mathematics', 'February 2027', 'GCSE Paper 1 Foundation/Higher Mock', '68/80', '8', 'MASTERING');
      insertTestResult.run(alexId, 'GCSE', 'Physics', 'March 2027', 'Forces & Motion Exam', '54/80', '6', 'SECURE');

      // Emma (GCSE)
      insertTestResult.run(emmaId, 'GCSE', 'Computer Science', 'November 2026', 'Paper 1 Algorithms Mock', '72/80', '9', 'MASTERING');
      insertTestResult.run(emmaId, 'GCSE', 'French', 'December 2026', 'Grammar & Listening Assessment', '58/80', '7', 'SECURE');
    }
  } catch (err) {
    console.error('Error seeding test results:', err);
  }

  console.log('Demo seed completed successfully!');
}

function mapGrowthTier(yearGroup, rawResult) {
  if (['Y7', 'Y8', 'Y9'].includes(yearGroup)) {
    const upper = String(rawResult).toUpperCase().trim();
    if (['EMERGING', 'DEVELOPING', 'SECURE', 'MASTERING'].includes(upper)) {
      return upper;
    }
  } else if (yearGroup === 'GCSE') {
    const grade = parseInt(rawResult, 10);
    if (grade >= 1 && grade <= 4) return 'EMERGING';
    if (grade === 5) return 'DEVELOPING';
    if (grade >= 6 && grade <= 7) return 'SECURE';
    if (grade >= 8 && grade <= 9) return 'MASTERING';
  }
  return 'EMERGING';
}

module.exports = {
  db,
  initDb,
  generateLinkCode,
  mapGrowthTier
};
