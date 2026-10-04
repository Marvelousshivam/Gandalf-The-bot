const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const { getGuildConfig } = require('../../database');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-rules')
    .setDescription('📜 Post the sacred realm rules embed with interactive verification button')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildConfig = getGuildConfig(interaction.guildId);

    const embed = createMinecraftEmbed({
      title: `📜 Sacred Laws of ${interaction.guild.name}`,
      description: `Welcome, traveler! Before you cross the threshold and step into the wild lands, you must swear by the sacred laws of the realm:\n\n` +
        `**1. Respect all Adventurers**\nHarassment, toxicity, hate speech, and disrespect will result in banishment.\n\n` +
        `**2. No Griefing or Pillaging**\nRespect builds, chest locks, and personal claims. Stealing or destroying others' work is strictly forbidden.\n\n` +
        `**3. Fair Play (No Cheats / Hacked Clients)**\nX-Ray texture packs, baritone bots, and hacked clients are not tolerated. Play with honor!\n\n` +
        `**4. Keep Realm Chat Civilized**\nAvoid spamming, advertising external servers, or posting harmful links.\n\n` +
        `**5. Heed the Decrees of the Council**\nFollow guidance given by Server Staff and Moderators.\n\n` +
        `**6. Have Fun & Build Grand Wonders! ⛏️**\nForge alliances, conquer dungeons, and make this realm your home!`,
      color: config.colors.minecraft.green,
      fields: [
        {
          name: '🛡️ Realm Verification',
          value: 'Click the **Accept Rules** button below to verify your oath and unlock full realm access.',
          inline: false
        }
      ],
      footer: 'Decree of the White Council • Minecraft WEEK'
    });

    const verifyButton = new ButtonBuilder()
      .setCustomId('verify_rules')
      .setLabel('✅ Accept Rules & Enter Realm')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await interaction.channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: '✅ The sacred rules scroll has been posted in this channel with the verification button!',
      ephemeral: true
    });
  }
};
