#!/bin/bash

echo "正在安装 acme.sh..."

if [ -d "$HOME/.acme.sh" ]; then
    echo "acme.sh 已安装，跳过安装步骤"
    exit 0
fi

RANDOM_EMAIL="acme-$(date +%s)@example.com"
echo "使用随机邮箱: $RANDOM_EMAIL"

curl https://get.acme.sh | sh -s email=$RANDOM_EMAIL -- --force

if [ $? -eq 0 ]; then
    echo "acme.sh 安装成功！"
    echo "请重新加载 shell 或运行: source ~/.bashrc"
else
    echo "acme.sh 安装失败，请检查网络连接"
    exit 1
fi
