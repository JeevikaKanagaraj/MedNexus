/**
 * MedNexus – Staff Dashboard Logic
 * File: js/staff.js
 *
 * Business Rules Enforced:
 *  [MV-1]  90-day maximum checkout period
 *  [MV-2]  Early return requires drop-off location
 *  [MV-3]  Smart Extend: only within 3 days of due date
 *  [MV-4]  Smart Extend: adds exactly 15 days
 *  [MV-5]  Smart Extend: one-time only (extended flag)
 *  [IM-1]  Prevent double-booking (time overlap check)
 *  [IM-2]  Emergency Pushback: High overrides Low, displaced
 *           booking moves to next free slot same day
 *  [IM-3]  Failsafe: if no slot found, escalate to Admin panel
 */

'use strict';

/* ────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────── */
let DB = null;          // loaded from data.json
let CURRENT_USER = null; // staff record

/* ────────────────────────────────────────────────
   TIME PICKER HELPERS
──────────────────────────────────────────────── */
// Removed custom time select logic, now utilizing native HTML5 <input type="time">

/* Active operation targets for modals */
let returnTarget = null;
let extendTarget = null;

const TODAY_STR = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

/* ────────────────────────────────────────────────
   BOOT
──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Auth guard */
  if (!Auth.guard('ST-')) return;
  const userId = Auth.getUser().id;

  try {
    DB = await Auth.loadDB();
  } catch (err) {
    showToast('Failed to load application data. Please check the data/data.json file.', 'error');
    console.error('loadDB error:', err);
    return;
  }

  CURRENT_USER = DB.staff.find(s => s.id === userId);
  if (!CURRENT_USER) {
    showToast('User record not found. Redirecting…', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  initUI();

  loadDashboard();
  loadMovableTab();
  loadImmovableTab();
  loadNotificationsTab();
  loadProfileTab();

  const savedTab = localStorage.getItem('staffActiveTab');
  if (savedTab) {
    const navEl = document.querySelector(`.nav-item[data-tab="${savedTab}"]`);
    if (navEl) {
      switchTab(savedTab, navEl);
    }
  }
});

/* ────────────────────────────────────────────────
   UI INIT
──────────────────────────────────────────────── */
function initUI() {
  /* Topbar date */
  const now = new Date();
  document.getElementById('topbar-date').textContent =
    now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  /* Sidebar user info */
  document.getElementById('nav-name').textContent = CURRENT_USER.name;
  document.getElementById('nav-role').textContent =
    `${CURRENT_USER.role} · ${CURRENT_USER.department}`;
  document.getElementById('nav-avatar').textContent =
    CURRENT_USER.name.charAt(0).toUpperCase();

  /* Tab navigation */
  document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab, item));
  });

  /* Hamburger */
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });

  /* Bell → notifications tab */
  document.getElementById('notif-bell-btn').addEventListener('click', () => {
    switchTab('notifications', document.getElementById('nav-notifications'));
  });

  /* Setup native time picker defaults */
  const tNow = new Date();
  const h24 = String(tNow.getHours()).padStart(2, '0');
  const mRound = String(Math.ceil(tNow.getMinutes() / 5) * 5 % 60).padStart(2, '0');
  const endH = String((tNow.getHours() + 1) % 24).padStart(2, '0');
  document.getElementById('bk-start').value = `${h24}:${mRound}`;
  document.getElementById('bk-end').value = `${endH}:${mRound}`;

  /* >90 days checkout UX logic */
  document.getElementById('co-due-date').addEventListener('change', function () {
    const coDate = document.getElementById('co-checkout-date').value;
    const dueDate = this.value;
    if (coDate && dueDate) {
      const daysDiff = Math.round((new Date(dueDate).getTime() - new Date(coDate).getTime()) / 86400000);
      document.getElementById('co-long-term-reason-group').style.display = daysDiff > 90 ? 'block' : 'none';
      document.getElementById('co-long-term-reason').required = daysDiff > 90;
    }
  });

  /* Logout */
  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

  /* Return modal */
  document.getElementById('return-modal-close').addEventListener('click', closeReturnModal);
  document.getElementById('return-cancel-btn').addEventListener('click', closeReturnModal);
  document.getElementById('return-confirm-btn').addEventListener('click', confirmReturn);

  /* Extend modal */
  document.getElementById('extend-modal-close').addEventListener('click', closeExtendModal);
  document.getElementById('extend-cancel-btn').addEventListener('click', closeExtendModal);
  document.getElementById('extend-confirm-btn').addEventListener('click', confirmExtend);

  /* Request Extend modal */
  document.getElementById('request-extend-modal-close').addEventListener('click', closeReqExtModal);
  document.getElementById('request-extend-cancel-btn').addEventListener('click', closeReqExtModal);
  document.getElementById('request-extend-confirm-btn').addEventListener('click', confirmReqExtModal);

  /* Checkout form */
  populateMovableDropdown();
  document.getElementById('co-checkout-date').value = TODAY_STR;
  document.getElementById('checkout-form').addEventListener('submit', handleCheckout);

  /* ── Location hint (fires on synthetic input event from buildAutocomplete) ── */
  (function () {
    const coInput = document.getElementById('co-equipment');
    if (!coInput) return;

    // Inject hint after the .ac-wrapper (wrapper is inserted by buildAutocomplete,
    // which runs right after this IIFE, so we defer to next tick)
    const hint = document.createElement('p');
    hint.id = 'co-location-hint';
    hint.className = 'location-hint';

    setTimeout(() => {
      const wrapper = coInput.closest('.ac-wrapper') || coInput.parentNode;
      wrapper.insertAdjacentElement('afterend', hint);
    }, 0);

    function showHint(equipId) {
      const completed = (DB.checkouts || [])
        .filter(c => (c.equipment_id === equipId) &&
                     (c.status === 'completed' || c.status === 'returned') &&
                     c.return_location)
        .sort((a, b) => (b.return_date || '').localeCompare(a.return_date || ''));

      const eq = DB.movable_equipment.find(e => e.id === equipId);

      if (completed.length > 0) {
        hint.innerHTML = `Last drop-off: <strong>${completed[0].return_location}</strong>`;
        hint.classList.add('visible');
      } else if (eq && eq.location) {
        hint.innerHTML = `Base location: <strong>${eq.location}</strong>`;
        hint.classList.add('visible');
      } else {
        hint.innerHTML = '';
        hint.classList.remove('visible');
      }
    }

    coInput.addEventListener('input', function () {
      const idMatch = this.value.match(/\((MV-\d+)\)/);
      if (idMatch) {
        showHint(idMatch[1]);
      } else {
        hint.innerHTML = '';
        hint.classList.remove('visible');
      }
    });

  })();


  /* Booking form */
  populateImmovableDropdown();
  document.getElementById('bk-date').value = TODAY_STR;
  document.getElementById('bk-dept').value = CURRENT_USER.department || '';
  document.getElementById('booking-form').addEventListener('submit', handleBooking);

  /* Edit Booking modal */
  document.getElementById('edit-booking-close').addEventListener('click', closeEditBookingModal);
  document.getElementById('edit-booking-cancel').addEventListener('click', closeEditBookingModal);
  document.getElementById('edit-booking-confirm').addEventListener('click', confirmEditBooking);

  /* Mark-all-read */
  document.getElementById('mark-all-read-btn').addEventListener('click', markAllRead);

  /* Profile events */
  document.getElementById('edit-profile-btn').addEventListener('click', openEditProfileModal);
  document.getElementById('edit-profile-close').addEventListener('click', closeEditProfileModal);
  document.getElementById('edit-profile-cancel').addEventListener('click', closeEditProfileModal);
  document.getElementById('edit-profile-save').addEventListener('click', handleSaveProfile);
}

