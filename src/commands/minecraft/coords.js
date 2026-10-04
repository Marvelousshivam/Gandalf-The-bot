const { SlashCommandBuilder } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coords')
    .setDescription('🗺️ Nether Portal Coordinate Calculator & Linking Calculator')
    .addStringOption(opt =>
      opt.setName('direction')
        .setDescription('Conversion direction')
        .setRequired(true)
        .addChoices(
          { name: 'Overworld ➔ Nether (Divide by 8)', value: 'ow_to_nether' },
          { name: 'Nether ➔ Overworld (Multiply by 8)', value: 'nether_to_ow' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('x')
        .setDescription('X coordinate')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('z')
        .setDescription('Z coordinate')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('y')
        .setDescription('Y coordinate (height/elevation)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const direction = interaction.options.getString('direction');
    const x = interaction.options.getInteger('x');
    const z = interaction.options.getInteger('z');
    const y = interaction.options.getInteger('y');

    let targetX, targetZ;
    let fromDimension, toDimension;

    if (direction === 'ow_to_nether') {
      fromDimension = '🌍 Overworld';
      toDimension = '🔥 Nether';
      targetX = Math.floor(x / 8);
      targetZ = Math.floor(z / 8);
    } else {
      fromDimension = '🔥 Nether';
      toDimension = '🌍 Overworld';
      targetX = x * 8;
      targetZ = z * 8;
    }

    const yCoordDisplay = y !== null ? ` (Y: \`${y}\`)` : '';
    const targetYCoordDisplay = y !== null ? `\n• Suggested Y: \`${y}\` *(keep Y similar to prevent cross-portal linking)*` : '';

    const embed = createMinecraftEmbed({
      title: '🗺️ Nether Portal Synchronization Calculator',
      description: `Calculating spatial translation across dimensional barriers:\n**From:** ${fromDimension} ➔ **To:** ${toDimension}`,
      color: direction === 'ow_to_nether' ? 0xAA0000 : config.colors.minecraft.green,
      fields: [
        {
          name: `Input Coordinates (${fromDimension})`,
          value: `• **X:** \`${x}\`\n• **Z:** \`${z}\`${yCoordDisplay}`,
          inline: true
        },
        {
          name: `Build Portal Here (${toDimension})`,
          value: `• **X:** \`${targetX}\`\n• **Z:** \`${targetZ}\`${targetYCoordDisplay}`,
          inline: true
        },
        {
          name: '🔮 Wizardly Portal Linking Rules',
          value: '1. Build and light your portal in the starting dimension.\n2. **DO NOT** just step through blindly if you have other nearby portals!\n3. Travel manually to the calculated coordinates in the other realm.\n4. Build the destination portal at `X: ' + targetX + ', Z: ' + targetZ + '` and light it.\n5. Both portals will now be locked together seamlessly with zero risk of misplaced linking!',
          inline: false
        }
      ],
      footer: 'Dimensional Cartography • Minecraft WEEK'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
