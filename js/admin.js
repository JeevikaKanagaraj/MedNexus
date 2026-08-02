/**
 * MedNexus – Admin Dashboard Logic
 * File: js/admin.js
 *
 * Business Rules Enforced:
 *  [AD-1]  Auth guard: only ADM- prefixed IDs allowed
 *  [AD-2]  Capacity counters computed live from data
 *  [AD-3]  Critical Overdue panel: all checkouts past due date
 *  [AD-4]  Failsafe Alerts: pushback_failsafe notifications from any staff
 *  [AD-5]  Orphan Prevention: cannot remove staff with active checkouts
 *  [AD-6]  Cannot remove equipment that is currently checked out
 *  [AD-7]  Long Overdue Alerts: If item is > 7 days overdue, generate critical alert
 */

'use strict';

/* ──────────────────────────────────────────
   STATE
────────────────────────────────────────── */
let DB = null;
let ADMIN_USER = null;

const TODAY_STR = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

/* Targets for modals */
let removeEqTarget = null;   // { type: 'movable'|'immovable', id }
let removeStaffTarget = null; // staff id


document.addEventListener('DOMContentLoaded', async () => {
    /* [AD-1] Auth guard */
    if (!Auth.guard('ADM-')) return;
    const userId = Auth.getUser().id;

    try {
        DB = await Auth.loadDB();
    } catch (err) {
        showToast('Failed to load application data. Please check the data/data.json file.', 'error');
        console.error('loadDB error:', err);
        return;
    }

    ADMIN_USER = DB.staff.find(s => s.id === userId);
    if (!ADMIN_USER) {
        showToast('Admin record not found. Redirecting…', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    initUI();

    const savedTab = localStorage.getItem('adminActiveTab') || 'dashboard';
    const navEl = document.querySelector(`.nav-item[data-tab="${savedTab}"]`);
    switchTab(savedTab, navEl);

    checkOverdueAlerts();
});

/* ──────────────────────────────────────────
   UI INIT
────────────────────────────────────────── */
function initUI() {
    /* Date */
    const now = new Date();
    document.getElementById('topbar-date').textContent =
        now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    /* Sidebar user */
    document.getElementById('nav-name').textContent = ADMIN_USER.name;
    document.getElementById('nav-role').textContent = `${ADMIN_USER.role} · ${ADMIN_USER.department}`;
    document.getElementById('nav-avatar').textContent = ADMIN_USER.name.charAt(0).toUpperCase();

    /* Tab nav */
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

    /* Logout */
    document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());

    /* Profile events */
    document.getElementById('edit-profile-btn').addEventListener('click', openEditProfileModal);
    document.getElementById('edit-profile-close').addEventListener('click', closeEditProfileModal);
    document.getElementById('edit-profile-cancel').addEventListener('click', closeEditProfileModal);
    document.getElementById('edit-profile-save').addEventListener('click', handleSaveAdminProfile);

    /* Add forms */
    document.getElementById('mv-add-form').addEventListener('submit', handleAddMovable);
    document.getElementById('im-add-form').addEventListener('submit', handleAddImmovable);
    document.getElementById('staff-add-form').addEventListener('submit', handleAddStaff);

    /* Remove Equipment Modal */
    document.getElementById('remove-eq-close').addEventListener('click', closeRemoveEqModal);
    document.getElementById('remove-eq-cancel').addEventListener('click', closeRemoveEqModal);
    document.getElementById('remove-eq-confirm').addEventListener('click', confirmRemoveEquipment);

    /* Remove Staff Modal */
    document.getElementById('remove-staff-close').addEventListener('click', closeRemoveStaffModal);
    document.getElementById('remove-staff-cancel').addEventListener('click', closeRemoveStaffModal);
    document.getElementById('remove-staff-confirm').addEventListener('click', confirmRemoveStaff);

    /* Checkout filter */
    document.getElementById('checkout-filter').addEventListener('change', loadAllCheckouts);

    /* Booking date filter */
    document.getElementById('booking-date-filter').value = '';
    document.getElementById('booking-date-filter').addEventListener('change', loadAllBookings);

    /* Clear alerts */
    document.getElementById('clear-alerts-btn').addEventListener('click', clearAlertHistory);
}

function switchTab(tabId, navEl) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    if (navEl) navEl.classList.add('active');

    const labels = {
        dashboard: 'Dashboard',
        'movable-inv': 'Movable Equipment',
        'immovable-inv': 'Immovable Equipment',
        'staff-mgmt': 'Staff Management',
        'all-checkouts': 'All Checkouts',
        'ext-requests': 'Extension Requests',
        'all-bookings': 'All Bookings',
        'alert-history': 'Alert History',
        profile: 'Admin Profile'
    };
    document.getElementById('topbar-title').textContent = labels[tabId] || tabId;
    localStorage.setItem('adminActiveTab', tabId);

    // [FIX] Call loaders based on tab
    switch (tabId) {
        case 'dashboard': loadDashboard(); break;
        case 'movable-inv': loadMovableInv(); break;
        case 'immovable-inv': loadImmovableInv(); break;
        case 'staff-mgmt': loadStaffTab(); break;
        case 'all-checkouts': loadAllCheckouts(); break;
        case 'ext-requests': loadExtRequestsTab(); break;
        case 'all-bookings': loadAllBookings(); break;
        case 'alert-history': loadAlertHistoryTab(); break;
        case 'profile': loadProfileTab(); break;
    }
}

