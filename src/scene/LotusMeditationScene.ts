import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LotusFlower, DEFAULT_LOTUS_CONFIG, LotusFlowerConfig } from './LotusFlower';
import { MountMeruBackground } from './MountMeruBackground';
import { BreathingEngine } from '../utils/breathing';
import { BREATHING_PRESETS, MeditationState, LotusConfig } from '../types';
import { clamp, lerp } from '../utils/easing';
import { saveSession } from '../utils/storage';

export interface SceneEvents {
  onProgress?: (state: MeditationState) => void;
  onComplete?: () => void;
  onPhaseChange?: (phase: string) => void;
  onFPS?: (fps: number) => void;
}

export class LotusMeditationScene {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public composer: EffectComposer | null = null;
  public lotus: LotusFlower;
  public background: MountMeruBackground;
  public breathingEngine: BreathingEngine;
  public raycaster: THREE.Raycaster;
  public pointer: THREE.Vector2;

  private animationMode: 'breathing' | 'uniform';
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private fpsUpdateInterval: number = 0.5;

  private meditationState: MeditationState;
  private events: SceneEvents;
  private enableBloom: boolean;
  private isLowEndDevice: boolean;

  private cameraTargetPosition: THREE.Vector3;
  private cameraLookAtTarget: THREE.Vector3;
  private isFocusedOnLotus: boolean = false;

  private uniformAnimationTime: number = 0;
  private uniformCycleDuration: number = 16;

  constructor(
    container: HTMLElement,
    lotusConfig: Partial<LotusConfig> = {},
    events: SceneEvents = {}
  ) {
    this.container = container;
    this.events = events;
    this.enableBloom = true;
    this.isLowEndDevice = this.detectLowEndDevice();

    if (this.isLowEndDevice) {
      this.enableBloom = false;
    }

    this.animationMode = lotusConfig.animationMode || 'breathing';

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    const preset = BREATHING_PRESETS[lotusConfig.breathingPreset || '4-4-4-4'];
    this.breathingEngine = new BreathingEngine(preset);

    this.meditationState = {
      durationMinutes: clamp(lotusConfig.durationMinutes || 10, 3, 60),
      elapsedSeconds: 0,
      isRunning: false,
      isPaused: false,
      completed: false,
      startTime: null,
    };

    this.cameraTargetPosition = new THREE.Vector3(0, 2, 6);
    this.cameraLookAtTarget = new THREE.Vector3(0, 0.5, 0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.cameraTargetPosition);
    this.camera.lookAt(this.cameraLookAtTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isLowEndDevice,
      alpha: false,
      powerPreference: this.isLowEndDevice ? 'low-power' : 'high-performance',
    });
    this.renderer.setPixelRatio(this.isLowEndDevice ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();

    this.setupLights();

    this.lotus = new LotusFlower({
      petalCount: clamp(lotusConfig.petalCount || 12, 8, 50),
      layers: 3,
      cubicBezier: lotusConfig.cubicBezier || DEFAULT_LOTUS_CONFIG.cubicBezier,
    } as Partial<LotusFlowerConfig>);
    this.scene.add(this.lotus.group);

    this.background = new MountMeruBackground(150);
    this.scene.add(this.background.group);

    if (this.enableBloom) {
      this.setupPostProcessing();
    }

    this.setupEventListeners();
    this.animate();
  }

