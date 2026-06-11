import { Preferences, DEFAULT_PREFERENCES, BREATHING_PRESETS } from '../types';
import { loadPreferences, savePreferences } from '../utils/storage';

export interface ControlPanelEvents {
  onDurationChange: (minutes: number) => void;
  onPresetChange: (preset: string) => void;
  onAnimationModeChange: (mode: 'breathing' | 'uniform') => void;
  onToggleAudio: (enabled: boolean) => void;
  onToggleSubtitles: (enabled: boolean) => void;
  onToggleBloom: (enabled: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onScreenshot: () => void;
}

export class ControlPanel {
  public container: HTMLElement;
  private prefs: Preferences;
  private events: ControlPanelEvents;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private showAdvanced: boolean = false;

  private topBar!: HTMLDivElement;
  private timerDisplay!: HTMLDivElement;
  private breathingIndicator!: HTMLDivElement;
  private progressRing!: HTMLDivElement;
  private bottomControls!: HTMLDivElement;
  private fpsIndicator!: HTMLDivElement;

  private timerMain!: HTMLDivElement;
  private timerLabel!: HTMLDivElement;

  constructor(container: HTMLElement, events: ControlPanelEvents) {
    this.container = container;
    this.prefs = loadPreferences();
    this.events = events;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';

    this.topBar = document.createElement('div');
    this.topBar.className = 'top-bar';
    this.container.appendChild(this.topBar);

    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.innerHTML = `
      <div class="brand-logo">🪷</div>
      <div class="brand-text">
        <h1>莲花冥想</h1>
        <p>LOTUS MEDITATION</p>
      </div>
    `;
    this.topBar.appendChild(brand);

    this.timerDisplay = document.createElement('div');
    this.timerDisplay.className = 'timer-display';
    this.timerDisplay.innerHTML = `
      <div class="timer-main">00:00</div>
      <div class="timer-label">已冥想</div>
    `;
    this.topBar.appendChild(this.timerDisplay);
    this.timerMain = this.timerDisplay.querySelector('.timer-main') as HTMLDivElement;
    this.timerLabel = this.timerDisplay.querySelector('.timer-label') as HTMLDivElement;

    this.fpsIndicator = document.createElement('div');
    this.fpsIndicator.className = 'fps-indicator';
    this.fpsIndicator.textContent = '-- FPS';
    this.topBar.appendChild(this.fpsIndicator);

    this.breathingIndicator = document.createElement('div');
    this.breathingIndicator.className = 'breathing-indicator';
    this.breathingIndicator.innerHTML = `
      <div class="breathing-circle"></div>
      <div class="breathing-text">呼吸</div>
    `;
    this.container.appendChild(this.breathingIndicator);

    this.progressRing = document.createElement('div');
    this.progressRing.className = 'progress-ring';
    this.progressRing.innerHTML = `
      <svg width="80" height="80">
        <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
        <circle class="progress-ring-bar" cx="40" cy="40" r="35" fill="none"
          stroke="url(#progressGradient)" stroke-width="3" stroke-linecap="round"
          stroke-dasharray="219.91" stroke-dashoffset="219.91"/>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffb7d5"/>
            <stop offset="100%" stop-color="#ff6b9d"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="progress-ring-text">
        <div class="value">0%</div>
        <div class="label">进度</div>
      </div>
    `;
    this.container.appendChild(this.progressRing);

    this.bottomControls = document.createElement('div');
    this.bottomControls.className = 'bottom-controls';
    this.container.appendChild(this.bottomControls);

    this.buildControlButtons();
    this.buildQuickSettings();
    this.buildAdvancedPanel();
  }

  private buildControlButtons(): void {
    const controls = document.createElement('div');
    controls.className = 'control-buttons';

    const btnReset = this.createIconButton('↺', '重置', () => this.events.onReset());
    const btnPlay = this.createIconButton('▶', '', () => this.handlePlayClick(), true);
    btnPlay.classList.add('btn-primary');
    const btnScreenshot = this.createIconButton('📷', '截图', () => this.events.onScreenshot());

    controls.appendChild(btnReset);
    controls.appendChild(btnPlay);
    controls.appendChild(btnScreenshot);
    this.bottomControls.appendChild(controls);
  }

