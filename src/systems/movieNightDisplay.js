const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const COLORS = {
  GOLD: 0xF59E0B,      // Hobbit Gold / Gandalf Yellow
  PURPLE: 0x8B5CF6,    // Palantír Purple
  EMERALD: 0x10B981,   // Minecraft Emerald / Showtime
  DARK: 0x1F2937,      // Charcoal
  RED: 0xEF4444        // Mordor Red
};

/**
 * Creates a visual progress bar for votes
 * e.g. ▰▰▰▰▱▱▱▱▱▱ 40%
 */
function createProgressBar(percent, length = 10) {
  const filledCount = Math.round((percent / 100) * length);
  const emptyCount = length - filledCount;
  const filled = '▰'.repeat(Math.max(0, filledCount));
  const empty = '▱'.repeat(Math.max(0, emptyCount));
  return `${filled}${empty}`;
}

/**
 * Builds the rich Movie Information card
 */
function buildMovieCard(movie) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle(`🎬 ${movie.title} (${movie.year})`)
    .setURL(movie.tmdb_url);

  let desc = '';
  if (movie.tagline) {
    desc += `*« ${movie.tagline} »*\n\n`;
  }
  desc += movie.overview;
  embed.setDescription(desc.length > 2000 ? desc.substring(0, 1997) + '...' : desc);

  if (movie.poster_url) {
    embed.setThumbnail(movie.poster_url);
  }
  if (movie.backdrop_url) {
    embed.setImage(movie.backdrop_url);
  }

  embed.addFields(
    {
      name: '⭐ Rating',
      value: `${movie.vote_average}/10 ${movie.vote_count ? `(${movie.vote_count.toLocaleString()} votes)` : ''}`,
      inline: true
    },
    {
      name: '⏱️ Runtime',
      value: movie.runtime_formatted || 'N/A',
      inline: true
    },
    {
      name: '🎭 Genres',
      value: (movie.genres || []).join(', ') || 'N/A',
      inline: true
    },
    {
      name: '🎬 Director',
      value: movie.director || 'Unknown',
      inline: true
    },
    {
      name: '👥 Starring',
      value: (movie.cast || []).slice(0, 3).join(', ') || 'N/A',
      inline: true
    }
  );

  embed.setFooter({
    text: 'Gandalf the BOT • Movie Nights',
    iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
  });

  const row = new ActionRowBuilder();

  if (movie.trailer && movie.trailer.url) {
    row.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('▶️ Watch Trailer')
        .setURL(movie.trailer.url)
    );
  }

  if (movie.imdb_id) {
    row.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('IMDb')
        .setURL(movie.imdb_id)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('TMDB')
      .setURL(movie.tmdb_url)
  );

  return {
    embeds: [embed],
    components: row.components.length > 0 ? [row] : []
  };
}

/**
 * Builds the interactive Showtime / Event RSVP embed
 */
