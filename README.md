# OG REVISION 🎓

A dedicated, privacy-first study, revision, test, and homework calendar platform built for students and parents, featuring email-free authentication, private link codes, and a signature royal purple top theme.

---

## 🛡️ Security & Privacy Architecture

All data and users are strictly protected with multiple layers of defense:

1. **Confidential Student Linking (No Public Directory)**:
   - Students are assigned a private **Parent Link Code** (e.g. `REV-1001`, `REV-8392`).
   - Parents must enter both the student's exact **Username** and **Private Link Code** to connect.
   - Public student directories and user scrapers are completely disabled.
   - Students can rotate/reset their Parent Link Code at any time with a single click.

2. **Strict Role & Data Isolation**:
   - Students have exclusive write access to their own calendar.
   - Parents have verified read-only access to their linked children's calendars.
   - Unauthorized access or tampering attempts are rejected with `HTTP 403 Forbidden`.

3. **Attack & Brute-Force Hardening**:
   - **Rate Limiting**: Authentication endpoints are rate-limited per IP to prevent credential stuffing and brute-force attacks (`HTTP 429 Too Many Requests`).
   - **Security Headers**: Includes `X-Frame-Options: DENY` (anti-clickjacking), `X-Content-Type-Options: nosniff`, and a strict `Content-Security-Policy`.
   - **Input Sanitization**: All user-submitted text fields (titles, subjects, notes) are sanitized against XSS and injection attacks.
   - **Zero Email Requirement**: Users do not need to share personal email addresses; authentication is managed with securely hashed passwords (`bcryptjs`).

---

## ✨ Core Features

- **💜 Signature Purple Top Theme**: Deep purple gradient header (`#1e0938` to `#7c3aed`) with graduation cap branding.
- **📚 Calendar Activities**:
  - **📚 REVISION**: Schedule focused revision sessions, topics, revision techniques (flashcards, past papers), and duration.
  - **📝 TEST**: Track upcoming exams, tests, quizzes, and assessed syllabi.
  - **💼 HOMEWORK**: Track homework assignments, due dates, instructions, and completion status.
- **📅 Multiple Views**: Interactive Month Grid, Weekly Timetable, and Chronological Agenda.
- **📊 Dashboard Counters**: Live metrics for revision sessions, upcoming tests, pending homework, and total activities.

---

## 🚀 Quick Start

```bash
cd C:\Users\oskar\.gemini\antigravity\scratch\og-revision
npm start
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⚡ Demo Accounts

| Role | Username | Password | Link Code | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **🎓 Student** | `alex_student` | `alex123` | `REV-1001` | Pre-populated with Revision, Tests & Homework |
| **🎓 Student** | `emma_student` | `emma123` | `REV-1002` | Pre-populated with CS Quiz & French Revision |
| **👨‍👩‍👧 Parent** | `sarah_parent` | `sarah123` | N/A | Linked to Alex & Emma (Read-Only) |

---

## 🧪 Run Security & E2E Tests

```bash
node test_app.js
```
