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
    const opts = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + GEMINI_KEY,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) return reject(new Error(p.error.message));
          resolve(p.candidates[0].content.parts[0].text);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const iso = new Date().toISOString().split('T')[0];
  const tr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  console.log('Uretiliyor: ' + tr);

  const prompt = 'Bugun (' + tr + ') icin 4 ilginc konu sec. Farkli kategoriler: bilim, sanat, teknoloji, felsefe, doga, tarih. Sadece JSON don: {"updated":"' + iso + '","items":[{"baslik":"kisa","kategori":"tek kelime","ozet":"2-3 cumle Turkce","url":null}]} 4 farkli kategori.';

  let raw;
  try { raw = await callGemini(prompt); }
  catch (e) { console.error('Hata:', e.message); process.exit(1); }

  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) { console.error('JSON yok'); process.exit(1); }

  let result;
  try { result = JSON.parse(m[0]); }
  catch (e) { console.error('Parse hatasi'); process.exit(1); }

  fs.writeFileSync('content.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Tamam: ' + result.items.length + ' item');
}

main();
