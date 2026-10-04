const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getServerStatus } = require('../../utils/minecraft-api');
const { buildStatusDisplay } = require('../../systems/serverStatusDisplay');
const { getGuildConfig, updateGuildConfig } = require('../../database');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-status')
    .setDescription('📡 Spawn a persistent, auto-updating live Minecraft server status embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildConfig = getGuildConfig(interaction.guildId);
    const serverAddress = guildConfig.mc_server_address || process.env.MC_SERVER_ADDRESS || 'YourServer.aternos.me';
    const serverPort = guildConfig.mc_server_port || 25565;

    const status = await getServerStatus(serverAddress, serverPort);
    const display = await buildStatusDisplay(status, serverAddress, serverPort, guildConfig.live_chat_channel_id);

    const statusMessage = await interaction.channel.send(display);

    // Store in database
    updateGuildConfig(interaction.guildId, 'status_channel_id', interaction.channelId);
    updateGuildConfig(interaction.guildId, 'status_message_id', statusMessage.id);

    await interaction.editReply({
      content: `✅ Live server status embed established! It will continuously refresh every 5 minutes.`
    });
  }
};
