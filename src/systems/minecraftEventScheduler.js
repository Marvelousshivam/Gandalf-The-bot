const {
  getUpcomingMinecraftEventsForReminder,
  markMinecraftEventReminded,
  setMinecraftEventStatus,
  getMinecraftEventRsvps
} = require('../database');
const { createMinecraftEmbed } = require('../utils/embedBuilder');
const { THEME_COLORS } = require('./minecraftEventDisplay');

/**
 * Checks upcoming Minecraft events and sends 1-hour and 10-minute alerts
 * @param {import('discord.js').Client} client
 */
async function checkMinecraftEventReminders(client) {
  try {
    const events = getUpcomingMinecraftEventsForReminder();
    if (!events || events.length === 0) return;

    const now = Math.floor(Date.now() / 1000);

    for (const event of events) {
      const diffSecs = event.start_time - now;

      // Check if channel is accessible
      const channel = await client.channels.fetch(event.channel_id).catch(() => null);
      if (!channel) continue;

      // 1. T - 1 Hour Alert (between 50 and 60 minutes)
      if (diffSecs <= 3600 && diffSecs > 600 && !event.reminded_1h) {
        const rsvps = getMinecraftEventRsvps(event.id);
        const goingUsers = rsvps.filter(r => r.status === 'going');
        const pings = goingUsers.length > 0
          ? goingUsers.map(r => `<@${r.user_id}>`).join(' ')
          : '';

        const color = THEME_COLORS[event.theme] || THEME_COLORS.overworld;

        const embed = createMinecraftEmbed({
          title: `⚔️ ONE HOUR WARNING: ${event.title}`,
          description:
            `> *"The shadows lengthen, and the call to arms sounds across the hills!"*\n\n` +
            `The realm gates swing open at **<t:${event.start_time}:t>** (<t:${event.start_time}:R>)!\n\n` +
            `🌐 **Server Address:** \`${event.address}:${event.port}\`\n` +
            `🏷️ **Version:** \`${event.version || '1.21.x'}\` (Java & Bedrock)\n\n` +
            `Sharpen your blades, craft your torches, and prepare for adventure!`,
          color
        });

        await channel.send({
          content: pings ? `⚔️ ${pings} — **1 Hour until realm launch!**` : undefined,
          embeds: [embed]
        }).catch(e => console.error('Failed to send 1h MC event alert:', e));

        markMinecraftEventReminded(event.id, '1h');
      }

      // 2. T - 10 Minutes Alert (between 0 and 10 minutes)
      if (diffSecs <= 600 && diffSecs > 0 && !event.reminded_10m) {
        const rsvps = getMinecraftEventRsvps(event.id);
        const goingUsers = rsvps.filter(r => r.status === 'going');
        const pings = goingUsers.length > 0
          ? goingUsers.map(r => `<@${r.user_id}>`).join(' ')
          : '';

        const color = THEME_COLORS[event.theme] || THEME_COLORS.overworld;

        const embed = createMinecraftEmbed({
          title: `🚨 10 MINUTES REMAINING: ${event.title}`,
          description:
            `> *"Stand ready at the gates! The countdown has begun."*\n\n` +
            `Launch countdown: **<t:${event.start_time}:R>**\n\n` +
            `📋 **Direct Connect Address:**\n\`${event.address}:${event.port}\`\n\n` +
            `Boot up your Minecraft client now so you don't miss the initial spawn rush!`,
          color
        });

        await channel.send({
          content: pings ? `🚨 ${pings} — **10 Minutes to launch!**` : undefined,
          embeds: [embed]
        }).catch(e => console.error('Failed to send 10m MC event alert:', e));

        markMinecraftEventReminded(event.id, '10m');
      }

      // 3. T <= 0: Realm Launch!
      if (diffSecs <= 0) {
        const color = THEME_COLORS[event.theme] || THEME_COLORS.overworld;

        const embed = createMinecraftEmbed({
          title: `🎉 THE REALM IS NOW OPEN: ${event.title}`,
          description:
            `> *"The gates stand wide! Step through into glory and craft your legend."*\n\n` +
            `🌐 **Direct Connect:** \`${event.address}:${event.port}\`\n` +
            `🏷️ **Version:** \`${event.version || '1.21.x'}\`\n\n` +
            `Join the server now! May fortune favor your pickaxes and swords! ⛏️💎`,
          color
        });

        await channel.send({
          content: `@here 🎉 **The realm is OPEN! Log in now!**`,
          embeds: [embed]
        }).catch(e => console.error('Failed to send launch MC event alert:', e));

        setMinecraftEventStatus(event.id, 'live');
      }
    }
  } catch (err) {
    console.error('Error in Minecraft Event Scheduler:', err);
  }
}

/**
 * Start the recurring 60-second scheduler
 * @param {import('discord.js').Client} client
 */
function startMinecraftEventScheduler(client) {
  console.log('⏰ Initializing Minecraft Event countdown scheduler (1-min interval)...');
  // Run once on boot
  checkMinecraftEventReminders(client);
  // Schedule every 60 seconds
  setInterval(() => checkMinecraftEventReminders(client), 60 * 1000);
}

module.exports = {
  startMinecraftEventScheduler
};
