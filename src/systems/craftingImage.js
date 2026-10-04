const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

// In-memory texture cache to avoid repeated web requests
const textureCache = new Map();

/**
 * Normalizes item names to standard Minecraft Wiki page titles
 */
function normalizeItemName(name) {
  if (!name) return '';
  const clean = name.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('wood plank') || lower.includes('oak plank') || lower === 'planks') return 'Planks';
  if (lower.includes('cobble')) return 'Cobblestone';
  if (lower === 'iron ingot') return 'Iron Ingot';
  if (lower === 'iron block') return 'Block of Iron';
  if (lower === 'gold ingot') return 'Gold Ingot';
  if (lower === 'netherite scrap') return 'Netherite Scrap';
  if (lower === 'netherite ingot') return 'Netherite Ingot';
  if (lower === 'nether star') return 'Nether Star';
  if (lower === 'eye of ender') return 'Eye of Ender';
  if (lower === 'ender pearl') return 'Ender Pearl';
  if (lower === 'enchanting table') return 'Enchanting Table';
  if (lower === 'brewing stand') return 'Brewing Stand';
  if (lower === 'blaze rod') return 'Blaze Rod';
  if (lower === 'blaze powder') return 'Blaze Powder';

  // Capitalize words
  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Fetch authentic Minecraft item/block PNG sprite from Minecraft Wiki
 * @param {string} rawName
 * @returns {Promise<import('@napi-rs/canvas').Image|null>}
 */