function switchTab(tabId, navEl) {
  /* Hide all panels */
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  /* Show selected */
  document.getElementById(`tab-${tabId}`).classList.add('active');
  navEl.classList.add('active');
  /* Update topbar */
  const labels = {
    dashboard: 'Dashboard', movable: 'Movable Equipment',
    immovable: 'Immovable Equipment', notifications: 'Notifications',
    profile: 'My Profile'
  };
  document.getElementById('topbar-title').textContent = labels[tabId] || tabId;
  localStorage.setItem('staffActiveTab', tabId);

  /* Restore active sub-panels from localStorage */
  if (tabId === 'movable') {
    const savedSub = localStorage.getItem('staffActiveMovableSub') || 'checkout';
    const btn = document.querySelector(`#tab-movable .tab-btn[data-sub="${savedSub}"]`);
    if (btn && typeof switchMovableSub === 'function') switchMovableSub(savedSub, btn);
  } else if (tabId === 'immovable') {
    const savedSub = localStorage.getItem('staffActiveImmovableSub') || 'book';
    const btn = document.querySelector(`#tab-immovable .tab-btn[data-sub="${savedSub}"]`);
    if (btn && typeof switchImmovableSub === 'function') switchImmovableSub(savedSub, btn);
  }
}


/* ────────────────────────────────────────────────
   DASHBOARD TAB
──────────────────────────────────────────────── */
function loadDashboard() {
  const myCheckouts = getMyCheckouts();
  const myAllFutureBookings = getMyUpcomingBookings(); // ALL active+future bookings for counter
  const myNotifications = getMyNotifications();

  const overdueCount = myCheckouts.filter(c => getDueStatus(c.due_date) === 'overdue').length;

  /* Stats row (Clickable / Teleport UX) */
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card" style="cursor: pointer;" onclick="goToMyCheckoutsTab()">
      <div class="stat-card-icon blue"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
      <div>
        <div class="stat-value">${myCheckouts.length}</div>
        <div class="stat-label">Active Checkouts</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="goToMyCheckoutsTab()">
      <div class="stat-card-icon red"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
      <div>
        <div class="stat-value danger">${overdueCount}</div>
        <div class="stat-label">Overdue Items</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="switchTab('dashboard', document.getElementById('nav-dashboard')); document.getElementById('schedule-list').scrollIntoView({behavior:'smooth', block:'center'});">
      <div class="stat-card-icon navy"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div>
      <div>
        <div class="stat-value">${myAllFutureBookings.length}</div>
        <div class="stat-label">Bookings (All Upcoming)</div>
      </div>
    </div>`;

  /* Notification badge */
  const unread = myNotifications.filter(n => !n.read).length;
  updateBadges(unread);

  /* Active Assets list */
  renderActiveAssets(myCheckouts);

  /* Schedule — init date picker and render today */
  const picker = document.getElementById('staff-schedule-date-picker');
  if (picker) {
    if (!picker.value) picker.value = TODAY_STR;
    renderSchedule(getMyBookingsForDate(picker.value));
  } else {
    renderSchedule(getMyBookingsForDate(TODAY_STR));
  }
}

function renderActiveAssets(checkouts) {
  const el = document.getElementById('active-assets-list');
  if (!checkouts.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"></div>
      <div class="empty-state-title">No active checkouts</div>
      <div class="empty-state-desc">You have no equipment checked out right now.</div>
    </div>`;
    return;
  }

  el.innerHTML = checkouts.map(c => {
    const status = getDueStatus(c.due_date);
    const daysMsg = daysUntilDue(c.due_date);
    const alreadyExtended = c.extended;

    let rowClass = '';
    let statusBadge = '';
    if (status === 'overdue') {
      rowClass = 'overdue';
      statusBadge = `<span class="badge badge-overdue">Overdue</span>`;
    } else if (status === 'warning') {
      rowClass = 'warning';
      statusBadge = `<span class="badge badge-warning">Due Soon</span>`;
    } else {
      statusBadge = `<span class="badge badge-safe">Active</span>`;
    }

    const extendBtn = alreadyExtended
      ? `<button class="btn btn-outline btn-sm" disabled title="Already extended once">Extended</button>`
      : `<button class="btn btn-warning btn-sm" onclick="openExtendModal('${c.checkout_id}')">Extend (+15d)</button>`;

    const reqBtn = `<button class="btn btn-outline btn-sm" onclick="openReqExtModal('${c.checkout_id}')" title="Request custom extension date">Req. Ext.</button>`;

    return `
    <div class="asset-row ${rowClass}">
      <div class="asset-info">
        <div class="asset-name">${c.equipment_name}</div>
        <div class="asset-meta">ID: ${c.checkout_id} · Due: <strong>${formatDate(c.due_date)}</strong> · ${daysMsg}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        ${statusBadge}
        <div class="asset-actions">
          <button class="btn btn-action btn-sm" onclick="openReturnModal('${c.checkout_id}')">Return</button>
          ${extendBtn}
          ${reqBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderSchedule(bookings, dateStr) {
  const el = document.getElementById('schedule-list');
  const displayDate = dateStr || TODAY_STR;
  const isToday = displayDate === TODAY_STR;
  document.getElementById('schedule-date-label').textContent =
    isToday ? `Today — ${formatDate(displayDate)}` : formatDate(displayDate);

  if (!bookings || !bookings.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🗓️</div>
      <div class="empty-state-title">No bookings${isToday ? ' today' : ' on this date'}</div>
      <div class="empty-state-desc">You have no immovable equipment bookings scheduled${isToday ? ' for today' : ' on this date'}.</div>
    </div>`;
    return;
  }

  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));

  el.innerHTML = `<div class="schedule-list">` +
    sorted.map(b => {
      const priorityClass = priorityBadgeClass(b.priority);
      const isOwn = (b.staff_id || b.staffId) === CURRENT_USER.id;
      const bId = b.booking_id || b.bookingId || b.id;
      
      const now = new Date();
      const [h, m] = b.start_time.split(':').map(Number);
      const bookingDate = new Date(b.date);
      bookingDate.setHours(h, m, 0, 0);
      
      let editBtnHtml = '';
      if (isOwn) {
        if (bookingDate > now) {
          editBtnHtml = `<button class="btn btn-outline btn-sm" onclick="openEditBookingModal('${bId}')" style="padding:3px 10px;font-size:.72rem;">Edit</button>`;
        } else {
          editBtnHtml = `<button class="btn btn-outline btn-sm" disabled title="Past bookings cannot be edited" style="padding:3px 10px;font-size:.72rem;opacity:0.5;cursor:not-allowed;">Edit</button>`;
        }
      }

      return `
    <div class="schedule-item">
      <div class="schedule-time">
        <span class="schedule-time-start">${b.start_time}</span>
        <span class="schedule-time-end">→ ${b.end_time}</span>
      </div>
      <div class="schedule-divider"></div>
      <div class="schedule-info" style="flex:1;">
        <div class="schedule-patient">${b.patient_name}</div>
        <div class="schedule-equipment">
          <span>${b.equipment_name}</span> · ${b.department}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge ${priorityClass}">${b.priority}</span>
        ${editBtnHtml}
      </div>
    </div>`;
    }).join('') + `</div>`;
}

