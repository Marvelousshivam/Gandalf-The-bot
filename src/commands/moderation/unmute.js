const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('🗣️ Restore an adventurer\'s voice (Remove Timeout)')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The member whose voice to restore')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        embeds: [createErrorEmbed('Adventurer Not Found', 'This user is not present in the realm.')],
        ephemeral: true
      });
    }

    if (!member.isCommunicationDisabled()) {
      return interaction.reply({
        embeds: [createErrorEmbed('Already Unbound', `<@${targetUser.id}> is not currently silenced.`)],
        ephemeral: true
      });
    }

    await member.timeout(null, `Unmuted by ${interaction.user.tag}`);

    const embed = createGandalfEmbed({
      title: '🗣️ Voice Restored!',
      description: `*Speak, friend, and enter!* <@${targetUser.id}> has had their silence lifted. You may converse once more in peace.`,
      fields: [
        { name: 'Restored Adventurer', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Staff Magistrate', value: `<@${interaction.user.id}>`, inline: true }
      ],
      quote: 'The dark fog clears, and words may flow again.'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
