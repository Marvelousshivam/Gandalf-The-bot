const { Events } = require('discord.js');
const { getGuildConfig, getUserXp } = require('../database');
const { createMinecraftEmbed } = require('../utils/embedBuilder');
const config = require('../../config');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (member.user.bot) return;

    const guildConfig = getGuildConfig(member.guild.id);
    if (guildConfig.goodbye_enabled === 0) return;

    // Resolve channel
    let goodbyeChannel = null;
    if (guildConfig.goodbye_channel_id) {
      goodbyeChannel = member.guild.channels.cache.get(guildConfig.goodbye_channel_id);
    } else if (guildConfig.welcome_channel_id) {
      goodbyeChannel = member.guild.channels.cache.get(guildConfig.welcome_channel_id);
    }

    if (!goodbyeChannel) {
      goodbyeChannel = member.guild.channels.cache.find(c =>
        c.isTextBased() && (c.name.includes('welcome') || c.name.includes('general'))
      );
    }

    if (!goodbyeChannel) return;

    // Get stats from database
    const xpData = getUserXp(member.guild.id, member.id);
    const joinedAtTimestamp = member.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
      : 'Unknown';

    const embed = createMinecraftEmbed({
      title: `⚠️ ${member.user.username} left the game`,
      description: `*An adventurer has crossed back into the misty mountains.*`,
      color: config.colors.minecraft.gold,
      thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
      fields: [
        { name: '👤 Adventurer', value: `${member.user.tag}`, inline: true },
        { name: '⏳ First Arrived', value: joinedAtTimestamp, inline: true },
        { name: '💬 Total Messages', value: `\`${xpData.total_messages}\` msgs (\`${xpData.xp}\` XP)`, inline: true }
      ],
      footer: '🧙‍♂️ Gandalf: "I will not say: do not weep; for not all tears are an evil."'
    });

    await goodbyeChannel.send({ embeds: [embed] }).catch(err => {
      console.error('Failed to send goodbye message:', err);
    });
  }
};
