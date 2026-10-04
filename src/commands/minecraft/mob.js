const { SlashCommandBuilder } = require('discord.js');
const mobs = require('../../data/mobs.json');
const { searchWiki } = require('../../utils/minecraft-api');
const { createMinecraftEmbed, createErrorEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mob')
    .setDescription('🧟 Look up mob statistics, drops, and combat tips in the bestiary')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('Mob name (e.g. creeper, enderman, warden, blaze, wither)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString('name').toLowerCase().trim();
    const found = mobs.find(m => m.name.toLowerCase().includes(query));

    if (!found) {
      // Automatic live fallback to Minecraft Wiki
      await interaction.deferReply();
      const wikiResult = await searchWiki(query);

      if (wikiResult) {
        const embed = createMinecraftEmbed({
          title: `👾 Bestiary Entry: ${wikiResult.title}`,
          description: `${wikiResult.extract}\n\n🔗 **[Read Full Bestiary Archive on Minecraft Wiki](${wikiResult.url})**`,
          color: config.colors.minecraft.gold,
          fields: [
            { name: '🔍 Queried Creature', value: `\`${query}\``, inline: true },
            { name: '🌐 Source', value: '[minecraft.wiki](https://minecraft.wiki)', inline: true }
          ],
          footer: 'Live Bestiary Link • Minecraft WEEK'
        });
        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply({
        embeds: [createErrorEmbed('Creature Not Found', `Even the grand archives hold no record of **"${query}"** in the known Minecraft realms.`)]
      });
    }

    const embed = createMinecraftEmbed({
      title: `👾 Bestiary Entry: ${found.name}`,
      description: `**Classification:** \`${found.type}\``,
      color: found.type.includes('Hostile') ? config.colors.minecraft.red : config.colors.minecraft.gold,
      fields: [
        { name: '❤️ Health', value: found.health, inline: true },
        { name: '⚔️ Attack Power', value: found.attack, inline: true },
        { name: '💎 Drops', value: found.drops, inline: false },
        { name: '🧠 Behavior & Survival Advice', value: found.behavior, inline: false }
      ],
      footer: 'Minecraft WEEK Bestiary'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
