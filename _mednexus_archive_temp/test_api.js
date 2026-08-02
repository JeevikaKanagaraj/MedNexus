const http = require('http');

async function testConnectivity() {
    const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';
    console.log(`Testing Admin Login against ${BASE_URL}...`);
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'ADM-001', password: 'admin123' })
        });

        if (!loginRes.ok) {
            console.error('Login Failed:', await loginRes.text());
            return;
        }
        const loginData = await loginRes.json();
        console.log('Login Success:', loginData.message, '| User:', loginData.user.name, '| Role:', loginData.role);

        console.log('\nTesting Data Loading (Simulating Auth.loadDB)...');

        const endpoints = [
            'hospitals/HOSP-001',
            'staff',
            'equipment/movable',
            'equipment/immovable',
            'checkouts',
            'bookings',
            'extensions',
            'notifications/hospital/HOSP-001'
        ];

        for (const ep of endpoints) {
            console.log(`Fetching ${ep}...`);
            const res = await fetch(`${BASE_URL}/${ep}`);
            if (!res.ok) {
                console.error(`  -> Failed: ${res.status} ${res.statusText}`);
            } else {
                const data = await res.json();
                console.log(`  -> Success. Records: ${Array.isArray(data) ? data.length : 1}`);
            }
        }

        console.log('\nTesting Staff Login...');
        const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'ST-101', password: 'staff123' }) // The data.json had "password123" for ST-101
        });

        if (!staffLoginRes.ok) {
            console.error('Staff Login Failed:', await staffLoginRes.text());
        } else {
            const staffLoginData = await staffLoginRes.json();
            console.log('Staff Login Success:', staffLoginData.message, '| User:', staffLoginData.user.name);
        }

        console.log('\nAll tests completed.');
    } catch (e) {
        console.error('Test Error:', e);
    }
}

testConnectivity();
