# 百变棋盘 BoardMix 3.2

纯静态家庭棋盘游戏平台，可直接部署到 Vercel。当前包含：

- 五子棋：15×15、多局赛制、真人/电脑、五级难度。
- 躲炸弹：安全路径地图、数字线索、雷达、无作弊电脑。
- 经典飞行棋：四角机场、十字航线、四架飞机、清晰骰子、五级电脑。

## Vercel 部署

项目根目录即发布目录，不需要 Docker、VPS、Nginx、Install Command 或 Build Command。

Vercel 设置：

- Framework Preset：Other
- Root Directory：仓库根目录
- Build Command：留空
- Output Directory：留空
- Production Branch：main

推送到 `main` 后，Vercel 会自动部署。

## 本地检查

```bash
npm run check
npm run dev
```
