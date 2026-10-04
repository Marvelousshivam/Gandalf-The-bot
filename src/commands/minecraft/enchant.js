const { SlashCommandBuilder } = require('discord.js');
const enchantments = require('../../data/enchantments.json');
const { searchWiki } = require('../../utils/minecraft-api');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enchant')
    .setDescription('✨ Consult the enchantment compendium for mechanics and conflicts')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Enchantment name (e.g. mending, fortune, sharpness, wind burst)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('name').toLowerCase().trim();
    const found = enchantments.find(e => e.name.toLowerCase().includes(query));

    if (!found) {
      await interaction.deferReply();
      const wikiResult = await searchWiki(query + ' enchantment');

      if (wikiResult) {
        const embed = createMinecraftEmbed({
          title: `✨ Enchantment Guide: ${wikiResult.title}`,
          description: `${wikiResult.extract}\n\n🔗 **[Read Full Mechanics on Minecraft Wiki](${wikiResult.url})**`,
          color: config.colors.minecraft.aqua,
          fields: [
            { name: '🔍 Searched Enchantment', value: `\`${query}\``, inline: true },
            { name: '🌐 Source', value: '[minecraft.wiki](https://minecraft.wiki)', inline: true }
          ]
        });
        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply({
        embeds: [createErrorEmbed('Unknown Enchantment', `Could not find enchantment records for **"${query}"** in the archives.`)]
      });
    }

    const embed = createMinecraftEmbed({
      title: `✨ Enchantment: ${found.name}`,
      description: found.description,
      color: config.colors.minecraft.aqua,
      fields: [
        { name: '⭐ Maximum Level', value: `Level **${found.maxLevel}**`, inline: true },
        { name: '⚔️ Applicable Gear', value: found.items, inline: true },
        { name: '⚡ Mutual Conflicts', value: found.conflicts, inline: false }
      ],
      footer: 'Enchantment Compendium • Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
