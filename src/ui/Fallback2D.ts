import { cubicBezier, clamp } from '../utils/easing';
import { BreathingPreset, BREATHING_PRESETS } from '../types';
import { BreathingEngine } from '../utils/breathing';

export interface Fallback2DOptions {
  petalCount?: number;
  maxOpenAngle?: number;
  breathingPreset?: string;
  animationMode?: 'breathing' | 'uniform';
  cubicBezier?: [number, number, number, number];
  size?: number;
}

export class Fallback2D {
  public container: HTMLElement;
  public svg: SVGSVGElement;
  public petals: SVGElement[] = [];
  private petalCount: number;
  private maxOpenAngle: number;
  private currentOpenness: number = 0;
  private targetOpenness: number = 0;
  private easeFn: (t: number) => number;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private animationMode: 'breathing' | 'uniform';
  private breathingEngine: BreathingEngine;
  private uniformTime: number = 0;
  private isRunning: boolean = false;
  private size: number;
  private layers: number = 3;

  constructor(container: HTMLElement, options: Fallback2DOptions = {}) {
    this.container = container;
    this.petalCount = clamp(options.petalCount || 12, 8, 32);
    this.maxOpenAngle = options.maxOpenAngle || 135;
    this.animationMode = options.animationMode || 'breathing';
    this.size = options.size || Math.min(container.clientWidth, container.clientHeight) * 0.6;
    this.easeFn = cubicBezier(...(options.cubicBezier || [0.4, 0, 0.2, 1]));

    const preset = BREATHING_PRESETS[options.breathingPreset || '4-4-4-4'];
    this.breathingEngine = new BreathingEngine(preset);

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '-300 -300 600 600');
    this.svg.setAttribute('width', String(this.size));
    this.svg.setAttribute('height', String(this.size));
    this.svg.style.cssText = `
      display: block;
      margin: 0 auto;
      filter: drop-shadow(0 0 40px rgba(255, 183, 213, 0.4));
    `;

    this.buildLotus();
    this.buildBackground();