/* ──────────────────────────────────────────
   DASHBOARD TAB  [AD-2][AD-3][AD-4]
────────────────────────────────────────── */
async function loadDashboard() {
    /* [AD-2] Capacity counters */
    const allActive = DB.checkouts.filter(c => c.status === 'active');
    const overdueList = allActive.filter(c => getDueStatus(c.due_date) === 'overdue');
    const todayBookings = DB.bookings.filter(b => b.date === TODAY_STR);
    const failsafeNotifs = getFailsafeNotifs();

    /* [TRIAGE] Load & render pending triage bookings */
    await loadTriagePanel();

    /* Update alerts badge (Failsafe + Critical Overdue + Triage) */
    const badge = document.getElementById('failsafe-badge');
    const allAlerts = getAlertHistory();
    if (allAlerts.length > 0) {
        badge.textContent = allAlerts.length;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }

    /* 5 stat cards (Clickable / Teleport UX) */
    document.getElementById('admin-stats-row').innerHTML = `
    <div class="stat-card" style="cursor: pointer;" onclick="switchTab('movable-inv', document.getElementById('nav-movable-inv'))">
      <div class="stat-card-icon blue"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg></div>
      <div>
        <div class="stat-value">${DB.movable_equipment.length}</div>
        <div class="stat-label">Movable Equipment</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="switchTab('immovable-inv', document.getElementById('nav-immovable-inv'))">
      <div class="stat-card-icon orange"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3.4l2.1-9.5a1 1 0 0 1 1.9 0l3.2 15a1 1 0 0 0 1.9 0l2.1-9.5H21"/></svg></div>
      <div>
        <div class="stat-value">${DB.immovable_equipment.length}</div>
        <div class="stat-label">Immovable Assets</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="document.getElementById('checkout-filter').value = 'active'; switchTab('all-checkouts', document.getElementById('nav-all-checkouts')); loadAllCheckouts();">
      <div class="stat-card-icon teal"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>
      <div>
        <div class="stat-value">${allActive.length}</div>
        <div class="stat-label">Currently Checked Out</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="document.getElementById('checkout-filter').value = 'overdue'; switchTab('all-checkouts', document.getElementById('nav-all-checkouts')); loadAllCheckouts();">
      <div class="stat-card-icon red"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
      <div>
        <div class="stat-value danger">${overdueList.length}</div>
        <div class="stat-label">Overdue Items</div>
      </div>
    </div>
    <div class="stat-card" style="cursor: pointer;" onclick="switchTab('all-bookings', document.getElementById('nav-all-bookings'))">
      <div class="stat-card-icon navy"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div>
      <div>
        <div class="stat-value">${todayBookings.length}</div>
        <div class="stat-label">Today's Bookings</div>
      </div>
    </div>`;

    /* [AD-3] Critical Overdue Panel - show empty state when empty */
    const overdueEl = document.getElementById('overdue-panel-body');
    const overduePanel = document.getElementById('overdue-panel');
    if (overduePanel) {
        overduePanel.style.display = '';
        if (overdueList.length > 0) overduePanel.classList.add('alert-banner-panel');
        else overduePanel.classList.remove('alert-banner-panel');
    }
    
    if (!overdueList.length) {
        if (overdueEl) overdueEl.innerHTML = '<div class="empty-state" style="padding: 20px;">No overdue equipment.</div>';
    } else {
        overdueEl.innerHTML = `<div style="padding:8px 0 4px;">` +
            overdueList.map(c => {
                const daysOver = Math.abs(daysLeftNum(c.due_date));
                return `<div class="asset-row overdue" style="margin-bottom:10px;padding:14px 16px;background:rgba(239,68,68,.04);border-radius:10px;border:1px solid rgba(239,68,68,.12);">
          <div class="asset-info" style="flex:1;">
            <div class="asset-name">${c.equipment_name} <span class="mono" style="font-size:.7rem;">${c.equipment_id}</span></div>
            <div class="asset-meta">
              Staff: <strong>${c.staff_name}</strong> (${c.staff_id}) &middot;
              Due: <strong>${formatDate(c.due_date)}</strong> &middot;
              <span style="color:var(--status-overdue);font-weight:700;">${daysOver} day${daysOver !== 1 ? 's' : ''} overdue</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <span class="badge badge-overdue">Overdue</span>
            <button class="btn btn-danger btn-sm" onclick="sendOverdueAlert('${c.checkout_id}')" title="Send urgent return alert to ${c.staff_name}">⚠️ Send Alert</button>
          </div>
        </div>`;
            }).join('') + `</div>`;
    }

    /* [AD-4] Failsafe Alerts Panel - show empty state when empty */
    const failsafeEl = document.getElementById('failsafe-panel-body');
    const failsafePanel = document.getElementById('failsafe-panel');
    if (failsafePanel) {
        failsafePanel.style.display = '';
        }

    if (!failsafeNotifs.length) {
        if (failsafePanel) {
            failsafePanel.style.display = '';
            
        }
        renderFailsafeList(failsafeEl, failsafeNotifs.slice(0, 5));
    }

    /* Movable Equipment Doughnut Chart Visualizer */
    function renderMovableDoughnut(mvCheckouts, sortedMovable) {
        const total = mvCheckouts.length;
        if (total === 0) {
            return `<div style="text-align:center;color:var(--text-muted);padding:24px 0;">No checkouts recorded for selected date period.</div>`;
        }

        let active = 0, returned = 0, overdue = 0;
        mvCheckouts.forEach(c => {
            const isComp = c.status === 'returned' || c.status === 'completed';
            if (isComp) {
                returned++;
            } else if (getDueStatus(c.due_date || c.dueDate) === 'overdue') {
                overdue++;
            } else {
                active++;
            }
        });

        const circumference = 251.32; // 2 * PI * 40
        const activePct = (active / total) || 0;
        const returnedPct = (returned / total) || 0;
        const overduePct = (overdue / total) || 0;

        const activeDash = activePct * circumference;
        const returnedDash = returnedPct * circumference;
        const overdueDash = overduePct * circumference;

        const offset1 = 0;
        const offset2 = -activeDash;
        const offset3 = -(activeDash + returnedDash);

        const topItems = sortedMovable.slice(0, 3).filter(x => x.count > 0);

        return `
        <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap:20px; padding:8px 0;">
            <!-- Donut Chart -->
            <div style="position:relative; width:130px; height:130px; display:flex; align-items:center; justify-content:center;">
                <svg width="130" height="130" viewBox="0 0 100 100" style="transform:rotate(-90deg);">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F3F4F6" stroke-width="14" />
                    <!-- Active -->
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#2563EB" stroke-width="14"
                        stroke-dasharray="${activeDash} ${circumference}" stroke-dashoffset="${offset1}" style="transition: stroke-dasharray .6s ease;" />
                    <!-- Returned -->
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" stroke-width="14"
                        stroke-dasharray="${returnedDash} ${circumference}" stroke-dashoffset="${offset2}" style="transition: stroke-dasharray .6s ease;" />
                    <!-- Overdue -->
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EF4444" stroke-width="14"
                        stroke-dasharray="${overdueDash} ${circumference}" stroke-dashoffset="${offset3}" style="transition: stroke-dasharray .6s ease;" />
                </svg>
                <div style="position:absolute; text-align:center;">
                    <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary); line-height:1;">${total}</div>
                    <div style="font-size:.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin-top:2px;">Total</div>
                </div>
            </div>

            <!-- Donut Legend -->
            <div style="flex:1; min-width:180px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:.82rem; padding:4px 10px; background:rgba(37,99,235,.06); border-radius:6px;">
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:#2563EB;"></span>
                        <span>Active Checkouts</span>
                    </span>
                    <strong style="color:#2563EB;">${active} (${Math.round(activePct*100)}%)</strong>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:.82rem; padding:4px 10px; background:rgba(16,185,129,.06); border-radius:6px;">
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:#10B981;"></span>
                        <span>Returned</span>
                    </span>
                    <strong style="color:#10B981;">${returned} (${Math.round(returnedPct*100)}%)</strong>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; font-size:.82rem; padding:4px 10px; background:rgba(239,68,68,.06); border-radius:6px;">
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:#EF4444;"></span>
                        <span>Overdue</span>
                    </span>
                    <strong style="color:#EF4444;">${overdue} (${Math.round(overduePct*100)}%)</strong>
                </div>
            </div>
        </div>

        <!-- Top Utilized Movable Items -->
        ${topItems.length ? `
        <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border-subtle);">
            <div style="font-size:.73rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">Most Utilized Equipment</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${topItems.map(item => `
                    <div style="background:var(--bg-secondary); border:1px solid var(--border-subtle); padding:4px 10px; border-radius:8px; font-size:.78rem; display:flex; align-items:center; gap:8px;">
                        <strong>${item.name}</strong>
                        <span style="background:var(--primary-nav); color:#fff; font-size:.7rem; font-weight:700; padding:1px 6px; border-radius:99px;">${item.count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        `;
    }

    /* Immovable Equipment Metric Grid & Priority Area Visualizer */
    function renderImmovableMetrics(imBookings, sortedImmovable) {
        const total = imBookings.length;
        if (total === 0) {
            return `<div style="text-align:center;color:var(--text-muted);padding:24px 0;">No bookings recorded for selected date period.</div>`;
        }

        let highEmergency = 0, emergency = 0, normal = 0, routine = 0;
        imBookings.forEach(b => {
            const p = (b.priority || '').toLowerCase();
            if (p === 'high emergency') highEmergency++;
            else if (p === 'emergency' || p === 'low emergency') emergency++;
            else if (p === 'routine' || p === 'elective') routine++;
            else normal++;
        });

        const topUnit = sortedImmovable.length && sortedImmovable[0].count > 0 ? sortedImmovable[0] : null;
        const emergencyTotal = highEmergency + emergency;
        const emergencyPct = Math.round((emergencyTotal / total) * 100) || 0;

        return `
        <!-- Immovable Compact Metric Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
            <div style="background:rgba(37,99,235,.05); border:1px solid rgba(37,99,235,.15); padding:10px 12px; border-radius:10px;">
                <div style="font-size:.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Total Bookings</div>
                <div style="font-size:1.3rem; font-weight:800; color:var(--action-btn); margin-top:2px;">${total}</div>
            </div>
            <div style="background:rgba(239,68,68,.05); border:1px solid rgba(239,68,68,.15); padding:10px 12px; border-radius:10px;">
                <div style="font-size:.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Emergency Ratio</div>
                <div style="font-size:1.3rem; font-weight:800; color:#EF4444; margin-top:2px;">${emergencyPct}%</div>
            </div>
            <div style="background:rgba(16,185,129,.05); border:1px solid rgba(16,185,129,.15); padding:10px 12px; border-radius:10px;">
                <div style="font-size:.72rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Top Facility</div>
                <div style="font-size:.92rem; font-weight:700; color:#10B981; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${topUnit ? topUnit.name : 'N/A'}</div>
                <div style="font-size:.7rem; color:var(--text-muted);">${topUnit ? topUnit.count + ' bookings' : ''}</div>
            </div>
        </div>

        <!-- Priority Area Breakdown (Gradient Area Bars) -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border-subtle); padding:12px; border-radius:10px;">
            <div style="font-size:.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <span>Priority Distribution</span>
                <span style="font-size:.7rem; color:var(--text-secondary); font-weight:normal;">${total} total procedures</span>
            </div>
            
            <!-- Multi-segment Gradient Area Bar -->
            <div style="height:14px; width:100%; border-radius:99px; overflow:hidden; display:flex; margin-bottom:10px; background:#E5E7EB;">
                <div style="width:${(highEmergency/total)*100}%; background:linear-gradient(90deg, #DC2626, #EF4444);" title="High Emergency: ${highEmergency}"></div>
                <div style="width:${(emergency/total)*100}%; background:linear-gradient(90deg, #F59E0B, #FBBF24);" title="Emergency: ${emergency}"></div>
                <div style="width:${(normal/total)*100}%; background:linear-gradient(90deg, #2563EB, #60A5FA);" title="Normal: ${normal}"></div>
                <div style="width:${(routine/total)*100}%; background:linear-gradient(90deg, #10B981, #34D399);" title="Routine: ${routine}"></div>
            </div>

            <!-- Legend Chips -->
            <div style="display:flex; flex-wrap:wrap; gap:8px 14px; font-size:.75rem;">
                <span style="display:flex; align-items:center; gap:4px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:#DC2626;"></span>
                    <span>High Emergency: <strong>${highEmergency}</strong></span>
                </span>
                <span style="display:flex; align-items:center; gap:4px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:#F59E0B;"></span>
                    <span>Emergency: <strong>${emergency}</strong></span>
                </span>
                <span style="display:flex; align-items:center; gap:4px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:#2563EB;"></span>
                    <span>Normal: <strong>${normal}</strong></span>
                </span>
                <span style="display:flex; align-items:center; gap:4px;">
                    <span style="width:8px; height:8px; border-radius:50%; background:#10B981;"></span>
                    <span>Routine/Elective: <strong>${routine}</strong></span>
                </span>
            </div>
        </div>
        `;
    }


    // Movable Traffic Computation
    const mvFrom = document.getElementById('mv-from-date') ? document.getElementById('mv-from-date').value : '';
    const mvTo = document.getElementById('mv-to-date') ? document.getElementById('mv-to-date').value : '';

    let mvCheckouts = DB.checkouts;
    if (mvFrom) {
        mvCheckouts = mvCheckouts.filter(c => {
            const d = (c.checkout_date || c.checkoutDate || c.due_date || c.dueDate || '').toString().slice(0, 10);
            return d >= mvFrom;
        });
    }
    if (mvTo) {
        mvCheckouts = mvCheckouts.filter(c => {
            const d = (c.checkout_date || c.checkoutDate || c.due_date || c.dueDate || '').toString().slice(0, 10);
            return d <= mvTo;
        });
    }

    const mvSubEl = document.getElementById('mv-overview-subtitle');
    if (mvSubEl) {
        mvSubEl.textContent = (mvFrom || mvTo)
            ? `Filtered (${mvCheckouts.length} checkouts${mvFrom ? ' from ' + formatDate(mvFrom) : ''}${mvTo ? ' to ' + formatDate(mvTo) : ''})`
            : `All time statistics (${DB.checkouts.length} checkouts recorded)`;
    }

    const movableTraffic = {};
    DB.movable_equipment.forEach(eq => movableTraffic[eq.id] = { name: eq.name, id: eq.id, count: 0 });
    mvCheckouts.forEach(c => {
        const eqId = c.equipment_id || c.equipmentId;
        if (movableTraffic[eqId]) movableTraffic[eqId].count++;
    });
    const sortedMovable = Object.values(movableTraffic).sort((a, b) => b.count - a.count);

    document.getElementById('movable-traffic-container').innerHTML = renderMovableDoughnut(mvCheckouts, sortedMovable);

    // Immovable Traffic Computation
    const imFrom = document.getElementById('im-from-date') ? document.getElementById('im-from-date').value : '';
    const imTo = document.getElementById('im-to-date') ? document.getElementById('im-to-date').value : '';

    let imBookings = DB.bookings;
    if (imFrom) {
        imBookings = imBookings.filter(b => {
            const d = (b.date || '').toString().slice(0, 10);
            return d >= imFrom;
        });
    }
    if (imTo) {
        imBookings = imBookings.filter(b => {
            const d = (b.date || '').toString().slice(0, 10);
            return d <= imTo;
        });
    }

    const imSubEl = document.getElementById('im-overview-subtitle');
    if (imSubEl) {
        imSubEl.textContent = (imFrom || imTo)
            ? `Filtered (${imBookings.length} bookings${imFrom ? ' from ' + formatDate(imFrom) : ''}${imTo ? ' to ' + formatDate(imTo) : ''})`
            : `All time statistics (${DB.bookings.length} bookings recorded)`;
    }

    const immovableTraffic = {};
    DB.immovable_equipment.forEach(eq => immovableTraffic[eq.id] = { name: eq.name, id: eq.id, count: 0 });
    imBookings.forEach(b => {
        const eqId = b.equipment_id || b.equipmentId;
        if (immovableTraffic[eqId]) immovableTraffic[eqId].count++;
    });
    const sortedImmovable = Object.values(immovableTraffic).sort((a, b) => b.count - a.count);

    document.getElementById('immovable-traffic-container').innerHTML = renderImmovableMetrics(imBookings, sortedImmovable);


    /* Admin Schedule — with date picker support */
    const schedulePicker = document.getElementById('admin-schedule-date-picker');
    const scheduleDate = schedulePicker ? (schedulePicker.value || TODAY_STR) : TODAY_STR;
    const filteredBookings = DB.bookings.filter(b => b.date === scheduleDate);
    const tbody = document.getElementById('admin-schedule-tbody');
    const schedLabel = document.getElementById('admin-schedule-label');
    if (schedLabel) schedLabel.textContent = `All bookings for ${formatDate(scheduleDate)}`;
    if (schedulePicker && !schedulePicker.value) schedulePicker.value = TODAY_STR;
    if (!filteredBookings.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">No bookings on this date.</td></tr>`;
    } else {
        tbody.innerHTML = filteredBookings
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(b => {
                const pClass = priorityBadgeClass(b.priority);
                return `<tr>
          <td><strong>${b.equipment_name}</strong><br/><span style="font-size:.72rem;color:var(--text-muted);">${b.equipment_id}</span></td>
          <td>${b.patient_name}</td>
          <td>${b.staff_name}<br/><span style="font-size:.72rem;color:var(--text-muted);">${b.staff_id}</span></td>
          <td><strong>${b.start_time}</strong> → ${b.end_time}</td>
          <td><span class="badge ${pClass}">${b.priority}</span></td>
          <td>${b.department}</td>
        </tr>`;
            }).join('');
    }
}

function applyMovableFilter() {
    const mvFrom = document.getElementById('mv-from-date').value;
    const mvTo = document.getElementById('mv-to-date').value;
    if (!mvFrom && !mvTo) {
        showToast('Please select a From or To date to apply filter.', 'warning');
        return;
    }
    loadDashboard();
    showToast(`Movable equipment filter applied${mvFrom ? ' from ' + formatDate(mvFrom) : ''}${mvTo ? ' to ' + formatDate(mvTo) : ''}.`, 'success');
}

function clearMovableFilter() {
    document.getElementById('mv-from-date').value = '';
    document.getElementById('mv-to-date').value = '';
    loadDashboard();
    showToast('Movable equipment date filter cleared.', 'info');
}

function applyImmovableFilter() {
    const imFrom = document.getElementById('im-from-date').value;
    const imTo = document.getElementById('im-to-date').value;
    if (!imFrom && !imTo) {
        showToast('Please select a From or To date to apply filter.', 'warning');
        return;
    }
    loadDashboard();
    showToast(`Immovable equipment filter applied${imFrom ? ' from ' + formatDate(imFrom) : ''}${imTo ? ' to ' + formatDate(imTo) : ''}.`, 'success');
}

function clearImmovableFilter() {
    document.getElementById('im-from-date').value = '';
    document.getElementById('im-to-date').value = '';
    loadDashboard();
    showToast('Immovable equipment date filter cleared.', 'info');
}

/* ──────────────────────────────────────────
   MOVABLE INVENTORY  [AD-6]
────────────────────────────────────────── */
function loadMovableInv() {
    const tbody = document.getElementById('mv-inv-tbody');
    const subtitle = document.getElementById('mv-inv-subtitle');
    const items = DB.movable_equipment;
    subtitle.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} registered`;

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">No movable equipment registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(eq => {
        const activeCheckout = DB.checkouts.find(c => c.equipment_id === eq.id && c.status === 'active');
        const statusBadge = activeCheckout
            ? `<span class="badge badge-warning">Checked Out</span>`
            : `<span class="badge badge-safe">Available</span>`;
        const canRemove = !activeCheckout;
        const removeBtn = canRemove
            ? `<button class="btn btn-danger btn-sm" onclick="openRemoveEqModal('${eq.id}','movable')">Remove</button>`
            : `<button class="btn btn-outline btn-sm" disabled title="Cannot remove — item is currently checked out">In Use</button>`;
        return `<tr>
      <td><span class="mono">${eq.id}</span></td>
      <td>
        <div style="font-weight:700; color:var(--text-primary);">${eq.name}</div>
        <div style="font-size:.72rem; color:var(--text-muted);">${eq.manufacturer || 'Unknown Mfr'}</div>
      </td>
      <td>${eq.category}</td>
      <td><span class="mono" style="font-size:.75rem;">${eq.serial_number || 'N/A'}</span></td>
      <td>${eq.location}</td>
      <td>${statusBadge}</td>
      <td>${removeBtn}</td>
    </tr>`;
    }).join('');
}

async function handleAddMovable(e) {
    e.preventDefault();
    hideAlert('mv-add-error');
    hideAlert('mv-add-success');

    const name = document.getElementById('mv-name').value.trim();
    const category = document.getElementById('mv-category').value.trim();
    const location = document.getElementById('mv-location').value.trim();
    const manufacturer = document.getElementById('mv-manufacturer').value.trim();
    const serial = document.getElementById('mv-serial').value.trim();
    const maintenance = parseInt(document.getElementById('mv-maintenance').value, 10);

    if (!name || !category || !location || !manufacturer || !serial || !maintenance) {
        showAlertMsg('mv-add-error', 'mv-add-error-text', 'All fields are required.');
        return;
    }

    const nextNum = DB.movable_equipment.length ? Math.max(...DB.movable_equipment.map(e => parseInt(e.id.split('-')[1]))) + 1 : 1;
    const newId = `MV-${String(nextNum).padStart(3, '0')}`;

    try {
        const payload = {
            id: newId,
            name, category, location, manufacturer, serial_number: serial, maintenance_cycle_days: maintenance,
            hospital_id: 'HOSP-001', status: 'available'
        };
        const res = await fetch(`${Auth.BASE_URL}/equipment/movable`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        showAlertMsg('mv-add-success', 'mv-add-success-text', `${name} added as ${newId}.`);
        document.getElementById('mv-add-form').reset();
        loadMovableInv();
        loadDashboard();
        showToast(`${name} added to inventory.`, 'success');
    } catch (err) {
        showAlertMsg('mv-add-error', 'mv-add-error-text', 'Failed to save to database.');
    }
}

function openRemoveEqModal(id, type) {
    const arr = type === 'movable' ? DB.movable_equipment : DB.immovable_equipment;
    const eq = arr.find(e => e.id === id);
    if (!eq) return;
    removeEqTarget = { id, type };
    document.getElementById('remove-eq-name').textContent = `${eq.name} (${id})`;
    document.getElementById('remove-eq-modal').classList.add('active');
}

function closeRemoveEqModal() {
    document.getElementById('remove-eq-modal').classList.remove('active');
    removeEqTarget = null;
}

async function confirmRemoveEquipment() {
    if (!removeEqTarget) return;
    const { id, type } = removeEqTarget;

    if (type === 'movable') {
        /* [AD-6] Double-check: not checked out */
        const active = DB.checkouts.find(c => c.equipment_id === id && c.status === 'active');
        if (active) {
            showToast('Cannot remove — equipment is currently checked out.', 'error');
            closeRemoveEqModal();
            return;
        }
    }

    try {
        const endpoint = type === 'movable' ? 'movable' : 'immovable';
        const res = await fetch(`${Auth.BASE_URL}/equipment/${endpoint}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        closeRemoveEqModal();
        if (type === 'movable') loadMovableInv(); else loadImmovableInv();
        loadDashboard();
        showToast('Equipment removed from inventory.', 'success');
    } catch (e) {
        showToast('Failed to remove equipment.', 'error');
        closeRemoveEqModal();
    }
}

