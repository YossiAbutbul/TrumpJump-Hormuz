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

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 480 * SS,
  height: 800 * SS,
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

// wait for the arcade font so Phaser does not cache fallback glyphs
const boot = () => { window.game = new Phaser.Game(config); };
if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load('20px "Luckiest Guy"'),
    new Promise(r => setTimeout(r, 1500)),
  ]).then(boot, boot);
} else {
  boot();
}
