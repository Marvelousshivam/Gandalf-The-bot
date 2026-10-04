const { Events } = require('discord.js');
const { sendAuditLog } = require('../systems/auditLogger');
const config = require('../../config');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // ignore embed generation changes

    const oldText = oldMessage.content
      ? (oldMessage.content.length > 500 ? oldMessage.content.slice(0, 500) + '...' : oldMessage.content)
      : '*Content was not cached*';
    const newText = newMessage.content
      ? (newMessage.content.length > 500 ? newMessage.content.slice(0, 500) + '...' : newMessage.content)
      : '*Empty*';

    sendAuditLog(newMessage.guild, {
      title: 'Message Edited',
      description: `A message from <@${newMessage.author.id}> was modified in ${newMessage.channel}.`,
      color: config.colors.minecraft.aqua,
      fields: [
        { name: 'Author', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: `\`\`\`${oldText}\`\`\``, inline: false },
        { name: 'After', value: `\`\`\`${newText}\`\`\``, inline: false }
      ]
    });
  }
};
