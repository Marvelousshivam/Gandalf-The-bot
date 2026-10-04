const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning, getGuildConfig } = require('../../database');
const { createModEmbed, createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Issue a solemn warning to an adventurer (Auto-punishes at 3 & 5 warnings)')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('The reason for this warning')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason');

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Fool of a Took!', 'You cannot cast a warning upon yourself.')],
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [createErrorEmbed('Arcane Resistance', 'Automatons and bots cannot be warned.')],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [createErrorEmbed('Adventurer Not Found', 'This user is not present in the realm.')],
        ephemeral: true
      });
    }

    // Role hierarchy check
    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [createErrorEmbed('Power Deficit', 'You cannot warn an adventurer with an equal or higher station in the realm.')],
        ephemeral: true
      });
    }

    // Record warning
    const result = addWarning(interaction.guildId, targetUser.id, interaction.user.id, reason);
    const count = result.count;

    let escalationNotice = '';

    // Check Auto-Punishment Thresholds
    if (count >= config.warnings.banThreshold) {
      escalationNotice = '\n\n🚨 **Threshold Reached (5/5 Warnings):** Automatic banishment to the void initiated!';
      if (member.bannable) {
        await member.ban({ reason: `Auto-ban: Exceeded ${config.warnings.banThreshold} warnings. Latest: ${reason}` }).catch(() => {});
      }
    } else if (count >= config.warnings.muteThreshold) {
      escalationNotice = '\n\n🔇 **Threshold Reached (3/5 Warnings):** Automatic 1-hour timeout applied!';
      if (member.moderatable) {
        await member.timeout(config.warnings.muteDurationMs, `Auto-mute: Reached ${count} warnings. Latest: ${reason}`).catch(() => {});
      }
    }

    // DM the user
    await targetUser.send({
      embeds: [createGandalfEmbed({
        title: `Warning Issued in ${interaction.guild.name}`,
        description: `You have received a formal warning from <@${interaction.user.id}>.\n\n**Reason:** ${reason}\n**Total Warnings:** \`${count}/5\`${escalationNotice}`,
        quote: 'A wizard gives fair warning before the lightning strikes.'
      })]
    }).catch(() => {});

    const embed = createGandalfEmbed({
      title: 'Solemn Warning Decreed',
      description: `I give you fair warning, <@${targetUser.id}>!\n\n**Reason:** ${reason}\n**Warning Count:** \`${count}/5\`${escalationNotice}`,
      fields: [
        { name: 'Target', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'Staff', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Total Infractions', value: `\`${count}\``, inline: true }
      ],
      quote: 'Even the wisest cannot look upon darkness without a warning.'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
