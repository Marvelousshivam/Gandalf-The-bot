const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('🧹 Bulk incinerate messages from this channel (1 - 100)')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to vaporize')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('from_user')
        .setDescription('Only delete messages sent by this specific user')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const fromUser = interaction.options.getUser('from_user');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let messagesToDelete = messages;

      if (fromUser) {
        messagesToDelete = messages.filter(m => m.author.id === fromUser.id);
      }

      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      const filterNotice = fromUser ? ` from <@${fromUser.id}>` : '';
      await interaction.editReply({
        embeds: [createSuccessEmbed(
          'Spell of Cleansing Cast',
          `Vaporized **${deleted.size}** message(s)${filterNotice} into the ether. Messages older than 14 days cannot be bulk deleted by Discord.`
        )]
      });
    } catch (err) {
      console.error('Purge error:', err);
      await interaction.editReply({
        embeds: [createErrorEmbed('Failed Cleansing', 'Could not delete messages. Ensure I have the `Manage Messages` permission.')]
      });
    }
  }
};