async function fetchItemTexture(rawName) {
  if (!rawName || rawName.trim() === '' || rawName === ' ') return null;

  const wikiTitle = normalizeItemName(rawName);

  if (textureCache.has(wikiTitle)) {
    return textureCache.get(wikiTitle);
  }

  try {
    const apiUrl = `https://minecraft.wiki/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&pithumbsize=128&format=json`;
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'GandalfTheBot/1.0 (contact@example.com)' },
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      const page = Object.values(data.query?.pages || {})[0];
      const thumbUrl = page?.thumbnail?.source;

      if (thumbUrl) {
        const imgRes = await fetch(thumbUrl, {
          headers: { 'User-Agent': 'GandalfTheBot/1.0 (contact@example.com)' },
          signal: AbortSignal.timeout(4000)
        });

        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const img = await loadImage(buf);
          textureCache.set(wikiTitle, img);
          return img;
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch texture for ${wikiTitle}:`, err.message);
  }

  return null;
}

/**
 * Draw a Minecraft Inset Slot
 */
function drawSlot(ctx, x, y, size) {
  // Dark inner shadow (top and left)
  ctx.fillStyle = '#373737';
  ctx.fillRect(x, y, size, size);

  // Bottom and right highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 2, y + 2, size - 2, size - 2);

  // Slot interior (Minecraft GUI gray)
  ctx.fillStyle = '#8B8B8B';
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
}

/**
 * Draw fallback item shape if texture download fails
 */
function drawFallbackItem(ctx, itemName, x, y, size) {
  ctx.fillStyle = '#64748B';
  ctx.fillRect(x + 8, y + 8, size - 16, size - 16);
  ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.fillText(itemName.slice(0, 7), x + size / 2 + 1, y + size / 2 + 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(itemName.slice(0, 7), x + size / 2, y + size / 2 + 2);
}

/**
 * Generate a full authentic Minecraft Crafting Table GUI image with real item sprites
 * @param {string} recipeName
 * @param {string[][]} grid - 3x3 array of item names
 * @param {string} output - output item name
 * @returns {Promise<AttachmentBuilder>}
 */
async function generateCraftingTableImage(recipeName, grid, output) {
  const width = 560;
  const height = 260;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Pre-fetch all unique items in grid and output
  const uniqueItems = new Set();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const item = grid[r]?.[c]?.trim();
      if (item && item !== '') uniqueItems.add(item);
    }
  }
  const cleanOutput = output.replace(/^\d+x\s*/i, '').trim();
  uniqueItems.add(cleanOutput);

  // Fetch all textures in parallel
  await Promise.all([...uniqueItems].map(item => fetchItemTexture(item)));

  // 1. Minecraft GUI Background (#C6C6C6)
  ctx.fillStyle = '#C6C6C6';
  ctx.fillRect(0, 0, width, height);

  // Outer Bevel (Classic Minecraft window border)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, 4); // top
  ctx.fillRect(0, 0, 4, height); // left
  ctx.fillStyle = '#555555';
  ctx.fillRect(0, height - 4, width, 4); // bottom
  ctx.fillRect(width - 4, 0, 4, height); // right

  // Outer dark border
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // 2. Title Header: "Crafting"
  ctx.font = 'bold 18px "Segoe UI", Tahoma, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3F3F3F';
  ctx.fillText('Crafting Table', 24, 30);

  // Recipe Name Subtitle
  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText(`Formula: ${recipeName}`, 200, 30);

  // 3. Render 3x3 Crafting Grid
  const slotSize = 54;
  const slotSpacing = 4;
  const startX = 32;
  const startY = 48;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = startX + col * (slotSize + slotSpacing);
      const sy = startY + row * (slotSize + slotSpacing);

      // Draw slot frame
      drawSlot(ctx, sx, sy, slotSize);

      // Draw item inside slot
      const item = grid[row] && grid[row][col] ? grid[row][col].trim() : '';
      if (item && item !== '') {
        const texture = textureCache.get(normalizeItemName(item));
        if (texture) {
          // Draw real Minecraft sprite
          const spritePad = 6;
          const spriteSize = slotSize - (spritePad * 2);
          ctx.drawImage(texture, sx + spritePad, sy + spritePad, spriteSize, spriteSize);
        } else {
          drawFallbackItem(ctx, item, sx, sy, slotSize);
        }
      }
    }
  }

  // 4. Draw Crafting Arrow (pointing right)
  const arrowX = 240;
  const arrowY = 120;

  ctx.fillStyle = '#8B8B8B';
  // Arrow body
  ctx.fillRect(arrowX, arrowY - 8, 36, 16);
  // Arrow tip
  ctx.beginPath();
  ctx.moveTo(arrowX + 36, arrowY - 18);
  ctx.lineTo(arrowX + 54, arrowY);
  ctx.lineTo(arrowX + 36, arrowY + 18);
  ctx.closePath();
  ctx.fill();

  // Arrow 3D highlight/shadow
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(arrowX, arrowY - 8, 36, 2);
  ctx.fillStyle = '#373737';
  ctx.fillRect(arrowX, arrowY + 6, 36, 2);

  // 5. Output Slot (Larger 68x68 Slot)
  const outX = 330;
  const outY = 100;
  const outSize = 68;

  drawSlot(ctx, outX, outY, outSize);

  // Highlight border for output slot
  ctx.strokeStyle = '#FFAA00';
  ctx.lineWidth = 2;
  ctx.strokeRect(outX - 2, outY - 2, outSize + 4, outSize + 4);

  // Draw Result Item Sprite
  const outputTexture = textureCache.get(normalizeItemName(cleanOutput));
  if (outputTexture) {
    const outPad = 8;
    const outSpriteSize = outSize - (outPad * 2);
    ctx.drawImage(outputTexture, outX + outPad, outY + outPad, outSpriteSize, outSpriteSize);
  } else {
    drawFallbackItem(ctx, cleanOutput, outX, outY, outSize);
  }

  // Item Stack Count in bottom right (like Minecraft item count)
  const countMatch = output.match(/^(\d+)x/i);
  const count = countMatch ? countMatch[1] : '1';
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#3F3F3F';
  ctx.fillText(count, outX + outSize - 3, outY + outSize - 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(count, outX + outSize - 5, outY + outSize - 5);

  // 6. Output Label
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#222222';
  ctx.fillText(`Result: ${output}`, outX + outSize + 16, outY + 30);

  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('Craft in 3x3 Grid', outX + outSize + 16, outY + 50);

  const buffer = canvas.toBuffer('image/png');
  return new AttachmentBuilder(buffer, { name: 'crafting-table.png' });
}

module.exports = {
  generateCraftingTableImage,
  fetchItemTexture
};
