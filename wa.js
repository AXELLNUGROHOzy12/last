import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { writeFile } from 'fs/promises'
import QRCode from 'qrcode'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import ytSearch from 'yt-search'

const PORT       = process.env.PORT || 8000
const BACKEND    = `http://localhost:${PORT}`
const QR_FILE    = 'qr_current.txt'
const QR_IMAGE   = 'qr_current.png'
const SELF_FILE  = 'self_mode.txt'
const SEEN_FILE  = 'seen_users.json'

const OWNER_NAME = 'exel'

// ── Tunggu back.py siap ──
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

// ── Setup Config ──
const fs = (await import('fs'))
let OWNER_NUMBER = '628772703519'
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
    `Perkenalkan, aku *${aiName}* — asisten AI yang siap membantu kamu.\n\n` +
    `Bot ini dibuat oleh *${OWNER_NAME}* (wa.me/${OWNER_NUMBER}).\n\n` +
    `Silakan mulai chat! 😊`
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
      console.log('📱 QR baru tersedia')
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`Koneksi terputus (kode ${code})${shouldReconnect ? ' — reconnecting...' : ' — logged out'}`)
      if (shouldReconnect) connectToWhatsApp()
      else await writeFile(QR_FILE, 'loggedout', 'utf-8')
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

    // ── /play {judul lagu} ──
    if (text.trim().toLowerCase().startsWith('/play ')) {
      const query = text.trim().substring(6).trim()
      if (!query) {
        await sock.sendMessage(from, { text: '⚠️ Judulnya mana? Contoh: /play celengan rindu' })
        return
      }

      try {
        await sock.sendMessage(from, { text: '🔍 Nyari lagu...' })
        const searchResult = await ytSearch(query)
        const video = searchResult.videos.length > 0 ? searchResult.videos[0] : null
        
        if (!video) {
          await sock.sendMessage(from, { text: '❌ Gak ketemu bro.' })
          return
        }

        await sock.sendMessage(from, { text: `🎶 Ketemu: *${video.title}*\n⏳ Download...` })

        const apiUrl = `https://itzpire.com/download/youtube?url=${encodeURIComponent(video.url)}`
        const apiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        })
        
        if (!apiRes.ok) throw new Error(`API error (${apiRes.status})`)
        const apiData = await apiRes.json()

        const audioUrl = apiData?.data?.download?.audio || apiData?.data?.audio
        if (!audioUrl) throw new Error('Gagal dapet link dari Itzpire.')

        const audioRes = await fetch(audioUrl)
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

        await sock.sendMessage(from, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: false 
        }, { quoted: msg })

        console.log(`✅ /play terkirim ke ${from} (${video.title})`)
      } catch (e) {
        console.error('❌ Error /play:', e.message)
        await sock.sendMessage(from, { text: '❌ Gagal muter lagu: ' + e.message })
      }
      return
    }

    // ── /brat {teks} ──
    if (text.trim().toLowerCase().startsWith('/brat ')) {
      const bratText = text.trim().substring(6).trim()
      if (!bratText) {
        await sock.sendMessage(from, { text: '⚠️ Teksnya mana?' })
        return
      }

      try {
        await sock.sendMessage(from, { text: '⏳ Bikin stiker brat...' })
        const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(bratText)}`
        const apiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        
        if (!apiRes.ok) throw new Error(`API error`)
        const buffer = Buffer.from(await apiRes.arrayBuffer())

        try {
          if (JSON.parse(buffer.toString())) return await sock.sendMessage(from, { text: '❌ API error.' })
        } catch (e) {}

        const stickerMeta = new Sticker(buffer, {
            pack: 'Brat Sticker',
            author: OWNER_NAME,
            type: StickerTypes.FULL,
            quality: 50
        })

        await sock.sendMessage(from, { sticker: await stickerMeta.toBuffer() })
        console.log(`✅ /brat terkirim`)
      } catch (e) {
        console.error('❌ Error /brat:', e.message)
        await sock.sendMessage(from, { text: '❌ Gagal: ' + e.message })
      }
      return
    }

    // ── /dd {url} ──
    if (text.trim().toLowerCase().startsWith('/dd ')) {
      const tiktokUrl = text.trim().split(' ').slice(1).join(' ').trim()
      if (!tiktokUrl || !/tiktok\.com/.test(tiktokUrl)) {
        await sock.sendMessage(from, { text: '⚠️ Format salah.' })
        return
      }
      try {
        await sock.sendMessage(from, { text: '⏳ Download TikTok...' })
        const apiRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`)
        const apiData = await apiRes.json()
        const videoUrl = apiData?.data?.hdplay || apiData?.data?.play

        if (!videoUrl) return await sock.sendMessage(from, { text: '❌ Gagal dapet link.' })

        const videoRes = await fetch(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' }})
        const buffer = Buffer.from(await videoRes.arrayBuffer())

        await sock.sendMessage(from, { video: buffer, mimetype: 'video/mp4', caption: apiData?.data?.title || '' })
        console.log(`✅ /dd terkirim`)
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal: ' + e.message })
      }
      return
    }

    // ── /ai ──
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

    // ── /self ──
    if (text.trim().toLowerCase() === '/self') {
      await setSelfMode(!selfMode)
      await sock.sendMessage(from, { text: selfMode ? '✅ Self mode ON' : '🔓 Self mode OFF' })
      return
    }

    if (selfMode && isGroup) return

    // ── Sambutan & Chatbot ──
    if (!seenUsers.has(from)) {
      await markSeen(from)
      try {
        const cfgRes  = await fetch(`${BACKEND}/status`)
        const cfgData = await cfgRes.json()
        await sock.sendMessage(from, { text: buildWelcome(cfgData.config?.nama_ai || 'Nova AI') })
      } catch {
        await sock.sendMessage(from, { text: buildWelcome('Nova AI') })
      }
    }

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: from, message: text })
      })
      const data = await res.json()
      await sock.sendMessage(from, { text: data.reply || data.error || '⚠️ Gagal' })
    } catch {}
  })
}

connectToWhatsApp().catch(console.error)