/* ──────────────────────────────────────────
   IMMOVABLE INVENTORY
────────────────────────────────────────── */
function loadImmovableInv() {
    const tbody = document.getElementById('im-inv-tbody');
    const subtitle = document.getElementById('im-inv-subtitle');
    const items = DB.immovable_equipment;
    subtitle.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} registered`;

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--text-muted);">No immovable equipment registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(eq => {
        const todayBooked = DB.bookings.some(b => b.equipment_id === eq.id && b.status !== 'cancelled' && (b.date || '').startsWith(TODAY_STR));
        const canRemove = !todayBooked;
        const removeBtn = canRemove
            ? `<button class="btn btn-danger btn-sm" onclick="openRemoveEqModal('${eq.id}','immovable')">Remove</button>`
            : `<button class="btn btn-outline btn-sm" disabled title="Cannot remove — equipment has active bookings today">In Use</button>`;
        const statusBadge = todayBooked
            ? `<span class="badge badge-warning">Booked Today</span>`
            : `<span class="badge badge-safe">Available</span>`;
        return `<tr>
      <td><span class="mono">${eq.id}</span></td>
      <td>
        <div style="font-weight:700; color:var(--text-primary);">${eq.name}</div>
        <div style="font-size:.72rem; color:var(--text-muted);">${eq.manufacturer || 'Unknown Mfr'}</div>
      </td>
      <td>${eq.category}</td>
      <td>${eq.location}</td>
      <td>${eq.slot_duration_mins} min</td>
      <td>${eq.operating_hours_start} – ${eq.operating_hours_end}</td>
      <td>${removeBtn}</td>
    </tr>`;
    }).join('');
}

async function handleAddImmovable(e) {
    e.preventDefault();
    hideAlert('im-add-error');
    hideAlert('im-add-success');

    const name = document.getElementById('im-name').value.trim();
    const category = document.getElementById('im-category').value.trim();
    const location = document.getElementById('im-location').value.trim();
    const manufacturer = document.getElementById('im-manufacturer').value.trim();
    const slot = parseInt(document.getElementById('im-slot').value, 10);
    const start = document.getElementById('im-hours-start').value;
    const end = document.getElementById('im-hours-end').value;
    const notes = document.getElementById('im-notes').value.trim();

    if (!name || !category || !location || !manufacturer || !slot || !start || !end) {
        showAlertMsg('im-add-error', 'im-add-error-text', 'All fields are required.');
        return;
    }
    if (slot < 15 || slot > 480) {
        showAlertMsg('im-add-error', 'im-add-error-text', 'Slot duration must be between 15 and 480 minutes.');
        return;
    }
    if (start >= end) {
        showAlertMsg('im-add-error', 'im-add-error-text', 'Operating hours end time must be after start time.');
        return;
    }

    const nextNum = DB.immovable_equipment.length ? Math.max(...DB.immovable_equipment.map(e => parseInt(e.id.split('-')[1]))) + 1 : 1;
    const newId = `IM-${String(nextNum).padStart(3, '0')}`;

    try {
        const payload = {
            id: newId, name, category, location, manufacturer, notes, slot_duration_mins: slot,
            operating_hours_start: start, operating_hours_end: end, hospital_id: 'HOSP-001'
        };
        const res = await fetch(`${Auth.BASE_URL}/equipment/immovable`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        showAlertMsg('im-add-success', 'im-add-success-text', `${name} added as ${newId}.`);
        document.getElementById('im-add-form').reset();
        loadImmovableInv();
        loadDashboard();
        showToast(`${name} added to inventory.`, 'success');
    } catch (err) {
        showAlertMsg('im-add-error', 'im-add-error-text', 'Failed to save to database.');
    }
}

/* ──────────────────────────────────────────
   STAFF MANAGEMENT  [AD-5]
────────────────────────────────────────── */
function loadStaffTab() {
    const tbody = document.getElementById('staff-tbody');
    const subtitle = document.getElementById('staff-dir-subtitle');
    const staffList = DB.staff.filter(s => !s.id.startsWith('ADM-'));
    subtitle.textContent = `${staffList.length} staff member${staffList.length !== 1 ? 's' : ''} registered`;

    if (!staffList.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">No staff registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = staffList.map(s => {
        const activeCount = DB.checkouts.filter(c => c.staff_id === s.id && c.status === 'active').length;
        const hasActive = activeCount > 0;
        /* [AD-5] Cannot remove if they have active checkouts */
        const removeBtn = hasActive
            ? `<button class="btn btn-outline btn-sm" disabled title="Cannot remove — staff has ${activeCount} active checkout${activeCount !== 1 ? 's' : ''}">Has Assets</button>`
            : `<button class="btn btn-danger btn-sm" onclick="openRemoveStaffModal('${s.id}')">Remove</button>`;
        const checkoutBadge = hasActive
            ? `<span class="badge badge-warning">${activeCount} active</span>`
            : `<span class="badge badge-safe">0</span>`;
        return `<tr>
      <td><span class="mono">${s.id}</span></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.role}</td>
      <td>${s.department}</td>
      <td>${checkoutBadge}</td>
      <td>${removeBtn}</td>
    </tr>`;
    }).join('');
}

async function handleAddStaff(e) {
    e.preventDefault();
    hideAlert('staff-add-error');
    hideAlert('staff-add-success');

    const name = document.getElementById('st-name').value.trim();
    const role = document.getElementById('st-role').value.trim();
    const dept = document.getElementById('st-dept').value.trim();
    const phone = document.getElementById('st-phone').value.trim();
    const email = document.getElementById('st-email').value.trim();
    const address = document.getElementById('st-address').value.trim();
    const emergency = document.getElementById('st-emergency').value.trim();
    const password = document.getElementById('st-password').value.trim();
    const experience = document.getElementById('st-experience').value.trim();
    const joinedYear = document.getElementById('st-joined').value.trim();
    const summary = document.getElementById('st-summary').value.trim();

    if (!name || !role || !dept || !phone || !email || !address || !emergency || !password) {
        showAlertMsg('staff-add-error', 'staff-add-error-text', 'All core fields are required.');
        return;
    }

    /* Auto-generate ST-xxx ID */
    const existingIds = DB.staff
        .filter(s => s.id.startsWith('ST-'))
        .map(s => parseInt(s.id.replace('ST-', ''), 10))
        .filter(n => !isNaN(n));
    const nextNum = existingIds.length ? Math.max(...existingIds) + 1 : 100;
    const newId = `ST-${nextNum}`;

    try {
        const payload = {
            id: newId, name, role, department: dept, phone, email, address, emergency_contact: emergency,
            password, experience, joined_year: joinedYear, professional_summary: summary, hospital_id: 'HOSP-001'
        };
        const res = await fetch(`${Auth.BASE_URL}/staff`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        showAlertMsg('staff-add-success', 'staff-add-success-text', `${name} added with ID ${newId}.`);
        document.getElementById('staff-add-form').reset();
        loadStaffTab();
        showToast(`${name} (${newId}) has been registered.`, 'success');
    } catch (err) {
        showAlertMsg('staff-add-error', 'staff-add-error-text', 'Failed to save staff to database.');
    }
}

function openRemoveStaffModal(staffId) {
    const s = DB.staff.find(x => x.id === staffId);
    if (!s) return;
    removeStaffTarget = staffId;
    const activeCount = DB.checkouts.filter(c => c.staff_id === staffId && c.status === 'active').length;
    document.getElementById('remove-staff-body').innerHTML = `
    <div class="alert alert-warning" style="margin-bottom:0;">
      <span class="alert-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
      <div>
        <strong>Confirm Removal</strong>
        <p style="margin-top:4px;font-size:.85rem;">You are about to remove: <strong>${s.name} (${staffId})</strong></p>
        <p style="margin-top:4px;font-size:.83rem;">Role: ${s.role} · Department: ${s.department}</p>
        ${activeCount > 0 ? `<p style="margin-top:8px;font-size:.83rem;color:var(--status-overdue);"><strong><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>️ Warning:</strong> This staff member has ${activeCount} active checkout${activeCount !== 1 ? 's' : ''}. Cannot remove.</p>` : `<p style="margin-top:4px;font-size:.83rem;">This action will permanently remove the staff member.</p>`}
      </div>
    </div>`;
    const confirmBtn = document.getElementById('remove-staff-confirm');
    confirmBtn.disabled = activeCount > 0;
    document.getElementById('remove-staff-modal').classList.add('active');
}

function closeRemoveStaffModal() {
    document.getElementById('remove-staff-modal').classList.remove('active');
    removeStaffTarget = null;
}

async function confirmRemoveStaff() {
    if (!removeStaffTarget) return;

    /* [AD-5] Final guard */
    const active = DB.checkouts.filter(c => c.staff_id === removeStaffTarget && c.status === 'active');
    if (active.length > 0) {
        showToast(`Cannot remove staff — they have ${active.length} active checkout(s).`, 'error');
        closeRemoveStaffModal();
        return;
    }

    try {
        const res = await fetch(`${Auth.BASE_URL}/staff/${removeStaffTarget}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        closeRemoveStaffModal();
        loadStaffTab();
        const s = DB.staff.find(x => x.id === removeStaffTarget);
        showToast(`Staff removed successfully.`, 'success');
    } catch (e) {
        showToast(`Failed to remove staff.`, 'error');
        closeRemoveStaffModal();
    }
}

