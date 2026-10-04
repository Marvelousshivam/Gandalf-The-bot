const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getWarnings } = require('../../database');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('📜 View an adventurer\'s past warnings and record of deeds')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member whose warnings to inspect')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const warningsList = getWarnings(interaction.guildId, targetUser.id);

    if (!warningsList || warningsList.length === 0) {
      return interaction.reply({
        embeds: [createMinecraftEmbed({
          title: `📜 Clean Record: ${targetUser.username}`,
          description: `The scrolls contain no marks against <@${targetUser.id}>. A spotless path in this realm! ✨`,
          color: config.colors.minecraft.green
        })]
      });
    }

    const fields = warningsList.slice(0, 10).map((w, index) => ({
      name: `#${w.id} • ${w.created_at}`,
      value: `**Reason:** ${w.reason}\n**Staff:** <@${w.moderator_id}>`,
      inline: false
    }));

    const embed = createMinecraftEmbed({
      title: `📜 Warning Record: ${targetUser.username} (${warningsList.length} total)`,
      description: `Here are the infractions recorded against <@${targetUser.id}>:`,
      color: config.colors.minecraft.red,
      fields: fields,
      footer: `Showing ${fields.length} of ${warningsList.length} total warning(s)`
    });

    await interaction.reply({ embeds: [embed] });
  }
};
