const { SlashCommandBuilder } = require('discord.js');
const { searchWiki } = require('../../utils/minecraft-api');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('📚 Consult the ancient tomes of the Official Minecraft Wiki')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Item, block, mob, mechanic, or dimension to research')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query').trim();
    await interaction.deferReply();

    const result = await searchWiki(query);

    if (!result) {
      return interaction.editReply({
        embeds: [createErrorEmbed(
          'Tome Not Found',
          `The grand archives of Minecraft hold no entry for **"${query}"**. Try searching for a specific item, mob, or block name.`
        )]
      });
    }

    const embed = createMinecraftEmbed({
      title: `📖 Minecraft Wiki: ${result.title}`,
      description: `${result.extract}\n\n🔗 **[Read Full Article on Minecraft.wiki](${result.url})**`,
      color: config.colors.minecraft.green,
      fields: [
        { name: '🔍 Search Term', value: `\`${query}\``, inline: true },
        { name: '🌐 Source', value: '[minecraft.wiki](https://minecraft.wiki)', inline: true }
      ],
      footer: 'Official Minecraft Wiki • Community Maintained'
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