/* ────────────────────────────────────────────────
   MOVABLE TAB
──────────────────────────────────────────────── */
function loadMovableTab() {
  renderCheckoutsTable();
}

/* ── Shared custom autocomplete builder ──────────────────────────────── */
function buildAutocomplete(input, items, labelFn) {
  if (!input) return;

  // Disconnect the native datalist so its browser popup never shows
  input.removeAttribute('list');

  // Wrap input in a positioned container
  const wrapper = document.createElement('div');
  wrapper.className = 'ac-wrapper';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  // Build the dropdown list panel
  const dropdown = document.createElement('ul');
  dropdown.className = 'ac-dropdown';
  wrapper.appendChild(dropdown);

  function renderItems(query) {
    const q = (query || '').toLowerCase();
    const filtered = q
      ? items.filter(item => labelFn(item).toLowerCase().includes(q))
      : items;

    dropdown.innerHTML = '';

    if (!filtered.length) {
      const li = document.createElement('li');
      li.className = 'ac-no-results';
      li.textContent = 'No equipment found';
      dropdown.appendChild(li);
      return;
    }

    filtered.forEach(item => {
      const label = labelFn(item);
      // Split "Name (ID) — location" into name + meta parts
      const dashIdx = label.indexOf(' — ');
      const parenIdx = label.indexOf(' (');
      const namePart = parenIdx > -1 ? label.slice(0, parenIdx) : label;
      const idPart   = parenIdx > -1 && dashIdx > -1 ? label.slice(parenIdx + 1, dashIdx) : '';
      const locPart  = dashIdx > -1 ? label.slice(dashIdx + 3) : '';

      const li = document.createElement('li');
      li.className = 'ac-item';
      li.innerHTML =
        `<div class="ac-item-name">${namePart}</div>` +
        (idPart || locPart
          ? `<div class="ac-item-meta">${idPart}${locPart ? ' · ' + locPart : ''}</div>`
          : '');

      // mousedown fires before blur — preventDefault keeps the dropdown open
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        input.value = label;
        dropdown.classList.remove('open');
        // Trigger the input event so the location hint updates
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
      });

      dropdown.appendChild(li);
    });
  }

  // Focus: select-all (unlock re-selection) and open dropdown
  input.addEventListener('focus', function () {
    this.select();
    renderItems(this.value);
    dropdown.classList.add('open');
  });

  // Typing: filter and keep open
  input.addEventListener('input', function () {
    renderItems(this.value);
    dropdown.classList.add('open');
  });

  // Blur: close after a tick so mousedown on items fires first
  input.addEventListener('blur', function () {
    setTimeout(() => dropdown.classList.remove('open'), 160);
  });

  // Keyboard navigation
  input.addEventListener('keydown', function (e) {
    const items = dropdown.querySelectorAll('.ac-item');
    const focused = dropdown.querySelector('.ac-focused');
    let idx = focused ? Array.from(items).indexOf(focused) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focused) focused.classList.remove('ac-focused');
      idx = Math.min(idx + 1, items.length - 1);
      if (items[idx]) items[idx].classList.add('ac-focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focused) focused.classList.remove('ac-focused');
      idx = Math.max(idx - 1, 0);
      if (items[idx]) items[idx].classList.add('ac-focused');
    } else if (e.key === 'Enter') {
      if (focused) {
        e.preventDefault();
        focused.dispatchEvent(new MouseEvent('mousedown'));
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  });
}

function populateMovableDropdown() {
  buildAutocomplete(
    document.getElementById('co-equipment'),
    DB.movable_equipment,
    eq => `${eq.name} (${eq.id}) — ${eq.location}`
  );
}

