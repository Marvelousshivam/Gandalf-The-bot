const config = require('../../config');

/**
 * Calculates total XP required to reach a specific level
 * @param {number} level
 * @returns {number}
 */
function totalXpForLevel(level) {
  let total = 0;
  for (let l = 0; l < level; l++) {
    total += config.xp.levelFormula(l);
  }
  return total;
}

/**
 * Given a total XP amount, determine the current level and progress to next level
 * @param {number} totalXp
 * @returns {{ level: number, currentLevelXp: number, neededXp: number, percentage: number }}
 */
function getLevelProgress(totalXp) {
  let level = 0;
  let remainingXp = totalXp;

  while (true) {
    const cost = config.xp.levelFormula(level);
    if (remainingXp >= cost) {
      remainingXp -= cost;
      level++;
    } else {
      break;
    }
  }

  const neededXp = config.xp.levelFormula(level);
  const percentage = Math.min(100, Math.floor((remainingXp / neededXp) * 100));

  return {
    level,
    currentLevelXp: remainingXp,
    neededXp,
    percentage
  };
}

/**
 * Generate an ASCII progress bar
 * @param {number} percentage
 * @param {number} length
 * @returns {string} e.g. "[████████░░░░]"
 */
function createProgressBar(percentage, length = 12) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Get rank title for a level
 * @param {number} level
 * @returns {string}
 */
function getRankTitle(level) {
  let title = config.xp.ranks[0].title;
  for (const r of config.xp.ranks) {
    if (level >= r.level) title = r.title;
  }
  return title;
}

module.exports = {
  totalXpForLevel,
  getLevelProgress,
  createProgressBar,
  getRankTitle
};
