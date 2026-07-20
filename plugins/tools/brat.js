import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import config from '../../config.js'

const pluginConfig = {
  name: 'brat',
  alias: ['bratsticker'],
  category: 'sticker',
  description: 'Bikin stiker gaya Brat dari teks',
  usage: '.brat teks kamu',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

async function handler(m, { sock, text }) {
  if (!text?.trim()) {
    return m.reply(`Format: ${m.prefix}brat teks kamu\nContoh: ${m.prefix}brat capek banget hari ini`)
  }

  try {
    const apiRes = await fetch(`https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text.trim())}`)
    if (!apiRes.ok) throw new Error(`API balas status ${apiRes.status}`)

    const buffer = Buffer.from(await apiRes.arrayBuffer())
    const stickerMeta = new Sticker(buffer, {
      pack: 'Brat',
      author: config.nama_ai || 'Nova AI',
      type: StickerTypes.FULL,
    })
    await sock.sendMessage(m.chat, { sticker: await stickerMeta.toBuffer() }, { quoted: m })
  } catch (e) {
    await m.reply('❌ Gagal bikin stiker Brat: ' + e.message)
  }
}

export { pluginConfig as config, handler }