  private detectLowEndDevice(): boolean {
    const coreCount = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return isMobile || coreCount <= 4 || memory <= 2;
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.target.copy(this.cameraLookAtTarget);
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.6;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404080, 0.5);
    ambient.name = 'AmbientLight';
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2a1a4a, 0.4);
    hemi.name = 'HemisphereLight';
    this.scene.add(hemi);

    const directional = new THREE.DirectionalLight(0xfff4e0, 1.2);
    directional.position.set(5, 8, 5);
    directional.castShadow = true;
    directional.shadow.mapSize.width = this.isLowEndDevice ? 1024 : 2048;
    directional.shadow.mapSize.height = this.isLowEndDevice ? 1024 : 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -10;
    directional.shadow.camera.right = 10;
    directional.shadow.camera.top = 10;
    directional.shadow.camera.bottom = -10;
    directional.shadow.bias = -0.0005;
    directional.name = 'DirectionalLight';
    this.scene.add(directional);

    const lotusLight = new THREE.PointLight(0xffb7d5, 1.5, 8, 2);
    lotusLight.position.set(0, 1, 0);
    lotusLight.name = 'LotusPointLight';
    this.scene.add(lotusLight);

    const moonLight = new THREE.DirectionalLight(0x4444ff, 0.3);
    moonLight.position.set(-5, 6, -3);
    moonLight.name = 'MoonLight';
    this.scene.add(moonLight);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      0.6,
      0.4,
      0.85
    );
    bloomPass.name = 'BloomPass';
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.lotus.group, true);

    if (intersects.length > 0) {
      this.toggleLotusFocus();
    }
  };

  public toggleLotusFocus(): void {
    this.isFocusedOnLotus = !this.isFocusedOnLotus;
    if (this.isFocusedOnLotus) {
      this.cameraTargetPosition.set(0, 1.2, 3);
      this.cameraLookAtTarget.set(0, 0.6, 0);
    } else {
      this.cameraTargetPosition.set(0, 2, 6);
      this.cameraLookAtTarget.set(0, 0.5, 0);
    }
  }

  public startMeditation(): void {
    if (this.meditationState.completed) {
      this.reset();
    }
    this.meditationState.isRunning = true;
    this.meditationState.isPaused = false;
    this.meditationState.startTime = Date.now() - this.meditationState.elapsedSeconds * 1000;
    this.breathingEngine.start();
    if (this.animationId === null) {
      this.animate();
    }
  }

  public pauseMeditation(): void {
    this.meditationState.isPaused = true;
    this.meditationState.isRunning = false;
    this.breathingEngine.pause();
  }

  public resumeMeditation(): void {
    if (!this.meditationState.isPaused) return;
    this.meditationState.isPaused = false;
    this.meditationState.isRunning = true;
    this.meditationState.startTime = Date.now() - this.meditationState.elapsedSeconds * 1000;
    this.breathingEngine.resume();
    if (this.animationId === null) {
      this.animate();
    }
  }

  public reset(): void {
    this.meditationState.elapsedSeconds = 0;
    this.meditationState.isRunning = false;
    this.meditationState.isPaused = false;
    this.meditationState.completed = false;
    this.meditationState.startTime = null;
    this.lotus.setOpenness(0);
    this.uniformAnimationTime = 0;
  }

  public setDuration(minutes: number): void {
    this.meditationState.durationMinutes = clamp(minutes, 3, 60);
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

  public setBloomEnabled(enabled: boolean): void {
    if (this.isLowEndDevice && enabled) {
      console.warn('Bloom disabled on low-end device for performance');
      return;
    }
    this.enableBloom = enabled;
    if (enabled && !this.composer) {
      this.setupPostProcessing();
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now() / 1000;
    const deltaTime = this.lastFrameTime ? Math.min(now - this.lastFrameTime, 0.1) : 0;
    this.lastFrameTime = now;

    this.fpsAccumulator += deltaTime;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= this.fpsUpdateInterval) {
      const fps = this.fpsFrameCount / this.fpsAccumulator;
      this.events.onFPS?.(fps);
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
    }

    if (this.meditationState.isRunning && this.meditationState.startTime !== null) {
      this.meditationState.elapsedSeconds = (Date.now() - this.meditationState.startTime) / 1000;
      const totalSeconds = this.meditationState.durationMinutes * 60;

      if (this.meditationState.elapsedSeconds >= totalSeconds) {
        this.meditationState.elapsedSeconds = totalSeconds;
        this.meditationState.isRunning = false;
        this.meditationState.completed = true;
        saveSession({
          durationMinutes: this.meditationState.durationMinutes,
          completed: true,
        });
        this.events.onComplete?.();
        this.sendMessageToParent({
          type: 'meditation:complete',
          duration: this.meditationState.durationMinutes,
        });
      }

      this.events.onProgress?.({ ...this.meditationState });
    }

    let openness = 0.3;
    if (!this.meditationState.isRunning && !this.meditationState.isPaused) {
      openness = 0.3;
    } else if (this.animationMode === 'breathing') {
      const breathingState = this.breathingEngine.getState();
      openness = breathingState.expansion;
      this.events.onPhaseChange?.(breathingState.phase);
    } else {
      if (this.meditationState.isRunning || this.meditationState.isPaused === false) {
        this.uniformAnimationTime += deltaTime;
      }
      const cycleT = (this.uniformAnimationTime % this.uniformCycleDuration) / this.uniformCycleDuration;
      openness = cycleT < 0.5 ? cycleT * 2 : (1 - cycleT) * 2;
    }

    this.lotus.setOpenness(openness);
    this.lotus.update(deltaTime);

    const lotusLight = this.scene.getObjectByName('LotusPointLight') as THREE.PointLight;
    if (lotusLight) {
      lotusLight.intensity = 1 + openness * 1.5;
    }

    const smoothedPos = new THREE.Vector3().lerpVectors(
      this.camera.position,
      this.cameraTargetPosition,
      Math.min(1, deltaTime * 2)
    );
    this.camera.position.copy(smoothedPos);

    const smoothedTarget = new THREE.Vector3().lerpVectors(
      this.controls.target,
      this.cameraLookAtTarget,
      Math.min(1, deltaTime * 2)
    );
    this.controls.target.copy(smoothedTarget);

    this.controls.update();
    this.background.update(now * 1000);

    if (this.enableBloom && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  public captureScreenshot(width: number = 1920, height: number = 1080): string | null {
    const prevSize = new THREE.Vector2();
    const prevPixelRatio = this.renderer.getPixelRatio();
    this.renderer.getSize(prevSize);

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.enableBloom && this.composer) {
      this.composer.setSize(width, height);
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(this.renderer.domElement, 0, 0);

    const gradient = ctx.createLinearGradient(0, height - 80, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - 80, width, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('莲花冥想', 40, height - 40);

    ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const mins = Math.floor(this.meditationState.elapsedSeconds / 60);
    const secs = Math.floor(this.meditationState.elapsedSeconds % 60);
    ctx.fillText(`已冥想 ${mins}:${secs.toString().padStart(2, '0')}`, 40, height - 15);

    ctx.textAlign = 'right';
    ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Lotus Meditation · 心若莲花', width - 40, height - 25);

    const dataURL = canvas.toDataURL('image/png');

    this.renderer.setPixelRatio(prevPixelRatio);
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.camera.aspect = prevSize.x / prevSize.y;
    this.camera.updateProjectionMatrix();
    if (this.enableBloom && this.composer) {
      this.composer.setSize(prevSize.x, prevSize.y);
    }

    return dataURL;
  }

  private sendMessageToParent(message: any): void {
    try {
      if (window.parent !== window) {
        window.parent.postMessage(
          { source: 'lotus-meditation', ...message },
          '*'
        );
      }
    } catch (e) {
      console.warn('Failed to postMessage:', e);
    }
  }

  public getState(): MeditationState {
    return { ...this.meditationState };
  }

  public getIsLowEndDevice(): boolean {
    return this.isLowEndDevice;
  }

  public getPetalCount(): number {
    return this.lotus.getPetalCount();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);

    this.controls.dispose();
    this.lotus.dispose();
    this.background.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.composer) {
      this.composer.dispose();
    }
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    );
  } catch (e) {
    return false;
  }
}
