# 百变棋盘 BoardMix

BoardMix 是面向手机、iPad 和桌面浏览器的沉浸式家庭棋盘游戏平台，当前包含：

- 五子棋：双方姓名、多局/多回合赛制、黑白轮换、悔棋和多套棋盘主题。
- 躲炸弹：双人轮流探索、生命值、雷达技能，并保证双方都存在到中央宝藏的安全路径。
- 飞行棋：2–4 名玩家、3D 骰子、逐格移动、撞机、全部飞机到达后判胜和多套主题。

当前版本：**3.1.3**

## 项目结构

```text
boardmix/
├── index.html
├── assets/
│   ├── app.css
│   └── app.js
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.webmanifest
├── service-worker.js
├── vercel.json
├── package.json
├── VERSION
├── CHANGELOG.md
└── README.md
```

这是标准的 Vercel 纯静态项目，不需要 VPS、Docker、Nginx、数据库或构建命令。

## 部署到 Vercel

1. 在 Vercel 中选择 **Add New → Project**。
2. 导入 GitHub 仓库 `jassyip/boardmix`。
3. Framework Preset 选择 **Other**。
4. Root Directory 保持仓库根目录。
5. Build Command、Install Command 和 Output Directory 均留空。
6. 点击 **Deploy**。

以后只要推送到 `main`，Vercel Git 集成就会自动发布生产版本。

## 推送这个完整 Git 仓库包

解压后进入项目目录：

```bash
cd boardmix-vercel-v3.1.3

git status
git remote -v
git push -u origin main
```

包内已经保留 `.git` 历史，并将 `origin` 设置为：

```text
https://github.com/jassyip/boardmix.git
```

如果远程仓库后来产生了额外提交，请先执行：

```bash
git fetch origin
git log --oneline --graph --decorate --all -20
```

确认历史后再决定合并方式，不建议直接使用普通 `--force`。

## 本地预览

任选一种方式：

```bash
python3 -m http.server 5173
```

或：

```bash
npm run dev
```

然后打开：

```text
http://127.0.0.1:5173
```

不要直接双击以 `file://` 打开，因为 Service Worker 和部分浏览器能力要求 HTTP/HTTPS。

## 3.1.3 修复说明

此前临时线上版本使用分片压缩加载器，需要浏览器连续下载多个 payload 并在本地解压；部分 iPhone/iPad 环境会显示 `Failed to fetch`。本仓库包已经恢复为普通静态 HTML、CSS、JavaScript 文件，不包含分片加载器，也不依赖 `DecompressionStream`。

首次从旧版本升级时，页面会清理旧的 `boardmix-*` Cache Storage；新版 Service Worker 也会在激活时删除旧缓存。
