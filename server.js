const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();

// Proxy /api requests to production Railway Spring Boot backend
const BACKEND_URL = process.env.BACKEND_URL || 'https://mednexus-production.up.railway.app';

app.use('/api', (req, res) => {
    try {
        const targetUrl = new URL(BACKEND_URL);
        const transport = targetUrl.protocol === 'https:' ? https : http;
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: '/api' + req.url,
            method: req.method,
            headers: { ...req.headers, host: targetUrl.host }
        };

        const proxyReq = transport.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
            console.error('API Proxy Error:', err.message);
            res.status(502).json({ success: false, message: 'Server unavailable. Please try again.' });
        });

        req.pipe(proxyReq, { end: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server unavailable. Please try again.' });
    }
});

// Serve static files from root
app.use(express.static(__dirname));

// Route root to login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Start the server if run directly (local development)
if (require.main === module) {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
        console.log(`Frontend Server running at http://localhost:${PORT}/`);
        console.log(`API Proxy routing /api -> ${BACKEND_URL}`);
    });
}

module.exports = app;
