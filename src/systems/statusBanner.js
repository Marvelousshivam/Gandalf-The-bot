const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

// Ensure font is registered
try {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Minecraft.otf');
  GlobalFonts.registerFromPath(fontPath, 'Minecraft');
} catch (e) {
  console.warn('Could not register Minecraft font in statusBanner:', e.message);
}

/**
 * Draw an authentic 3D Isometric Minecraft Grass Block or Obsidian Block
 */
function drawIsometricBlock(ctx, cx, cy, size, isOnline = true) {
  const hSize = size;
  const vSize = size * 0.58;

  if (isOnline) {
    // Top Face (Grass Green)
    ctx.beginPath();
    ctx.moveTo(cx, cy - vSize);
    ctx.lineTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx - hSize, cy);
    ctx.closePath();
    ctx.fillStyle = '#629e30';
    ctx.fill();
    ctx.strokeStyle = '#76b839';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top pixel details
    ctx.fillStyle = '#76b839';
    ctx.fillRect(cx - 10, cy - 8, 6, 4);
    ctx.fillRect(cx + 8, cy - 4, 8, 5);

    // Left Face (Dirt + Grass Fringe)
    ctx.beginPath();
    ctx.moveTo(cx - hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx - hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#866043';
    ctx.fill();

    // Left Grass Overhang
    ctx.beginPath();
    ctx.moveTo(cx - hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + 14);
    ctx.lineTo(cx - hSize * 0.4, cy + vSize * 0.7 + 10);
    ctx.lineTo(cx - hSize * 0.6, cy + vSize * 0.5 + 16);
    ctx.lineTo(cx - hSize, cy + 12);
    ctx.closePath();
    ctx.fillStyle = '#538228';
    ctx.fill();

    // Right Face (Shaded Dirt + Grass Fringe)
    ctx.beginPath();
    ctx.moveTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx + hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#5c4028';
    ctx.fill();

    // Right Grass Overhang
    ctx.beginPath();
    ctx.moveTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + 12);
    ctx.lineTo(cx + hSize * 0.4, cy + vSize * 0.7 + 15);
    ctx.lineTo(cx + hSize * 0.7, cy + vSize * 0.4 + 10);
    ctx.lineTo(cx + hSize, cy + 12);
    ctx.closePath();
    ctx.fillStyle = '#3f621e';
    ctx.fill();
  } else {
    // Offline Sleeping Obsidian / Bedrock Block
    ctx.beginPath();
    ctx.moveTo(cx, cy - vSize);
    ctx.lineTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx - hSize, cy);
    ctx.closePath();
    ctx.fillStyle = '#22152c';
    ctx.fill();
    ctx.strokeStyle = '#3d2551';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Left Face
    ctx.beginPath();
    ctx.moveTo(cx - hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx - hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#170e20';
    ctx.fill();

    // Right Face
    ctx.beginPath();
    ctx.moveTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx + hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#0f0815';
    ctx.fill();

    // Obsidian purple veins
    ctx.fillStyle = '#5c2d91';
    ctx.fillRect(cx - 12, cy - 6, 8, 4);
    ctx.fillRect(cx + 6, cy + 12, 10, 5);
  }
}

