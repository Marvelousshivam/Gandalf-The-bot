const { Events } = require('discord.js');
const { handleAutoMod } = require('../systems/autoMod');
const { addXp, getUserXp, getGuildConfig } = require('../database');
const { getRankTitle } = require('../systems/xpSystem');
const { askGandalfAI } = require('../utils/ai');
const cooldown = require('../utils/cooldown');
const config = require('../../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || message.author.id === message.client.user.id) return;

    const guildConfig = getGuildConfig(message.guild.id);

    // --- In-Game Minecraft Chat Bridge (DiscordSRV Integration) ---
    if (message.author.bot) {
      const isLiveChat = guildConfig.live_chat_channel_id && message.channel.id === guildConfig.live_chat_channel_id;

      // Extract text from message content or DiscordSRV embed
      const rawContent = message.content.trim();
      const embedAuthor = message.embeds[0]?.author?.name || '';
      const embedDesc = message.embeds[0]?.description || '';
      const embedTitle = message.embeds[0]?.title || '';
      const fullText = (rawContent || embedAuthor || embedDesc || embedTitle).trim();
      const lower = fullText.toLowerCase();

      // Only inspect if in configured live chat channel or explicitly calling !gandalf
      if (!isLiveChat && !lower.includes('!gandalf')) return;

      // 1. In-game !gandalf question
      if (lower.includes('!gandalf') || lower.startsWith('gandalf ')) {
        const aiCooldownKey = `ingame_ai:${message.channel.id}`;
        const { onCooldown } = cooldown.check(aiCooldownKey, 3000);
        if (onCooldown) return;

        let playerName = null;
        let prompt = fullText;

        // Parse DiscordSRV patterns: "Player » !gandalf ...", "<Player> !gandalf ...", "Player: !gandalf ..."
        const chatMatch = fullText.match(/^<?([a-zA-Z0-9_]{3,16})>?(?:\s*»|\s*:|\s*>)\s*(.*)$/);
        if (chatMatch) {
          playerName = chatMatch[1];
          prompt = chatMatch[2];
        } else {
          const altMatch = fullText.match(/^([a-zA-Z0-9_]{3,16})\s+(.*)$/);
          if (altMatch && (altMatch[2].startsWith('!') || altMatch[2].toLowerCase().startsWith('gandalf'))) {
            playerName = altMatch[1];
            prompt = altMatch[2];
          }
        }

        if (!playerName) {
          playerName = 'Adventurer';
        }

        const cleanedPrompt = prompt.replace(/^!gandalf\s*/i, '').replace(/^gandalf\s*[:,]?\s*/i, '').trim();
        if (cleanedPrompt.length > 2) {
          await message.channel.sendTyping().catch(() => {});
          const isCreator = playerName.toLowerCase() === 'shivamraj616' || playerName.toLowerCase() === 'dinesh';

          const aiResponse = await askGandalfAI(cleanedPrompt, {
            username: playerName,
            isOwner: isCreator,
            isMinecraftChat: true
          });

          // Single concise line for Minecraft HUD, bounded to <= 140 chars to prevent truncation
          let cleanAnswer = aiResponse.answer
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/[*`_#]/g, '')
            .trim();

          if (cleanAnswer.length > 140) {
            const sub = cleanAnswer.substring(0, 137);
            const lastPunct = Math.max(sub.lastIndexOf('.'), sub.lastIndexOf('!'), sub.lastIndexOf('?'));
            if (lastPunct > 60) {
              cleanAnswer = sub.substring(0, lastPunct + 1);
            } else {
              const lastSpace = sub.lastIndexOf(' ');
              cleanAnswer = (lastSpace > 60 ? sub.substring(0, lastSpace) : sub) + '...';
            }
          }

          // In-game chat: no emojis so Minecraft doesn't show raw text like :man_mage:
          return message.channel.send(`${playerName}: ${cleanAnswer}`).catch(() => {});
        }
      }

      // 2. In-game player death reaction
      const deathRegex = /^([a-zA-Z0-9_]{3,16})\s+(was slain by|was shot by|was blown up by|blew up|hit the ground too hard|fell from|fell off|fell while|drowned|burned to death|went up in flames|walked into fire|tried to swim in lava|suffocated|starved to death|was squashed|was killed by|withered away|froze to death|was struck by lightning|experienced kinetic energy|discovered the floor was lava|was doomed to fall|fell out of the world)(.*)$/i;

      const deathMatch = fullText.match(deathRegex);
      if (deathMatch && !fullText.startsWith('🧙‍♂️') && !fullText.startsWith('[') && !fullText.includes('Alas!')) {
        const victim = deathMatch[1];
        const deathCause = (deathMatch[2] + (deathMatch[3] || '')).trim();
        const isCreator = victim.toLowerCase() === 'shivamraj616' || victim.toLowerCase() === 'dinesh';

        const deathCooldownKey = `death_reaction:${victim}`;
        const { onCooldown } = cooldown.check(deathCooldownKey, 8000);
        if (!onCooldown) {
          let eulogy = '';
          if (isCreator) {
            const creatorTributes = [
              `Alas! My dear companion ${victim} ${deathCause}! Fear not, old friend—death is but another path. Return swiftly to reclaim your gear!`,
              `A grim hour! My dear friend ${victim} ${deathCause}! Take heart, companion—make haste back before the despawn timer strikes!`,
              `Courage, ${victim}! Even the bravest stumble in the deep mines (${deathCause}). The fellowship awaits your swift return!`
            ];
            eulogy = creatorTributes[Math.floor(Math.random() * creatorTributes.length)];
          } else {
            const playerTributes = [
              `Alas, brave ${victim}! Shadows took you (${deathCause}). May your dropped diamonds remain undisturbed until your return!`,
              `Rest in peace, ${victim}. The hazards of this realm spare none (${deathCause}). To the graveyard, and back to the forge!`,
              `A valiant effort, ${victim}! Even legends fall (${deathCause}). Rise anew and conquer!`,
              `May the stars guide your respawn, ${victim}! Watch your step where shadows linger!`
            ];
            eulogy = playerTributes[Math.floor(Math.random() * playerTributes.length)];
          }

          // No emojis so Minecraft chat shows clean, readable text
          return message.channel.send(`${eulogy}`).catch(() => {});
        }
      }

      // 3. In-game player advancement / challenge achievement
      const advRegex = /^([a-zA-Z0-9_]{3,16})\s+has (?:made the advancement|completed the challenge|reached the goal)\s+\[?([^!\]\n]+)\]?!?/i;

      const advMatch = fullText.match(advRegex);
      if (advMatch && !fullText.startsWith('🧙‍♂️') && !fullText.startsWith('[') && !fullText.includes('By the Valar!')) {
        const advPlayer = advMatch[1];
        const advTitle = advMatch[2].trim();
        const isCreator = advPlayer.toLowerCase() === 'shivamraj616' || advPlayer.toLowerCase() === 'dinesh';

        const advCooldownKey = `adv_reaction:${advPlayer}:${advTitle}`;
        const { onCooldown } = cooldown.check(advCooldownKey, 8000);
        if (!onCooldown) {
          let tribute = '';
          if (isCreator) {
            const creatorAdvTributes = [
              `By the Valar! My dear companion ${advPlayer} has achieved [${advTitle}]! A glorious triumph, old friend—the bards shall sing of this!`,
              `Splendid, my dear friend ${advPlayer}! You have conquered [${advTitle}]! Truly, adventure runs deep in your blood!`,
              `A legendary deed, ${advPlayer}! Unlocking [${advTitle}] proves your valor in this realm! Onward to greater glory!`
            ];
            tribute = creatorAdvTributes[Math.floor(Math.random() * creatorAdvTributes.length)];
          } else {
            const playerAdvTributes = [
              `Hail, ${advPlayer}! The realm celebrates your achievement: [${advTitle}]! Forge ahead to greater glories!`,
              `A marvelous feat, ${advPlayer}! You have attained [${advTitle}]! Well earned!`,
              `Raise a toast in the taverns! ${advPlayer} has conquered [${advTitle}]! Onward, adventurer!`
            ];
            tribute = playerAdvTributes[Math.floor(Math.random() * playerAdvTributes.length)];
          }

          // No emojis so Minecraft chat shows clean, readable text
          return message.channel.send(`${tribute}`).catch(() => {});
        }
      }

      return;
    }

    // --- Standard Discord User Handling ---

    // 1. Run Auto-Moderation check
    const wasModerated = await handleAutoMod(message);
    if (wasModerated) return;

    // 2. XP & Leveling Engine
    if (guildConfig.xp_enabled !== 0) {
      const xpCooldownKey = `xp:${message.guild.id}:${message.author.id}`;
      const { onCooldown } = cooldown.check(xpCooldownKey, config.xp.cooldownMs);

      if (!onCooldown) {
        // Random 15-25 XP
        const earnedXp = Math.floor(Math.random() * (config.xp.maxPerMessage - config.xp.minPerMessage + 1)) + config.xp.minPerMessage;
        addXp(message.guild.id, message.author.id, earnedXp);
      }
    }

    // 3. Conversational Gandalf (Replies, Mentions & Questions)
    if (guildConfig.gandalf_greetings_enabled !== 0) {
      // Check if message is a reply to one of Gandalf's messages
      let isReplyToGandalf = false;
      if (message.reference?.messageId) {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg && repliedMsg.author.id === message.client.user.id) {
          isReplyToGandalf = true;
        }
      }

      // Check if Gandalf is mentioned directly
      const isMentioned = message.mentions.has(message.client.user) && !message.mentions.everyone;

      // Clean query of bot mention
      const botMentionRegex = new RegExp(`<@!?${message.client.user.id}>`, 'g');
      const cleanContent = message.content.replace(botMentionRegex, '').trim();
      const lower = cleanContent.toLowerCase();

      // Check for standalone greetings
      const simpleGreetings = ['hi', 'hey', 'hello', 'sup', 'yo', 'hi gandalf', 'hey gandalf', 'hello gandalf', 'good morning', 'good morning gandalf', 'gandalf?', 'gandalf'];
      const isJustGreeting = simpleGreetings.includes(lower) || lower === 'gandalf';
      const mentionsName = lower.includes('gandalf');

      if (isReplyToGandalf || isMentioned || mentionsName) {
        const aiCooldownKey = `ai_reply:${message.author.id}`;
        const { onCooldown } = cooldown.check(aiCooldownKey, 2000); // 2s cooldown

        if (!onCooldown) {
          const userId = message.author.id;
          const isOwner = userId === process.env.BOT_OWNER_ID;
          const isServerOwner = message.guild.ownerId === userId;

          let userLevel = 0;
          let userRank = 'Stone Miner';
          const userXpData = getUserXp(message.guild.id, userId);
          if (userXpData) {
            userLevel = userXpData.level;
            userRank = getRankTitle(userLevel);
          }

          const userContext = {
            username: message.author.displayName || message.author.username,
            userId,
            isOwner,
            isServerOwner,
            level: userLevel,
            rank: userRank
          };

          // If user asked a real question or conversational prompt in reply/mention
          if (!isJustGreeting && cleanContent.length > 2) {
            await message.channel.sendTyping().catch(() => {});

            // Clean leading/trailing "gandalf" from question
            const cleanedPrompt = cleanContent.replace(/gandalf/gi, '').replace(/^[,\s?]+|[,\s?]+$/g, '').trim() || cleanContent;

            const aiResponse = await askGandalfAI(cleanedPrompt, userContext);

            return message.reply(aiResponse.answer).catch(() => {});
          }

          // Otherwise, friendly greeting (Owner recognized as dear friend like Bilbo/Frodo!)
          if (isOwner) {
            const friendGreetings = [
              `Ah, my dear friend! It warms an old wizard's heart to hear from you. How fares your journey today? 🧙‍♂️✨`,
              `Well met, old friend! Come, sit by the fire for a moment. What adventures are we getting up to in Minecraft WEEK today?`,
              `Ah, there you are! You know, a wizard is never late, but I was beginning to think you'd forgotten your old traveling companion. What's on your mind?`,
              `My dear companion! No matter how deep the caves or dark the night, it is always a brighter hour when you're around. How can an old wizard help? ⛏️`,
              `Speak, my friend! Just like the good old days, I am always glad of your company. What troubles or triumphs do you bring? ✨`
            ];
            const greeting = friendGreetings[Math.floor(Math.random() * friendGreetings.length)];
            return message.reply(greeting).catch(() => {});
          }

          const cannedResponses = [
            'Hmm? A wizard is never idle, young one. What brings you to my tower? 🧙‍♂️',
            'Greetings, traveler! Keep your eyes open; shadows stir in the deep mines.',
            'Ah, hello there! Make sure you carry a water bucket before delving into the caves.',
            'Well met, friend. The road goes ever on and on, but don\'t forget to sleep through the night!',
            'Speak, friend! May the light of Eärendil guide your pickaxe today. ✨'
          ];
          const greeting = cannedResponses[Math.floor(Math.random() * cannedResponses.length)];
          return message.reply(greeting).catch(() => {});
        }
      }
    }
  }
};
