// src/lib/ourin-http.js — shim kompatibilitas buat plugin gaya Ourin-MD.
// f(url) = GET request, balikin body JSON-nya langsung (bukan response axios).

import axios from 'axios'

export async function f(url, options = {}) {
  const res = await axios.get(url, { timeout: 20000, ...options })
  return res.data
}
