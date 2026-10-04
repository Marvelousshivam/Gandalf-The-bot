const { SlashCommandBuilder } = require('discord.js');
const { createGandalfEmbed } = require('../../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Unfurls the ancient spellbook of Gandalf the BOT commands'),

  async execute(interaction) {
    const embed = createGandalfEmbed({
      title: 'The Grimoire of Gandalf the BOT',
      description: 'Here are all the incantations and commands at your disposal across this realm:\n',
      fields: [
        {
          name: '🧙‍♂️ Wisdom, Lore & Fun',
          value: '• `/ask-gandalf <question>` — Seek wisdom via Groq & OpenRouter AI\n• `/backstory` — How Gandalf journeyed to Minecraft WEEK\n• `/advancement <title>` — Generate in-game Minecraft toast banners\n• `/gandalf` — Receive instant words of ancient wisdom\n• `/gandalf-gif` — Summon a classic wizardly GIF\n• `/story` — Hear an epic tale of Middle-earth meets Minecraft',
          inline: false
        },
        {
          name: '🍿 Movie Nights & Cinema',
          value: '• `/movie search <title>` — Real-time TMDB lookup, posters, ratings & trailer\n• `/movie plan <title> <time>` — Schedule movie night, Discord event & RSVP card\n• `/movie vote <titles...>` — Interactive poll with live progress bars\n• `/movie watchlist <add|list|remove|watched>` — Manage community backlog\n• `/movie roulette` — Palantír\'s choice random movie spin\n• `/movie review <title>` — Gandalf\'s dual AI movie critique & rating',
          inline: false
        },
        {
          name: '⛏️ Minecraft Knowledge & Tools',
          value: '• `/status` — View live Aternos server status, players, and MOTD\n• `/skin <player>` — Inspect 3D player skin & avatar (cracked-aware)\n• `/wiki <query>` — Search the official Minecraft Wiki\n• `/recipe <item>` — View 3x3 crafting grid guide\n• `/enchant <name>` — Look up enchantment mechanics\n• `/potion <name>` — Check potion brewing recipes\n• `/mob <name>` — View mob statistics & drops\n• `/coords` — Nether portal coordinate calculator',
          inline: false
        },
        {
          name: '🏆 Leveling & Community',
          value: '• `/rank [target]` — View your Minecraft level, XP, and rank badge\n• `/leaderboard` — View the top adventurers in the server\n• `/ticket <reason>` — Open a private support channel with staff',
          inline: false
        },
        {
          name: '🛡️ Moderation (Staff Only)',
          value: '• `/warn <user> <reason>` — Issue a formal warning (auto-mutes at 3, bans at 5)\n• `/warnings <user>` — View warning history\n• `/clearwarn <user> [id]` — Clear warnings\n• `/mute <user> <duration> [reason]` — Silence an unruly adventurer\n• `/unmute <user>` — Restore their voice\n• `/kick <user> [reason]` — Banish from the Shire\n• `/ban <user> [reason]` — Cast into the void\n• `/purge <count>` — Bulk clean up chat messages',
          inline: false
        },
        {
          name: '⚙️ Administration & Setup',
          value: '• `/config` — Configure welcome, mod logs, status channels & toggles\n• `/setup-rules` — Spawn the interactive rules verification gate\n• `/setup-roles` — Spawn button-based edition & announcement roles\n• `/setup-status` — Spawn the auto-updating server status embed',
          inline: false
        },
        {
          name: '🧰 General Utility',
          value: '• `/ping` — Check wizard heartbeat & latency\n• `/serverinfo` — Realm statistics and details\n• `/userinfo [target]` — Detailed adventurer profile',
          inline: false
        }
      ],
      quote: 'May it be a light to you in dark places, when all other lights go out.'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
