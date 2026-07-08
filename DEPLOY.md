# Deploy ke Railway

## 1. Push ke GitHub
File `config.json`, `token.json`, `user.json`, dll sudah dibersihkan dari secret
dan di-`.gitignore`. Sekarang aman di-push.

## 2. Set Environment Variables di Railway
Buka project di Railway → tab **Variables** → tambahkan:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | API key Gemini kamu |
| `OPENAI_API_KEY` | API key OpenAI kamu (kalau pakai fitur ChatGPT) |

Railway otomatis kasih `PORT` sendiri, tidak perlu di-set manual.

## 3. Deploy
Railway bakal detect `Dockerfile` otomatis dan jalanin `start.sh`
(backend Python + bot WhatsApp jalan bareng dalam satu container).

## 4. Scan ulang QR WhatsApp
Karena filesystem Railway ephemeral (kereset tiap redeploy kalau tanpa volume),
folder `wa_auth/` bakal hilang tiap redeploy → perlu scan QR ulang di `/qr`.
Kalau mau sesi WA persist antar redeploy, tambahkan **Volume** di Railway dan
mount ke `/app/wa_auth`.

## Catatan keamanan
Key Gemini & OpenAI yang lama sempat ketulis plain-text di `config.json`.
Push-nya sudah diblokir GitHub jadi kemungkinan besar belum bocor ke publik,
tapi kalau mau aman total, generate ulang key-nya di masing-masing provider.
