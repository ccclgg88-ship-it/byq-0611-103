import * as THREE from 'three';
import { cubicBezier } from '../utils/easing';

export interface LotusFlowerConfig {
  petalCount: number;
  layers: number;
  petalWidth: number;
  petalHeight: number;
  petalThickness: number;
  maxOpenAngle: number;
  closedAngle: number;
  color: THREE.ColorRepresentation;
  innerColor: THREE.ColorRepresentation;
  cubicBezier: [number, number, number, number];
}

export const DEFAULT_LOTUS_CONFIG: LotusFlowerConfig = {
  petalCount: 12,
  layers: 3,
  petalWidth: 0.6,
  petalHeight: 1.6,
  petalThickness: 0.02,
  maxOpenAngle: Math.PI * 0.55,
  closedAngle: Math.PI * 1.35,
  color: 0xffb7d5,
  innerColor: 0xff6b9d,
  cubicBezier: [0.4, 0, 0.2, 1],
};

export class LotusFlower {
  public group: THREE.Group;
  private config: LotusFlowerConfig;
  private petals: THREE.Mesh[] = [];
  private petalPivots: THREE.Group[] = [];
  private petalInitialRotations: { x: number; y: number; z: number }[] = [];
  private currentOpenness: number = 0;
  private targetOpenness: number = 0;
  private easeFn: (t: number) => number;

  constructor(config: Partial<LotusFlowerConfig> = {}) {
    this.config = { ...DEFAULT_LOTUS_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = 'LotusFlower';
    this.easeFn = cubicBezier(...this.config.cubicBezier);
    this.buildFlower();
  }

  private createPetalGeometry(): THREE.BufferGeometry {
    const { petalWidth, petalHeight, petalThickness } = this.config;
    const shape = new THREE.Shape();

    const width = petalWidth;
    const height = petalHeight;
    const tipOffset = height * 0.15;

    shape.moveTo(0, 0);
    shape.bezierCurveTo(
      -width * 0.5, height * 0.1,
      -width * 0.7, height * 0.4,
      -width * 0.3, height * 0.75
    );
    shape.quadraticCurveTo(
      -width * 0.1, height * 0.9,
      0, height + tipOffset
    );
    shape.quadraticCurveTo(
      width * 0.1, height * 0.9,
      width * 0.3, height * 0.75
    );
    shape.bezierCurveTo(
      width * 0.7, height * 0.4,
      width * 0.5, height * 0.1,
      0, 0
    );

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: petalThickness,
      bevelEnabled: true,
      bevelThickness: petalThickness * 0.3,
      bevelSize: petalThickness * 0.3,
      bevelSegments: 3,
      curveSegments: 32,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -petalThickness / 2);
    geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();

    return geometry;
  }

  private createPetalMaterial(layer: number): THREE.MeshStandardMaterial {
    const layerProgress = layer / Math.max(1, this.config.layers - 1);
    const outerColor = new THREE.Color(this.config.color);
    const innerColor = new THREE.Color(this.config.innerColor);
    const petalColor = outerColor.clone().lerp(innerColor, layerProgress * 0.7);

    return new THREE.MeshStandardMaterial({
      color: petalColor,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      opacity: 0.95,
      emissive: petalColor.clone().multiplyScalar(0.08),
    });
  }

  private buildFlower(): void {
    const { petalCount, layers, closedAngle } = this.config;
    const petalGeometry = this.createPetalGeometry();

    for (let layer = 0; layer < layers; layer++) {
      const layerPetalCount = Math.round(petalCount * (1 - layer * 0.2));
      const layerScale = 1 - layer * 0.22;
      const layerHeight = layer * 0.15;
      const layerRotationOffset = layer * (Math.PI / layerPetalCount);

      for (let i = 0; i < layerPetalCount; i++) {
        const angle = (i / layerPetalCount) * Math.PI * 2 + layerRotationOffset;
        const material = this.createPetalMaterial(layer);

        const petalGroup = new THREE.Group();
        petalGroup.rotation.y = angle;
        petalGroup.position.y = layerHeight + 0.05;

        const petal = new THREE.Mesh(petalGeometry, material);
        petal.scale.set(layerScale, layerScale * 0.85, layerScale);

        const baseTilt = closedAngle - layer * 0.12;
        petal.rotation.x = baseTilt;

        petal.castShadow = true;
        petal.receiveShadow = true;
        petal.name = `Petal_L${layer}_${i}`;

        petalGroup.add(petal);
        this.petals.push(petal);
        this.petalInitialRotations.push({
          x: baseTilt,
          y: 0,
          z: 0,
        });
        this.petalPivots.push(petalGroup);
        this.group.add(petalGroup);
      }
    }

    const centerGeometry = new THREE.SphereGeometry(0.25, 24, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd93d,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0xffa500,
      emissiveIntensity: 0.3,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.1;
    center.scale.set(1, 0.6, 1);
    center.name = 'LotusCenter';
    this.group.add(center);

    const pedestalGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.15, 48);
    const pedestalMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a5298,
      roughness: 0.5,
      metalness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestal.position.y = -0.15;
    pedestal.receiveShadow = true;
    pedestal.name = 'LotusPedestal';
    this.group.add(pedestal);

    this.group.position.y = 0.3;
  }

  public setOpenness(target: number): void {
    this.targetOpenness = Math.max(0, Math.min(1, target));
  }

  public update(deltaTime: number, smoothFactor: number = 6): void {
    const diff = this.targetOpenness - this.currentOpenness;
    this.currentOpenness += diff * Math.min(1, deltaTime * smoothFactor);

    const easedT = this.easeFn(this.currentOpenness);
    const { maxOpenAngle, closedAngle } = this.config;
    const totalAngle = closedAngle - maxOpenAngle;

    for (let i = 0; i < this.petals.length; i++) {
      const petal = this.petals[i];
      const initial = this.petalInitialRotations[i];
      petal.rotation.x = initial.x - easedT * totalAngle;
    }

    const center = this.group.getObjectByName('LotusCenter') as THREE.Mesh;
    if (center) {
      const s = 1 + this.currentOpenness * 0.2;
      center.scale.set(s, s * 0.6, s);
      const mat = center.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + this.currentOpenness * 0.5;
    }
  }

  public getOpenness(): number {
    return this.currentOpenness;
  }

  public getPetalCount(): number {
    return this.petals.length;
  }

  public dispose(): void {
    const petalGeometry = this.petals[0]?.geometry;
    this.petals.forEach((petal) => {
      (petal.material as THREE.Material).dispose();
    });
    petalGeometry?.dispose();

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
