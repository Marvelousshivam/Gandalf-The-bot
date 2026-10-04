const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  EmbedBuilder
} = require('discord.js');
const tmdb = require('../../utils/tmdb');
const { generateGandalfMovieReview } = require('../../utils/movieReview');
const {
  buildMovieCard,
  buildEventEmbed,
  buildPollEmbed,
  buildWatchlistEmbed,
  COLORS
} = require('../../systems/movieNightDisplay');
const {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  markMovieWatched,
  clearWatchlist,
  getRandomWatchlistMovie,
  createMovieEvent,
  updateMovieEventMessage,
  createMoviePoll,
  getGuildConfig
} = require('../../database');

function parseTimeStr(str) {
  if (!str) return null;
  const raw = str.toLowerCase().trim();
  const now = new Date();

  // Relative offset: "in 30 mins", "in 2 hours", "in 1 day"
  const relMatch = raw.match(/^in\s+(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours|d|days?)$/);
  if (relMatch) {
    const val = parseInt(relMatch[1]);
    const unit = relMatch[2][0];
    if (unit === 'm') return new Date(now.getTime() + val * 60 * 1000);
    if (unit === 'h') return new Date(now.getTime() + val * 3600 * 1000);
    if (unit === 'd') return new Date(now.getTime() + val * 86400 * 1000);
  }

  // Day + time: "today 8pm", "tomorrow at 9:30 pm", "20:00"
  const dayTimeMatch = raw.match(/^(today|tomorrow)?\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (dayTimeMatch) {
    let day = dayTimeMatch[1] || 'today';
    let hours = parseInt(dayTimeMatch[2]);
    let mins = dayTimeMatch[3] ? parseInt(dayTimeMatch[3]) : 0;
    let mer = dayTimeMatch[4];
    if (mer === 'pm' && hours < 12) hours += 12;
    if (mer === 'am' && hours === 12) hours = 0;

    const d = new Date(now);
    if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    d.setHours(hours, mins, 0, 0);
    if (d < now && day === 'today') d.setDate(d.getDate() + 1);
    return d;
  }

  // Standard date parsing (e.g. "2026-10-15 20:00")
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

async function resolveMovie(query) {
  if (!query || typeof query !== 'string') return null;
  const trimmed = query.trim();

  // 1. If numeric TMDB ID
  if (!isNaN(trimmed)) {
    const direct = await tmdb.getMovieDetails(Number(trimmed));
    if (direct) return direct;
  }

  // 2. Clean query removing autocomplete artifacts
  const cleaned = trimmed
    .replace(/\s*-\s*⭐\s*[\d.]+/g, '')
    .replace(/\s*•\s*⭐\s*[\d.]+/g, '')
    .replace(/\s*\((\d{4})\)/g, '')
    .trim();

  let results = await tmdb.searchMovies(cleaned);
  if (!results || results.length === 0) {
    results = await tmdb.searchMovies(trimmed);
  }

  if (results && results.length > 0) {
    return await tmdb.getMovieDetails(results[0].id);
  }
  return null;
}

function canManageMovieNights(interaction) {
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const cfg = getGuildConfig(interaction.guildId);
  if (cfg.movie_role_id && interaction.member.roles.cache.has(cfg.movie_role_id)) return true;
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('movie')
    .setDescription('🍿 Movie Nights Suite: search, plan screenings, vote, manage watchlist, and wizard reviews')
    
    // /movie search
    .addSubcommand(sub =>
      sub.setName('search')
        .setDescription('🔍 Search TMDB for movie information, posters, ratings, and trailers')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Title of the movie to inspect')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )

    // /movie plan
    .addSubcommand(sub =>
      sub.setName('plan')
        .setDescription('📅 Schedule an official Movie Night with Discord events, RSVPs, and reminders')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Title of the movie to screen')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('time')
            .setDescription('Screening time (e.g. "today 8pm", "tomorrow 9:30pm", "in 2 hours", "2026-10-10 20:00")')
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for RSVP card (defaults to configured movie channel or current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('voice_channel')
            .setDescription('Voice channel where members will gather to watch')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('notes')
            .setDescription('Extra notes (e.g. "Bring popcorn! Extended Director\'s Cut")')
            .setRequired(false)
        )
    )

    // /movie vote
    .addSubcommand(sub =>
      sub.setName('vote')
        .setDescription('📊 Launch an interactive voting poll with live percentage progress bars')
        .addStringOption(opt =>
          opt.setName('title_1')
            .setDescription('First candidate movie')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('title_2')
            .setDescription('Second candidate movie')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('title_3')
            .setDescription('Third candidate movie (optional)')
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('title_4')
            .setDescription('Fourth candidate movie (optional)')
            .setRequired(false)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('duration')
            .setDescription('Duration before poll closes (default: 1h)')
            .setRequired(false)
            .addChoices(
              { name: '15 Minutes', value: '15m' },
              { name: '30 Minutes', value: '30m' },
              { name: '1 Hour', value: '1h' },
              { name: '3 Hours', value: '3h' },
              { name: '6 Hours', value: '6h' },
              { name: '12 Hours', value: '12h' },
              { name: '24 Hours', value: '24h' }
            )
        )
    )

    // /movie watchlist
    .addSubcommandGroup(group =>
      group.setName('watchlist')
        .setDescription('📜 Manage the server shared movie backlog')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('➕ Add a movie to the server watchlist')
            .addStringOption(opt =>
              opt.setName('title')
                .setDescription('Movie title to add')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('📋 View the server watchlist backlog')
            .addIntegerOption(opt =>
              opt.setName('page')
                .setDescription('Page number')
                .setRequired(false)
            )
        )
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('➖ Remove a movie from the watchlist')
            .addStringOption(opt =>
              opt.setName('title')
                .setDescription('Movie title to remove')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('watched')
            .setDescription('✅ Mark a movie as watched')
            .addStringOption(opt =>
              opt.setName('title')
                .setDescription('Movie title to mark as watched')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub.setName('clear')
            .setDescription('🗑️ Clear the entire watchlist (Admin only)')
        )
    )

    // /movie roulette
    .addSubcommand(sub =>
      sub.setName('roulette')
        .setDescription('🔮 Palantír\'s Choice: Let Gandalf spin a random film to watch')
        .addStringOption(opt =>
          opt.setName('source')
            .setDescription('Where to draw inspiration from (default: Watchlist Backlog)')
            .setRequired(false)
            .addChoices(
              { name: '📜 Server Watchlist Backlog', value: 'watchlist' },
              { name: '🔥 Trending This Week', value: 'trending' },
              { name: '⚔️ Action & Adventure', value: 'action' },
              { name: '🚀 Science Fiction', value: 'scifi' },
              { name: '🧙‍♂️ Fantasy', value: 'fantasy' },
              { name: '😂 Comedy', value: 'comedy' },
              { name: '👻 Horror', value: 'horror' },
              { name: '🕵️ Mystery & Thriller', value: 'thriller' },
              { name: '🍿 Animation & Family', value: 'animation' }
            )
        )
    )

    // /movie review
    .addSubcommand(sub =>
      sub.setName('review')
        .setDescription('🧙‍♂️ Summon Gandalf for a witty, lore-infused wizard movie review')
        .addStringOption(opt =>
          opt.setName('title')
            .setDescription('Movie title to review')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  /**
   * Real-time TMDB autocomplete handler
   */
  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused(true);
      const query = focused.value?.trim();

      if (!query) {
        const trending = await tmdb.getTrendingMovies('week');
        const choices = (trending || []).slice(0, 10).map(m => ({
          name: `🔥 ${m.title} (${m.year}) - ⭐ ${m.vote_average}`.substring(0, 100),
          value: m.title.substring(0, 100)
        }));
        return await interaction.respond(choices).catch(() => {});
      }

      const searchResults = await tmdb.searchMovies(query);
      const choices = (searchResults || []).slice(0, 25).map(m => ({
        name: `${m.title} (${m.year}) - ⭐ ${m.vote_average}`.substring(0, 100),
        value: m.title.substring(0, 100)
      }));

      return await interaction.respond(choices).catch(() => {});
    } catch (err) {
      console.error('Autocomplete error in movie.js:', err);
      return await interaction.respond([]).catch(() => {});
    }
  },

  /**
   * Main command execution
   */
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // ==========================================
    // 1. /movie search
    // ==========================================
    if (subcommand === 'search') {
      const titleQuery = interaction.options.getString('title');
      await interaction.deferReply();

      const movie = await resolveMovie(titleQuery);
      if (!movie) {
        return interaction.editReply({
          content: `❌ No movies found matching "**${titleQuery}**" in the grand archives.`
        });
      }

      const display = buildMovieCard(movie);
      return interaction.editReply(display);
    }

    // ==========================================
    // 2. /movie plan
    // ==========================================
    if (subcommand === 'plan') {
      if (!canManageMovieNights(interaction)) {
        return interaction.reply({
          content: '⛔ You must be a server **Administrator** or possess the configured **Movie Host** role to plan official movie nights.',
          ephemeral: true
        });
      }

      const titleQuery = interaction.options.getString('title');
      const timeStr = interaction.options.getString('time');
      const voiceChannel = interaction.options.getChannel('voice_channel');
      const notes = interaction.options.getString('notes') || '';

      const targetDate = parseTimeStr(timeStr);
      if (!targetDate || targetDate.getTime() <= Date.now()) {
        return interaction.reply({
          content: `⚠️ Could not parse a valid future date/time from: \`${timeStr}\`.\n` +
            `Try formats like: \`today 8pm\`, \`tomorrow 9:30pm\`, \`in 2 hours\`, or \`2026-10-15 20:00\`.`,
          ephemeral: true
        });
      }

      await interaction.deferReply();

      // Find movie on TMDB with robust resolver
      const movie = await resolveMovie(titleQuery);

      const movieTitle = movie ? movie.title : titleQuery.replace(/\s*-\s*⭐\s*[\d.]+/g, '').replace(/\s*\(\d{4}\)/g, '').trim();
      const tmdbId = movie ? movie.id : null;
      const posterUrl = movie ? movie.poster_url : null;
      const backdropUrl = movie ? movie.backdrop_url : null;
      const startUnix = Math.floor(targetDate.getTime() / 1000);

      const movieMeta = {
        year: movie?.year || '',
        runtime: movie?.runtime_formatted || '',
        rating: movie?.vote_average || 0,
        genres: (movie?.genres || []).join(', ') || '',
        director: movie?.director || '',
        trailer_url: movie?.trailer?.url || '',
        overview: movie?.overview || ''
      };

      // Determine announcement channel
      const cfg = getGuildConfig(guildId);
      const chosenChannel = interaction.options.getChannel('channel') ||
        (cfg.movie_channel_id ? await interaction.guild.channels.fetch(cfg.movie_channel_id).catch(() => null) : null) ||
        interaction.channel;

      // 1. Try creating native Discord Guild Scheduled Event
      let discordEventId = null;
      try {
        let imageBuffer = null;
        if (backdropUrl || posterUrl) {
          try {
            const imgRes = await fetch(backdropUrl || posterUrl);
            if (imgRes.ok) {
              imageBuffer = Buffer.from(await imgRes.arrayBuffer());
            }
          } catch (e) {}
        }

        const endTime = new Date(targetDate.getTime() + (movie?.runtime ? movie.runtime * 60 * 1000 : 2.5 * 3600 * 1000));

        const scheduledEvent = await interaction.guild.scheduledEvents.create({
          name: `🍿 Movie Night: ${movieTitle.substring(0, 80)}`,
          scheduledStartTime: targetDate,
          scheduledEndTime: endTime,
          privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
          entityType: voiceChannel ? GuildScheduledEventEntityType.Voice : GuildScheduledEventEntityType.External,
          channel: voiceChannel ? voiceChannel.id : undefined,
          entityMetadata: voiceChannel ? undefined : { location: 'Screening Room / Voice Channel' },
          description: (movie?.overview ? movie.overview.substring(0, 950) : `Screening of ${movieTitle}`) + (notes ? `\n\nNotes: ${notes}` : ''),
          image: imageBuffer || undefined
        });
        discordEventId = scheduledEvent?.id || null;
      } catch (err) {
        console.warn('Could not create native Discord Guild Scheduled Event (likely missing ManageEvents permission):', err.message);
      }

      // 2. Save event in SQLite database
      const eventId = createMovieEvent(
        guildId,
        chosenChannel.id,
        interaction.user.id,
        movieTitle,
        tmdbId,
        startUnix,
        voiceChannel ? voiceChannel.id : null,
        notes,
        posterUrl,
        backdropUrl,
        movieMeta
      );

      // 3. Post RSVP card in chosen channel
      const fakeEvent = {
        id: eventId,
        guild_id: guildId,
        channel_id: chosenChannel.id,
        title: movieTitle,
        start_time: startUnix,
        voice_channel_id: voiceChannel ? voiceChannel.id : null,
        host_user_id: interaction.user.id,
        notes,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        ...movieMeta
      };

      const eventDisplay = buildEventEmbed(fakeEvent, []);
      const roleMention = cfg.movie_role_id ? `<@&${cfg.movie_role_id}> ` : '';
      const eventMsg = await chosenChannel.send({
        content: roleMention ? `📢 ${roleMention}**A new Movie Night has been proclaimed!**` : undefined,
        ...eventDisplay
      });

      updateMovieEventMessage(eventId, eventMsg.id, discordEventId);

      const confirmMsg = discordEventId
        ? `✅ **Movie Night planned successfully!**\n• In-channel RSVP card posted in ${chosenChannel}.\n• Native Discord Guild Scheduled Event created in server events calendar!`
        : `✅ **Movie Night planned successfully!**\n• In-channel RSVP card posted in ${chosenChannel}.\n*(Note: To create Discord calendar events, grant the bot "Manage Events" permission).*`;

      return interaction.editReply({ content: confirmMsg });
    }

    // ==========================================
    // 3. /movie vote
    // ==========================================
    if (subcommand === 'vote') {
      if (!canManageMovieNights(interaction)) {
        return interaction.reply({
          content: '⛔ You must be a server **Administrator** or have the **Movie Host** role to launch voting polls.',
          ephemeral: true
        });
      }

      const t1 = interaction.options.getString('title_1');
      const t2 = interaction.options.getString('title_2');
      const t3 = interaction.options.getString('title_3');
      const t4 = interaction.options.getString('title_4');
      const durationChoice = interaction.options.getString('duration') || '1h';

      const durationMap = {
        '15m': 15 * 60,
        '30m': 30 * 60,
        '1h': 60 * 60,
        '3h': 3 * 3600,
        '6h': 6 * 3600,
        '12h': 12 * 3600,
        '24h': 24 * 3600
      };
      const durationSeconds = durationMap[durationChoice] || 3600;
      const endsAt = Math.floor(Date.now() / 1000) + durationSeconds;

      await interaction.deferReply();

      const titles = [t1, t2, t3, t4].filter(Boolean);
      const options = [];

      for (const t of titles) {
        const m = await resolveMovie(t);
        if (m) {
          options.push({
            title: m.title,
            year: m.year,
            tmdbId: m.id,
            backdrop_url: m.backdrop_url,
            poster_url: m.poster_url
          });
        } else {
          options.push({
            title: t,
            year: '',
            tmdbId: null,
            backdrop_url: null,
            poster_url: null
          });
        }
      }

      const pollRecord = {
        id: 'temp',
        guild_id: guildId,
        channel_id: interaction.channelId,
        creator_user_id: interaction.user.id,
        ends_at: endsAt,
        options_json: options,
        status: 'active'
      };

      const display = buildPollEmbed(pollRecord, []);
      const msg = await interaction.editReply(display);

      createMoviePoll(guildId, interaction.channelId, msg.id, interaction.user.id, endsAt, options);
      return;
    }

    // ==========================================
    // 4. /movie watchlist
    // ==========================================
    if (group === 'watchlist') {
      if (subcommand === 'add') {
        const titleQuery = interaction.options.getString('title');
        await interaction.deferReply();

        const results = await tmdb.searchMovies(titleQuery);
        let movieData;
        if (results && results.length > 0) {
          movieData = results[0];
        } else {
          movieData = {
            id: Math.floor(Math.random() * 900000) + 100000,
            title: titleQuery,
            release_date: null,
            poster_path: null,
            vote_average: 0
          };
        }

        addToWatchlist(guildId, movieData, interaction.user.id);
        return interaction.editReply({
          content: `✅ Added **${movieData.title}** ${movieData.year ? `(${movieData.year})` : ''} to the fellowship watchlist!`
        });
      }

      if (subcommand === 'list') {
        const page = interaction.options.getInteger('page') || 1;
        const movies = getWatchlist(guildId, true);
        const display = buildWatchlistEmbed(movies, interaction.guild.name, page);
        return interaction.reply(display);
      }

      if (subcommand === 'remove') {
        const titleQuery = interaction.options.getString('title');
        removeFromWatchlist(guildId, titleQuery);
        return interaction.reply({
          content: `🗑️ Removed "**${titleQuery}**" from the watchlist.`
        });
      }

      if (subcommand === 'watched') {
        const titleQuery = interaction.options.getString('title');
        markMovieWatched(guildId, titleQuery);
        return interaction.reply({
          content: `✅ Marked "**${titleQuery}**" as watched! Archived in viewing history.`
        });
      }

      if (subcommand === 'clear') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({
            content: '⛔ Only Administrators can clear the entire server watchlist.',
            ephemeral: true
          });
        }
        clearWatchlist(guildId);
        return interaction.reply({
          content: '🧹 The server watchlist has been wiped clean.'
        });
      }
    }

    // ==========================================
    // 5. /movie roulette ("Palantír's Choice")
    // ==========================================
    if (subcommand === 'roulette') {
      const source = interaction.options.getString('source') || 'watchlist';
      await interaction.deferReply();

      let chosenMovie = null;

      if (source === 'watchlist') {
        const randomFromList = getRandomWatchlistMovie(guildId);
        if (randomFromList) {
          chosenMovie = await tmdb.getMovieDetails(randomFromList.tmdb_id);
          if (!chosenMovie) {
            chosenMovie = {
              title: randomFromList.title,
              year: randomFromList.year,
              vote_average: randomFromList.rating,
              overview: 'Chosen from your community backlog!',
              tmdb_url: `https://www.themoviedb.org/movie/${randomFromList.tmdb_id}`,
              poster_url: randomFromList.poster_path ? tmdb.getPosterUrl(randomFromList.poster_path) : null
            };
          }
        }
      }

      // If watchlist was empty or user requested trending/genre
      if (!chosenMovie) {
        if (source === 'trending' || source === 'watchlist') {
          const trending = await tmdb.getTrendingMovies('week');
          if (trending && trending.length > 0) {
            const randomPick = trending[Math.floor(Math.random() * trending.length)];
            chosenMovie = await tmdb.getMovieDetails(randomPick.id);
          }
        } else {
          // Genre discovery
          const genreId = tmdb.GENRES[source];
          const discovered = await tmdb.discoverMovies({ genreId, minRating: 6.8 });
          if (discovered && discovered.length > 0) {
            const randomPick = discovered[Math.floor(Math.random() * discovered.length)];
            chosenMovie = await tmdb.getMovieDetails(randomPick.id);
          }
        }
      }

      if (!chosenMovie) {
        return interaction.editReply({
          content: '🔮 The seeing-stone is shrouded in thick mist. No visions could be summoned. Try another source or add films to your watchlist!'
        });
      }

      const rouletteEmbed = new EmbedBuilder()
        .setColor(COLORS.PURPLE)
        .setTitle(`🔮 Palantír's Choice: The Seeing-Stone Has Spoken!`)
        .setDescription(
          `*Gandalf peers deep into the swirling obsidian depths of the Palantír...*\n\n` +
          `✨ **The Stone Reveals:** **[${chosenMovie.title}](${chosenMovie.tmdb_url || 'https://www.themoviedb.org'})** (${chosenMovie.year})\n\n` +
          `⭐ **Rating:** ${chosenMovie.vote_average}/10\n` +
          `⏱️ **Runtime:** ${chosenMovie.runtime_formatted || 'N/A'}\n` +
          `🎭 **Genres:** ${(chosenMovie.genres || []).join(', ') || 'Various'}\n\n` +
          `📜 **Synopsis:**\n${chosenMovie.overview ? chosenMovie.overview.substring(0, 400) + '...' : 'No synopsis available.'}\n\n` +
          `*"Do not question the Palantír, adventurer. The choice is made. Prepare the popcorn!"*`
        )
        .setFooter({
          text: 'Gandalf the BOT • Palantír Divination',
          iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
        });

      if (chosenMovie.backdrop_url) {
        rouletteEmbed.setImage(chosenMovie.backdrop_url);
      } else if (chosenMovie.poster_url) {
        rouletteEmbed.setThumbnail(chosenMovie.poster_url);
      }

      return interaction.editReply({ embeds: [rouletteEmbed] });
    }

    // ==========================================
    // 6. /movie review
    // ==========================================
    if (subcommand === 'review') {
      const titleQuery = interaction.options.getString('title');
      await interaction.deferReply();

      const movie = await resolveMovie(titleQuery);
      if (!movie) {
        return interaction.editReply({
          content: `❌ Could not find a movie named "**${titleQuery}**" to review.`
        });
      }

      const reviewData = await generateGandalfMovieReview(movie, interaction.member);

      const reviewEmbed = new EmbedBuilder()
        .setColor(COLORS.GOLD)
        .setTitle(`🧙‍♂️ Gandalf's Wizard Review: ${movie.title} (${movie.year})`)
        .setURL(movie.tmdb_url)
        .setDescription(reviewData.review)
        .setFooter({
          text: `Verdict provided via ${reviewData.provider} • Gandalf the BOT`,
          iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
        });

      if (movie.poster_url) {
        reviewEmbed.setThumbnail(movie.poster_url);
      }

      return interaction.editReply({ embeds: [reviewEmbed] });
    }
  }
};
