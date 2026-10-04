const { SlashCommandBuilder } = require('discord.js');
const { getOpenTicket, closeTicket } = require('../../database');
const { createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-ticket')
    .setDescription('🔒 Close and archive the active ticket channel'),

  async execute(interaction) {
    const ticket = getOpenTicket(interaction.channelId);

    if (!ticket && !interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({
        embeds: [createErrorEmbed('Invalid Channel', 'This command can only be invoked within an active support ticket channel.')],
        ephemeral: true
      });
    }

    await interaction.reply({
      content: '🔒 Closing and archiving this ticket in 5 seconds...',
      ephemeral: false
    });

    closeTicket(interaction.channelId);

    setTimeout(async () => {
      await interaction.channel.delete().catch(() => {});
    }, 5000);
  }
};