function renderCheckoutsTable() {
  const tbody = document.getElementById('my-checkouts-tbody');
  const checkouts = getMyCheckouts();

  if (!checkouts.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
      No active checkouts.</td></tr>`;
    return;
  }

  tbody.innerHTML = checkouts.map(c => {
    const status = getDueStatus(c.due_date);
    let rowClass = status === 'overdue' ? 'row-overdue' : status === 'warning' ? 'row-warning' : '';
    let badgeHtml = status === 'overdue'
      ? `<span class="badge badge-overdue">Overdue</span>`
      : status === 'warning'
        ? `<span class="badge badge-warning">Due Soon</span>`
        : `<span class="badge badge-safe">Active</span>`;

    const reqBtn = `<button class="btn btn-outline btn-sm" onclick="openReqExtModal('${c.checkout_id}')" title="Request custom extension date">Req. Ext.</button>`;
    const extBtn = c.extended
      ? `<button class="btn btn-outline btn-sm" disabled>Extended</button>`
      : `<button class="btn btn-warning btn-sm" onclick="openExtendModal('${c.checkout_id}')">Extend (+15d)</button>`;

    return `<tr class="${rowClass}">
      <td><strong>${c.equipment_name}</strong><br/><span style="font-size:.72rem;color:var(--text-muted);">${c.equipment_id}</span></td>
      <td>${formatDate(c.checkout_date)}</td>
      <td><strong>${formatDate(c.due_date)}</strong><br/><span style="font-size:.72rem;color:var(--text-muted);">${daysUntilDue(c.due_date)}</span></td>
      <td>${badgeHtml}</td>
      <td class="td-actions">
        <button class="btn btn-action btn-sm" onclick="openReturnModal('${c.checkout_id}')">Return</button>
        ${extBtn}
        ${reqBtn}
      </td>
    </tr>`;
  }).join('');
}

/* ── CHECKOUT HANDLER [MV-1] ─────────────────── */
async function handleCheckout(e) {
  e.preventDefault();
  hideAlert('checkout-error');

  const equipInput = document.getElementById('co-equipment').value;
  const match = equipInput.match(/\((MV-\d+)\)/);
  if (!match) {
    showToast('Please select a valid equipment from the list.', 'error');
    return;
  }
  const equipId = match[1];
  const coDate = document.getElementById('co-checkout-date').value;
  const reqDueDate = document.getElementById('co-due-date').value;
  const notes = document.getElementById('co-notes').value.trim();

  if (!equipId || !coDate || !reqDueDate) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const coMs = new Date(coDate).getTime();
  const dueMs = new Date(reqDueDate).getTime();
  const daysDiff = Math.round((dueMs - coMs) / 86400000);

  if (daysDiff <= 0) {
    showToast('Due date must be after the checkout date.', 'error');
    return;
  }

  let actualDueDate = reqDueDate;
  let isExtensionRequested = false;
  let extReason = '';

  /* [MV-1] 90-day base cap with instant request logic */
  if (daysDiff > 90) {
    extReason = document.getElementById('co-long-term-reason').value.trim();
    if (!extReason) {
      showToast('A reason is required for checkouts spanning more than 90 days.', 'error');
      return;
    }
    // Cap actual initial checkout to 90
    actualDueDate = new Date(coMs + 90 * 86400000).toISOString().slice(0, 10);
    isExtensionRequested = true;
  }

  const eq = DB.movable_equipment.find(e => e.id === equipId);
  const newId = `CHK-${Date.now()}`;

  /* Atomic transaction: add to DB */

  const payload = {
    equipment_id: equipId,
    staff_id: CURRENT_USER.id,
    due_date: actualDueDate,
    notes: notes,
    is_extension_requested: isExtensionRequested,
    requested_due_date: reqDueDate,
    extension_reason: extReason
  };
  try {
    const res = await fetch(`${Auth.BASE_URL}/checkouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    if (isExtensionRequested && extReason) {
      try {
        await fetch(`${Auth.BASE_URL}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospital_id: 'HOSP-001',
            target_staff_id: 'ADM-001',
            type: 'long_term_checkout',
            severity: 'warning',
            message: `Long-term checkout (>90 days) for "${eq ? eq.name : equipId}" by ${CURRENT_USER.name}. Requested due: ${formatDate(reqDueDate)}. Reason: ${extReason}`,
            timestamp: new Date().toISOString(),
            read: false
          })
        });
      } catch (err) { console.error('Failed to send long term notification', err); }
    }

    DB = await Auth.loadDB();
  } catch (e) {
    showToast('Failed to checkout.', 'error');
    console.error(e);
    return;
  }

  document.getElementById('checkout-form').reset();
  document.getElementById('co-long-term-reason-group').style.display = 'none';
  document.getElementById('co-checkout-date').value = TODAY_STR;
  renderCheckoutsTable();
  loadDashboard();
  showToast(`${eq.name} checked out successfully.`, 'success');
}

/* ────────────────────────────────────────────────
   RETURN MODAL  [MV-2]
──────────────────────────────────────────────── */
function openReturnModal(checkoutId) {
  returnTarget = DB.checkouts.find(c => c.checkout_id === checkoutId);
  if (!returnTarget) return;
  document.getElementById('return-equip-name').textContent = returnTarget.equipment_name;
  document.getElementById('return-floor').value = '';
  document.getElementById('return-dept').value = '';
  document.getElementById('return-exact').value = '';
  hideAlert('return-err');
  document.getElementById('return-modal').classList.add('active');
  document.getElementById('return-floor').focus();
}

function closeReturnModal() {
  document.getElementById('return-modal').classList.remove('active');
  returnTarget = null;
}

async function confirmReturn() {
  if (!returnTarget) return;

  const floor = document.getElementById('return-floor').value.trim() || 'Main Ward';
  const dept = document.getElementById('return-dept').value.trim() || (CURRENT_USER ? CURRENT_USER.department : 'General');
  const exact = document.getElementById('return-exact').value.trim() || 'Equipment Return Desk';

  const loc = `${floor}, ${dept} — ${exact}`;

  try {
    const res = await fetch(`${Auth.BASE_URL}/checkouts/${returnTarget.checkout_id}/return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_location: loc, returnLocation: loc })
    });
    if (!res.ok) throw new Error(await res.text());
    DB = await Auth.loadDB();
  } catch (e) {
    showToast('Failed to return equipment: ' + e.message, 'error');
    return;
  }

  const returnedName = returnTarget.equipment_name;
  closeReturnModal();
  renderCheckoutsTable();
  loadDashboard();
  showToast(`${returnedName} returned successfully.`, 'success');
}

/* ────────────────────────────────────────────────
   EXTEND MODAL  [MV-3][MV-4][MV-5]
──────────────────────────────────────────────── */
function openExtendModal(checkoutId) {
  extendTarget = DB.checkouts.find(c => c.checkout_id === checkoutId);
  if (!extendTarget) return;

  if (extendTarget.extended) {
    showToast('This checkout has already been extended once. No further extensions allowed.', 'error');
    return;
  }

  const newDue = addDays(extendTarget.due_date, 15);
  document.getElementById('extend-equip-name').textContent = extendTarget.equipment_name;
  document.getElementById('extend-new-date').textContent = formatDate(newDue);
  document.getElementById('extend-modal').classList.add('active');
}

function closeExtendModal() {
  document.getElementById('extend-modal').classList.remove('active');
  extendTarget = null;
}

