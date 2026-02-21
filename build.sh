#!/bin/bash

PROJECT_NAME="cloudflare-tools"
DIST_DIR="releases"

build_frontend() {
    echo "==> 构建前端..."
    cd Frontend
    
    if [ ! -d "node_modules" ]; then
        echo "==> 安装前端依赖..."
        npm install
    fi
    
    npm run build
    rm -rf ../Server/dist
    cp -r dist ../Server/
    cd ..
}

build_backend() {
    local os=$1
    local arch=$2
    local binary_name="${PROJECT_NAME}"
    local output_name="${PROJECT_NAME}_${os}_${arch}"
    
    echo "==> 构建后端: ${os}/${arch}..."
    cd Server
    GOOS=$os GOARCH=$arch go build -o "${binary_name}" main.go
    
    if [ ! -f "config.yaml" ]; then
        echo "admin: { username: 'admin', password: 'password' }" > config.yaml
    fi

    mkdir -p "../${DIST_DIR}"
    tar -zcvf "../${DIST_DIR}/${output_name}.tar.gz" "${binary_name}" config.yaml
    rm "${binary_name}"
    cd ..
}

rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

build_frontend

case "$1" in
    "amd64")
        build_backend "linux" "amd64"
        ;;
    "arm64")
        build_backend "linux" "arm64"
        ;;
    *)
        build_backend "linux" "amd64"
        build_backend "linux" "arm64"
        ;;
esac

echo "==> 构建完成，打包文件位于 ${DIST_DIR} 目录。"
