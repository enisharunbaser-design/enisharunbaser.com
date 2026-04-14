import urllib.request
import urllib.error
import json
import os
import sys
from datetime import datetime

KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    print("GEMINI_API_KEY eksik!")
    sys.exit(1)

today_iso = datetime.now().strftime("%Y-%m-%d")

prompt = (
    "Bugun icin 4 ilginc konu sec. Her biri farkli kategoriden olsun: "
    "bilim, sanat, teknoloji, felsefe, doga, tarih, psikoloji, uzay gibi. "
    "Sadece JSON dondur, baska hicbir sey yazma:\n"
    '{"updated":"' + today_iso + '",'
    '"items":['
    '{"baslik":"...","kategori":"...","ozet":"2-3 cumle Turkce samimi merakli","url":null},'
    '{"baslik":"...","kategori":"...","ozet":"2-3 cumle Turkce samimi merakli","url":null},'
    '{"baslik":"...","kategori":"...","ozet":"2-3 cumle Turkce samimi merakli","url":null},'
    '{"baslik":"...","kategori":"...","ozet":"2-3 cumle Turkce samimi merakli","url":null}'
    "]}"
)

body = json.dumps({
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"maxOutputTokens": 1500, "temperature": 0.9}
}).encode("utf-8")

url = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash-lite:generateContent?key=" + KEY
)

req = urllib.request.Request(
    url, data=body,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    error_body = e.read().decode("utf-8")
    print("API Hatasi:", error_body[:500])
    sys.exit(1)

text = data["candidates"][0]["content"]["parts"][0]["text"]
print("Ham yanit:", text[:200])

start = text.find("{")
end = text.rfind("}") + 1

if start == -1 or end == 0:
    print("JSON bulunamadi")
    sys.exit(1)

try:
    result = json.loads(text[start:end])
except json.JSONDecodeError as e:
    print("JSON parse hatasi:", e)
    sys.exit(1)

with open("content.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Basarili:", len(result.get("items", [])), "item yazildi")