async function confirmExtend() {
  if (!extendTarget) return;

  const newDueDateStr = addDays(extendTarget.due_date, 15);

  try {
    const res = await fetch(`${Auth.BASE_URL}/checkouts/${extendTarget.checkout_id}/extend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_due_date: newDueDateStr, newDueDate: newDueDateStr })
    });
    if (!res.ok) throw new Error(await res.text());
    DB = await Auth.loadDB();
  } catch (e) {
    showToast('Failed to extend equipment: ' + e.message, 'error');
    return;
  }

  const equipName = extendTarget.equipment_name;
  closeExtendModal();
  renderCheckoutsTable();
  loadDashboard();
  showToast(`${equipName} extended by 15 days.`, 'success');
}

/* ────────────────────────────────────────────────
   REQUEST EXTEND MODAL
──────────────────────────────────────────────── */
let reqExtTarget = null;

function openReqExtModal(checkoutId) {
  reqExtTarget = DB.checkouts.find(c => c.checkout_id === checkoutId);
  if (!reqExtTarget) return;

  document.getElementById('req-extend-equip-name').textContent = reqExtTarget.equipment_name;
  document.getElementById('req-extend-date').value = addDays(reqExtTarget.due_date, 7);
  document.getElementById('req-extend-reason').value = '';
  document.getElementById('request-extend-err').classList.add('hidden');
  document.getElementById('request-extend-modal').classList.add('active');
}

function closeReqExtModal() {
  document.getElementById('request-extend-modal').classList.remove('active');
  reqExtTarget = null;
}

async function confirmReqExtModal() {
  if (!reqExtTarget) return;

  const reqDate = document.getElementById('req-extend-date').value;
  const reason = document.getElementById('req-extend-reason').value.trim();

  if (!reqDate || !reason) {
    document.getElementById('request-extend-err-text').textContent = 'Please provide both requested date and reason.';
    document.getElementById('request-extend-err').classList.remove('hidden');
    return;
  }

  const dueMs = new Date(reqExtTarget.due_date).getTime();
  const reqMs = new Date(reqDate).getTime();
  if (reqMs <= dueMs) {
    document.getElementById('request-extend-err-text').textContent = 'Requested date must be after the current due date.';
    document.getElementById('request-extend-err').classList.remove('hidden');
    return;
  }

  /* POST extension request to MySQL via backend */
  const payload = {
    checkout_id: reqExtTarget.checkout_id,
    staff_id: CURRENT_USER.id,
    staff_name: CURRENT_USER.name,
    equipment_name: reqExtTarget.equipment_name,
    current_due: reqExtTarget.due_date,
    requested_due: reqDate,
    reason: reason,
    hospital_id: (DB.hospital && DB.hospital.id) ? DB.hospital.id : 'HOSP-001'
  };

  try {
    const res = await fetch(`${Auth.BASE_URL}/extensions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text() || 'Server error');

    /* Also notify admin — persisted in MySQL */
    await fetch(`${Auth.BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospital_id: (DB.hospital && DB.hospital.id) ? DB.hospital.id : 'HOSP-001',
        target_staff_id: 'ADM-001',
        type: 'extension_request',
        severity: 'warning',
        message: `${CURRENT_USER.name} requested a custom extension for "${reqExtTarget.equipment_name}" until ${formatDate(reqDate)}. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        read: false
      })
    });

    /* Reload DB so the new request appears in the admin panel immediately */
    DB = await Auth.loadDB();
    closeReqExtModal();
    showToast('Extension request saved and sent to administration.', 'success');
  } catch (err) {
    document.getElementById('request-extend-err-text').textContent = `Failed to submit: ${err.message}`;
    document.getElementById('request-extend-err').classList.remove('hidden');
  }
}

/* ────────────────────────────────────────────────
   EDIT BOOKING MODAL  [IM-1]
──────────────────────────────────────────────── */
let editBookingTarget = null;

function openEditBookingModal(bookingId) {
  const bk = DB.bookings.find(b => b.booking_id === bookingId || b.id === bookingId);
  if (!bk || bk.staff_id !== CURRENT_USER.id) {
    showToast('You can only edit your own bookings.', 'error');
    return;
  }
  editBookingTarget = bk;

  document.getElementById('edit-booking-id').value = bk.booking_id || bk.id;
  document.getElementById('edit-bk-equipment-name').value = `${bk.equipment_name} (${bk.equipment_id})`;
  document.getElementById('edit-bk-patient').value = bk.patient_name;
  document.getElementById('edit-bk-date').value = bk.date;
  document.getElementById('edit-bk-start').value = bk.start_time;
  document.getElementById('edit-bk-end').value = bk.end_time;
  document.getElementById('edit-bk-priority').value = bk.priority;
  document.getElementById('edit-bk-dept').value = CURRENT_USER.department; // Auto-fill default (editable)

  hideAlert('edit-booking-error');
  document.getElementById('edit-booking-modal').classList.add('active');
}

function closeEditBookingModal() {
  document.getElementById('edit-booking-modal').classList.remove('active');
  editBookingTarget = null;
}