  private createIconButton(icon: string, title: string, onClick: () => void, isPrimary: boolean = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = isPrimary ? 'btn btn-primary' : 'btn btn-icon';
    btn.innerHTML = icon;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildQuickSettings(): void {
    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    const durationOptions = [5, 10, 15, 20, 30];
    durationOptions.forEach((mins) => {
      const btn = document.createElement('button');
      btn.className = `settings-btn ${this.prefs.durationMinutes === mins ? 'active' : ''}`;
      btn.textContent = `${mins}分钟`;
      btn.dataset.duration = String(mins);
      btn.addEventListener('click', () => this.handleDurationSelect(mins));
      panel.appendChild(btn);
    });

    const sep1 = document.createElement('div');
    sep1.style.cssText = 'width:1px;background:rgba(255,255,255,0.1);margin:4px 0;';
    panel.appendChild(sep1);

    const btnAdvanced = document.createElement('button');
    btnAdvanced.className = `settings-btn ${this.showAdvanced ? 'active' : ''}`;
    btnAdvanced.textContent = '⚙ 高级';
    btnAdvanced.addEventListener('click', () => this.toggleAdvanced());
    panel.appendChild(btnAdvanced);

    this.bottomControls.appendChild(panel);
  }

  private buildAdvancedPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'advanced-panel';
    panel.style.display = this.showAdvanced ? 'flex' : 'none';

    const durationGroup = document.createElement('div');
    durationGroup.className = 'control-group';
    durationGroup.innerHTML = `
      <label>定课时长: <span class="duration-value">${this.prefs.durationMinutes}分钟</span></label>
      <input type="range" min="3" max="60" step="1" value="${this.prefs.durationMinutes}"/>
    `;
    const durationSlider = durationGroup.querySelector('input') as HTMLInputElement;
    const durationValue = durationGroup.querySelector('.duration-value') as HTMLSpanElement;
    durationSlider.addEventListener('input', () => {
      const val = parseInt(durationSlider.value, 10);
      durationValue.textContent = `${val}分钟`;
      this.handleDurationChange(val);
    });
    panel.appendChild(durationGroup);

    const presetGroup = document.createElement('div');
    presetGroup.className = 'control-group';
    const presetSelect = document.createElement('select');
    presetSelect.style.cssText = `
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      outline: none;
    `;
    Object.entries(BREATHING_PRESETS).forEach(([key, preset]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = preset.name;
      if (key === this.prefs.breathingPreset) opt.selected = true;
      presetSelect.appendChild(opt);
    });
    const presetLabel = document.createElement('label');
    presetLabel.textContent = '呼吸方式';
    presetGroup.appendChild(presetLabel);
    presetGroup.appendChild(presetSelect);
    presetSelect.addEventListener('change', () => this.handlePresetChange(presetSelect.value));
    panel.appendChild(presetGroup);

    const modeGroup = document.createElement('div');
    modeGroup.className = 'control-group';
    modeGroup.innerHTML = '<label>动画模式</label>';
    const modeBtns = document.createElement('div');
    modeBtns.style.cssText = 'display:flex;gap:4px;';
    const breathBtn = document.createElement('button');
    breathBtn.className = `settings-btn ${this.prefs.animationMode === 'breathing' ? 'active' : ''}`;
    breathBtn.textContent = '随呼吸';
    breathBtn.style.padding = '6px 12px';
    breathBtn.style.fontSize = '12px';
    breathBtn.addEventListener('click', () => this.handleModeChange('breathing'));
    const uniformBtn = document.createElement('button');
    uniformBtn.className = `settings-btn ${this.prefs.animationMode === 'uniform' ? 'active' : ''}`;
    uniformBtn.textContent = '匀速';
    uniformBtn.style.padding = '6px 12px';
    uniformBtn.style.fontSize = '12px';
    uniformBtn.addEventListener('click', () => this.handleModeChange('uniform'));
    modeBtns.appendChild(breathBtn);
    modeBtns.appendChild(uniformBtn);
    modeGroup.appendChild(modeBtns);
    modeGroup.dataset.breathBtn = '';
    modeGroup.dataset.uniformBtn = '';
    (modeGroup as any)._breathBtn = breathBtn;
    (modeGroup as any)._uniformBtn = uniformBtn;
    panel.appendChild(modeGroup);

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'control-group';
    toggleGroup.innerHTML = '<label>显示选项</label>';
    const toggles = document.createElement('div');
    toggles.style.cssText = 'display:flex;gap:4px;';
    const audioBtn = this.createToggle('🔊 音频', this.prefs.enableAudio, (v) => this.events.onToggleAudio(v));
    const subBtn = this.createToggle('📝 字幕', this.prefs.enableSubtitles, (v) => this.events.onToggleSubtitles(v));
    const bloomBtn = this.createToggle('✨ 光效', this.prefs.enableBloom, (v) => this.events.onToggleBloom(v));
    toggles.appendChild(audioBtn);
    toggles.appendChild(subBtn);
    toggles.appendChild(bloomBtn);
    toggleGroup.appendChild(toggles);
    panel.appendChild(toggleGroup);

    this.bottomControls.appendChild(panel);
    (this as any)._advancedPanel = panel;
  }

  private createToggle(label: string, initial: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `settings-btn ${initial ? 'active' : ''}`;
    btn.textContent = label;
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '12px';
    btn.addEventListener('click', () => {
      const isActive = !btn.classList.contains('active');
      btn.classList.toggle('active');
      onChange(isActive);
    });
    return btn;
  }

