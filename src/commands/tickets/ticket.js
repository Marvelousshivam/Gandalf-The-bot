const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createTicket } = require('../../database');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎫 Open a private audience with server staff & the White Council')
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Briefly state the nature of your inquiry or issue')
        .setRequired(true)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString('reason').trim();
    const user = interaction.user;
    const guild = interaction.guild;

    await interaction.deferReply({ ephemeral: true });

    // Check if an existing open ticket channel already exists for user
    const existing = guild.channels.cache.find(c =>
      c.name.toLowerCase() === `ticket-${user.username.toLowerCase()}`
    );

    if (existing) {
      return interaction.editReply({
        embeds: [createErrorEmbed('Ticket Already Open', `You already have an open audience channel in ${existing}.`)]
      });
    }

    try {
      const channel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: guild.client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      });

      // Record ticket in database
      createTicket(guild.id, channel.id, user.id);

      const embed = createGandalfEmbed({
        title: `🎫 Private Audience: ${user.username}`,
        description: `Greetings, <@${user.id}>! Staff has been summoned to hear your counsel.\n\n` +
          `**Subject:** *"${reason}"*\n\n` +
          `Please explain your matter in detail. When finished, staff or you may click the button below to close this chamber.`,
        fields: [
          { name: '👤 Adventurer', value: `<@${user.id}>`, inline: true },
          { name: '📜 Reason', value: reason, inline: true }
        ],
        quote: 'A wizard listens before he advises.'
      });

      const closeBtn = new ButtonBuilder()
        .setCustomId('close_ticket_btn')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeBtn);

      await channel.send({ content: `<@${user.id}> Welcome to your private chamber!`, embeds: [embed], components: [row] });

      await interaction.editReply({
        content: `✅ Your private audience channel has been created: ${channel}!`
      });
    } catch (err) {
      console.error('Failed to create ticket channel:', err);
      await interaction.editReply({
        embeds: [createErrorEmbed('Creation Error', 'Could not open ticket channel. Ensure I have the `Manage Channels` permission.')]
      });
    }
  }
};
