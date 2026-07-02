// Real voice clips, loaded from assets/voice/manifest.json when present.
// Drop mp3 files in assets/voice/ and list them per category in the manifest.
window.VOICE = {
  loaded: false,
  cats: {},
  lastAt: 0,

  init(scene) {
    if (this.loaded || this._tried) return;
    this._tried = true;
    fetch('assets/voice/manifest.json')
      .then(r => (r.ok ? r.json() : null))
      .then(man => {
        if (!man) return;
        Object.entries(man).forEach(([cat, files]) => {
          this.cats[cat] = [];
          (files || []).forEach(f => {
            const key = 'v-' + f;
            this.cats[cat].push(key);
            scene.load.audio(key, 'assets/voice/' + f);
          });
        });
        scene.load.once('complete', () => { this.loaded = true; });
        scene.load.start();
      })
      .catch(() => {});
  },

  play(scene, cat) {
    if (!this.loaded || window.SAVE.data.muted) return;
    const keys = this.cats[cat];
    if (!keys || !keys.length) return;
    if (scene.time.now - this.lastAt < 2500) return;
    this.lastAt = scene.time.now;
    try {
      scene.sound.play(Phaser.Utils.Array.GetRandom(keys), { volume: 1 });
    } catch (e) {}
  },
};
