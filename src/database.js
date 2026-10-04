const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

// Ensure data folder exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gandalf.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    welcome_channel_id TEXT,
    goodbye_channel_id TEXT,
    log_channel_id TEXT,
    status_channel_id TEXT,
    status_message_id TEXT,
    ticket_category_id TEXT,
    verified_role_id TEXT,
    mute_role_id TEXT,
    mc_server_address TEXT DEFAULT 'YourServer.aternos.me',
    mc_server_port INTEGER DEFAULT 25565,
    welcome_enabled INTEGER DEFAULT 1,
    goodbye_enabled INTEGER DEFAULT 1,
    automod_enabled INTEGER DEFAULT 1,
    xp_enabled INTEGER DEFAULT 1,
    gandalf_greetings_enabled INTEGER DEFAULT 1,
    live_chat_channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_xp (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    last_xp_at INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    button_id TEXT NOT NULL,
    role_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS level_roles (
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  );

  CREATE TABLE IF NOT EXISTS movie_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    year TEXT,
    poster_path TEXT,
    rating REAL,
    added_by TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    watched INTEGER DEFAULT 0,
    watched_at DATETIME,
    UNIQUE(guild_id, tmdb_id)
  );

  CREATE TABLE IF NOT EXISTS movie_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    discord_event_id TEXT,
    tmdb_id INTEGER,
    title TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    voice_channel_id TEXT,
    host_user_id TEXT NOT NULL,
    notes TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    reminded_1h INTEGER DEFAULT 0,
    reminded_10m INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movie_event_rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS movie_polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    creator_user_id TEXT NOT NULL,
    ends_at INTEGER NOT NULL,
    options_json TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    winner_title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movie_poll_votes (
    poll_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    PRIMARY KEY (poll_id, user_id)
  );
`);

console.log('✅ SQLite database initialized successfully at data/gandalf.db');

try {
  db.exec('ALTER TABLE guild_config ADD COLUMN live_chat_channel_id TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE guild_config ADD COLUMN movie_channel_id TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE guild_config ADD COLUMN movie_role_id TEXT;');
} catch (e) {}

try { db.exec('ALTER TABLE movie_events ADD COLUMN year TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN runtime TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN rating REAL;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN genres TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN director TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN trailer_url TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE movie_events ADD COLUMN overview TEXT;'); } catch (e) {}

// --- Helper Functions ---

// Guild Config Helpers
function getGuildConfig(guildId) {
  const row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  if (!row) {
    db.prepare('INSERT INTO guild_config (guild_id) VALUES (?)').run(guildId);
    return db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
  }
  return row;
}

function updateGuildConfig(guildId, key, value) {
  getGuildConfig(guildId); // ensure row exists
  db.prepare(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
}

// Warnings Helpers
function addWarning(guildId, userId, moderatorId, reason) {
  const info = db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
    VALUES (?, ?, ?, ?)
  `).run(guildId, userId, moderatorId, reason);

  const count = db.prepare(`
    SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);

  return { id: info.lastInsertRowid, count: count.count };
}

function getWarnings(guildId, userId) {
  return db.prepare(`
    SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY id DESC
  `).all(guildId, userId);
}

function clearWarnings(guildId, userId, warningId = null) {
  if (warningId) {
    return db.prepare(`
      DELETE FROM warnings WHERE guild_id = ? AND user_id = ? AND id = ?
    `).run(guildId, userId, warningId);
  }
  return db.prepare(`
    DELETE FROM warnings WHERE guild_id = ? AND user_id = ?
  `).run(guildId, userId);
}

// XP & Leveling Helpers
function getUserXp(guildId, userId) {
  let row = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  if (!row) {
    db.prepare('INSERT INTO user_xp (guild_id, user_id, xp, level, total_messages, last_xp_at) VALUES (?, ?, 0, 0, 0, 0)').run(guildId, userId);
    row = { guild_id: guildId, user_id: userId, xp: 0, level: 0, total_messages: 0, last_xp_at: 0 };
  }
  return row;
}

function addXp(guildId, userId, xpAmount, newLevel = null) {
  const current = getUserXp(guildId, userId);
  const now = Date.now();
  const nextXp = current.xp + xpAmount;
  const nextLevel = newLevel !== null ? newLevel : current.level;

  db.prepare(`
    UPDATE user_xp
    SET xp = ?, level = ?, total_messages = total_messages + 1, last_xp_at = ?
    WHERE guild_id = ? AND user_id = ?
  `).run(nextXp, nextLevel, now, guildId, userId);

  return { xp: nextXp, level: nextLevel, total_messages: current.total_messages + 1 };
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare(`
    SELECT user_id, xp, level, total_messages
    FROM user_xp
    WHERE guild_id = ?
    ORDER BY xp DESC
    LIMIT ?
  `).all(guildId, limit);
}

// Reaction Roles Helpers
function addReactionRole(guildId, messageId, buttonId, roleId) {
  db.prepare(`
    INSERT INTO reaction_roles (guild_id, message_id, button_id, role_id)
    VALUES (?, ?, ?, ?)
  `).run(guildId, messageId, buttonId, roleId);
}

function getReactionRole(guildId, messageId, buttonId) {
  return db.prepare(`
    SELECT role_id FROM reaction_roles
    WHERE guild_id = ? AND message_id = ? AND button_id = ?
  `).get(guildId, messageId, buttonId);
}

// Tickets Helpers
function createTicket(guildId, channelId, userId) {
  return db.prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, status)
    VALUES (?, ?, ?, 'open')
  `).run(guildId, channelId, userId);
}