async function confirmEditBooking() {
  if (!editBookingTarget) return;

  const patient = document.getElementById('edit-bk-patient').value.trim();
  const date = document.getElementById('edit-bk-date').value;
  const startStr = document.getElementById('edit-bk-start').value;
  const endStr = document.getElementById('edit-bk-end').value;
  const priority = document.getElementById('edit-bk-priority').value;
  const dept = document.getElementById('edit-bk-dept').value.trim();

  if (!patient || !date || !startStr || !endStr || !priority || !dept) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (startStr === endStr) {
    showToast('Start and end time cannot be the same.', 'error');
    return;
  }

  if (date === TODAY_STR) {
    const nowLocal = new Date();
    const currentMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    const [h, m] = startStr.split(':').map(Number);
    if ((h * 60 + m) <= currentMins) {
      showToast('Cannot book an appointment for a past time today.', 'error');
      return;
    }
  }

  /* ── Step 2: Sanitize date & time before building payload ── */
  let sanitizedDate = date;
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [dd, mm, yyyy] = date.split('-');
    sanitizedDate = `${yyyy}-${mm}-${dd}`;
  }
  function sanitizeTimeField(t) {
    if (!t) return t;
    const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2];
      if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
      if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      return `${String(h).padStart(2,'0')}:${m}:00`;
    }
    if (/^\d{1,2}:\d{2}$/.test(t)) return t + ':00';
    return t;
  }

  const equipmentId = editBookingTarget.equipment_id || editBookingTarget.equipment?.id || editBookingTarget.equipmentId;
  const payload = {
    patient_name: patient,
    patientName: patient,
    date: sanitizedDate,
    start_time: sanitizeTimeField(startStr),
    startTime: sanitizeTimeField(startStr),
    end_time: sanitizeTimeField(endStr),
    endTime: sanitizeTimeField(endStr),
    priority: priority,
    department: dept,
    equipment_id: equipmentId,
    equipmentId: equipmentId,
    staff_id: CURRENT_USER.id,
    staffId: CURRENT_USER.id
  };

  try {
    const res = await fetch(`${Auth.BASE_URL}/bookings/${editBookingTarget.booking_id || editBookingTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg || 'Failed to update booking.');
    }
    DB = await Auth.loadDB();
  } catch (e) {
    showToast(e.message, 'error');
    console.error(e);
    return;
  }

  closeEditBookingModal();
  renderBookingsTable();
  loadDashboard();
  showToast(`Booking for ${patient} updated successfully.`, 'success');
}

/* ────────────────────────────────────────────────
   IMMOVABLE TAB
──────────────────────────────────────────────── */
function loadImmovableTab() {
  renderBookingsTable();
}

function populateImmovableDropdown() {
  const bkInput = document.getElementById('bk-equipment');
  buildAutocomplete(
    bkInput,
    DB.immovable_equipment,
    eq => `${eq.name} (${eq.id}) — ${eq.location}`
  );

  if (!bkInput) return;

  // Insert or grab duration hint element
  let durationHint = document.getElementById('bk-duration-hint');
  if (!durationHint) {
    durationHint = document.createElement('p');
    durationHint.id = 'bk-duration-hint';
    durationHint.className = 'location-hint';
    const wrapper = bkInput.closest('.ac-wrapper') || bkInput.parentNode;
    wrapper.insertAdjacentElement('afterend', durationHint);
  }

  function updateDurationAndAutoCalc() {
    const val = bkInput.value;
    const match = val.match(/\((IM-\d+)\)/);
    if (match) {
      const eq = DB.immovable_equipment.find(e => e.id === match[1]);
      if (eq) {
        const slotMins = eq.slot_duration_mins || eq.slotDurationMins || 60;
        durationHint.innerHTML = `Standard duration: <strong>${slotMins} mins</strong>`;
        durationHint.classList.add('visible');

        // Auto-calc End Time if Start Time is set
        const startInput = document.getElementById('bk-start');
        if (startInput && startInput.value) {
          const [sh, sm] = startInput.value.split(':').map(Number);
          let totalMins = sh * 60 + sm + slotMins;
          const eh = String(Math.floor((totalMins / 60) % 24)).padStart(2, '0');
          const em = String(totalMins % 60).padStart(2, '0');
          document.getElementById('bk-end').value = `${eh}:${em}`;
        }
        return;
      }
    }
    durationHint.innerHTML = '';
    durationHint.classList.remove('visible');
  }

  bkInput.addEventListener('input', updateDurationAndAutoCalc);

  const bkStart = document.getElementById('bk-start');
  if (bkStart) {
    bkStart.addEventListener('input', updateDurationAndAutoCalc);
    bkStart.addEventListener('change', updateDurationAndAutoCalc);
  }
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookings-tbody');
  // Step 4: Show ALL active, pending, future bookings — not just today
  const bookings = getMyAllBookings();

  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No active or upcoming bookings.</td></tr>`;
    return;
  }

  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const isOwn = b => b.staff_id === CURRENT_USER.id;

  tbody.innerHTML = sorted.map(b => {
    const priorityClass = priorityBadgeClass(b.priority);
    const ownRow = isOwn(b);
    const now = new Date();
    const [h, m] = b.start_time.split(':').map(Number);
    const bookingDate = new Date(b.date);
    bookingDate.setHours(h, m, 0, 0);
    const canEdit = bookingDate > now;

    const actionsCell = ownRow
      ? `<div class="td-actions">
           ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="openEditBookingModal('${b.booking_id || b.bookingId}')">Edit</button>` : `<button class="btn btn-outline btn-sm" disabled title="Past bookings cannot be edited" style="padding:3px 10px;font-size:.72rem;opacity:0.5;cursor:not-allowed;">Edit</button>`}
           <button class="btn btn-danger btn-sm" onclick="cancelBooking('${b.booking_id || b.bookingId}')">X</button>
         </div>`
      : `<span class="body-xs text-muted">${b.staff_name}</span>`;
    const rowStyle = ownRow ? '' : 'opacity:.82;';

    const statusClass = b.status === 'confirmed' ? 'badge-safe' : (b.status === 'pushed_back' ? 'badge-warning' : (b.status === 'cancelled' ? 'badge-overdue' : 'badge-safe'));
    const statusBadge = `<span class="badge ${statusClass}">${b.status}</span>`;

    return `<tr style="${rowStyle}">
      <td><strong>${b.equipment_name}</strong><br/><span style="font-size:.72rem;color:var(--text-muted);">${b.equipment_id}</span></td>
      <td>${b.patient_name || b.patientName || '---'}</td>
      <td>${formatDate(b.date)}</td>
      <td><strong>${b.start_time}</strong> - ${b.end_time}</td>
      <td><span class="badge ${priorityClass}">${b.priority}</span></td>
      <td>${statusBadge}</td>
      <td>${actionsCell}</td>
    </tr>`;
  }).join('');
}

/* ── BOOKING HANDLER ──────── */
async function executeBookingPayload(payload, interventionReason, durationMins, maxSlot, eqObj, patient) {
  try {
    const res = await fetch(`${Auth.BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message) errMsg = errJson.message;
      } catch (e) {}
      throw new Error(errMsg || 'Failed to create booking.');
    }
    const resJson = await res.json();

    if (interventionReason) {
      try {
        await fetch(`${Auth.BASE_URL}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hospital_id: 'HOSP-001',
            target_staff_id: 'ADM-001',
            type: 'extended_booking_intervention',
            severity: 'warning',
            message: `Extended booking (${durationMins} mins vs ${maxSlot} min limit) for "${eqObj ? eqObj.name : payload.equipment_id}" by ${CURRENT_USER.name}. Patient: ${patient}. Reason: ${interventionReason}`,
            timestamp: new Date().toISOString(),
            read: false
          })
        });
      } catch (err) { console.error('Failed to send intervention notification', err); }
    }

    DB = await Auth.loadDB();
    document.getElementById('booking-form').reset();
    document.getElementById('bk-date').value = TODAY_STR;
    document.getElementById('bk-dept').value = CURRENT_USER.department || '';
    const durHint = document.getElementById('bk-duration-hint');
    if (durHint) { durHint.innerHTML = ''; durHint.classList.remove('visible'); }

    hideAlert('booking-error');
    renderBookingsTable();
    const schedulePicker = document.getElementById('staff-schedule-date-picker');
    const scheduleDate = schedulePicker ? schedulePicker.value || TODAY_STR : TODAY_STR;
    renderSchedule(getMyBookingsForDate(scheduleDate), scheduleDate);
    loadDashboard();
    
    if (resJson.data && resJson.data.status === 'PENDING_TRIAGE') {
      showToast('Booking submitted but pending triage due to high emergency conflict.', 'warning');
      showAlert('booking-error', 'Slot occupied by another High Emergency. Escalated to Admin for immediate triage.');
    } else {
      showToast(`Booking for ${patient} confirmed.`, 'success');
    }
  } catch (err) {
    showAlert('booking-error', err.message);
    showToast(err.message, 'error');
  }
}

async function handleBooking(e) {
  e.preventDefault();
  hideAlert('booking-error');
  hideAlert('pushback-info');

  const equipInput = document.getElementById('bk-equipment').value;
  const match = equipInput.match(/\((IM-\d+)\)/);
  if (!match) {
    showToast('Please select a valid equipment from the list.', 'error');
    return;
  }
  const equipId = match[1];

  const patient = document.getElementById('bk-patient').value.trim();
  const date = document.getElementById('bk-date').value;
  const startStr = document.getElementById('bk-start').value;
  const endStr = document.getElementById('bk-end').value;
  const priority = document.getElementById('bk-priority').value;
  const dept = document.getElementById('bk-dept').value.trim();

  if (!equipId || !patient || !date || !startStr || !endStr || !priority || !dept) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (startStr === endStr) {
    showToast('Start and end time cannot be the same.', 'error');
    return;
  }

  if (date === TODAY_STR) {
    const nowLocal = new Date();
    const currentMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    const [h, m] = startStr.split(':').map(Number);
    if ((h * 60 + m) <= currentMins) {
      showToast('Cannot book an appointment for a past time today.', 'error');
      return;
    }
  }

  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const durationMins = (eh * 60 + em) - (sh * 60 + sm);

  const eqObj = DB.immovable_equipment.find(e => e.id === equipId);
  const maxSlot = (eqObj && (eqObj.slot_duration_mins || eqObj.slotDurationMins)) ? (eqObj.slot_duration_mins || eqObj.slotDurationMins) : 180;

  const payload = {
    patient_name: patient,
    patientName: patient,
    date: date,
    start_time: startStr,
    startTime: startStr,
    end_time: endStr,
    endTime: endStr,
    priority: priority,
    department: dept,
    equipment_id: equipId,
    equipmentId: equipId,
    staff_id: CURRENT_USER.id,
    staffId: CURRENT_USER.id
  };

  if (durationMins > maxSlot) {
    const modal = document.getElementById('clinical-justification-modal');
    if (modal) {
      document.getElementById('clinical-modal-subtitle').textContent =
        `Booking duration (${durationMins} mins) exceeds standard slot limit (${maxSlot} mins) for ${eqObj ? eqObj.name : 'this equipment'}. Please state clinical justification / reason:`;
      document.getElementById('clinical-reason-input').value = '';
      modal.classList.add('active');
      modal.style.display = 'flex';

      const closeFn = () => {
        modal.classList.remove('active');
        modal.style.display = 'none';
      };

      document.getElementById('clinical-modal-close').onclick = closeFn;
      document.getElementById('clinical-modal-cancel').onclick = () => {
        closeFn();
        showToast('Booking cancelled: Clinical reason required for extended bookings.', 'warning');
      };

      document.getElementById('clinical-modal-confirm').onclick = () => {
        const reason = document.getElementById('clinical-reason-input').value.trim();
        if (!reason) {
          showToast('Please enter a clinical justification.', 'error');
          return;
        }
        closeFn();
        executeBookingPayload(payload, reason, durationMins, maxSlot, eqObj, patient);
      };
      return;
    }
  }

  executeBookingPayload(payload, '', durationMins, maxSlot, eqObj, patient);
}

async function cancelBooking(bookingId) {
  if (await appConfirm('Cancel Appointment', 'Are you sure you want to cancel this equipment booking?', 'Cancel Booking')) {
    try {
      const res = await fetch(`${Auth.BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'PUT'
      });
      if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.message) errMsg = errJson.message;
        } catch (e) {}
        throw new Error(errMsg || 'Failed to cancel booking.');
      }
      DB = await Auth.loadDB();
    } catch (e) {
      showToast(e.message, 'error');
      console.error(e);
      return;
    }
    renderBookingsTable();
    const schedulePicker2 = document.getElementById('staff-schedule-date-picker');
    const scheduleDate2 = schedulePicker2 ? schedulePicker2.value || TODAY_STR : TODAY_STR;
    renderSchedule(getMyBookingsForDate(scheduleDate2), scheduleDate2);
    loadDashboard();
    showToast('Booking cancelled successfully', 'success');
  }
}

