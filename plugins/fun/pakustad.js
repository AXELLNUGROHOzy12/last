import axios from 'axios'
import { f } from '../../src/lib/ourin-http.js'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: ['pakustad', 'pak-ustad', 'tanyaustad'],
    alias: [],
    category: 'fun',
    description: 'Tanya pak ustad (gambar)',
    usage: '.pakustad <pertanyaan>',
    example: '.pakustad kenapa aku ganteng',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text || m.quoted?.text
    
    if (!text) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}pakustad <pertanyaan>\`\n\n` +
            `> Contoh: \`${m.prefix}pakustad kenapa aku ganteng\``
        )
    }
    
    await m.react('🕕')
    
    try {
        const apiUrl = `https://api.cuki.biz.id/api/canvas/ustadz?apikey=cuki-x&text=${encodeURIComponent(text)}`
        const data = await f(apiUrl)
        const results = data?.results

        if (!results || !results.url) {
            throw new Error(`Respons API tidak valid / tidak ada results.url: ${JSON.stringify(data)}`)
        }

        // Sebelumnya URL gambar langsung dilempar ke sock.sendMedia, jadi
        // Baileys yang fetch sendiri di-belakang layar — dan itu kena 403
        // dari server file api.cuki.biz.id (kemungkinan butuh User-Agent
        // browser / nolak request tanpa header yang wajar). Solusinya kita
        // download sendiri dulu pakai header yang sama kayak plugin lain,
        // baru kirim hasilnya sebagai buffer.
        const imgRes = await axios.get(results.url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
            timeout: 20000
        })
        const imgBuffer = Buffer.from(imgRes.data)

        await sock.sendMedia(m.chat, imgBuffer, text, m, {
            type: 'image'
        })
        
        m.react('✅')
        
    } catch (err) {
        // Sebelumnya error di sini gak pernah di-log sama sekali, jadi kalau
        // plugin ini gagal, gak ada jejak di log buat debug. Sekarang dicatat.
        console.error('[pakustad error]:', err)
        m.react('☢')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }