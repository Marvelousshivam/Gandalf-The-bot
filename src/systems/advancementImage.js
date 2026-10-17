const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const { fetchItemTexture } = require('./craftingImage');
const advancementsData = require('../data/advancements.json');

// Register authentic Minecraft font
try {
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'Minecraft.otf');
  GlobalFonts.registerFromPath(fontPath, 'Minecraft');
} catch (e) {
  console.warn('Could not register Minecraft font in advancementImage:', e.message);
}

// Mapping of friendly icon keys to Minecraft item names for texture fetching
const ICON_MAP = {
  diamond: 'Diamond',
  sword: 'Netherite Sword',
  pickaxe: 'Diamond Pickaxe',
  apple: 'Enchanted Golden Apple',
  bow: 'Bow',
  totem: 'Totem of Undying',
  star: 'Nether Star',
  book: 'Enchanted Book',
  wizard: 'Eye of Ender',
  tnt: 'TNT',
  crown: 'Golden Helmet',
  creeper: 'Creeper Head',
  heart: 'Golden Apple',
  elytra: 'Elytra',
  crystal: 'End Crystal',
  emerald: 'Emerald'
};

/**
 * Generate a Grand Minecraft Achievement Celebration Banner (860x280)
 * Features player skin head, authentic in-game toast card, and Gandalf's praise
 * @param {Object} options
 * @param {string} options.player - Minecraft player IGN
 * @param {string} options.title - Advancement title (e.g. "Stone Age")
 * @param {'task'|'goal'|'challenge'} [options.type] - Advancement tier
 * @param {string} [options.description] - Requirement description
 * @param {string} [options.icon] - Item sprite name
 * @param {string} [options.quote] - Gandalf's in-character congratulatory dialogue
 * @returns {Promise<{ attachment: AttachmentBuilder, buffer: Buffer }>}
 */
