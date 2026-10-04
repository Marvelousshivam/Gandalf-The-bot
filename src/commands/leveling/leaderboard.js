const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../../database');
const { getLevelProgress, getRankTitle } = require('../../systems/xpSystem');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏅 Survey the hall of fame: Top 10 adventurers by XP & Level'),

  async execute(interaction) {
    const topUsers = getLeaderboard(interaction.guildId, 10);

    if (!topUsers || topUsers.length === 0) {
      return interaction.reply({
        embeds: [createMinecraftEmbed({
          title: '🏅 Hall of Fame (Empty)',
          description: 'No adventurers have embarked on conversations yet. Send a message to claim your place on the leaderboard!',
          color: config.colors.minecraft.gold
        })]
      });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = topUsers.map((u, i) => {
      const medal = medals[i] || `\`#${i + 1}\``;
      const progress = getLevelProgress(u.xp);
      const title = getRankTitle(progress.level);
      return `${medal} <@${u.user_id}> — **Lvl ${progress.level}** (\`${u.xp} XP\`) • *${title}*`;
    });

    const embed = createMinecraftEmbed({
      title: '🏅 Minecraft WEEK — Adventurer Leaderboard',
      description: `The most seasoned explorers and conversationalists of the realm:\n\n${lines.join('\n\n')}`,
      color: config.colors.minecraft.gold,
      footer: 'Top 10 Adventurers • Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
