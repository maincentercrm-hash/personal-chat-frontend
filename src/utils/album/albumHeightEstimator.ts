/**
 * Estimate album height based on photo count
 * ✅ NEW: Simple fixed heights based on rows
 * - 1-2 photos (1 row): 200px grid
 * - 3-4 photos (2 rows): 400px grid
 * - 5-6 photos (2 rows): 400px grid
 * - 7-10 photos (3 rows): 600px grid
 */
export const estimateAlbumHeight = (photoCount: number): number => {
  // Base height: padding + caption + metadata
  const baseHeight = 100; // ~100px for spacing, caption, metadata

  // ✅ Fixed grid heights based on number of rows (200px per row)
  let gridHeight = 0;
  if (photoCount <= 2) {
    gridHeight = 200; // 1 row = 200px
  } else if (photoCount <= 6) {
    gridHeight = 400; // 2 rows = 400px
  } else {
    gridHeight = 600; // 3 rows = 600px
  }

  const totalHeight = baseHeight + gridHeight;

  console.log(`[AlbumHeight] ${photoCount} photos → ${gridHeight}px grid + ${baseHeight}px base = ${totalHeight}px total`);

  return totalHeight;
};
