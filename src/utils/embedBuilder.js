const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

/**
 * Creates a Minecraft-styled embed
 */
function createMinecraftEmbed({ title, description, color = config.colors.minecraft.green, fields = [], thumbnail, image, footer }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (fields.length) embed.addFields(fields);

  if (footer) {
    embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  } else {
    embed.setFooter({ text: '⛏️ Minecraft WEEK • Gandalf the BOT' });
  }

  return embed;
}

/**
 * Creates a Gandalf/LOTR-styled wisdom embed
 */
function createGandalfEmbed({ title, description, fields = [], footer, thumbnail, quote }) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.lotr.gold)
    .setTimestamp();

  if (title) embed.setTitle(`🧙‍♂️ ${title}`);
  if (description) embed.setDescription(description);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (fields.length) embed.addFields(fields);

  let footerText = '✨ Gandalf the Grey • "All we have to decide is what to do with the time given us."';
  if (footer) {
    footerText = typeof footer === 'string' ? footer : footer.text;
  } else if (quote) {
    footerText = `✨ "${quote}"`;
  }

  embed.setFooter({ text: footerText });
  return embed;
}

/**
 * Generic Success embed (MC Green)
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.minecraft.green)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Generic Error embed (MC Red)
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(config.colors.minecraft.red)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Themed Moderation Action Embed
 */
function createModEmbed({ action, target, moderator, reason, extraFields = [] }) {
  return new EmbedBuilder()
    .setColor(config.colors.minecraft.red)
    .setTitle(`🛡️ Staff Action • ${action}`)
    .addFields(
      { name: 'Target', value: `${target} (\`${target.id}\`)`, inline: true },
      { name: 'Moderator', value: `${moderator} (\`${moderator.id}\`)`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false },
      ...extraFields
    )
    .setTimestamp()
    .setFooter({ text: 'Gandalf Moderation Guard' });
}

module.exports = {
  createMinecraftEmbed,
  createGandalfEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createModEmbed
};
