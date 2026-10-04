const { SlashCommandBuilder } = require('discord.js');
const { getServerStatus } = require('../../utils/minecraft-api');
const { buildStatusDisplay } = require('../../systems/serverStatusDisplay');
const { getGuildConfig } = require('../../database');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('⛏️ Inquire into the current life and breath of the Minecraft server')
    .addStringOption(opt =>
      opt.setName('address')
        .setDescription('Server address (defaults to configured Aternos server)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('port')
        .setDescription('Server port (defaults to 25565)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const guildConfig = getGuildConfig(interaction.guildId);
    const serverAddress = interaction.options.getString('address') || guildConfig.mc_server_address || process.env.MC_SERVER_ADDRESS || 'YourServer.aternos.me';
    const serverPort = interaction.options.getInteger('port') || guildConfig.mc_server_port || 25565;

    const status = await getServerStatus(serverAddress, serverPort);
    const display = await buildStatusDisplay(status, serverAddress, serverPort, guildConfig.live_chat_channel_id);

    await interaction.editReply(display);
  }
};
