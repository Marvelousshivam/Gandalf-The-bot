module.exports = {
  // Color themes for embeds
  colors: {
    minecraft: {
      green: 0x55FF55,      // Success / online / classic MC green
      darkGreen: 0x00AA00,  // Deep forest green
      gold: 0xFFAA00,       // Advancements / gold
      red: 0xFF5555,        // Errors / offline / warnings
      aqua: 0x55FFFF,       // Diamond / info
      gray: 0xAAAAAA,       // Stone / neutral
      darkGray: 0x3F3F3F,   // Bedrock dark
    },
    lotr: {
      gold: 0xDAA520,       // Gandalf wisdom gold
      parchment: 0xF5DEB3,  // Ancient scroll
      elvishGreen: 0x228B22, // Rivendell green
      shadowDark: 0x1A1A2E, // Deep shadow
    }
  },

  // XP and Leveling configuration
  xp: {
    minPerMessage: 15,
    maxPerMessage: 25,
    cooldownMs: 60000, // 1 minute between message XP gains
    // Level XP requirement formula: 5 * level^2 + 50 * level + 100
    levelFormula: (level) => 5 * (level ** 2) + 50 * level + 100,
    ranks: [
      { level: 0, title: '🪨 Stone Miner' },
      { level: 5, title: '🪵 Wood Crafter' },
      { level: 10, title: '⛏️ Iron Miner' },
      { level: 15, title: '💎 Diamond Miner' },
      { level: 20, title: '🌟 Netherite Warrior' },
      { level: 30, title: '🐉 Ender Dragon Slayer' },
      { level: 50, title: "🧙‍♂️ Gandalf's Apprentice" },
    ]
  },

  // Auto-Moderation defaults
  autoMod: {
    maxMessagesPerInterval: 5,
    intervalMs: 5000,
    maxMentions: 5,
    maxDuplicates: 3,
  },

  // Warning thresholds
  warnings: {
    muteThreshold: 3,
    banThreshold: 5,
    muteDurationMs: 3600000 // 1 hour in ms
  },

  // Minecraft query defaults
  minecraft: {
    defaultAddress: 'YourServer.aternos.me',
    defaultPort: 25565,
    statusCheckIntervalMs: 300000, // 5 minutes
  }
};
