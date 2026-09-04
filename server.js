import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Vercel KV / Upstash Redis helpers using global fetch
async function getKvData() {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!kvUrl || !kvToken) return null;

    try {
        const res = await fetch(`${kvUrl}/get/portfolio_data`, {
            headers: { Authorization: `Bearer ${kvToken}` }
        });
        const json = await res.json();
        if (json && json.result) {
            return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
        }
    } catch (e) {
        console.error('KV get error:', e);
    }
    return null;
}

async function setKvData(data) {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!kvUrl || !kvToken) return false;

    try {
        const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
        await fetch(`${kvUrl}/set/portfolio_data`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${kvToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyStr)
        });
        return true;
    } catch (e) {
        console.error('KV set error:', e);
        return false;
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-File-Name, X-File-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API endpoint to read data
    if (req.url === '/api/data' && req.method === 'GET') {
        (async () => {
            const kvData = await getKvData();
            if (kvData) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(kvData));
                return;
            }

            const tmpPath = path.join(os.tmpdir(), 'data.json');
            const targetFile = fs.existsSync(tmpPath) ? tmpPath : DATA_FILE;
            fs.readFile(targetFile, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Faylni o`qishda xatolik yuz berdi' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(data);
            });
        })();
        return;
    }

    // API endpoint to verify password
    if (req.url === '/api/verify' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const { password } = JSON.parse(body);
                const expectedPassword = process.env.ADMIN_PASSWORD || 'qaxxarov.98';
                if (password === expectedPassword) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Parol noto\'g\'ri' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
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
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Ruxsat berilmadi: Parol noto\'g\'ri' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body); 
                await setKvData(parsed);

                try {
                    fs.writeFileSync(DATA_FILE, body, 'utf8');
                } catch (err) {
                    try {
                        const tmpPath = path.join(os.tmpdir(), 'data.json');
                        fs.writeFileSync(tmpPath, body, 'utf8');
                    } catch (tmpErr) {
                        console.error('File backup write failed:', tmpErr);
                    }
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Yaroqsiz ma`lumot formati' }));
            }
        });
        return;
    }

    // API endpoint to react to a work
    if (req.url === '/api/react' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', async () => {
            try {
                const { workId, emoji } = JSON.parse(body);
                if (!workId || !emoji) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'workId and emoji are required' }));
                    return;
                }

                let data = await getKvData();
                if (!data) {
                    const tmpPath = path.join(os.tmpdir(), 'data.json');
                    const targetFile = fs.existsSync(tmpPath) ? tmpPath : DATA_FILE;
                    const fileContent = fs.readFileSync(targetFile, 'utf8');
                    data = JSON.parse(fileContent);
                }

                const work = (data.works || []).find(w => w.id === workId);
                if (!work) {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Work not found' }));
                    return;
                }
                if (!work.reactions) work.reactions = {};
                work.reactions[emoji] = (work.reactions[emoji] || 0) + 1;

                await setKvData(data);
                try {
                    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
                } catch (e) {
                    try {
                        const tmpPath = path.join(os.tmpdir(), 'data.json');
                        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
                    } catch (err) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, reactions: work.reactions }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Yaroqsiz so\'rov' }));
            }
        });
        return;
    }

    // API endpoint to comment on a work
    if (req.url === '/api/comment' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Request body too large' }));
                req.destroy();
            }
        });
        req.on('end', async () => {
            try {
                const { workId, name, text } = JSON.parse(body);
                if (!workId || !text) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'workId and text are required' }));
                    return;
                }
                const commentName = name || 'Anonim';
                let data = await getKvData();
                if (!data) {
                    const tmpPath = path.join(os.tmpdir(), 'data.json');
                    const targetFile = fs.existsSync(tmpPath) ? tmpPath : DATA_FILE;
                    const fileContent = fs.readFileSync(targetFile, 'utf8');
                    data = JSON.parse(fileContent);
                }

                const work = (data.works || []).find(w => w.id === workId);
                if (!work) {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Work not found' }));
                    return;
                }
                if (!work.comments) work.comments = [];
                work.comments.push({ name: commentName, text, date: new Date().toISOString() });

                await setKvData(data);
                try {
                    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
                } catch (e) {
                    try {
                        const tmpPath = path.join(os.tmpdir(), 'data.json');
                        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
                    } catch (err) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, comments: work.comments }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Yaroqsiz so\'rov' }));
            }
        });
        return;
    }

    // API endpoint to upload files (Permanent Catbox proxy)
    if (req.url === '/api/upload' && req.method === 'POST') {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                if (!buffer || buffer.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Fayl bo`sh' }));
                    return;
                }

                const fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'upload.png';
                const fileType = req.headers['x-file-type'] || 'application/octet-stream';

                // 1. Try Catbox raw multipart upload with browser headers
                try {
                    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
                    let bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${fileName}"\r\nContent-Type: ${fileType}\r\n\r\n`;
                    const headerBuf = Buffer.from(bodyStr, 'utf-8');
                    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
                    const totalBuf = Buffer.concat([headerBuf, buffer, footerBuf]);

                    const catRes = await fetch('https://catbox.moe/user/api.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': `multipart/form-data; boundary=${boundary}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Origin': 'https://catbox.moe',
                            'Referer': 'https://catbox.moe/'
                        },
                        body: totalBuf
                    });
                    const fileUrl = (await catRes.text()).trim();
                    if (fileUrl.startsWith('http')) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: true, url: fileUrl }));
                        return;
                    }
                } catch (catErr) {
                    console.error('Catbox upload error:', catErr);
                }

                // 2. Fallback to tmpfiles
                try {
                    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
                    let bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${fileType}\r\n\r\n`;
                    const headerBuf = Buffer.from(bodyStr, 'utf-8');
                    const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
                    const totalBuf = Buffer.concat([headerBuf, buffer, footerBuf]);

                    const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': `multipart/form-data; boundary=${boundary}`
                        },
                        body: totalBuf
                    });
                    const json = await tmpRes.json();
                    if (json.status === 'success' && json.data && json.data.url) {
                        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ success: true, url: directUrl }));
                        return;
                    }
                } catch (tmpErr) {
                    console.error('Tmpfiles upload error:', tmpErr);
                }

                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Faylni yuklab bo`lmadi' }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Serve Static Files
    let safeUrl = req.url === '/' ? '/index.html' : req.url;
    safeUrl = safeUrl.split('?')[0];

    const filePath = path.resolve(path.join(__dirname, safeUrl));
    
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Ruxsat berilmadi');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm'
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
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server ishga tushdi! Brauzerda oching: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
});

