const net = require('net');

/**
 * Minecraft API Wrappers (Server Status, Skin Lookup, Wiki Search)
 */

/**
 * Encode variable-length integer for Minecraft protocol
 * @param {number} value
 * @returns {Buffer}
 */
function writeVarInt(value) {
  const buffer = [];
  while (true) {
    if ((value & ~0x7F) === 0) {
      buffer.push(value);
      break;
    }
    buffer.push((value & 0x7F) | 0x80);
    value >>>= 7;
  }
  return Buffer.from(buffer);
}

/**
 * Query a Minecraft server directly via TCP Server List Ping (SLP) protocol
 * Essential for Aternos dynamic ports and servers that block web scrapers
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<{online: boolean, ip: string, port: number, version: string, players: {online: number, max: number, list: string[]}, motd: string}|null>}
 */
function pingDirectMinecraft(host, port = 25565, timeoutMs = 3500) {
  return new Promise((resolve) => {
    let resolved = false;
    let socket;
    const cleanup = (val) => {
      if (!resolved) {
        resolved = true;
        try { socket.destroy(); } catch (e) {}
        resolve(val);
      }
    };

    const hostBuf = Buffer.from(host, 'utf8');
    const portBuf = Buffer.alloc(2);
    portBuf.writeUInt16BE(port);

    // Handshake packet: packetId 0x00, protocol 765, host, port, nextState 1 (status)
    const handshakeData = Buffer.concat([
      writeVarInt(0x00),
      writeVarInt(765),
      writeVarInt(hostBuf.length),
      hostBuf,
      portBuf,
      writeVarInt(1)
    ]);

    // Handshake packet wrapped with its length + Status Request packet (id 0x00, length 1)
    const req = Buffer.concat([
      Buffer.concat([writeVarInt(handshakeData.length), handshakeData]),
      writeVarInt(1),
      writeVarInt(0x00)
    ]);

    socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      socket.write(req);
    });

    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const str = buffer.toString('utf8');
        const jsonMatch = str.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          let cleanMotd = '';
          if (typeof data.description === 'string') {
            cleanMotd = data.description;
          } else if (Array.isArray(data.description?.extra)) {
            cleanMotd = data.description.extra.map(e => e.text).join('').trim();
          } else if (data.description?.text) {
            cleanMotd = data.description.text.trim();
          }

          cleanMotd = cleanMotd.replace(/§[0-9a-fk-or]/gi, '').trim();
          const playerList = (data.players?.sample || []).map(p => p.name);

          const rawVersion = data.version?.name || 'Unknown';
          const cleanVersion = rawVersion.replace(/§[0-9a-fk-or]/gi, '').trim();
          const lowerVersion = cleanVersion.toLowerCase();
          const lowerMotd = cleanMotd.toLowerCase();

          // Aternos proxy returns "§c● Offline" and "Get this server" when stopped on dashboard
          const isAternosOffline =
            lowerVersion.includes('offline') ||
            lowerMotd.includes('get this server') ||
            lowerMotd.includes('server offline') ||
            lowerMotd.includes('this server is offline');

          if (isAternosOffline) {
            cleanup({
              online: false,
              ip: host,
              port,
              version: 'Offline',
              players: { online: 0, max: 0, list: [] },
              motd: 'Server is currently sleeping. Awaken it on your Aternos dashboard!'
            });
            return;
          }

          cleanup({
            online: true,
            ip: host,
            port,
            version: cleanVersion || 'Unknown',
            players: {
              online: data.players?.online || 0,
              max: data.players?.max || 20,
              list: playerList
            },
            motd: cleanMotd || 'A Minecraft Server'
          });
        }
      } catch (e) {}
    });

    socket.on('error', () => cleanup(null));
    socket.on('timeout', () => cleanup(null));
    setTimeout(() => cleanup(null), timeoutMs);
  });
}

/**
 * Fetch live status of a Minecraft server
 * Prioritizes direct TCP handshake, then falls back to mcsrvstat.us and mcstatus.io
 * @param {string} address
 * @param {number} port
 * @returns {Promise<{online: boolean, ip: string, port: number, version: string, players: {online: number, max: number, list: string[]}, motd: string}>}
 */
