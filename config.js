// config.js — jembatan buat plugin yang butuh `import config from '.../config.js'`
// (format ES module), padahal Nova AI nyimpen setting di config.json.
// File ini CUMA baca config.json, gak pernah nulis/ubah apapun di sana.
// Ditaruh di root project biar `../../config.js` dari plugins/<kategori>/x.js nyampe ke sini.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || __dirname
const CONFIG_PATH = path.join(DATA_DIR, 'config.json')

function readRawConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

const raw = readRawConfig()

// `vercel` dibikin getter biar tiap diakses baca ulang config.json —
// jadi begitu /setoken update token, plugin langsung kepake tanpa restart bot.
// Field lain (saluran, bot, APIkey, dll) di-passthrough dari config.json apa
// adanya kalau ada; kalau gak ada, plugin yang makek udah sedia fallback
// sendiri (pola `config.xxx?.yyy || default` di semua plugin baru).
const configBridge = {
  ...raw,
  get vercel() {
    const fresh = readRawConfig()
    return { token: fresh.vercel_token || process.env.VERCEL_TOKEN || null }
  }
}

export default configBridge
