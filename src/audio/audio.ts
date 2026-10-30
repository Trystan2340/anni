/**
 * audio.ts — moteur sonore 100 % procédural (WebAudio).
 * Aucun fichier audio n'est chargé : tout est synthétisé, donc aucune question de droits.
 * Les sons sont volontairement doux et courts ; la musique est une boucle de cloches
 * pentatoniques, coupée dès que l'onglet perd le focus.
 */

export type SfxName =
  | 'click'
  | 'hover'
  | 'swap'
  | 'invalid'
  | 'match'
  | 'combo'
  | 'drop'
  | 'line'
  | 'jump'
  | 'slide'
  | 'coin'
  | 'hit'
  | 'crash'
  | 'key'
  | 'deposit'
  | 'chest'
  | 'win'
  | 'lose'
  | 'open'
  | 'close';

type Ctx = AudioContext & { __unlocked?: boolean };

const STORAGE_KEY = 'christmas-quest:audio';

class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private unlocked = false;
  muted = false;
  musicEnabled = true;

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { muted?: boolean; musicEnabled?: boolean };
        this.muted = Boolean(parsed.muted);
        this.musicEnabled = parsed.musicEnabled !== false;
      }
    } catch {
      /* stockage indisponible */
    }
  }

  /** À appeler sur la première interaction utilisateur (politique navigateur). */
  unlock(): void {
    if (this.unlocked) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor() as Ctx;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.unlocked = true;
      if (this.musicEnabled) this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: this.muted, musicEnabled: this.musicEnabled }));
    } catch {
      /* ignore */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    this.persist();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.persist();
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  /** Note enveloppée : cloche (triangle + sinus) ou percussive (carré filtré). */
  private tone(freq: number, duration: number, options: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number; destination?: AudioNode } = {}): void {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + (options.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = options.type ?? 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    if (options.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, options.slideTo), start + duration);
    const peak = options.gain ?? 0.22;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(options.destination ?? this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noise(duration: number, options: { gain?: number; delay?: number; lowpass?: number } = {}): void {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + (options.delay ?? 0);
    const frames = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.lowpass ?? 1800;
    const gain = this.ctx.createGain();
    gain.gain.value = options.gain ?? 0.18;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
  }

  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'click':
        this.tone(660, 0.08, { type: 'sine', gain: 0.14 });
        break;
      case 'hover':
        this.tone(880, 0.05, { type: 'sine', gain: 0.05 });
        break;
      case 'swap':
        this.tone(520, 0.09, { gain: 0.12, slideTo: 700 });
        break;
      case 'invalid':
        this.tone(210, 0.16, { type: 'sawtooth', gain: 0.1, slideTo: 140 });
        break;
      case 'match':
        this.tone(880, 0.16, { gain: 0.16 });
        this.tone(1320, 0.2, { gain: 0.1, delay: 0.05 });
        break;
      case 'combo':
        this.tone(1046, 0.14, { gain: 0.14 });
        this.tone(1318, 0.16, { gain: 0.12, delay: 0.07 });
        this.tone(1568, 0.22, { gain: 0.1, delay: 0.14 });
        break;
      case 'drop':
        this.tone(320, 0.1, { type: 'square', gain: 0.08, slideTo: 220 });
        break;
      case 'line':
        this.noise(0.18, { gain: 0.12, lowpass: 2600 });
        this.tone(1180, 0.2, { gain: 0.12, delay: 0.02 });
        break;
      case 'jump':
        this.tone(420, 0.16, { gain: 0.12, slideTo: 780 });
        break;
      case 'slide':
        this.noise(0.22, { gain: 0.1, lowpass: 1200 });
        break;
      case 'coin':
        this.tone(1320, 0.07, { type: 'sine', gain: 0.12 });
        this.tone(1760, 0.1, { type: 'sine', gain: 0.09, delay: 0.05 });
        break;
      case 'hit':
        this.noise(0.2, { gain: 0.2, lowpass: 900 });
        this.tone(160, 0.18, { type: 'sawtooth', gain: 0.12, slideTo: 90 });
        break;
      case 'crash':
        this.noise(0.32, { gain: 0.24, lowpass: 1400 });
        this.tone(120, 0.3, { type: 'sawtooth', gain: 0.14, slideTo: 60 });
        break;
      case 'key':
        [1046, 1318, 1568, 2093].forEach((freq, index) =>
          this.tone(freq, 0.28, { gain: 0.13, delay: index * 0.09, type: 'triangle' }),
        );
        break;
      case 'deposit':
        this.tone(392, 0.2, { gain: 0.14 });
        this.tone(587, 0.26, { gain: 0.12, delay: 0.08 });
        this.tone(784, 0.34, { gain: 0.1, delay: 0.16 });
        break;
      case 'chest':
        this.noise(0.5, { gain: 0.14, lowpass: 700 });
        [523, 659, 784, 1046, 1318].forEach((freq, index) =>
          this.tone(freq, 0.5, { gain: 0.12, delay: index * 0.08, type: 'sine' }),
        );
        break;
      case 'win':
        [523, 659, 784, 1046, 1318, 1568].forEach((freq, index) =>
          this.tone(freq, 0.42, { gain: 0.13, delay: index * 0.085 }),
        );
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((freq, index) =>
          this.tone(freq, 0.3, { gain: 0.12, delay: index * 0.11, type: 'triangle' }),
        );
        break;
      case 'open':
        this.tone(520, 0.14, { gain: 0.1, slideTo: 860 });
        break;
      case 'close':
        this.tone(760, 0.12, { gain: 0.09, slideTo: 460 });
        break;
    }
  }

  /** Boucle musicale très douce : arpège pentatonique, 8 temps. */
  private startMusic(): void {
    if (!this.ctx || !this.musicGain || this.musicTimer !== null) return;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
    const bass = [130.81, 130.81, 174.61, 196.0];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.muted) return;
      const note = notes[this.musicStep % notes.length];
      this.tone(note, 0.9, { type: 'triangle', gain: 0.09, destination: this.musicGain });
      if (this.musicStep % 4 === 0) {
        const low = bass[Math.floor(this.musicStep / 4) % bass.length];
        this.tone(low, 1.6, { type: 'sine', gain: 0.08, destination: this.musicGain });
      }
      this.musicStep++;
    }, 480);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Coupe la musique quand l'onglet est masqué (courtoisie + performances). */
  handleVisibility(hidden: boolean): void {
    if (!this.musicEnabled) return;
    if (hidden) this.stopMusic();
    else if (this.unlocked) this.startMusic();
  }
}

export const audio = new AudioEngine();
