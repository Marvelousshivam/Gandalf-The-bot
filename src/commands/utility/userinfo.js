const { SlashCommandBuilder } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const { getUserXp } = require('../../database');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('👤 Look up adventurer details, roles, and Minecraft level')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to inspect (defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const xpData = getUserXp(interaction.guildId, user.id);
    const joinedAt = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown';
    const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

    // Find rank title based on level
    let rankTitle = '🪨 Stone Miner';
    for (const r of config.xp.ranks) {
      if (xpData.level >= r.level) rankTitle = r.title;
    }

    const rolesList = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => r.toString())
          .slice(0, 10)
          .join(', ') || 'No special roles'
      : 'Not in realm';

    const embed = createMinecraftEmbed({
      title: `👤 Adventurer Profile: ${user.username}`,
      color: member?.displayColor || config.colors.minecraft.green,
      thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
        { name: '🤖 Bot Status', value: user.bot ? 'Automaton (Bot)' : 'Human Adventurer', inline: true },
        { name: '🎖️ Server Rank', value: `${rankTitle} (Lvl ${xpData.level})`, inline: true },
        { name: '📅 First Joined Realm', value: joinedAt, inline: true },
        { name: '⏳ Discord Account Created', value: createdAt, inline: true },
        { name: '💬 Messages Recorded', value: `\`${xpData.total_messages}\` msgs (\`${xpData.xp}\` XP)`, inline: true },
        { name: '🎭 Roles', value: rolesList, inline: false }
      ]
    });

    await interaction.reply({ embeds: [embed] });
  }
};
