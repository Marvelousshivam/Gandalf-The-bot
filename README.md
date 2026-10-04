# 🧙‍♂️ Gandalf the BOT

> *"A wizard is never late, nor is he early. He arrives precisely when he means to."*

An all-in-one, feature-packed Discord bot built with **Discord.js v14**, **Node.js native SQLite (`node:sqlite`)**, **`@napi-rs/canvas`**, and dual AI engine integration (**Groq** & **OpenRouter**).

Originally forged for the **Minecraft WEEK** realm, Gandalf now also commands the silver screen with a full **Movie Nights & Cinema** suite powered by **The Movie Database (TMDB)**.

---

## 🌟 Key Features

### 🍿 Movie Nights & Cinema Suite
- **🔍 TMDB Search & Autocomplete (`/movie search`):** Real-time movie lookups as you type with high-res posters, backdrops, ratings, runtimes, directors, and direct YouTube trailer buttons.
- **📅 Hybrid Event Scheduling (`/movie plan`):** Creates both a native **Discord Guild Scheduled Event** (with movie backdrop banner) and an interactive in-channel RSVP card (`🍿 Going`, `🤔 Maybe`, `❌ Can't Make It`).
- **⏰ Timed Showtime Reminders:** Background cron scheduler sends automated **1-hour** and **10-minute** showtime alerts to the channel, pinging attendees and the movie role.
- **📊 Interactive Voting Polls (`/movie vote`):** Multi-movie showdowns with single-choice buttons, live updating percentage progress bars (`▰▰▰▱▱▱ 45%`), auto-close timer, and one-click winning movie scheduling.
- **📜 Shared Server Watchlist (`/movie watchlist`):** Persistent SQLite backlog with `add`, `list`, `remove`, `watched` (viewing history archive), and `clear`.
- **🔮 Palantír's Choice Roulette (`/movie roulette`):** Let Gandalf gaze into the seeing-stone to pick a random film from your watchlist, weekly trending, or specific genre when suffering from decision fatigue.
- **🧙‍♂️ Gandalf AI Movie Reviews (`/movie review`):** Gandalf delivers an in-character Tolkien critique, witty Middle-earth analogies, and an ancient Wizard Rating (*✨ 9.5/10 Staves of Light*).

---

### ⛏️ Minecraft Integration & Graphics
- **Live Server Monitoring (`/status`):** Direct TCP Server List Ping (SLP) protocol query with fallback to `mcsrvstat.us` / `mcstatus.io`. Auto-updating live embed in dedicated status channels.
- **Canvas Crafting GUI (`/recipe`):** Authentic 3x3 Minecraft crafting grid generator with MediaWiki item sprites for 1,000+ recipes.
- **Skin & Avatar Renderer (`/skin`):** In-house 2D skin assembler supporting official Mojang accounts (via MC-Heads) and TLauncher skins (`auth.tlauncher.org`).
- **Advancement Toast Popups (`/advancement`):** Generates custom Minecraft advancement toast graphics.
- **Title Screen Welcome Cards:** Minecraft title-screen welcome banners with dirt background, classic logo, and personalized yellow splash text.
- **DiscordSRV Chat Bridge:** Forwarded in-game chat bridge with Gandalf death reactions and in-game `!gandalf` question support.

---

### 🧠 AI Personality & Lore
- **Dual AI Engine:** Groq (`openai/gpt-oss-120b`) primary with seamless fallback to OpenRouter (`qwen/qwen3.8-27b:free`).
- **Friendship Recognition:** Gandalf recognizes the bot creator as his dearest traveling companion (Bilbo/Frodo Baggins) and addresses server members by their in-game advancement rank.
- **Offline Safety Net:** Instant Tolkien quotes fallback if external APIs are unreachable.

---

### 🛡️ Moderation & Community
- **Full Moderation Suite:** `/warn` (auto-escalation: 3 warns = 1h mute, 5 warns = ban), `/warnings`, `/clearwarn`, `/mute`, `/unmute`, `/kick`, `/ban`, `/purge`.
- **Auto-Mod:** Centralized filter for spam, duplicate messages, invite links, and blacklisted words.
- **XP & Leveling System (`/rank`, `/leaderboard`):** Chat activity rewards adventurers with XP, advancing through Minecraft ranks from *Stone Miner* to *Gandalf's Apprentice*.
- **Support Tickets (`/ticket`, `/close-ticket`):** Dedicated private staff channels with interactive closure.

---

## 🛠️ Technology Stack

- **Runtime:** Node.js v24+
- **Discord API:** `discord.js` v14
- **Database:** `node:sqlite` (Node.js built-in SQLite with WAL mode)
- **Graphics Engine:** `@napi-rs/canvas` (Rust-based high-performance canvas)
- **APIs:** TMDB API v3, Groq API, OpenRouter API
- **Deployment:** Docker, Docker Compose, or PM2

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js v20 or higher
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- A TMDB API Key ([The Movie Database](https://www.themoviedb.org/documentation/api))
- (Optional) Groq API Key and OpenRouter API Key for AI features

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Marvelousshivam/Gandalf-The-bot.git
cd Gandalf-The-bot

# Install dependencies
npm install
```

### 3. Configuration
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# Minecraft Server (Optional)
MC_SERVER_ADDRESS=YourServer.aternos.me
MC_SERVER_PORT=25565

# AI Configuration (Optional)
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
OPENROUTER_MODEL=qwen/qwen3.8-27b:free

# Bot Settings
BOT_OWNER_ID=your_discord_user_id

# Movie Nights Configuration
TMDB_API_KEY=your_tmdb_api_key_here
```

### 4. Deploy Slash Commands
Register all 35 application slash commands to your Discord guild:
```bash
npm run deploy
```

### 5. Start the Bot
```bash
# Production start
npm start

# Development mode (with auto-restart)
npm run dev

# Or with PM2
pm2 start index.js --name "gandalf-bot"
```

---

## 📜 License

This project is licensed under the MIT License.