/* ──────────────────────────────────────────
   ALL CHECKOUTS TAB
────────────────────────────────────────── */
function loadAllCheckouts() {
    const filter = document.getElementById('checkout-filter').value;
    let checkouts = [...DB.checkouts];

    if (filter === 'active') {
        checkouts = checkouts.filter(c => c.status === 'active' || c.status === 'checked_out');
    } else if (filter === 'duesoon') {
        checkouts = checkouts.filter(c => (c.status === 'active' || c.status === 'checked_out') && getDueStatus(c.due_date) === 'warning');
    } else if (filter === 'returned') {
        checkouts = checkouts.filter(c => c.status === 'returned' || c.status === 'completed');
    } else if (filter === 'overdue') {
        checkouts = checkouts.filter(c => (c.status === 'active' || c.status === 'checked_out') && getDueStatus(c.due_date) === 'overdue');
    }

    const subtitle = document.getElementById('checkouts-subtitle');
    subtitle.textContent = `Showing ${checkouts.length} record${checkouts.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('all-checkouts-tbody');
    if (!checkouts.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--text-muted);">No records match the selected filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = checkouts.map(c => {
        const isCompleted = c.status === 'returned' || c.status === 'completed';
        const status = isCompleted
            ? `<span class="badge badge-safe">Returned</span>`
            : getDueStatus(c.due_date) === 'overdue'
                ? `<span class="badge badge-overdue">Overdue</span>`
                : getDueStatus(c.due_date) === 'warning'
                    ? `<span class="badge badge-warning">Due Soon</span>`
                    : `<span class="badge badge-safe">Active</span>`;
        const extended = c.extended
            ? `<span class="badge" style="background:rgba(2,132,199,.12);color:var(--action-btn);">Yes ✓</span>`
            : `<span style="color:var(--text-muted);">No</span>`;

        return `<tr>
      <td><span class="mono">${c.checkout_id || c.checkoutId}</span></td>
      <td><strong>${c.equipment_name || c.equipmentName}</strong><br/><span style="font-size:.72rem;color:var(--text-muted);">${c.equipment_id || ''}</span></td>
      <td>${c.staff_name || c.staffName}<br/><span style="font-size:.72rem;color:var(--text-muted);">${c.staff_id || c.staffId}</span></td>
      <td>${formatDate(c.checkout_date || c.checkoutDate)}</td>
      <td><strong>${formatDate(c.due_date || c.dueDate)}</strong></td>
      <td>${status}</td>
      <td>${extended}</td>
    </tr>`;
    }).join('');
}

/* ──────────────────────────────────────────
   EXTENSION REQUESTS TAB
────────────────────────────────────────── */
function loadExtRequestsTab() {
    if (!DB.extension_requests) DB.extension_requests = [];

    // Reverse sort manually to show newest first
    const requests = [...DB.extension_requests].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const tbody = document.getElementById('ext-requests-tbody');
    const badge = document.getElementById('req-badge');
    const pendingCount = requests.filter(r => r.status === 'pending').length;

    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }

    if (!requests.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-muted);">No extension requests.</td></tr>`;
        return;
    }

    tbody.innerHTML = requests.map(req => {
        let statusHtml = '';
        let btnHtml = '';

        if (req.status === 'pending') {
            statusHtml = `<span class="badge badge-warning">Pending</span>`;
            btnHtml = `<div class="td-actions" style="gap:6px;">
                <button class="btn btn-primary btn-sm" onclick="approveExtension('${req.id}')">Approve</button>
                <button class="btn btn-outline btn-sm" onclick="rejectExtension('${req.id}')">Reject</button>
            </div>`;
        } else if (req.status === 'approved') {
            statusHtml = `<span class="badge badge-safe">Approved</span>`;
            btnHtml = `<span style="font-size:.72rem;color:var(--text-muted);">Resolved</span>`;
        } else {
            statusHtml = `<span class="badge badge-overdue">Rejected</span>`;
            btnHtml = `<span style="font-size:.72rem;color:var(--text-muted);">Resolved</span>`;
        }
        
        const safeReason = req.reason || '';

        return `<tr>
          <td><span class="mono">${req.checkout_id}</span></td>
          <td>${req.staff_name}<br/><span style="font-size:.72rem;color:var(--text-muted);">${req.staff_id}</span></td>
          <td><strong>${req.equipment_name}</strong></td>
          <td>${formatDate(req.current_due)}</td>
          <td><strong style="color:var(--primary-nav);">${formatDate(req.requested_due)}</strong></td>
          <td style="max-width:200px; white-space:normal; word-wrap:break-word; cursor:pointer;" title="Click to view full reason" onclick="appAlert('Extension Reason', decodeURIComponent('${encodeURIComponent(safeReason)}'))">${safeReason.length > 50 ? safeReason.substring(0, 50) + '...' : safeReason}</td>
          <td>${statusHtml}</td>
          <td>${btnHtml}</td>
        </tr>`;
    }).join('');
}

