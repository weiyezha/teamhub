const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');

// ========== 配置（优先从环境变量读取）==========
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET;
const PROJECT_DIR = process.env.PROJECT_DIR || '/opt/teamhub';
const BACKUP_DIR = process.env.BACKUP_DIR || '/opt/backups';

// 邮件配置（从环境变量读取，避免硬编码密码）
const EMAIL_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
};

const EMAIL_SETTINGS = {
    from: `TeamHub部署通知 <${process.env.SMTP_USER || 'noreply@example.com'}>`,
    to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
    subjectPrefix: '[TeamHub] '
};

// ========== GitHub IP 白名单 ==========
const GITHUB_IPS = [
    '192.30.252.0/22',
    '185.199.108.0/22',
    '140.82.112.0/20',
    '143.55.64.0/20',
    '2a0a:a440::/29',
    '2606:50c0::/32'
];

// ========== 工具函数 ==========
function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isAllowedIP(ip) {
    const cleanIp = ip.replace(/^::ffff:/, '');
    if (!cleanIp.includes('.')) return true; // IPv6 简化处理
    return GITHUB_IPS.some(cidr => {
        const [net, mask] = cidr.split('/');
        const ipLong = ipToLong(cleanIp);
        const netLong = ipToLong(net);
        const maskLong = ~((1 << (32 - parseInt(mask))) - 1);
        return (ipLong & maskLong) === (netLong & maskLong);
    });
}

function verifySignature(payload, signature) {
    if (!SECRET) {
        console.warn('⚠️ WEBHOOK_SECRET 未设置，跳过签名验证');
        return true;
    }
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

function sendEmail(subject, message, isSuccess = true) {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
        console.log('ℹ️ 邮件未配置，跳过通知');
        return;
    }
    const transporter = nodemailer.createTransport(EMAIL_CONFIG);
    const mailOptions = {
        from: EMAIL_SETTINGS.from,
        to: EMAIL_SETTINGS.to,
        subject: `${EMAIL_SETTINGS.subjectPrefix}${subject}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: ${isSuccess ? '#28a745' : '#dc3545'}; color: white; padding: 20px; text-align: center;">
                    <h2>TeamHub 部署${isSuccess ? '成功' : '失败'}通知</h2>
                </div>
                <div style="padding: 20px; background-color: #f8f9fa;">
                    <h3>${subject}</h3>
                    <p style="color: #666;">${new Date().toLocaleString('zh-CN')}</p>
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace;">${message}</pre>
                    </div>
                </div>
            </div>
        `
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ 邮件发送失败:', error.message);
        } else {
            console.log('📧 邮件发送成功:', info.messageId);
        }
    });
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    const backupPath = `${BACKUP_DIR}/teamhub_${timestamp}`;
    exec(`mkdir -p ${backupPath} && cp -r ${PROJECT_DIR}/frontend/dist ${backupPath}/ 2>/dev/null || true`, (error) => {
        if (error) {
            console.error('❌ 备份失败:', error.message);
        } else {
            console.log(`✅ 备份完成: ${backupPath}`);
        }
    });
}

function cleanupOldBackups() {
    exec(`ls -dt ${BACKUP_DIR}/teamhub_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true`, (error) => {
        if (!error) console.log('🧹 旧备份清理完成');
    });
}

// ========== 部署逻辑 ==========
function runDeploy(callback) {
    const deployScript = `cd ${PROJECT_DIR} && \
git fetch origin main && \
git reset --hard origin/main && \
echo "[deploy] 代码已更新到最新" && \
cd frontend && npm ci && npm run build && \
cd .. && \
docker-compose build backend && \
docker-compose up -d && \
docker-compose restart nginx && \
echo "[deploy] 服务已重启" && \
sleep 3 && \
curl -fs http://localhost:8000/api/health && echo "[deploy] 健康检查通过" || echo "[deploy] 健康检查未通过，请手动检查"`;

    console.log('🚀 开始部署...');
    const startTime = Date.now();

    const deployProcess = exec(deployScript, { timeout: 600000 }, (error, stdout, stderr) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const output = stdout + '\n' + stderr;

        if (error) {
            console.error(`❌ 部署失败 (${duration}s):`, error.message);
            callback(error, output, duration);
        } else {
            console.log(`✅ 部署完成 (${duration}s)`);
            callback(null, output, duration);
        }
    });

    deployProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
    });

    deployProcess.stderr.on('data', (data) => {
        console.error(data.toString().trim());
    });
}

// ========== HTTP 服务器 ==========
const server = http.createServer((req, res) => {
    // IP 白名单检查
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!isAllowedIP(clientIP)) {
        console.warn(`🚫 非法IP访问: ${clientIP}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
    }

    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            // 签名验证
            const signature = req.headers['x-hub-signature-256'];
            if (signature && !verifySignature(body, signature)) {
                console.error('❌ 签名验证失败');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid signature' }));
                return;
            }

            const event = JSON.parse(body);

            // 只处理 push 事件且是 main 分支
            if (req.headers['x-github-event'] === 'push') {
                const ref = event.ref || '';
                if (!ref.includes('main')) {
                    console.log(`ℹ️ 非 main 分支推送，忽略: ${ref}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Ignored: not main branch' }));
                    return;
                }

                console.log(`📥 收到GitHub推送: ${event.repository?.full_name || 'unknown'} -> ${ref}`);

                // 创建备份
                createBackup();

                // 执行部署
                runDeploy((error, output, duration) => {
                    if (error) {
                        cleanupOldBackups();
                        sendEmail('部署失败', `部署脚本执行失败\n耗时: ${duration}s\n错误: ${error.message}\n输出:\n${output}`, false);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Deployment failed', details: error.message }));
                    } else {
                        cleanupOldBackups();
                        sendEmail('部署成功', `TeamHub 自动部署完成\n耗时: ${duration}s\n输出:\n${output}`, true);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Deployment completed', duration: `${duration}s` }));
                    }
                });
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Event received but not processed' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Webhook 服务启动成功`);
    console.log(`📡 监听端口: ${PORT}`);
    console.log(`🔗 Webhook地址: http://<服务器IP>:${PORT}/webhook`);
    console.log(`📁 项目目录: ${PROJECT_DIR}`);
    console.log(`🔒 安全特性: IP白名单 + ${SECRET ? '签名验证已启用' : '签名验证未启用（请设置 WEBHOOK_SECRET）'}`);
    console.log(`📧 邮件通知: ${EMAIL_CONFIG.auth.user ? '已配置' : '未配置'}`);
});

process.on('SIGTERM', () => {
    console.log('🔄 收到关闭信号，优雅关闭...');
    server.close(() => {
        console.log('✅ Webhook 服务已关闭');
        process.exit(0);
    });
});
