require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`  ✨ Prepared command: /${command.data.name}`);
      } else {
        console.warn(`  ⚠️ Command at ${fullPath} is missing required "data" or "execute" property.`);
      }
    }
  }
}

console.log('🔮 Gathering spellbook commands...');
loadCommands(commandsPath);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n🚀 Registering ${commands.length} application (/) commands...`);

    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      console.log(`🎯 Deploying to Guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${commands.length} slash commands to Minecraft WEEK!`);
    } else {
      console.log(`🌍 Deploying globally...`);
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${commands.length} slash commands globally!`);
    }
  } catch (error) {
    console.error('❌ Failed to deploy slash commands:', error);
  }
})();
