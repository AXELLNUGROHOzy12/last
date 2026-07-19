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
        
        const data = res.data ? res.data : res;
        
        if (!data || !data.results || !data.results.url) {
             m.react('☢')
             return m.reply('Maaf, respons API tidak sesuai atau sedang error.')
        }

        const imgUrl = data.results.url;

        // FIX ULTIMATE: Gunakan native fetch bawaan Node.js + Header lengkap 
        // Ini ampuh menembus Cloudflare/WAF yang memblokir Axios
        const response = await fetch(imgUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://api.cuki.biz.id/'
            }
        });

        if (!response.ok) {
            throw new Error(`Fetch gagal dengan status: ${response.status}`);
        }

        // Convert response stream menjadi Buffer agar bisa dikirim oleh Baileys
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Kirim buffer gambar
        await sock.sendMessage(m.chat, { 
            image: buffer, 
            caption: text 
        }, { quoted: m });
        
        m.react('✅')
        
    } catch (err) {
        console.error("Error di plugin pakustad:", err);
        m.react('☢')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }
