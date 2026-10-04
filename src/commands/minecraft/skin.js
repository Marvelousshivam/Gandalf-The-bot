const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPlayerSkin } = require('../../utils/minecraft-api');
const { createMinecraftEmbed } = require('../../utils/embedBuilder');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skin')
    .setDescription('🥋 Inspect a player\'s Minecraft skin & 3D body render (Cracked, TLauncher & Premium aware)')
    .addStringOption(opt =>
      opt.setName('username')
        .setDescription('Minecraft in-game username')
        .setRequired(true)
    ),

  async execute(interaction) {
    const username = interaction.options.getString('username').trim();
    await interaction.deferReply();

    const skinData = await getPlayerSkin(username);
    const files = [];

    let thumbnailUrl = skinData.avatarUrl;
    let imageUrl = skinData.bodyUrl;

    if (skinData.avatarBuffer) {
      const avatarAttachment = new AttachmentBuilder(skinData.avatarBuffer, { name: 'skin_avatar.png' });
      files.push(avatarAttachment);
      thumbnailUrl = 'attachment://skin_avatar.png';
    }

    if (skinData.bodyBuffer) {
      const bodyAttachment = new AttachmentBuilder(skinData.bodyBuffer, { name: 'skin_body.png' });
      files.push(bodyAttachment);
      imageUrl = 'attachment://skin_body.png';
    }

    let description = '';
    let color = config.colors.minecraft.green;
    let accountType = '`✅ Premium Mojang`';
    let footerText = '🔗 Skin rendered via MC-Heads';

    if (skinData.isPremium) {
      description = `Viewing authentic Mojang profile for **${skinData.username}**.`;
      color = config.colors.minecraft.green;
      accountType = '`✅ Premium Mojang`';
      footerText = '🔗 Skin rendered via MC-Heads';
    } else if (skinData.isTLauncher) {
      description = `✨ **Custom TLauncher Skin Found!**\nGandalf extracted and rendered **${skinData.username}**'s custom skin directly from the TLauncher skin database!`;
      color = config.colors.minecraft.aqua;
      accountType = '`🎮 TLauncher (Custom Skin)`';
      footerText = '⚡ Rendered by Gandalf Skin Engine (TLauncher Database)';
    } else {
      description = `⚠️ **Non-Mojang / Cracked Player:**\n${skinData.note}`;
      color = config.colors.minecraft.gold;
      accountType = '`🔓 Offline / Cracked`';
      footerText = '💡 Showing default Steve skin';
    }

    const embed = createMinecraftEmbed({
      title: `🥋 Minecraft Skin: ${skinData.username}`,
      description,
      color,
      thumbnail: thumbnailUrl,
      image: imageUrl,
      fields: [
        { name: '👤 Username', value: `\`${skinData.username}\``, inline: true },
        { name: '🏷️ Account Type', value: accountType, inline: true },
        { name: '🆔 UUID', value: skinData.uuid ? `\`${skinData.uuid}\`` : '`Offline (No Mojang UUID)`', inline: false }
      ],
      footer: footerText
    });

    if (skinData.isPremium && skinData.uuid) {
      embed.addFields({
        name: '🌐 NameMC Profile',
        value: `[View ${skinData.username} on NameMC](https://namemc.com/profile/${skinData.uuid})`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed], files });
  }
};
