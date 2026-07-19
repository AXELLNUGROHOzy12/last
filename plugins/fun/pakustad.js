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
        const res = await f(apiUrl)
        
        // Amankan data JSON (antisipasi jika wrapper f() mereturn object axios)
        const data = res.data ? res.data : res;
        
        if (!data || !data.results || !data.results.url) {
             m.react('☢')
             return m.reply('Maaf, respons API tidak sesuai atau sedang error.')
        }

        // FIX UTAMA: Ubah paksa http:// menjadi https:// agar diizinkan oleh sistem bot
        const secureUrl = data.results.url.replace(/^http:\/\//i, 'https://');

        await sock.sendMedia(m.chat, secureUrl, text, m, {
            type: 'image'
        })
        
        m.react('✅')
        
    } catch (err) {
        // Log error ke terminal agar penyebabnya terlihat jelas
        console.error("Error di plugin pakustad:", err);
        m.react('☢')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }
