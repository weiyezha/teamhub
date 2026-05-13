# TeamHub 自动部署配置指南

> 实现工作流：VS Code 修改代码 → `git push` → GitHub Webhook → 服务器自动部署

---

## 一、服务器端配置

### 1.1 安装依赖

```bash
# 确保 Node.js 已安装（webhook 服务需要）
node -v  # 需要 v18+

# 如未安装：
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.2 配置环境变量

```bash
cd /opt/teamhub
sudo nano /etc/systemd/system/webhook.service
```

修改以下关键配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `WEBHOOK_SECRET` | GitHub Webhook 签名密钥 | `teamhub-webhook-secret-2024` |
| `SMTP_USER` | 发件邮箱（QQ邮箱） | `1226775702@qq.com` |
| `SMTP_PASS` | SMTP 授权码（不是QQ密码！） | `ycdhemhrepthjjgg` |
| `NOTIFY_EMAIL` | 接收通知的邮箱 | `1226775702@qq.com` |

> ⚠️ **安全提醒**：`WEBHOOK_SECRET` 和 `SMTP_PASS` 不要提交到 Git！

### 1.3 启动 Webhook 服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动 webhook 服务
sudo systemctl start webhook

# 设置开机自启
sudo systemctl enable webhook

# 查看状态
sudo systemctl status webhook

# 查看日志
sudo journalctl -u webhook -f
```

### 1.4 开放防火墙端口

```bash
# 开放 webhook 端口（仅对 GitHub IP 开放最佳，但可以先全开放测试）
sudo ufw allow 9000/tcp

# 或只允许 GitHub IP（更安全，但 GitHub IP 会变化）
# sudo ufw allow from 192.30.252.0/22 to any port 9000
```

---

## 二、GitHub 配置

### 2.1 添加 Webhook

1. 打开仓库 → **Settings** → **Webhooks** → **Add webhook**
2. 填写配置：

| 字段 | 值 |
|------|-----|
| **Payload URL** | `http://62.234.66.82:9000/webhook` |
| **Content type** | `application/json` |
| **Secret** | 与 `WEBHOOK_SECRET` 一致 |
| **SSL verification** | 暂时不勾选（无HTTPS） |
| **Events** | 勾选 **Just the push event** |

3. 点击 **Add webhook**

### 2.2 验证 Webhook 连通性

添加后 GitHub 会自动发送一个 `ping` 事件，在 webhook 页面查看：
- ✅ **绿色勾** = 连通成功
- ❌ **红色叉** = 检查服务器防火墙和 webhook 服务状态

---

## 三、使用流程

### 3.1 日常开发部署

```bash
# 1. 在 VS Code 中修改代码

# 2. 提交并推送
git add .
git commit -m "feat: xxx 功能"
git push origin main

# 3. 等待 1-2 分钟，自动部署完成
# 4. 刷新 http://62.234.66.82 查看效果
```

### 3.2 查看部署状态

```bash
# 服务器上查看 webhook 日志
sudo journalctl -u webhook -n 50

# 查看邮件通知（如配置了SMTP）
# 查看服务状态
docker-compose ps
docker-compose logs -f backend
```

---

## 四、故障排查

### Webhook 未触发

```bash
# 检查 webhook 服务是否运行
sudo systemctl status webhook

# 检查端口监听
sudo netstat -tlnp | grep 9000

# 检查防火墙
sudo ufw status
```

### 部署失败

```bash
# 查看详细日志
sudo journalctl -u webhook -n 200 --no-pager

# 手动执行部署脚本测试
cd /opt/teamhub && ./deploy/deploy-remote.sh
```

### 签名验证失败

- 确认 GitHub Webhook Secret 与服务器 `WEBHOOK_SECRET` 一致
- 确认没有多余的空格或换行

---

## 五、安全建议

1. **修改默认 Secret**：生产环境务必使用随机强密码
   ```bash
   openssl rand -base64 32
   ```

2. **配置 HTTPS**：使用 Nginx 反向代理 + SSL 证书

3. **限制端口访问**：仅开放 80/443，webhook 通过 Nginx 代理

4. **定期备份**：已配置自动备份到 `/opt/backups`

---

## 六、文件说明

| 文件 | 作用 |
|------|------|
| `webhook.js` | Webhook 服务端，接收 GitHub 推送事件 |
| `deploy/webhook.service` | systemd 服务配置 |
| `deploy/deploy-remote.sh` | 服务器部署脚本 |
| `frontend/deploy.sh` | 前端构建脚本 |
