// ===================================================================
// OG REVISION - CLIENT APPLICATION SCRIPT (PROTECTED & SECURED)
// Role-based Study & Revision Calendar (Student & Parent)
// ===================================================================

function getStoredToken() {
  const local = localStorage.getItem('og_revision_token');
  if (local) return local;
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)og_session=([^;]+)/);
    if (match) {
      const cookieToken = decodeURIComponent(match[1]).trim();
      if (cookieToken) {
        localStorage.setItem('og_revision_token', cookieToken);
        return cookieToken;
      }
    }
  }
  return null;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem('og_revision_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

const state = {
  token: getStoredToken(),
  user: getStoredUser(),   // { id, username, role, display_name, link_code }
  linkedChildren: [],      // Array of children if user is parent
  activeChildId: null,     // Currently viewed child ID if parent
  currentDate: new Date(), // Active calendar focus date
  currentView: 'month',    // 'month' | 'week' | 'agenda'
  filterType: 'ALL',       // 'ALL' | 'REVISION' | 'TEST' | 'HOMEWORK'
  events: [],              // Calendar events for active student
  currentTab: 'calendar',  // 'calendar' | 'test_results'
  testResults: [],         // All test results for active student
  testStats: null          // Computed analytics and growth statistics
};

// --- DOM ELEMENTS ---
const headerActions = document.getElementById('headerActions');
const brandLogoBtn = document.getElementById('brandLogoBtn');
const parentContextBar = document.getElementById('parentContextBar');
const parentActiveChildLabel = document.getElementById('parentActiveChildLabel');
const parentChildrenSwitcher = document.getElementById('parentChildrenSwitcher');
const btnOpenLinkChildModal = document.getElementById('btnOpenLinkChildModal');

// Nav Tabs
const appNavTabs = document.getElementById('appNavTabs');
const tabNavCalendar = document.getElementById('tabNavCalendar');
const tabNavTestResults = document.getElementById('tabNavTestResults');

// Test Results View Elements
const testResultsApp = document.getElementById('testResultsApp');
const parentResultsNotice = document.getElementById('parentResultsNotice');
const resultsNoticeChildName = document.getElementById('resultsNoticeChildName');
const statDominantTier = document.getElementById('statDominantTier');
const statTotalTestsCount = document.getElementById('statTotalTestsCount');
const statTopSubject = document.getElementById('statTopSubject');
const statGrowthTrend = document.getElementById('statGrowthTrend');
const barMastering = document.getElementById('barMastering');
const barSecure = document.getElementById('barSecure');
const barDeveloping = document.getElementById('barDeveloping');
const barEmerging = document.getElementById('barEmerging');
const legendMasteringPct = document.getElementById('legendMasteringPct');
const legendSecurePct = document.getElementById('legendSecurePct');
const legendDevelopingPct = document.getElementById('legendDevelopingPct');
const legendEmergingPct = document.getElementById('legendEmergingPct');
const subjectsPerformanceGrid = document.getElementById('subjectsPerformanceGrid');
const filterResultsYear = document.getElementById('filterResultsYear');
const filterResultsSubject = document.getElementById('filterResultsSubject');
const btnAddTestResultBtn = document.getElementById('btnAddTestResultBtn');
const resultsCardsList = document.getElementById('resultsCardsList');

// Test Result Modal Elements
const testResultModal = document.getElementById('testResultModal');
const testResultForm = document.getElementById('testResultForm');
const btnCloseTestResultModal = document.getElementById('btnCloseTestResultModal');
const btnCancelTestResult = document.getElementById('btnCancelTestResult');
const inputResultSubject = document.getElementById('inputResultSubject');
const selectResultDate = document.getElementById('selectResultDate');
const inputResultTestName = document.getElementById('inputResultTestName');
const inputResultMarks = document.getElementById('inputResultMarks');
const ks3ResultGroup = document.getElementById('ks3ResultGroup');
const gcseResultGroup = document.getElementById('gcseResultGroup');

const readOnlyNotice = document.getElementById('readOnlyNotice');
const noticeChildName = document.getElementById('noticeChildName');
const studentCodeBanner = document.getElementById('studentCodeBanner');
const studentLinkCodeDisplay = document.getElementById('studentLinkCodeDisplay');
const btnCopyLinkCode = document.getElementById('btnCopyLinkCode');
const btnRegenLinkCode = document.getElementById('btnRegenLinkCode');

const noChildrenBanner = document.getElementById('noChildrenBanner');
const btnLinkFirstChild = document.getElementById('btnLinkFirstChild');

const calendarApp = document.getElementById('calendarApp');
const guestHero = document.getElementById('guestHero');

// Stats elements
const statRevisionCount = document.getElementById('statRevisionCount');
const statTestCount = document.getElementById('statTestCount');
const statHomeworkCount = document.getElementById('statHomeworkCount');
const statTotalCount = document.getElementById('statTotalCount');

// Toolbar elements
const currentPeriodTitle = document.getElementById('currentPeriodTitle');
const btnPrevMonth = document.getElementById('btnPrevMonth');
const btnNextMonth = document.getElementById('btnNextMonth');
const btnToday = document.getElementById('btnToday');
const btnViewMonth = document.getElementById('btnViewMonth');
const btnViewWeek = document.getElementById('btnViewWeek');
const btnViewAgenda = document.getElementById('btnViewAgenda');
const btnAddEventBtn = document.getElementById('btnAddEventBtn');

// View containers
const monthViewContainer = document.getElementById('monthViewContainer');
const daysGrid = document.getElementById('daysGrid');
const weekViewContainer = document.getElementById('weekViewContainer');
const weekHeaderGrid = document.getElementById('weekHeaderGrid');
const weekBodyGrid = document.getElementById('weekBodyGrid');
const agendaViewContainer = document.getElementById('agendaViewContainer');
const agendaList = document.getElementById('agendaList');

// Modals
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const tabSignIn = document.getElementById('tabSignIn');
const tabRegister = document.getElementById('tabRegister');
const roleSelectionGroup = document.getElementById('roleSelectionGroup');
const displayNameGroup = document.getElementById('displayNameGroup');
const parentRegisterChildrenGroup = document.getElementById('parentRegisterChildrenGroup');
const regChildUsername = document.getElementById('regChildUsername');
const regChildCode = document.getElementById('regChildCode');
const authError = document.getElementById('authError');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const regDisplayName = document.getElementById('regDisplayName');
const btnAuthSubmit = document.getElementById('btnAuthSubmit');
const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');

const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventId = document.getElementById('eventId');
const eventTitle = document.getElementById('eventTitle');
const eventSubject = document.getElementById('eventSubject');
const eventDate = document.getElementById('eventDate');
const eventStartTime = document.getElementById('eventStartTime');
const eventEndTime = document.getElementById('eventEndTime');
const eventDescription = document.getElementById('eventDescription');
const eventCompleted = document.getElementById('eventCompleted');
const btnDeleteEvent = document.getElementById('btnDeleteEvent');
const btnCloseEventModal = document.getElementById('btnCloseEventModal');
const btnCancelEvent = document.getElementById('btnCancelEvent');

const eventViewModal = document.getElementById('eventViewModal');
const viewTypeBadge = document.getElementById('viewTypeBadge');
const viewEventTitle = document.getElementById('viewEventTitle');
const viewEventSubject = document.getElementById('viewEventSubject');
const viewEventDate = document.getElementById('viewEventDate');
const viewEventTime = document.getElementById('viewEventTime');
const viewEventStatus = document.getElementById('viewEventStatus');
const viewEventDescription = document.getElementById('viewEventDescription');
const viewParentReadOnlyNote = document.getElementById('viewParentReadOnlyNote');
const btnCloseViewModal = document.getElementById('btnCloseViewModal');

const linkChildModal = document.getElementById('linkChildModal');
const currentLinkedChildrenList = document.getElementById('currentLinkedChildrenList');
const formLinkStudentSecure = document.getElementById('formLinkStudentSecure');
const inputLinkUsername = document.getElementById('inputLinkUsername');
const inputLinkCode = document.getElementById('inputLinkCode');
const linkStudentError = document.getElementById('linkStudentError');
const btnCloseLinkChildModal = document.getElementById('btnCloseLinkChildModal');

const toastContainer = document.getElementById('toastContainer');

let isRegisterMode = false;

// --- API HELPER (With auto-retry for Render spin-up delays) ---
async function api(endpoint, options = {}, retries = 2) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(endpoint, { ...options, headers });

    // Handle Render free tier spin-up delays (502 / 503 / 504)
    if ((res.status === 502 || res.status === 503 || res.status === 504) && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return api(endpoint, options, retries - 1);
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
  } catch (err) {
    if (retries > 0 && (err.name === 'TypeError' || err.message === 'Failed to fetch')) {
      await new Promise(r => setTimeout(r, 1500));
      return api(endpoint, options, retries - 1);
    }
    throw err;
  }
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> <span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- INITIALIZATION ---
async function initApp() {
  populateTestDateOptions();
  attachEventListeners();

  const token = getStoredToken();
  if (token) {
    state.token = token;

    // Load cached user state immediately to avoid welcome screen flicker
    const cachedUser = getStoredUser();
    if (cachedUser) {
      state.user = cachedUser;
      await onUserAuthenticated();
    }

    try {
      const data = await api('/api/auth/me');
      state.user = data.user;
      // Auto-upgrade to permanent stateless signed token if returned
      if (data.token && data.token !== state.token) {
        state.token = data.token;
        localStorage.setItem('og_revision_token', data.token);
      }
      localStorage.setItem('og_revision_user', JSON.stringify(data.user));
      await onUserAuthenticated();
      return;
    } catch (err) {
      const msg = err.message ? err.message.toLowerCase() : '';
      if (msg.includes('sign in') || msg.includes('expired') || msg.includes('invalid session')) {
        console.warn('Session expired or invalid:', err);
        state.token = null;
        state.user = null;
        localStorage.removeItem('og_revision_token');
        localStorage.removeItem('og_revision_user');
        renderGuestView();
        return;
      }
      // If network offline or server is waking up, keep authenticated state with cached user!
      if (state.user) {
        return;
      }
    }
  }

  renderGuestView();
}

// --- AUTHENTICATION FLOWS ---
async function onUserAuthenticated() {
  renderHeaderUser();
  guestHero.style.display = 'none';
  if (appNavTabs) appNavTabs.style.display = 'flex';

  if (state.user.role === 'parent') {
    studentCodeBanner.style.display = 'none';
    parentContextBar.style.display = 'block';
    btnAddEventBtn.style.display = 'none'; // Parents cannot add calendar items
    if (btnAddTestResultBtn) btnAddTestResultBtn.style.display = 'none'; // Parents cannot add test results
    await loadParentChildren();
  } else {
    // Student
    parentContextBar.style.display = 'none';
    readOnlyNotice.style.display = 'none';
    noChildrenBanner.style.display = 'none';
    btnAddEventBtn.style.display = 'inline-flex';
    if (btnAddTestResultBtn) btnAddTestResultBtn.style.display = 'inline-flex';
    if (parentResultsNotice) parentResultsNotice.style.display = 'none';
    calendarApp.style.display = 'block';

    // Show student private link code banner
    studentCodeBanner.style.display = 'flex';
    studentLinkCodeDisplay.textContent = state.user.link_code || 'REV-????';

    await loadEvents();
  }

  switchTab('calendar');
}

function renderHeaderUser() {
  if (!state.user) {
    headerActions.innerHTML = `
      <button class="btn-header-auth btn-header-signin" id="btnHeaderSignIn">Sign In</button>
      <button class="btn-header-auth btn-header-register" id="btnHeaderRegister">Create Account</button>
    `;
    document.getElementById('btnHeaderSignIn').addEventListener('click', () => openAuthModal(false));
    document.getElementById('btnHeaderRegister').addEventListener('click', () => openAuthModal(true));
    return;
  }

  const roleBadgeClass = state.user.role === 'parent' ? 'parent' : 'student';
  const roleIcon = state.user.role === 'parent' ? '👨‍👩‍👧 Parent' : '🎓 Student';

  headerActions.innerHTML = `
    <div class="user-pill">
      <span class="user-role-badge ${roleBadgeClass}">${roleIcon}</span>
      <span class="user-name-label">${escapeHtml(state.user.display_name || state.user.username)}</span>
    </div>
    <button class="btn-logout" id="btnLogout">Sign Out</button>
  `;

  document.getElementById('btnLogout').addEventListener('click', handleLogout);
}

function renderGuestView() {
  state.user = null;
  state.events = [];
  state.testResults = [];
  state.testStats = null;
  renderHeaderUser();
  studentCodeBanner.style.display = 'none';
  parentContextBar.style.display = 'none';
  readOnlyNotice.style.display = 'none';
  noChildrenBanner.style.display = 'none';
  calendarApp.style.display = 'none';
  if (appNavTabs) appNavTabs.style.display = 'none';
  if (testResultsApp) testResultsApp.style.display = 'none';
  if (parentResultsNotice) parentResultsNotice.style.display = 'none';
  guestHero.style.display = 'block';
}

async function handleLogout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  }
  state.token = null;
  state.user = null;
  localStorage.removeItem('og_revision_token');
  showToast('Signed out successfully.');
  renderGuestView();
}

