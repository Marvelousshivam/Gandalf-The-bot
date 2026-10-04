const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Render 128x128 Face Avatar from a 64x64 or 64x32 skin buffer
 * @param {Buffer} skinBuffer
 * @returns {Promise<Buffer>}
 */
async function renderAvatar(skinBuffer) {
  const img = await loadImage(skinBuffer);
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Head base (8, 8, 8, 8) -> (0, 0, 128, 128)
  ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 128, 128);
  // Head hat overlay (40, 8, 8, 8) -> (0, 0, 128, 128)
  ctx.drawImage(img, 40, 8, 8, 8, 0, 0, 128, 128);

  return canvas.toBuffer('image/png');
}

/**
 * Render 256x512 Full 2D Body from a 64x64 or 64x32 skin buffer
 * @param {Buffer} skinBuffer
 * @returns {Promise<Buffer>}
 */
async function renderBody(skinBuffer) {
  const img = await loadImage(skinBuffer);
  const is64x64 = img.height >= 64;

  const canvas = createCanvas(256, 512);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const s = 16; // 16x scale for crisp pixel art

  // Head: (4*s, 0, 8*s, 8*s)
  ctx.drawImage(img, 8, 8, 8, 8, 4 * s, 0, 8 * s, 8 * s);
  ctx.drawImage(img, 40, 8, 8, 8, 4 * s, 0, 8 * s, 8 * s);

  // Torso: (4*s, 8*s, 8*s, 12*s)
  ctx.drawImage(img, 20, 20, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);
  if (is64x64) ctx.drawImage(img, 20, 36, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);

  // Right Arm: (0, 8*s, 4*s, 12*s)
  ctx.drawImage(img, 44, 20, 4, 12, 0, 8 * s, 4 * s, 12 * s);
  if (is64x64) ctx.drawImage(img, 44, 36, 4, 12, 0, 8 * s, 4 * s, 12 * s);

  // Left Arm: (12*s, 8*s, 4*s, 12*s)
  if (is64x64) {
    ctx.drawImage(img, 36, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
    ctx.drawImage(img, 52, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
  } else {
    // 64x32 skins mirror right arm
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, 44, 20, 4, 12, -(16 * s), 8 * s, 4 * s, 12 * s);
    ctx.restore();
  }

  // Right Leg: (4*s, 20*s, 4*s, 12*s)
  ctx.drawImage(img, 4, 20, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);
  if (is64x64) ctx.drawImage(img, 4, 36, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);

  // Left Leg: (8*s, 20*s, 4*s, 12*s)
  if (is64x64) {
    ctx.drawImage(img, 20, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
    ctx.drawImage(img, 4, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
  } else {
    // 64x32 skins mirror right leg
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, 4, 20, 4, 12, -(12 * s), 20 * s, 4 * s, 12 * s);
    ctx.restore();
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderAvatar,
  renderBody
};
