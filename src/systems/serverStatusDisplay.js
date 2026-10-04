const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { generateStatusBanner } = require('./statusBanner');

/**
 * Build the complete grand Minecraft server status display (embed, canvas banner, interactive buttons)
 * @param {Object} status
 * @param {string} address
 * @param {number} port
 * @param {string|null} liveChatChannelId
 * @returns {Promise<{embeds: EmbedBuilder[], files: import('discord.js').AttachmentBuilder[], components: ActionRowBuilder[]}>}
 */
async function buildStatusDisplay(status, address, port, liveChatChannelId = null) {
  const isOnline = !!status.online;
  const statusEmoji = isOnline ? '🟢' : '🔴';
  const color = isOnline ? 0x2ecc71 : 0xe74c3c;

  const playerList = status.players.list.length > 0
    ? status.players.list.map(p => {
        const isCreator = p.toLowerCase() === 'shivamraj616' || p.toLowerCase() === 'dinesh';
        return `> 🟩 **\`${p}\`** ${isCreator ? '✦ *Lord of the Realm*' : '• *Adventurer*'}`;
      }).join('\n')
    : (isOnline
        ? '> *The lands are peaceful. No adventurers currently roaming.*'
        : '> *The realm sleeps in stillness. Awaken it on your Aternos dashboard.*');

  const bannerAttachment = await generateStatusBanner({
    online: isOnline,
    ip: address,
    port: port,
    version: status.version,
    players: status.players,
    motd: status.motd
  });

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: '✦ MINECRAFT WEEK ✦ · MULTIPLAYER REALM',
      iconURL: 'https://crafthead.net/helm/shivamraj616/128'
    })
    .setTitle(`${statusEmoji} Realm Status: ${isOnline ? 'ONLINE & READY FOR QUESTS' : 'OFFLINE / SLEEPING'}`)
    .setDescription(
      isOnline
        ? `> ⚔️ *"All we have to decide is what to do with the time that is given us."*\n> The cubic gates stand wide! Venture forth, mine deep, and forge your legacy.`
        : `> 💤 *"Even the sun must set, and shadows deepen over the valleys."*\n> Aternos servers sleep when empty. Start the server from your Aternos dashboard to enter!`
    )
    .addFields(
      {
        name: '🌐 Direct Connection (Java & Bedrock)',
        value: `\`\`\`yaml\nAddress : ${address}\nPort    : ${port}\nEdition : Java & Bedrock (Cracked OK)\n\`\`\``,
        inline: false
      },
      {
        name: '👥 Adventurers',
        value: `\`${status.players.online} / ${status.players.max} Online\``,
        inline: true
      },
      {
        name: '🏷️ Core Engine',
        value: `\`Paper ${status.version}\``,
        inline: true
      },
      {
        name: '⚡ Link Health',
        value: isOnline ? '`100% TCP Direct`' : '`Dormant`',
        inline: true
      },
      {
        name: '📜 Active Fellowship in World',
        value: playerList,
        inline: false
      }
    )
    .setImage('attachment://server-status.png')
    .setFooter({
      text: `🔄 Auto-refreshes every 5 mins • Last updated: ${new Date().toLocaleTimeString()} • Gandalf the BOT`,
      iconURL: 'https://crafthead.net/helm/shivamraj616/128'
    })
    .setTimestamp();

  // Interactive buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_refresh_status')
      .setLabel('Refresh Status')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_copy_ip')
      .setLabel('Copy Server IP')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
  );

  if (liveChatChannelId) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('btn_live_chat_info')
        .setLabel('In-Game Live Chat')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return {
    embeds: [embed],
    files: [bannerAttachment],
    components: [row]
  };
}

module.exports = {
  buildStatusDisplay
};
