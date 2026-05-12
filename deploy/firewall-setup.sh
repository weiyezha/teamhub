#!/bin/bash
# TeamHub 服务器防火墙配置脚本（Ubuntu 24.04 LTS）
# 运行方式：sudo bash firewall-setup.sh

set -e

echo "=== TeamHub Firewall Setup ==="

# 1. 安装并启用 UFW
apt-get update -qq
apt-get install -y -qq ufw

# 2. 默认拒绝所有传入，允许所有传出
ufw default deny incoming
ufw default allow outgoing

# 3. 允许 SSH（必须首先添加，防止锁死自己）
ufw allow 22/tcp comment 'SSH access'

# 4. 允许 HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# 5. 启用防火墙
ufw --force enable

echo "=== UFW Status ==="
ufw status verbose

echo "=== fail2ban 安装（防暴力破解）==="
apt-get install -y -qq fail2ban

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

systemctl restart fail2ban
systemctl enable fail2ban

echo "=== 安全加固完成 ==="
echo "后续步骤："
echo "1. 配置 Nginx 反向代理 (80/443 -> 8000)"
echo "2. certbot 申请 SSL 证书"
echo "3. 设置环境变量 CORS_ORIGINS=https://your-domain.com"
