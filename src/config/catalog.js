// Item catalog: every purchasable / selectable thing in the game.
//
// SKINS are the playable characters. Each skin is a folder under
// assets/skins/<dir>/ holding idle.png, fly.png and (optionally) hit.png.
// To add a character: drop the folder in, then add an entry here — no code
// changes needed. `trump` also has a procedural fallback drawn in gfx/textures.js.
window.CATALOG = {
  SKINS: {
    trump: { name: 'THE DONALD', price: 0, dir: 'trump', hit: true },
    disco: { name: 'DISCO KING', price: 2000, dir: 'disco', hit: true },
    cowboy: { name: 'COWBOY TRUMP', price: 2000, dir: 'cowboy', hit: true },
    santa: { name: 'SANTA TRUMP', price: 2500, dir: 'santa', hit: true },
    mummy: { name: 'MUMMY TRUMP', price: 2500, dir: 'mummy', hit: true },
    vampire: { name: 'VAMPIRE TRUMP', price: 2500, dir: 'vampire', hit: true },
    sumo: { name: 'SUMO TRUMP', price: 3000, dir: 'sumo', hit: true },
    zombie: { name: 'ZOMBIE TRUMP', price: 3000, dir: 'zombie', hit: true },
    Catwoman: { name: 'CATWOMAN', price: 3000, dir: 'catwoman', hit: true },
    // e.g. biden: { name: 'SLEEPY JOE', price: 400, dir: 'biden', hit: true },
  },
  MAPS: {
    sunset: {
      name: 'SUNSET GULF', price: 0,
      sky: ['#26224e', '#7a4a7a', '#e88a5d', '#f6c667'],
      sea: ['#2a6f9e', '#0c3352'],
      sun: 'sun', stars: false, cloudTint: 0xffffff,
    },
    night: {
      name: 'MIDNIGHT RAID', price: 250,
      sky: ['#040614', '#0d1530', '#16264d', '#20365f'],
      sea: ['#0d2b45', '#051624'],
      sun: 'moon', stars: true, cloudTint: 0x8899bb,
    },
    storm: {
      name: 'DESERT HAZE', price: 450,
      sky: ['#2e2a22', '#5c4a30', '#8a6a3e', '#c39a55'],
      sea: ['#3f5d5e', '#1c2f30'],
      sun: 'sun', stars: false, cloudTint: 0xa8956f,
    },
    dawn: {
      name: 'DAWN PATROL', price: 650,
      sky: ['#1a1436', '#4a3a6a', '#c96a8a', '#f4b48c'],
      sea: ['#3a6f95', '#123040'],
      sun: 'sun', stars: false, cloudTint: 0xffe0e8,
    },
    arctic: {
      name: 'ARCTIC FRONT', price: 850,
      sky: ['#08131f', '#1c3a52', '#3a6f92', '#8ac4dc'],
      sea: ['#2a7a9e', '#0c3a52'],
      sun: 'moon', stars: true, cloudTint: 0xd4ecfa,
    },
  },
  SHIPS: {
    classic: {
      name: 'CLASSIC FLEET', price: 0,
      hull: '#8a2f2b', hullDark: '#5f1f1c', boat: '#f0efe9', stripe: '#c93a35',
    },
    gold: {
      name: 'GOLD FLEET', price: 300,
      hull: '#b8860b', hullDark: '#8a6508', boat: '#f5d76e', stripe: '#a52a26',
    },
    stealth: {
      name: 'STEALTH FLEET', price: 550,
      hull: '#2e3440', hullDark: '#1c2128', boat: '#4c566a', stripe: '#222831',
    },
    navy: {
      name: 'NAVY FLEET', price: 700,
      hull: '#2a4a7a', hullDark: '#1a3050', boat: '#dce6f0', stripe: '#c93a35',
    },
    crimson: {
      name: 'CRIMSON FLEET', price: 950,
      hull: '#7a1a2a', hullDark: '#500f1c', boat: '#f0d2d2', stripe: '#f5c542',
    },
  },
  UPGRADES: {
    jet: { name: 'HAIR FORCE ONE', desc: '+0.5s flight per level', icon: 'cap' },
    dome: { name: 'GOLDEN DOME', desc: '+1.8s shield per level', icon: 'shield' },
    magnet: { name: 'MONEY MAGNET', desc: '+1.5s magnet per level', icon: 'magnet' },
  },
  UPGRADE_COST: [150, 400, 900],
};
