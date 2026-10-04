const { SlashCommandBuilder } = require('discord.js');
const quotes = require('../../data/gandalf-quotes.json');
const { createGandalfEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gandalf')
    .setDescription('✨ Receive an instant scroll of ancient Gandalf wisdom'),

  async execute(interaction) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const embed = createGandalfEmbed({
      title: 'Words of the White Wizard',
      description: `*"${quote}"*`,
      footer: 'Gandalf the Grey • Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
