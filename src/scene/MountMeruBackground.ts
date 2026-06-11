import * as THREE from 'three';

export class MountMeruBackground {
  public group: THREE.Group;

  constructor(sceneSize: number = 200) {
    this.group = new THREE.Group();
    this.group.name = 'MountMeruBackground';
    this.build(sceneSize);
  }

  private build(sceneSize: number): void {
    const skyGeometry = new THREE.SphereGeometry(sceneSize * 2, 64, 64);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#0a0a2e');
    skyGradient.addColorStop(0.45, '#2a1a5a');
    skyGradient.addColorStop(0.5, '#4a3266');
    skyGradient.addColorStop(0.55, '#3a2a60');
    skyGradient.addColorStop(1, '#1a0a3a');
    skyCtx.fillStyle = skyGradient;
    skyCtx.fillRect(0, 0, 512, 512);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'SkyDome';
    this.group.add(sky);

    this.createMountainSilhouette(sceneSize, 0, 0.35, 0xffeedd, 0.015);
    this.createMountainSilhouette(sceneSize, 0.08, 0.5, 0xd4a574, 0.02);
    this.createMountainSilhouette(sceneSize, 0.15, 0.65, 0x8b6914, 0.025);
    this.createMountMeruPeak(sceneSize);
    this.createStars(sceneSize);
    this.createGroundPlane();
  }

  private createMountainSilhouette(
    sceneSize: number,
    yOffset: number,
    heightScale: number,
    color: number,
    roughness: number
  ): void {
    const points: THREE.Vector2[] = [];
    const segments = 128;
    const ringRadius = sceneSize * 0.85;
    const baseHeight = sceneSize * heightScale * 0.5;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noise = this.fbm(angle * 8, 0) * 0.5 + 0.5;
      const radius = ringRadius + (noise - 0.5) * sceneSize * 0.08;
      points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }

    const shape = new THREE.Shape(points);
    const hole = new THREE.Path();
    const innerRadius = ringRadius * 0.3;
    for (let i = segments; i >= 0; i--) {
      const angle = (i / segments) * Math.PI * 2;
      hole.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    }
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: baseHeight,
      bevelEnabled: false,
      curveSegments: 32,
    });

    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, yOffset * sceneSize, 0);

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.1,
      flatShading: true,
    });

    const mountains = new THREE.Mesh(geometry, material);
    mountains.name = `MountainRing_${yOffset.toFixed(2)}`;
    mountains.receiveShadow = true;
    this.group.add(mountains);
  }

  private createMountMeruPeak(sceneSize: number): void {
    const peakHeight = sceneSize * 0.55;
    const peakGroup = new THREE.Group();

    const peakGeometry = new THREE.ConeGeometry(sceneSize * 0.08, peakHeight, 8);
    const peakMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0xffa500,
      emissiveIntensity: 0.15,
    });
    const peak = new THREE.Mesh(peakGeometry, peakMaterial);
    peak.position.y = peakHeight * 0.55;
    peak.castShadow = true;
    peakGroup.add(peak);

    const midGeometry = new THREE.CylinderGeometry(
      sceneSize * 0.15,
      sceneSize * 0.22,
      peakHeight * 0.35,
      8
    );
    const midMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a5298,
      roughness: 0.5,
      metalness: 0.4,
    });
    const mid = new THREE.Mesh(midGeometry, midMaterial);
    mid.position.y = peakHeight * 0.15;
    mid.castShadow = true;
    peakGroup.add(mid);

    const baseGeometry = new THREE.CylinderGeometry(
      sceneSize * 0.35,
      sceneSize * 0.45,
      peakHeight * 0.3,
      8
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.6,
      metalness: 0.2,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -peakHeight * 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    peakGroup.add(base);

    const haloGeometry = new THREE.TorusGeometry(sceneSize * 0.12, sceneSize * 0.005, 16, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: 0.7,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.y = peakHeight * 0.75;
    halo.rotation.x = Math.PI / 2;
    peakGroup.add(halo);

    peakGroup.name = 'MountMeruPeak';
    this.group.add(peakGroup);
  }

  private createStars(sceneSize: number): void {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.6 + 0.1;
      const r = sceneSize * 0.92;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
    });

    const stars = new THREE.Points(geometry, material);
    stars.name = 'Stars';
    this.group.add(stars);
  }

  private createGroundPlane(): void {
    const groundGeometry = new THREE.CircleGeometry(80, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    ground.name = 'GroundPlane';
    this.group.add(ground);
  }

  private fbm(x: number, y: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < 4; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  }

  private noise(x: number, y: number): number {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
  }

  public update(time: number): void {
    const stars = this.group.getObjectByName('Stars') as THREE.Points;
    if (stars) {
      stars.rotation.y = time * 0.005;
    }
    const halo = this.group.getObjectByName('MountMeruPeak');
    if (halo) {
      const haloMesh = halo.children.find((c) => c.type === 'Mesh' && c.geometry.type === 'TorusGeometry') as THREE.Mesh;
      if (haloMesh) {
        const mat = haloMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.5 + Math.sin(time * 0.002) * 0.2;
      }
    }
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Points) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
