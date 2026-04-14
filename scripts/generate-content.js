const https = require('https');
const fs = require('fs');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error('GEMINI_API_KEY eksik!'); process.exit(1); }

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.85 }
    });
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.candidates[0].content.parts[0].text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const todayISO = new Date().toISOString().split('T')[0];
  const todayTR = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  console.log('Icerik uretiliyor: ' + todayTR);

  const prompt = 'Bugun (' + todayTR + ') icin web den 4 ilginc sey sec. Kategoriler farkli olsun: bilim, sanat, teknoloji, felsefe, doga, tarih, psikoloji, uzay. Sadece JSON dondir: { "updated": "' + todayISO + '", "items": [ { "baslik": "...", "kategori": "...", "ozet": "2-3 cumle samimi merakli Turkce", "url": "gercek url ya da null" } ] } Her item farkli kategoriden olsun.';

  let raw;
  try { raw = await callGemini(prompt); }
  catch (e) { console.error('API hatasi:', e.message); process.exit(1); }

  const m = raw.match(/{[sS]*}/);
  if (!m) { console.error('JSON yok'); process.exit(1); }

  let data;
  try { data = JSON.parse(m[0]); }
  catch (e) { console.error('Parse hatasi'); process.exit(1); }

  fs.writeFileSync('content.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('Guncellendi: ' + data.items.length + ' item');
}

main();
