export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-file-name, x-file-type'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logs = [];
  const log = (msg) => { logs.push(msg); };

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    log(`Received ${buffer.length} bytes`);

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Fayl bo\'sh', logs });
    }

    const fileName = req.headers['x-file-name']
      ? decodeURIComponent(req.headers['x-file-name'])
      : 'upload_' + Date.now() + '.png';
    const fileType = req.headers['x-file-type'] || 'application/octet-stream';
    log(`File: ${fileName}, Type: ${fileType}`);
    log(`Node version: ${process.version}`);
    log(`FormData available: ${typeof FormData !== 'undefined'}`);
    log(`Blob available: ${typeof Blob !== 'undefined'}`);

    // 1. Catbox - manual multipart/form-data (FormData bo'lmasa ham ishlaydi)
    try {
      const boundary = '----CatboxBoundary' + Date.now();
      const parts = [];
      
      // reqtype field
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload`);
      
      // file field
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${fileName}"\r\nContent-Type: ${fileType}\r\n\r\n`);
      
      const header = Buffer.from(parts.join('\r\n') + '\r\n', 'utf-8');
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
      const body = Buffer.concat([header, buffer, footer]);

      log(`Catbox request size: ${body.length} bytes`);

      const catRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        },
        body: body
      });

      const catText = (await catRes.text()).trim();
      log(`Catbox status: ${catRes.status}`);
      log(`Catbox response: ${catText.substring(0, 200)}`);

      if (catText.startsWith('http')) {
        return res.status(200).json({ success: true, url: catText, logs });
      }
    } catch (e) {
      log(`Catbox error: ${e.message}`);
    }

    // 2. Zaxira: tmpfiles
    try {
      const boundary = '----TmpBoundary' + Date.now();
      const parts = [];
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${fileType}\r\n\r\n`);
      
      const header = Buffer.from(parts.join(''), 'utf-8');
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
      const body = Buffer.concat([header, buffer, footer]);

      const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: body
      });

      const tmpText = await tmpRes.text();
      log(`Tmpfiles status: ${tmpRes.status}`);
      log(`Tmpfiles response: ${tmpText.substring(0, 200)}`);

      const json = JSON.parse(tmpText);
      if (json.status === 'success' && json.data && json.data.url) {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        return res.status(200).json({ success: true, url: directUrl, logs });
      }
    } catch (e) {
      log(`Tmpfiles error: ${e.message}`);
    }

    return res.status(500).json({ error: 'Faylni yuklab bo\'lmadi', logs });
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    return res.status(500).json({ error: error.message, logs });
  }
}