function buildEventEmbed(event, rsvps = []) {
  const going = rsvps.filter(r => r.status === 'going');
  const maybe = rsvps.filter(r => r.status === 'maybe');

  const titleYear = event.year ? `(${event.year})` : '';
  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle(`🍿 Movie Night: ${event.title} ${titleYear}`.trim());

  if (event.tmdb_id) {
    embed.setURL(`https://www.themoviedb.org/movie/${event.tmdb_id}`);
  }

  let desc = `*The fellowship gathers! Grab your refreshments and pull up a chair by the hearth.*\n\n`;

  if (event.overview) {
    desc += `📜 **Synopsis:**\n${event.overview.length > 320 ? event.overview.substring(0, 317) + '...' : event.overview}\n\n`;
  }

  desc += `📅 **Showtime:** <t:${event.start_time}:F> (<t:${event.start_time}:R>)\n` +
    `🎙️ **Voice Channel:** ${event.voice_channel_id ? `<#${event.voice_channel_id}>` : '*To be announced*'}\n` +
    `👑 **Screening Host:** <@${event.host_user_id}>\n` +
    (event.notes ? `📝 **Host Notes:** ${event.notes}\n` : '');

  embed.setDescription(desc);

  // Movie Meta Fields
  const fields = [];
  if (event.rating) {
    fields.push({ name: '⭐ Rating', value: `${event.rating}/10`, inline: true });
  }
  if (event.runtime) {
    fields.push({ name: '⏱️ Runtime', value: event.runtime, inline: true });
  }
  if (event.genres) {
    fields.push({ name: '🎭 Genres', value: event.genres, inline: true });
  }
  if (event.director) {
    fields.push({ name: '🎬 Director', value: event.director, inline: true });
  }

  // Format attendee lists (limit to 15 mentions to avoid embed overflow)
  const formatList = (list) => {
    if (list.length === 0) return '*No one yet*';
    const displayed = list.slice(0, 15).map(u => `<@${u.user_id}>`).join(' ');
    if (list.length > 15) {
      return `${displayed} *(+${list.length - 15} more)*`;
    }
    return displayed;
  };

  fields.push({
    name: `🍿 Going (${going.length})`,
    value: formatList(going),
    inline: false
  });
  fields.push({
    name: `🤔 Maybe (${maybe.length})`,
    value: formatList(maybe),
    inline: false
  });

  embed.addFields(fields);

  // Images: Backdrop as main image, poster as thumbnail (or poster as main image if no backdrop)
  if (event.backdrop_url) {
    embed.setImage(event.backdrop_url);
    if (event.poster_url) {
      embed.setThumbnail(event.poster_url);
    }
  } else if (event.poster_url) {
    embed.setImage(event.poster_url);
  }

  embed.setFooter({
    text: `Event #${event.id} • Click the buttons below to RSVP!`,
    iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
  });

  // Action rows
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`movie_rsvp_going_${event.id}`)
      .setLabel(`🍿 Going (${going.length})`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`movie_rsvp_maybe_${event.id}`)
      .setLabel(`🤔 Maybe (${maybe.length})`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`movie_rsvp_declined_${event.id}`)
      .setLabel(`❌ Can't Make It`)
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder();
  if (event.trailer_url) {
    row2.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('▶️ Watch Trailer')
        .setURL(event.trailer_url)
    );
  }

  if (event.tmdb_id) {
    row2.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('🎬 TMDB Details')
        .setURL(`https://www.themoviedb.org/movie/${event.tmdb_id}`)
    );
  }

  const components = [row1];
  if (row2.components.length > 0) {
    components.push(row2);
  }

  return {
    embeds: [embed],
    components
  };
}

/**
 * Builds the interactive Movie Voting Poll embed
 */