// --- PARENT SPECIFIC LOGIC ---
async function loadParentChildren() {
  try {
    const children = await api('/api/parent/children');
    state.linkedChildren = children;

    if (children.length === 0) {
      calendarApp.style.display = 'none';
      readOnlyNotice.style.display = 'none';
      if (testResultsApp) testResultsApp.style.display = 'none';
      noChildrenBanner.style.display = 'block';
      parentActiveChildLabel.textContent = 'No children linked';
      parentChildrenSwitcher.innerHTML = '';
      return;
    }

    noChildrenBanner.style.display = 'none';
    if (state.currentTab === 'calendar') {
      calendarApp.style.display = 'block';
    } else {
      testResultsApp.style.display = 'flex';
    }

    // If active child is not set or not in current list, pick first
    if (!state.activeChildId || !children.some(c => c.id === state.activeChildId)) {
      state.activeChildId = children[0].id;
    }

    renderParentChildrenSwitcher();
    if (state.currentTab === 'calendar') {
      await loadEvents();
    } else {
      await loadTestResults();
      await loadTestStats();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderParentChildrenSwitcher() {
  const activeChild = state.linkedChildren.find(c => c.id === state.activeChildId) || state.linkedChildren[0];
  if (!activeChild) return;

  parentActiveChildLabel.textContent = `Viewing ${activeChild.display_name || activeChild.username}'s Schedule`;
  noticeChildName.textContent = activeChild.display_name || activeChild.username;
  readOnlyNotice.style.display = 'flex';

  parentChildrenSwitcher.innerHTML = state.linkedChildren.map(child => `
    <button class="child-tab-btn ${child.id === state.activeChildId ? 'active' : ''}" data-child-id="${child.id}">
      🎓 ${escapeHtml(child.display_name || child.username)}
    </button>
  `).join('');

  parentChildrenSwitcher.querySelectorAll('.child-tab-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const childId = Number(e.currentTarget.getAttribute('data-child-id'));
      if (childId !== state.activeChildId) {
        state.activeChildId = childId;
        renderParentChildrenSwitcher();
        if (state.currentTab === 'calendar') {
          await loadEvents();
        } else if (state.currentTab === 'test_results') {
          const selectedChild = state.linkedChildren.find(c => c.id === state.activeChildId);
          if (selectedChild && resultsNoticeChildName) {
            resultsNoticeChildName.textContent = selectedChild.display_name || selectedChild.username;
          }
          await loadTestResults();
          await loadTestStats();
        }
      }
    });
  });
}

// --- EVENT LOADING & RENDERING ---
async function loadEvents() {
  const targetId = state.user.role === 'parent' ? state.activeChildId : state.user.id;
  const cacheKey = `og_events_cache_${targetId}`;

  // Load cached events first for instant rendering upon sign in
  const cached = localStorage.getItem(cacheKey);
  if (cached && state.events.length === 0) {
    try {
      state.events = JSON.parse(cached);
      updateOverviewStats();
      renderCurrentCalendarView();
      checkUpcomingTestReminders();
    } catch {}
  }

  try {
    let url = '/api/events';
    if (state.user.role === 'parent') {
      if (!state.activeChildId) return;
      url += `?studentId=${state.activeChildId}`;
    }

    const events = await api(url);
    state.events = events;
    localStorage.setItem(cacheKey, JSON.stringify(events));
    updateOverviewStats();
    renderCurrentCalendarView();
    checkUpcomingTestReminders();
  } catch (err) {
    if (!cached) {
      showToast(err.message, 'error');
    }
  }
}

