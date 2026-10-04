const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('🎭 Spawn interactive button role picker for Minecraft Editions & Notifications')
    .addRoleOption(opt => opt.setName('java_role').setDescription('Role for Java Edition players').setRequired(true))
    .addRoleOption(opt => opt.setName('bedrock_role').setDescription('Role for Bedrock Edition players').setRequired(true))
    .addRoleOption(opt => opt.setName('announcements_role').setDescription('Role for Server Announcement pings').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const javaRole = interaction.options.getRole('java_role');
    const bedrockRole = interaction.options.getRole('bedrock_role');
    const announcementsRole = interaction.options.getRole('announcements_role');

    const embed = createMinecraftEmbed({
      title: '🎭 Choose Your Roles & Edition',
      description: 'Click the buttons below to claim or remove your roles. Let fellow adventurers know how you play!\n',
      color: config.colors.minecraft.aqua,
      fields: [
        { name: '☕ Java Edition', value: `Gives the <@&${javaRole.id}> role`, inline: true },
        { name: '🪨 Bedrock Edition', value: `Gives the <@&${bedrockRole.id}> role`, inline: true },
        ...(announcementsRole ? [{ name: '🔔 Announcements', value: `Gives the <@&${announcementsRole.id}> role`, inline: true }] : [])
      ],
      footer: 'Click a button to toggle the role on/off anytime!'
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`role_toggle_${javaRole.id}`)
        .setLabel('☕ Java Edition')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`role_toggle_${bedrockRole.id}`)
        .setLabel('🪨 Bedrock Edition')
        .setStyle(ButtonStyle.Secondary)
    ];

    if (announcementsRole) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`role_toggle_${announcementsRole.id}`)
          .setLabel('🔔 Announcements')
          .setStyle(ButtonStyle.Success)
      );
    }

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: '✅ Interactive role selection panel has been created in this channel!',
      ephemeral: true
    });
  }
};
