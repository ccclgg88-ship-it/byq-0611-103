export interface BreathingPreset {
  name: string;
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
}

export const BREATHING_PRESETS: Record<string, BreathingPreset> = {
  '4-4-4': { name: '基础调息', inhale: 4, hold: 0, exhale: 4, rest: 0 },
  '4-4-4-4': { name: '方形呼吸', inhale: 4, hold: 4, exhale: 4, rest: 4 },
  '4-7-8': { name: '安眠呼吸', inhale: 4, hold: 7, exhale: 8, rest: 0 },
  '6-2-6': { name: '平衡呼吸', inhale: 6, hold: 2, exhale: 6, rest: 0 },
};

export interface LotusConfig {
  petalCount: number;
  maxOpenAngle: number;
  layers: number;
  animationMode: 'breathing' | 'uniform';
  breathingPreset: string;
  durationMinutes: number;
  cubicBezier: [number, number, number, number];
}

export interface SceneConfig {
  enableBloom: boolean;
  enableAudio: boolean;
  enableSubtitles: boolean;
  targetFPS: number;
}

export interface MeditationState {
  durationMinutes: number;
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  completed: boolean;
  startTime: number | null;
}

export interface SubtitleLine {
  text: string;
  startTime: number;
  duration: number;
}

export interface Preferences {
  durationMinutes: number;
  breathingPreset: string;
  animationMode: 'breathing' | 'uniform';
  enableBloom: boolean;
  enableAudio: boolean;
  enableSubtitles: boolean;
  petalCount: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  durationMinutes: 10,
  breathingPreset: '4-4-4-4',
  animationMode: 'breathing',
  enableBloom: true,
  enableAudio: true,
  enableSubtitles: true,
  petalCount: 12,
};
