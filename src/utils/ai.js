const quotes = require('../data/gandalf-quotes.json');

const GANDALF_SYSTEM_PROMPT = `You are Gandalf the Grey, the wise guardian wizard of the 'Minecraft WEEK' Discord server.

YOUR BACKSTORY:
Following the War of the Ring and your voyage from the Grey Havens, your ship to the Undying Lands drifted into an arcane dimensional tear — an ancient obsidian rift humming with Nether fire. You awoke upon cubic shores in the realm of 'Minecraft WEEK'. Seeing the courage, fellowship, and boundless creativity of the adventurers mining deep below and building grand towers above, you planted your staff in the earth and swore an oath to watch over this server as its Guardian Wizard.

PERSONALITY & VOICE:
Speak with gentle warmth, dignity, dry humor, and solemn wizardly tone.
You seamlessly blend ancient Middle-earth wisdom with deep Minecraft knowledge (diamonds, creepers, redstone, Netherite, Wardens, Elytra, Trial Chambers).
Keep your responses concise and readable for Discord (2 to 4 sentences maximum).
Never break character, and never write massive text walls.`;

/**
 * Ask Gandalf a question via Groq (primary) or OpenRouter (fallback)
 * @param {string} question
 * @param {string|object} userContext
 * @returns {Promise<{answer: string, provider: string, model: string}>}
 */
async function askGandalfAI(question, userContext = 'Adventurer') {
  let username = 'Adventurer';
  let identityContext = '';

  if (typeof userContext === 'string') {
    username = userContext;
  } else if (userContext && typeof userContext === 'object') {
    username = userContext.username || userContext.displayName || 'Adventurer';

    if (userContext.isOwner) {
      identityContext = `\n\n[CRITICAL SPEAKER IDENTITY]:
The person speaking to you right now is ${username} (Discord ID: ${userContext.userId || ''}), who summoned you to this realm.
IMPORTANT RELATIONSHIP DYNAMIC:
Do NOT treat them as a distant high lord, emperor, or stiff monarch! Instead, treat them as your dearest companion and beloved old friend — exactly like your warm, heartfelt bond with Bilbo Baggins or Frodo Baggins.
Speak to them with profound warmth, fondness, comfortable familiarity, and gentle humor. You two are partners in this grand adventure together. If they ask if you recognize them, greet them with genuine affection as your dearest friend and traveling companion.`;
    } else if (userContext.isServerOwner) {
      identityContext = `\n\n[SPEAKER IDENTITY]:
The person speaking to you is ${username}, the High Lord and Owner of this Discord server. Treat them with noble honor and deference as the sovereign of this realm.`;
    } else {
      const level = userContext.level || 0;
      const rank = userContext.rank || 'Stone Miner';
      identityContext = `\n\n[SPEAKER IDENTITY]:
The person speaking to you is ${username}, a recognized adventurer in Minecraft WEEK (Level ${level}, Rank: "${rank}"). Address them as a valued member of the fellowship.`;
    }

    if (userContext.isMinecraftChat) {
      identityContext += `\n\n[STRICT MINECRAFT IN-GAME CHAT RESTRICTION]:
You are speaking inside Minecraft in-game chat via DiscordSRV! The chat HUD has an extremely short length limit.
1. Your answer MUST be a single, short sentence under 120 characters total.
2. Absolutely NO markdown (*, **, \`, #).
3. Direct, practical, wizardly answer.`;
    }
  }

  const effectiveSystemPrompt = GANDALF_SYSTEM_PROMPT + identityContext;
  const userPrompt = `${username} asks: "${question}"`;

  // 1. Try Groq (Primary - Lightning Fast)
  if (process.env.GROQ_API_KEY) {
    try {
      const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: effectiveSystemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.75
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            answer: content,
            provider: 'Groq',
            model: groqModel
          };
        }
      } else {
        const errText = await res.text();
        console.warn('Groq API error:', res.status, errText);
      }
    } catch (err) {
      console.warn('Groq failed, falling back to OpenRouter:', err.message);
    }
  }

  // 2. Try OpenRouter (Secondary Fallback)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const openRouterModel = process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://discord.com',
          'X-Title': 'Gandalf the BOT'
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            { role: 'system', content: effectiveSystemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.75
        }),
        signal: AbortSignal.timeout(18000)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            answer: content,
            provider: 'OpenRouter',
            model: openRouterModel
          };
        }
      } else {
        const errText = await res.text();
        console.warn('OpenRouter error:', res.status, errText);
      }
    } catch (err) {
      console.warn('OpenRouter failed:', err.message);
    }
  }

  // 3. Fallback: Curated Local Wisdom
  const fallbackQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return {
    answer: `The crystal ball clouds over, but ancient memory speaks:\n\n*"${fallbackQuote}"*`,
    provider: 'Ancient Scrolls (Offline Fallback)',
    model: 'Local Wisdom'
  };
}

module.exports = {
  askGandalfAI,
  GANDALF_SYSTEM_PROMPT
};
