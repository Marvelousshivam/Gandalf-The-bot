const { getGuildConfig } = require('../database');
const { createMinecraftEmbed } = require('../utils/embedBuilder');
const config = require('../../config');

/**
 * Send an audit log entry to the server's configured log channel
 * @param {import('discord.js').Guild} guild
 * @param {object} logOptions
 */
async function sendAuditLog(guild, { title, description, color = config.colors.minecraft.gold, fields = [] }) {
  if (!guild) return;

  const guildConfig = getGuildConfig(guild.id);
  let logChannel = null;

  if (guildConfig.log_channel_id) {
    logChannel = guild.channels.cache.get(guildConfig.log_channel_id);
  }

  // Fallback to console or mod-log channel
  if (!logChannel) {
    logChannel = guild.channels.cache.find(c =>
      c.isTextBased() && (c.name.includes('log') || c.name === 'console')
    );
  }

  if (!logChannel) return;

  const embed = createMinecraftEmbed({
    title: `🛡️ Audit Log • ${title}`,
    description,
    color,
    fields,
    footer: `Log Event • ${new Date().toLocaleTimeString()}`
  });

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendAuditLog };
