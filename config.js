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

// `vercel` dibikin getter biar tiap diakses baca ulang config.json —
// jadi begitu /setoken update token, plugin langsung kepake tanpa restart bot.
const configBridge = {
  get vercel() {
    const raw = readRawConfig()
    return { token: raw.vercel_token || process.env.VERCEL_TOKEN || null }
  }
}

export default configBridge
