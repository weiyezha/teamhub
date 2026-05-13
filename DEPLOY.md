# TeamHub 腾讯云生产环境部署指南

## 前置要求

- 腾讯云服务器（Ubuntu 24.04 LTS）
- 服务器已开放 80 端口（安全组配置）
- 本地有项目代码

---

## 第一步：服务器初始化（在服务器上执行）

```bash
# 1. 下载初始化脚本
wget -O /tmp/server-setup.sh https://raw.githubusercontent.com/your-repo/teamhub/main/deploy/server-setup.sh

# 2. 运行初始化（安装 Docker、防火墙、Swap 等）
sudo bash /tmp/server-setup.sh
```

初始化内容：
- 系统更新 + 基础工具安装
- Docker & Docker Compose 安装
- UFW 防火墙配置（仅开放 22/80/443）
- fail2ban SSH 防护
- 2G Swap（内存不足4G时自动创建）
- 时区设置为 Asia/Shanghai

---

## 第二步：上传代码到服务器

### 方式 A：Git 克隆（推荐）

```bash
cd /opt
git clone <你的仓库地址> teamhub
cd teamhub
```

### 方式 B：本地打包上传

```bash
# 在本地项目根目录执行
# 排除 node_modules 和 venv
tar -czf teamhub-deploy.tar.gz \
  --exclude='frontend/node_modules' \
  --exclude='backend/venv' \
  --exclude='.git' \
  -C .. teamhub

# 上传到服务器
scp teamhub-deploy.tar.gz root@<服务器IP>:/opt/

# 在服务器上解压
ssh root@<服务器IP> "cd /opt && tar -xzf teamhub-deploy.tar.gz"
```

---

## 第三步：配置环境变量

```bash
cd /opt/teamhub/backend
cp .env.example .env
nano .env
```

必须修改的项：

```bash
# 1. JWT 密钥（必须修改！）
JWT_SECRET_KEY=$(openssl rand -base64 48)

# 2. CORS 来源 - 填入你的服务器公网 IP
echo "CORS_ORIGINS=http://<你的服务器IP>" >> .env

# 3. 禁止 seed 接口（生产环境必须）
ALLOW_SEED=false
```

---

## 第四步：一键部署

```bash
cd /opt/teamhub
chmod +x deploy/deploy-remote.sh
./deploy/deploy-remote.sh
```

部署完成后访问：`http://<服务器IP>`

---

## 第五步：配置 Webhook 自动部署（推荐）

实现 **VS Code 修改 → `git push` → 自动部署** 的工作流。

### 5.1 服务器端配置 Webhook 服务

```bash
cd /opt/teamhub

# 1. 确保 Node.js 已安装
node -v  # 需要 v18+

# 2. 编辑 systemd 服务配置
sudo nano /etc/systemd/system/webhook.service
```

修改 `WEBHOOK_SECRET` 和邮件配置，然后：

```bash
# 3. 启动服务
sudo systemctl daemon-reload
sudo systemctl start webhook
sudo systemctl enable webhook

# 4. 查看状态
sudo systemctl status webhook
sudo journalctl -u webhook -f
```

### 5.2 GitHub 配置 Webhook

1. 打开仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 填写：
   - **Payload URL**: `http://<服务器IP>:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: 与服务器 `WEBHOOK_SECRET` 一致
   - **Events**: 勾选 **Just the push event**
3. 点击 **Add webhook**

### 5.3 使用流程

```bash
# 本地开发
git add .
git commit -m "feat: xxx"
git push origin main

# 等待 1-2 分钟，自动部署完成
# 刷新 http://<服务器IP> 查看效果
```

详细配置见 [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)。

---

## 第六步：配置自动备份

```bash
# 添加定时任务（每天凌晨3点备份）
crontab -e
# 添加以下行：
0 3 * * * /opt/teamhub/deploy/backup.sh >> /var/log/teamhub-backup.log 2>&1
```

---

## 第七步：（可选）配置域名 + HTTPS

### 7.1 购买/配置域名，A 记录指向服务器 IP

### 7.2 安装 Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 7.3 申请 SSL 证书

```bash
sudo certbot --nginx -d your-domain.com
```

### 7.4 更新 CORS

```bash
cd /opt/teamhub/backend
nano .env
# 修改 CORS_ORIGINS：
# CORS_ORIGINS=https://your-domain.com

docker-compose restart backend
```

---

## 常用运维命令

```bash
cd /opt/teamhub

# 查看日志
docker-compose logs -f backend
docker-compose logs -f nginx

# 重启服务
docker-compose restart backend
docker-compose restart nginx

# 查看状态
docker-compose ps

# 停止所有服务
docker-compose down

# 完全重建
docker-compose down && docker-compose up -d --build

# 手动备份
cp backend/teamhub.db /opt/backups/teamhub_$(date +%Y%m%d).db

# 进入后端容器
docker-compose exec backend sh
```

---

## 故障排查

### 后端无法启动

```bash
docker-compose logs backend
# 检查 JWT_SECRET_KEY 是否设置
grep JWT_SECRET_KEY backend/.env
```

### 前端白屏

```bash
# 确认 dist 目录存在
ls frontend/dist/index.html

# 检查 Nginx 日志
docker-compose logs nginx
```

### 图片上传失败

```bash
# 确认 uploads 目录权限
ls -la backend/uploads

# 检查 Nginx 配置
cat nginx/nginx.conf
```

### 数据库丢失

SQLite 数据库文件在 `backend/teamhub.db`，已通过 Docker volume 挂载持久化。只要不删除该文件，数据不会丢失。

---

## 安全建议

1. **修改默认密码**：部署后登录，在「团队」页面修改所有默认密码
2. **定期备份**：已配置 cron 自动备份，检查 `/opt/backups`
3. **防火墙**：仅开放 80/443/22 端口
4. **fail2ban**：SSH 暴力破解防护已启用
5. **JWT 密钥**：生产环境务必使用随机生成的强密钥
