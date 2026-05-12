#!/bin/bash
# TeamHub 服务器初始化脚本（腾讯云 Ubuntu 24.04）
# 以 root 身份运行：sudo bash server-setup.sh

set -e

echo "========================================"
echo "   TeamHub Server Setup"
echo "========================================"

# 1. 系统更新
echo "[1/8] 更新系统..."
apt-get update && apt-get upgrade -y

# 2. 安装基础工具
echo "[2/8] 安装基础工具..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    unzip \
    cron \
    ufw \
    fail2ban

# 3. 配置 Swap（2G 内存以下强烈建议）
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
if [ "$MEM_TOTAL" -lt 4096 ]; then
    echo "[3/8] 内存 ${MEM_TOTAL}MB < 4G，创建 2G Swap..."
    if [ ! -f /swapfile ]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
else
    echo "[3/8] 内存充足 (${MEM_TOTAL}MB)，跳过 Swap"
fi

# 4. 安装 Docker
echo "[4/8] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 5. 配置防火墙
echo "[5/8] 配置防火墙..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. 配置 fail2ban
echo "[6/8] 配置 fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 7. 创建应用目录
echo "[7/8] 创建应用目录..."
mkdir -p /opt/teamhub
mkdir -p /opt/backups

# 8. 配置时区
echo "[8/8] 配置时区..."
timedatectl set-timezone Asia/Shanghai

echo ""
echo "========================================"
echo "   Server setup complete!"
echo "========================================"
echo ""
echo "下一步："
echo "  1. 将代码上传到 /opt/teamhub"
echo "  2. 配置 backend/.env"
echo "  3. 运行 ./deploy.sh 部署"
echo ""
echo "安全提醒："
echo "  - SSH 默认端口已开放"
echo "  - 仅 80/443 端口对外开放"
echo "  - fail2ban 已启用（SSH 3次失败封禁1小时）"
