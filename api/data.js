import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (process.env.KV_REST_API_URL) {
      const { reset } = req.query || {};
      let data = await kv.get('portfolio_data');
      if (!data || reset === 'true') {
        const localPath = path.join(process.cwd(), 'data.json');
        const fileContent = fs.readFileSync(localPath, 'utf8');
        data = JSON.parse(fileContent);
        await kv.set('portfolio_data', data);
      }
      return res.status(200).json(data);
    } else {
      const localPath = path.join(process.cwd(), 'data.json');
      const fileContent = fs.readFileSync(localPath, 'utf8');
      return res.status(200).json(JSON.parse(fileContent));
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
