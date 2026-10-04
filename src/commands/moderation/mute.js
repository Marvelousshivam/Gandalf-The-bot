const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('🔇 Silence an unruly adventurer (Discord Timeout)')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member to silence')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('Duration of silence in minutes (1 - 40320)')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the silence decree')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'Silenced by decree of the White Council.';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Mishap', 'You cannot cast silence upon your own tongue.')],
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

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [createErrorEmbed('Insufficient Power', 'I cannot place this member in timeout. Ensure my bot role is higher than theirs.')],
        ephemeral: true
      });
    }

    const durationMs = minutes * 60 * 1000;
    await member.timeout(durationMs, reason);

    const embed = createGandalfEmbed({
      title: '🔇 Silence Decreed!',
      description: `*Your tongue is poisoned, <@${targetUser.id}>!* You have been placed under a spell of silence for **${minutes} minute(s)**.`,
      fields: [
        { name: 'Silenced Adventurer', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'Staff Magistrate', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Duration', value: `${minutes} minute(s) (Expires <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>)`, inline: true },
        { name: 'Reason', value: reason, inline: false }
      ],
      quote: 'Keep your forked tongue behind your teeth!'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
