const { SlashCommandBuilder } = require('discord.js');
const { generateAdvancementToast } = require('../../systems/advancementImage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advancement')
    .setDescription('🏅 Generate an authentic in-game Minecraft "Advancement Made!" toast banner')
    .addStringOption(opt =>
      opt.setName('title')
        .setDescription('Advancement title (e.g. "Friend of Gandalf", "Balrog Slayer")')
        .setRequired(true)
        .setMaxLength(36)
    )
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of advancement')
        .setRequired(false)
        .addChoices(
          { name: '⭐ Task (Yellow - Advancement Made!)', value: 'task' },
          { name: '🎯 Goal (Green - Goal Reached!)', value: 'goal' },
          { name: '🔥 Challenge (Purple - Challenge Complete!)', value: 'challenge' }
        )
    )
    .addStringOption(opt =>
      opt.setName('icon')
        .setDescription('Icon to display in the advancement slot')
        .setRequired(false)
        .addChoices(
          { name: '💎 Diamond', value: 'diamond' },
          { name: '⚔️ Netherite Sword', value: 'sword' },
          { name: '⛏️ Diamond Pickaxe', value: 'pickaxe' },
          { name: '🍏 Enchanted Golden Apple', value: 'apple' },
          { name: '🏹 Bow', value: 'bow' },
          { name: '🗿 Totem of Undying', value: 'totem' },
          { name: '✨ Nether Star', value: 'star' },
          { name: '📖 Enchanted Book', value: 'book' },
          { name: '🧙 Wizard Eye / Staff', value: 'wizard' },
          { name: '🧨 TNT Block', value: 'tnt' },
          { name: '👑 Golden Crown', value: 'crown' },
          { name: '🟩 Creeper Head', value: 'creeper' },
          { name: '🪽 Elytra Wings', value: 'elytra' },
          { name: '🟢 Emerald', value: 'emerald' }
        )
    )
    .addStringOption(opt =>
      opt.setName('player')
        .setDescription('Minecraft player name for skin head (e.g. shivamraj616)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Optional sub-text or requirement description')
        .setRequired(false)
        .setMaxLength(55)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const title = interaction.options.getString('title').trim();
    const type = interaction.options.getString('type') || 'task';
    const icon = interaction.options.getString('icon') || 'diamond';
    const description = interaction.options.getString('description')?.trim() || '';
    const player = interaction.options.getString('player')?.trim();

    if (player) {
      const { generateGrandAdvancementBanner } = require('../../systems/advancementImage');
      const { attachment } = await generateGrandAdvancementBanner({
        player,
        title,
        type,
        description,
        icon,
        quote: `A glorious triumph, ${player}! Truly, adventure runs deep in your blood!`
      });
      return interaction.editReply({ files: [attachment] });
    }

    const attachment = await generateAdvancementToast({
      title,
      description,
      icon,
      type
    });

    await interaction.editReply({ files: [attachment] });
  }
};
