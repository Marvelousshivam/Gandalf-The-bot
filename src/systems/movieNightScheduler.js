const {
  getUpcomingEventsForReminder,
  markEventReminded,
  completeMovieEvent,
  getActivePolls,
  getMoviePollVotes,
  endMoviePoll,
  getEventRsvps,
  getGuildConfig
} = require('../database');
const { buildPollEmbed } = require('./movieNightDisplay');
const { EmbedBuilder } = require('discord.js');

let schedulerInterval = null;

/**
 * Checks upcoming movie events and sends 1-hour and 10-minute reminders
 */
async function checkEventReminders(client) {
  const now = Math.floor(Date.now() / 1000);

  let upcomingEvents = [];
  try {
    upcomingEvents = getUpcomingEventsForReminder();
  } catch (err) {
    console.error('Error querying upcoming movie events:', err);
    return;
  }

  for (const event of upcomingEvents) {
    const timeUntil = event.start_time - now;

    // 1. 1-Hour Reminder (Between 60m and 11m before start)
    if (timeUntil <= 3600 && timeUntil > 600 && !event.reminded_1h) {
      try {
        const channel = await client.channels.fetch(event.channel_id).catch(() => null);
        if (channel) {
          const rsvps = getEventRsvps(event.id);
          const attendees = rsvps.filter(r => r.status === 'going' || r.status === 'maybe');
          const mentions = attendees.map(a => `<@${a.user_id}>`).join(' ');

          const config = getGuildConfig(event.guild_id);
          const rolePing = config.movie_role_id ? `<@&${config.movie_role_id}> ` : '';

          const embed = new EmbedBuilder()
            .setColor(0xF59E0B)
            .setTitle(`⏰ Showtime in 1 Hour: ${event.title}`)
            .setDescription(
              `The fellowship gathers soon! Grab your refreshments and prepare your screen.\n\n` +
              `📅 **Showtime:** <t:${event.start_time}:F> (<t:${event.start_time}:R>)\n` +
              `🎙️ **Voice Channel:** ${event.voice_channel_id ? `<#${event.voice_channel_id}>` : '*To be announced*'}\n` +
              `👑 **Host:** <@${event.host_user_id}>`
            )
            .setFooter({ text: `Event #${event.id} • Gandalf the BOT` });

          if (event.poster_url) {
            embed.setThumbnail(event.poster_url);
          }

          const content = `${rolePing}${mentions}`.trim() || undefined;
          await channel.send({ content, embeds: [embed] }).catch(() => {});
        }
        markEventReminded(event.id, '1h');
      } catch (err) {
        console.error(`Failed to dispatch 1h reminder for event #${event.id}:`, err);
      }
    }

    // 2. 10-Minute Reminder (Between 10m and 0m before start)
    if (timeUntil <= 600 && timeUntil > -300 && !event.reminded_10m) {
      try {
        const channel = await client.channels.fetch(event.channel_id).catch(() => null);
        if (channel) {
          const rsvps = getEventRsvps(event.id);
          const attendees = rsvps.filter(r => r.status === 'going' || r.status === 'maybe');
          const mentions = attendees.map(a => `<@${a.user_id}>`).join(' ');

          const config = getGuildConfig(event.guild_id);
          const rolePing = config.movie_role_id ? `<@&${config.movie_role_id}> ` : '';

          const embed = new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle(`🍿 10 Minutes to Showtime: ${event.title}!`)
            .setDescription(
              `**Popcorn ready! Showtime approaches!**\n\n` +
              `Join ${event.voice_channel_id ? `<#${event.voice_channel_id}>` : 'the voice channel'} now to secure your seat before the opening curtains draw!\n\n` +
              `📅 **Starting:** <t:${event.start_time}:R>`
            )
            .setFooter({ text: `Event #${event.id} • Gandalf the BOT` });

          if (event.backdrop_url) {
            embed.setImage(event.backdrop_url);
          } else if (event.poster_url) {
            embed.setThumbnail(event.poster_url);
          }

          const content = `${rolePing}${mentions}`.trim() || undefined;
          await channel.send({ content, embeds: [embed] }).catch(() => {});
        }
        markEventReminded(event.id, '10m');
      } catch (err) {
        console.error(`Failed to dispatch 10m reminder for event #${event.id}:`, err);
      }
    }

    // 3. Mark completed after 2.5 hours past start time
    if (timeUntil < -9000) {
      try {
        completeMovieEvent(event.id);
      } catch (err) {
        console.error(`Failed to complete event #${event.id}:`, err);
      }
    }
  }
}

/**
 * Checks expired polls and closes them with winner announcement
 */
async function checkExpiredPolls(client) {
  const now = Math.floor(Date.now() / 1000);

  let activePolls = [];
  try {
    activePolls = getActivePolls();
  } catch (err) {
    console.error('Error querying active polls:', err);
    return;
  }

  for (const poll of activePolls) {
    if (poll.ends_at <= now) {
      try {
        const channel = await client.channels.fetch(poll.channel_id).catch(() => null);
        if (!channel) {
          endMoviePoll(poll.id, 'Unknown');
          continue;
        }

        const message = await channel.messages.fetch(poll.message_id).catch(() => null);
        const votes = getMoviePollVotes(poll.id);
        const options = JSON.parse(poll.options_json);

        // Calculate counts
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

        if (message) {
          await message.edit(display).catch(() => {});
        }

        await channel.send({
          content: `🎉 **Movie Poll #${poll.id} has ended!**\n` +
            `The council has spoken: **${winnerTitle}** takes the crown!\n` +
            `Host <@${poll.creator_user_id}>, use \`/movie plan\` to schedule the screening!`
        }).catch(() => {});
      } catch (err) {
        console.error(`Error processing expired poll #${poll.id}:`, err);
      }
    }
  }
}

/**
 * Starts the movie night scheduler loop
 */
function startMovieScheduler(client) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log('🍿 Movie Night Background Scheduler activated (60s tick).');

  // Run initial check after 5 seconds
  setTimeout(() => {
    checkEventReminders(client).catch(() => {});
    checkExpiredPolls(client).catch(() => {});
  }, 5000);

  // Repeat every 60 seconds
  schedulerInterval = setInterval(() => {
    checkEventReminders(client).catch(() => {});
    checkExpiredPolls(client).catch(() => {});
  }, 60000);
}

module.exports = {
  startMovieScheduler,
  checkEventReminders,
  checkExpiredPolls
};
