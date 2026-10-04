const { SlashCommandBuilder } = require('discord.js');
const gifs = require('../../data/gandalf-gifs.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gandalf-gif')
    .setDescription('🧙‍♂️ Summon a legendary animated Gandalf reaction GIF'),

  async execute(interaction) {
    const item = gifs[Math.floor(Math.random() * gifs.length)];

    // Sending directly as content allows Discord's native player to embed and animate the Tenor GIF in full resolution
    await interaction.reply({
      content: `### ${item.title}\n${item.url}`
    });
  }
};
