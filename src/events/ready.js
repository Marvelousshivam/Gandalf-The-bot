const { ActivityType, Events } = require('discord.js');
const { getGuildConfig } = require('../database');
const { getServerStatus } = require('../utils/minecraft-api');
const { buildStatusDisplay } = require('../systems/serverStatusDisplay');
const { createMinecraftEmbed } = require('../utils/embedBuilder');
const { startMovieScheduler } = require('../systems/movieNightScheduler');
const config = require('../../config');

async function updateAllStatusEmbeds(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const cfg = getGuildConfig(guild.id);
      if (!cfg.status_channel_id || !cfg.status_message_id) continue;

      const channel = await client.channels.fetch(cfg.status_channel_id).catch(() => null);
      if (!channel) continue;

      const msg = await channel.messages.fetch(cfg.status_message_id).catch(() => null);
      if (!msg) continue;

      const serverAddress = cfg.mc_server_address || process.env.MC_SERVER_ADDRESS || 'YourServer.aternos.me';
      const serverPort = cfg.mc_server_port || 25565;

      const status = await getServerStatus(serverAddress, serverPort);
      const isOnline = status.online;

      const display = await buildStatusDisplay(status, serverAddress, serverPort, cfg.live_chat_channel_id);
      await msg.edit(display).catch((e) => console.error('Failed to edit status message:', e));

      // Update bot presence
      client.user.setPresence({
        activities: [
          {
            name: isOnline
              ? `MC WEEK (${status.players.online}/${status.players.max}) | /help`
              : 'over Minecraft WEEK ⛏️ | /help',
            type: ActivityType.Watching
          }
        ],
        status: isOnline ? 'online' : 'idle'
      });
    } catch (err) {
      console.error(`Error in status update loop for guild ${guild.id}:`, err);
    }
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`\n🧙‍♂️ ====================================================`);
    console.log(`   Gandalf the BOT has arrived! Logged in as ${client.user.tag}`);
    console.log(`   Serving ${client.guilds.cache.size} server(s) and ${client.users.cache.size} user(s)`);
    console.log(`🧙‍♂️ ====================================================\n`);

    // Set initial presence
    client.user.setPresence({
      activities: [
        {
          name: 'over Minecraft WEEK ⛏️ | /help',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    // Run initial status update immediately on boot
    updateAllStatusEmbeds(client).catch(err => console.error('Initial status embed update error:', err));

    // Auto-update server status embed every 5 minutes
    setInterval(() => updateAllStatusEmbeds(client), config.minecraft.statusCheckIntervalMs);

    // Initialize Movie Nights reminder & poll auto-resolver
    startMovieScheduler(client);
  }
};