function updateOverviewStats() {
  const todayStr = formatLocalDate(new Date());

  // Upcoming tests: ONLY tests that are NOT completed AND NOT in the past (date >= todayStr)
  const upcomingTests = state.events.filter(e => {
    if (e.type !== 'TEST') return false;
    if (e.completed) return false;
    if (e.date < todayStr) return false; // Past tests do NOT count as upcoming
    return true;
  }).length;

  const revisions = state.events.filter(e => e.type === 'REVISION' && !e.completed).length;
  const homework = state.events.filter(e => e.type === 'HOMEWORK' && !e.completed).length;

  statRevisionCount.textContent = revisions;
  statTestCount.textContent = upcomingTests;
  statHomeworkCount.textContent = homework;
  statTotalCount.textContent = revisions + upcomingTests + homework;
}

// --- UPCOMING TEST NOTIFICATION POP-UPS (5 Days & 3 Days Before) ---
function checkUpcomingTestReminders() {
  if (!state.user || !state.events || state.events.length === 0) return;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayStr = formatLocalDate(now);

  const alerts = [];

  state.events.forEach(ev => {
    // Only tests that are NOT completed
    if (ev.type !== 'TEST' || ev.completed) return;
    if (!ev.date) return;

    const parts = ev.date.split('-');
    if (parts.length !== 3) return;
    const testMidnight = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();

    const diffMs = testMidnight - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 5 || diffDays === 3) {
      const dismissedKey = `og_test_alert_${ev.id}_${diffDays}_${todayStr}`;
      if (!localStorage.getItem(dismissedKey)) {
        alerts.push({
          event: ev,
          daysLeft: diffDays,
          dismissedKey
        });
      }
    }
  });

  if (alerts.length > 0) {
    showTestNotificationPopup(alerts);
  }
}

function showTestNotificationPopup(alerts) {
  const modal = document.getElementById('testNotificationModal');
  const list = document.getElementById('testNotificationList');
  const pushBox = document.getElementById('testNotificationWebPushBox');
  if (!modal || !list) return;

  list.innerHTML = alerts.map(a => {
    const is3 = a.daysLeft === 3;
    const badgeColor = is3 ? '#ef4444' : '#7c3aed';
    const badgeBg = is3 ? '#fef2f2' : '#f5f3ff';
    const badgeText = is3 ? '⚠️ In 3 Days!' : '🔔 In 5 Days!';
    const borderCol = is3 ? '#fca5a5' : '#c4b5fd';

    const d = new Date(a.event.date + 'T00:00:00');
    const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div style="background: ${badgeBg}; border: 1.5px solid ${borderCol}; border-radius: 12px; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.35rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="background: ${badgeColor}; color: white; font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 6px; letter-spacing: 0.02em;">${badgeText}</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #4b5563;">📅 ${dateFormatted}</span>
        </div>
        <div style="font-weight: 700; font-size: 1rem; color: #1e1b4b; margin-top: 0.2rem;">${escapeHtml(a.event.title)}</div>
        <div style="font-size: 0.82rem; color: #6b21a8; font-weight: 600;">📚 Subject: ${escapeHtml(a.event.subject)}</div>
        ${a.event.start_time ? `<div style="font-size: 0.78rem; color: #6b7280;">⏰ Time: ${escapeHtml(a.event.start_time)}${a.event.end_time ? ' - ' + escapeHtml(a.event.end_time) : ''}</div>` : ''}
      </div>
    `;
  }).join('');

  if (window.Notification && Notification.permission === 'default' && pushBox) {
    pushBox.style.display = 'block';
    const btnEnable = document.getElementById('btnEnableWebPush');
    if (btnEnable) {
      btnEnable.onclick = async () => {
        try {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            pushBox.style.display = 'none';
            showToast('Lock-screen notifications enabled! 🎉');
          }
        } catch (e) {}
      };
    }
  } else if (pushBox) {
    pushBox.style.display = 'none';
  }

  // Trigger system notification if granted on iPhone PWA / desktop
  if (window.Notification && Notification.permission === 'granted') {
    alerts.forEach(a => {
      try {
        new Notification(`OG REVISION: Test in ${a.daysLeft} days!`, {
          body: `${a.event.title} (${a.event.subject}) is scheduled for ${a.event.date}.`,
          icon: '/icon-192.png'
        });
      } catch (e) {}
    });
  }

  // Action button handling
  const btnDismiss = document.getElementById('btnDismissTestNotifications');
  const btnClose = document.getElementById('btnCloseTestNotificationModal');
  const btnGo = document.getElementById('btnGoToCalendarFromNotification');

  const dismissAll = () => {
    alerts.forEach(a => localStorage.setItem(a.dismissedKey, '1'));
    modal.style.display = 'none';
  };

  if (btnDismiss) btnDismiss.onclick = dismissAll;
  if (btnClose) btnClose.onclick = dismissAll;
  if (btnGo) {
    btnGo.onclick = () => {
      dismissAll();
      switchTab('calendar');
      if (alerts[0] && alerts[0].event && alerts[0].event.date) {
        state.currentDate = new Date(alerts[0].event.date + 'T00:00:00');
        renderCurrentCalendarView();
      }
    };
  }

  modal.style.display = 'flex';
}

function renderCurrentCalendarView() {
  if (state.currentView === 'month') {
    monthViewContainer.style.display = 'block';
    weekViewContainer.style.display = 'none';
    agendaViewContainer.style.display = 'none';
    renderMonthView();
  } else if (state.currentView === 'week') {
    monthViewContainer.style.display = 'none';
    weekViewContainer.style.display = 'block';
    agendaViewContainer.style.display = 'none';
    renderWeekView();
  } else {
    monthViewContainer.style.display = 'none';
    weekViewContainer.style.display = 'none';
    agendaViewContainer.style.display = 'block';
    renderAgendaView();
  }
}

// --- MONTH VIEW RENDERING ---
function renderMonthView() {
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  currentPeriodTitle.textContent = `${monthNames[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-based indexing: Sunday=6, Monday=0, Tuesday=1 ...
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  const totalDays = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  daysGrid.innerHTML = '';

  const todayStr = formatLocalDate(new Date());

  // Filter events according to state.filterType
  const filteredEvents = state.events.filter(e => {
    if (state.filterType === 'ALL') return true;
    return e.type === state.filterType;
  });

  // Previous month trailing days
  for (let i = startingDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cell = document.createElement('div');
    cell.className = 'day-cell other-month';
    cell.innerHTML = `<div class="day-header"><span class="day-number">${dayNum}</span></div>`;
    daysGrid.appendChild(cell);
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className = `day-cell ${isToday ? 'today' : ''}`;
    cell.setAttribute('data-date', dateStr);

    const dayEvents = filteredEvents.filter(e => e.date === dateStr);

    let headerHtml = `
      <div class="day-header">
        <span class="day-number">${day}</span>
        ${state.user && state.user.role === 'student' ? `<button class="day-quick-add" title="Add item" data-date="${dateStr}">+ Add</button>` : ''}
      </div>
    `;

    let eventsHtml = '<div class="day-events-list">';
    for (const ev of dayEvents) {
      const typeClass = `type-${ev.type.toLowerCase()}`;
      const completedClass = ev.completed ? 'is-completed' : '';
      const isPastTest = (ev.type === 'TEST' && ev.date < todayStr && !ev.completed) ? 'is-past-test' : '';
      const timeStr = ev.start_time ? `<span class="pill-time">${ev.start_time}</span>` : '';
      const icon = ev.type === 'REVISION' ? '📚' : ev.type === 'TEST' ? '📝' : '💼';

      eventsHtml += `
        <div class="event-pill ${typeClass} ${completedClass} ${isPastTest}" data-id="${ev.id}">
          <span>${icon}</span>
          ${timeStr}
          <span>${escapeHtml(ev.title)}</span>
        </div>
      `;
    }
    eventsHtml += '</div>';

    cell.innerHTML = headerHtml + eventsHtml;

    // Quick add button click for student
    const addBtn = cell.querySelector('.day-quick-add');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModalForAdd(dateStr);
      });
    }

    // Cell click opens add event for student if cell clicked in blank area
    if (state.user && state.user.role === 'student') {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.event-pill') || e.target.closest('.day-quick-add')) return;
        openEventModalForAdd(dateStr);
      });
    }

    // Event pills click
    cell.querySelectorAll('.event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = Number(pill.getAttribute('data-id'));
        const eventObj = state.events.find(x => x.id === evId);
        if (eventObj) {
          handleEventClick(eventObj);
        }
      });
    });

    daysGrid.appendChild(cell);
  }

  // Next month leading days to complete row of 7
  const totalCells = startingDay + totalDays;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell other-month';
    cell.innerHTML = `<div class="day-header"><span class="day-number">${day}</span></div>`;
    daysGrid.appendChild(cell);
  }
}

