const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const THEME_COLORS = {
  overworld: 0x55FF55,  // Minecraft Emerald Green
  nether: 0xFF5555,     // Crimson / Lava Red
  the_end: 0xAA00AA     // Ender Purple
};

/**
 * Build the interactive announcement card embed and action rows
 * @param {Object} event
 * @param {Array<{ user_id: string, status: string }>} rsvps
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildMinecraftEventEmbed(event, rsvps = []) {
  const going = rsvps.filter(r => r.status === 'going');
  const maybe = rsvps.filter(r => r.status === 'maybe');
  const theme = (event.theme || 'overworld').toLowerCase();
  const color = THEME_COLORS[theme] || THEME_COLORS.overworld;

  const goingList = going.length > 0
    ? going.slice(0, 15).map(r => `<@${r.user_id}>`).join(', ') + (going.length > 15 ? ` *and ${going.length - 15} more*` : '')
    : '*No adventurers have enlisted yet. Be the first!*';

  const maybeList = maybe.length > 0
    ? maybe.slice(0, 10).map(r => `<@${r.user_id}>`).join(', ') + (maybe.length > 10 ? ` *and ${maybe.length - 10} more*` : '')
    : '*None*';

  const unix = event.start_time;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`⛏️ ${event.title}`)
    .setDescription(
      `> *"Hear ye, noble crafters and wanderers! The hour draws near when the gates of Minecraft WEEK shall open. Prepare your pickaxes, ready your armor, and join the fellowship as we journey into uncharted lands!"*\n\n` +
      (event.notes ? `📜 **Event Notes & Lore:**\n${event.notes}\n\n` : '') +
      `📅 **Launch Showtime:** <t:${unix}:F> (<t:${unix}:R>)\n` +
      `🌐 **Server Address:** \`${event.address}:${event.port}\`\n` +
      `🏷️ **Version & Support:** \`${event.version || '1.21.x'}\` • Java & Bedrock (Cracked & Premium)`
    )
    .addFields(
      {
        name: `⚔️ Fellowship Enlisted (${going.length})`,
        value: goingList,
        inline: false
      },
      {
        name: `🤔 Pondering Journey (${maybe.length})`,
        value: maybeList,
        inline: false
      }
    )
    .setImage('attachment://mc-event-banner.png')
    .setFooter({
      text: `Host: @${event.host_username || 'Admin'} • Click 'Copy IP' to paste directly in Minecraft!`
    })
    .setTimestamp(new Date(unix * 1000));

  // Action Row 1: RSVPs
  const rsvpRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_event_rsvp_going_${event.id}`)
      .setLabel(`⚔️ Count Me In! (${going.length})`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`mc_event_rsvp_maybe_${event.id}`)
      .setLabel(`🤔 Maybe (${maybe.length})`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`mc_event_rsvp_declined_${event.id}`)
      .setLabel("❌ Can't Make It")
      .setStyle(ButtonStyle.Secondary)
  );

  // Action Row 2: Controls
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mc_event_copy_ip_${event.id}`)
      .setLabel('📋 Copy Server Address')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`mc_event_check_status_${event.id}`)
      .setLabel('📡 Check Live Status')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [rsvpRow, controlRow]
  };
}

module.exports = {
  buildMinecraftEventEmbed,
  THEME_COLORS
};
