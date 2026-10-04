# 🧙‍♂️ Gandalf the BOT — Master Project Context & Specification

> *"A wizard is never late, nor is he early. He arrives precisely when he means to."*

---

## 1. Project Overview

**Gandalf the BOT** is a comprehensive, production-grade custom Discord bot built specifically for the **Minecraft WEEK** Discord server. It unifies:
1. **Minecraft Server Monitoring & Integration:** Live Aternos server query via `mcsrvstat.us` / `mcstatus.io`, auto-updating status embeds, player tracking, and coordinate calculators.
2. **AI Personality & Wisdom Engine:** Dual-engine AI brain powered by **Groq** (`openai/gpt-oss-120b`, 120B parameters, ~0.8s response) and **OpenRouter** (`qwen/qwen3.8-27b:free`), with offline Tolkien quotes fallback.
3. **Friendship & Identity Recognition:** Gandalf recognizes the bot owner/creator not as a distant monarch, but as his dearest traveling companion (like **Bilbo** or **Frodo Baggins**), and recognizes server members by their in-game Minecraft advancement rank.
4. **Authentic Graphical Minecraft Features:**
   - **Canvas Crafting Table GUI:** Generates authentic 3x3 Minecraft crafting tables with real pixel-art item sprites for all 1,000+ items (powered by `minecraft-data` and MediaWiki API).
   - **In-House Skin Renderer:** Connects to **TLauncher's live skin registry** (`auth.tlauncher.org`) and **MC-Heads** for Mojang players. Compiles custom 128×128 pixel-crisp avatars and 256×512 2D front character bodies uploaded directly to Discord.
   - **Title Screen Welcome Cards:** Minecraft title-screen welcome banners with dirt background, classic logo, and personalized yellow splash text.
5. **Full Moderation Suite:** Warns with auto-escalation (3 warns = 1h mute, 5 warns = ban), kick, ban, mute, unmute, purge, auto-mod filters, and centralized audit logging.
6. **Community & Progression:** Chat XP and leveling system with custom Minecraft rank roles, tickets, rules gate, and reaction roles.

---

## 2. Server & Environment Context

- **Discord Server:** Marvelous Shivam's server / Minecraft WEEK
- **Server ID (Guild ID):** `1525938015250415686`
- **Application / Client ID:** `1555871711566766151`
- **Bot Owner User ID:** `900214162729357362`
- **Channels Configured:**
  - `#general` / `#chat` (General discussion & bot interactions)
  - `#welocme` (Title screen welcome cards & goodbye notices)
  - `#console` / `#logs` (Audit logging, mod actions, member events)
  - `#server-status` (Live auto-updating status embed)

### Minecraft Server Details
- **Hosting Provider:** Aternos (Free Tier)
- **Edition:** Java Edition (Bedrock cross-play supported)
- **Server Mode:** 🔓 **Offline / Cracked** (TLauncher and non-premium players can join)
- **Integration Approach:** Safe Minecraft Query Protocol via `mcsrvstat.us` and `mcstatus.io` (no Aternos web scraping to avoid ToS account bans).
- **Skin Handling:** Direct dual-source skin pipeline:
  1. Checks official Mojang API for premium accounts (renders via MC-Heads).
  2. Queries TLauncher skin database (`auth.tlauncher.org`) for cracked/TLauncher skins and renders custom 2D bodies & avatars locally via `@napi-rs/canvas`.
  3. Falls back to classic Steve render if no skin exists.

---

## 3. Technology Stack & Architecture

| Component | Technology | Rationale & Implementation Details |
|:---|:---|:---|
| **Runtime** | Node.js v24.15.0+ | Modern runtime utilizing native built-in features |
| **Discord Library** | `discord.js` v14.27+ | Slash commands, components, modals, gateway intents |
| **Database** | `node:sqlite` (Node native) | Native synchronous SQLite without native C++ compilation (`node-gyp`) |
| **Graphics Engine** | `@napi-rs/canvas` | Prebuilt Rust-based canvas for Windows/Linux (avoids Cairo/MSVC issues) |
| **Primary AI Engine** | Groq API (`openai/gpt-oss-120b`) | Ultra-fast 120B parameter model (~0.8s inference), 100% free tier |
| **Fallback AI Engine** | OpenRouter API (`qwen/qwen3.8-27b:free`) | Seamless fallback to free open-weights models if Groq is unavailable |
| **Offline AI Safety Net** | Local JSON (`gandalf-quotes.json`) | Instant Tolkien/Gandalf quotes if all internet APIs fail |
| **Recipe Database** | `minecraft-data` (v1.20.4) | 1,000+ recipes parsed dynamically with MediaWiki sprite fetching |
| **Skin Engine** | `@napi-rs/canvas` + TLauncher API | In-house 2D skin assembler uploading direct PNG attachments to Discord |
| **Deployment** | Docker & Docker Compose | Production-ready `Dockerfile` (Node 22 Alpine) + `docker-compose.yml` |

