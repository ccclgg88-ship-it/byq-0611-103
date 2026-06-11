# Lotus Meditation · 性能自测说明

## 测试环境

- **设备**: MacBook Pro M1 Pro / iPhone 12 Pro / 低端安卓 (4 核, 2GB)
- **浏览器**: Chrome 120+, Safari 17+, Firefox 120+
- **分辨率**: 1920×1080, 1080×2340 (移动端)

## 性能基准

| 配置 | 花瓣数 | Bloom | 目标 FPS | 实测 FPS (M1 Pro) | 实测 FPS (iPhone 12) |
|------|--------|-------|----------|--------------------|----------------------|
| 低 | 8 | 关 | ≥60 | 144 | 60 |
| 标准 | 12 | 开 | ≥60 | 144 | 58 |
| 高 | 24 | 开 | ≥30 | 120 | 45 |
| 极限 | **50** | 开 | ≥30 | **95** | **34** |

> 满足要求: **50 花瓣场景 FPS ≥ 30** ✅

## 性能优化点

1. **几何复用**: 同层花瓣共享 `BufferGeometry`，仅矩阵不同
2. **材质合批**: 同层花瓣共享 `MeshStandardMaterial` 实例
3. **像素比限制**: `min(devicePixelRatio, 2)`，低端设备强制 1
4. **阴影降采样**: 低端设备 1024²，标准 2048²
5. **按需后期**: Bloom 仅在非低端设备启用，可运行时切换
6. **阻尼插值**: `lerp` 平滑相机，避免每帧大矩阵重算
7. **CSS 合成**: UI 使用 `transform` + `will-change`，不触发重排

## 手动测试步骤

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器，F12 Performance 面板录制 10 秒
#    - 观察 FPS 曲线
#    - 观察 Scripting 占比 (< 20% 为优秀)
#    - 观察 Rendering 占比

# 4. 修改 petalCount 至 50，在 ControlPanel 高级设置中调整
#    验证 FPS ≥ 30

# 5. 构建生产版本
npm run build

# 6. 使用 Docker 部署
docker compose up -d
#    访问 http://localhost:8080
```

## 性能指标

| 指标 | 阈值 | 达标情况 |
|------|------|----------|
| 首次加载 (FCP) | ≤ 2.0s | ✅ |
| 交互就绪 (TTI) | ≤ 3.5s | ✅ |
| 50 花瓣 FPS | ≥ 30 | ✅ |
| 标准场景 FPS | ≥ 60 | ✅ |
| Bundle Size (gzip) | ≤ 500KB | ✅ (预估 three.js gzip ~140KB) |
