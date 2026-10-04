const { SlashCommandBuilder } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Checks Gandalf the BOT latency and API heartbeat'),

  async execute(interaction) {
    const response = await interaction.reply({
      content: '⚡ Sending magical pulse...',
      withResponse: true
    });

    const sent = response.resource?.message;
    const latency = sent ? (sent.createdTimestamp - interaction.createdTimestamp) : 0;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = createMinecraftEmbed({
      title: '🏓 Pong! Wizard Heartbeat',
      description: 'The arcane connection is solid across the realms.',
      color: config.colors.minecraft.green,
      fields: [
        { name: '📡 Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: '🌐 Discord API Gateway', value: `\`${apiLatency}ms\``, inline: true },
        { name: '⏳ Uptime', value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`, inline: true }
      ]
    });

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