/**
 * Generate a Grand Minecraft Server Status Banner
 * @param {Object} data
 * @param {boolean} data.online
 * @param {string} data.ip
 * @param {number} data.port
 * @param {string} data.version
 * @param {{online: number, max: number, list: string[]}} data.players
 * @param {string} data.motd
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateStatusBanner(data) {
  const isOnline = !!data.online;
  const address = data.ip || 'Sapnokasehar-QhIo.aternos.me';
  const port = data.port || 30212;
  const version = data.version || 'Paper 26.2';
  const playersOnline = data.players?.online || 0;
  const playersMax = data.players?.max || 20;
  const playerList = data.players?.list || [];
  const motd = data.motd || (isOnline ? 'Welcome to Minecraft WEEK!' : 'Server is currently resting.');

  const width = 860;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1. Procedural Bedrock / Deepslate background
  const tileSize = 16;
  const palette = ['#151515', '#1a1a1a', '#121212', '#212121', '#181818'];
  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const idx = Math.floor(n * palette.length);
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, tileSize, tileSize);

      // Pixel grit
      if (n > 0.7) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x + 2, y + 2, 3, 3);
      } else if (n < 0.3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x + 8, y + 8, 4, 4);
      }
    }
  }

  // Vignette gradient
  const vGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, 500);
  vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Beveled Outer Frame
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, 0, 4, height);
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillRect(width - 4, 0, 4, height);

  ctx.strokeStyle = '#4f4f4f';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, width - 18, height - 18);

  // Corner brackets (Emerald if online, Redstone if offline)
  ctx.fillStyle = isOnline ? '#55FF55' : '#FF5555';
  const corners = [
    [12, 12], [width - 20, 12],
    [12, height - 20], [width - 20, height - 20]
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, 8, 8);
  }

  // 3. Left Section: 3D Block & Status Pill
  const iconSlotX = 24;
  const iconSlotY = 24;
  const iconSlotW = 104;
  const iconSlotH = 114;

  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(iconSlotX, iconSlotY, iconSlotW, iconSlotH);
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = 2;
  ctx.strokeRect(iconSlotX, iconSlotY, iconSlotW, iconSlotH);

  drawIsometricBlock(ctx, iconSlotX + iconSlotW / 2, iconSlotY + 44, 34, isOnline);

  // Status Pill
  const pillY = 150;
  ctx.fillStyle = isOnline ? '#0a230a' : '#230a0a';
  ctx.fillRect(iconSlotX, pillY, iconSlotW, 34);
  ctx.strokeStyle = isOnline ? '#55FF55' : '#FF5555';
  ctx.lineWidth = 2;
  ctx.strokeRect(iconSlotX, pillY, iconSlotW, 34);

  ctx.font = '16px Minecraft';
  ctx.fillStyle = isOnline ? '#55FF55' : '#FF5555';
  ctx.textAlign = 'center';
  ctx.fillText(isOnline ? 'ONLINE' : 'SLEEPING', iconSlotX + iconSlotW / 2, pillY + 23);

  // Platform Tag
  const platY = 194;
  ctx.fillStyle = '#141414';
  ctx.fillRect(iconSlotX, platY, iconSlotW, 36);
  ctx.strokeStyle = '#2d2d2d';
  ctx.strokeRect(iconSlotX, platY, iconSlotW, 36);
  ctx.font = '12px Minecraft';
  ctx.fillStyle = isOnline ? '#55FFFF' : '#777777';
  ctx.fillText('CRACKED', iconSlotX + iconSlotW / 2, platY + 17);
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('JAVA & BED', iconSlotX + iconSlotW / 2, platY + 31);

  // 4. Middle Section: Title, MOTD, and Connection Info
  const midX = 146;

  // Title with Shadow
  ctx.textAlign = 'left';
  ctx.font = '28px Minecraft';
  ctx.fillStyle = '#3F2A00';
  ctx.fillText('MINECRAFT WEEK', midX + 2, 48 + 2);
  ctx.fillStyle = '#FFAA00';
  ctx.fillText('MINECRAFT WEEK', midX, 48);

  // Subtitle
  ctx.font = '13px Minecraft';
  ctx.fillStyle = '#888888';
  ctx.fillText(`Aternos ${version}  •  SMP Realm of the Fellowship`, midX, 72);

  // Inset MOTD Box
  const motdW = 460;
  const motdH = 74;
  const motdY = 86;
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(midX, motdY, motdW, motdH);
  ctx.strokeStyle = '#242424';
  ctx.lineWidth = 2;
  ctx.strokeRect(midX, motdY, motdW, motdH);

  // MOTD label & text
  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#777777';
  ctx.fillText('MOTD //', midX + 12, motdY + 20);

  ctx.font = '14px Minecraft';
  ctx.fillStyle = isOnline ? '#FFFF55' : '#AAAAAA';
  const cleanMotd = motd.replace(/§[0-9a-fk-or]/gi, '').replace(/[\r\n]+/g, ' ');
  const displayMotd = cleanMotd.length > 55 ? cleanMotd.substring(0, 52) + '...' : cleanMotd;
  ctx.fillText(`"${displayMotd}"`, midX + 12, motdY + 44);

  // Quick Connect Address Box
  const addrY = 172;
  const addrH = 58;
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(midX, addrY, motdW, addrH);
  ctx.strokeStyle = '#2d2d2d';
  ctx.strokeRect(midX, addrY, motdW, addrH);

  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#888888';
  ctx.fillText('DIRECT SERVER ADDRESS //', midX + 12, addrY + 20);

  ctx.font = '17px Minecraft';
  ctx.fillStyle = isOnline ? '#55FFFF' : '#777777';
  ctx.fillText(`${address}:${port}`, midX + 12, addrY + 44);

  // 5. Right Section: Connection & Online Adventurers Roster
  const rightX = 624;
  const rightW = 212;

  // Signal Bars
  const sigX = rightX + rightW - 42;
  const sigY = 28;
  for (let i = 0; i < 5; i++) {
    const barH = 6 + i * 5;
    ctx.fillStyle = isOnline ? '#55FF55' : '#444444';
    ctx.fillRect(sigX + i * 8, sigY + (26 - barH), 5, barH);
  }

  // Adventurers Count
  ctx.font = '14px Minecraft';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('ADVENTURERS', rightX, 38);
  ctx.font = '18px Minecraft';
  ctx.fillStyle = isOnline ? '#55FF55' : '#FF5555';
  ctx.fillText(`${playersOnline} / ${playersMax} Online`, rightX, 58);

  // Inset Player Roster Box
  const rosterY = 72;
  const rosterH = 158;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(rightX, rosterY, rightW, rosterH);
  ctx.strokeStyle = '#262626';
  ctx.strokeRect(rightX, rosterY, rightW, rosterH);

  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#666666';
  ctx.fillText('ACTIVE IN REALM //', rightX + 10, rosterY + 20);

  if (isOnline && playerList.length > 0) {
    const maxShow = Math.min(playerList.length, 3);
    for (let i = 0; i < maxShow; i++) {
      const pName = playerList[i];
      const pY = rosterY + 32 + i * 40;

      // Try loading head texture
      let headLoaded = false;
      try {
        const headRes = await fetch(`https://mc-heads.net/avatar/${encodeURIComponent(pName)}/32`, {
          signal: AbortSignal.timeout(2500)
        });
        if (headRes.ok) {
          const headImg = await loadImage(Buffer.from(await headRes.arrayBuffer()));
          ctx.drawImage(headImg, rightX + 10, pY, 32, 32);
          headLoaded = true;
        }
      } catch (e) {}

      if (!headLoaded) {
        ctx.fillStyle = '#c68966';
        ctx.fillRect(rightX + 10, pY, 32, 32);
        ctx.fillStyle = '#3a2010';
        ctx.fillRect(rightX + 10, pY, 32, 10);
      }

      ctx.strokeStyle = '#FFAA00';
      ctx.lineWidth = 1;
      ctx.strokeRect(rightX + 10, pY, 32, 32);

      // Name & Title
      ctx.font = '13px Minecraft';
      ctx.fillStyle = '#FFFFFF';
      const isCreator = pName.toLowerCase() === 'shivamraj616' || pName.toLowerCase() === 'dinesh';
      ctx.fillText(pName.length > 12 ? pName.substring(0, 11) + '..' : pName, rightX + 48, pY + 16);

      ctx.font = '10px Minecraft';
      ctx.fillStyle = isCreator ? '#FFAA00' : '#55FF55';
      ctx.fillText(isCreator ? 'Companion' : 'Adventurer', rightX + 48, pY + 28);
    }
  } else {
    // Empty or Sleeping state
    ctx.textAlign = 'center';
    ctx.font = '13px Minecraft';
    ctx.fillStyle = '#777777';
    ctx.fillText(isOnline ? 'The realm is quiet.' : 'Server is sleeping.', rightX + rightW / 2, rosterY + 70);
    ctx.font = '11px Minecraft';
    ctx.fillStyle = isOnline ? '#55FF55' : '#888888';
    ctx.fillText(isOnline ? 'Step through the gate!' : 'Start on Aternos!', rightX + rightW / 2, rosterY + 95);
  }

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'server-status.png' });
}

module.exports = {
  generateStatusBanner
};
