import fs from 'fs/promises'
import path from 'path'
import config from '../../config.js'

// ── CHANGELOG — kirim pengumuman fitur baru ke SATU grup tertentu aja ──
// .setchangelog   -> jalankan DI DALAM grup yang mau dijadiin target
// .changelog <isi> (alias .cl) -> kirim pengumuman ke grup target itu, dari mana aja
// .changelog status -> lihat grup target saat ini
// .unsetchangelog -> hapus target

const pluginConfig = {
    name: 'changelog',
    alias: ['setchangelog', 'unsetchangelog', 'cl'],
    category: 'owner',
    description: 'Kirim pengumuman fitur baru ke satu grup WA tertentu aja (bukan broadcast ke semua)',
    usage: '.setchangelog (di dalam grup) | .changelog <isi> | .changelog status | .unsetchangelog',
    example: '.changelog Fitur dpsteai udah bisa dipake!',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const TARGET_FILE = path.join(process.cwd(), 'database', 'changelog', 'target.json')

async function loadTarget() {
    try {
        return JSON.parse(await fs.readFile(TARGET_FILE, 'utf8'))
    } catch {
        return null
    }
}

async function saveTarget(data) {
    await fs.mkdir(path.dirname(TARGET_FILE), { recursive: true })
    await fs.writeFile(TARGET_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function isOwnerSender(sender = '') {
    const owners = [config.owner_wa, config.owner_lid].filter(Boolean)
    return owners.some(n => sender.includes(n))
}

function formatChangelog(text, botName) {
    const points = text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => (/^[-•*➤]/.test(l) ? l.replace(/^[-•*➤]\s*/, '') : l))
        .map(l => `  ➤ ${l}`)
        .join('\n')

    const tanggal = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
`★彡 *UPDATE TERBARU* 彡★

${points}

°•┈┈┈┈┈┈┈┈┈┈┈┈•°
🤖 ${botName}  •  🗓️ ${tanggal}

Makasih udah setia pakai *${botName}*! Terus pantengin buat update fitur seru lainnya ⭐`
    )
}

async function handler(m, { sock }) {
    if (!isOwnerSender(m.sender)) {
        return m.reply('❌ *Khusus owner.*')
    }

    // ── .setchangelog — tandai grup INI sebagai target ──
    if (m.command === 'setchangelog') {
        if (!m.chat.endsWith('@g.us')) {
            return m.reply('❌ Jalankan command ini *di dalam grup* yang mau dijadiin target changelog.')
        }
        let groupName = m.chat
        try {
            const meta = await sock.groupMetadata(m.chat)
            groupName = meta.subject || groupName
        } catch {}
        await saveTarget({ groupJid: m.chat, groupName })
        return m.reply(
`✅ Grup ini ("*${groupName}*") sekarang jadi target changelog.

Mulai sekarang, kirim \`.changelog <isi>\` dari mana aja (DM/grup lain) — isinya cuma masuk ke grup ini, bukan ke grup lain.`
        )
    }

    // ── .unsetchangelog — hapus target ──
    if (m.command === 'unsetchangelog') {
        const existing = await loadTarget()
        if (!existing) {
            return m.reply('ℹ️ Belum ada target changelog yang diset.')
        }
        try {
            await fs.unlink(TARGET_FILE)
        } catch {}
        return m.reply(`🗑️ Target changelog ("*${existing.groupName}*") sudah dihapus.`)
    }

    // ── .changelog [status|<isi>] ──
    const text = (m.text || '').trim()

    if (!text || text.toLowerCase() === 'status') {
        const target = await loadTarget()
        if (!target) {
            return m.reply(
`ℹ️ Belum ada grup target.

Set dulu: jalankan \`.setchangelog\` di dalam grup tujuan.`
            )
        }
        return m.reply(
`ℹ️ Target changelog saat ini:
*${target.groupName}*

Kirim \`.changelog <isi>\` buat ngirim pengumuman ke grup itu.
Kirim \`.unsetchangelog\` buat lepas target.`
        )
    }

    const target = await loadTarget()
    if (!target) {
        return m.reply(
`❌ Belum ada grup target.

Set dulu pakai \`.setchangelog\` di dalam grup tujuan, baru kirim changelog.`
        )
    }

    m.react('📤')

    try {
        const body = formatChangelog(text, config.nama_ai || 'Nova AI')
        await sock.sendMessage(target.groupJid, { text: body })
        m.react('✅')
        return m.reply(`✅ Changelog terkirim ke *${target.groupName}*.`)
    } catch (error) {
        m.react('❌')
        return m.reply(`❌ Gagal kirim changelog: ${error.message}`)
    }
}

export { pluginConfig as config, handler }
