const { SlashCommandBuilder } = require('discord.js');
const { createGandalfEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backstory')
    .setDescription('📜 Discover the legend of how Gandalf arrived in the Minecraft WEEK realm'),

  async execute(interaction) {
    const embed = createGandalfEmbed({
      title: 'The Chronicle of the Grey Wanderer',
      description: 
        '**How Gandalf Journeyed from Middle-earth to Minecraft WEEK**\n\n' +
        '⛵ **The Voyage from the Grey Havens**\n' +
        'At the close of the Third Age, having aided in the downfall of Sauron, Gandalf the Grey boarded the White Ship at the Grey Havens to seek the peace of the Undying Lands.\n\n' +
        '🌀 **The Arcane Obsidian Rift**\n' +
        'As the ship cut through the western mists, an ancient tear in the dimensional fabric opened before them — a roaring vortex bordered by obsidian and humming with Nether fire. Rather than resisting, the wizard raised his staff to shield his companions, and was pulled across time and space into another plane.\n\n' +
        '⛏️ **Waking upon Cubic Shores**\n' +
        'Gandalf awoke washed ashore on a beach of cubic sand beneath square clouds and a pixelated sun. He found a realm of infinite horizons where stone could be shaped with bare hands, caves echoed with eerie skittering, and redstone dust buzzed with the secret logic of creation.\n\n' +
        '🧙‍♂️ **The Guardian\'s Oath**\n' +
        'Witnessing the fellowship and boundless ambition of the adventurers in **Minecraft WEEK** — miners building grand citadels, slaying dragons, and braving the abyss — Gandalf planted Glamdring and his staff upon the spawn hill.\n\n' +
        'He swore to remain as the server\'s eternal guardian: counseling adventurers in alchemy and crafting, watching over their travels, and casting out darkness wherever it lurks.',
      footer: '✨ Gandalf the BOT • Guardian Wizard of Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