/* ────────────────────────────────────────────────
   NOTIFICATIONS TAB
──────────────────────────────────────────────── */
function loadNotificationsTab() {
  const notifs = getMyNotifications();
  renderNotifFeed(notifs, 'all-notif-list', 'all-notif-subtitle');
}

async function deleteSingleNotification(id) {
  try {
    const res = await fetch(`${Auth.BASE_URL}/notifications/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    DB.notifications = DB.notifications.filter(n => n.id !== id);
    loadNotificationsTab();
    loadDashboard();
    showToast('Notification deleted.', 'success');
  } catch (err) {
    showToast('Failed to delete notification.', 'error');
  }
}

function renderNotifFeed(notifs, containerId, subtitleId) {
  const el = document.getElementById(containerId);
  const sub = document.getElementById(subtitleId);

  // Filter out persistent test or dummy notifications
  const cleanNotifs = notifs.filter(n => n.message && !n.message.toLowerCase().includes('persistant test'));

  if (sub) {
    const unread = cleanNotifs.filter(n => !n.read).length;
    sub.textContent = `${cleanNotifs.length} notification${cleanNotifs.length !== 1 ? 's' : ''} · ${unread} unread`;
  }

  if (!cleanNotifs.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"></div>
      <div class="empty-state-title">No notifications</div>
      <div class="empty-state-desc">You're all caught up!</div>
    </div>`;
    return;
  }

  // Step 3: Sort strictly DESC — triage/emergency always at top, then by timestamp
  const typePriority = { triage_conflict: 0, displacement_warning: 1, pushback_failsafe: 1, critical_overdue: 2, pushback_alert: 3 };
  const sortedNotifs = [...cleanNotifs].sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    const pA = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
    const pB = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
    if (pA !== pB) return pA - pB;
    return tB - tA; // newest first within same priority
  });

  // Segregate date-wise (using sorted list)
  const groups = {};
  sortedNotifs.forEach(n => {

    let groupKey = 'Older Notifications';
    if (n.timestamp) {
      const dStr = n.timestamp.split('T')[0];
      const todayStr = TODAY_STR;
      const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
      const yestStr = yestDate.toISOString().split('T')[0];

      if (dStr === todayStr) groupKey = 'Today';
      else if (dStr === yestStr) groupKey = 'Yesterday';
      else groupKey = formatDate(dStr);
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(n);
  });

  let html = '';
  for (const [groupTitle, list] of Object.entries(groups)) {
    html += `<div style="font-weight:700;font-size:.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px;">${groupTitle}</div>`;
    html += list.map(n => {
      const dotClass = severityDotClass(n.severity);
      const time = n.timestamp
        ? new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';
      const unreadStyle = !n.read ? 'font-weight:600;background:rgba(2,132,199,.04);' : 'opacity:.82;';
      return `
      <div class="notif-item" style="${unreadStyle}display:flex;align-items:center;justify-space:between;padding:12px 14px;border-radius:8px;margin-bottom:8px;border:1px solid rgba(0,0,0,.06);">
        <div style="display:flex;align-items:flex-start;gap:12px;flex:1;">
          <div class="notif-dot ${dotClass}" style="margin-top:4px;"></div>
          <div class="notif-content">
            <p style="margin:0;">${n.message}</p>
            <time style="font-size:.72rem;color:var(--text-muted);">${time} · ${n.type.replace(/_/g, ' ')}</time>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="deleteSingleNotification('${n.id}')" title="Delete Notification" style="padding:4px 8px;font-size:.72rem;color:var(--status-overdue);border-color:rgba(239,68,68,.3);">Delete</button>
      </div>`;
    }).join('');
  }

  el.innerHTML = html;
}

async function markAllRead() {
  try {
    const res = await fetch(`${Auth.BASE_URL}/notifications/staff/${CURRENT_USER.id}/read-all`, { method: 'PUT' });
    if (!res.ok) throw new Error(await res.text());

    getMyNotifications().forEach(n => n.read = true);
    updateBadges(0);
    loadNotificationsTab();
    showToast('All notifications marked as read.', 'success');
  } catch (err) {
    console.error('Failed to mark all as read:', err);
    showToast('Failed to mark notifications read.', 'error');
  }
}

function updateBadges(count) {
  const badge = document.getElementById('notif-badge');
  const bellCount = document.getElementById('bell-count');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-flex';
    bellCount.textContent = count;
    bellCount.style.display = 'flex';
  } else {
    badge.style.display = 'none';
    bellCount.style.display = 'none';
  }
}