function closeTicket(channelId) {
  return db.prepare(`
    UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP
    WHERE channel_id = ? AND status = 'open'
  `).run(channelId);
}

function getOpenTicket(channelId) {
  return db.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(channelId);
}

// --- Movie Nights Helpers ---

// Watchlist Helpers
function addToWatchlist(guildId, movie, addedBy) {
  return db.prepare(`
    INSERT INTO movie_watchlist (guild_id, tmdb_id, title, year, poster_path, rating, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, tmdb_id) DO UPDATE SET
      title = excluded.title,
      year = excluded.year,
      poster_path = excluded.poster_path,
      rating = excluded.rating,
      watched = 0,
      watched_at = NULL
  `).run(
    guildId,
    movie.id,
    movie.title,
    movie.release_date ? movie.release_date.split('-')[0] : '',
    movie.poster_path || '',
    movie.vote_average || 0,
    addedBy
  );
}

function removeFromWatchlist(guildId, query) {
  if (!isNaN(query)) {
    return db.prepare('DELETE FROM movie_watchlist WHERE guild_id = ? AND (tmdb_id = ? OR id = ?)').run(guildId, Number(query), Number(query));
  }
  return db.prepare('DELETE FROM movie_watchlist WHERE guild_id = ? AND LOWER(title) = LOWER(?)').run(guildId, query.trim());
}

function getWatchlist(guildId, includeWatched = false) {
  if (includeWatched) {
    return db.prepare('SELECT * FROM movie_watchlist WHERE guild_id = ? ORDER BY added_at DESC').all(guildId);
  }
  return db.prepare('SELECT * FROM movie_watchlist WHERE guild_id = ? AND watched = 0 ORDER BY added_at DESC').all(guildId);
}

function markMovieWatched(guildId, query) {
  if (!isNaN(query)) {
    return db.prepare(`
      UPDATE movie_watchlist SET watched = 1, watched_at = CURRENT_TIMESTAMP
      WHERE guild_id = ? AND (tmdb_id = ? OR id = ?)
    `).run(guildId, Number(query), Number(query));
  }
  return db.prepare(`
    UPDATE movie_watchlist SET watched = 1, watched_at = CURRENT_TIMESTAMP
    WHERE guild_id = ? AND LOWER(title) = LOWER(?)
  `).run(guildId, query.trim());
}

function clearWatchlist(guildId) {
  return db.prepare('DELETE FROM movie_watchlist WHERE guild_id = ?').run(guildId);
}

function getRandomWatchlistMovie(guildId) {
  return db.prepare('SELECT * FROM movie_watchlist WHERE guild_id = ? AND watched = 0 ORDER BY RANDOM() LIMIT 1').get(guildId);
}

// Movie Events Helpers
function createMovieEvent(
  guildId,
  channelId,
  hostUserId,
  title,
  tmdbId,
  startTime,
  voiceChannelId = null,
  notes = '',
  posterUrl = '',
  backdropUrl = '',
  movieMeta = {}
) {
  const info = db.prepare(`
    INSERT INTO movie_events (
      guild_id, channel_id, host_user_id, title, tmdb_id, start_time, voice_channel_id,
      notes, poster_url, backdrop_url, year, runtime, rating, genres, director, trailer_url, overview
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guildId,
    channelId,
    hostUserId,
    title,
    tmdbId,
    startTime,
    voiceChannelId,
    notes,
    posterUrl,
    backdropUrl,
    movieMeta.year || '',
    movieMeta.runtime || '',
    movieMeta.rating || 0,
    movieMeta.genres || '',
    movieMeta.director || '',
    movieMeta.trailer_url || '',
    movieMeta.overview || ''
  );
  return info.lastInsertRowid;
}

function updateMovieEventMessage(eventId, messageId, discordEventId = null) {
  return db.prepare(`
    UPDATE movie_events SET message_id = ?, discord_event_id = ? WHERE id = ?
  `).run(messageId, discordEventId, eventId);
}

function getMovieEvent(eventId) {
  return db.prepare('SELECT * FROM movie_events WHERE id = ?').get(eventId);
}

function getMovieEventByMessageId(messageId) {
  return db.prepare('SELECT * FROM movie_events WHERE message_id = ?').get(messageId);
}

function getActiveMovieEvents(guildId) {
  return db.prepare("SELECT * FROM movie_events WHERE guild_id = ? AND status = 'scheduled' ORDER BY start_time ASC").all(guildId);
}

function getUpcomingEventsForReminder() {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM movie_events
    WHERE status = 'scheduled' AND start_time >= ?
    ORDER BY start_time ASC
  `).all(now - 7200);
}

