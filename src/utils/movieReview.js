const FALLBACK_REVIEWS = [
  {
    rating: '✨ 9.5/10 Staves of Light',
    verdict: 'A Masterpiece of High Wonder',
    text: "A tale of grand courage, sacrifice, and perilous wonder! Even Manwë upon Taniquetil would nod in quiet approval at such a spectacle. It stirs the embers of the heart much like an unexpected journey from the Shire. Keep your pipes lit and your gaze steady — this is a tale for the ages!"
  },
  {
    rating: '🍺 8/10 Pints at the Prancing Pony',
    verdict: 'Hearty Fellowship and Grand Adventure',
    text: "A worthy chronicle! Not without its quiet detours and shadows, but full of heart, cunning strategy, and fellowship that would endure even the blizzards of Caradhras. Pull up a chair by the hearth and enjoy every minute."
  },
  {
    rating: '🪨 6/10 Dwarven Cobblestones',
    verdict: 'Stout Craft, But Plods Along the Marshes',
    text: "Solid dwarven stonework, though it lacks the high music of the Eldar. There are moments of genuine thrill and sharp wit, yet at times it plods like a loaded pony navigating the Midgewater Marshes. Entertaining, if not legendary."
  },
  {
    rating: '🌋 3/10 Cast it into Mount Doom',
    verdict: 'Dark Sorcery and Folly',
    text: "Fool of a Took! What dark sorcery led the weavers of this tale astray? It is loud, confused, and possesses neither ancient wisdom nor honest heart. Let it be cast into the fires from whence it came, and speak of it no more!"
  }
];

/**
 * Generate a Gandalf wizard review for a movie
 */
async function generateGandalfMovieReview(movie, user) {
  const userName = user?.displayName || user?.username || 'Adventurer';
  const genresStr = (movie.genres || []).join(', ') || 'Drama';
  const directorStr = movie.director || 'Unknown Storyteller';

  const systemPrompt = `You are Gandalf the Grey, the legendary wizard of Middle-earth.
A fellow traveler has asked for your grand, ancient, and witty review of a motion picture for Movie Night.
Speak with Tolkien-esque gravitas, dry humor, and poetic eloquence. Draw creative parallels to Middle-earth lore (e.g. the Shire, Saruman's hubris, goblin caves, elven song, dwarven gold, the One Ring, or second breakfast).
Format your response with:
1. A 2-3 paragraph critique of the story, performances, and atmosphere.
2. A unique Wizard Rating (e.g. "✨ 8.5/10 Staves of Light" or "🍺 9/10 Pints at the Green Dragon" or "🌋 3/10 Cast it into Mount Doom").
3. A Gandalf closing thought advising whether the fellowship should gather to watch it.
Keep total length around 150-220 words.`;

  const userPrompt = `Greetings, Gandalf! What is your wizardly verdict on "${movie.title}" (${movie.year}), directed by ${directorStr}, genres: ${genresStr}?
Plot overview: "${movie.overview.substring(0, 300)}"
Audience rating: ${movie.vote_average}/10`;

  // 1. Try Groq
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 350,
          temperature: 0.75
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            review: content,
            provider: 'Gandalf (Groq AI)'
          };
        }
      }
    } catch (err) {
      console.warn('Groq movie review error:', err.message);
    }
  }

  // 2. Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const model = process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://discord.com',
          'X-Title': 'Gandalf the BOT'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 350,
          temperature: 0.75
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            review: content,
            provider: 'Gandalf (OpenRouter AI)'
          };
        }
      }
    } catch (err) {
      console.warn('OpenRouter movie review error:', err.message);
    }
  }

  // 3. Fallback to rich Tolkien cinema critiques
  let chosenFallback;
  if (movie.vote_average >= 8.0) {
    chosenFallback = FALLBACK_REVIEWS[0];
  } else if (movie.vote_average >= 6.8) {
    chosenFallback = FALLBACK_REVIEWS[1];
  } else if (movie.vote_average >= 5.0) {
    chosenFallback = FALLBACK_REVIEWS[2];
  } else {
    chosenFallback = FALLBACK_REVIEWS[3];
  }

  return {
    review: `*"A wizard is never late to the theatre, ${userName}. He arrives precisely when the opening fanfare sounds."*\n\n` +
      `**Title:** ${movie.title} (${movie.year})\n` +
      `**Verdict:** *${chosenFallback.verdict}*\n\n` +
      `${chosenFallback.text}\n\n` +
      `**Wizard Rating:** ${chosenFallback.rating}`,
    provider: 'Tolkien Archives (Offline)'
  };
}

module.exports = {
  generateGandalfMovieReview
};