// --- WEEK VIEW RENDERING ---
function renderWeekView() {
  const curr = new Date(state.currentDate);
  let dayOfWeek = curr.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;

  const startOfWeek = new Date(curr);
  startOfWeek.setDate(curr.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  currentPeriodTitle.textContent = `${formatShortDate(startOfWeek)} - ${formatShortDate(endOfWeek)}`;

  weekHeaderGrid.innerHTML = '';
  weekBodyGrid.innerHTML = '';

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayStr = formatLocalDate(new Date());

  const filteredEvents = state.events.filter(e => {
    if (state.filterType === 'ALL') return true;
    return e.type === state.filterType;
  });

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    const dateStr = formatLocalDate(dayDate);
    const isToday = dateStr === todayStr;

    // Header column
    const headerCol = document.createElement('div');
    headerCol.className = 'week-header-col';
    headerCol.innerHTML = `
      <span class="week-col-name">${dayNames[i]}</span>
      <span class="week-col-date ${isToday ? 'today-highlight' : ''}">${dayDate.getDate()}</span>
    `;
    weekHeaderGrid.appendChild(headerCol);

    // Body column
    const bodyCol = document.createElement('div');
    bodyCol.className = `week-day-col ${isToday ? 'today' : ''}`;
    bodyCol.setAttribute('data-date', dateStr);

    const dayEvents = filteredEvents.filter(e => e.date === dateStr);
    for (const ev of dayEvents) {
      const typeClass = `type-${ev.type.toLowerCase()}`;
      const icon = ev.type === 'REVISION' ? '📚' : ev.type === 'TEST' ? '📝' : '💼';

      const isPastTest = (ev.type === 'TEST' && ev.date < todayStr && !ev.completed) ? 'is-past-test' : '';
      const card = document.createElement('div');
      card.className = `event-pill ${typeClass} ${ev.completed ? 'is-completed' : ''} ${isPastTest}`.trim();
      card.style.whiteSpace = 'normal';
      card.style.height = 'auto';
      card.style.padding = '0.4rem 0.5rem';
      card.innerHTML = `
        <div style="font-weight: 700;">${icon} ${escapeHtml(ev.subject)}</div>
        <div style="font-size: 0.8rem;">${escapeHtml(ev.title)}</div>
        ${ev.start_time ? `<div class="pill-time">⏰ ${ev.start_time}${ev.end_time ? ' - ' + ev.end_time : ''}</div>` : ''}
      `;

      card.addEventListener('click', () => handleEventClick(ev));
      bodyCol.appendChild(card);
    }

    if (state.user && state.user.role === 'student') {
      const quickAddBtn = document.createElement('button');
      quickAddBtn.className = 'btn-link-child';
      quickAddBtn.style.marginTop = 'auto';
      quickAddBtn.style.justifyContent = 'center';
      quickAddBtn.style.background = 'transparent';
      quickAddBtn.style.color = 'var(--purple-700)';
      quickAddBtn.style.border = '1px dashed var(--purple-300)';
      quickAddBtn.textContent = '+ Add Item';
      quickAddBtn.addEventListener('click', () => openEventModalForAdd(dateStr));
      bodyCol.appendChild(quickAddBtn);
    }

    weekBodyGrid.appendChild(bodyCol);
  }
}

// --- AGENDA / LIST VIEW RENDERING ---
function renderAgendaView() {
  currentPeriodTitle.textContent = 'All Upcoming Tasks';
  agendaList.innerHTML = '';

  const todayStr = formatLocalDate(new Date());

  const filteredEvents = state.events.filter(e => {
    if (state.filterType !== 'ALL' && e.type !== state.filterType) return false;
    // Omit past tests: "don't show past tests, if i wanted to see my past tests i can see them on my calendar"
    // "only for tests make it so that if the test was yesterday for example it should no longer say upcoming"
    if (e.type === 'TEST' && e.date < todayStr) return false;
    return true;
  });

  if (filteredEvents.length === 0) {
    agendaList.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--slate-500);">
        <p style="font-size: 1.1rem; font-weight: 600;">No items found matching this filter.</p>
        ${state.user.role === 'student' ? '<p style="font-size: 0.9rem; margin-top: 0.5rem;">Click "Add to Calendar" to create your first study session or assignment.</p>' : ''}
      </div>
    `;
    return;
  }

  // Group events by date
  const groups = {};
  for (const ev of filteredEvents) {
    if (!groups[ev.date]) groups[ev.date] = [];
    groups[ev.date].push(ev);
  }

  const sortedDates = Object.keys(groups).sort();
  for (const date of sortedDates) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'agenda-day-group';

    const d = new Date(date + 'T00:00:00');
    const dayFormatted = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    groupDiv.innerHTML = `
      <div class="agenda-day-title">
        <span>📅 ${dayFormatted}</span>
        <small style="color: var(--slate-500); font-weight: 500;">(${groups[date].length} ${groups[date].length === 1 ? 'task' : 'tasks'})</small>
      </div>
      <div class="agenda-items-container" id="agendaGroup_${date}"></div>
    `;

    agendaList.appendChild(groupDiv);
    const container = groupDiv.querySelector(`#agendaGroup_${date}`);

    for (const ev of groups[date]) {
      const card = document.createElement('div');
      card.className = `agenda-item-card type-${ev.type.toLowerCase()}`;
      const icon = ev.type === 'REVISION' ? '📚' : ev.type === 'TEST' ? '📝' : '💼';

      let statusBadge = '';
      if (ev.completed) {
        statusBadge = '<span style="color: #059669; font-size: 0.75rem; font-weight: 700;">✓ Completed</span>';
      } else if (ev.type === 'TEST') {
        statusBadge = '<span style="color: #6366f1; font-size: 0.75rem; font-weight: 700;">Upcoming Test</span>';
      } else {
        statusBadge = '<span style="color: #d97706; font-size: 0.75rem; font-weight: 600;">Pending</span>';
      }

      card.innerHTML = `
        <div class="agenda-card-top">
          <span class="agenda-badge">${icon} ${ev.type}</span>
          ${statusBadge}
        </div>
        <div class="agenda-card-title">${escapeHtml(ev.title)}</div>
        <div class="agenda-card-sub">
          <strong>${escapeHtml(ev.subject)}</strong>
          ${ev.start_time ? `<span>• ⏰ ${ev.start_time}${ev.end_time ? ' - ' + ev.end_time : ''}</span>` : ''}
        </div>
        ${ev.description ? `<p style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.5rem;">${escapeHtml(ev.description)}</p>` : ''}
      `;

      card.addEventListener('click', () => handleEventClick(ev));
      container.appendChild(card);
    }
  }
}

// --- EVENT CLICK HANDLING (Role Differentiated) ---
function handleEventClick(eventObj) {
  if (state.user.role === 'student') {
    openEventModalForEdit(eventObj);
  } else {
    openEventViewModal(eventObj);
  }
}

function openEventViewModal(ev) {
  viewTypeBadge.className = `event-type-badge-large ${ev.type}`;
  viewTypeBadge.textContent = `${ev.type === 'REVISION' ? '📚' : ev.type === 'TEST' ? '📝' : '💼'} ${ev.type}`;
  viewEventTitle.textContent = ev.title;
  viewEventSubject.textContent = ev.subject;
  viewEventDate.textContent = ev.date;
  viewEventTime.textContent = ev.start_time ? `${ev.start_time}${ev.end_time ? ' to ' + ev.end_time : ''}` : 'All Day';
  
  const todayStr = formatLocalDate(new Date());
  if (ev.completed) {
    viewEventStatus.textContent = '✓ Completed';
    viewEventStatus.style.color = '#059669';
  } else if (ev.type === 'TEST') {
    if (ev.date < todayStr) {
      viewEventStatus.textContent = 'Past Test';
      viewEventStatus.style.color = '#64748b';
    } else {
      viewEventStatus.textContent = 'Upcoming Test';
      viewEventStatus.style.color = '#7c3aed';
    }
  } else {
    viewEventStatus.textContent = 'Pending';
    viewEventStatus.style.color = '#d97706';
  }
  viewEventDescription.textContent = ev.description || 'No notes provided.';
  viewParentReadOnlyNote.style.display = 'block';

  eventViewModal.style.display = 'flex';
}

function openEventModalForAdd(presetDate = null) {
  if (state.user.role !== 'student') return;

  eventForm.reset();
  eventId.value = '';
  eventModalTitle.textContent = 'Add to Calendar';
  btnDeleteEvent.style.display = 'none';

  eventDate.value = presetDate || formatLocalDate(new Date());
  setEventTypeSelection('REVISION');
  eventCompleted.checked = false;

  eventModal.style.display = 'flex';
}

function openEventModalForEdit(ev) {
  if (state.user.role !== 'student') return;

  eventId.value = ev.id;
  eventModalTitle.textContent = 'Edit Calendar Item';
  eventTitle.value = ev.title;
  eventSubject.value = ev.subject;
  eventDate.value = ev.date;
  eventStartTime.value = ev.start_time || '';
  eventEndTime.value = ev.end_time || '';
  eventDescription.value = ev.description || '';
  eventCompleted.checked = Boolean(ev.completed);

  setEventTypeSelection(ev.type);
  btnDeleteEvent.style.display = 'inline-block';

  eventModal.style.display = 'flex';
}

function setEventTypeSelection(type) {
  const options = ['REVISION', 'TEST', 'HOMEWORK'];
  for (const opt of options) {
    const radio = document.querySelector(`input[name="eventType"][value="${opt}"]`);
    const label = radio.closest('.type-option');
    if (opt === type) {
      radio.checked = true;
      label.classList.add('selected');
    } else {
      radio.checked = false;
      label.classList.remove('selected');
    }
  }
}

// --- EVENT FORM SUBMIT & DELETE (STUDENT ONLY) ---
async function handleEventFormSubmit(e) {
  e.preventDefault();
  if (state.user.role !== 'student') return;

  const evId = eventId.value;
  const payload = {
    type: document.querySelector('input[name="eventType"]:checked').value,
    title: eventTitle.value.trim(),
    subject: eventSubject.value.trim(),
    date: eventDate.value,
    start_time: eventStartTime.value || null,
    end_time: eventEndTime.value || null,
    description: eventDescription.value.trim(),
    completed: eventCompleted.checked ? 1 : 0
  };

  try {
    if (evId) {
      await api(`/api/events/${evId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Calendar item updated!');
    } else {
      await api('/api/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Added to calendar!');
    }

    eventModal.style.display = 'none';
    await loadEvents();
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('invalid or expired session') || msg.includes('sign in') || msg.includes('authentication required')) {
      showToast('Please sign in to save your item.', 'error');
      openAuthModal(false);
      return;
    }
    showToast(err.message, 'error');
  }
}

