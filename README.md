# 百变棋盘 BoardMix

面向手机、iPad 与桌面浏览器的沉浸式家庭棋盘游戏平台。目前包含五子棋、躲炸弹和飞行棋原型。

## 项目结构

```text
boardmix/
├── public/
│   ├── index.html               # 游戏主页面
│   ├── manifest.webmanifest     # PWA 配置
│   ├── service-worker.js        # 离线缓存
│   └── icons/                   # 应用图标
├── deploy/nginx.conf            # 容器内 Nginx 配置
├── scripts/deploy.sh            # 首次部署/重新构建
├── scripts/update.sh            # git pull 后更新
├── .github/workflows/deploy.yml # 推送 main 后自动部署 VPS
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 一、VPS 上直接部署（推荐）

适用于 Debian 12 / Ubuntu，服务器需要已安装 Docker Engine 和 Docker Compose 插件。

```bash
git clone <你的仓库地址> boardmix
cd boardmix
cp .env.example .env
./scripts/deploy.sh
```

默认访问地址：

```text
http://VPS_IP:8088
```

更换端口：

```bash
nano .env
# 例如：BOARDMIX_PORT=8090

docker compose up -d --build
```

防火墙开放默认端口：

```bash
sudo ufw allow 8088/tcp
```

查看状态与日志：

```bash
make status
make logs
```

停止服务：

```bash
make stop
```

## 二、后续手动更新

在本地修改后提交并推送：

```bash
git add .
git commit -m "更新游戏功能"
git push
```

VPS 上执行：

```bash
cd /opt/boardmix   # 以你的实际目录为准
./scripts/update.sh
```

## 三、GitHub Actions 自动部署

仓库已经包含 `.github/workflows/deploy.yml`。每次推送到 `main`，会把代码同步至 VPS，并重新构建容器。

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

| Secret | 内容 |
|---|---|
| `VPS_HOST` | VPS IP 或域名 |
| `VPS_USER` | SSH 用户，例如 `root` 或 `debian` |
| `VPS_PORT` | SSH 端口，通常是 `22` |
| `VPS_SSH_KEY` | 对应 VPS 公钥的私钥全文 |
| `VPS_DEPLOY_PATH` | 部署目录，例如 `/opt/boardmix` |

VPS 首次准备：

```bash
sudo mkdir -p /opt/boardmix
sudo chown -R "$USER":"$USER" /opt/boardmix
```

用于自动部署的 SSH 用户必须具备运行 `docker compose` 的权限。

## 四、绑定域名

当前容器默认监听 VPS 的 `8088` 端口。可使用宿主机 Nginx、Caddy 或现有反向代理，将域名转发到：

```text
http://127.0.0.1:8088
```

Nginx 反向代理示例：

```nginx
server {
    listen 80;
    server_name board.example.com;

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，iPad Safari 可以通过“添加到主屏幕”安装成近似原生应用。

## 五、本地预览

不需要安装 Node.js：

```bash
make dev
```

浏览器打开：

```text
http://127.0.0.1:5173
```

## 常用命令

```bash
make dev      # 本地预览
make deploy   # 构建并启动
make update   # 拉取远程更新并重新部署
make status   # 查看容器状态
make logs     # 查看实时日志
make stop     # 停止容器
```
