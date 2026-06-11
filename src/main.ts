import './styles.css';
import { LotusMeditationScene, checkWebGLSupport } from './scene/LotusMeditationScene';
import { SubtitleOverlay } from './ui/SubtitleOverlay';
import { Fallback2D } from './ui/Fallback2D';
import { ControlPanel } from './ui/ControlPanel';
import { AudioManager } from './utils/AudioManager';
import { loadPreferences, savePreferences, saveSession } from './utils/storage';
import { showCompletionModal, showScreenshotModal } from './ui/Modal';
import { MeditationState } from './types';

class App {
  private sceneContainer!: HTMLDivElement;
  private uiContainer!: HTMLDivElement;
  private loadingOverlay!: HTMLDivElement;

  private scene: LotusMeditationScene | null = null;
  private fallback: Fallback2D | null = null;
  private subtitles: SubtitleOverlay | null = null;
  private controls: ControlPanel | null = null;
  private audio: AudioManager = new AudioManager();

  private using3D: boolean = false;

  public async init(): Promise<void> {
    this.buildDOM();
    this.showLoading();

    const prefs = loadPreferences();

    this.using3D = checkWebGLSupport();

    if (this.using3D) {
      try {
        this.scene = new LotusMeditationScene(this.sceneContainer, prefs, {
          onProgress: (state) => this.onProgress(state),
          onComplete: () => this.onComplete(),
          onPhaseChange: (phase) => this.onPhaseChange(phase),
          onFPS: (fps) => this.onFPS(fps),
        });
        this.using3D = true;
      } catch (e) {
        console.warn('3D scene failed, falling back to 2D:', e);
        this.using3D = false;
      }
    }

    if (!this.using3D) {
      this.fallback = new Fallback2D(this.sceneContainer, prefs);
      this.fallback.start();
    }

    this.subtitles = new SubtitleOverlay(this.sceneContainer);
    if (!prefs.enableSubtitles) {
      this.subtitles.hide();
    }

    this.controls = new ControlPanel(this.uiContainer, {
      onDurationChange: (mins) => this.onDurationChange(mins),
      onPresetChange: (preset) => this.onPresetChange(preset),
      onAnimationModeChange: (mode) => this.onAnimationModeChange(mode),
      onToggleAudio: (enabled) => this.onToggleAudio(enabled),
      onToggleSubtitles: (enabled) => this.onToggleSubtitles(enabled),
      onToggleBloom: (enabled) => this.onToggleBloom(enabled),
      onStart: () => this.onStart(),
      onPause: () => this.onPause(),
      onResume: () => this.onResume(),
      onReset: () => this.onReset(),
      onScreenshot: () => this.onScreenshot(),
    });

    this.setupPostMessage();
    this.hideLoading();

    const state = this.scene ? this.scene.getState() : { elapsedSeconds: 0, durationMinutes: prefs.durationMinutes } as MeditationState;
    this.controls.updateTimer(state.elapsedSeconds, state.durationMinutes * 60);

    if (prefs.enableAudio) {
      this.audio.start();
    }

    console.log(`[LotusMeditation] Initialized with ${this.using3D ? 'WebGL 3D' : 'SVG 2D fallback'}, petals: ${this.scene?.getPetalCount() || prefs.petalCount}`);
  }

  private buildDOM(): void {
    const app = document.getElementById('app') as HTMLDivElement;
    app.innerHTML = '';

    this.sceneContainer = document.createElement('div');
    this.sceneContainer.className = 'scene-container';
    app.appendChild(this.sceneContainer);

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.uiContainer.style.pointerEvents = 'none';
    app.appendChild(this.uiContainer);

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    app.appendChild(this.loadingOverlay);
  }

  private showLoading(): void {
    this.loadingOverlay.style.display = 'flex';
  }

  private hideLoading(): void {
    this.loadingOverlay.style.display = 'none';
  }

  private onProgress(state: MeditationState): void {
    if (this.controls) {
      this.controls.updateTimer(state.elapsedSeconds, state.durationMinutes * 60);
    }
  }

  private onComplete(): void {
    this.audio.stop();
    this.subtitles?.pause();
    if (this.scene) {
      const screenshot = this.scene.captureScreenshot(1920, 1080);
      const state = this.scene.getState();
      showCompletionModal(state.durationMinutes, screenshot || undefined);
    }
  }