  private handlePlayClick(): void {
    if (!this.isPlaying) {
      if (this.isPaused) {
        this.isPaused = false;
        this.events.onResume();
      } else {
        this.events.onStart();
      }
      this.isPlaying = true;
      this.updatePlayButton();
    } else {
      this.isPlaying = false;
      this.isPaused = true;
      this.events.onPause();
      this.updatePlayButton();
    }
  }

  private updatePlayButton(): void {
    const btn = this.bottomControls.querySelector('.btn-primary') as HTMLButtonElement;
    if (!btn) return;
    if (this.isPlaying) {
      btn.innerHTML = '❚❚';
      btn.classList.add('playing');
    } else {
      btn.innerHTML = '▶';
      btn.classList.remove('playing');
    }
  }

  private handleDurationSelect(minutes: number): void {
    this.prefs.durationMinutes = minutes;
    savePreferences({ durationMinutes: minutes });
    this.events.onDurationChange(minutes);
    this.updateDurationButtons();
    const slider = (this as any)._advancedPanel?.querySelector('input[type="range"]') as HTMLInputElement;
    const valueLabel = (this as any)._advancedPanel?.querySelector('.duration-value') as HTMLSpanElement;
    if (slider) slider.value = String(minutes);
    if (valueLabel) valueLabel.textContent = `${minutes}分钟`;
  }

  private handleDurationChange(minutes: number): void {
    this.prefs.durationMinutes = minutes;
    savePreferences({ durationMinutes: minutes });
    this.events.onDurationChange(minutes);
    this.updateDurationButtons();
  }

  private updateDurationButtons(): void {
    const panel = this.bottomControls.querySelector('.settings-panel');
    if (!panel) return;
    panel.querySelectorAll('.settings-btn[data-duration]').forEach((btn) => {
      const b = btn as HTMLButtonElement;
      const dur = parseInt(b.dataset.duration || '0', 10);
      b.classList.toggle('active', dur === this.prefs.durationMinutes);
    });
  }

  private handlePresetChange(preset: string): void {
    this.prefs.breathingPreset = preset;
    savePreferences({ breathingPreset: preset });
    this.events.onPresetChange(preset);
  }

  private handleModeChange(mode: 'breathing' | 'uniform'): void {
    this.prefs.animationMode = mode;
    savePreferences({ animationMode: mode });
    this.events.onAnimationModeChange(mode);
    const advanced = (this as any)._advancedPanel;
    if (advanced) {
      (advanced as any)._breathBtn?.classList.toggle('active', mode === 'breathing');
      (advanced as any)._uniformBtn?.classList.toggle('active', mode === 'uniform');
    }
  }

  private toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
    const panel = (this as any)._advancedPanel as HTMLDivElement;
    if (panel) {
      panel.style.display = this.showAdvanced ? 'flex' : 'none';
    }
    const btns = this.bottomControls.querySelectorAll('.settings-btn');
    btns.forEach((b) => {
      if ((b as HTMLButtonElement).textContent?.includes('高级')) {
        b.classList.toggle('active', this.showAdvanced);
      }
    });
  }

  public updateTimer(elapsedSeconds: number, totalSeconds: number): void {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    this.timerMain.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
    const bar = this.progressRing.querySelector('.progress-ring-bar') as SVGCircleElement;
    const circumference = 219.91;
    if (bar) {
      bar.style.strokeDashoffset = String(circumference * (1 - progress));
    }
    const valueEl = this.progressRing.querySelector('.progress-ring-text .value') as HTMLDivElement;
    if (valueEl) {
      valueEl.textContent = `${Math.round(progress * 100)}%`;
    }
  }

  public updateBreathingPhase(phase: string): void {
    const circle = this.breathingIndicator.querySelector('.breathing-circle') as HTMLDivElement;
    if (!circle) return;
    circle.classList.remove('inhale', 'hold', 'exhale', 'rest');
    circle.classList.add(phase);
    const text = this.breathingIndicator.querySelector('.breathing-text') as HTMLDivElement;
    if (text) {
      const labels: Record<string, string> = {
        inhale: '吸气',
        hold: '屏息',
        exhale: '呼气',
        rest: '休息',
      };
      text.textContent = labels[phase] || '呼吸';
    }
  }

  public updateFPS(fps: number): void {
    this.fpsIndicator.textContent = `${Math.round(fps)} FPS`;
    if (fps < 30) {
      this.fpsIndicator.style.color = 'rgba(255, 107, 107, 0.8)';
    } else if (fps < 50) {
      this.fpsIndicator.style.color = 'rgba(255, 200, 100, 0.8)';
    } else {
      this.fpsIndicator.style.color = 'rgba(255,255,255,0.4)';
    }
  }

  public resetUI(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.updatePlayButton();
    this.updateTimer(0, this.prefs.durationMinutes * 60);
  }

  public getPreferences(): Preferences {
    return { ...this.prefs };
  }
}