function markEventReminded(eventId, type) {
  if (type === '1h') {
    return db.prepare('UPDATE movie_events SET reminded_1h = 1 WHERE id = ?').run(eventId);
  } else if (type === '10m') {
    return db.prepare('UPDATE movie_events SET reminded_10m = 1 WHERE id = ?').run(eventId);
  }
}

function completeMovieEvent(eventId) {
  return db.prepare('UPDATE movie_events SET status = "completed" WHERE id = ?').run(eventId);
}

function cancelMovieEvent(eventId) {
  return db.prepare('UPDATE movie_events SET status = "cancelled" WHERE id = ?').run(eventId);
}

// RSVP Helpers
function setEventRsvp(eventId, userId, status) {
  return db.prepare(`
    INSERT INTO movie_event_rsvps (event_id, user_id, status, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(event_id, user_id) DO UPDATE SET
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(eventId, userId, status);
}

function getEventRsvps(eventId) {
  return db.prepare('SELECT user_id, status FROM movie_event_rsvps WHERE event_id = ?').all(eventId);
}

function getUserRsvp(eventId, userId) {
  return db.prepare('SELECT status FROM movie_event_rsvps WHERE event_id = ? AND user_id = ?').get(eventId, userId);
}

// Polls Helpers
function createMoviePoll(guildId, channelId, messageId, creatorUserId, endsAt, options) {
  const info = db.prepare(`
    INSERT INTO movie_polls (guild_id, channel_id, message_id, creator_user_id, ends_at, options_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, channelId, messageId, creatorUserId, endsAt, JSON.stringify(options));
  return info.lastInsertRowid;
}

function getMoviePoll(pollId) {
  return db.prepare('SELECT * FROM movie_polls WHERE id = ?').get(pollId);
}

function getMoviePollByMessageId(messageId) {
  return db.prepare('SELECT * FROM movie_polls WHERE message_id = ?').get(messageId);
}

function getActivePolls() {
  return db.prepare("SELECT * FROM movie_polls WHERE status = 'active'").all();
}

function voteMoviePoll(pollId, userId, optionIndex) {
  return db.prepare(`
    INSERT INTO movie_poll_votes (poll_id, user_id, option_index)
    VALUES (?, ?, ?)
    ON CONFLICT(poll_id, user_id) DO UPDATE SET option_index = excluded.option_index
  `).run(pollId, userId, optionIndex);
}

function getMoviePollVotes(pollId) {
  return db.prepare('SELECT user_id, option_index FROM movie_poll_votes WHERE poll_id = ?').all(pollId);
}

function endMoviePoll(pollId, winnerTitle) {
  return db.prepare(`
    UPDATE movie_polls SET status = 'ended', winner_title = ? WHERE id = ?
  `).run(winnerTitle, pollId);
}

module.exports = {
  db,
  getGuildConfig,
  updateGuildConfig,
  addWarning,
  getWarnings,
  clearWarnings,
  getUserXp,
  addXp,
  getLeaderboard,
  addReactionRole,
  getReactionRole,
  createTicket,
  closeTicket,
  getOpenTicket,
  // Movie Watchlist
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  markMovieWatched,
  clearWatchlist,
  getRandomWatchlistMovie,
  // Movie Events
  createMovieEvent,
  updateMovieEventMessage,
  getMovieEvent,
  getMovieEventByMessageId,
  getActiveMovieEvents,
  getUpcomingEventsForReminder,
  markEventReminded,
  completeMovieEvent,
  cancelMovieEvent,
  // RSVPs
  setEventRsvp,
  getEventRsvps,
  getUserRsvp,
  // Polls
  createMoviePoll,
  getMoviePoll,
  getMoviePollByMessageId,
  getActivePolls,
  voteMoviePoll,
  getMoviePollVotes,
  endMoviePoll
};
