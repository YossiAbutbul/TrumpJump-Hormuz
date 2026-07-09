// Tiny WebAudio synth — works with no audio files. Any sound can be replaced
// by a real file: drop assets/sfx/<name>.mp3 (e.g. quack.mp3, jet.mp3) and it
// is used instead of the synth version. jet.mp3 loops for the whole flight.
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.files = {};
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // probe assets/sfx/ for replacement files (called once from MenuScene);
  // whatever loads wins, everything else keeps the synth fallback
  initFiles(scene) {
    if (this._filesTried) return;
    this._filesTried = true;
    this.snd = scene.sound; // global sound manager, survives scene switches
    ['quack', 'jet', 'jump', 'spring', 'coin', 'power', 'shield',
     'hit', 'zap', 'over', 'click', 'alarm'].forEach(n => {
      const key = 'sfx-' + n;
      scene.load.audio(key, 'assets/sfx/' + n + '.mp3');
      scene.load.once('filecomplete-audio-' + key, () => { this.files[n] = key; });
    });
    scene.load.on('loaderror', () => {}); // missing files -> synth fallback
    scene.load.start();
  }

  mutedNow() {
    return this.muted || (window.SAVE && window.SAVE.data.muted);
  }

  // play a replacement file if one loaded; false = caller should synth
  playFile(name, opts) {
    if (!this.files[name] || !this.snd || this.mutedNow()) return false;
    try { this.snd.play(this.files[name], opts); return true; } catch (e) { return false; }
  }

  tone(freq, dur, type = 'square', vol = 0.07, slideTo = 0) {
    if (!this.ctx || this.muted || (window.SAVE && window.SAVE.data.muted)) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  click()  {
    if (this.playFile('click')) return;
    this.tone(700, 0.06, 'square', 0.05);
  }
  alarm()  {
    if (this.playFile('alarm')) return;
    this.tone(880, 0.12, 'square', 0.06);
    setTimeout(() => this.tone(880, 0.12, 'square', 0.06), 180);
  }
  jump()   {
    if (this.playFile('jump')) return;
    this.tone(280, 0.13, 'square', 0.05, 560);
  }
  spring() {
    if (this.playFile('spring')) return;
    this.tone(200, 0.28, 'square', 0.07, 950);
  }
  coin() {
    if (this.playFile('coin')) return;
    this.tone(1100, 0.07, 'sine', 0.07);
    setTimeout(() => this.tone(1560, 0.12, 'sine', 0.06), 60);
  }
  power() {
    if (this.playFile('power')) return;
    [440, 660, 880, 1320].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.13, 'triangle', 0.07), i * 70));
  }
  shield() {
    if (this.playFile('shield')) return;
    [660, 880, 660, 990].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.1, 'sine', 0.06), i * 60));
  }
  // duck bounce: nasal falling honk — two detuned sawtooths an octave apart
  quack() {
    if (this.playFile('quack', { volume: 0.35 })) return;
    this.tone(480, 0.14, 'sawtooth', 0.015, 190);
    this.tone(960, 0.14, 'sawtooth', 0.006, 380);
  }
  // looping flight sound — plays only when a real jet.mp3 is provided in
  // assets/sfx/ (no synth fallback; the rumble didn't sound good).
  // start/stop pair because flight length varies (upgrades, pause).
  jetStart() {
    if (this.mutedNow()) return;
    if (!this.files.jet || !this.snd || this.jetSound) return;
    try {
      this.jetSound = this.snd.add(this.files.jet, { loop: true, volume: 0.8 });
      this.jetSound.play();
    } catch (e) { this.jetSound = null; }
  }
  jetStop() {
    if (!this.jetSound) return;
    this.jetSound.stop();
    this.jetSound.destroy();
    this.jetSound = null;
  }
  hit()  {
    if (this.playFile('hit')) return;
    this.tone(160, 0.3, 'sawtooth', 0.09, 55);
  }
  zap()  {
    if (this.playFile('zap')) return;
    this.tone(900, 0.15, 'sawtooth', 0.06, 200);
  }
  over() {
    if (this.playFile('over')) return;
    [392, 311, 233, 130].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.28, 'sawtooth', 0.06), i * 160));
  }
}

window.SFX = new Sfx();