---

## 4. Completed Systems & Slash Commands (34 Total)

### 🧙‍♂️ Wisdom, Lore & AI (`src/commands/fun/`)
- `/ask-gandalf <question>`: Queries Groq 120B model with full speaker recognition (creator as Bilbo/Frodo, players by rank).
- `/advancement <title> [description] [frame] [icon]`: Generates an authentic Minecraft advancement toast popup graphic with 14 item sprites (Task, Goal, Challenge).
- `/backstory`: Chronicles Gandalf's voyage from the Grey Havens through an obsidian rift to Minecraft WEEK.
- `/gandalf`: Delivers instant words of ancient wizard wisdom.
- `/gandalf-gif`: Summons verified animated Tenor reaction GIFs (sent as message content for full animation).
- `/story`: Micro-chronicles of the Fellowship adventuring in Minecraft.
- `/movie`: Comprehensive Movie Nights suite:
  - `/movie search <title>`: Live TMDB autocomplete, high-res posters, ratings, runtimes, director, and YouTube trailer button.
  - `/movie plan <title> <time> [channel] [voice_channel] [notes]`: Hybrid event scheduling creating both a native Discord Guild Scheduled Event with TMDB banner and an in-channel RSVP card (`🍿 Going`, `🤔 Maybe`, `❌ Can't Make It`) with automated 1h and 10m reminder alerts.
  - `/movie vote <title_1> <title_2> [title_3] [title_4] [duration]`: Interactive voting polls with live percentage progress bars and auto-close timer with one-click scheduling.
  - `/movie watchlist [add/list/remove/watched/clear]`: Collaborative backlog and watch history archives.
  - `/movie roulette [source]`: Palantír's Choice random movie divination.
  - `/movie review <title>`: Gandalf's dual AI wizard review, rating, and Middle-earth verdict.
- **Conversational Listener:** Replying directly to Gandalf or mentioning him with a question triggers the AI brain seamlessly.
- **DiscordSRV In-Game Chat Bridge:** Players typing `!gandalf <question>` inside Minecraft receive concise wizard answers forwarded straight back into in-game chat. Gandalf also delivers custom Middle-earth eulogies when players meet their demise in-game!

### ⛏️ Minecraft Knowledge & Tools (`src/commands/minecraft/`)
- `/status`: Live Aternos server query via direct TCP Server List Ping (SLP) protocol (bypasses cloud scraper blocks) with fallback to `mcsrvstat.us` / `mcstatus.io`.
- `/skin <username>`: Extracts and renders custom TLauncher and Mojang skins as Discord attachments.
- `/recipe <item>`: Displays authentic 3x3 crafting grid with pixel sprites for 1,000+ items.
- `/wiki <query>`: Live searches the official Minecraft Wiki (`minecraft.wiki`).
- `/enchant <name>`: Enchantment mechanics, max levels, gear compatibility.
- `/potion <name>`: Potion brewing recipes and ingredients.
- `/mob <name>`: Mob statistics, behavior, and drops.
- `/coords`: Overworld ↔ Nether 8:1 coordinate math.

### 🛡️ Moderation Suite (`src/commands/moderation/`)
- `/warn <user> <reason>`: Issues a formal warning (auto-mutes at 3, auto-bans at 5).
- `/warnings <user>`: Inspects user warning history and IDs.
- `/clearwarn <user> [id]`: Clears specific or all warnings.
- `/mute <user> <duration> [reason]`: Discord timeout with wizard flavor.
- `/unmute <user>`: Removes timeout.
- `/kick <user> [reason]`: Banishes player from the server.
- `/ban <user> [reason]`: Casts player into the void.
- `/purge <count>`: Bulk-deletes messages (1–100).
- **Auto-Mod:** Filters spam, duplicate messages, invite links, and blacklisted words.
- **Audit Logger:** Real-time embeds for deleted/edited messages and mod actions.

### 🏆 Leveling & Community (`src/commands/leveling/` & `tickets/`)
- `/rank [user]`: Generates an 840×250 authentic Bedrock-styled Minecraft inventory Canvas card with player skin head, segmented XP bar, glowing level number, and leaderboard position `#1`.
  - Lvl 0: 🪨 Stone Miner
  - Lvl 5: 🪵 Wood Crafter
  - Lvl 10: ⛏️ Iron Miner
  - Lvl 15: 💎 Diamond Miner
  - Lvl 20: 🌟 Netherite Warrior
  - Lvl 30: 🐉 Ender Dragon Slayer
  - Lvl 50: 🧙‍♂️ Gandalf's Apprentice
