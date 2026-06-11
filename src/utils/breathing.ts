import { BreathingPreset } from '../types';

export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export interface BreathingState {
  phase: BreathingPhase;
  phaseProgress: number;
  cycleProgress: number;
  expansion: number;
}

export class BreathingEngine {
  private preset: BreathingPreset;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private phaseIndex: number = 0;
  private phases: BreathingPhase[] = [];
  private phaseDurations: number[] = [];
  private cycleDuration: number = 0;

  constructor(preset: BreathingPreset) {
    this.preset = preset;
    this.buildPhaseSequence();
  }

  private buildPhaseSequence(): void {
    this.phases = [];
    this.phaseDurations = [];
    if (this.preset.inhale > 0) {
      this.phases.push('inhale');
      this.phaseDurations.push(this.preset.inhale);
    }
    if (this.preset.hold > 0) {
      this.phases.push('hold');
      this.phaseDurations.push(this.preset.hold);
    }
    if (this.preset.exhale > 0) {
      this.phases.push('exhale');
      this.phaseDurations.push(this.preset.exhale);
    }
    if (this.preset.rest > 0) {
      this.phases.push('rest');
      this.phaseDurations.push(this.preset.rest);
    }
    this.cycleDuration = this.phaseDurations.reduce((a, b) => a + b, 0);
  }

  setPreset(preset: BreathingPreset): void {
    this.preset = preset;
    this.buildPhaseSequence();
    this.phaseIndex = 0;
    if (this.isRunning) {
      this.startTime = performance.now() / 1000;
    }
  }

  start(): void {
    this.isRunning = true;
    this.startTime = performance.now() / 1000;
    this.phaseIndex = 0;
  }

  stop(): void {
    this.isRunning = false;
  }

  pause(): void {
    this.isRunning = false;
  }

  resume(): void {
    this.isRunning = true;
    this.startTime = performance.now() / 1000 - this.getElapsedInCycle();
  }

  private getElapsedInCycle(): number {
    if (this.cycleDuration === 0) return 0;
    const now = performance.now() / 1000;
    const elapsed = (now - this.startTime) % this.cycleDuration;
    return elapsed;
  }

  getState(): BreathingState {
    if (!this.isRunning || this.phases.length === 0) {
      return { phase: 'inhale', phaseProgress: 0, cycleProgress: 0, expansion: 0 };
    }

    let elapsed = this.getElapsedInCycle();
    let phaseStart = 0;
    let currentPhaseIdx = 0;

    for (let i = 0; i < this.phases.length; i++) {
      if (elapsed < phaseStart + this.phaseDurations[i]) {
        currentPhaseIdx = i;
        break;
      }
      phaseStart += this.phaseDurations[i];
    }

    const phaseElapsed = elapsed - phaseStart;
    const phaseProgress = this.phaseDurations[currentPhaseIdx] > 0
      ? phaseElapsed / this.phaseDurations[currentPhaseIdx]
      : 1;

    const cycleProgress = this.cycleDuration > 0 ? elapsed / this.cycleDuration : 0;

    let expansion = 0;
    const phase = this.phases[currentPhaseIdx];

    switch (phase) {
      case 'inhale':
        expansion = phaseProgress;
        break;
      case 'hold':
        expansion = 1;
        break;
      case 'exhale':
        expansion = 1 - phaseProgress;
        break;
      case 'rest':
        expansion = 0;
        break;
    }

    this.phaseIndex = currentPhaseIdx;

    return { phase, phaseProgress, cycleProgress, expansion };
  }

  getCycleDuration(): number {
    return this.cycleDuration;
  }
}
