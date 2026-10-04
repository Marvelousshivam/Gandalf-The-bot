const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const { fetchItemTexture } = require('./craftingImage');

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
 * Generate an authentic in-game Minecraft Advancement Toast banner
 * @param {Object} options
 * @param {string} options.title - The advancement title
 * @param {string} [options.description] - Optional sub-description
 * @param {string} [options.icon='diamond'] - Icon key
 * @param {'task'|'goal'|'challenge'} [options.type='task'] - Advancement type
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateAdvancementToast({ title, description = '', icon = 'diamond', type = 'task' }) {
  const width = 680;
  const height = description ? 150 : 124;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Determine palette based on advancement type
  let headerText = 'Advancement Made!';
  let headerColor = '#FFFF55'; // Yellow
  let borderColor = '#FFAA00'; // Gold

  if (type === 'goal') {
    headerText = 'Goal Reached!';
    headerColor = '#55FF55'; // Green
    borderColor = '#00AA00';
  } else if (type === 'challenge') {
    headerText = 'Challenge Complete!';
    headerColor = '#FF55FF'; // Purple / Magenta
    borderColor = '#AA00AA';
  }

  // 1. Draw Toast Background (Dark Slate)
  const radius = 12;
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, radius);
  ctx.fill();

  // Subtle dark noise
  for (let x = 8; x < width - 8; x += 16) {
    for (let y = 8; y < height - 8; y += 16) {
      if ((x + y) % 32 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, y, 16, 16);
      }
    }
  }

  // 2. Beveled Toast Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(8, 8, width - 16, height - 16, radius - 2);
  ctx.stroke();

  // Inner dark bevel
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(11, 11, width - 22, height - 22, radius - 4);
  ctx.stroke();

  // 3. Item Icon Slot (Left side)
  const slotSize = 76;
  const slotX = 22;
  const slotY = (height - slotSize) / 2;

  // Inset Slot
  ctx.fillStyle = '#111111';
  ctx.fillRect(slotX, slotY, slotSize, slotSize);

  // Bevel inside slot
  ctx.fillStyle = '#050505';
  ctx.fillRect(slotX, slotY, slotSize, 4);
  ctx.fillRect(slotX, slotY, 4, slotSize);
  ctx.fillStyle = '#373737';
  ctx.fillRect(slotX + slotSize - 4, slotY, 4, slotSize);
  ctx.fillRect(slotX, slotY + slotSize - 4, slotSize, 4);

  // 4. Fetch & Draw Item Sprite
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
    // Fallback: draw pixelated diamond
    ctx.fillStyle = '#55FFFF';
    ctx.beginPath();
    ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Draw Header Text ("Advancement Made!", etc.)
  const textX = slotX + slotSize + 22;
  ctx.font = '20px Minecraft, "Segoe UI", sans-serif';

  // Drop shadow
  ctx.fillStyle = '#222222';
  ctx.fillText(headerText, textX + 2, 47);
  // Header face
  ctx.fillStyle = headerColor;
  ctx.fillText(headerText, textX, 45);

  // 6. Draw Advancement Title
  ctx.font = '26px Minecraft, "Segoe UI", sans-serif';
  // Shadow
  ctx.fillStyle = '#222222';
  ctx.fillText(title, textX + 2, 82);
  // Title face
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(title, textX, 80);

  // 7. Draw Optional Description
  if (description) {
    ctx.font = '16px Minecraft, "Segoe UI", sans-serif';
    // Truncate if too long
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
  generateAdvancementToast,
  ICON_MAP
};
