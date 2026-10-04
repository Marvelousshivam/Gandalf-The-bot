const { PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../database');
const { sendAuditLog } = require('./auditLogger');
const { createErrorEmbed } = require('../utils/embedBuilder');
const config = require('../../config');
const badWords = require('../data/bad-words.json');

// In-memory maps for spam and duplicate detection
const userMessageTimestamps = new Map();
const userRecentMessages = new Map();

/**
 * Handle Auto-Moderation checks for incoming messages
 * @param {import('discord.js').Message} message
 * @returns {Promise<boolean>} true if message was intercepted and deleted
 */
async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  // Ignore staff with manage messages or admin permissions
  if (message.member && (
    message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member.permissions.has(PermissionFlagsBits.ManageMessages)
  )) {
    return false;
  }

  const guildConfig = getGuildConfig(message.guild.id);
  if (guildConfig.automod_enabled === 0) return false;

  const content = message.content.toLowerCase();
  const userId = message.author.id;
  const now = Date.now();

  // 1. Bad Words Filter
  const foundBadWord = badWords.find(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(content);
  });

  if (foundBadWord) {
    await message.delete().catch(() => {});
    const warningMsg = await message.channel.send({
      embeds: [createErrorEmbed('Foul Language Filtered', `<@${userId}>, foul speech has no place in this realm.`)]
    }).catch(() => {});

    setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

    sendAuditLog(message.guild, {
      title: 'Auto-Mod: Foul Speech Blocked',
      description: `<@${userId}> used prohibited language in ${message.channel}.`,
      color: config.colors.minecraft.red,
      fields: [
        { name: 'User', value: `<@${userId}> (\`${userId}\`)`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Prohibited Word', value: `\`${foundBadWord}\``, inline: true }
      ]
    });
    return true;
  }

  // 2. Anti-Invite Links
  const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
  if (inviteRegex.test(content)) {
    await message.delete().catch(() => {});
    const warningMsg = await message.channel.send({
      embeds: [createErrorEmbed('Unauthorized Portal', `<@${userId}>, advertising portals to external realms is forbidden.`)]
    }).catch(() => {});

    setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

    sendAuditLog(message.guild, {
      title: 'Auto-Mod: Invite Link Intercepted',
      description: `<@${userId}> attempted to post a realm invite link in ${message.channel}.`,
      color: config.colors.minecraft.red,
      fields: [
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true }
      ]
    });
    return true;
  }

  // 3. Max Mentions Spam (5+ mentions)
  if (message.mentions.users.size >= config.autoMod.maxMentions) {
    await message.delete().catch(() => {});
    const warningMsg = await message.channel.send({
      embeds: [createErrorEmbed('Mass Summoning Blocked', `<@${userId}>, please do not mention multiple adventurers at once.`)]
    }).catch(() => {});

    setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);

    sendAuditLog(message.guild, {
      title: 'Auto-Mod: Mass Mentions Detected',
      description: `<@${userId}> pinged ${message.mentions.users.size} members in a single message.`,
      color: config.colors.minecraft.red
    });
    return true;
  }

  // 4. Rate-Limit Spam Detection (5+ messages in 5 seconds)
  let timestamps = userMessageTimestamps.get(userId) || [];
  timestamps = timestamps.filter(t => now - t < config.autoMod.intervalMs);
  timestamps.push(now);
  userMessageTimestamps.set(userId, timestamps);

  if (timestamps.length >= config.autoMod.maxMessagesPerInterval) {
    await message.delete().catch(() => {});

    // Silence for 2 minutes
    if (message.member && message.member.moderatable) {
      await message.member.timeout(120000, 'Auto-Mod: Rapid message spam').catch(() => {});
    }

    const warningMsg = await message.channel.send({
      embeds: [createErrorEmbed('Spam Torrent Halted', `<@${userId}> has been silenced for 2 minutes for rapid message spam.`)]
    }).catch(() => {});

    setTimeout(() => warningMsg?.delete().catch(() => {}), 8000);

    sendAuditLog(message.guild, {
      title: 'Auto-Mod: Message Spam Mute',
      description: `<@${userId}> sent ${timestamps.length} messages in under 5 seconds and was automatically timed out.`,
      color: config.colors.minecraft.red
    });
    return true;
  }

  // 5. Duplicate Message Spam
  let userHistory = userRecentMessages.get(userId) || [];
  userHistory.push(content);
  if (userHistory.length > 5) userHistory.shift();
  userRecentMessages.set(userId, userHistory);

  if (
    userHistory.length >= config.autoMod.maxDuplicates &&
    userHistory.slice(-config.autoMod.maxDuplicates).every(msg => msg.trim() === content.trim() && content.length > 3)
  ) {
    await message.delete().catch(() => {});
    const warningMsg = await message.channel.send({
      embeds: [createErrorEmbed('Repetition Blocked', `<@${userId}>, please do not send duplicate messages.`)]
    }).catch(() => {});

    setTimeout(() => warningMsg?.delete().catch(() => {}), 5000);
    return true;
  }

  return false;
}

module.exports = { handleAutoMod };