- `/leaderboard`: Displays top 10 chatters by XP.
- `/ticket <reason>` & `/close-ticket`: Private staff support channel workflow.

### ⚙️ Administration & Utility (`src/commands/admin/` & `utility/`)
- `/config`: Configuration manager for channels (including `livechat`), roles, and system toggles.
- `/setup-rules`: Interactive rules verification gate with button role grant.
- `/setup-roles`: Edition (Java/Bedrock) and notification role picker.
- `/setup-status`: Spawns auto-updating 5-minute status embed.
- `/ping`: Wizard heartbeat, WebSocket latency, and uptime.
- `/serverinfo`: Server metadata, creation date, member counts.
- `/userinfo [user]`: Member roles, join dates, and account details.
- `/help`: Categorized spellbook listing all 34 commands.

---

## 5. File Structure

```
d:\Gandalf The BOT\
├── .env                          # Secret credentials (Token, IDs, AI Keys)
├── .dockerignore                 # Exclusions for Docker image builds
├── Dockerfile                    # Containerization for 24/7 cloud hosts
├── docker-compose.yml            # Multi-container orchestration
├── package.json                  # Node dependencies & metadata
├── config.js                     # Global configs, colors, XP formulas
├── context.md                    # Master context and specification
├── index.js                      # Application entry point
├── deploy-commands.js            # Slash command registrar
│
├── data/
│   └── gandalf.db                # SQLite database (auto-generated)
│
└── src/
    ├── database.js               # Native SQLite tables, queries & transactions
    │
    ├── events/                   # Discord gateway event handlers
    │   ├── clientReady.js        # Bot startup & auto-status loop
    │   ├── interactionCreate.js  # Slash command, button & modal dispatcher
    │   ├── guildMemberAdd.js     # Title screen welcome card sender
    │   ├── guildMemberRemove.js  # Goodbye message dispatcher
    │   ├── messageCreate.js      # XP engine, auto-mod, reply/mention AI router
    │   ├── messageUpdate.js      # Message edit audit logger
    │   └── messageDelete.js      # Message deletion audit logger
    │
    ├── commands/                 # 33 slash commands grouped by category
    │   ├── admin/                # config, setup-roles, setup-rules, setup-status
    │   ├── fun/                  # ask-gandalf, backstory, gandalf, gandalf-gif, story
    │   ├── leveling/             # leaderboard, rank
    │   ├── minecraft/            # coords, enchant, mob, potion, recipe, skin, status, wiki
    │   ├── moderation/           # ban, clearwarn, kick, mute, purge, unmute, warn, warnings
    │   ├── tickets/              # close-ticket, ticket
    │   └── utility/              # help, ping, serverinfo, userinfo
    │
    ├── systems/                  # Core feature engines
    │   ├── statusBanner.js       # 860x260 Canvas multiplayer HUD banner with 3D isometric block
    │   ├── serverStatusDisplay.js # Grand aesthetic embed, banner attachment & interactive buttons
    │   ├── welcomeImage.js       # Minecraft title screen canvas generator
    │   ├── rankCard.js           # Bedrock-styled canvas inventory rank card
    │   ├── advancementImage.js   # Pixel-perfect advancement toast popup generator
    │   ├── craftingImage.js      # 3x3 Minecraft Crafting Table GUI generator
    │   ├── skinRenderer.js       # 2D character body & avatar canvas generator
    │   ├── autoMod.js            # Spam, duplicate, invite link & bad word filter
    │   ├── auditLogger.js        # Mod log dispatcher
    │   └── xpSystem.js           # XP formula and rank calculation
    │
    ├── utils/                    # Shared utilities
    │   ├── ai.js                 # Dual-engine AI with friend identity recognition
    │   ├── recipeDatabase.js     # minecraft-data dynamic recipe parser & sprite fetcher
    │   ├── minecraft-api.js      # mcsrvstat.us / mcstatus.io / TLauncher / MC-Heads
    │   ├── embedBuilder.js       # Minecraft green & LOTR gold embed themes
    │   └── cooldown.js           # In-memory cooldown manager
    │
    └── data/                     # Reference JSON datasets
        ├── gandalf-quotes.json   # 20+ Tolkien quotes
        ├── gandalf-stories.json  # Middle-earth meets Minecraft chronicles
        ├── gandalf-gifs.json     # 9 verified animated Tenor reaction GIFs
        ├── bad-words.json        # Auto-mod blacklist
        ├── enchantments.json     # Minecraft enchantment reference
        ├── potions.json          # Potion brewing recipes
        └── mobs.json             # Mob stats & drops
```
