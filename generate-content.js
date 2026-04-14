// scripts/generate-content.js
// GitHub Actions tarafından her gün çalıştırılır.
// Gemini API ile günlük vitrin içeriği üretir ve content.json'a yazar.

const https = require('https');
const fs = require('fs');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.error('GEMINI_API_KEY secret eksik!');
  process.exit(1);
}

function callGemini(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.85 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.candidates[0].content.parts[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const todayISO = new Date().toISOString().split('T')[0];
  const todayTR = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  console.log(`İçerik üretiliyor: ${todayTR}`);

  const prompt = `
Bugün (${todayTR}) için web'den 4 ilginç şey seç. Kategoriler farklı olsun:
bilim, tasarım/sanat, teknoloji, garip/absürd, felsefe, doğa, tarih, psikoloji, uzay gibi.

Sadece JSON döndür, başka hiçbir şey yazma. Format:
{
  "updated": "${todayISO}",
  "items": [
    {
      "baslik": "kısa ve merak uyandıran başlık",
      "kategori": "tek kelime kategori",
      "ozet": "2-3 cümle. Neden ilginç? Ne düşündürüyor? Samimi ve meraklı bir dil.",
      "url": "gerçek URL ya da null"
    }
  ]
}

Kurallar:
- Türkçe yaz
- Başlıklar Türkçe olsun ama konular global olabilir
- URL sadece gerçekten var olan adresler olsun, uydurma. Emin değilsen null yaz.
- Klişe değil, gerçekten ilginç, az bilinen şeyler seç
- Her item farklı bir kategoriden olsun
`.trim();

  let raw;
  try {
    raw = await callGemini(prompt);
  } catch (e) {
    console.error('Gemini API hatası:', e.message);
    process.exit(1);
  }

  // JSON bloğunu temizle (```json ... ``` varsa çıkar)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('JSON bulunamadı. Ham yanıt:', raw.substring(0, 300));
    process.exit(1);
  }

  let content;
  try {
    content = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('JSON parse hatası:', e.message);
    process.exit(1);
  }

  // Doğrulama
  if (!content.items || !Array.isArray(content.items)) {
    console.error('Geçersiz format: items dizisi bulunamadı');
    process.exit(1);
  }

  fs.writeFileSync('content.json', JSON.stringify(content, null, 2), 'utf8');
  console.log(`✓ content.json güncellendi: ${content.items.length} item`);
  content.items.forEach((item, i) => console.log(`  ${i + 1}. [${item.kategori}] ${item.baslik}`));
}

main();
