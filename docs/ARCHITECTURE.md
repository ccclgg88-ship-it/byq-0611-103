# Lotus Meditation Scene · 场景图层结构

```
DOM 层级
└── #app (100vw × 100vh, position: relative)
    ├── .scene-container (WebGL 画布 / SVG 容器)
    │   ├── <canvas> (WebGLRenderer.domElement)        z-index: 1
    │   │   或
    │   └── <svg> (Fallback2D)                         z-index: 1
    │
    ├── SubtitleOverlay (字幕层)                         z-index: 10
    │   └── .subtitle-text
    │
    ├── UI 层                                            z-index: 15–25
    │   ├── .breathing-indicator (呼吸指示灯)            z-index: 15
    │   ├── .progress-ring (进度环)                      z-index: 15
    │   ├── .top-bar (顶部品牌 + 计时器 + FPS)           z-index: 20
    │   ├── .bottom-controls (底部控制栏)                z-index: 20
    │   └── .fps-indicator                               z-index: 25
    │
    └── Modal 层 (完成弹窗 / 截图弹窗)                    z-index: 100
```

---

## Three.js 场景图层

```
Scene
├── 环境层
│   ├── SkyDome (球体 ShaderMaterial 渐变天空)
│   ├── Stars (Points, 1500 颗星)
│   ├── GroundPlane (CircleGeometry, 深色地面)
│   └── FogExp2 (0x0a0a2e, density 0.012)
│
├── 须弥山背景层
│   ├── MountainRing_0.00 (最外圈, 0xffeedd)
│   ├── MountainRing_0.08 (中圈, 0xd4a574)
│   ├── MountainRing_0.15 (内圈, 0x8b6914)
│   └── MountMeruPeak
│       ├── ConeGeometry (金顶)
│       ├── CylinderGeometry (塔身)
│       ├── CylinderGeometry (底座)
│       └── TorusGeometry (光环)
│
├── 灯光层
│   ├── AmbientLight (0x404080, intensity 0.5)
│   ├── HemisphereLight (天空 0x87ceeb / 地面 0x2a1a4a)
│   ├── DirectionalLight (主光 0xfff4e0, 投射阴影)
│   ├── DirectionalLight (月光 0x4444ff, 强度 0.3)
│   └── LotusPointLight (0xffb7d5, 随莲花开合变化)
│
└── 莲花主体层 (LotusFlower.group)
    ├── Petal_L0_* [N 片] (外层花瓣)
    ├── Petal_L1_* [N 片] (中层花瓣)
    ├── Petal_L2_* [N 片] (内层花瓣)
    ├── LotusCenter (SphereGeometry, 金色花心)
    └── LotusPedestal (CylinderGeometry, 蓝色基座)
```

---

## 后期处理管线 (EnableBloom = true)

```
EffectComposer
├── RenderPass (场景 → 相机 初始渲染)
├── UnrealBloomPass
│   ├── strength: 0.6
│   ├── radius: 0.4
│   └── threshold: 0.85
└── OutputPass (sRGB 输出)
```

---

## 渲染层级总结

| 层级 | 内容 | 技术 |
|------|------|------|
| 背景层 | 天空、星空、山脉 | SphereGeometry + ShaderMaterial, Points, ExtrudeGeometry |
| 主体层 | 须弥山金顶、莲花 | Cone/Cylinder/Extrude Mesh |
| 灯光层 | 环境光、定向光、莲花点光 | Ambient/Directional/Point Light |
| UI 层 | 字幕、控制、进度、呼吸指示 | HTML/CSS + DOM Overlay |
| 后期 | Bloom 光效 | EffectComposer + UnrealBloomPass |
