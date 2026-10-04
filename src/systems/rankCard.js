const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const { getPlayerSkin } = require('../utils/minecraft-api');

// Register authentic Minecraft font
try {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Minecraft.otf');
  GlobalFonts.registerFromPath(fontPath, 'Minecraft');
} catch (e) {
  console.warn('Could not register Minecraft font in rankCard:', e.message);
}

/**
 * Generate a pixel-perfect Minecraft Inventory styled Rank Card
 * @param {Object} data
 * @param {import('discord.js').User} data.user
 * @param {import('discord.js').GuildMember|null} data.member
 * @param {number} data.xp
 * @param {number} data.level
 * @param {number} data.currentLevelXp
 * @param {number} data.neededXp
 * @param {number} data.percentage
 * @param {string} data.rankTitle
 * @param {string} data.rankPosition
 * @param {number} data.totalMessages
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateRankCard(data) {
  const width = 840;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1. Draw Minecraft Dark Bedrock/Slate UI Background
  const tileSize = 20;
  const slatePalette = ['#1e1e1e', '#191919', '#222222', '#161616', '#262626'];
  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      const idx = (Math.abs(Math.sin(x * 3.7 + y * 7.1)) * slatePalette.length) | 0;
      ctx.fillStyle = slatePalette[idx];
      ctx.fillRect(x, y, tileSize, tileSize);

      // Subtle pixel grit
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(x + 10, y + 10, 4, 4);
    }
  }

  // 2. Beveled Minecraft UI Container Outer Frame
  // Dark shadow border
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, 6);
  ctx.fillRect(0, 0, 6, height);
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillRect(width - 6, 0, 6, height);

  // Bevel Highlights (MC Inventory Gray)
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // 3. Avatar Frame (Left Side)
  const avSize = 136;
  const avX = 26;
  const avY = (height - avSize) / 2;

  // Outer dark slot
  ctx.fillStyle = '#101010';
  ctx.fillRect(avX - 6, avY - 6, avSize + 12, avSize + 12);

  // Emerald / Diamond glowing corner brackets
  ctx.fillStyle = '#55FF55';
  ctx.fillRect(avX - 6, avY - 6, 12, 4);
  ctx.fillRect(avX - 6, avY - 6, 4, 12);
  ctx.fillRect(avX + avSize - 6, avY - 6, 12, 4);
  ctx.fillRect(avX + avSize + 2, avY - 6, 4, 12);
  ctx.fillRect(avX - 6, avY + avSize + 2, 12, 4);
  ctx.fillRect(avX - 6, avY + avSize - 6, 4, 12);
  ctx.fillRect(avX + avSize - 6, avY + avSize + 2, 12, 4);
  ctx.fillRect(avX + avSize + 2, avY + avSize - 6, 4, 12);

  // Load in-game Minecraft skin avatar if possible, fallback to Discord avatar
  let avatarLoaded = false;
  try {
    const skinName = data.member?.displayName || data.user.username;
    const skinData = await getPlayerSkin(skinName);
    if (skinData?.avatarBuffer) {
      const skinImg = await loadImage(skinData.avatarBuffer);
      ctx.drawImage(skinImg, avX, avY, avSize, avSize);
      avatarLoaded = true;
    } else if (skinData?.avatarUrl && !skinData.avatarUrl.includes('Steve')) {
      const skinImg = await loadImage(skinData.avatarUrl);
      ctx.drawImage(skinImg, avX, avY, avSize, avSize);
      avatarLoaded = true;
    }
  } catch (err) {
    // Skin lookup fallback
  }

  if (!avatarLoaded) {
    try {
      const discordAvatarUrl = data.user.displayAvatarURL({ extension: 'png', size: 256 });
      const discordAvatar = await loadImage(discordAvatarUrl);
      ctx.drawImage(discordAvatar, avX, avY, avSize, avSize);
    } catch {
      ctx.fillStyle = '#333333';
      ctx.fillRect(avX, avY, avSize, avSize);
    }
  }

  // 4. Player Name & Title
  const contentX = avX + avSize + 32;

  // Name with 3D drop shadow
  const displayName = data.member?.displayName || data.user.username;
  ctx.font = '28px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(displayName, contentX + 3, 53);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(displayName, contentX, 50);

  // Rank Title (strip emojis for pixel font compatibility)
  const cleanRankTitle = data.rankTitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  ctx.font = '18px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#111111';
  ctx.fillText(cleanRankTitle, contentX + 2, 82);
  ctx.fillStyle = '#FFAA00'; // Minecraft Gold
  ctx.fillText(cleanRankTitle, contentX, 80);

  // 5. Leaderboard Standing (Top Right)
  ctx.textAlign = 'right';
  ctx.font = '22px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(`Rank: ${data.rankPosition}`, width - 38, 52);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`Rank: ${data.rankPosition}`, width - 40, 50);

  ctx.font = '16px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(`${data.totalMessages} Messages`, width - 39, 81);
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(`${data.totalMessages} Messages`, width - 40, 80);
  ctx.textAlign = 'left';

  // 6. Minecraft Experience Bar
  const barX = contentX;
  const barY = 120;
  const barW = width - barX - 40;
  const barH = 22;

  // Dark slot border
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // Empty bar background (dark grey segmented)
  ctx.fillStyle = '#262626';
  ctx.fillRect(barX, barY, barW, barH);

  // Filled EXP Bar (Vibrant Minecraft Green)
  const fillWidth = Math.max(0, Math.min(barW, Math.round((barW * data.percentage) / 100)));
  if (fillWidth > 0) {
    const expGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    expGrad.addColorStop(0, '#A6FF00');
    expGrad.addColorStop(0.5, '#73D700');
    expGrad.addColorStop(1, '#4A8F00');
    ctx.fillStyle = expGrad;
    ctx.fillRect(barX, barY, fillWidth, barH);
  }

  // Segment notches (Classic in-game Minecraft tick marks every 10%)
  ctx.fillStyle = '#101010';
  for (let i = 1; i <= 9; i++) {
    const tickX = barX + Math.round((barW * (i * 10)) / 100);
    ctx.fillRect(tickX, barY, 2, barH);
  }

  // Top highlight line inside bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(barX, barY, fillWidth, 2);

  // 7. Glowing Level Number (Centered inside/above EXP bar like Minecraft hotbar)
  const levelText = `${data.level}`;
  ctx.font = 'bold 22px Minecraft, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';

  // 8-directional black outline for authentic Minecraft floating level number
  ctx.fillStyle = '#000000';
  const offsets = [
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-2, -2], [2, -2], [-2, 2], [2, 2],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];
  for (const [ox, oy] of offsets) {
    ctx.fillText(levelText, barX + barW / 2 + ox, barY - 8 + oy);
  }

  // Glowing Green Level Text
  ctx.fillStyle = '#80FF20';
  ctx.fillText(levelText, barX + barW / 2, barY - 8);

  // 8. Progress Stats Sub-text
  ctx.textAlign = 'left';
  ctx.font = '16px Minecraft, "Segoe UI", sans-serif';

  // Current / Needed XP
  const xpInfo = `${data.currentLevelXp.toLocaleString()} / ${data.neededXp.toLocaleString()} XP (${data.percentage}%)`;
  ctx.fillStyle = '#222222';
  ctx.fillText(xpInfo, contentX + 2, barY + barH + 32);
  ctx.fillStyle = '#55FF55';
  ctx.fillText(xpInfo, contentX, barY + barH + 30);

  // Lifetime XP (Right aligned under bar)
  ctx.textAlign = 'right';
  const lifetimeText = `Total: ${data.xp.toLocaleString()} XP`;
  ctx.fillStyle = '#222222';
  ctx.fillText(lifetimeText, width - 39, barY + barH + 32);
  ctx.fillStyle = '#55FFFF'; // Diamond Cyan
  ctx.fillText(lifetimeText, width - 40, barY + barH + 30);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'minecraft-rank.png' });
}

module.exports = { generateRankCard };