/* ────────────────────────────────────────────────
   DATA HELPERS
──────────────────────────────────────────────── */
function getMyCheckouts() {
  return DB.checkouts.filter(c =>
    c.staff_id === CURRENT_USER.id &&
    c.status !== 'completed' &&
    c.status !== 'returned' &&
    c.status !== 'cancelled'
  ).sort((a, b) => (b.checkout_id || '').localeCompare(a.checkout_id || ''));
}

/* All bookings for today across the whole hospital */
function getTodayBookings() {
  return DB.bookings.filter(b => b.date === TODAY_STR);
}

/* All active and future bookings for this staff member (no date restriction) — used by the bookings table */
function getMyAllBookings() {
  return DB.bookings.filter(b =>
    b.staff_id === CURRENT_USER.id &&
    b.status !== 'cancelled'
  ).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });
}

/* Just this staff member's bookings for a specific date (used on Dashboard schedule) */
function getMyBookingsForDate(dateStr) {
  return DB.bookings.filter(b =>
    b.date === dateStr && b.staff_id === CURRENT_USER.id
  );
}

/* This staff member's bookings for today */
function getMyTodayBookings() {
  return getMyBookingsForDate(TODAY_STR);
}

/* ALL active & future bookings for this staff member (no date restriction) */
function getMyUpcomingBookings() {
  return DB.bookings.filter(b =>
    b.staff_id === CURRENT_USER.id &&
    b.date >= TODAY_STR &&
    b.status !== 'cancelled'
  );
}

function getMyNotifications() {
  return DB.notifications.filter(n =>
    n.target_staff_id === CURRENT_USER.id ||
    n.target_staff_id === 'all'
  );
}

/* ────────────────────────────────────────────────
   DATE / TIME UTILITIES
──────────────────────────────────────────────── */
function getDueStatus(dueDateStr) {
  const today = new Date(TODAY_STR);
  const due = new Date(dueDateStr);
  const diffMs = due - today;
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'warning';
  return 'safe';
}

function daysLeftNum(dueDateStr) {
  const today = new Date(TODAY_STR);
  const due = new Date(dueDateStr);
  return Math.ceil((due - today) / 86400000);
}

function daysUntilDue(dueDateStr, asNumeric = false) {
  const n = daysLeftNum(dueDateStr);
  if (asNumeric) return n;
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) !== 1 ? 's' : ''} overdue`;
  if (n === 0) return 'Due today';
  return `${n} day${n !== 1 ? 's' : ''} remaining`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function timesOverlap(s1, e1, s2, e2) {
  const parse = t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const start1 = parse(s1);
  const end1 = parse(e1);
  const start2 = parse(s2);
  const end2 = parse(e2);

  const getIntervals = (s, e) => {
    if (e < s) return [[s, 1440], [0, e]];
    return [[s, e]];
  };

  const i1 = getIntervals(start1, end1);
  const i2 = getIntervals(start2, end2);

  for (const [a, b] of i1) {
    for (const [c, d] of i2) {
      if (a < d && b > c) return true;
    }
  }
  return false;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ────────────────────────────────────────────────
   UI HELPERS
──────────────────────────────────────────────── */
function showAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  const textEl = el.querySelector('span:last-child') || el;
  const spanId = id + '-text';
  const span = document.getElementById(spanId);
  if (span) span.textContent = msg;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-msg">${msg}</span>
    <button class="toast-dismiss" aria-label="Dismiss">✕</button>`;
  toast.querySelector('.toast-dismiss').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function priorityBadgeClass(priority) {
  if (!priority) return 'badge-neutral';
  const p = priority.toLowerCase();

  if (p.includes('high') || p === 'emergency') return 'badge-overdue';
  if (p.includes('low')) return 'badge-warning';
  if (p.includes('normal')) return 'badge-safe';
  if (p.includes('elective')) return 'badge-info';

  return 'badge-neutral';
}

function severityDotClass(severity) {
  const map = { critical: 'critical', warning: 'warning', info: 'info', success: 'success' };
  return map[severity] || 'info';
}
/* ────────────────────────────────────────────────
   PROFILE TAB
──────────────────────────────────────────────── */
function loadProfileTab() {
  renderUserProfile();
}

function renderUserProfile() {
  const u = CURRENT_USER;
  document.getElementById('prof-avatar').textContent = u.name.charAt(0).toUpperCase();
  document.getElementById('prof-name').textContent = u.name;
  document.getElementById('prof-role-dept').textContent = `${u.role} · ${u.department}`;
  document.getElementById('prof-id-badge').textContent = `ID: ${u.id}`;
  document.getElementById('prof-email').textContent = u.email || '---';
  document.getElementById('prof-phone').textContent = u.phone || '---';
  document.getElementById('prof-address').textContent = u.address || '---';
  document.getElementById('prof-emergency').textContent = u.emergency_contact || '---';
  document.getElementById('prof-joined').textContent = u.joined_year || '---';
  document.getElementById('prof-experience').textContent = u.experience || '---';
}

function openEditProfileModal() {
  const u = CURRENT_USER;
  document.getElementById('edit-prof-email').value = u.email || '';
  document.getElementById('edit-prof-phone').value = u.phone || '';
  document.getElementById('edit-prof-address').value = u.address || '';
  document.getElementById('edit-prof-emergency').value = u.emergency_contact || '';
  document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
  document.getElementById('edit-profile-modal').classList.remove('active');
}

async function handleSaveProfile() {
  const email = document.getElementById('edit-prof-email').value.trim();
  const phone = document.getElementById('edit-prof-phone').value.trim();
  const address = document.getElementById('edit-prof-address').value.trim();
  const emergency = document.getElementById('edit-prof-emergency').value.trim();

  if (!email || !phone || !address || !emergency) {
    showToast('All fields are required.', 'error');
    return;
  }

  // Update CURRENT_USER and DB state
  const updatedData = {
    email: email,
    phone: phone,
    address: address,
    emergency_contact: emergency
  };

  try {
    const res = await fetch(`${Auth.BASE_URL}/staff/${CURRENT_USER.id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (!res.ok) throw new Error(await res.text());

    // Update local state only after successful backend sync
    Object.assign(CURRENT_USER, updatedData);

    // Persist to DB object (for session)
    const staffIndex = DB.staff.findIndex(s => s.id === CURRENT_USER.id);
    if (staffIndex !== -1) {
      DB.staff[staffIndex] = { ...CURRENT_USER };
    }

    // Re-render UI
    renderUserProfile();
  } catch (err) {
    console.error('Failed to update profile:', err);
    showToast('Failed to save profile changes to server.', 'error');
    return;
  }

  // Sync sidebar if necessary (name/role)
  document.getElementById('nav-name').textContent = CURRENT_USER.name;
  document.getElementById('nav-role').textContent = `${CURRENT_USER.role} · ${CURRENT_USER.department}`;

  closeEditProfileModal();
  showToast('Profile updated successfully!', 'success');
}

/* ────────────────────────────────────────────────
   EDIT BOOKING MODAL
──────────────────────────────────────────────── */
