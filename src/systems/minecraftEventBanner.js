const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

// Ensure Minecraft font is registered
try {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Minecraft.otf');
  GlobalFonts.registerFromPath(fontPath, 'Minecraft');
} catch (e) {
  console.warn('Could not register Minecraft font in minecraftEventBanner:', e.message);
}

/**
 * Draw an authentic 3D Isometric Minecraft Grass Block or Obsidian Block
 */
function drawIsometricBlock(ctx, cx, cy, size, blockType = 'grass') {
  const hSize = size;
  const vSize = size * 0.58;

  if (blockType === 'grass') {
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

    // Pixel details on top
    ctx.fillStyle = '#76b839';
    ctx.fillRect(cx - 10, cy - 8, 8, 4);
    ctx.fillRect(cx + 6, cy - 4, 8, 5);

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
  } else if (blockType === 'diamond') {
    // Diamond Block
    ctx.beginPath();
    ctx.moveTo(cx, cy - vSize);
    ctx.lineTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx - hSize, cy);
    ctx.closePath();
    ctx.fillStyle = '#55FFFF';
    ctx.fill();
    ctx.strokeStyle = '#2CCCCC';
    ctx.stroke();

    // Left
    ctx.beginPath();
    ctx.moveTo(cx - hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx - hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#33AAAA';
    ctx.fill();

    // Right
    ctx.beginPath();
    ctx.moveTo(cx + hSize, cy);
    ctx.lineTo(cx, cy + vSize);
    ctx.lineTo(cx, cy + vSize + size * 0.95);
    ctx.lineTo(cx + hSize, cy + size * 0.95);
    ctx.closePath();
    ctx.fillStyle = '#227777';
    ctx.fill();
  } else {
    // Obsidian Block
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

    // Purple veins
    ctx.fillStyle = '#6c3483';
    ctx.fillRect(cx - 12, cy - 4, 8, 4);
    ctx.fillRect(cx + 8, cy + 10, 10, 5);
  }
}

/**
 * Generate a Grand Minecraft Server Event Banner (900x420)
 * @param {Object} eventData
 * @param {string} eventData.title
 * @param {Date|number} eventData.startTime
 * @param {string} eventData.address
 * @param {number} eventData.port
 * @param {string} eventData.version
 * @param {string} eventData.theme - 'overworld' | 'nether' | 'the_end'
 * @returns {Promise<{ attachment: AttachmentBuilder, buffer: Buffer }>}
 */