async function handleDeleteEvent() {
  const evId = eventId.value;
  if (!evId || state.user.role !== 'student') return;

  if (!confirm('Are you sure you want to delete this calendar item?')) return;

  try {
    await api(`/api/events/${evId}`, { method: 'DELETE' });
    showToast('Item deleted.');
    eventModal.style.display = 'none';
    await loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- AUTH MODAL LOGIC (SIGN IN / CREATE ACCOUNT) ---
function openAuthModal(registerMode = false) {
  authError.style.display = 'none';
  authForm.reset();
  isRegisterMode = registerMode;

  if (isRegisterMode) {
    tabRegister.classList.add('active');
    tabSignIn.classList.remove('active');
    roleSelectionGroup.style.display = 'block';
    displayNameGroup.style.display = 'block';
    btnAuthSubmit.textContent = 'Create Account';
    setRegisterRole('student');
  } else {
    tabSignIn.classList.add('active');
    tabRegister.classList.remove('active');
    roleSelectionGroup.style.display = 'none';
    displayNameGroup.style.display = 'none';
    parentRegisterChildrenGroup.style.display = 'none';
    btnAuthSubmit.textContent = 'Sign In';
  }

  authModal.style.display = 'flex';
}

function setRegisterRole(role) {
  const isParent = role === 'parent';
  document.getElementById('roleLabelStudent').classList.toggle('selected', !isParent);
  document.getElementById('roleLabelParent').classList.toggle('selected', isParent);
  document.querySelector(`input[name="accountRole"][value="${role}"]`).checked = true;

  if (isParent && isRegisterMode) {
    parentRegisterChildrenGroup.style.display = 'block';
  } else {
    parentRegisterChildrenGroup.style.display = 'none';
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  authError.style.display = 'none';

  const username = authUsername.value.trim();
  const password = authPassword.value.trim();

  try {
    if (isRegisterMode) {
      const role = document.querySelector('input[name="accountRole"]:checked').value;
      const displayName = regDisplayName.value.trim() || username;
      
      let childLink = null;
      if (role === 'parent') {
        const cUser = regChildUsername.value.trim();
        const cCode = regChildCode.value.trim();
        if (cUser && cCode) {
          childLink = { username: cUser, linkCode: cCode };
        }
      }

      const res = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role,
          display_name: displayName,
          childLink
        })
      });

      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('og_revision_token', res.token);
      showToast(`Welcome to OG REVISION, ${res.user.display_name}!`);
      authModal.style.display = 'none';
      await onUserAuthenticated();
    } else {
      // Sign In
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      state.token = res.token;
      state.user = res.user;
      localStorage.setItem('og_revision_token', res.token);
      showToast(`Welcome back, ${res.user.display_name}!`);
      authModal.style.display = 'none';
      await onUserAuthenticated();
    }
  } catch (err) {
    authError.textContent = err.message;
    authError.style.display = 'block';
  }
}

// Quick Demo Login helper
async function loginDemo(username, password) {
  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('og_revision_token', res.token);
    showToast(`Signed in as ${res.user.display_name}!`);
    await onUserAuthenticated();
  } catch (err) {
    showToast(`Demo login failed: ${err.message}`, 'error');
  }
}

// --- STUDENT LINK CODE UTILITIES ---
async function copyStudentLinkCode() {
  const code = studentLinkCodeDisplay.textContent;
  try {
    await navigator.clipboard.writeText(code);
    showToast('Copied Parent Link Code to clipboard!');
  } catch {
    showToast(`Your Parent Link Code: ${code}`);
  }
}

