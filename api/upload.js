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

  try {
    // Raw binary buffer ni olish
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Fayl bo\'sh yoki topilmadi' });
    }

    const fileName = req.headers['x-file-name']
      ? decodeURIComponent(req.headers['x-file-name'])
      : 'upload_' + Date.now() + '.png';
    const fileType = req.headers['x-file-type'] || 'application/octet-stream';

    console.log(`Upload: ${fileName} (${buffer.length} bytes, type: ${fileType})`);

    // 1. Catbox ga yuklash (doimiy havolalar)
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', new Blob([buffer], { type: fileType }), fileName);

      const catRes = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData
      });
      const catText = (await catRes.text()).trim();
      console.log('Catbox response:', catText);

      if (catText.startsWith('http')) {
        return res.status(200).json({ success: true, url: catText });
      }
    } catch (e) {
      console.error('Catbox error:', e.message);
    }

    // 2. Zaxira: tmpfiles ga yuklash
    try {
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: fileType }), fileName);

      const tmpRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const json = await tmpRes.json();
      console.log('Tmpfiles response:', json);

      if (json.status === 'success' && json.data && json.data.url) {
        const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        return res.status(200).json({ success: true, url: directUrl });
      }
    } catch (e) {
      console.error('Tmpfiles error:', e.message);
    }

    return res.status(500).json({ error: 'Faylni yuklab bo\'lmadi. Qayta urinib ko\'ring.' });
  } catch (error) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
