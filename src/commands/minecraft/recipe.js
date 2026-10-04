const { SlashCommandBuilder } = require('discord.js');
const { findRecipe } = require('../../utils/recipeDatabase');
const { searchWiki } = require('../../utils/minecraft-api');
const { generateCraftingTableImage } = require('../../systems/craftingImage');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recipe')
    .setDescription('🔨 Reveal the authentic Minecraft 3x3 crafting table grid for ANY item')
    .addStringOption(opt =>
      opt.setName('item')
        .setDescription('Item name (e.g. diamond axe, beacon, sword, torch, chest, bow)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemQuery = interaction.options.getString('item').trim();

    await interaction.deferReply();

    const found = findRecipe(itemQuery);

    if (found) {
      const imageAttachment = await generateCraftingTableImage(found.name, found.grid, found.output);

      const embed = createMinecraftEmbed({
        title: `🔨 Crafting Recipe: ${found.name}`,
        description: `**Formula for ${found.name}:**\n• **Yield:** \`${found.output}\``,
        color: config.colors.minecraft.gold,
        image: 'attachment://crafting-table.png',
        fields: [
          { name: '💡 Crafting Guide', value: found.notes || 'Craft in a standard 3x3 Crafting Table.', inline: false }
        ],
        footer: 'Authentic 3x3 Crafting Table • Minecraft WEEK'
      });

      return interaction.editReply({ embeds: [embed], files: [imageAttachment] });
    }

    // Fallback: look up item on Wiki (e.g. smelted/smither items or blocks)
    const wikiResult = await searchWiki(itemQuery);

    if (wikiResult) {
      const embed = createMinecraftEmbed({
        title: `🔨 Crafting & Acquisition: ${wikiResult.title}`,
        description: `This item does not use a standard 3x3 crafting table (it may require smelting, brewing, or smithing):\n\n${wikiResult.extract}\n\n🔗 **[View Recipe on Minecraft Wiki](${wikiResult.url})**`,
        color: config.colors.minecraft.green
      });
      return interaction.editReply({ embeds: [embed] });
    }

    return interaction.editReply({
      embeds: [createErrorEmbed('Unknown Recipe', `No crafting recipe or item record found for **"${itemQuery}"**. Try searching for items like \`diamond axe\`, \`bow\`, \`torch\`, \`chest\`, etc.`)]
    });
  }
};
