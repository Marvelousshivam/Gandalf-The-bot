const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('🏰 Displays details and statistics about this Minecraft Discord server'),

  async execute(interaction) {
    const { guild } = interaction;
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    const rolesCount = guild.roles.cache.size - 1; // exclude @everyone
    const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`;

    const embed = createMinecraftEmbed({
      title: `🏰 ${guild.name} — Realm Overview`,
      color: config.colors.minecraft.aqua,
      thumbnail: guild.iconURL({ dynamic: true, size: 256 }),
      fields: [
        { name: '👑 Realm Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
        { name: '📅 Realm Founded', value: createdAt, inline: false },
        {
          name: '👥 Adventurers',
          value: `**Total:** ${totalMembers}\n• 👤 Humans: ${humanCount}\n• 🤖 Automatons: ${botCount}`,
          inline: true
        },
        {
          name: '📜 Channels',
          value: `**Total:** ${guild.channels.cache.size}\n• 💬 Text: ${textChannels}\n• 🔊 Voice: ${voiceChannels}\n• 📁 Categories: ${categories}`,
          inline: true
        },
        {
          name: '🛡️ Protection & Roles',
          value: `• 🎭 Roles: ${rolesCount}\n• 🔒 Verification: ${guild.verificationLevel}\n• 🚀 Boosts: Level ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`,
          inline: true
        }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
