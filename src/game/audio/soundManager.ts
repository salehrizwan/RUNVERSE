/**
 * RUNVERSE Procedural Web Audio Engine
 * Zero external audio files, 100% synthesized in real time.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private musicIntervalId: number | null = null;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.7;
  private stepIndex: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public ensureContext(): void {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (this.ctx) {
      if (this.musicGain) {
        this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
      }
    }
  }

  public playClick(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playJump(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);

    gain.gain.setValueAtTime(0.45 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playSlide(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.25);

    gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playCoin(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    
    // First high chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    gain1.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.13);

    // Second octave sparkle
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.05); // E6
    gain2.gain.setValueAtTime(0.35 * this.sfxVolume, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.21);
  }

  public playPowerUp(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    const chords = [330, 440, 554, 659, 880];
    chords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playCrash(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    
    // Low rumble boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.45);

    gain.gain.setValueAtTime(0.6 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playGameOver(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    const notes = [440, 392, 349, 293];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.14;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.4 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playVictoryFanfare(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.sfxVolume <= 0) return;

    const now = this.ctx.currentTime;
    // Ascending celebratory fanfare: C4, E4, G4, C5, high triumphant chord
    const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    arpeggio.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.32);
    });

    // Sustained high victory chord at end
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + 0.65;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.95);
    });
  }

  public startMusic(): void {
    if (this.isMusicPlaying) return;
    this.ensureContext();
    this.isMusicPlaying = true;
    this.stepIndex = 0;

    // 130 BPM Cyberpunk / Synthwave loop (16th notes = ~115ms)
    const stepTimeMs = 120;
    const notes = [
      // Synth arpeggio sequence in D minor / Cyberpunk scale
      220, 261.63, 293.66, 349.23, 293.66, 440, 392, 349.23,
      220, 261.63, 293.66, 440, 523.25, 440, 392, 329.63
    ];
    const bassNotes = [110, 110, 110, 110, 98, 98, 98, 98, 87.31, 87.31, 87.31, 87.31, 98, 98, 110, 110];

    this.musicIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.musicVolume <= 0) return;
      
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      this.stepIndex++;

      // Synth Arp Note
      const arpFreq = notes[step];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(arpFreq, now);

      gain.gain.setValueAtTime(0.08 * this.musicVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.11);

      // Bass note on every 4th step or 8th
      if (step % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassNotes[step], now);

        bassGain.gain.setValueAtTime(0.18 * this.musicVolume, now);
        bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.23);
      }

      // Synth Kick drum on beat 0, 4, 8, 12
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        kickGain.gain.setValueAtTime(0.25 * this.musicVolume, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);

        kickOsc.start(now);
        kickOsc.stop(now + 0.11);
      }

      // Snare / clap on beat 4, 12
      if (step === 4 || step === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(260, now);
        snareGain.gain.setValueAtTime(0.12 * this.musicVolume, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain);

        snareOsc.start(now);
        snareOsc.stop(now + 0.09);
      }
    }, stepTimeMs);
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}

export const soundManager = new SoundEngine();
