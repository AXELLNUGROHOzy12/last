export default {
  command: ['sh', 'search'],
  handler: async (msg, sock, args) => {
    const from = msg.key.remoteJid;
    // Gabungin argumen jadi teks pencarian
    const query = args.slice(1).join(' ').trim();

    // Kalo usernya lupa ngasih pertanyaan
    if (!query) {
      return await sock.sendMessage(from, { 
        text: `🔍 *PENCARIAN PINTAR*\n\n> Cari informasi cepat dari Wikipedia\n\n> *Contoh:*\n> /sh Sejarah Indonesia\n> /sh Albert Einstein` 
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⏳ *Lagi nyari informasinya, sabar dawg...*" }, { quoted: msg });

    try {
      // Kita tembak ke API Wikipedia Indo yang 100% gratis dan no-limit
      const res = await fetch(`https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`);
      const data = await res.json();
      
      const titles = data[1];
      const descriptions = data[2];
      const links = data[3];

      // Kalo ga dapet hasil
      if (!titles || titles.length === 0) {
        return await sock.sendMessage(from, { 
          text: `❌ Waduh king, info soal "*${query}*" kaga ketemu nih.` 
        }, { quoted: msg });
      }

      // Ngeracik hasil pencariannya biar rapi
      let replyText = `🔍 *Hasil Pencarian: ${query}*\n\n`;
      for (let i = 0; i < titles.length; i++) {
        replyText += `*${i + 1}. ${titles[i]}*\n`;
        if (descriptions[i]) replyText += `> ${descriptions[i]}\n`;
        replyText += `🔗 ${links[i]}\n\n`;
      }

      // Kirim balik ke user
      await sock.sendMessage(from, { text: replyText.trim() }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(from, { text: `❌ Error ngab: ${error.message}` }, { quoted: msg });
    }
  }
}
