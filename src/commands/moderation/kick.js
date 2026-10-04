const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('🚪 Banish an adventurer from the Shire (Server Kick)')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for the exile')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Banished by decree of the White Council.';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [createErrorEmbed('Mishap', 'You cannot cast yourself out of the realm.')],
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

    if (!member.kickable) {
      return interaction.reply({
        embeds: [createErrorEmbed('Insufficient Power', 'I lack the arcane power to kick this member. My role must be higher than theirs.')],
        ephemeral: true
      });
    }

    // DM member
    await targetUser.send({
      embeds: [createGandalfEmbed({
        title: `Cast Out from ${interaction.guild.name}`,
        description: `You have been kicked from the realm.\n\n**Reason:** ${reason}`,
        quote: 'Go back to the shadows from whence you came!'
      })]
    }).catch(() => {});

    await member.kick(reason);

    const embed = createGandalfEmbed({
      title: 'Banishment from the Shire',
      description: `*Go back to the shadows!* <@${targetUser.id}> has been cast out from the gates of **${interaction.guild.name}**.`,
      fields: [
        { name: 'Banished Adventurer', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
        { name: 'Staff Magistrate', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Decree / Reason', value: reason, inline: false }
      ],
      quote: 'You shall not pass through these gates uninvited.'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
