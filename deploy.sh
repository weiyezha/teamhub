#!/bin/bash
# TeamHub 本地开发环境快速启动脚本
# 用途：本地测试 Docker 部署流程

set -e

echo "========================================"
echo "   TeamHub Local Docker Deploy"
echo "========================================"

# 检查 .env
if [ ! -f "backend/.env" ]; then
    echo "[WARN] backend/.env 不存在，从示例复制..."
    cp backend/.env.example backend/.env
    echo "请编辑 backend/.env 配置 JWT_SECRET_KEY"
fi

# 前端构建
echo "[1/3] 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 启动服务
echo "[2/3] 启动 Docker 服务..."
docker-compose up -d --build

# 健康检查
echo "[3/3] 等待服务就绪..."
sleep 5
if curl -fs http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "⚠️ 后端服务未就绪"
fi

echo ""
docker-compose ps
echo ""
echo "访问: http://localhost"