  private onPhaseChange(phase: string): void {
    if (this.controls) {
      this.controls.updateBreathingPhase(phase);
    }
  }

  private onFPS(fps: number): void {
    if (this.controls) {
      this.controls.updateFPS(fps);
    }
  }

  private onDurationChange(minutes: number): void {
    this.scene?.setDuration(minutes);
    if (this.controls) {
      const state = this.scene?.getState();
      this.controls.updateTimer(state?.elapsedSeconds || 0, minutes * 60);
    }
  }

  private onPresetChange(preset: string): void {
    this.scene?.setBreathingPreset(preset);
    this.fallback?.setBreathingPreset(preset);
    savePreferences({ breathingPreset: preset });
  }

  private onAnimationModeChange(mode: 'breathing' | 'uniform'): void {
    this.scene?.setAnimationMode(mode);
    this.fallback?.setAnimationMode(mode);
    savePreferences({ animationMode: mode });
  }

  private onToggleAudio(enabled: boolean): void {
    if (enabled) {
      this.audio.start();
    } else {
      this.audio.stop();
    }
    savePreferences({ enableAudio: enabled });
  }

  private onToggleSubtitles(enabled: boolean): void {
    if (enabled) {
      this.subtitles?.show();
      if (this.scene?.getState().isRunning) {
        this.subtitles?.resume();
      }
    } else {
      this.subtitles?.hide();
      this.subtitles?.pause();
    }
    savePreferences({ enableSubtitles: enabled });
  }

  private onToggleBloom(enabled: boolean): void {
    this.scene?.setBloomEnabled(enabled);
    savePreferences({ enableBloom: enabled });
  }

  private onStart(): void {
    this.scene?.startMeditation();
    this.fallback?.start();
    const prefs = this.controls?.getPreferences();
    if (prefs?.enableSubtitles) {
      this.subtitles?.reset();
      this.subtitles?.start();
    }
  }

  private onPause(): void {
    this.scene?.pauseMeditation();
    this.fallback?.pause();
    this.subtitles?.pause();
  }

  private onResume(): void {
    this.scene?.resumeMeditation();
    this.fallback?.resume();
    const prefs = this.controls?.getPreferences();
    if (prefs?.enableSubtitles) {
      this.subtitles?.resume();
    }
  }

  private onReset(): void {
    this.scene?.reset();
    this.fallback?.stop();
    this.fallback?.setOpenness(0);
    this.subtitles?.reset();
    this.controls?.resetUI();
    const prefs = this.controls?.getPreferences();
    if (prefs?.enableAudio) {
      this.audio.playBell();
    }
  }

  private onScreenshot(): void {
    if (this.scene) {
      const dataUrl = this.scene.captureScreenshot(1920, 1080);
      if (dataUrl) {
        showScreenshotModal(dataUrl);
      }
    }
  }

  private setupPostMessage(): void {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.source !== 'lotus-meditation-parent') return;

      switch (data.type) {
        case 'meditation:start':
          this.onStart();
          break;
        case 'meditation:pause':
          this.onPause();
          break;
        case 'meditation:resume':
          this.onResume();
          break;
        case 'meditation:reset':
          this.onReset();
          break;
        case 'meditation:setDuration':
          if (typeof data.duration === 'number') {
            this.onDurationChange(data.duration);
          }
          break;
        case 'breathing:setPreset':
          if (typeof data.preset === 'string') {
            this.onPresetChange(data.preset);
          }
          break;
        case 'breathing:phase':
          if (typeof data.phase === 'string') {
            this.onPhaseChange(data.phase);
          }
          break;
      }
    });

    const send = (msg: any) => {
      try {
        if (window.parent !== window) {
          window.parent.postMessage({ source: 'lotus-meditation', ...msg }, '*');
        }
      } catch (e) {}
    };

    send({ type: 'ready', using3D: this.using3D });
  }

  public dispose(): void {
    this.scene?.dispose();
    this.fallback?.dispose();
    this.subtitles?.dispose();
    this.audio.dispose();
  }
}

const app = new App();
app.init();

(window as any).__lotusApp = app;
