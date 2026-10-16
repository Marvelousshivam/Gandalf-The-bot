const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel
} = require('discord.js');
const {
  createMinecraftEvent,
  updateMinecraftEventMessage,
  getActiveMinecraftEvents,
  cancelMinecraftEvent,
  getGuildConfig
} = require('../../database');
const { generateMinecraftEventBanner } = require('../../systems/minecraftEventBanner');
const { buildMinecraftEventEmbed } = require('../../systems/minecraftEventDisplay');
const { createMinecraftEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embedBuilder');

function parseTimeStr(str) {
  if (!str) return null;
  const raw = str.toLowerCase().trim();
  const now = new Date();

  // Relative offset: "in 30 mins", "in 2 hours", "in 1 day"
  const relMatch = raw.match(/^in\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours|d|days?)$/);
  if (relMatch) {
    const val = parseInt(relMatch[1]);
    const unit = relMatch[2][0];
    if (unit === 'm') return new Date(now.getTime() + val * 60 * 1000);
    if (unit === 'h') return new Date(now.getTime() + val * 3600 * 1000);
    if (unit === 'd') return new Date(now.getTime() + val * 86400 * 1000);
  }

  // Day + time: "today 8pm", "tomorrow at 9:30 pm", "tomorrow 8pm"
  const dayTimeMatch = raw.match(/^(today|tomorrow)?\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (dayTimeMatch) {
    let day = dayTimeMatch[1] || 'today';
    let hours = parseInt(dayTimeMatch[2]);
    let mins = dayTimeMatch[3] ? parseInt(dayTimeMatch[3]) : 0;
    let mer = dayTimeMatch[4];
    if (mer === 'pm' && hours < 12) hours += 12;
    if (mer === 'am' && hours === 12) hours = 0;

    const d = new Date(now);
    if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    d.setHours(hours, mins, 0, 0);
    if (d < now && day === 'today') d.setDate(d.getDate() + 1);
    return d;
  }

  // Standard date parsing (e.g. "2026-10-17 20:00")
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mc-event')
    .setDescription('⛏️ Plan and announce grand Minecraft server launch events & game nights')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand(sub =>
      sub
        .setName('launch')
        .setDescription('Create a beautiful Minecraft launch announcement card & Discord Guild Scheduled Event')
        .addStringOption(opt =>
          opt
            .setName('time')
            .setDescription('When the server opens? (e.g. "tomorrow 8pm", "Friday at 7pm", "in 2 days")')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('title')
            .setDescription('Event title (e.g. "Minecraft WEEK: Realm Grand Launch")')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('theme')
            .setDescription('Visual palette for the Canvas banner & announcement')
            .setRequired(false)
            .addChoices(
              { name: '🌿 Overworld / Emerald (Default)', value: 'overworld' },
              { name: '🔥 The Nether / Crimson & Lava', value: 'nether' },
              { name: '🔮 The End / Dragon Raid & Void', value: 'the_end' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('address')
            .setDescription('Server address (defaults to configured realm IP)')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt
            .setName('port')
            .setDescription('Server port (defaults to configured realm port)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('version')
            .setDescription('Minecraft version (e.g. "1.21.x (Java & Bedrock)")')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Destination channel (defaults to configured announcement channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('ping')
            .setDescription('Optional role or mention to broadcast with the announcement')
            .setRequired(false)
            .addChoices(
              { name: '📢 @everyone', value: '@everyone' },
              { name: '🔔 @here', value: '@here' },
              { name: '⚔️ None (Silent Announcement)', value: 'none' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('notes')
            .setDescription('Custom lore, instructions, or voice chat details from staff')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('View upcoming scheduled Minecraft events for this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel an active scheduled Minecraft server event')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Event ID to cancel (find via /mc-event list)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const cfg = getGuildConfig(guildId);

    // ==========================================
    // 1. SUBCOMMAND: LIST
    // ==========================================
    if (subcommand === 'list') {
      const events = getActiveMinecraftEvents(guildId);
      if (!events || events.length === 0) {
        return interaction.reply({
          embeds: [createMinecraftEmbed({
            title: '📜 Scheduled Minecraft Events',
            description: 'No Minecraft realm launch events are currently on the calendar.\nPlan one using `/mc-event launch`!'
          })],
          ephemeral: true
        });
      }

      const listFields = events.map(ev => ({
        name: `🆔 #${ev.id}: ${ev.title}`,
        value: `• **Showtime:** <t:${ev.start_time}:F> (<t:${ev.start_time}:R>)\n• **Address:** \`${ev.address}:${ev.port}\`\n• **Channel:** <#${ev.channel_id}>`,
        inline: false
      }));

      const embed = createMinecraftEmbed({
        title: `⛏️ Active Minecraft Events: ${interaction.guild.name}`,
        description: 'Here are the upcoming expeditions and server launches registered in the grimoire:',
        fields: listFields
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ==========================================
    // 2. SUBCOMMAND: CANCEL
    // ==========================================
    if (subcommand === 'cancel') {
      const eventId = interaction.options.getInteger('id');
      cancelMinecraftEvent(eventId);
      return interaction.reply({
        embeds: [createSuccessEmbed('Event Cancelled', `Minecraft realm event **#${eventId}** has been cancelled and archived.`)],
        ephemeral: true
      });
    }

    // ==========================================
    // 3. SUBCOMMAND: LAUNCH
    // ==========================================
    if (subcommand === 'launch') {
      await interaction.deferReply({ ephemeral: true });

      const timeInput = interaction.options.getString('time');
      const targetDate = parseTimeStr(timeInput);

      if (!targetDate || isNaN(targetDate.getTime())) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Invalid Time Format', `Could not parse \`${timeInput}\`.\nTry formats like: \`tomorrow 8pm\`, \`today 9:30pm\`, \`in 2 hours\`, or \`2026-10-17 20:00\`.`)]
        });
      }

      if (targetDate.getTime() < Date.now() - 60000) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Time in Past', 'The scheduled launch time must be in the future!')]
        });
      }

      const title = interaction.options.getString('title') || 'Minecraft WEEK: Realm Grand Launch';
      const theme = interaction.options.getString('theme') || 'overworld';
      const address = interaction.options.getString('address') || cfg.mc_server_address || process.env.MC_SERVER_ADDRESS || 'Fellowshiptotheend.aternos.me';
      const port = interaction.options.getInteger('port') || cfg.mc_server_port || (process.env.MC_SERVER_PORT ? Number(process.env.MC_SERVER_PORT) : 20974);
      const version = interaction.options.getString('version') || '1.21.x (Java & Bedrock)';
      const pingChoice = interaction.options.getString('ping');
      const notes = interaction.options.getString('notes');

      // Resolve destination channel: option -> config -> current channel
      const explicitChannel = interaction.options.getChannel('channel');
      let targetChannel = explicitChannel;
      if (!targetChannel && cfg.announcement_channel_id) {
        targetChannel = interaction.guild.channels.cache.get(cfg.announcement_channel_id);
      }
      if (!targetChannel) {
        targetChannel = interaction.channel;
      }

      // Check bot permissions in target channel
      const botMember = interaction.guild.members.me;
      const perms = targetChannel.permissionsFor(botMember);
      if (!perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.editReply({
          embeds: [createErrorEmbed('Channel Permission Error', `I lack permissions to post in ${targetChannel}. Ensure I have **Send Messages** and **Embed Links** permissions.`)]
        });
      }

      const startUnix = Math.floor(targetDate.getTime() / 1000);

      // Generate Canvas Banner
      const { attachment, buffer } = await generateMinecraftEventBanner({
        title,
        startTime: targetDate,
        address,
        port,
        version,
        theme
      });

      // Attempt to create native Discord Guild Scheduled Event
      let discordEventId = null;
      try {
        const endTime = new Date(targetDate.getTime() + 4 * 3600 * 1000); // 4 hour duration default
        const scheduledEvent = await interaction.guild.scheduledEvents.create({
          name: title.substring(0, 80),
          scheduledStartTime: targetDate,
          scheduledEndTime: endTime,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: GuildScheduledEventEntityType.External,
          entityMetadata: { location: `${address}:${port}` },
          description: (notes ? `${notes}\n\n` : '') + `Server IP: ${address}:${port}\nVersion: ${version}\nHost: @${interaction.user.username}`,
          image: buffer || undefined
        });
        discordEventId = scheduledEvent?.id || null;
      } catch (err) {
        console.warn('Could not create Discord Guild Scheduled Event:', err.message);
      }

      // Save event in SQLite database
      const eventId = createMinecraftEvent(
        guildId,
        targetChannel.id,
        interaction.user.id,
        title,
        startUnix,
        address,
        port,
        version,
        theme,
        notes,
        discordEventId
      );

      // Build initial announcement embed & buttons
      const display = buildMinecraftEventEmbed({
        id: eventId,
        title,
        start_time: startUnix,
        address,
        port,
        version,
        theme,
        notes,
        host_username: interaction.user.username
      }, []);

      // Broadcast announcement in target channel
      let pingContent = '';
      if (pingChoice === '@everyone') pingContent = '@everyone';
      else if (pingChoice === '@here') pingContent = '@here';

      const announcementMessage = await targetChannel.send({
        content: pingContent || undefined,
        embeds: display.embeds,
        components: display.components,
        files: [attachment]
      });

      // Update message ID in database
      updateMinecraftEventMessage(eventId, announcementMessage.id, discordEventId);

      return interaction.editReply({
        embeds: [createSuccessEmbed(
          'Realm Launch Scheduled!',
          `⚔️ **${title}** has been forged!\n\n` +
          `• **Announcement Posted in:** ${targetChannel}\n` +
          `• **Launch Time:** <t:${startUnix}:F> (<t:${startUnix}:R>)\n` +
          `• **Server Address:** \`${address}:${port}\`\n` +
          (discordEventId ? `• **Discord Event:** Created and featured in the server Events tab! 📅\n` : '') +
          `\n[Jump directly to the Announcement](${announcementMessage.url})`
        )]
      });
    }
  }
};
