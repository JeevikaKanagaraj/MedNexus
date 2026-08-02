const http = require('http');

const request = (url, method, body = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: parsed });
                } catch (e) {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: data });
                }
            });
        });
        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTests() {
    console.log('--- Starting MedNexus Full System Test ---');
    const BASE_URL = 'http://localhost:8080/api';

    try {
        // 1. Staff Management
        console.log('\n[1] TEST: Staff Create/Delete');
        const newStaff = { id: 'TEST-ST-99', name: 'Test Agent', role: 'Nurse', department: 'ICU', password: 'password123', hospital_id: 'HOSP-001' };
        let res = await request(`${BASE_URL}/staff`, 'POST', newStaff);
        console.log(res.ok ? '✅ Staff created.' : '❌ Staff create fail.');
        res = await request(`${BASE_URL}/staff/TEST-ST-99`, 'DELETE');
        console.log(res.ok ? '✅ Staff deleted.' : '❌ Staff delete fail.');

        // 2. Equipment Management
        console.log('\n[2] TEST: Equipment Create/Delete');
        const newEq = { id: 'T-MV-01', name: 'Test Pump', category: 'Infusion', location: 'Store', hospital_id: 'HOSP-001', status: 'available' };
        res = await request(`${BASE_URL}/equipment/movable`, 'POST', newEq);
        console.log(res.ok ? '✅ Equipment created.' : '❌ Equipment create fail.');
        res = await request(`${BASE_URL}/equipment/movable/T-MV-01`, 'DELETE');
        console.log(res.ok ? '✅ Equipment deleted.' : '❌ Equipment delete fail.');

        // 3. Booking & Pushback
        console.log('\n[3] TEST: Booking & Emergency Pushback');
        const today = new Date().toISOString().split('T')[0];
        const randomHour = Math.floor(Math.random() * 5) + 12; // 12 to 16
        const start_time = `${randomHour}:00`;
        const end_time = `${randomHour}:30`;
        const b1 = { equipment_id: 'IM-2001', patient_name: 'Original Patient', staff_id: 'ST-101', date: today, start_time: start_time, end_time: end_time, priority: 'Normal', department: 'ICU' };
        res = await request(`${BASE_URL}/bookings`, 'POST', b1);

        if (!res.ok || !res.json.data) {
            console.error('❌ Failed to create normal booking:', res.json);
            return;
        }
        const b1Id = res.json.data.booking_id;
        console.log('✅ Normal booking created: ' + b1Id);

        const b2 = { equipment_id: 'IM-2001', patient_name: 'EMERGENCY Patient', staff_id: 'ST-103', date: today, start_time: start_time, end_time: end_time, priority: 'High Emergency', department: 'Surgery' };
        res = await request(`${BASE_URL}/bookings`, 'POST', b2);
        console.log(res.ok ? '✅ High Emergency booking created.' : '❌ Pushback fail.');

        res = await request(`${BASE_URL}/bookings/${b1Id}`, 'GET');
        console.log((res.json.status === 'cancelled' || res.json.status === 'pushed_back') ? '✅ Original booking moved/cancelled correctly (Pushback Success).' : '❌ Pushback fail: Original status is ' + res.json.status);

        // 4. Notifications
        console.log('\n[4] TEST: Notification Persistence');
        const notif = { target_staff_id: 'ST-101', hospital_id: 'HOSP-001', type: 'system_alert', severity: 'info', message: 'Persistent test', read: false };
        res = await request(`${BASE_URL}/notifications`, 'POST', notif);
        const notifId = res.json.id;
        console.log('✅ Notification created.');

        res = await request(`${BASE_URL}/notifications/staff/ST-101/read-all`, 'PUT');
        console.log(res.ok ? '✅ Mark all read success.' : '❌ Mark all read fail.');

        res = await request(`${BASE_URL}/notifications/staff/ST-101`, 'GET');
        const readNow = res.json.find(n => n.id === notifId).read;
        console.log(readNow ? '✅ Persistent Read State Verified.' : '❌ Persistence fail: Still unread.');

    } catch (err) {
        console.error('Test script error:', err);
    }
}

runTests();
