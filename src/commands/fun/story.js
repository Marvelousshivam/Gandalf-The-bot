const { SlashCommandBuilder } = require('discord.js');
const stories = require('../../data/gandalf-stories.json');
const { createGandalfEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('📖 Listen to a chronicle of Middle-earth adventurers in the blocky realm'),

  async execute(interaction) {
    const randomStory = stories[Math.floor(Math.random() * stories.length)];

    const embed = createGandalfEmbed({
      title: `Chronicle: ${randomStory.title}`,
      description: randomStory.story,
      footer: 'Tales of Middle-earth & Minecraft • Gandalf the BOT'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
