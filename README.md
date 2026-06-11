# 莲花绽放冥想 · Web 3D

一个基于 Three.js 的交互式 3D 莲花冥想场景，支持呼吸节奏联动、字幕滚动、截图分享等功能。

## 功能特性

- 🪷 **3D 莲花动画**: 参数化花瓣 (≥8 片)，cubic-bezier 缓动绽放/合拢
- 🏔️ **须弥山背景**: 程序化山脉剪影 + 金顶 + 星空 + 渐变天空
- 🌬️ **呼吸引导**: 4 种预设 (4-4-4, 4-4-4-4, 4-7-8, 6-2-6)，动画可手动绑定呼吸或匀速
- 🎬 **佛陀旁白字幕**: 滚动佛经字幕，淡入淡出过渡
- 🔆 **Bloom 光效**: UnrealBloomPass 后期处理，低端设备自动关闭
- ⏱️ **定课计时**: 3–60 分钟可配置，进度环实时显示
- 📸 **截图分享**: 1920×1080 固定分辨率，含莲花水印
- 💾 **本地持久化**: 偏好与完成记录存入 localStorage
- 🔗 **跨页面联动**: `postMessage` API 与呼吸引导页通信
- ♿ **无障碍降级**: WebGL 不可用时自动切换 SVG 2D 莲花

## 技术栈

- **前端**: Three.js r158, TypeScript 5, Vite 5
- **渲染**: WebGL2 + PBR + EffectComposer (UnrealBloomPass)
- **交互**: OrbitControls (俯仰限制), Raycaster (点击莲花聚焦)
- **音频**: Web Audio API 合成梵呗 Mock 音
- **部署**: Nginx + Docker Compose

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev
# 访问 http://localhost:5173

# 生产构建
npm run build

# Docker 部署
docker compose up -d
# 访问 http://localhost:8080
```

## 项目结构

```
src/
├── scene/
│   ├── LotusMeditationScene.ts   # 核心场景类 (Three.js 封装)
│   ├── LotusFlower.ts            # 程序化莲花生成
│   └── MountMeruBackground.ts    # 须弥山背景
├── ui/
│   ├── ControlPanel.ts           # 控制面板 (时长/预设/开关)
│   ├── SubtitleOverlay.ts        # 字幕滚动组件
│   ├── Fallback2D.ts             # SVG 2D 降级方案
│   └── Modal.ts                  # 完成弹窗 / 截图弹窗
├── utils/
│   ├── breathing.ts              # 呼吸节奏引擎
│   ├── easing.ts                 # cubic-bezier 缓动实现
│   ├── storage.ts                # localStorage 持久化
│   └── AudioManager.ts           # Web Audio 梵呗合成
├── types.ts                      # 全局类型定义
├── styles.css                    # 全局样式
└── main.ts                       # 应用入口
```

## postMessage API

### 接收消息 (父页面 → 冥想页)

```javascript
parent.postMessage({
  source: 'lotus-meditation-parent',
  type: 'meditation:start',
}, '*');
```

| 类型 | 参数 | 说明 |
|------|------|------|
| `meditation:start` | — | 开始定课 |
| `meditation:pause` | — | 暂停 |
| `meditation:resume` | — | 继续 |
| `meditation:reset` | — | 重置 |
| `meditation:setDuration` | `duration: number` | 设置时长 (分钟) |
| `breathing:setPreset` | `preset: string` | 设置呼吸预设 key |
| `breathing:phase` | `phase: string` | 外部传入呼吸阶段 |

### 发送消息 (冥想页 → 父页面)

| 类型 | 参数 | 说明 |
|------|------|------|
| `ready` | `using3D: boolean` | 初始化完成 |
| `meditation:complete` | `duration: number` | 定课完成 |

## 核心算法

### 花瓣角度计算

```
theta = ease(t) * maxAngle
```

- `t ∈ [0, 1]`: 呼吸/匀速阶段进度
- `ease(t)`: 可配置 cubic-bezier 缓动 (默认 [0.4, 0, 0.2, 1])
- `maxAngle`: 最大绽放角度 (默认 0.85π ≈ 153°)
- 每层花瓣根据层级叠加 `layer × 0.1` 的基础倾角

## 许可证

MIT
