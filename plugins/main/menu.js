import config from '../../config.js'

const pluginConfig = {
  name: 'menu',
  alias: ['help', 'allmenu', 'menu1'],
  category: 'main',
  description: 'Menampilkan menu & daftar fitur bot',
  usage: '.menu',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

function getGreeting() {
  const hour = Number(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
  )
  if (hour >= 4 && hour < 11) return 'Pagi'
  if (hour >= 11 && hour < 15) return 'Siang'
  if (hour >= 15 && hour < 18) return 'Sore'
  return 'Malam'
}

// Daftar command yang beneran aktif & jalan. Diupdate manual tiap ada
// plugin baru — sengaja gak auto-scan folder plugins/ biar command yang
// belum siap (masih nunggu dependency dll) gak ikut ditampilkan ke user.
const MENU_SECTIONS = [
  {
    title: '🖼️ CANVAS & MAKER',
    items: [
      ['buatquotes', 'bq | quoteanime', 'Buat quote anime custom'],
      ['fakebankjago', '-', 'Bikin fake chat/notif bank'],
      ['igstory', 'igstorypost', 'Simulasi post IG Story'],
      ['iqc', 'qc2', 'Fake quote iOS style'],
      ['iqcpink', '-', 'Fake quote iOS style (pink)'],
    ],
  },
  {
    title: '🤖 AI',
    items: [
      ['text2img2', 't2i2 | genimg', 'Generate gambar dari teks'],
    ],
  },
  {
    title: '😄 FUN',
    items: [
      ['pakustad', 'tanyaustad', 'Tanya pak ustad (gambar)'],
      ['akankah', 'apakah | bagaimana | berapa | bisakah | dimana | haruskah | kapan | mengapa | coba', 'Tanya bot, jawaban random'],
      ['mimpi', '-', 'Tafsir mimpi random'],
      ['rate', '-', 'Rating random buat sesuatu/seseorang'],
      ['soulmatch', '-', 'Cek kecocokan jiwa dua nama'],
      ['puisi', 'sajak', 'Puisi random'],
      ['senja', 'katacinta', 'Kata-kata senja/romantis random'],
      ['fuckmylife', 'fml', 'Cerita FML random'],
      ['meme', 'randommeme', 'Meme Indonesia random (gambar)'],
      ['lahelu', '-', 'Gambar/video lahelu random'],
      ['barandom', 'ba', 'Gambar Blue Archive random'],
      ['quotesimage', 'qimg', 'Gambar quotes random'],
    ],
  },
  {
    title: '🔮 PRIMBON',
    items: [
      ['zodiak', 'horoscope | ramalan', 'Ramalan zodiak'],
      ['artinama', '-', 'Arti sebuah nama'],
      ['tafsirmimpi', 'artimimpi', 'Tafsir mimpi berdasar kata kunci'],
      ['ramalanjodoh', '-', 'Ramalan jodoh'],
      ['kecocokannamapasangan', '-', 'Cek kecocokan nama pasangan'],
      ['nomerhoki', '-', 'Nomor hoki'],
      ['potensipenyakit', '-', 'Potensi penyakit dari nama/tanggal lahir'],
      ['sifatusahabisnis', '-', 'Sifat usaha/bisnis dari nama'],
    ],
  },
  {
    title: '☪️ ISLAMI',
    items: [
      ['quran', 'surah | alquran', 'Baca ayat Al-Quran per surah'],
      ['murrotal', 'quraudio', 'Audio murottal per surah'],
      ['audioquran', 'audio-quran', 'Cari audio Quran per Qari (mp3quran)'],
      ['islami', 'doa | niatsholat | asmaulhusna', 'Kumpulan fitur Islami'],
    ],
  },
  {
    title: '📰 BERITA',
    items: [
      ['berita', 'antara | cnn | cnbc | sindonews', 'Berita dari berbagai sumber'],
    ],
  },
  {
    title: 'ℹ️ INFO',
    items: [
      ['gempa', 'bmkg | infogempa', 'Info gempa terkini BMKG'],
      ['jadwalbola', 'bola | football', 'Jadwal pertandingan bola'],
      ['livescore', 'skor | livebola', 'Skor bola live'],
      ['bluearchive-char', 'bachar', 'Info karakter Blue Archive'],
      ['gag', 'growagarden', 'Stok item Grow a Garden'],
      ['gag2', 'growagarden2', 'Stok GAG + mode watch'],
      ['harilibur', 'libur', 'Hari libur & nasional mendatang'],
      ['infotourney', 'tourney', 'Info turnamen Mobile Legends'],
    ],
  },
  {
    title: '🛠️ UTILITY',
    items: [
      ['ping', 'speed | p', 'Cek respons bot'],
      ['sh', 'search', 'Shell / pencarian'],
      ['ssweb', 'ss | webss', 'Screenshot website'],
    ],
  },
  {
    title: '👑 OWNER',
    items: [
      ['ai {provider}', '-', 'Ganti AI provider global'],
      ['self', '-', 'Toggle mode privat (hanya owner)'],
      ['ds', '-', 'Disconnect sementara'],
      ['setoken {token}', '-', 'Simpan token Vercel'],
      ['deploy', 'vercel', 'Deploy HTML ke Vercel'],
    ],
  },
]

function buildMenuText(m) {
  const prefix = m.prefix || '/'
  const namaBot = config.nama_ai || 'Nova AI'
  const namaOwner = 'Axel'
  const greeting = getGreeting()
  const totalCmd = MENU_SECTIONS.reduce((n, s) => n + s.items.length, 0)

  const line = '─'.repeat(28)
  let out = ''
  out += `╭─❒ ✦ 『 *${namaBot.toUpperCase()}* 』 ✦\n`
  out += `│ Selamat ${greeting}, ${m.pushName || 'Kak'} 👋\n`
  out += `│ Owner   : ${namaOwner}\n`
  out += `│ Prefix  : ${prefix}\n`
  out += `│ Total   : ${totalCmd} command\n`
  out += `╰${line}\n\n`

  for (const section of MENU_SECTIONS) {
    out += `┌─ ${section.title}\n`
    for (const [cmd, alias, desc] of section.items) {
      out += `│ ⟡ ${prefix}${cmd}`
      if (alias !== '-') out += ` _(${alias})_`
      out += `\n│    ${desc}\n`
    }
    out += `└${line}\n\n`
  }

  out += `✦ Ketik ${prefix}menu kapan aja buat liat daftar ini lagi.\n`
  out += `✦ Ada command yang belum aktif (masih proses setup), bakal nyusul ya.`

  return out
}

async function handler(m) {
  await m.reply(buildMenuText(m))
}

export { pluginConfig as config, handler }
