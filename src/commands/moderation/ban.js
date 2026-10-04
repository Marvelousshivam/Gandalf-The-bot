const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('⚡ Cast an offender into the eternal void (Server Ban)')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member to banish')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the void banishment')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('delete_days')
        .setDescription('Days of message history to incinerate (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Banished to the void by decree of the White Council.';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Mishap', 'You cannot cast the spell of banishment upon yourself.')],
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [createErrorEmbed('Insufficient Power', 'I lack the arcane power to banish this member. Ensure my bot role is higher than theirs.')],
        ephemeral: true
      });
    }

    // DM member
    await targetUser.send({
      embeds: [createGandalfEmbed({
        title: `Cast into the Void from ${interaction.guild.name}`,
        description: `YOU SHALL NOT PASS! You have been permanently banished from the server.\n\n**Reason:** ${reason}`,
        quote: 'The dark fire will not avail you, flame of Udûn!'
      })]
    }).catch(() => {});

    await interaction.guild.members.ban(targetUser.id, {
      reason: reason,
      deleteMessageSeconds: deleteDays * 86400
    });

    const embed = createGandalfEmbed({
      title: '⚡ YOU SHALL NOT PASS!',
      description: `**<@${targetUser.id}>** has been cast into the eternal void and struck from the gates of **${interaction.guild.name}**.`,
      fields: [
        { name: 'Banished Soul', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'Staff Magistrate', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Incinerated History', value: `${deleteDays} day(s) of messages`, inline: true },
        { name: 'Decree / Reason', value: reason, inline: false }
      ],
      quote: 'Go back to the shadow!'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
