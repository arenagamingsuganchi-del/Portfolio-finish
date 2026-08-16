// End-to-end test

// Haqiqiy rasm faylini yaratish (PNG header bilan)
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const fakeData = Buffer.alloc(2048, 0xAA);
const testFile = Buffer.concat([pngHeader, fakeData]);

async function runTests() {
  console.log('=== TEST 1: Fayl yuklash (/api/upload) ===');
  console.log('File size:', testFile.length, 'bytes');

  const uploadRes = await fetch('https://qaxxarov-portfolio-black.vercel.app/api/upload', {
    method: 'POST',
    headers: {
      'x-file-name': encodeURIComponent('test_rasm.png'),
      'x-file-type': 'image/png'
    },
    body: testFile
  });
  console.log('Upload HTTP Status:', uploadRes.status);
  const uploadResult = await uploadRes.json();
  console.log('Upload natijasi:', uploadResult);

  if (!uploadResult.success) {
    console.error('XATO: Yuklash muvaffaqiyatsiz!');
    return;
  }

  console.log('\n=== TEST 2: Data saqlash (/api/update) ===');
  const saveData = {
    hero: { name: 'Qaxxorov Resume', subtitle: 'Grafik dizayner & AI creators', profileImg: 'profile.png' },
    about: { text: 'Men Tursunmurod Qaxxorov 5+ yillik tajribaga ega grafik dizayner va AI kontent yaratuvchiman.' },
    links: { portfolio: 'https://t.me/portfolio_Qaxxorov', instagram: 'https://instagram.com/qaxxarov_98', youtube: 'https://youtube.com', telegram: 'https://t.me/qaxxarov_98', phone: '+998940774000' },
    stats: { experience: '5+', clients: '35+', projects: '100+', satisfaction: '98%' },
    cloudinary: { cloudName: '', uploadPreset: '' },
    works: [{ id: 'test-' + Date.now(), title: 'Test Ish', type: 'graphic', url: uploadResult.url }]
  };

  const saveRes = await fetch('https://qaxxarov-portfolio-black.vercel.app/api/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer qaxxarov.98' },
    body: JSON.stringify(saveData)
  });
  console.log('Save HTTP Status:', saveRes.status);
  const saveResult = await saveRes.json();
  console.log('Save natijasi:', saveResult);

  console.log('\n=== TEST 3: Data olish (/api/data) ===');
  const dataRes = await fetch('https://qaxxarov-portfolio-black.vercel.app/api/data');
  console.log('Data HTTP Status:', dataRes.status);
  const data = await dataRes.json();
  console.log('Works count:', data.works?.length);
  console.log('First work URL:', data.works?.[0]?.url);

  if (uploadResult.url) {
    console.log('\n=== TEST 4: Yuklangan fayl URL tekshiruvi ===');
    const fileRes = await fetch(uploadResult.url, { method: 'HEAD' });
    console.log('File URL status:', fileRes.status);
    console.log('File content-type:', fileRes.headers.get('content-type'));
  }

  console.log('\n=== BARCHA TESTLAR TUGADI ===');
}

runTests().catch(err => console.error('GLOBAL XATO:', err));