async function approveExtension(reqId) {
    if (!DB.extension_requests) return;
    const req = DB.extension_requests.find(r => r.id === reqId);
    if (!req) return;

    if (await appConfirm('Approve Extension', `Approve extension to ${formatDate(req.requested_due)}?`, 'Approve')) {
        try {
            const res = await fetch(`${Auth.BASE_URL}/extensions/${reqId}/approve`, { method: 'PUT' });
            if (!res.ok) throw new Error(await res.text());

            // Notify staff member of approval
            try {
                await fetch(`${Auth.BASE_URL}/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        hospital_id: req.hospital_id || 'HOSP-001',
                        target_staff_id: req.staff_id,
                        type: 'extension_approved',
                        severity: 'info',
                        message: `Your extension request for "${req.equipment_name}" until ${formatDate(req.requested_due)} has been APPROVED by administration.`,
                        timestamp: new Date().toISOString(),
                        read: false
                    })
                });
            } catch (err) { console.error('Failed to notify staff of approval', err); }

            DB = await Auth.loadDB();
            loadExtRequestsTab();
            loadAllCheckouts();
            showToast('Extension request approved.', 'success');
        } catch (e) {
            showToast('Failed to approve extension.', 'error');
        }
    }
}

async function rejectExtension(reqId) {
    if (!DB.extension_requests) return;
    const req = DB.extension_requests.find(r => r.id === reqId);
    if (!req) return;

    if (await appConfirm('Reject Request', 'Are you sure you want to reject this extension request?', 'Reject')) {
        try {
            const res = await fetch(`${Auth.BASE_URL}/extensions/${reqId}/reject`, { method: 'PUT' });
            if (!res.ok) throw new Error(await res.text());

            // Notify staff member of rejection
            try {
                await fetch(`${Auth.BASE_URL}/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        hospital_id: req.hospital_id || 'HOSP-001',
                        target_staff_id: req.staff_id,
                        type: 'extension_rejected',
                        severity: 'warning',
                        message: `Your extension request for "${req.equipment_name}" has been REJECTED by administration.`,
                        timestamp: new Date().toISOString(),
                        read: false
                    })
                });
            } catch (err) { console.error('Failed to notify staff of rejection', err); }

            DB = await Auth.loadDB();
            loadExtRequestsTab();
            loadAllCheckouts();
            showToast('Extension request rejected.', 'error');
        } catch (e) {
            showToast('Failed to reject extension.', 'error');
        }
    }
}

