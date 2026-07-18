// src/lib/ourin-context.js — shim kompatibilitas buat plugin gaya Ourin-MD.
// saluranCtx() balikin contextInfo yang bikin balesan bot kelihatan kayak
// "diteruskan dari channel/newsletter" — murni dekorasi tampilan doang,
// gak perlu channel itu beneran ada/dimiliki buat pesannya tetep kekirim.
//
// Bisa dikustomisasi: tambahin field "saluran": {"id": "...", "name": "..."}
// di config.json kalau mau pakai channel WA kamu sendiri.

import config from '../../config.js'

export function saluranCtx() {
  const saluranId = config.saluran?.id || '120363400911374213@newsletter'
  const saluranName = config.saluran?.name || config.bot?.name || config.nama_ai || 'Nova AI'
  return {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  }
}
