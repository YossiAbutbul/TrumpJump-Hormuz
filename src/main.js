// Supersample factor: render the backing store at SS× so HiDPI displays stay
// crisp. World coordinates remain 480×800 (see setupCamera); only the render
// resolution grows. All Text defaults to SS resolution so glyphs stay sharp
// under the camera zoom.
const SS = 2;
window.SS = SS;
// Sprites built from tex() are SS× their logical size; scale them down by this.
window.TEX_SCALE = 1 / SS;

Phaser.GameObjects.GameObjectFactory.register('text', function (x, y, text, style) {
  style = style || {};
  if (style.resolution === undefined) style.resolution = SS;
  // Only the weights in the fonts request exist (Anybody 800/900, Be Vietnam
  // Pro 500-700, JetBrains Mono 700). Canvas silently substitutes a fallback
  // face when asked for a weight that isn't there, so every text gets the
  // right one by default and scenes only override deliberately.
  if (style.fontStyle === undefined) {
    if (style.fontFamily === window.FONT) style.fontStyle = '900';
    else if (style.fontFamily === window.FONT_BODY) style.fontStyle = '600';
    else if (style.fontFamily === window.FONT_LABEL) style.fontStyle = '700';
  }
  const t = new Phaser.GameObjects.Text(this.scene, x, y, text, style);
  this.displayList.add(t);
  this.updateList.add(t);
  return t;
});

// Zooms the scene camera so a 480×800 world fills the SS× backing store.
// setOrigin(0,0) makes the zoom a pure top-left scale, so scrollFactor(0) HUD
// and the vertical-scroll logic keep working in logical coordinates.
window.setupCamera = (scene) => {
  scene.cameras.main.setOrigin(0, 0).setZoom(SS);
};

// The world is a fixed 480 units wide; its HEIGHT follows the device so a tall
// phone fills the screen instead of showing letterbox bands above and below.
// Clamped at both ends: below 1.6 the button stack has nowhere to go, and above
// 2.1 a very tall handset would see so far up the tower that it changes the
// game. Scenes read this back via this.scale.height, so nothing hardcodes 800.
const W_UNITS = 480;
const aspect = Phaser.Math.Clamp(
  (window.innerHeight || 800) / (window.innerWidth || 480), 1.6, 2.1
);
const H_UNITS = Math.round(W_UNITS * aspect);
window.W_UNITS = W_UNITS;
window.H_UNITS = H_UNITS;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W_UNITS * SS,
  height: H_UNITS * SS,
  backgroundColor: '#26224e',
  // subpixel rendering: rounding positions to whole pixels makes fast vertical
  // motion (jumps, jet flight) visibly step/jitter under the 2x camera zoom
  render: { roundPixels: false },
  physics: {
    default: 'arcade',
    // step physics with the render frame (not a fixed 60Hz tick) so motion is
    // perfectly smooth on 120/144Hz displays instead of juddering
    arcade: { gravity: { y: 650 }, debug: false, fixedStep: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    // #game parent already flex-centers the canvas; letting Phaser also center
    // it double-applies margins and shoves it off to one side on wide screens.
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  scene: [MenuScene, ShopScene, GameScene, LeaderboardScene],
};

// wait for the display + label faces so Phaser does not cache fallback glyphs
const boot = () => { window.game = new Phaser.Game(config); };
if (document.fonts && document.fonts.load) {
  Promise.race([
    Promise.all([
      document.fonts.load('900 20px "Anybody"'),
      document.fonts.load('700 12px "JetBrains Mono"'),
    ]),
    new Promise(r => setTimeout(r, 1500)),
  ]).then(boot, boot);
} else {
  boot();
}
