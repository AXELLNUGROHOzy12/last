import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { writeFile } from 'fs/promises'
import QRCode from 'qrcode'

const PORT       = process.env.PORT || 8000
const BACKEND    = `http://localhost:${PORT}`
const QR_FILE    = 'qr_current.txt'
const QR_IMAGE   = 'qr_current.png'
const SELF_FILE  = 'self_mode.txt'
const SEEN_FILE  = 'seen_users.json'

const OWNER_NAME = 'exel'

// ── Tunggu back.py siap (hindari race condition saat cold start) ──
async function waitForBackend(maxRetries = 15, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const r = await fetch(`${BACKEND}/status`)
      if (r.ok) return true
    } catch {}
    await new Promise(res => setTimeout(res, delayMs))
  }
  return false
}
await waitForBackend()

// ── Baca owner_wa dari config backend ────────────────────
const fs = (await import('fs'))
let OWNER_NUMBER = '628772703519'  // fallback default
try {
  const r = await fetch(`${BACKEND}/status`)
  const d = await r.json()
  if (d.config?.owner_wa) OWNER_NUMBER = d.config.owner_wa
} catch {}
console.log(`👑 Owner WA number: ${OWNER_NUMBER}`)
let selfMode = false
try { selfMode = fs.readFileSync(SELF_FILE, 'utf-8').trim() === '1' } catch {}

let seenUsers = new Set()
try { seenUsers = new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf-8'))) } catch {}

async function setSelfMode(val) {
  selfMode = val
  await writeFile(SELF_FILE, val ? '1' : '0', 'utf-8')
}

async function markSeen(jid) {
  seenUsers.add(jid)
  await writeFile(SEEN_FILE, JSON.stringify([...seenUsers]), 'utf-8')
}

function buildWelcome(aiName) {
  return (
    `Halo! 👋 Selamat datang!\n\n` +
    `Perkenalkan, aku *${aiName}* — asisten AI yang siap membantu kamu kapan saja. ` +
    `Kamu bisa tanya apa saja, mulai dari informasi, percakapan santai, sampai hal-hal serius. 🤖\n\n` +
    `Bot ini dibuat dan dikelola oleh *${OWNER_NAME}* ` +
    `(wa.me/${OWNER_NUMBER}). ` +
    `Kalau ada masalah atau pertanyaan soal bot ini, hubungi beliau ya!\n\n` +
    `Sekarang, dengan senang hati aku siap melayani kamu. Silakan mulai chat! 😊`
  )
}

async function connectToWhatsApp () {
  const { state, saveCreds } = await useMultiFileAuthState('wa_auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    browser: ['Nova AI', 'Chrome', '125.0.0']
  })

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      await writeFile(QR_FILE, qr, 'utf-8')
      await QRCode.toFile(QR_IMAGE, qr, { width: 300, margin: 2 })
      console.log('📱 QR baru tersedia — buka /qr di browser untuk scan')
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`Koneksi terputus (kode ${code})${shouldReconnect ? ' — reconnecting...' : ' — logged out'}`)
      if (shouldReconnect) {
        connectToWhatsApp()
      } else {
        await writeFile(QR_FILE, 'loggedout', 'utf-8')
      }
    }

    if (connection === 'open') {
      await writeFile(QR_FILE, 'connected', 'utf-8')
      console.log('✅ WhatsApp terhubung!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const from    = msg.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption || ''

    if (!text.trim()) return

    // ── /ai {nama} — semua /ai dari WhatsApp lewat /wa-ai ──
    // Backend yang memutuskan: owner → global, lainnya → per-sesi
    if (text.trim().toLowerCase().startsWith('/ai ')) {
      const provider = text.trim().split(' ').slice(1).join(' ').trim().toLowerCase()
      const fromNumber = from.split('@')[0].split(':')[0]
      try {
        const res  = await fetch(`${BACKEND}/wa-ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromNumber, session_id: from, provider })
        })
        const data = await res.json()
        await sock.sendMessage(from, { text: data.reply || data.error })
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message })
      }
      return
    }

    // ── /self — toggle mode private-only ──────────────────
    if (text.trim().toLowerCase() === '/self') {
      await setSelfMode(!selfMode)
      const status = selfMode
        ? '✅ Self mode ON — bot hanya balas di private chat.'
        : '🔓 Self mode OFF — bot balas di semua chat.'
      await sock.sendMessage(from, { text: status })
      return
    }

    // Kalau self mode aktif, abaikan pesan dari grup
    if (selfMode && isGroup) return

    // ── Sambutan pertama kali chat ─────────────────────────
    if (!seenUsers.has(from)) {
      await markSeen(from)
      try {
        const cfgRes  = await fetch(`${BACKEND}/status`)
        const cfgData = await cfgRes.json()
        const aiName  = cfgData.config?.nama_ai || 'Nova AI'
        await sock.sendMessage(from, { text: buildWelcome(aiName) })
      } catch {
        await sock.sendMessage(from, { text: buildWelcome('Nova AI') })
      }
    }

    console.log(`📩 ${from}: ${text.slice(0, 80)}`)

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: from, message: text })
      })
      const data = await res.json()
      const reply = data.reply || data.error || '⚠️ Tidak ada respons'
      await sock.sendMessage(from, { text: reply })
      console.log(`✅ Balas ke ${from}`)
    } catch (e) {
      console.error('❌ Error forward ke backend:', e.message)
    }
  })
}

connectToWhatsApp().catch(console.error)