async function generateMinecraftEventBanner(eventData) {
  const width = 900;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const theme = (eventData.theme || 'overworld').toLowerCase();
  const title = (eventData.title || 'MINECRAFT REALM LAUNCH').toUpperCase();
  const address = eventData.address || 'Fellowshiptotheend.aternos.me';
  const port = eventData.port || 20974;
  const version = eventData.version || '1.21.x';

  // Date formatting
  const dateObj = eventData.startTime instanceof Date ? eventData.startTime : new Date(Number(eventData.startTime) * 1000);
  const dateString = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
  const timeString = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase();

  // 1. Procedural Tiled Minecraft Background
  const tileSize = 20;
  let palette;
  if (theme === 'nether') {
    palette = ['#2b0d0d', '#381313', '#1e0808', '#451818', '#1a0505'];
  } else if (theme === 'the_end') {
    palette = ['#100b17', '#1a1224', '#0d0813', '#241a33', '#160e20'];
  } else {
    // Deepslate / Stone Overworld
    palette = ['#161616', '#1e1e1e', '#131313', '#262626', '#1a1a1a'];
  }

  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const idx = Math.floor(n * palette.length);
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, tileSize, tileSize);

      if (n > 0.72) {
        ctx.fillStyle = theme === 'nether' ? 'rgba(255, 68, 68, 0.08)' : (theme === 'the_end' ? 'rgba(180, 100, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)');
        ctx.fillRect(x + 3, y + 3, 4, 4);
      } else if (n < 0.28) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 10, y + 10, 5, 5);
      }
    }
  }

  // Vignette Gradient
  const vGrad = ctx.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 580);
  vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Beveled Border Frame
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, 6);
  ctx.fillRect(0, 0, 6, height);
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillRect(width - 6, 0, 6, height);

  let borderHighlight = '#55FF55'; // Emerald default
  let borderInner = '#375b28';
  if (theme === 'nether') {
    borderHighlight = '#FF5555';
    borderInner = '#7a1d1d';
  } else if (theme === 'the_end') {
    borderHighlight = '#B24BFF';
    borderInner = '#4a1b73';
  }

  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.strokeStyle = borderInner;
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Corner Brackets
  ctx.fillStyle = borderHighlight;
  const corners = [
    [16, 16], [width - 28, 16],
    [16, height - 28], [width - 28, height - 28]
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, 12, 12);
  }

  // 3. Left Section: 3D Isometric Centerpiece & Mascot
  const blockBoxX = 36;
  const blockBoxY = 40;
  const blockBoxW = 160;
  const blockBoxH = 220;

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(blockBoxX, blockBoxY, blockBoxW, blockBoxH);
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = 2;
  ctx.strokeRect(blockBoxX, blockBoxY, blockBoxW, blockBoxH);

  // Render 3D isometric block based on theme
  if (theme === 'nether') {
    drawIsometricBlock(ctx, blockBoxX + blockBoxW / 2, blockBoxY + 80, 50, 'obsidian');
  } else if (theme === 'the_end') {
    drawIsometricBlock(ctx, blockBoxX + blockBoxW / 2, blockBoxY + 80, 50, 'diamond');
  } else {
    drawIsometricBlock(ctx, blockBoxX + blockBoxW / 2, blockBoxY + 80, 50, 'grass');
  }

  // Event Type Tag inside block box
  const eventPillY = blockBoxY + 160;
  ctx.fillStyle = '#141414';
  ctx.fillRect(blockBoxX + 10, eventPillY, blockBoxW - 20, 42);
  ctx.strokeStyle = borderHighlight;
  ctx.lineWidth = 1;
  ctx.strokeRect(blockBoxX + 10, eventPillY, blockBoxW - 20, 42);

  ctx.font = '14px Minecraft';
  ctx.textAlign = 'center';
  ctx.fillStyle = borderHighlight;
  ctx.fillText('REALM EVENT', blockBoxX + blockBoxW / 2, eventPillY + 20);
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('JOIN THE GAME', blockBoxX + blockBoxW / 2, eventPillY + 35);

  // 4. Middle Section: Event Title & Proclamation
  const textX = 224;

  // Header badge
  ctx.textAlign = 'left';
  ctx.font = '16px Minecraft';
  ctx.fillStyle = borderHighlight;
  ctx.fillText(theme === 'nether' ? '🔥 THE NETHER GATES OPEN 🔥' : (theme === 'the_end' ? '🔮 THE END OPENS • DRAGON RAID 🔮' : '⚔️ MINECRAFT WEEK • OFFICIAL REALM EVENT ⚔️'), textX, 58);

  // Main Event Title (with 3D shadow)
  ctx.font = '32px Minecraft';
  ctx.fillStyle = '#221500';
  ctx.fillText(title.substring(0, 32), textX + 3, 102 + 3);
  ctx.fillStyle = '#FFAA00'; // Minecraft Gold
  ctx.fillText(title.substring(0, 32), textX, 102);

  // 5. Date & Time Glowing Banner
  const dateCardX = textX;
  const dateCardY = 124;
  const dateCardW = 636;
  const dateCardH = 68;

  ctx.fillStyle = '#111811';
  ctx.fillRect(dateCardX, dateCardY, dateCardW, dateCardH);
  ctx.strokeStyle = borderHighlight;
  ctx.lineWidth = 2;
  ctx.strokeRect(dateCardX, dateCardY, dateCardW, dateCardH);

  ctx.font = '18px Minecraft';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`📅  DATE: ${dateString}`, dateCardX + 20, dateCardY + 28);
  ctx.fillStyle = borderHighlight;
  ctx.fillText(`⏰  START TIME: ${timeString} LOCAL`, dateCardX + 20, dateCardY + 54);

  // 6. Server Connection Box (Bottom Area)
  const connBoxX = 36;
  const connBoxY = 280;
  const connBoxW = width - 72;
  const connBoxH = 100;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(connBoxX, connBoxY, connBoxW, connBoxH);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(connBoxX, connBoxY, connBoxW, connBoxH);

  // Direct Connect Address Tag
  ctx.font = '15px Minecraft';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('DIRECT CONNECT ADDRESS:', connBoxX + 24, connBoxY + 34);

  // The IP:Port in Cyan Terminal Font
  ctx.font = '22px Minecraft';
  ctx.fillStyle = '#003333';
  ctx.fillText(`${address}:${port}`, connBoxX + 24 + 2, connBoxY + 70 + 2);
  ctx.fillStyle = '#55FFFF'; // Diamond Aqua
  ctx.fillText(`${address}:${port}`, connBoxX + 24, connBoxY + 70);

  // Edition & Compatibility Badge on Right
  const badgeX = connBoxX + connBoxW - 220;
  const badgeY = connBoxY + 18;
  const badgeW = 196;
  const badgeH = 64;

  ctx.fillStyle = '#141414';
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 1;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

  ctx.textAlign = 'center';
  ctx.font = '14px Minecraft';
  ctx.fillStyle = '#55FF55';
  ctx.fillText(`VERSION: ${version}`, badgeX + badgeW / 2, badgeY + 26);
  ctx.fillStyle = '#FFAA00';
  ctx.fillText('JAVA & BEDROCK', badgeX + badgeW / 2, badgeY + 44);
  ctx.fillStyle = '#888888';
  ctx.font = '11px Minecraft';
  ctx.fillText('CRACKED ALLOWED', badgeX + badgeW / 2, badgeY + 58);

  // Watermark footer
  ctx.textAlign = 'right';
  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#666666';
  ctx.fillText('🧙‍♂️ Blessed by Gandalf the BOT • The Fellowship to the End', width - 42, height - 14);

  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'mc-event-banner.png' });
  return { attachment, buffer };
}

module.exports = {
  generateMinecraftEventBanner
};