async function regenerateStudentLinkCode() {
  if (!confirm('Regenerate your Parent Link Code? Previous parent connections remain active, but any new link will require the new code.')) {
    return;
  }

  try {
    const res = await api('/api/student/regenerate-code', { method: 'POST' });
    state.user.link_code = res.linkCode;
    studentLinkCodeDisplay.textContent = res.linkCode;
    showToast(res.message);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- LINK / MANAGE CHILDREN MODAL (PARENT DASHBOARD) ---
async function openLinkChildModal() {
  linkStudentError.style.display = 'none';
  formLinkStudentSecure.reset();
  linkChildModal.style.display = 'flex';
  await refreshManageChildrenModal();
}

async function refreshManageChildrenModal() {
  if (state.linkedChildren.length === 0) {
    currentLinkedChildrenList.innerHTML = '<p style="color: var(--slate-500); font-size: 0.85rem;">No children linked yet.</p>';
  } else {
    currentLinkedChildrenList.innerHTML = state.linkedChildren.map(child => `
      <div class="child-row-card">
        <div>
          <span class="child-row-name">🎓 ${escapeHtml(child.display_name || child.username)}</span>
          <span class="child-row-handle">(@${escapeHtml(child.username)})</span>
        </div>
        <button class="btn-unlink" data-id="${child.id}">Unlink</button>
      </div>
    `).join('');

    currentLinkedChildrenList.querySelectorAll('.btn-unlink').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        if (confirm('Unlink this child account?')) {
          try {
            await api(`/api/parent/children/${id}`, { method: 'DELETE' });
            showToast('Child unlinked.');
            await loadParentChildren();
            await refreshManageChildrenModal();
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}

async function handleLinkStudentSecure(e) {
  e.preventDefault();
  linkStudentError.style.display = 'none';

  const username = inputLinkUsername.value.trim();
  const linkCode = inputLinkCode.value.trim();

  try {
    const res = await api('/api/parent/link-student', {
      method: 'POST',
      body: JSON.stringify({ username, linkCode })
    });

    showToast(res.message);
    formLinkStudentSecure.reset();
    await loadParentChildren();
    await refreshManageChildrenModal();
  } catch (err) {
    linkStudentError.textContent = err.message;
    linkStudentError.style.display = 'block';
  }
}

// --- DATE UTILITIES ---
function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ===================================================================
// TEST RESULTS & ACADEMIC GROWTH LOGIC
// ===================================================================

function switchTab(tabName) {
  state.currentTab = tabName;
  
  if (tabNavCalendar) tabNavCalendar.classList.toggle('active', tabName === 'calendar');
  if (tabNavTestResults) tabNavTestResults.classList.toggle('active', tabName === 'test_results');

  if (tabName === 'calendar') {
    if (testResultsApp) testResultsApp.style.display = 'none';
    if (state.user && state.user.role === 'parent' && state.linkedChildren.length === 0) {
      if (calendarApp) calendarApp.style.display = 'none';
      if (noChildrenBanner) noChildrenBanner.style.display = 'block';
    } else {
      if (calendarApp) calendarApp.style.display = 'block';
    }
  } else if (tabName === 'test_results') {
    if (calendarApp) calendarApp.style.display = 'none';
    if (noChildrenBanner) noChildrenBanner.style.display = 'none';
    if (testResultsApp) testResultsApp.style.display = 'flex';

    if (state.user && state.user.role === 'parent') {
      if (btnAddTestResultBtn) btnAddTestResultBtn.style.display = 'none';
      const activeChild = state.linkedChildren.find(c => c.id === state.activeChildId) || state.linkedChildren[0];
      if (activeChild) {
        if (parentResultsNotice) parentResultsNotice.style.display = 'flex';
        if (resultsNoticeChildName) resultsNoticeChildName.textContent = activeChild.display_name || activeChild.username;
      } else {
        if (parentResultsNotice) parentResultsNotice.style.display = 'none';
      }
    } else {
      if (btnAddTestResultBtn) btnAddTestResultBtn.style.display = 'inline-flex';
      if (parentResultsNotice) parentResultsNotice.style.display = 'none';
    }

    loadTestResults();
    loadTestStats();
  }
}

function populateTestDateOptions() {
  if (!selectResultDate) return;
  selectResultDate.innerHTML = '';
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Starting September 2026 (month index 8) for 36 months (3 years)
  const startYear = 2026;
  const startMonth = 8; // September
  
  for (let i = 0; i < 36; i++) {
    const mIdx = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);
    const label = `${months[mIdx]} ${year}`;
    const opt = document.createElement('option');
    opt.value = label;
    opt.textContent = label;
    selectResultDate.appendChild(opt);
  }
}

function setModalYearGroup(yearGroup) {
  document.querySelectorAll('input[name="resultYearGroup"]').forEach(radio => {
    const isTarget = radio.value === yearGroup;
    radio.checked = isTarget;
    const parentLabel = radio.closest('.year-option');
    if (parentLabel) parentLabel.classList.toggle('selected', isTarget);
  });

  if (yearGroup === 'GCSE') {
    if (ks3ResultGroup) ks3ResultGroup.style.display = 'none';
    if (gcseResultGroup) gcseResultGroup.style.display = 'block';
  } else {
    if (ks3ResultGroup) ks3ResultGroup.style.display = 'block';
    if (gcseResultGroup) gcseResultGroup.style.display = 'none';
  }
}

function setModalKs3Level(level) {
  document.querySelectorAll('input[name="ks3Level"]').forEach(radio => {
    const isTarget = radio.value === level;
    radio.checked = isTarget;
    const parentCard = radio.closest('.result-level-card');
    if (parentCard) parentCard.classList.toggle('selected', isTarget);
  });
}

function setModalGcseGrade(grade) {
  document.querySelectorAll('input[name="gcseGrade"]').forEach(radio => {
    const isTarget = String(radio.value) === String(grade);
    radio.checked = isTarget;
    const parentBtn = radio.closest('.gcse-grade-btn');
    if (parentBtn) parentBtn.classList.toggle('selected', isTarget);
  });
}

function openAddTestResultModal() {
  if (state.user.role !== 'student') return;
  
  testResultForm.reset();
  setModalYearGroup('Y7');
  setModalKs3Level('SECURE');
  setModalGcseGrade('7');
  
  if (selectResultDate && selectResultDate.options.length > 0) {
    selectResultDate.selectedIndex = 0;
  }
  
  testResultModal.style.display = 'flex';
  if (inputResultSubject) inputResultSubject.focus();
}

async function loadTestResults() {
  const targetId = state.user.role === 'parent' ? state.activeChildId : state.user.id;
  if (!targetId) return;

  const cacheKey = `og_test_results_${targetId}`;
  
  const cached = localStorage.getItem(cacheKey);
  if (cached && state.testResults.length === 0) {
    try {
      state.testResults = JSON.parse(cached);
      updateSubjectFilterOptions();
      renderTestResultsList();
    } catch {}
  }

  try {
    let url = '/api/test-results';
    if (state.user.role === 'parent') {
      url += `?studentId=${state.activeChildId}`;
    }

    const data = await api(url);
    state.testResults = data;
    localStorage.setItem(cacheKey, JSON.stringify(data));
    updateSubjectFilterOptions();
    renderTestResultsList();
  } catch (err) {
    if (!cached) {
      showToast(err.message, 'error');
    }
  }
}

function updateSubjectFilterOptions() {
  if (!filterResultsSubject) return;
  const currentVal = filterResultsSubject.value;
  const subjects = Array.from(new Set(state.testResults.map(r => r.subject))).sort();
  
  filterResultsSubject.innerHTML = '<option value="ALL">All Subjects</option>' +
    subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  
  if (subjects.includes(currentVal)) {
    filterResultsSubject.value = currentVal;
  } else {
    filterResultsSubject.value = 'ALL';
  }
}

function renderTestResultsList() {
  if (!resultsCardsList) return;

  const yearFilter = filterResultsYear ? filterResultsYear.value : 'ALL';
  const subjFilter = filterResultsSubject ? filterResultsSubject.value : 'ALL';

  const filtered = state.testResults.filter(item => {
    if (yearFilter !== 'ALL' && item.year_group !== yearFilter) return false;
    if (subjFilter !== 'ALL' && item.subject.toLowerCase() !== subjFilter.toLowerCase()) return false;
    return true;
  });

  if (filtered.length === 0) {
    resultsCardsList.innerHTML = `
      <div class="empty-results-box">
        <div class="empty-results-icon">📝</div>
        <p><strong>No test results found.</strong></p>
        <p class="empty-hint">${state.user.role === 'student' ? 'Click "Add Test Result" above to record your first score!' : 'No test results have been recorded for this student yet.'}</p>
      </div>
    `;
    return;
  }

  resultsCardsList.innerHTML = filtered.map(item => {
    const tierClass = `tier-${(item.growth_tier || 'emerging').toLowerCase()}`;
    const isStudent = state.user.role === 'student';

    let displayResult = escapeHtml(item.raw_result);
    let tierSub = escapeHtml(item.growth_tier);
    if (item.year_group === 'GCSE') {
      displayResult = `Grade ${escapeHtml(item.raw_result)}`;
      tierSub = `${escapeHtml(item.growth_tier)}`;
    }

    return `
      <div class="result-card" data-id="${item.id}">
        <div class="result-card-main">
          <span class="result-year-badge">${escapeHtml(item.year_group)}</span>
          <div class="result-details">
            <div class="result-subject-title">
              <span>${escapeHtml(item.subject)}</span>
            </div>
            ${item.test_name ? `<span class="result-test-name">${escapeHtml(item.test_name)}</span>` : ''}
            <div class="result-meta-row">
              <span>🗓️ ${escapeHtml(item.test_date)}</span>
            </div>
          </div>
        </div>

        <div class="result-card-right">
          ${item.marks ? `<span class="result-marks-badge">Score: ${escapeHtml(item.marks)}</span>` : ''}
          <div class="result-grade-badge ${tierClass}">
            <span class="result-raw-val">${displayResult}</span>
            <span class="result-tier-sub">${tierSub}</span>
          </div>
          ${isStudent ? `
            <button class="btn-delete-result" data-id="${item.id}" title="Delete Test Result">
              &times;
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (state.user.role === 'student') {
    resultsCardsList.querySelectorAll('.btn-delete-result').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        handleDeleteTestResult(id);
      });
    });
  }
}

async function handleDeleteTestResult(id) {
  if (!confirm('Are you sure you want to delete this test result?')) return;

  try {
    await api(`/api/test-results/${id}`, { method: 'DELETE' });
    showToast('Test result deleted successfully.');
    await loadTestResults();
    await loadTestStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadTestStats() {
  const targetId = state.user.role === 'parent' ? state.activeChildId : state.user.id;
  if (!targetId) return;

  try {
    let url = '/api/test-results/stats';
    if (state.user.role === 'parent') {
      url += `?studentId=${state.activeChildId}`;
    }

    const stats = await api(url);
    state.testStats = stats;
    renderTestStats(stats);
  } catch (err) {
    console.error('Error loading test stats:', err);
  }
}

function renderTestStats(stats) {
  if (!stats) return;

  if (statDominantTier) {
    statDominantTier.textContent = stats.dominantTier || '-';
  }
  if (statTotalTestsCount) {
    statTotalTestsCount.textContent = stats.totalTests;
  }
  if (statTopSubject) {
    if (stats.subjects && stats.subjects.length > 0) {
      statTopSubject.textContent = `${stats.subjects[0].subject} (${stats.subjects[0].count})`;
    } else {
      statTopSubject.textContent = '-';
    }
  }

  // Distribution bar
  if (barMastering) barMastering.style.width = `${stats.tierPercentages.MASTERING}%`;
  if (barSecure) barSecure.style.width = `${stats.tierPercentages.SECURE}%`;
  if (barDeveloping) barDeveloping.style.width = `${stats.tierPercentages.DEVELOPING}%`;
  if (barEmerging) barEmerging.style.width = `${stats.tierPercentages.EMERGING}%`;

  // Legend percentages
  if (legendMasteringPct) legendMasteringPct.textContent = `${stats.tierPercentages.MASTERING}%`;
  if (legendSecurePct) legendSecurePct.textContent = `${stats.tierPercentages.SECURE}%`;
  if (legendDevelopingPct) legendDevelopingPct.textContent = `${stats.tierPercentages.DEVELOPING}%`;
  if (legendEmergingPct) legendEmergingPct.textContent = `${stats.tierPercentages.EMERGING}%`;

  // Subjects performance grid
  if (subjectsPerformanceGrid) {
    if (!stats.subjects || stats.subjects.length === 0) {
      subjectsPerformanceGrid.innerHTML = `
        <div style="grid-column: 1 / -1; color: var(--slate-500); font-size: 0.88rem; padding: 1rem 0;">
          No subject analytics available yet.
        </div>
      `;
      return;
    }

    subjectsPerformanceGrid.innerHTML = stats.subjects.map(s => {
      const tierClass = `tier-${(s.latestTier || 'emerging').toLowerCase()}`;
      let displayResult = s.latestResult;
      if (!['EMERGING', 'DEVELOPING', 'SECURE', 'MASTERING'].includes(String(s.latestResult).toUpperCase())) {
        displayResult = `Grade ${s.latestResult}`;
      }

      return `
        <div class="subject-perf-card">
          <div class="subject-perf-header">
            <span class="subject-perf-name">${escapeHtml(s.subject)}</span>
            <span class="subject-perf-count">${s.count} test${s.count === 1 ? '' : 's'}</span>
          </div>
          <div class="subject-perf-tier-row">
            <span class="subject-perf-tier-pill ${tierClass}">
              Latest: ${escapeHtml(s.latestTier)} (${escapeHtml(displayResult)})
            </span>
          </div>
        </div>
      `;
    }).join('');
  }
}

async function handleTestResultFormSubmit(e) {
  e.preventDefault();
  
  const checkedYear = document.querySelector('input[name="resultYearGroup"]:checked');
  const yearGroup = checkedYear ? checkedYear.value : 'Y7';
  const subject = inputResultSubject.value.trim();
  const testDate = selectResultDate.value;
  const testName = inputResultTestName.value.trim();
  const marks = inputResultMarks.value.trim();

  let rawResult = '';
  if (['Y7', 'Y8', 'Y9'].includes(yearGroup)) {
    const checkedLevel = document.querySelector('input[name="ks3Level"]:checked');
    rawResult = checkedLevel ? checkedLevel.value : 'SECURE';
  } else if (yearGroup === 'GCSE') {
    const checkedGrade = document.querySelector('input[name="gcseGrade"]:checked');
    rawResult = checkedGrade ? checkedGrade.value : '7';
  }

  if (!subject) {
    showToast('Please enter a subject.', 'error');
    return;
  }

  try {
    await api('/api/test-results', {
      method: 'POST',
      body: JSON.stringify({
        year_group: yearGroup,
        subject,
        test_date: testDate,
        test_name: testName,
        marks,
        raw_result: rawResult
      })
    });

    showToast('Test result recorded successfully!');
    testResultModal.style.display = 'none';
    await loadTestResults();
    await loadTestStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- ATTACH EVENT LISTENERS ---
function attachEventListeners() {
  // Brand logo click returns to main calendar or home
  brandLogoBtn.addEventListener('click', () => {
    if (state.user) {
      switchTab('calendar');
      state.currentDate = new Date();
      renderCurrentCalendarView();
    }
  });

  // App Nav Tabs (Calendar vs Test Results)
  if (tabNavCalendar) {
    tabNavCalendar.addEventListener('click', () => switchTab('calendar'));
  }
  if (tabNavTestResults) {
    tabNavTestResults.addEventListener('click', () => switchTab('test_results'));
  }

  // Demo Login Buttons
  document.getElementById('btnDemoStudent').addEventListener('click', () => loginDemo('alex_student', 'alex123'));
  document.getElementById('btnDemoParent').addEventListener('click', () => loginDemo('sarah_parent', 'sarah123'));
  document.getElementById('btnHeroSignIn').addEventListener('click', () => openAuthModal(false));
  document.getElementById('btnHeroCreateAccount').addEventListener('click', () => openAuthModal(true));

  // Student Link Code actions
  btnCopyLinkCode.addEventListener('click', copyStudentLinkCode);
  btnRegenLinkCode.addEventListener('click', regenerateStudentLinkCode);

  // Modals close buttons
  btnCloseAuthModal.addEventListener('click', () => authModal.style.display = 'none');
  btnCloseEventModal.addEventListener('click', () => eventModal.style.display = 'none');
  btnCancelEvent.addEventListener('click', () => eventModal.style.display = 'none');
  btnCloseViewModal.addEventListener('click', () => eventViewModal.style.display = 'none');
  btnCloseLinkChildModal.addEventListener('click', () => linkChildModal.style.display = 'none');
  if (btnCloseTestResultModal) btnCloseTestResultModal.addEventListener('click', () => testResultModal.style.display = 'none');
  if (btnCancelTestResult) btnCancelTestResult.addEventListener('click', () => testResultModal.style.display = 'none');

  // Install / Add to Home Screen Modal & Button
  const btnHeroInstallApp = document.getElementById('btnHeroInstallApp');
  const installModal = document.getElementById('installModal');
  const btnCloseInstallModal = document.getElementById('btnCloseInstallModal');
  const btnDismissInstallModal = document.getElementById('btnDismissInstallModal');
  const btnNativeInstall = document.getElementById('btnNativeInstall');

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnNativeInstall) btnNativeInstall.style.display = 'block';
  });

  function openInstallModal() {
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      showToast('OG REVISION is already running in standalone mode! 🎉');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          showToast('Thank you for installing OG REVISION!');
        }
        deferredPrompt = null;
      });
      return;
    }
    if (installModal) {
      installModal.style.display = 'flex';
    }
  }

  if (btnHeroInstallApp) {
    btnHeroInstallApp.addEventListener('click', openInstallModal);
  }
  if (btnCloseInstallModal && installModal) {
    btnCloseInstallModal.addEventListener('click', () => installModal.style.display = 'none');
  }
  if (btnDismissInstallModal && installModal) {
    btnDismissInstallModal.addEventListener('click', () => installModal.style.display = 'none');
  }
  if (btnNativeInstall) {
    btnNativeInstall.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      }
    });
  }

  // Close modals on clicking overlay background
  const testNotificationModal = document.getElementById('testNotificationModal');
  [authModal, eventModal, eventViewModal, linkChildModal, testResultModal, installModal, testNotificationModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  });

  // Auth Modal tabs
  tabSignIn.addEventListener('click', () => openAuthModal(false));
  tabRegister.addEventListener('click', () => openAuthModal(true));
  authForm.addEventListener('submit', handleAuthSubmit);

  // Forgot / Reset password actions
  const btnForgotPass = document.getElementById('btnForgotPass');
  const forgotPassBox = document.getElementById('forgotPassBox');
  const inputNewPassword = document.getElementById('inputNewPassword');
  const inputResetLinkCode = document.getElementById('inputResetLinkCode');
  const btnConfirmResetPass = document.getElementById('btnConfirmResetPass');

  if (btnForgotPass && forgotPassBox) {
    btnForgotPass.addEventListener('click', () => {
      const isVisible = forgotPassBox.style.display !== 'none';
      forgotPassBox.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && inputNewPassword) inputNewPassword.focus();
    });
  }

  // Show / Hide password toggles (Eye icons)
  const btnToggleAuthPassword = document.getElementById('btnToggleAuthPassword');
  if (btnToggleAuthPassword && authPassword) {
    btnToggleAuthPassword.addEventListener('click', () => {
      const isPwd = authPassword.type === 'password';
      authPassword.type = isPwd ? 'text' : 'password';
      btnToggleAuthPassword.textContent = isPwd ? '🙈' : '👁️';
      btnToggleAuthPassword.title = isPwd ? 'Hide password' : 'Show password';
    });
  }

  const btnToggleResetPassword = document.getElementById('btnToggleResetPassword');
  if (btnToggleResetPassword && inputNewPassword) {
    btnToggleResetPassword.addEventListener('click', () => {
      const isPwd = inputNewPassword.type === 'password';
      inputNewPassword.type = isPwd ? 'text' : 'password';
      btnToggleResetPassword.textContent = isPwd ? '🙈' : '👁️';
      btnToggleResetPassword.title = isPwd ? 'Hide password' : 'Show password';
    });
  }

  if (btnConfirmResetPass) {
    btnConfirmResetPass.addEventListener('click', async () => {
      const username = authUsername.value.trim();
      const newPassword = inputNewPassword.value.trim();
      const linkCode = inputResetLinkCode ? inputResetLinkCode.value.trim() : '';

      if (!username) {
        showToast('Please enter your username above first.', 'error');
        authUsername.focus();
        return;
      }
      if (!newPassword || newPassword.length < 4) {
        showToast('New password must be at least 4 characters.', 'error');
        inputNewPassword.focus();
        return;
      }

      try {
        const res = await api('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ username, newPassword, linkCode })
        });
        showToast(res.message);
        state.token = res.token;
        state.user = res.user;
        localStorage.setItem('og_revision_token', res.token);
        authModal.style.display = 'none';
        if (forgotPassBox) forgotPassBox.style.display = 'none';
        await onUserAuthenticated();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Role toggle radio listeners
  document.querySelectorAll('input[name="accountRole"]').forEach(radio => {
    radio.addEventListener('change', (e) => setRegisterRole(e.target.value));
  });
  document.getElementById('roleLabelStudent').addEventListener('click', () => setRegisterRole('student'));
  document.getElementById('roleLabelParent').addEventListener('click', () => setRegisterRole('parent'));

  // Parent manage children modal & secure linking form
  btnOpenLinkChildModal.addEventListener('click', openLinkChildModal);
  btnLinkFirstChild.addEventListener('click', openLinkChildModal);
  formLinkStudentSecure.addEventListener('submit', handleLinkStudentSecure);

  // Calendar toolbar navigation
  btnPrevMonth.addEventListener('click', () => {
    if (state.currentView === 'month') {
      state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    } else if (state.currentView === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() - 7);
    }
    renderCurrentCalendarView();
  });

  btnNextMonth.addEventListener('click', () => {
    if (state.currentView === 'month') {
      state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    } else if (state.currentView === 'week') {
      state.currentDate.setDate(state.currentDate.getDate() + 7);
    }
    renderCurrentCalendarView();
  });

  btnToday.addEventListener('click', () => {
    state.currentDate = new Date();
    renderCurrentCalendarView();
  });

  // View switches
  btnViewMonth.addEventListener('click', () => setCalendarView('month'));
  btnViewWeek.addEventListener('click', () => setCalendarView('week'));
  btnViewAgenda.addEventListener('click', () => setCalendarView('agenda'));

  function setCalendarView(view) {
    state.currentView = view;
    [btnViewMonth, btnViewWeek, btnViewAgenda].forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    renderCurrentCalendarView();
  }

  // Type filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterType = chip.getAttribute('data-type');
      renderCurrentCalendarView();
    });
  });

  // Stat cards filter clicks
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-filter');
      state.filterType = type;
      document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-type') === type);
      });
      renderCurrentCalendarView();
    });
  });

  // Add event button (student)
  btnAddEventBtn.addEventListener('click', () => openEventModalForAdd());

  // Event modal type options
  document.querySelectorAll('input[name="eventType"]').forEach(radio => {
    radio.addEventListener('change', (e) => setEventTypeSelection(e.target.value));
  });
  document.querySelectorAll('.type-option').forEach(option => {
    option.addEventListener('click', () => {
      const radio = option.querySelector('input');
      if (radio) setEventTypeSelection(radio.value);
    });
  });

  // Subject quick suggestion chips for events
  document.querySelectorAll('.subject-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      eventSubject.value = chip.textContent;
    });
  });

  // Event form actions
  eventForm.addEventListener('submit', handleEventFormSubmit);
  btnDeleteEvent.addEventListener('click', handleDeleteEvent);

  // --- Test Results Listeners ---
  if (btnAddTestResultBtn) {
    btnAddTestResultBtn.addEventListener('click', openAddTestResultModal);
  }

  // Year group selection in test modal
  document.querySelectorAll('input[name="resultYearGroup"]').forEach(radio => {
    radio.addEventListener('change', (e) => setModalYearGroup(e.target.value));
  });
  document.querySelectorAll('.year-option').forEach(option => {
    option.addEventListener('click', () => {
      const radio = option.querySelector('input');
      if (radio) setModalYearGroup(radio.value);
    });
  });

  // KS3 level cards
  document.querySelectorAll('input[name="ks3Level"]').forEach(radio => {
    radio.addEventListener('change', (e) => setModalKs3Level(e.target.value));
  });
  document.querySelectorAll('.result-level-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input');
      if (radio) setModalKs3Level(radio.value);
    });
  });

  // GCSE grade buttons
  document.querySelectorAll('input[name="gcseGrade"]').forEach(radio => {
    radio.addEventListener('change', (e) => setModalGcseGrade(e.target.value));
  });
  document.querySelectorAll('.gcse-grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const radio = btn.querySelector('input');
      if (radio) setModalGcseGrade(radio.value);
    });
  });

  // Test modal quick subject chips
  document.querySelectorAll('.result-subj-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (inputResultSubject) inputResultSubject.value = chip.textContent;
    });
  });

  // Test result filter dropdowns
  if (filterResultsYear) {
    filterResultsYear.addEventListener('change', renderTestResultsList);
  }
  if (filterResultsSubject) {
    filterResultsSubject.addEventListener('change', renderTestResultsList);
  }

  // Test result form submit
  if (testResultForm) {
    testResultForm.addEventListener('submit', handleTestResultFormSubmit);
  }
}

// Start application
document.addEventListener('DOMContentLoaded', initApp);