async function generateGrandAdvancementBanner({ player, title, type, description, icon, quote }) {
  const width = 860;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Look up advancement details if not explicitly passed
  const meta = advancementsData[title] || {};
  const finalType = (type || meta.type || 'task').toLowerCase();
  const finalDesc = description || meta.desc || 'An epic milestone achieved in Minecraft WEEK!';
  const iconItem = icon || meta.icon || 'Diamond';

  // Palette based on tier
  let headerText = '✦ ADVANCEMENT MADE! ✦';
  let headerColor = '#FFFF55'; // Yellow
  let borderColor = '#FFAA00'; // Gold
  let tagColor = '#55FF55';   // Green

  if (finalType === 'goal') {
    headerText = '🎯 GOAL REACHED! ✦';
    headerColor = '#55FF55';
    borderColor = '#00AA00';
    tagColor = '#55FFFF';
  } else if (finalType === 'challenge') {
    headerText = '🔥 CHALLENGE COMPLETE! ✦';
    headerColor = '#FF55FF';
    borderColor = '#AA00AA';
    tagColor = '#FFAA00';
  }

  // 1. Procedural Deepslate Tile Background
  const tileSize = 20;
  const palette = ['#141414', '#1c1c1c', '#111111', '#232323', '#181818'];
  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const idx = Math.floor(n * palette.length);
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, tileSize, tileSize);

      if (n > 0.75) {
        ctx.fillStyle = finalType === 'challenge' ? 'rgba(170, 0, 170, 0.08)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(x + 2, y + 2, 4, 4);
      } else if (n < 0.25) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(x + 10, y + 10, 5, 5);
      }
    }
  }

  // Ambient Vignette
  const vGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, 550);
  vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Beveled Outer Stone Frame
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, 0, 4, height);
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillRect(width - 4, 0, 4, height);

  ctx.strokeStyle = '#444444';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, width - 18, height - 18);

  // Golden Corner Brackets
  ctx.fillStyle = borderColor;
  const corners = [
    [12, 12], [width - 22, 12],
    [12, height - 22], [width - 22, height - 22]
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, 10, 10);
  }

  // 3. Left Section: Player Avatar & IGN Showcase
  const playerBoxX = 26;
  const playerBoxY = 24;
  const playerBoxW = 150;
  const playerBoxH = 175;

  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(playerBoxX, playerBoxY, playerBoxW, playerBoxH);
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2;
  ctx.strokeRect(playerBoxX, playerBoxY, playerBoxW, playerBoxH);

  // Avatar frame & image
  const avatarSize = 90;
  const avatarX = playerBoxX + (playerBoxW - avatarSize) / 2;
  const avatarY = playerBoxY + 16;

  // Inset frame behind avatar
  ctx.fillStyle = '#050505';
  ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);

  try {
    const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(player)}/128.png`;
    const avatarImg = await loadImage(avatarUrl);
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
  } catch (err) {
    // Fallback: draw Steve silhouette
    ctx.fillStyle = '#3f51b5';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }

  // Player IGN
  ctx.textAlign = 'center';
  ctx.font = '16px Minecraft';
  ctx.fillStyle = '#111111';
  ctx.fillText(player.substring(0, 16), playerBoxX + playerBoxW / 2 + 1, avatarY + avatarSize + 25 + 1);
  ctx.fillStyle = tagColor;
  ctx.fillText(player.substring(0, 16), playerBoxX + playerBoxW / 2, avatarY + avatarSize + 25);

  // Hero Tag
  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#888888';
  ctx.fillText('REALM ADVENTURER', playerBoxX + playerBoxW / 2, avatarY + avatarSize + 41);

  // 4. Middle / Right Section: The In-Game Toast Card
  const toastX = 196;
  const toastY = 24;
  const toastW = width - toastX - 26;
  const toastH = 175;

  ctx.fillStyle = '#171717';
  ctx.fillRect(toastX, toastY, toastW, toastH);

  // Toast Border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.strokeRect(toastX, toastY, toastW, toastH);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(toastX + 3, toastY + 3, toastW - 6, toastH - 6);

  // Header ("✦ ADVANCEMENT MADE! ✦")
  ctx.textAlign = 'left';
  ctx.font = '18px Minecraft';
  ctx.fillStyle = '#222222';
  ctx.fillText(headerText, toastX + 22 + 2, toastY + 38 + 2);
  ctx.fillStyle = headerColor;
  ctx.fillText(headerText, toastX + 22, toastY + 38);

  // Advancement Title
  ctx.font = '30px Minecraft';
  ctx.fillStyle = '#111111';
  ctx.fillText(`[ ${title} ]`, toastX + 22 + 2, toastY + 82 + 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`[ ${title} ]`, toastX + 22, toastY + 82);

  // Description
  ctx.font = '16px Minecraft';
  const cleanDesc = finalDesc.length > 56 ? finalDesc.slice(0, 53) + '...' : finalDesc;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillText(cleanDesc, toastX + 22 + 1, toastY + 118 + 1);
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(cleanDesc, toastX + 22, toastY + 118);

  // Reward / XP Note
  ctx.font = '13px Minecraft';
  ctx.fillStyle = '#55FF55';
  ctx.fillText(`+ XP Awarded • Logged in Ancient Grimoire`, toastX + 22, toastY + 148);

  // 5. Inset Item Sprite Slot (Right side of toast)
  const itemSlotSize = 88;
  const itemSlotX = toastX + toastW - itemSlotSize - 20;
  const itemSlotY = toastY + (toastH - itemSlotSize) / 2;

  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(itemSlotX, itemSlotY, itemSlotSize, itemSlotSize);
  ctx.strokeStyle = '#2d2d2d';
  ctx.lineWidth = 2;
  ctx.strokeRect(itemSlotX, itemSlotY, itemSlotSize, itemSlotSize);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(itemSlotX + 3, itemSlotY + 3, itemSlotSize - 6, itemSlotSize - 6);

  // Fetch Item Sprite
  let sprite = null;
  try {
    sprite = await fetchItemTexture(iconItem);
  } catch (err) {
    console.warn(`Could not fetch texture for icon ${iconItem}:`, err.message);
  }

  if (sprite) {
    const pad = 12;
    ctx.drawImage(sprite, itemSlotX + pad, itemSlotY + pad, itemSlotSize - pad * 2, itemSlotSize - pad * 2);
  } else {
    // Fallback: draw pixelated diamond
    ctx.fillStyle = '#55FFFF';
    ctx.beginPath();
    ctx.arc(itemSlotX + itemSlotSize / 2, itemSlotY + itemSlotSize / 2, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Bottom Section: Gandalf's Wizard Praise & Watermark
  const ribbonX = 26;
  const ribbonY = 210;
  const ribbonW = width - 52;
  const ribbonH = 52;

  ctx.fillStyle = '#0e140e';
  ctx.fillRect(ribbonX, ribbonY, ribbonW, ribbonH);
  ctx.strokeStyle = '#274427';
  ctx.lineWidth = 2;
  ctx.strokeRect(ribbonX, ribbonY, ribbonW, ribbonH);

  // Wizard speech
  const defaultPraise = `A legendary deed, ${player}! Unlocking [${title}] proves your valor in this realm!`;
  const speechText = (quote || defaultPraise).replace(/[\r\n]+/g, ' ');
  const cleanSpeech = speechText.length > 78 ? speechText.slice(0, 75) + '...' : speechText;

  ctx.textAlign = 'left';
  ctx.font = '14px Minecraft';
  ctx.fillStyle = '#FFAA00';
  ctx.fillText('🧙‍♂️ GANDALF:', ribbonX + 16, ribbonY + 31);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`"${cleanSpeech}"`, ribbonX + 130, ribbonY + 31);

  // Watermark
  ctx.textAlign = 'right';
  ctx.font = '11px Minecraft';
  ctx.fillStyle = '#555555';
  ctx.fillText('Minecraft WEEK', ribbonX + ribbonW - 14, ribbonY + 31);

  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'minecraft-advancement-banner.png' });
  return { attachment, buffer };
}

/**
 * Generate standard in-game Minecraft Advancement Toast banner
 */
async function generateAdvancementToast({ title, description = '', icon = 'diamond', type = 'task' }) {
  const width = 680;
  const height = description ? 150 : 124;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let headerText = 'Advancement Made!';
  let headerColor = '#FFFF55';
  let borderColor = '#FFAA00';

  if (type === 'goal') {
    headerText = 'Goal Reached!';
    headerColor = '#55FF55';
    borderColor = '#00AA00';
  } else if (type === 'challenge') {
    headerText = 'Challenge Complete!';
    headerColor = '#FF55FF';
    borderColor = '#AA00AA';
  }

  const radius = 12;
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, radius);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(8, 8, width - 16, height - 16, radius - 2);
  ctx.stroke();

  const slotSize = 76;
  const slotX = 22;
  const slotY = (height - slotSize) / 2;

  ctx.fillStyle = '#111111';
  ctx.fillRect(slotX, slotY, slotSize, slotSize);

  const itemName = ICON_MAP[icon.toLowerCase()] || icon;
  let sprite = null;
  try {
    sprite = await fetchItemTexture(itemName);
  } catch (err) {
    console.warn(`Could not fetch texture for icon ${itemName}:`, err.message);
  }

  if (sprite) {
    const iconPadding = 12;
    ctx.drawImage(sprite, slotX + iconPadding, slotY + iconPadding, slotSize - iconPadding * 2, slotSize - iconPadding * 2);
  } else {
    ctx.fillStyle = '#55FFFF';
    ctx.beginPath();
    ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  const textX = slotX + slotSize + 22;
  ctx.font = '20px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(headerText, textX + 2, 47);
  ctx.fillStyle = headerColor;
  ctx.fillText(headerText, textX, 45);

  ctx.font = '26px Minecraft, "Segoe UI", sans-serif';
  ctx.fillStyle = '#222222';
  ctx.fillText(title, textX + 2, 82);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, textX, 80);

  if (description) {
    ctx.font = '16px Minecraft, "Segoe UI", sans-serif';
    const cleanDesc = description.length > 55 ? description.slice(0, 52) + '...' : description;
    ctx.fillStyle = '#111111';
    ctx.fillText(cleanDesc, textX + 2, 114);
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(cleanDesc, textX, 112);
  }

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'minecraft-advancement.png' });
}

module.exports = {
  generateGrandAdvancementBanner,
  generateAdvancementToast,
  ICON_MAP
};
