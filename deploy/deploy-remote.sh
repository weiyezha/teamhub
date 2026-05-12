#!/bin/bash
# TeamHub 远程服务器部署脚本
# 在服务器 /opt/teamhub 目录下运行

set -e

echo "========================================"
echo "   TeamHub Production Deploy"
echo "========================================"

# 1. 检查 .env
echo "[1/6] 检查环境变量..."
if [ ! -f "backend/.env" ]; then
    echo "[ERROR] backend/.env 不存在"
    echo "请复制 backend/.env.example 为 backend/.env 并配置"
    exit 1
fi

if ! grep -q "JWT_SECRET_KEY=.*[^ ]" backend/.env; then
    echo "[ERROR] JWT_SECRET_KEY 未设置"
    exit 1
fi

# 2. 前端构建
echo "[2/6] 构建前端..."
cd frontend
npm ci
npm run build
cd ..

# 3. 构建并启动 Docker 服务
echo "[3/6] 构建 Docker 镜像..."
docker-compose build backend

echo "[4/6] 启动服务..."
docker-compose up -d

# 4. 等待服务就绪
echo "[5/6] 等待服务就绪..."
sleep 5

# 5. 健康检查
echo "[6/6] 健康检查..."
for i in {1..10}; do
    if curl -fs http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "  ✅ 后端服务正常"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo "  ⚠️ 后端服务未就绪，请检查日志"
    else
        echo "  等待后端服务... ($i/10)"
        sleep 2
    fi
done

# 6. 显示状态
echo ""
echo "========================================"
echo "   Deployment Status"
echo "========================================"
docker-compose ps

echo ""
echo "TeamHub 部署完成！"
echo ""
echo "访问地址："
echo "  - 前端: http://$(curl -s ifconfig.me)"
echo "  - API:  http://$(curl -s ifconfig.me)/api"
echo ""
echo "常用命令："
echo "  docker-compose logs -f backend   # 查看后端日志"
echo "  docker-compose logs -f nginx     # 查看 Nginx 日志"
echo "  docker-compose restart backend   # 重启后端"
echo "  docker-compose down              # 停止所有服务"
echo ""
echo "备份数据库："
echo "  cp backend/teamhub.db /opt/backups/teamhub_\$(date +%Y%m%d).db"
