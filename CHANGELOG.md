# 更新记录

## 3.1.3

- 改为标准 Vercel 静态文件结构，根目录直接提供 `index.html`。
- 移除线上分片压缩加载器，不再依赖 `fetch` 多个 payload 或 `DecompressionStream`，修复 iPhone/iPad 上的 `Failed to fetch`。
- 更新 PWA 缓存版本并自动清理旧版 `boardmix-*` 缓存。
- 保留并验证五子棋多局/多回合赛制、躲炸弹可达地图、飞行棋全部飞机到达后判胜。
- 保留 iPad 横屏、手机横竖屏和安全区域自适应。

## 3.1.2

- 增加 Vercel 缓存响应头。
- 优化资源版本参数与旧缓存清理。

## 3.1.1

- 将项目从 VPS、Docker、Nginx 部署结构迁移为 Vercel 纯静态结构。
- 修复飞行棋胜利条件和躲炸弹地图可达性。
