const { SlashCommandBuilder } = require('discord.js');
const { askGandalfAI } = require('../../utils/ai');
const { createGandalfEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const { getUserXp } = require('../../database');
const { getRankTitle } = require('../../systems/xpSystem');
const cooldown = require('../../utils/cooldown');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask-gandalf')
    .setDescription('🔮 Seek guidance and counsel from the wise wizard Gandalf (AI Brain)')
    .addStringOption(opt =>
      opt.setName('question')
        .setDescription('Your question for Gandalf')
        .setRequired(true)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question').trim();
    const userId = interaction.user.id;

    // Cooldown check (5 seconds per user)
    const { onCooldown, timeLeftMs } = cooldown.check(`ask:${userId}`, 5000);
    if (onCooldown) {
      return interaction.reply({
        embeds: [createErrorEmbed('Patience, Adventurer', `The wizard needs a moment to catch his breath. Try again in **${Math.ceil(timeLeftMs / 1000)}s**!`)],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const isOwner = userId === process.env.BOT_OWNER_ID;
    const isServerOwner = interaction.guild ? interaction.guild.ownerId === userId : false;

    let userLevel = 0;
    let userRank = 'Stone Miner';
    if (interaction.guild) {
      const userXpData = getUserXp(interaction.guild.id, userId);
      userLevel = userXpData.level;
      userRank = getRankTitle(userLevel);
    }

    const userContext = {
      username: interaction.user.displayName || interaction.user.username,
      userId,
      isOwner,
      isServerOwner,
      level: userLevel,
      rank: userRank
    };

    const response = await askGandalfAI(question, userContext);

    const embed = createGandalfEmbed({
      title: 'Counsel of the White Council',
      description: `**Query:** *"${question}"*\n\n**Gandalf speaks:**\n${response.answer}`,
      footer: `✨ Whispered via ${response.provider} (${response.model})`
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