    container.appendChild(this.svg);
    container.style.background = 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #2a1a4a 100%)';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';
  }

  private buildBackground(): void {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const skyGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    skyGradient.setAttribute('id', 'skyGlow');
    skyGradient.setAttribute('cx', '50%');
    skyGradient.setAttribute('cy', '50%');
    skyGradient.setAttribute('r', '50%');
    const skyStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    skyStop1.setAttribute('offset', '0%');
    skyStop1.setAttribute('stop-color', '#4a3266');
    skyStop1.setAttribute('stop-opacity', '0.6');
    const skyStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    skyStop2.setAttribute('offset', '100%');
    skyStop2.setAttribute('stop-color', '#0a0a2e');
    skyStop2.setAttribute('stop-opacity', '0');
    skyGradient.appendChild(skyStop1);
    skyGradient.appendChild(skyStop2);
    defs.appendChild(skyGradient);

    this.svg.appendChild(defs);

    const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glowCircle.setAttribute('cx', '0');
    glowCircle.setAttribute('cy', '50');
    glowCircle.setAttribute('r', '250');
    glowCircle.setAttribute('fill', 'url(#skyGlow)');
    this.svg.appendChild(glowCircle);

    const starsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    starsGroup.setAttribute('opacity', '0.6');
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 200 + Math.random() * 200;
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      star.setAttribute('cx', String(Math.cos(angle) * r));
      star.setAttribute('cy', String(Math.sin(angle) * r - 100));
      star.setAttribute('r', String(0.5 + Math.random() * 1.5));
      star.setAttribute('fill', '#ffffff');
      starsGroup.appendChild(star);
    }
    this.svg.appendChild(starsGroup);

    this.buildMountainSilhouette();
  }

  private buildMountainSilhouette(): void {
    const mountainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mountainGroup.setAttribute('transform', 'translate(0, 80)');

    const mountainBack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mountainBack.setAttribute(
      'd',
      this.generateMountainPath(-400, 50, 800, 180, 12, 0x2a1a4a)
    );
    mountainBack.setAttribute('fill', '#2a1a4a');
    mountainBack.setAttribute('opacity', '0.6');
    mountainGroup.appendChild(mountainBack);

    const mountainMid = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mountainMid.setAttribute(
      'd',
      this.generateMountainPath(-380, 80, 760, 140, 10, 0x5a3a7a)
    );
    mountainMid.setAttribute('fill', '#5a3a7a');
    mountainMid.setAttribute('opacity', '0.7');
    mountainGroup.appendChild(mountainMid);

    const meruPeak = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    meruPeak.setAttribute('transform', 'translate(0, -60)');

    const peak = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    peak.setAttribute('points', '0,-120 -30,0 30,0');
    peak.setAttribute('fill', '#ffd700');
    peak.setAttribute('opacity', '0.9');
    meruPeak.appendChild(peak);

    const mid = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    mid.setAttribute('points', '-30,0 -50,60 50,60 30,0');
    mid.setAttribute('fill', '#2a5298');
    mid.setAttribute('opacity', '0.85');
    meruPeak.appendChild(mid);

    const base = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    base.setAttribute('points', '-50,60 -80,120 80,120 50,60');
    base.setAttribute('fill', '#8b6914');
    base.setAttribute('opacity', '0.8');
    meruPeak.appendChild(base);

    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    halo.setAttribute('cx', '0');
    halo.setAttribute('cy', '-90');
    halo.setAttribute('rx', '40');
    halo.setAttribute('ry', '5');
    halo.setAttribute('fill', 'none');
    halo.setAttribute('stroke', '#fff8dc');
    halo.setAttribute('stroke-width', '2');
    halo.setAttribute('opacity', '0.7');
    meruPeak.appendChild(halo);

    mountainGroup.appendChild(meruPeak);
    this.svg.appendChild(mountainGroup);
  }

  private generateMountainPath(
    x: number,
    y: number,
    width: number,
    height: number,
    segments: number,
    _seedColor: number
  ): string {
    let path = `M ${x} ${y + height}`;
    const step = width / segments;
    for (let i = 0; i <= segments; i++) {
      const px = x + i * step;
      const noise = Math.sin(i * 1.7) * 0.3 + Math.sin(i * 3.1) * 0.2 + Math.cos(i * 2.3) * 0.15;
      const py = y + height * (0.3 + (noise * 0.5 + 0.5) * 0.7);
      if (i === 0) {
        path += ` L ${px} ${py}`;
      } else {
        const prevX = x + (i - 1) * step;
        const cpX = (prevX + px) / 2;
        path += ` Q ${cpX} ${py - height * 0.1} ${px} ${py}`;
      }
    }
    path += ` L ${x + width} ${y + height} Z`;
    return path;
  }

  private buildLotus(): void {
    const defs = this.svg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!this.svg.querySelector('defs')) {
      this.svg.insertBefore(defs, this.svg.firstChild);
    }

    const petalGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    petalGradient.setAttribute('id', 'petalGradient');
    petalGradient.setAttribute('x1', '0%');
    petalGradient.setAttribute('y1', '100%');
    petalGradient.setAttribute('x2', '0%');
    petalGradient.setAttribute('y2', '0%');
    const pgStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    pgStop1.setAttribute('offset', '0%');
    pgStop1.setAttribute('stop-color', '#ff6b9d');
    const pgStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    pgStop2.setAttribute('offset', '100%');
    pgStop2.setAttribute('stop-color', '#ffb7d5');
    petalGradient.appendChild(pgStop1);
    petalGradient.appendChild(pgStop2);
    defs.appendChild(petalGradient);

    const centerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    centerGlow.setAttribute('id', 'centerGlow');
    centerGlow.setAttribute('cx', '50%');
    centerGlow.setAttribute('cy', '50%');
    centerGlow.setAttribute('r', '50%');
    const cgStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    cgStop1.setAttribute('offset', '0%');
    cgStop1.setAttribute('stop-color', '#ffd93d');
    cgStop1.setAttribute('stop-opacity', '1');
    const cgStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    cgStop2.setAttribute('offset', '100%');
    cgStop2.setAttribute('stop-color', '#ffa500');
    cgStop2.setAttribute('stop-opacity', '0.3');
    centerGlow.appendChild(cgStop1);
    centerGlow.appendChild(cgStop2);
    defs.appendChild(centerGlow);

    const lotusGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    lotusGroup.setAttribute('transform', 'translate(0, 20)');
    lotusGroup.setAttribute('class', 'lotus-group');

    for (let layer = 0; layer < this.layers; layer++) {
      const layerCount = Math.round(this.petalCount * (1 - layer * 0.2));
      const layerScale = 1 - layer * 0.22;
      const rotationOffset = layer * (180 / layerCount);

      for (let i = 0; i < layerCount; i++) {
        const angle = (i / layerCount) * 360 + rotationOffset;
        const petal = this.createPetal(layer, layerScale, angle);
        this.petals.push(petal);
        lotusGroup.appendChild(petal);
      }
    }

    const center = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    center.setAttribute('cx', '0');
    center.setAttribute('cy', '0');
    center.setAttribute('rx', '25');
    center.setAttribute('ry', '18');
    center.setAttribute('fill', 'url(#centerGlow)');
    center.setAttribute('class', 'lotus-center');
    lotusGroup.appendChild(center);

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', '0');
    glow.setAttribute('cy', '0');
    glow.setAttribute('r', '60');
    glow.setAttribute('fill', 'url(#centerGlow)');
    glow.setAttribute('opacity', '0.25');
    glow.setAttribute('class', 'lotus-glow');
    lotusGroup.insertBefore(glow, lotusGroup.firstChild);

    this.svg.appendChild(lotusGroup);
  }

  private createPetal(layer: number, scale: number, angle: number): SVGElement {
    const petalGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    petalGroup.setAttribute('class', `petal layer-${layer}`);
    petalGroup.setAttribute('transform', `rotate(${angle})`);
    petalGroup.dataset.layer = String(layer);
    petalGroup.dataset.closedAngle = String(30 + layer * 8);
    petalGroup.dataset.maxAngle = String(this.maxOpenAngle - layer * 15);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const w = 35 * scale;
    const h = 140 * scale;
    const d = `
      M 0 0
      C ${-w} ${h * 0.15}, ${-w * 1.3} ${h * 0.45}, ${-w * 0.6} ${h * 0.75}
      Q ${-w * 0.2} ${h * 0.9}, 0 ${h}
      Q ${w * 0.2} ${h * 0.9}, ${w * 0.6} ${h * 0.75}
      C ${w * 1.3} ${h * 0.45}, ${w} ${h * 0.15}, 0 0
      Z
    `;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'url(#petalGradient)');
    path.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    path.setAttribute('stroke-width', '0.5');
    path.setAttribute('opacity', String(0.85 + layer * 0.05));

    petalGroup.appendChild(path);
    return petalGroup;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.breathingEngine.start();
    if (this.animationId === null) {
      this.animate();
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.breathingEngine.stop();
  }

  public pause(): void {
    this.isRunning = false;
    this.breathingEngine.pause();
  }

  public resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.breathingEngine.resume();
    if (this.animationId === null) {
      this.animate();
    }
  }

  public setOpenness(target: number): void {
    this.targetOpenness = clamp(target, 0, 1);
  }

  public setAnimationMode(mode: 'breathing' | 'uniform'): void {
    this.animationMode = mode;
  }

  public setBreathingPreset(presetKey: string): void {
    const preset = BREATHING_PRESETS[presetKey];
    if (preset) {
      this.breathingEngine.setPreset(preset);
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now() / 1000;
    const delta = this.lastFrameTime ? Math.min(now - this.lastFrameTime, 0.1) : 0;
    this.lastFrameTime = now;

    if (this.isRunning) {
      if (this.animationMode === 'breathing') {
        const state = this.breathingEngine.getState();
        this.targetOpenness = state.expansion;
      } else {
        this.uniformTime += delta;
        const cycleT = (this.uniformTime % 16) / 16;
        this.targetOpenness = cycleT < 0.5 ? cycleT * 2 : (1 - cycleT) * 2;
      }
    }

    const diff = this.targetOpenness - this.currentOpenness;
    this.currentOpenness += diff * Math.min(1, delta * 6);

    this.updatePetals();
  };

  private updatePetals(): void {
    const eased = this.easeFn(this.currentOpenness);

    this.petals.forEach((petal) => {
      const closed = parseFloat(petal.dataset.closedAngle || '30');
      const max = parseFloat(petal.dataset.maxAngle || String(this.maxOpenAngle));
      const tilt = closed + eased * (max - closed);
      const layer = parseInt(petal.dataset.layer || '0', 10);
      const lift = eased * (10 + layer * 3);

      const currentTransform = petal.getAttribute('transform') || '';
      const rotateMatch = currentTransform.match(/rotate\(([^)]+)\)/);
      const baseRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

      petal.style.transformOrigin = 'center bottom';
      petal.style.transform = `rotate(${baseRotation}deg) rotateX(${tilt - 90}deg) translateY(${-lift}px)`;
      petal.style.transition = 'none';
    });

    const center = this.svg.querySelector('.lotus-center') as SVGGElement | null;
    if (center) {
      const s = 1 + this.currentOpenness * 0.2;
      center.setAttribute('transform', `scale(${s})`);
    }

    const glow = this.svg.querySelector('.lotus-glow') as SVGGElement | null;
    if (glow) {
      const opacity = 0.15 + this.currentOpenness * 0.2;
      glow.setAttribute('opacity', String(opacity));
    }
  }

  public getOpenness(): number {
    return this.currentOpenness;
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.breathingEngine.stop();
    if (this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
  }
}