/* ──────────────────────────────────────────
   ALL BOOKINGS TAB
────────────────────────────────────────── */
function loadAllBookings() {
    const dateFilter = document.getElementById('booking-date-filter').value;
    const bookings = dateFilter
        ? DB.bookings.filter(b => b.date && b.date.startsWith(dateFilter))
        : [...DB.bookings].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const subtitle = document.getElementById('bookings-all-subtitle');
    subtitle.textContent = dateFilter
        ? `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} for ${formatDate(dateFilter)}`
        : `All bookings — ${bookings.length} record${bookings.length !== 1 ? 's' : ''}`;

    const tbody = document.getElementById('all-bookings-tbody');
    if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-muted);">No bookings found.</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings
        .map(b => {
            const pClass = priorityBadgeClass(b.priority);
            const statusBadge = b.status === 'cancelled'
                ? `<span class="badge badge-overdue">Cancelled</span>`
                : b.status === 'pushed_back'
                    ? `<span class="badge badge-warning">Pushed Back</span>`
                    : `<span class="badge badge-safe">Scheduled</span>`;
            return `<tr>
        <td><span class="mono">${b.booking_id}</span></td>
        <td><strong>${b.equipment_name}</strong></td>
        <td>${b.patient_name}</td>
        <td>${b.staff_name}</td>
        <td>${formatDate(b.date)}</td>
        <td><strong>${b.start_time}</strong> → ${b.end_time}</td>
        <td><span class="badge ${pClass}">${b.priority}</span></td>
        <td>${statusBadge}</td>
      </tr>`;
        }).join('');
}

