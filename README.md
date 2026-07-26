# 百变棋盘 BoardMix

面向手机、iPad 和桌面浏览器的沉浸式家庭棋盘游戏平台，包含五子棋、躲炸弹和飞行棋。

## Vercel 部署

本项目为纯静态站点，根目录即发布目录，不需要 Docker、VPS 或构建命令。

1. 在 Vercel 导入 `jassyip/boardmix`。
2. Framework Preset 选择 **Other**。
3. Root Directory 保持仓库根目录。
4. Build Command 留空，Output Directory 留空。
5. 点击 Deploy。

推送到 `main` 后，Vercel Git 集成会自动发布生产版本。

## 本地预览

```bash
python3 -m http.server 5173
```

打开 `http://127.0.0.1:5173`。

## 本版修复

- 飞行棋改为当前玩家全部飞机抵达后才获胜。
- 躲炸弹每张地图都保证双方存在无雷路径到中央宝藏。
- 棋盘根据 `visualViewport`、安全区和实际舞台尺寸自适应。
- iPad/桌面宽屏将玩家信息移到棋盘两侧，手机横屏自动压缩控件。
- 玩家姓名、赛制、主题和音效设置保存在浏览器本地。
- 增加 PWA、离线缓存和 Vercel 响应头配置。
