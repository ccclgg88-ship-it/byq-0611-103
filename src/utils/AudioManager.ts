export class AudioManager {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.3;
  private droneTimer: number | null = null;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.audioContext = new AC();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public start(): void {
    if (this.isPlaying) return;
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    this.isPlaying = true;
    this.createDrone();
    this.startBellInterval();
  }

  public stop(): void {
    this.isPlaying = false;
    this.clearOscillators();
    if (this.droneTimer !== null) {
      window.clearInterval(this.droneTimer);
      this.droneTimer = null;
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext?.currentTime || 0, 0.1);
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public playBell(): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const freqs = [528, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15 / (i + 1), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 4.1);
      this.oscillators.push(osc);
      this.gains.push(gain);
    });
  }

  private createDrone(): void {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;

    const baseFreqs = [110, 164.81, 220];
    baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.04 / (i + 1), ctx.currentTime + 2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      this.oscillators.push(osc);
      this.gains.push(gain);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + Math.random() * 0.2;
      lfoGain.gain.value = freq * 0.005;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      this.oscillators.push(lfo);
      this.gains.push(lfoGain);
    });
  }

  private startBellInterval(): void {
    this.playBell();
    this.droneTimer = window.setInterval(() => {
      if (this.isPlaying) {
        this.playBell();
      }
    }, 180000);
  }

  private clearOscillators(): void {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;
    this.gains.forEach((gain) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.3);
      } catch (e) {}
    });
    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
      });
      this.gains.forEach((gain) => {
        try { gain.disconnect(); } catch (e) {}
      });
      this.oscillators = [];
      this.gains = [];
    }, 500);
  }

  public dispose(): void {
    this.stop();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
  }
}
