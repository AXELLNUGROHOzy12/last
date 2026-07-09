import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import QRCode from 'qrcode'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import SoundCloud from 'soundcloud-scraper'

const scClient = new SoundCloud.Client()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 8000
const BACKEND = process.env.BACKEND_URL || `http://localhost:${PORT}`
const OWNER_NAME = 'exel'

// ── Sistem Auto-Load Plugin ──
const plugins = {}
const pluginDir = path.join(__dirname, 'plugins')
if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir)

const loadPlugins = async () => {
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'))
  for (const file of files) {
    const pluginUrl = pathToFileURL(path.join(pluginDir, file)).href
    const plugin = await import(pluginUrl)
    if (plugin.default && plugin.default.command) {
      plugin.default.command.forEach(cmd => {
        plugins[cmd] = plugin.default.handler
      })
    }
  }
  console.log(`🔌 Memuat ${Object.keys(plugins).length} command dari plugins!`)
}
await loadPlugins()

// ── Main Bot Connection ──
async function connectToWhatsApp() {
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
      await QRCode.toFile('qr_current.png', qr, { width: 300, margin: 2 })
      console.log('📱 QR baru tersedia')
    }
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) connectToWhatsApp()
    }
    if (connection === 'open') console.log('✅ WhatsApp terhubung!')
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''
    if (!text.trim()) return

    // Parse command
    const args = text.trim().split(/ +/)
    const command = args[0].toLowerCase().replace(/^[\/\.#]/, '')

    // 1. Eksekusi Plugin
    if (plugins[command]) {
      try {
        await plugins[command](msg, sock, args)
        return
      } catch (e) {
        console.error('❌ Error Plugin:', e)
        await sock.sendMessage(from, { text: '❌ Error plugin: ' + e.message })
      }
    }

    // 2. Fitur Bawaan
    const cmdFull = text.trim().toLowerCase()
    
    // ── /sc (SoundCloud) ──
    if (cmdFull.startsWith('/sc ')) {
      const query = text.trim().substring(4).trim()
      try {
        await sock.sendMessage(from, { text: '🔍 Mencari di SoundCloud...' })
        const searchResult = await scClient.search(query, 'track')
        if (!searchResult.length) return await sock.sendMessage(from, { text: '❌ Lagu ga ketemu.' })
        
        const track = searchResult[0]
        const apiRes = await fetch(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(track.url)}`)
        const apiData = await apiRes.json()
        const audioUrl = apiData?.data?.download || apiData?.url
        
        if (!audioUrl) throw new Error('Gagal dapet link.')
        const audioBuffer = Buffer.from(await (await fetch(audioUrl)).arrayBuffer())
        
        await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mp4' }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message })
      }
      return
    }

    // ── /spotify ──
    if (cmdFull.startsWith('/spotify ')) {
      const url = text.trim().split(' ')[1]
      try {
        await sock.sendMessage(from, { text: '⏳ Menarik lagu dari Spotify...' })
        const apiRes = await fetch(`https://api.siputzx.my.id/api/d/spotify?url=${encodeURIComponent(url)}`)
        const apiData = await apiRes.json()
        const audioUrl = apiData?.data?.download || apiData?.url 
        
        if (!audioUrl) throw new Error('Gagal dapet link.')
        const audioBuffer = Buffer.from(await (await fetch(audioUrl)).arrayBuffer())
        
        await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mp4' }, { quoted: msg })
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message })
      }
      return
    }

    // ── /brat ──
    if (cmdFull.startsWith('/brat ')) {
      const bratText = text.trim().substring(6).trim()
      try {
        const apiRes = await fetch(`https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(bratText)}`)
        const buffer = Buffer.from(await apiRes.arrayBuffer())
        const stickerMeta = new Sticker(buffer, { pack: 'Brat', author: OWNER_NAME, type: StickerTypes.FULL })
        await sock.sendMessage(from, { sticker: await stickerMeta.toBuffer() })
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Gagal bikin stiker.' })
      }
      return
    }

    // ── /dd (TikTok) ──
    if (cmdFull.startsWith('/dd ')) {
      const tiktokUrl = text.trim().split(' ')[1]
      try {
        const apiRes = await fetch(`https://www.tikwm.com/api/?url=${tiktokUrl}`)
        const apiData = await apiRes.json()
        const videoUrl = apiData?.data?.hdplay || apiData?.data?.play
        if (!videoUrl) throw new Error('Ga dapet video.')
        const buffer = Buffer.from(await (await fetch(videoUrl)).arrayBuffer())
        await sock.sendMessage(from, { video: buffer, mimetype: 'video/mp4' })
      } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error: ' + e.message })
      }
      return
    }
  })
}

connectToWhatsApp().catch(console.error)
