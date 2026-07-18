// src/lib/ourin-error.js — shim kompatibilitas buat plugin gaya Ourin-MD.
// Dipanggil di dalam catch block plugin: m.reply(te(m.prefix, m.command, m.pushName))
// Balikin STRING pesan error yang ramah, bukan throw apa-apa.

export default function te(prefix = '/', command = '', pushName = '') {
  const name = pushName || 'Kak'
  const cmd = `${prefix}${command}`.trim()
  return (
    `❌ *Terjadi kesalahan* saat menjalankan \`${cmd}\`, ${name}.\n` +
    `> Coba lagi beberapa saat lagi. Kalau terus error, kabarin owner ya.`
  )
}
