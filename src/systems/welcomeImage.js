const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

/**
 * Generate a Minecraft Title Screen styled welcome image
 * @param {import('discord.js').GuildMember} member
 * @param {number} memberCount
 * @returns {Promise<AttachmentBuilder|null>}
 */
async function generateWelcomeImage(member, memberCount) {
  try {
    const width = 850;
    const height = 440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw Minecraft Dirt Texture Background
    const tileSize = 32;
    const dirtPalette = ['#866043', '#775338', '#6b482f', '#5c3d26', '#4e331e'];

    // Seeded pseudo-random pattern for consistent aesthetic dirt look
    for (let x = 0; x < width; x += tileSize) {
      for (let y = 0; y < height; y += tileSize) {
        const colorIndex = (Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * dirtPalette.length) | 0;
        ctx.fillStyle = dirtPalette[colorIndex];
        ctx.fillRect(x, y, tileSize, tileSize);

        // Add subtle pixel flecks inside each tile
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(x + 4, y + 4, 8, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x + 16, y + 16, 6, 6);
      }
    }

    // 2. Dark vignette overlay (like Minecraft menu)
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 100,
      width / 2, height / 2, width / 1.6
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 3. Decorative Stone Border
    ctx.strokeStyle = '#373737';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.strokeStyle = '#8B8B8B';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // 4. Draw Logo / Server Banner ("MINECRAFT WEEK")
    ctx.textAlign = 'center';

    // "MINECRAFT" in classic embossed stone style
    ctx.font = 'bold 52px "Arial Black", Impact, sans-serif';
    // Shadow
    ctx.fillStyle = '#222222';
    ctx.fillText('MINECRAFT', width / 2 + 4, 84);
    // Dark bottom bevel
    ctx.fillStyle = '#666666';
    ctx.fillText('MINECRAFT', width / 2 + 2, 82);
    // Face color
    ctx.fillStyle = '#D9D9D9';
    ctx.fillText('MINECRAFT', width / 2, 80);

    // "WEEK" in Gold
    ctx.font = 'bold 36px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = '#402B00';
    ctx.fillText('W E E K', width / 2 + 3, 123);
    ctx.fillStyle = '#FFAA00';
    ctx.fillText('W E E K', width / 2, 120);

    // 5. Draw Avatar with Minecraft Block Frame
    const avatarSize = 110;
    const avatarX = width / 2 - avatarSize / 2;
    const avatarY = 145;

    // Stone Frame around Avatar
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(avatarX - 8, avatarY - 8, avatarSize + 16, avatarSize + 16);
    ctx.fillStyle = '#55FF55'; // Glowing MC green inner border
    ctx.fillRect(avatarX - 4, avatarY - 4, avatarSize + 8, avatarSize + 8);

    try {
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatarImg = await loadImage(avatarUrl);
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      // Fallback gray silhouette if avatar fails
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }

    // 6. Draw Member Name
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(member.user.displayName, width / 2 + 2, 292);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(member.user.displayName, width / 2, 290);

    // 7. Minecraft Classic Splash Text (Tilted Yellow text)
    const splashText = `✦ ${member.user.username} joined the game! ✦`;
    ctx.save();
    ctx.translate(width / 2, 335);
    ctx.rotate(-4 * (Math.PI / 180)); // 4 degree tilt
    ctx.font = 'bold 24px "Segoe UI", Tahoma, sans-serif';
    // Splash shadow
    ctx.fillStyle = '#3F3F00';
    ctx.fillText(splashText, 2, 2);
    // Splash main yellow
    ctx.fillStyle = '#FFFF55';
    ctx.fillText(splashText, 0, 0);
    ctx.restore();

    // 8. Bottom Button Style Info Card
    const btnW = 340;
    const btnH = 44;
    const btnX = width / 2 - btnW / 2;
    const btnY = 370;

    // Classic MC Button look (Gray bevel)
    ctx.fillStyle = '#000000';
    ctx.fillRect(btnX + 2, btnY + 2, btnW, btnH);
    ctx.fillStyle = '#4E4E4E';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#8B8B8B';
    ctx.fillRect(btnX + 2, btnY + 2, btnW - 4, 3); // top highlight
    ctx.fillStyle = '#222222';
    ctx.fillRect(btnX + 2, btnY + btnH - 5, btnW - 4, 3); // bottom shadow

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(`Adventurer #${memberCount} • Middle-earth awaits`, width / 2, btnY + 28);

    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'minecraft-welcome.png' });
  } catch (err) {
    console.error('Failed to generate welcome image:', err);
    return null;
  }
}

module.exports = { generateWelcomeImage };
