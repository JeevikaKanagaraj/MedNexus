/**
 * MedNexus – Centralized Authentication Utility
 * File: js/auth.js
 * 
 * Provides unified logic for login, session management, and auth guards.
 */

'use strict';

const Auth = (function () {
    const STORAGE_KEY_ID = 'mn_user_id';
    const STORAGE_KEY_ROLE = 'mn_user_role';

    /* Global Modal Replacements */
    window.appAlert = function (title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.style.zIndex = '9999';
            overlay.innerHTML = `
                <div class="modal" style="max-width:450px; padding-bottom:16px;">
                    <div class="modal-header">
                        <h2 class="modal-title">${title}</h2>
                        <button class="modal-close">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="white-space:pre-wrap; font-size: 0.95rem; color: var(--text-color); line-height: 1.5;">${message}</p>
                    </div>
                    <div style="text-align: right; padding: 0 24px;">
                        <button class="btn btn-primary" id="app-alert-ok">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const close = () => { overlay.remove(); resolve(); };
            overlay.querySelector('.modal-close').onclick = close;
            overlay.querySelector('#app-alert-ok').onclick = close;
        });
    };

    window.appConfirm = function (title, message, confirmText = 'Confirm') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.style.zIndex = '9999';
            overlay.innerHTML = `
                <div class="modal" style="max-width:400px; padding-bottom:16px;">
                    <div class="modal-header">
                        <h2 class="modal-title">${title}</h2>
                        <button class="modal-close">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="white-space:pre-wrap; font-size: 0.95rem; color: var(--text-color);">${message}</p>
                    </div>
                    <div style="text-align: right; padding: 0 24px; display:flex; gap:8px; justify-content: flex-end;">
                        <button class="btn btn-outline" id="app-conf-cancel">Cancel</button>
                        <button class="btn btn-danger" id="app-conf-ok">${confirmText}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const cancel = () => { overlay.remove(); resolve(false); };
            const confirm = () => { overlay.remove(); resolve(true); };
            overlay.querySelector('.modal-close').onclick = cancel;
            overlay.querySelector('#app-conf-cancel').onclick = cancel;
            overlay.querySelector('#app-conf-ok').onclick = confirm;
        });
    };

    const BASE_URL = (function () {
        if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
            return `${API_BASE_URL}/api`;
        }
        return 'https://mednexus-production.up.railway.app/api';
    })();

    /**
     * Authenticates a user against the Spring Boot Backend
     */
    async function login(id, password) {
        try {
            const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://mednexus-production.up.railway.app';
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: id, password: password })
            });

            if (res.status === 401) {
                return { success: false, message: 'Invalid User ID or Password.' };
            }
            if (res.status >= 500) {
                return { success: false, message: 'Server unavailable. Please try again.' };
            }
            if (!res.ok) {
                try {
                    const errData = await res.json();
                    return { success: false, message: errData.message || 'Server unavailable. Please try again.' };
                } catch (e) {
                    return { success: false, message: 'Server unavailable. Please try again.' };
                }
            }

            const data = await res.json();

            sessionStorage.setItem(STORAGE_KEY_ID, data.user.id);
            sessionStorage.setItem(STORAGE_KEY_ROLE, data.role);

            return { success: true, user: { id: data.user.id, name: data.user.name, role: data.role } };
        } catch (err) {
            console.error('Auth.login error:', err);
            return { success: false, message: 'Server unavailable. Please try again.' };
        }
    }

    /**
     * Centralized DB Loader - Fetches all data from Backend API
     */
    async function loadDB() {
        const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://mednexus-production.up.railway.app';
        try {
            // Parallel fetch for all entities
            const [
                hospitalRes,
                staffRes,
                mvEqRes,
                imEqRes,
                checkoutRes,
                bookingRes,
                extRes,
                notifRes
            ] = await Promise.all([
                fetch(`${baseUrl}/api/hospitals/HOSP-001`),
                fetch(`${baseUrl}/api/staff`),
                fetch(`${baseUrl}/api/equipment/movable`),
                fetch(`${baseUrl}/api/equipment/immovable`),
                fetch(`${baseUrl}/api/checkouts`),
                fetch(`${baseUrl}/api/bookings`),
                fetch(`${baseUrl}/api/extensions`),
                fetch(`${baseUrl}/api/notifications/hospital/HOSP-001`)
            ]);

            const responses = [hospitalRes, staffRes, mvEqRes, imEqRes, checkoutRes, bookingRes, extRes, notifRes];
            for (const r of responses) {
                if (r.status === 401) {
                    throw new Error('Unauthorized access. Please log in again.');
                }
                if (!r.ok) {
                    throw new Error('Server unavailable. Please try again.');
                }
            }

            const [hospital, staff, movable_equipment, immovable_equipment, checkouts, bookings, extension_requests, notifications] = await Promise.all(
                responses.map(r => r.json())
            );

            return {
                hospital,
                staff,
                movable_equipment,
                immovable_equipment,
                checkouts,
                bookings,
                extension_requests,
                notifications
            };
        } catch (err) {
            console.error('Auth.loadDB error:', err);
            throw (err.message && (err.message.includes('Server unavailable') || err.message.includes('Unauthorized'))) ? err : new Error('Server unavailable. Please try again.');
        }
    }

    function logout() {
        sessionStorage.removeItem(STORAGE_KEY_ID);
        sessionStorage.removeItem(STORAGE_KEY_ROLE);
        localStorage.removeItem('staffActiveTab');
        localStorage.removeItem('adminActiveTab');
        window.location.href = 'login.html';
    }

    function getUser() {
        return {
            id: sessionStorage.getItem(STORAGE_KEY_ID),
            role: sessionStorage.getItem(STORAGE_KEY_ROLE)
        };
    }

    function guard(allowedRoles = []) {
        const user = getUser();
        if (!user.id) {
            window.location.href = 'login.html';
            return null;
        }

        if (typeof allowedRoles === 'string') {
            if (!user.id.startsWith(allowedRoles)) {
                window.location.href = 'login.html';
                return null;
            }
        } else if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
            if (!allowedRoles.includes(user.role)) {
                window.location.href = 'login.html';
                return null;
            }
        }

        return user;
    }

    return {
        BASE_URL,
        login,
        logout,
        getUser,
        guard,
        loadDB
    };
})();
