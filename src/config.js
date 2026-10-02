// Global constants (map, teams, layout, difficulty). Game content lives in src/data/.

export const MAP_W = 72;
export const MAP_H = 72;
export const SIDEBAR_W = 288;

export const TEAM = { PLAYER: 0, ENEMY: 1 };

// House colours (accents on top of each faction's chitin palette)
export const TEAMS = [
  { id: 0, name: 'Green Brood', primary: 0x4fbf2c, secondary: 0x2c6a1a, glow: 0x8dff4f, css: '#6fdc3c', dark: '#1f3d12' },
  { id: 1, name: 'Crimson Swarm', primary: 0xd0442a, secondary: 0x6e1e10, glow: 0xff7a3a, css: '#ec5a35', dark: '#4a1a0d' },
];

export const START_CREDITS = 10000;

// Tile types
export const TILE = { GRASS: 0, SOIL: 1, BRICK: 2, CONCRETE: 3 };
export const RES_MAX = 420; // nutrients per mineral tile

// AI tuning per difficulty
export const DIFFICULTY = {
  easy: { aiCredits: 6000, subsidy: 3, firstWave: 330, harassAt: 170, waveGrowth: 1, maxHarvesters: 1, waveGap: 150, swDelay: 240 },
  normal: { aiCredits: 9000, subsidy: 6, firstWave: 250, harassAt: 120, waveGrowth: 2, maxHarvesters: 2, waveGap: 115, swDelay: 90 },
  hard: { aiCredits: 14000, subsidy: 12, firstWave: 180, harassAt: 80, waveGrowth: 2, maxHarvesters: 3, waveGap: 90, swDelay: 20 },
};

export const LAYOUT = {
  playerHQ: { x: 51, z: 51 },
  enemyHQ: { x: 17, z: 17 },
  // enemy starting base (tile offsets from the construction yard origin), by role
  enemyBase: [
    ['power', 4, -1], ['power', 4, 2], ['refinery', -4, 4], ['barracks', -3, 0], ['factory', 0, 4],
    ['antiInf', 6, 6], ['antiArmor', 3, 8], ['antiArmor', 8, 1],
  ],
  fields: [
    { x: 59, z: 42, r: 3.6 },
    { x: 43, z: 61, r: 3.0 },
    { x: 11, z: 28, r: 3.6 },
    { x: 28, z: 10, r: 3.0 },
    { x: 36, z: 36, r: 4.4 },
    { x: 18, z: 56, r: 3.2 },
    { x: 56, z: 17, r: 3.2 },
  ],
};
