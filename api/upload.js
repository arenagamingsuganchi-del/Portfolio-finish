export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || 'multipart/form-data';

    // 1. Try Catbox server-to-server POST
    try {
      const catRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': contentType
        },
        body: buffer
      });
      const fileUrl = (await catRes.text()).trim();
      if (fileUrl.startsWith('http')) {
        return res.status(200).json({ success: true, url: fileUrl });
      }
    } catch (e) {
      console.error('Catbox error:', e);
    }

    // 2. Fallback to tmpfiles
    try {
      const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': contentType
        },
        body: buffer
      });
      const json = await tmpRes.json();
      if (json.status === 'success' && json.data && json.data.url) {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        return res.status(200).json({ success: true, url: directUrl });
      }
    } catch (e) {
      console.error('Tmpfiles error:', e);
    }

    return res.status(500).json({ error: 'Faylni yuklab bo\'lmadi. Qayta urinib ko\'ring.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
