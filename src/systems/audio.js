// Tiny WebAudio synth — no audio files needed.
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
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

  click()  { this.tone(700, 0.06, 'square', 0.05); }
  alarm()  {
    this.tone(880, 0.12, 'square', 0.06);
    setTimeout(() => this.tone(880, 0.12, 'square', 0.06), 180);
  }
  jump()   { this.tone(280, 0.13, 'square', 0.05, 560); }
  spring() { this.tone(200, 0.28, 'square', 0.07, 950); }
  coin() {
    this.tone(1100, 0.07, 'sine', 0.07);
    setTimeout(() => this.tone(1560, 0.12, 'sine', 0.06), 60);
  }
  power() {
    [440, 660, 880, 1320].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.13, 'triangle', 0.07), i * 70));
  }
  shield() {
    [660, 880, 660, 990].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.1, 'sine', 0.06), i * 60));
  }
  hit()  { this.tone(160, 0.3, 'sawtooth', 0.09, 55); }
  zap()  { this.tone(900, 0.15, 'sawtooth', 0.06, 200); }
  over() {
    [392, 311, 233, 130].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.28, 'sawtooth', 0.06), i * 160));
  }
}

window.SFX = new Sfx();
