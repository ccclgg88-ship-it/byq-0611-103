# 莲花冥想 · 降级流程图

```
用户访问页面
      │
      ▼
  初始化 App
      │
      ▼
  checkWebGLSupport()
   /             \
  支持            不支持
   │               │
   ▼               ▼
 尝试创建          使用 Fallback2D
 LotusMeditationScene  ── 渲染 SVG 莲花 + 须弥山剪影
   │
   ├─ 创建成功 ──────────► 渲染 WebGL 3D 场景
   │
   └─ 创建失败 (catch) ──► 销毁残留资源
                            │
                            ▼
                         使用 Fallback2D

运行时 FPS 监控
      │
      ▼
  < 30 FPS 持续 3 秒？
   /          \
  是           否
   │           │
   ▼           ▼
 自动降级       维持当前
 setBloomEnabled(false)
 PixelRatio = 1
 ShadowMap 512×512
      │
      ▼
  持续监控 FPS
```

---

## 降级触发条件

| 条件 | 动作 |
|------|------|
| WebGL/WebGL2 完全不可用 | 切换到 SVG 2D 降级模式 |
| `navigator.hardwareConcurrency ≤ 4` | 启动时禁用 Bloom, 降低 ShadowMap |
| `deviceMemory ≤ 2GB` | 启动时禁用 Bloom, 降低 PixelRatio |
| 移动端 UA | 启动时禁用抗锯齿 |
| 运行时 FPS < 30 持续 3s | 自动关闭 Bloom + 降采样 |
| 运行时 FPS < 20 持续 5s | 建议用户切换 2D 模式（预留） |

---

## 降级保障清单

- [x] `checkWebGLSupport()` 特性检测
- [x] `Fallback2D` SVG 实现，功能等价于 3D
- [x] `LotusMeditationScene` 构造 try/catch
- [x] 低端设备自动检测 (`detectLowEndDevice`)
- [x] 配置化 Bloom 开关 (`setBloomEnabled`)
- [x] FPS 实时监控 + 颜色提示
- [x] 渲染器 powerPreference 参数
- [x] 加载失败占位几何体（须弥山基座保底）
