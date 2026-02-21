#!/bin/bash

echo "==> Cloudflare Tools Docker 部署脚本"

if [ ! -f "Server/config.yaml" ]; then
    echo "==> 复制配置文件模板..."
    cp Server/config.yaml.example Server/config.yaml
    echo "请编辑 Server/config.yaml 设置管理员账号密码"
    exit 1
fi

echo "==> 创建数据目录..."
mkdir -p data/certs

echo "==> 使用传统 Docker 构建..."
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

echo "==> 构建并启动容器..."
docker-compose up -d --build

echo "==> 等待服务启动..."
sleep 5

echo "==> 检查容器状态..."
docker-compose ps

echo ""
echo "==> 部署完成！"
echo "访问地址: http://localhost:28080"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  进入容器: docker-compose exec cloudflare-tools bash"
