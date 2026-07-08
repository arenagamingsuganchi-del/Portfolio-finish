import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

const server = http.createServer((req, res) => {
    // Enable CORS for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API endpoint to read data
    if (req.url === '/api/data' && req.method === 'GET') {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Faylni uqishda xatolik yuz berdi' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
        return;
    }

    // API endpoint to verify password
    if (req.url === '/api/verify' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Limit to 1MB
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const { password } = JSON.parse(body);
                const expectedPassword = process.env.ADMIN_PASSWORD || 'qaxxarov.98';
                if (password === expectedPassword) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Parol noto\'g\'ri' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Yaroqsiz so\'rov' }));
            }
        });
        return;
    }

    // API endpoint to update data
    if (req.url === '/api/update' && req.method === 'POST') {
        const authHeader = req.headers['authorization'];
        const expectedPassword = process.env.ADMIN_PASSWORD || 'qaxxarov.98';
        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedPassword) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ruxsat berilmadi: Parol noto\'g\'ri' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            // Limit to 1MB
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                JSON.parse(body); 
                fs.writeFile(DATA_FILE, body, 'utf8', (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Saqlashda xatolik yuz berdi' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Yaroqsiz ma`lumot formati' }));
            }
        });
        return;
    }

    // Serve Static Files
    let safeUrl = req.url === '/' ? '/index.html' : req.url;
    safeUrl = safeUrl.split('?')[0]; // Remove query params

    const filePath = path.resolve(path.join(__dirname, safeUrl));
    
    // Path Traversal check: verify requested file is within project directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ruxsat berilmadi');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Fayl topilmadi');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Server xatosi: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server ishga tushdi! Brauzerda oching: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});
