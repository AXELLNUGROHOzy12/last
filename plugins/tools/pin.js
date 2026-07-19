import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser,
} from "@whiskeysockets/baileys"; // FIX: Import dari Baileys langsung
import crypto from "crypto";
import te from "../../src/lib/ourin-error.js";
import { f } from "../../src/lib/ourin-http.js";
import { AIRich } from "../../src/lib/ourin-builder.js";

const pluginConfig = {
  name: "pin",
  alias: ["pinsearch", "pinterestsearch", "pins"],
  category: "tools",
  description: "Cari gambar di Pinterest (album)",
  usage: ".pin <query>",
  example: ".pin Zhao Lusi",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query) {
    return m.reply(
      `🔍 *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
      `> Contoh:\n` +
      `\`${m.prefix}pin Zhao Lusi\``
    );
  }
  m.react("🕕");

  try {
    // FIX: Menggunakan API Publik alternatif yang aman dari blokiran WAF Cloudflare
    const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`;
    const data = await f(apiUrl);

    // Menyesuaikan dengan format response API baru
    const results = data?.data?.slice(0, 10);
    if (!results || results.length === 0) {
      m.react("❌");
      return m.reply(`❌ Tidak ditemukan hasil untuk: ${query}`);
    }

    const mediaList = [];

    for (const imageUrl of results) {
      if (!imageUrl) continue;

      try {
        // FIX: Menggunakan Native Fetch + Fake User-Agent agar tidak diblokir
        const imgRes = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            }
        });
        
        if (!imgRes.ok) continue;
        
        const arrayBuffer = await imgRes.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuffer);

        if (imgBuffer.length > 1000) {
          mediaList.push({ image: imgBuffer });
        }
      } catch (e) {
        continue;
      }
    }

    if (mediaList.length === 0) {
      m.react("❌");
      return m.reply("❌ Gagal memuat gambar dari Pinterest.");
    }

    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: mediaList.length,
            expectedVideoCount: 0,
          },
        },
        {
          userJid: jidNormalizedUser(sock.user.id),
          quoted: m,
          upload: sock.waUploadToServer,
        }
      );

      await sock.relayMessage(opener.key.remoteJid, opener.message, {
        messageId: opener.key.id,
      });

      for (const content of mediaList) {
        const msg = await generateWAMessage(opener.key.remoteJid, content, {
          upload: sock.waUploadToServer,
        });

        msg.message.messageContextInfo = {
          messageSecret: crypto.randomBytes(32),
          messageAssociation: {
            associationType: 1,
            parentMessageKey: opener.key,
          },
        };

        await sock.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id,
        });
      }

      m.react("✅");
    } catch (albumErr) {
      console.log("[Pins] Album gagal, kirim satu-satu:", albumErr.message);

      // FIX: Amankan fallback config agar tidak memicu ReferenceError
      const saluranId = global.config?.saluran?.id || "120363400911374213@newsletter";
      const saluranName = global.config?.saluran?.name || global.config?.bot?.name || "Ourin-AI";

      for (const content of mediaList) {
        await sock.sendMessage(
          m.chat,
          {
            image: content.image,
            contextInfo: {
              forwardingScore: 9999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: saluranId,
                newsletterName: saluranName,
                serverMessageId: 127,
              },
            },
          },
          { quoted: m }
        );
      }
    }
    m.react("✅");
  } catch (err) {
    console.error("[Pins] Error:", err.message);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
