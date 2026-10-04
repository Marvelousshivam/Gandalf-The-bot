const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { clearWarnings, getWarnings } = require('../../database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('✨ Pardon warnings recorded against an adventurer')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member whose warnings to clear')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('warning_id')
        .setDescription('Specific warning ID to clear (leave empty to wipe all)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const warningId = interaction.options.getInteger('warning_id');

    const existing = getWarnings(interaction.guildId, targetUser.id);
    if (!existing || existing.length === 0) {
      return interaction.reply({
        embeds: [createErrorEmbed('Nothing to Pardon', `<@${targetUser.id}> already has an unblemished record.`)],
        ephemeral: true
      });
    }

    if (warningId) {
      clearWarnings(interaction.guildId, targetUser.id, warningId);
      return interaction.reply({
        embeds: [createSuccessEmbed('Pardon Granted', `Warning **#${warningId}** for <@${targetUser.id}> has been expunged from the scrolls.`)]
      });
    } else {
      clearWarnings(interaction.guildId, targetUser.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Clean Slate', `All **${existing.length}** warnings for <@${targetUser.id}> have been forgiven and wiped clean. ✨`)]
      });
    }
  }
};
