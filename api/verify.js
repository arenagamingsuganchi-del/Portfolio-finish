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
    const { password } = req.body;
    const expectedPassword = process.env.ADMIN_PASSWORD || 'qaxxarov.98';
    
    if (password === expectedPassword) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ error: 'Parol noto\'g\'ri' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