/* ──────────────────────────────────────────
   ALERT HISTORY TAB  [AD-4]
────────────────────────────────────────── */
function loadAlertHistoryTab() {
    const notifs = getAlertHistory();
    const subtitle = document.getElementById('alert-history-full-subtitle');
    subtitle.textContent = `${notifs.length} system notification${notifs.length !== 1 ? 's' : ''} in the archive`;
    renderAlertHistoryList(document.getElementById('alert-history-list'), notifs);
    /* Sync badge */
    const badge = document.getElementById('failsafe-badge');
    const allAlerts = getAlertHistory();
    if (allAlerts.length > 0) {
        badge.textContent = allAlerts.length;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

async function deleteSingleNotificationAdmin(id) {
    try {
        const res = await fetch(`${Auth.BASE_URL}/notifications/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        DB.notifications = DB.notifications.filter(n => n.id !== id);
        loadAlertHistoryTab();
        loadDashboard();
        showToast('System alert deleted.', 'success');
    } catch (err) {
        showToast('Failed to delete alert.', 'error');
    }
}

function renderAlertHistoryList(el, notifs) {
    const cleanNotifs = notifs.filter(n => n.message && !n.message.toLowerCase().includes('persistant test'));

    // ── Step 3: Strict DESC sort — newest first, emergency types always top ──
    const typePriority = { triage_conflict: 0, displacement_warning: 1, pushback_failsafe: 2, critical_overdue: 3 };
    const sortedNotifs = [...cleanNotifs].sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime();
        const tB = new Date(b.timestamp || 0).getTime();
        const pA = typePriority[a.type] !== undefined ? typePriority[a.type] : 99;
        const pB = typePriority[b.type] !== undefined ? typePriority[b.type] : 99;
        if (pA !== pB) return pA - pB;
        return tB - tA;
    });

    if (!sortedNotifs.length) {
        el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"></div>
      <div class="empty-state-title">No system alerts</div>
      <div class="empty-state-desc">The system log is clear.</div>
    </div>`;
        return;
    }

    const groups = {};
    sortedNotifs.forEach(n => {
        let groupKey = 'Older System Alerts';
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
            const time = n.timestamp
                ? new Date(n.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '';
            return `<div class="notif-item" style="border:1px solid rgba(230,57,70,.2);background:rgba(230,57,70,.03);border-radius:10px;margin-bottom:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;flex:1;">
            <div class="notif-dot" style="background:var(--status-overdue);"></div>
            <div class="notif-content">
              <p style="font-weight:600;color:var(--text-primary);margin:0;">${n.message}</p>
              <time style="font-size:.75rem;color:var(--text-muted);">${time} · ${n.type.replace(/_/g, ' ')}</time>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="deleteSingleNotificationAdmin('${n.id}')" title="Delete alert" style="padding:4px 8px;font-size:.72rem;color:var(--status-overdue);border-color:rgba(239,68,68,.3);">Delete</button>
        </div>`;
        }).join('');
    }

    el.innerHTML = html;
}

async function clearAlertHistory() {
    try {
        const res = await fetch(`${Auth.BASE_URL}/notifications/staff/${ADMIN_USER.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text() || 'Server error');
        /* Reload DB from server — ensures local state matches MySQL */
        DB = await Auth.loadDB();
        loadAlertHistoryTab();
        loadDashboard();
        showToast('System alerts cleared.', 'success');
    } catch (err) {
        showToast('Failed to clear alerts: ' + err.message, 'error');
    }
}

function getAlertHistory() {
    return DB.notifications.filter(n =>
        n.target_staff_id === 'ADM-001' ||
        n.target_staff_id === 'all' ||
        n.type === 'pushback_failsafe' ||
        n.type === 'triage_conflict' ||
        n.type === 'displacement_warning' ||
        n.type === 'critical_overdue'
    );
}

/* ──────────────────────────────────────────
   TRIAGE PANEL  [AD-TRIAGE]
────────────────────────────────────────── */
async function loadTriagePanel() {
    const panel = document.getElementById('triage-panel');
    const body = document.getElementById('triage-panel-body');
    if (!panel || !body) return;

    try {
        const res = await fetch(`${Auth.BASE_URL}/bookings/triage/pending`);
        const pending = res.ok ? await res.json() : [];

        if (!pending || !pending.length) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = '';

        // Group by slot (startTime + equipmentId) to pair conflicts
        const slotMap = {};
        pending.forEach(b => {
            const key = `${b.equipmentId || b.equipment_id}__${b.startTime || b.start_time}__${b.date}`;
            if (!slotMap[key]) slotMap[key] = [];
            slotMap[key].push(b);
        });

        let html = '';
        for (const [key, bookings] of Object.entries(slotMap)) {
            const [eqId, slotStart, slotDate] = key.split('__');
            // Find the existing confirmed HE booking for this slot
            const confirmedHE = DB.bookings.find(b =>
                (b.equipment_id === eqId || b.equipmentId === eqId) &&
                (b.start_time === slotStart || b.startTime === slotStart) &&
                (b.date === slotDate) &&
                (b.status === 'confirmed') &&
                (b.priority || '').toLowerCase().includes('high')
            );

            bookings.forEach(pt => {
                const ptId = pt.bookingId || pt.booking_id;
                const confId = confirmedHE ? (confirmedHE.bookingId || confirmedHE.booking_id) : null;
                const eqName = pt.equipmentName || pt.equipment_name || eqId;
                const slotLabel = `${slotStart || '??:??'} – ${pt.endTime || pt.end_time || '??:??'}`;

                html += `
                <div class="triage-alert-card" style="background:rgba(220,38,38,.06);border:1.5px solid rgba(220,38,38,.25);border-radius:12px;padding:16px 20px;margin-bottom:14px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                        <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(220,38,38,.12);color:#DC2626;font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:99px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            Triage Required
                        </span>
                        <span style="font-size:.78rem;color:var(--text-muted);">${eqName} · ${slotLabel} · ${formatDate(slotDate)}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        ${confId ? `
                        <div style="background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);border-radius:8px;padding:12px;">
                            <div style="font-size:.72rem;font-weight:700;color:var(--action-btn);text-transform:uppercase;margin-bottom:4px;">Existing Booking</div>
                            <div style="font-weight:700;color:var(--text-primary);">${confirmedHE.patientName || confirmedHE.patient_name}</div>
                            <div style="font-size:.72rem;color:var(--text-muted);">${confId} · ${confirmedHE.staffName || confirmedHE.staff_name}</div>
                            <button onclick="resolveTriageConflict('${confId}','${ptId}')" class="btn btn-action btn-sm" style="margin-top:8px;width:100%;">✓ Choose This Slot</button>
                        </div>` : '<div style="color:var(--text-muted);font-size:.82rem;">Original booking info unavailable.</div>'}
                        <div style="background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.15);border-radius:8px;padding:12px;">
                            <div style="font-size:.72rem;font-weight:700;color:#DC2626;text-transform:uppercase;margin-bottom:4px;">Pending Triage</div>
                            <div style="font-weight:700;color:var(--text-primary);">${pt.patientName || pt.patient_name}</div>
                            <div style="font-size:.72rem;color:var(--text-muted);">${ptId} · ${pt.staffName || pt.staff_name}</div>
                            ${confId ? `<button onclick="resolveTriageConflict('${ptId}','${confId}')" class="btn btn-danger btn-sm" style="margin-top:8px;width:100%;">✓ Choose This Slot</button>` : ''}
                        </div>
                    </div>
                    <p style="font-size:.76rem;color:var(--text-muted);margin:0;">⚡ Selecting a booking grants it the ${slotLabel} slot. The unselected booking will be automatically cascaded to the next available time slot.</p>
                </div>`;
            });
        }

        body.innerHTML = html || '<div class="empty-state">No pending triage conflicts.</div>';
    } catch (err) {
        console.error('Failed to load triage panel:', err);
        if (panel) panel.style.display = 'none';
    }
}

async function resolveTriageConflict(winnerId, loserId) {
    const ok = await appConfirm('Confirm Slot Allocation', `Booking ${winnerId} will be confirmed for this slot. The displaced booking (${loserId}) will be automatically cascaded to the next available slot. Proceed?`, 'Confirm');
    if (!ok) return;

    try {
        const res = await fetch(`${Auth.BASE_URL}/bookings/triage/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerBookingId: winnerId, loserBookingId: loserId })
        });
        if (!res.ok) throw new Error(await res.text());
        DB = await Auth.loadDB();
        showToast('Triage resolved. Selected booking confirmed. Displaced booking cascaded successfully.', 'success');
        loadDashboard();
        loadAlertHistoryTab();
    } catch (err) {
        showToast('Triage resolution failed: ' + err.message, 'error');
    }
}

