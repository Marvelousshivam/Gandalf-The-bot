const { createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const {
  getGuildConfig,
  getOpenTicket,
  closeTicket,
  getMovieEvent,
  getEventRsvps,
  setEventRsvp,
  getMoviePoll,
  getMoviePollVotes,
  voteMoviePoll,
  endMoviePoll,
  getMinecraftEvent,
  getMinecraftEventRsvps,
  setMinecraftEventRsvp
} = require('../database');
const { getServerStatus } = require('../utils/minecraft-api');
const { buildStatusDisplay } = require('../systems/serverStatusDisplay');
const { buildEventEmbed, buildPollEmbed } = require('../systems/movieNightDisplay');
const { buildMinecraftEventEmbed } = require('../systems/minecraftEventDisplay');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 0. Handle Autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(`Autocomplete error for /${interaction.commandName}:`, error);
        }
      }
      return;
    }

    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command /${interaction.commandName}:`, error);

        const errorEmbed = createErrorEmbed(
          'Spell Mishap',
          'A tremor in the arcane fabric occurred while attempting to execute this command.'
        );

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Rules verification button
      if (customId === 'verify_rules') {
        const config = getGuildConfig(interaction.guildId);
        if (!config.verified_role_id) {
          return interaction.reply({
            embeds: [createErrorEmbed('Configuration Notice', 'No verified role has been configured by the server admins yet.')],
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(config.verified_role_id);
        if (!role) {
          return interaction.reply({
            embeds: [createErrorEmbed('Error', 'The configured verified role no longer exists in this server.')],
            ephemeral: true
          });
        }

        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: '✅ You have already verified and accepted the rules of the realm!',
            ephemeral: true
          });
        }

        try {
          await interaction.member.roles.add(role);
          return interaction.reply({
            embeds: [createSuccessEmbed('Welcome Adventurer!', `You have accepted the realm rules and been granted the **${role.name}** role. Enjoy your time in **${interaction.guild.name}**! ⛏️`)],
            ephemeral: true
          });
        } catch (err) {
          console.error('Failed to grant verified role:', err);
          return interaction.reply({
            embeds: [createErrorEmbed('Permission Error', 'The wizard lacks sufficient permissions to bestow this role. Ensure my bot role is higher than the verified role.')],
            ephemeral: true
          });
        }
      }

      // Close ticket button
      if (customId === 'close_ticket_btn') {
        const ticket = getOpenTicket(interaction.channelId);
        if (!ticket) {
          return interaction.reply({
            content: '⚠️ This channel is not an active support ticket or has already been archived.',
            ephemeral: true
          });
        }

        await interaction.reply({
          content: '🔒 Closing and archiving this ticket in 5 seconds...',
          ephemeral: false
        });

        closeTicket(interaction.channelId);

        setTimeout(async () => {
          await interaction.channel.delete().catch(() => {});
        }, 5000);
        return;
      }

      // Role button toggles (prefix: "role_toggle_")
      if (customId.startsWith('role_toggle_')) {
        const roleId = customId.replace('role_toggle_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
          return interaction.reply({
            embeds: [createErrorEmbed('Role Not Found', 'This role could not be located on the server.')],
            ephemeral: true
          });
        }

        try {
          if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            return interaction.reply({
              content: `➖ Removed the **${role.name}** role from you.`,
              ephemeral: true
            });
          } else {
            await interaction.member.roles.add(role);
            return interaction.reply({
              content: `➕ Granted you the **${role.name}** role!`,
              ephemeral: true
            });
          }
        } catch (err) {
          console.error('Role toggle error:', err);
          return interaction.reply({
            embeds: [createErrorEmbed('Permission Error', 'I cannot manage this role. Please ensure my bot role is placed higher than the target role.')],
            ephemeral: true
          });
        }
      }

      // Server Status: Live Refresh Button
      if (customId === 'btn_refresh_status') {
        await interaction.deferReply({ ephemeral: true });

        const cfg = getGuildConfig(interaction.guildId);
        const serverAddress = cfg.mc_server_address || process.env.MC_SERVER_ADDRESS || 'Sapnokasehar-QhIo.aternos.me';
        const serverPort = cfg.mc_server_port || 30212;

        const status = await getServerStatus(serverAddress, serverPort);
        const display = await buildStatusDisplay(status, serverAddress, serverPort, cfg.live_chat_channel_id);

        await interaction.message.edit(display).catch(() => {});

        const isOnline = status.online;
        const msg = isOnline
          ? `🟢 **Realm is Online & Ready!** (${status.players.online}/${status.players.max} adventurers online)\nStatus embed and canvas banner refreshed.`
          : `🔴 **Realm is currently Sleeping.** Launch it from your Aternos dashboard!`;

        return interaction.editReply({ content: msg });
      }

      // Server Status: Copy IP Button
      if (customId === 'btn_copy_ip') {
        const cfg = getGuildConfig(interaction.guildId);
        const serverAddress = cfg.mc_server_address || 'Sapnokasehar-QhIo.aternos.me';
        const serverPort = cfg.mc_server_port || 30212;

        return interaction.reply({
          content: `📋 **Direct Connect Address:**\n\`${serverAddress}:${serverPort}\`\n\n*Copy the address above and paste into Minecraft > Multiplayer > Direct Connection!*`,
          ephemeral: true
        });
      }

      // Server Status: Live Chat Info
      if (customId === 'btn_live_chat_info') {
        const cfg = getGuildConfig(interaction.guildId);
        return interaction.reply({
          content: cfg.live_chat_channel_id
            ? `💬 In-Game Chat Bridge is active in <#${cfg.live_chat_channel_id}>!\nType in that channel or in-game to speak across realms.`
            : `💬 In-Game Chat Bridge is active! Assign a channel via \`/config livechat\`.`,
          ephemeral: true
        });
      }

      // --- Movie Nights: RSVP Buttons ---
      if (customId.startsWith('movie_rsvp_')) {
        const parts = customId.split('_'); // ['movie', 'rsvp', status, eventId]
        const status = parts[2]; // 'going', 'maybe', 'declined'
        const eventId = Number(parts[3]);

        const event = getMovieEvent(eventId);
        if (!event) {
          return interaction.reply({
            content: '⚠️ This movie night event could not be found or has been removed.',
            ephemeral: true
          });
        }

        if (event.status !== 'scheduled') {
          return interaction.reply({
            content: `⚠️ This event is no longer active (Status: **${event.status}**).`,
            ephemeral: true
          });
        }

        setEventRsvp(eventId, interaction.user.id, status);

        const rsvps = getEventRsvps(eventId);
        const display = buildEventEmbed(event, rsvps);

        await interaction.message.edit(display).catch(() => {});

        const responses = {
          going: '🍿 You have RSVP\'d **Going**! You will be reminded 1 hour and 10 minutes before showtime.',
          maybe: '🤔 Marked as **Maybe**! We will keep you updated.',
          declined: '❌ Marked as **Can\'t Make It**. We hope you can join next time!'
        };

        return interaction.reply({
          content: responses[status] || '✅ RSVP updated!',
          ephemeral: true
        });
      }

      // --- Minecraft Server Events: RSVP Buttons ---
      if (customId.startsWith('mc_event_rsvp_')) {
        const parts = customId.split('_'); // ['mc', 'event', 'rsvp', status, eventId]
        const status = parts[3]; // 'going', 'maybe', 'declined'
        const eventId = Number(parts[4]);

        const event = getMinecraftEvent(eventId);
        if (!event) {
          return interaction.reply({
            content: '⚠️ This Minecraft server event could not be found or has concluded.',
            ephemeral: true
          });
        }

        setMinecraftEventRsvp(eventId, interaction.user.id, status);

        const rsvps = getMinecraftEventRsvps(eventId);
        const display = buildMinecraftEventEmbed(event, rsvps);

        await interaction.message.edit(display).catch(() => {});

        const mcResponses = {
          going: '⚔️ **You\'re on the roster!** Sharpen your sword and prepare your inventory. We\'ll alert you before the gates open!',
          maybe: '🤔 Marked as **Maybe**! We will keep you posted as launch approaches.',
          declined: '❌ Marked as **Can\'t Make It**. We hope to see you in the realm next time!'
        };

        return interaction.reply({
          content: mcResponses[status] || '✅ RSVP recorded!',
          ephemeral: true
        });
      }

      // --- Minecraft Server Events: Copy IP Button ---
      if (customId.startsWith('mc_event_copy_ip_')) {
        const eventId = Number(customId.replace('mc_event_copy_ip_', ''));
        const event = getMinecraftEvent(eventId);
        const addr = event ? `${event.address}:${event.port}` : 'Fellowshiptotheend.aternos.me:20974';

        return interaction.reply({
          content: `📋 **Direct Connect Address:**\n\`${addr}\`\n\n*Copy the line above and paste directly into Minecraft > Multiplayer > Direct Connection!*`,
          ephemeral: true
        });
      }

      // --- Minecraft Server Events: Check Status Button ---
      if (customId.startsWith('mc_event_check_status_')) {
        await interaction.deferReply({ ephemeral: true });
        const eventId = Number(customId.replace('mc_event_check_status_', ''));
        const event = getMinecraftEvent(eventId);
        const addr = event ? event.address : 'Fellowshiptotheend.aternos.me';
        const port = event ? event.port : 20974;

        const status = await getServerStatus(addr, port);
        if (status.online) {
          return interaction.editReply({
            content: `🟢 **The Realm is ONLINE & READY!**\n• **Players Online:** ${status.players.online}/${status.players.max}\n• **Version:** ${status.version || '1.21.x'}\n• **Latency:** \`${status.latency || 45}ms\`\n• **MOTD:** ${status.motd || 'Welcome to Minecraft WEEK'}\n\nJoin now at \`${addr}:${port}\`!`
          });
        } else {
          return interaction.editReply({
            content: `💤 **The Realm is currently SLEEPING.**\nIt will be booted up for the event showtime at \`${addr}:${port}\`!`
          });
        }
      }

      // --- Movie Nights: Voting Poll Buttons ---
      if (customId.startsWith('movie_poll_vote_')) {
        const parts = customId.split('_'); // ['movie', 'poll', 'vote', pollId, optIndex]
        const pollId = Number(parts[3]);
        const optIndex = Number(parts[4]);

        const poll = getMoviePoll(pollId);
        if (!poll) {
          return interaction.reply({
            content: '⚠️ This poll could not be located.',
            ephemeral: true
          });
        }

        if (poll.status === 'ended' || poll.ends_at <= Math.floor(Date.now() / 1000)) {
          return interaction.reply({
            content: '🔒 This movie voting poll has already closed.',
            ephemeral: true
          });
        }

        voteMoviePoll(pollId, interaction.user.id, optIndex);

        const votes = getMoviePollVotes(pollId);
        const display = buildPollEmbed(poll, votes);

        await interaction.message.edit(display).catch(() => {});

        const options = JSON.parse(poll.options_json);
        const selected = options[optIndex];

        return interaction.reply({
          content: `✅ Your vote for **${selected ? selected.title : `Option #${optIndex + 1}`}** has been registered!`,
          ephemeral: true
        });
      }

      // --- Movie Nights: End Poll Early ---
      if (customId.startsWith('movie_poll_end_')) {
        const pollId = Number(customId.replace('movie_poll_end_', ''));
        const poll = getMoviePoll(pollId);

        if (!poll) {
          return interaction.reply({
            content: '⚠️ This poll could not be located.',
            ephemeral: true
          });
        }

        const isHost = poll.creator_user_id === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isHost && !isAdmin) {
          return interaction.reply({
            content: '⛔ Only the poll host or a server Administrator can end this poll early.',
            ephemeral: true
          });
        }

        if (poll.status === 'ended') {
          return interaction.reply({
            content: 'ℹ️ This poll has already concluded.',
            ephemeral: true
          });
        }

        const votes = getMoviePollVotes(pollId);
        const options = JSON.parse(poll.options_json);

        const counts = options.map((_, idx) => votes.filter(v => v.option_index === idx).length);
        let maxVotes = -1;
        let winnerIndices = [];
        counts.forEach((c, idx) => {
          if (c > maxVotes) {
            maxVotes = c;
            winnerIndices = [idx];
          } else if (c === maxVotes && maxVotes > 0) {
            winnerIndices.push(idx);
          }
        });

        let winnerTitle = 'No Winner';
        if (maxVotes > 0 && winnerIndices.length === 1) {
          winnerTitle = options[winnerIndices[0]].title;
        } else if (maxVotes > 0 && winnerIndices.length > 1) {
          winnerTitle = winnerIndices.map(i => options[i].title).join(' & ');
        }

        endMoviePoll(poll.id, winnerTitle);

        const endedPoll = { ...poll, status: 'ended', winner_title: winnerTitle };
        const display = buildPollEmbed(endedPoll, votes);

        await interaction.message.edit(display).catch(() => {});

        await interaction.channel.send({
          content: `🎉 **Movie Poll #${poll.id} has ended early by <@${interaction.user.id}>!**\n` +
            `The winning film is **${winnerTitle}**! Use \`/movie plan\` to schedule the screening.`
        }).catch(() => {});

        return interaction.reply({
          content: `✅ You have concluded Poll #${poll.id}. Winning film: **${winnerTitle}**.`,
          ephemeral: true
        });
      }

      // --- Movie Nights: Schedule Winner Shortcut ---
      if (customId.startsWith('movie_schedule_winner_')) {
        const pollId = Number(customId.replace('movie_schedule_winner_', ''));
        const poll = getMoviePoll(pollId);

        const winner = poll?.winner_title || 'your movie';
        return interaction.reply({
          content: `🍿 **Ready to host?**\nRun \`/movie plan title:"${winner}" time:"tomorrow 8pm"\` to schedule your screening and notify the fellowship!`,
          ephemeral: true
        });
      }
    }
  }
};
