import { SubtitleLine } from '../types';

export const DEFAULT_SUBTITLES: SubtitleLine[] = [
  { text: '愿以此功德，普及于一切', startTime: 0, duration: 6 },
  { text: '我等与众生，皆共成佛道', startTime: 6, duration: 6 },
  { text: '心若莲花开，清净无尘埃', startTime: 12, duration: 6 },
  { text: '观身不净，观受是苦', startTime: 18, duration: 6 },
  { text: '观心无常，观法无我', startTime: 24, duration: 6 },
  { text: '诸恶莫作，众善奉行', startTime: 30, duration: 6 },
  { text: '自净其意，是诸佛教', startTime: 36, duration: 6 },
  { text: '一花一世界，一叶一如来', startTime: 42, duration: 6 },
  { text: '一念心清净，莲花处处开', startTime: 48, duration: 6 },
  { text: '菩提本无树，明镜亦非台', startTime: 54, duration: 6 },
  { text: '本来无一物，何处惹尘埃', startTime: 60, duration: 6 },
  { text: '应无所住，而生其心', startTime: 66, duration: 6 },
  { text: '色即是空，空即是色', startTime: 72, duration: 6 },
  { text: '受想行识，亦复如是', startTime: 78, duration: 6 },
  { text: '是诸法空相，不生不灭', startTime: 84, duration: 6 },
  { text: '不垢不净，不增不减', startTime: 90, duration: 6 },
  { text: '心无挂碍，无挂碍故', startTime: 96, duration: 6 },
  { text: '无有恐怖，远离颠倒梦想', startTime: 102, duration: 6 },
  { text: '究竟涅槃，三世诸佛', startTime: 108, duration: 6 },
  { text: '依般若波罗蜜多故', startTime: 114, duration: 6 },
  { text: '得阿耨多罗三藐三菩提', startTime: 120, duration: 6 },
  { text: '故知般若波罗蜜多', startTime: 126, duration: 6 },
  { text: '是大神咒，是大明咒', startTime: 132, duration: 6 },
  { text: '是无上咒，是无等等咒', startTime: 138, duration: 6 },
  { text: '能除一切苦，真实不虚', startTime: 144, duration: 6 },
  { text: '嗡嘛呢叭咪吽', startTime: 150, duration: 8 },
];

export interface SubtitleOverlayOptions {
  subtitles?: SubtitleLine[];
  loop?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export class SubtitleOverlay {
  public container: HTMLElement;
  public element: HTMLDivElement;
  private subtitles: SubtitleLine[];
  private loop: boolean;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private animationId: number | null = null;
  private currentIndex: number = -1;
  private offsetSeconds: number = 0;
  private fadeProgress: number = 0;

  constructor(container: HTMLElement, options: SubtitleOverlayOptions = {}) {
    this.container = container;
    this.subtitles = options.subtitles || DEFAULT_SUBTITLES;
    this.loop = options.loop ?? true;

    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: absolute;
      bottom: 220px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 800px;
      text-align: center;
      pointer-events: none;
      z-index: 15;
      transition: opacity 0.3s ease;
    `;

    const inner = document.createElement('div');
    inner.className = 'subtitle-text';
    inner.style.cssText = `
      font-size: ${options.fontSize || 24}px;
      color: ${options.color || '#ffffff'};
      font-family: ${options.fontFamily || '"PingFang SC", "Microsoft YaHei", "Noto Serif SC", serif'};
      font-weight: 300;
      letter-spacing: 0.08em;
      line-height: 1.8;
      text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 0 30px rgba(255,183,213,0.3);
      opacity: 0;
      transition: opacity 0.8s ease, transform 0.8s ease;
      transform: translateY(10px);
      padding: 20px 40px;
      background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.4) 70%, transparent);
      border-radius: 4px;
    `;
    this.element.appendChild(inner);

    container.appendChild(this.element);
    this.showWelcome();
  }

  private showWelcome(): void {
    const inner = this.element.querySelector('.subtitle-text') as HTMLElement;
    if (inner) {
      inner.textContent = '点击 ▶ 开始您的冥想之旅';
      inner.style.opacity = '0.85';
      inner.style.transform = 'translateY(0)';
    }
  }

  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() / 1000 - this.offsetSeconds;
    this.currentIndex = -1;
    this.tick();
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.offsetSeconds = performance.now() / 1000 - this.startTime;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resume(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() / 1000 - this.offsetSeconds;
    this.tick();
  }

  public reset(): void {
    this.pause();
    this.offsetSeconds = 0;
    this.currentIndex = -1;
    const inner = this.element.querySelector('.subtitle-text') as HTMLElement;
    if (inner) {
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(10px)';
    }
  }

  public seek(seconds: number): void {
    this.offsetSeconds = seconds;
    if (this.isPlaying) {
      this.startTime = performance.now() / 1000 - seconds;
    }
  }

  public setSubtitles(subtitles: SubtitleLine[]): void {
    this.subtitles = subtitles;
    this.reset();
  }

  public show(): void {
    this.element.style.opacity = '1';
  }

  public hide(): void {
    this.element.style.opacity = '0';
  }

  private tick = (): void => {
    if (!this.isPlaying) return;
    this.animationId = requestAnimationFrame(this.tick);

    const now = performance.now() / 1000;
    let elapsed = now - this.startTime;

    const totalDuration = this.getTotalDuration();
    if (this.loop && totalDuration > 0 && elapsed >= totalDuration) {
      elapsed = elapsed % totalDuration;
      this.startTime = now - elapsed;
      this.currentIndex = -1;
    }

    const activeIndex = this.findActiveIndex(elapsed);

    if (activeIndex !== this.currentIndex) {
      this.currentIndex = activeIndex;
      this.updateDisplay(elapsed);
    } else if (activeIndex >= 0) {
      this.updateFade(elapsed);
    }
  };

  private getTotalDuration(): number {
    if (this.subtitles.length === 0) return 0;
    const last = this.subtitles[this.subtitles.length - 1];
    return last.startTime + last.duration;
  }

  private findActiveIndex(elapsed: number): number {
    for (let i = this.subtitles.length - 1; i >= 0; i--) {
      const s = this.subtitles[i];
      if (elapsed >= s.startTime && elapsed < s.startTime + s.duration) {
        return i;
      }
    }
    return -1;
  }

  private updateDisplay(elapsed: number): void {
    const inner = this.element.querySelector('.subtitle-text') as HTMLElement;
    if (!inner) return;

    if (this.currentIndex >= 0 && this.currentIndex < this.subtitles.length) {
      const subtitle = this.subtitles[this.currentIndex];
      inner.textContent = subtitle.text;
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        inner.style.opacity = '1';
        inner.style.transform = 'translateY(0)';
      });
    } else {
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(10px)';
    }
  }

  private updateFade(elapsed: number): void {
    if (this.currentIndex < 0) return;
    const subtitle = this.subtitles[this.currentIndex];
    const inner = this.element.querySelector('.subtitle-text') as HTMLElement;
    if (!inner) return;

    const posInSub = elapsed - subtitle.startTime;
    const fadeInDuration = 0.8;
    const fadeOutDuration = 1.2;

    let opacity = 1;
    if (posInSub < fadeInDuration) {
      opacity = posInSub / fadeInDuration;
    } else if (posInSub > subtitle.duration - fadeOutDuration) {
      opacity = (subtitle.duration - posInSub) / fadeOutDuration;
    }

    inner.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  }

  public dispose(): void {
    this.pause();
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
