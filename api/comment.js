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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workId, name, text } = req.body;

    if (!workId || !text) {
      return res.status(400).json({ error: 'workId and text are required' });
    }
    const commentName = name || 'Anonim';

    const localPath = path.join(process.cwd(), 'data.json');
    let data;

    if (process.env.KV_REST_API_URL) {
      data = await kv.get('portfolio_data');
      if (!data) {
        const fileContent = fs.readFileSync(localPath, 'utf8');
        data = JSON.parse(fileContent);
      }
    } else {
      const fileContent = fs.readFileSync(localPath, 'utf8');
      data = JSON.parse(fileContent);
    }

    const work = data.works.find(w => w.id === workId);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }

    if (!work.comments) {
      work.comments = [];
    }
    work.comments.push({ name: commentName, text, date: new Date().toISOString() });

    if (process.env.KV_REST_API_URL) {
      await kv.set('portfolio_data', data);
    } else {
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
    }

    return res.status(200).json({ success: true, comments: work.comments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
