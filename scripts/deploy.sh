#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "错误：未检测到 Docker。请先安装 Docker Engine 与 Compose 插件。" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "已从 .env.example 创建 .env，默认端口为 8088。"
fi

docker compose up -d --build --remove-orphans
docker compose ps

echo
echo "BoardMix 已启动。"
echo "本机检查：curl http://127.0.0.1:$(grep -E '^BOARDMIX_PORT=' .env | cut -d= -f2 || echo 8088)/healthz"
