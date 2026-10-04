const { SlashCommandBuilder } = require('discord.js');
const potions = require('../../data/potions.json');
const { searchWiki } = require('../../utils/minecraft-api');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('potion')
    .setDescription('🧪 Consult the alchemical brewing handbook for ingredients & recipes')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Potion name (e.g. healing, strength, fire resistance, oozing)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('name').toLowerCase().trim();
    const found = potions.find(p => p.name.toLowerCase().includes(query));

    if (!found) {
      await interaction.deferReply();
      const wikiResult = await searchWiki(query + ' potion');

      if (wikiResult) {
        const embed = createMinecraftEmbed({
          title: `🧪 Alchemical Brew: ${wikiResult.title}`,
          description: `${wikiResult.extract}\n\n🔗 **[Read Full Brewing Guide on Minecraft Wiki](${wikiResult.url})**`,
          color: config.colors.minecraft.green,
          fields: [
            { name: '🔍 Searched Brew', value: `\`${query}\``, inline: true },
            { name: '🌐 Source', value: '[minecraft.wiki](https://minecraft.wiki)', inline: true }
          ]
        });
        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply({
        embeds: [createErrorEmbed('Unknown Brew', `No brewing records found for **"${query}"** in the handbook.`)]
      });
    }

    const embed = createMinecraftEmbed({
      title: `🧪 Alchemical Brew: Potion of ${found.name}`,
      description: `**Effect:**\n${found.effect}`,
      color: config.colors.minecraft.green,
      fields: [
        { name: '⚗️ Starting Base Potion', value: `\`${found.base}\``, inline: true },
        { name: '🌿 Primary Ingredient', value: `\`${found.ingredient}\``, inline: true },
        { name: '✨ Enhancements & Modifiers', value: found.upgrades, inline: false },
        { name: '🔥 Fuel Requirement', value: 'Place Blaze Powder in the top-left slot of the Brewing Stand.', inline: false }
      ],
      footer: 'Alchemical Handbook • Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
