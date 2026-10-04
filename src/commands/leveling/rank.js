const { SlashCommandBuilder } = require('discord.js');
const { getUserXp, getLeaderboard } = require('../../database');
const { getLevelProgress, getRankTitle } = require('../../systems/xpSystem');
const { generateRankCard } = require('../../systems/rankCard');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('🏆 View your visual Minecraft rank card and server standing')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Adventurer to inspect (defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
    const xpData = getUserXp(interaction.guildId, user.id);
    const progress = getLevelProgress(xpData.xp);
    const rankTitle = getRankTitle(progress.level);

    // Get position on leaderboard
    const allUsers = getLeaderboard(interaction.guildId, 100);
    const positionIndex = allUsers.findIndex(u => u.user_id === user.id);
    const rankPosition = positionIndex !== -1 ? `#${positionIndex + 1}` : 'Unranked';

    const rankAttachment = await generateRankCard({
      user,
      member,
      xp: xpData.xp,
      level: progress.level,
      currentLevelXp: progress.currentLevelXp,
      neededXp: progress.neededXp,
      percentage: progress.percentage,
      rankTitle,
      rankPosition,
      totalMessages: xpData.total_messages
    });

    const embed = createMinecraftEmbed({
      title: `🏆 Minecraft Rank: ${member?.displayName || user.username}`,
      description: `**${rankTitle}** • Standing **${rankPosition}** on the server leaderboard`,
      color: config.colors.minecraft.green,
      image: 'attachment://minecraft-rank.png',
      footer: 'Gain XP by chatting in the server • Minecraft WEEK'
    });

    await interaction.editReply({ embeds: [embed], files: [rankAttachment] });
  }
};