async function getServerStatus(address, port = 25565) {
  let cleanAddress = address.trim();
  let cleanPort = port;

  // Handle address formatted as host:port
  if (cleanAddress.includes(':')) {
    const parts = cleanAddress.split(':');
    cleanAddress = parts[0].trim();
    const parsedPort = parseInt(parts[1], 10);
    if (!isNaN(parsedPort)) {
      cleanPort = parsedPort;
    }
  }

  // 1. Try Direct TCP Server List Ping (Fastest & 100% reliable for Aternos dynamic ports)
  try {
    const directResult = await pingDirectMinecraft(cleanAddress, cleanPort, 3500);
    if (directResult) {
      return directResult;
    }
  } catch (directErr) {
    console.warn(`Direct TCP ping failed for ${cleanAddress}:${cleanPort}:`, directErr.message);
  }

  // 2. Try mcsrvstat.us primary web API
  try {
    const url = `https://api.mcsrvstat.us/3/${encodeURIComponent(cleanAddress)}${cleanPort !== 25565 ? `:${cleanPort}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.online) {
        return {
          online: true,
          ip: data.ip || cleanAddress,
          port: data.port || cleanPort,
          version: data.version || 'Unknown',
          players: {
            online: data.players?.online || 0,
            max: data.players?.max || 0,
            list: (data.players?.list || []).map(p => typeof p === 'string' ? p : p.name)
          },
          motd: Array.isArray(data.motd?.clean)
            ? data.motd.clean.join('\n').trim()
            : (data.motd?.clean || 'Welcome to Minecraft WEEK!')
        };
      }
    }
  } catch (err) {
    console.warn(`mcsrvstat.us failed for ${cleanAddress}, falling back to mcstatus.io:`, err.message);
  }

  // 3. Fallback: mcstatus.io
  try {
    const fallbackUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(cleanAddress)}${cleanPort !== 25565 ? `:${cleanPort}` : ''}`;
    const res = await fetch(fallbackUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.online) {
        return {
          online: true,
          ip: data.ip_address || cleanAddress,
          port: data.port || cleanPort,
          version: data.version?.name_clean || 'Unknown',
          players: {
            online: data.players?.online || 0,
            max: data.players?.max || 0,
            list: (data.players?.list || []).map(p => p.name_clean)
          },
          motd: data.motd?.clean || 'A Minecraft Server'
        };
      }
    }
  } catch (fallbackErr) {
    console.warn(`mcstatus.io also failed:`, fallbackErr.message);
  }

  return {
    online: false,
    ip: cleanAddress,
    port: cleanPort,
    version: 'Offline',
    players: { online: 0, max: 0, list: [] },
    motd: 'Server is currently sleeping or unreachable.'
  };
}

const { renderAvatar, renderBody } = require('../systems/skinRenderer');

/**
 * Fetch skin data for a player (Cracked, TLauncher & Premium aware)
 * @param {string} username
 * @returns {Promise<{isPremium: boolean, isTLauncher?: boolean, username: string, uuid: string|null, avatarUrl?: string, bodyUrl?: string, avatarBuffer?: Buffer, bodyBuffer?: Buffer, note?: string}>}
 */
async function getPlayerSkin(username) {
  const cleanName = username.trim();

  // 1. Check Official Mojang Profile
  try {
    const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(cleanName)}`, {
      signal: AbortSignal.timeout(5000)
    });

    if (mojangRes.ok) {
      const profile = await mojangRes.json();
      const uuid = profile.id;
      return {
        isPremium: true,
        source: 'mojang',
        username: profile.name,
        uuid: uuid,
        avatarUrl: `https://mc-heads.net/avatar/${uuid}`,
        bodyUrl: `https://mc-heads.net/body/${uuid}/right`
      };
    }
  } catch (err) {
    console.warn(`Mojang skin lookup error for ${cleanName}:`, err.message);
  }

  // 2. Check TLauncher Skin Database
  try {
    const tlRes = await fetch(`https://auth.tlauncher.org/skin/profile/texture/login/${encodeURIComponent(cleanName)}`, {
      signal: AbortSignal.timeout(6000)
    });

    if (tlRes.ok) {
      const tlData = await tlRes.json();
      const skinUrl = tlData?.SKIN?.url;
      if (skinUrl) {
        const textureRes = await fetch(skinUrl, { signal: AbortSignal.timeout(6000) });
        if (textureRes.ok) {
          const skinBuf = Buffer.from(await textureRes.arrayBuffer());
          const [avatarBuf, bodyBuf] = await Promise.all([
            renderAvatar(skinBuf),
            renderBody(skinBuf)
          ]);

          return {
            isPremium: false,
            isTLauncher: true,
            source: 'tlauncher',
            username: cleanName,
            uuid: null,
            avatarBuffer: avatarBuf,
            bodyBuffer: bodyBuf,
            note: 'Discovered custom player skin registered in TLauncher database!'
          };
        }
      }
    }
  } catch (tlErr) {
    console.warn(`TLauncher skin lookup error for ${cleanName}:`, tlErr.message);
  }

  // 3. Fallback for cracked players without registered skin (Classic Steve via MC-Heads)
  return {
    isPremium: false,
    source: 'default',
    username: cleanName,
    uuid: null,
    avatarUrl: 'https://mc-heads.net/avatar/Steve',
    bodyUrl: 'https://mc-heads.net/body/Steve/right',
    note: 'TLauncher / cracked players use offline profiles. No custom skin found; showing default Steve.'
  };
}

/**
 * Search the official Minecraft Wiki
 * @param {string} query
 * @returns {Promise<{title: string, extract: string, url: string}|null>}
 */
async function searchWiki(query) {
  try {
    // 1. OpenSearch to find title and page url
    const searchUrl = `https://minecraft.wiki/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!searchRes.ok) return null;

    const data = await searchRes.json();
    const titles = data[1];
    const urls = data[3];

    if (!titles || titles.length === 0) return null;

    const bestTitle = titles[0];
    const pageUrl = urls[0];

    // 2. Query page extract for intro paragraph
    const extractUrl = `https://minecraft.wiki/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(bestTitle)}&format=json`;
    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(5000) });
    let extract = 'Read the full chronicle on the Minecraft Wiki.';

    if (extractRes.ok) {
      const pageData = await extractRes.json();
      const pages = pageData.query?.pages;
      if (pages) {
        const firstPage = Object.values(pages)[0];
        if (firstPage?.extract) {
          extract = firstPage.extract;
          if (extract.length > 550) {
            extract = extract.slice(0, 547) + '...';
          }
        }
      }
    }

    return {
      title: bestTitle,
      extract: extract,
      url: pageUrl
    };
  } catch (err) {
    console.error('Wiki search error:', err);
    return null;
  }
}

module.exports = {
  getServerStatus,
  pingDirectMinecraft,
  getPlayerSkin,
  searchWiki
};