function renderFailsafeList(el, notifs) {
    if (!notifs.length) {
        el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon"></div>
      <div class="empty-state-title">No failsafe alerts</div>
      <div class="empty-state-desc">All pushback conflicts were auto-resolved successfully.</div>
    </div>`;
        return;
    }
    el.innerHTML = notifs.map(n => {
        const time = n.timestamp
            ? new Date(n.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '';
        return `<div class="notif-item">
      <div class="notif-dot" style="background:var(--status-overdue);"></div>
      <div class="notif-content">
        <p style="font-weight:600;color:var(--text-primary);">${n.message}</p>
        <time style="font-size:.75rem;color:var(--text-muted);">${time} · ${n.type.replace(/_/g, ' ')}</time>
      </div>
    </div>`;
    }).join('');
}

async function clearFailsafeAlerts() {
    /* Delete pushback_failsafe notifications from MySQL then reload */
    const failsafeIds = DB.notifications
        .filter(n => n.type === 'pushback_failsafe')
        .map(n => n.id);

    if (!failsafeIds.length) {
        showToast('No failsafe alerts to clear.', 'info');
        return;
    }

    try {
        /* Delete each failsafe notification individually via DELETE /api/notifications/{id} */
        await Promise.all(failsafeIds.map(id =>
            fetch(`${Auth.BASE_URL}/notifications/${id}`, { method: 'DELETE' })
        ));
        /* Reload DB from server */
        DB = await Auth.loadDB();
        loadDashboard();
        showToast('All failsafe alerts cleared.', 'success');
    } catch (err) {
        showToast('Failed to clear failsafe alerts: ' + err.message, 'error');
    }
}


/* Send urgent alert to staff member to return overdue equipment */
async function sendOverdueAlert(checkoutId) {
    const c = DB.checkouts.find(x => x.checkout_id === checkoutId);
    if (!c) return;
    const daysOver = Math.abs(daysLeftNum(c.due_date));
    const notif = {
        hospital_id: 'HOSP-001',
        target_staff_id: c.staff_id,
        type: 'overdue_alert',
        severity: 'critical',
        message: `⚠️ URGENT: Your checkout of "${c.equipment_name}" (${c.equipment_id}) is ${daysOver} day${daysOver !== 1 ? 's' : ''} overdue. Please return it immediately. Checkout ID: ${c.checkout_id}.`,
        timestamp: new Date().toISOString(),
        read: false
    };
    try {
        const res = await fetch(`${Auth.BASE_URL}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notif)
        });
        if (!res.ok) throw new Error();
        DB = await Auth.loadDB();
        showToast(`⚠️ Alert sent to ${c.staff_name} — they will see it in Notifications.`, 'success');
    } catch (err) {
        showToast('Failed to send alert. Check backend connection.', 'error');
    }
}

function getFailsafeNotifs() {
    return DB.notifications.filter(n => n.type === 'pushback_failsafe');
}

/**
 * [AD-7] Long Overdue Alerts: If item is > 7 days overdue, generate critical alert
 */
async function checkOverdueAlerts() {
    const allActive = DB.checkouts.filter(c => c.status === 'active');
    let generated = false;

    for (const c of allActive) {
        const dNum = daysLeftNum(c.due_date);
        const daysOver = Math.abs(dNum);
        const isOverdue = dNum < 0;

        if (isOverdue && daysOver > 7) {
            const exists = DB.notifications.some(n =>
                n.type === 'critical_overdue' &&
                n.message.includes(c.checkout_id)
            );

            if (!exists) {
                const newNotif = {
                    hospital_id: 'HOSP-001',
                    target_staff_id: 'ADM-001',
                    message: `CRITICAL: Item "${c.equipment_name}" (${c.equipment_id}) is ${daysOver} days overdue. Checkout ID: ${c.checkout_id}. Staff: ${c.staff_name}.`,
                    type: 'critical_overdue',
                    severity: 'critical',
                    timestamp: new Date().toISOString(),
                    read: false
                };
                try {
                    const res = await fetch(`${Auth.BASE_URL}/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newNotif)
                    });
                    if (res.ok) {
                        const saved = await res.json();
                        DB.notifications.push(saved);
                        generated = true;
                    }
                } catch (err) {
                    console.error('Failed to save notification:', err);
                }
            }
        }
    }
    if (generated) {
        loadDashboard();
        showToast('New critical overdue alerts generated.', 'warning');
    }
}

/* ──────────────────────────────────────────
   UTILITIES
────────────────────────────────────────── */
function getDueStatus(dueDateStr) {
    const today = new Date(TODAY_STR);
    const due = new Date(dueDateStr);
    const diffDays = Math.ceil((due - today) / 86400000);
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'warning';
    return 'safe';
}

function daysLeftNum(dueDateStr) {
    return Math.ceil((new Date(dueDateStr) - new Date(TODAY_STR)) / 86400000);
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function priorityBadgeClass(p) {
    if (!p) return '';
    const lower = p.toLowerCase();
    if (lower.includes('high') || lower.includes('emergency')) return 'priority-high';
    if (lower.includes('low')) return 'priority-low';
    if (lower.includes('normal')) return 'priority-normal';
    return 'priority-routine';
}

function showAlertMsg(wrapperId, textId, msg) {
    const wrapper = document.getElementById(wrapperId);
    const textEl = document.getElementById(textId);
    if (wrapper && textEl) {
        wrapper.classList.remove('hidden');
        textEl.textContent = msg;
    }
}

function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

/* ── Toast ── */
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
/* ──────────────────────────────────────────
   ADMIN PROFILE TAB
────────────────────────────────────────── */
function loadProfileTab() {
    renderAdminProfile();
}

function renderAdminProfile() {
    const u = ADMIN_USER;
    document.getElementById('prof-avatar').textContent = u.name.charAt(0).toUpperCase();
    document.getElementById('prof-name').textContent = u.name;
    document.getElementById('prof-role-dept').textContent = `${u.role} · ${u.department} `;
    document.getElementById('prof-id-badge').textContent = `ID: ${u.id} `;
    document.getElementById('prof-email').textContent = u.email || '---';
    document.getElementById('prof-phone').textContent = u.phone || '---';
    document.getElementById('prof-address').textContent = u.address || '---';
    document.getElementById('prof-emergency').textContent = u.emergency_contact || '---';
    document.getElementById('prof-joined').textContent = u.joined_year || '---';
    document.getElementById('prof-experience').textContent = u.experience || '---';
}

function openEditProfileModal() {
    const u = ADMIN_USER;
    document.getElementById('edit-prof-email').value = u.email || '';
    document.getElementById('edit-prof-phone').value = u.phone || '';
    document.getElementById('edit-prof-address').value = u.address || '';
    document.getElementById('edit-prof-emergency').value = u.emergency_contact || '';
    document.getElementById('edit-profile-modal').classList.add('active');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.remove('active');
}

async function handleSaveAdminProfile() {
    const email = document.getElementById('edit-prof-email').value.trim();
    const phone = document.getElementById('edit-prof-phone').value.trim();
    const address = document.getElementById('edit-prof-address').value.trim();
    const emergency = document.getElementById('edit-prof-emergency').value.trim();

    if (!email || !phone || !address || !emergency) {
        showToast('All fields are required.', 'error');
        return;
    }

    const updatedUser = {
        ...ADMIN_USER,
        email,
        phone,
        address,
        emergency_contact: emergency
    };

    try {
        const res = await fetch(`${Auth.BASE_URL}/staff/${ADMIN_USER.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
        });

        if (!res.ok) throw new Error('Failed to update profile');

        const savedUser = await res.json();
        ADMIN_USER = savedUser;

        // Update local DB
        const staffIndex = DB.staff.findIndex(s => s.id === ADMIN_USER.id);
        if (staffIndex !== -1) {
            DB.staff[staffIndex] = { ...ADMIN_USER };
        }

        renderAdminProfile();

        // Sync sidebar
        document.getElementById('nav-name').textContent = ADMIN_USER.name;
        document.getElementById('nav-role').textContent = `${ADMIN_USER.role} · ${ADMIN_USER.department} `;

        closeEditProfileModal();
        showToast('Admin profile updated successfully!', 'success');

    } catch (err) {
        showToast('Failed to persist profile changes.', 'error');
        console.error(err);
    }
}
