const { Events } = require('discord.js');
const { getGuildConfig } = require('../database');
const { generateWelcomeImage } = require('../systems/welcomeImage');
const { createMinecraftEmbed } = require('../utils/embedBuilder');
const config = require('../../config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.user.bot) return;

    const guildConfig = getGuildConfig(member.guild.id);
    if (guildConfig.welcome_enabled === 0) return;

    // Resolve welcome channel
    let welcomeChannel = null;
    if (guildConfig.welcome_channel_id) {
      welcomeChannel = member.guild.channels.cache.get(guildConfig.welcome_channel_id);
    }

    if (!welcomeChannel) {
      welcomeChannel = member.guild.channels.cache.find(c =>
        c.isTextBased() && (c.name.includes('welcome') || c.name.includes('rules'))
      ) || member.guild.systemChannel;
    }

    if (!welcomeChannel) return;

    // Generate title screen welcome card
    const attachment = await generateWelcomeImage(member, member.guild.memberCount);

    const embed = createMinecraftEmbed({
      title: `✨ A New Adventurer Steps into the Realm!`,
      description: `Welcome <@${member.id}> to **${member.guild.name}**!\n\nPick up your stone pickaxe and read the sacred laws in ${welcomeChannel} before journeying beyond the Shire.`,
      color: config.colors.minecraft.green,
      fields: [
        { name: '👤 Adventurer', value: `${member.user.tag}`, inline: true },
        { name: '🎖️ Realm Count', value: `Adventurer #${member.guild.memberCount}`, inline: true },
        { name: '📜 Guide', value: 'Check out `/help` to see Gandalf\'s spells & Minecraft tools.', inline: false }
      ],
      footer: '🧙‍♂️ Gandalf: "Home is now behind you, the world is ahead."'
    });

    if (attachment) {
      embed.setImage('attachment://minecraft-welcome.png');
      await welcomeChannel.send({ embeds: [embed], files: [attachment] }).catch(err => {
        console.error('Failed to send welcome message with image:', err);
      });
    } else {
      await welcomeChannel.send({ embeds: [embed] }).catch(err => {
        console.error('Failed to send fallback welcome message:', err);
      });
    }
  }
};
