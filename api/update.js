import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const expectedPassword = process.env.ADMIN_PASSWORD || 'qaxxarov.98';
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedPassword) {
      return res.status(401).json({ error: 'Ruxsat berilmadi: Parol noto\'g\'ri' });
    }

    const updatedData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (process.env.KV_REST_API_URL) {
      await kv.set('portfolio_data', updatedData);
    } else {
      // 1. Try writing to /tmp/data.json
      try {
        const tmpPath = path.join('/tmp', 'data.json');
        fs.writeFileSync(tmpPath, JSON.stringify(updatedData, null, 2), 'utf8');
      } catch (e) {
        console.error('/tmp write error:', e);
      }
      // 2. Try writing to local data.json if writable
      try {
        const localPath = path.join(process.cwd(), 'data.json');
        fs.writeFileSync(localPath, JSON.stringify(updatedData, null, 2), 'utf8');
      } catch (e) {
        console.log('Read-only filesystem, fallback to /tmp handled');
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
