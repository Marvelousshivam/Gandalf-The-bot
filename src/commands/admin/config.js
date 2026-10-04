const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../database');
const { createMinecraftEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('⚙️ Configure Gandalf the BOT channels, roles, and toggles for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Inspect all current server configuration values')
    )
    .addSubcommand(sub =>
      sub.setName('welcome')
        .setDescription('Set the channel for Minecraft Title Screen welcome cards')
        .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('goodbye')
        .setDescription('Set the channel for player leave messages')
        .addChannelOption(opt => opt.setName('channel').setDescription('Leave notices channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('Set the channel for staff audit logs')
        .addChannelOption(opt => opt.setName('channel').setDescription('Mod log channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Set the channel for auto-updating Minecraft server status')
        .addChannelOption(opt => opt.setName('channel').setDescription('Status channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('livechat')
        .setDescription('Set the DiscordSRV Minecraft in-game chat bridge channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('In-game chat bridge channel (e.g. #live-chat)').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('server')
        .setDescription('Set the default Minecraft server address & port')
        .addStringOption(opt => opt.setName('address').setDescription('Server address (e.g. yourserver.aternos.me)').setRequired(true))
        .addIntegerOption(opt => opt.setName('port').setDescription('Server port (default: 25565)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('verifiedrole')
        .setDescription('Set the role granted upon rules verification')
        .addRoleOption(opt => opt.setName('role').setDescription('Verified role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('muterole')
        .setDescription('Set the mute/silenced role')
        .addRoleOption(opt => opt.setName('role').setDescription('Mute role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('moviechannel')
        .setDescription('Set the movie night announcements & screenings channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Movie night channel').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('movierole')
        .setDescription('Set the Movie Host or Movie Night notification ping role')
        .addRoleOption(opt => opt.setName('role').setDescription('Movie role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable specific bot systems')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Feature to toggle')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome Cards', value: 'welcome_enabled' },
              { name: 'Leave Notices', value: 'goodbye_enabled' },
              { name: 'Auto-Moderation', value: 'automod_enabled' },
              { name: 'XP & Leveling', value: 'xp_enabled' },
              { name: 'Gandalf Greetings', value: 'gandalf_greetings_enabled' }
            )
        )
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === 'view') {
      const cfg = getGuildConfig(guildId);

      const embed = createMinecraftEmbed({
        title: `⚙️ Realm Configuration: ${interaction.guild.name}`,
        description: 'Current configuration matrix stored in the ancient grimoire database:\n',
        color: config.colors.minecraft.aqua,
        fields: [
          {
            name: '📜 Channels',
            value: `• **Welcome:** ${cfg.welcome_channel_id ? `<#${cfg.welcome_channel_id}>` : '*Not set*'}\n• **Goodbye:** ${cfg.goodbye_channel_id ? `<#${cfg.goodbye_channel_id}>` : '*Not set*'}\n• **Audit Logs:** ${cfg.log_channel_id ? `<#${cfg.log_channel_id}>` : '*Not set*'}\n• **Server Status:** ${cfg.status_channel_id ? `<#${cfg.status_channel_id}>` : '*Not set*'}\n• **Live Chat Bridge:** ${cfg.live_chat_channel_id ? `<#${cfg.live_chat_channel_id}>` : '*Not set*'}\n• **Movie Nights:** ${cfg.movie_channel_id ? `<#${cfg.movie_channel_id}>` : '*Not set*'}`,
            inline: false
          },
          {
            name: '⛏️ Minecraft Server Query',
            value: `• **Address:** \`${cfg.mc_server_address || 'YourServer.aternos.me'}\`\n• **Port:** \`${cfg.mc_server_port || 25565}\``,
            inline: false
          },
          {
            name: '🛡️ Roles',
            value: `• **Verified Role:** ${cfg.verified_role_id ? `<@&${cfg.verified_role_id}>` : '*Not set*'}\n• **Mute Role:** ${cfg.mute_role_id ? `<@&${cfg.mute_role_id}>` : '*Not set*'}\n• **Movie Host/Ping Role:** ${cfg.movie_role_id ? `<@&${cfg.movie_role_id}>` : '*Not set*'}`,
            inline: true
          },
          {
            name: '⚡ Feature Toggles',
            value: `• Welcome: ${cfg.welcome_enabled ? '✅' : '❌'}\n• Goodbye: ${cfg.goodbye_enabled ? '✅' : '❌'}\n• Auto-Mod: ${cfg.automod_enabled ? '✅' : '❌'}\n• XP Engine: ${cfg.xp_enabled ? '✅' : '❌'}\n• Gandalf Chat: ${cfg.gandalf_greetings_enabled ? '✅' : '❌'}`,
            inline: true
          }
        ],
        footer: 'Admin Configuration Panel • Gandalf the BOT'
      });

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'welcome') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'welcome_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Welcome Channel Assigned', `Minecraft Title Screen welcome cards will now appear in ${channel}.`)]
      });
    }

    if (subcommand === 'goodbye') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'goodbye_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Leave Channel Assigned', `Yellow in-game leave notifications will now appear in ${channel}.`)]
      });
    }

    if (subcommand === 'logs') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'log_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Audit Log Assigned', `Staff moderation actions and deleted messages will be logged in ${channel}.`)]
      });
    }

    if (subcommand === 'status') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'status_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Status Channel Assigned', `Live Minecraft server tracking channel set to ${channel}. Run \`/setup-status\` to post the auto-updating embed!`)]
      });
    }

    if (subcommand === 'livechat') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'live_chat_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('In-Game Live Chat Assigned', `DiscordSRV in-game bridge channel set to ${channel}.\nGandalf will now listen to in-game \`!gandalf\` questions and react to player deaths!`)]
      });
    }

    if (subcommand === 'server') {
      const address = interaction.options.getString('address').trim();
      const port = interaction.options.getInteger('port') || 25565;
      updateGuildConfig(guildId, 'mc_server_address', address);
      updateGuildConfig(guildId, 'mc_server_port', port);
      return interaction.reply({
        embeds: [createSuccessEmbed('Minecraft Server Address Set', `Default server set to \`${address}:${port}\`. Live status queries will now monitor this server!`)]
      });
    }

    if (subcommand === 'verifiedrole') {
      const role = interaction.options.getRole('role');
      updateGuildConfig(guildId, 'verified_role_id', role.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Verified Role Configured', `Members who click the rule verification button will now receive the **${role.name}** role.`)]
      });
    }

    if (subcommand === 'muterole') {
      const role = interaction.options.getRole('role');
      updateGuildConfig(guildId, 'mute_role_id', role.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Mute Role Configured', `Silenced members will receive the **${role.name}** role.`)]
      });
    }

    if (subcommand === 'moviechannel') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, 'movie_channel_id', channel.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Movie Night Channel Assigned', `Screening cards, RSVPs, and showtime reminders will be announced in ${channel}.`)]
      });
    }

    if (subcommand === 'movierole') {
      const role = interaction.options.getRole('role');
      updateGuildConfig(guildId, 'movie_role_id', role.id);
      return interaction.reply({
        embeds: [createSuccessEmbed('Movie Role Configured', `Members with **${role.name}** can host official movie nights, and will be pinged for showtime reminders.`)]
      });
    }

    if (subcommand === 'toggle') {
      const feature = interaction.options.getString('feature');
      const enabled = interaction.options.getBoolean('enabled') ? 1 : 0;
      updateGuildConfig(guildId, feature, enabled);
      return interaction.reply({
        embeds: [createSuccessEmbed('System Toggle Updated', `Feature **${feature}** is now ${enabled ? '`ENABLED ✅`' : '`DISABLED ❌`'}.`)]
      });
    }
  }
};
