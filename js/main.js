const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 800,
  backgroundColor: '#26224e',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1150 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, ShopScene, GameScene],
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