function buildPollEmbed(poll, votes = []) {
  const options = typeof poll.options_json === 'string' ? JSON.parse(poll.options_json) : poll.options_json;
  const isEnded = poll.status === 'ended';
  const totalVotes = votes.length;

  // Calculate votes per option
  const counts = options.map((_, idx) => votes.filter(v => v.option_index === idx).length);

  // Determine highest vote
  let maxCount = -1;
  let winnerIndices = [];
  counts.forEach((c, idx) => {
    if (c > maxCount) {
      maxCount = c;
      winnerIndices = [idx];
    } else if (c === maxCount && maxCount > 0) {
      winnerIndices.push(idx);
    }
  });

  const embed = new EmbedBuilder()
    .setColor(isEnded ? COLORS.GOLD : COLORS.PURPLE)
    .setTitle(
      isEnded
        ? `🏆 Movie Poll Ended: Winner Decided!`
        : `📊 Movie Night Vote: What shall the fellowship watch?`
    );

  let desc = `👑 **Poll Host:** <@${poll.creator_user_id}>\n` +
    `🗳️ **Total Votes Cast:** ${totalVotes}\n`;

  if (isEnded) {
    if (poll.winner_title) {
      desc += `\n🌟 **Winning Feature:** **${poll.winner_title}**\n*The council has spoken! May your screens shine bright.*\n\n`;
    } else if (maxCount > 0 && winnerIndices.length === 1) {
      const winner = options[winnerIndices[0]];
      desc += `\n🌟 **Winning Feature:** **${winner.title}**\n*The council has spoken! May your screens shine bright.*\n\n`;
    } else if (maxCount > 0 && winnerIndices.length > 1) {
      const tied = winnerIndices.map(i => options[i].title).join(' & ');
      desc += `\n⚔️ **A Tie!** ${tied}\n*Let the host decide or cast the Palantír roulette!*\n\n`;
    } else {
      desc += `\n*No votes were cast before the poll ended.*\n\n`;
    }
  } else {
    desc += `⏳ **Voting Closes:** <t:${poll.ends_at}:R> (<t:${poll.ends_at}:F>)\n\n`;
  }

  // Add options with percentage bars
  options.forEach((opt, idx) => {
    const count = counts[idx];
    const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const bar = createProgressBar(percent, 10);
    const isWinner = isEnded && winnerIndices.includes(idx) && maxCount > 0;
    const crown = isWinner ? ' 👑' : '';

    desc += `**${idx + 1}. ${opt.title}** ${opt.year ? `(${opt.year})` : ''}${crown}\n` +
      `${bar} **${percent}%** (${count} ${count === 1 ? 'vote' : 'votes'})\n\n`;
  });

  embed.setDescription(desc);

  if (!isEnded && options[0]?.backdrop_url) {
    embed.setImage(options[0].backdrop_url);
  }

  embed.setFooter({
    text: `Poll #${poll.id} • Single-choice vote`,
    iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
  });

  // Action rows
  const components = [];

  if (!isEnded) {
    // Voting buttons row
    const voteRow = new ActionRowBuilder();
    options.slice(0, 5).forEach((opt, idx) => {
      voteRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`movie_poll_vote_${poll.id}_${idx}`)
          .setLabel(`${idx + 1}. ${opt.title.substring(0, 20)}`)
          .setStyle(ButtonStyle.Primary)
      );
    });
    components.push(voteRow);

    // End poll early row (for host)
    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`movie_poll_end_${poll.id}`)
        .setLabel('⏹️ End Poll Early')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(controlRow);
  } else if (poll.winner_title || (maxCount > 0 && winnerIndices.length === 1)) {
    const winnerOpt = options[winnerIndices[0]];
    const scheduleRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`movie_schedule_winner_${poll.id}`)
        .setLabel(`📅 Plan "${(winnerOpt?.title || poll.winner_title).substring(0, 25)}" Event`)
        .setStyle(ButtonStyle.Success)
    );
    components.push(scheduleRow);
  }

  return {
    embeds: [embed],
    components
  };
}

/**
 * Builds the Watchlist embed
 */
function buildWatchlistEmbed(movies, guildName, page = 1, pageSize = 10) {
  const total = movies.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageMovies = movies.slice(startIdx, startIdx + pageSize);

  const embed = new EmbedBuilder()
    .setColor(COLORS.GOLD)
    .setTitle(`📜 ${guildName}'s Movie Watchlist`)
    .setDescription(
      total === 0
        ? `*The archives are empty! Use \`/movie watchlist add <title>\` to add titles to your fellowship backlog.*`
        : `Showing **${startIdx + 1}–${Math.min(startIdx + pageSize, total)}** of **${total}** movies:\n\n` +
          pageMovies.map((m, i) => {
            const num = startIdx + i + 1;
            const watchedTag = m.watched ? ' *(Watched)*' : '';
            const ratingTag = m.rating ? ` • ⭐ ${m.rating}` : '';
            return `**${num}.** [${m.title}](https://www.themoviedb.org/movie/${m.tmdb_id}) ${m.year ? `(${m.year})` : ''}${ratingTag}${watchedTag} — *suggested by <@${m.added_by}>*`;
          }).join('\n')
    )
    .setFooter({
      text: `Page ${currentPage}/${totalPages} • ${total} total in backlog`,
      iconURL: 'https://images.fineartamerica.com/images/artworkimages/mediumlarge/3/gandalf-the-grey-art-david-stribbling.jpg'
    });

  return { embeds: [embed] };
}

module.exports = {
  buildMovieCard,
  buildEventEmbed,
  buildPollEmbed,
  buildWatchlistEmbed,
  COLORS
};
