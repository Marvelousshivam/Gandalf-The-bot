const mcData = require('minecraft-data')('1.20.4');
const curatedRecipes = require('../data/recipes.json');

/**
 * Find crafting recipe for any item across Minecraft
 * @param {string} query
 * @returns {{ name: string, grid: string[][], output: string, notes?: string }|null}
 */
function findRecipe(query) {
  const cleanQuery = query.toLowerCase().trim();

  // 1. Check curated custom recipes first (for beacon, custom notes, etc.)
  const curated = curatedRecipes.find(r => r.name.toLowerCase().includes(cleanQuery));
  if (curated) return curated;

  // 2. Search official Minecraft Data
  const snakeQuery = cleanQuery.replace(/[\s-]+/g, '_');
  let item = mcData.itemsByName[snakeQuery];

  if (!item) {
    // Try matching display name
    item = Object.values(mcData.items).find(i =>
      i.displayName.toLowerCase().includes(cleanQuery) ||
      i.name.toLowerCase().includes(snakeQuery)
    );
  }

  if (!item) return null;

  const recipeList = mcData.recipes[item.id];
  if (!recipeList || !recipeList.length) return null;

  const r = recipeList[0];
  const grid = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
  ];

  if (r.inShape) {
    for (let row = 0; row < r.inShape.length; row++) {
      for (let col = 0; col < r.inShape[row].length; col++) {
        const id = r.inShape[row][col];
        if (id !== null && id !== undefined) {
          const ing = mcData.items[id];
          grid[row][col] = ing ? ing.displayName : ' ';
        }
      }
    }
  } else if (r.ingredients) {
    // Shapeless crafting
    r.ingredients.forEach((id, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const ing = mcData.items[id];
      if (ing && row < 3) grid[row][col] = ing.displayName;
    });
  }

  const count = r.result?.count || 1;
  return {
    name: item.displayName,
    grid,
    output: `${count}x ${item.displayName}`,
    notes: r.inShape ? 'Arrange items in the 3x3 grid as shown.' : 'Shapeless crafting. Place items anywhere on the crafting grid.'
  };
}

module.exports = { findRecipe };
