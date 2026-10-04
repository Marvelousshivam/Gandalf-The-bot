const { Events } = require('discord.js');
const { sendAuditLog } = require('../systems/auditLogger');
const config = require('../../config');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const content = message.content
      ? (message.content.length > 800 ? message.content.slice(0, 800) + '...' : message.content)
      : '*No text content (may have been an image or embed)*';

    sendAuditLog(message.guild, {
      title: 'Message Deleted',
      description: `A message from <@${message.author.id}> was deleted in ${message.channel}.`,
      color: config.colors.minecraft.red,
      fields: [
        { name: 'Author', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: `\`\`\`${content}\`\`\``, inline: false }
      ]
    });
  }
};
