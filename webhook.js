const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');

// 邮件配置（请根据您的SMTP服务配置）
const EMAIL_CONFIG = {
    host: 'smtp.qq.com', // QQ邮箱SMTP服务器
    port: 587,  // TLS加密端口
    secure: false, // true for 465, false for other ports
    auth: {
        user: '1226775702@qq.com',
        pass: 'ycdhemhrepthjjgg'
    }
};

// 邮件内容配置
const EMAIL_SETTINGS = {
    from: 'TeamHub部署通知 <1226775702@qq.com>',
    to: '1226775702@qq.com', // 接收通知的邮箱地址
    subjectPrefix: '[TeamHub] '
};

// 发送邮件函数
function sendEmail(subject, message, isSuccess = true) {
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
                    <p style="color: #999; font-size: 12px;">
                        服务器: 62.234.66.82<br>
                        项目: TeamHub前端部署
                    </p>
                </div>
            </div>
        `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ 邮件发送失败:', error);
        } else {
            console.log('📧 邮件发送成功:', info.messageId);
        }
    });
}

// Webhook配置
const PORT = 9000;
const SECRET = 'teamhub-webhook-secret-2024';

// GitHub IP白名单（GitHub Webhook IP范围）
const GITHUB_IPS = [
    '192.30.252.0/22',
    '185.199.108.0/22',
    '140.82.112.0/20',
    '143.55.64.0/20',
    '2a0a:a440::/29',
    '2606:50c0::/32'
];

// 检查IP是否在白名单内
function isAllowedIP(ip) {
    return GITHUB_IPS.some(cidr => {
        const [net, mask] = cidr.split('/');
        const ipLong = ipToLong(ip);
        const netLong = ipToLong(net);
        const maskLong = ~((1 << (32 - parseInt(mask))) - 1);
        return (ipLong & maskLong) === (netLong & maskLong);
    });
}

function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// 验证签名
function verifySignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// 创建备份目录
function createBackup() {
    const backupDir = `/opt/teamhub/backups/$(date +%Y%m%d_%H%M%S)`;
    exec(`mkdir -p ${backupDir} && cp -r /opt/teamhub/frontend/dist ${backupDir}/`, (error) => {
        if (error) {
            console.error('❌ 备份创建失败:', error);
        } else {
            console.log(`✅ 备份创建成功: ${backupDir}`);
        }
    });
}

// 清理旧备份（保留最近5个）
function cleanupOldBackups() {
    exec('ls -dt /opt/teamhub/backups/* | tail -n +6 | xargs rm -rf', (error) => {
        if (!error) {
            console.log('🧹 旧备份清理完成');
        }
    });
}

const server = http.createServer((req, res) => {
    // 1. IP白名单检查
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!isAllowedIP(clientIP.replace(/^::ffff:/, ''))) {
        console.warn(`🚫 非法IP访问: ${clientIP}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access denied' }));
        return;
    }

    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            // 2. 签名验证
            const signature = req.headers['x-hub-signature-256'];
            if (signature && !verifySignature(body, signature)) {
                console.error('❌ 签名验证失败');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid signature' }));
                return;
            }
            
            const event = JSON.parse(body);
            
            // 只处理push事件
            if (req.headers['x-github-event'] === 'push') {
                console.log(`📥 收到GitHub推送事件: ${event.repository.full_name} -> ${event.ref}`);
                
                // 3. 创建备份
                createBackup();
                
                // 4. 执行部署脚本（带超时和错误处理）
                const deployProcess = exec('cd /opt/teamhub/frontend && ./deploy.sh', 
                    { timeout: 300000 }, // 5分钟超时
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error('❌ 部署失败:', error);
                            // 发送邮件通知
                            sendEmail('部署失败', `部署脚本执行失败:\n错误信息: ${error.message}\n标准错误: ${stderr}\n时间: ${new Date().toLocaleString('zh-CN')}`, false);
                            console.error('🚨 部署失败告警！已发送邮件通知');
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                error: 'Deployment failed', 
                                details: stderr 
                            }));
                        } else {
                            console.log('✅ 自动部署完成:', stdout);
                            // 清理旧备份
                            cleanupOldBackups();
                            // 发送成功邮件通知
                            sendEmail('部署成功', `TeamHub前端部署成功完成!\n部署时间: ${new Date().toLocaleString('zh-CN')}\n部署输出: ${stdout}\n服务地址: http://62.234.66.82:8080`, true);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                success: true, 
                                message: 'Deployment completed' 
                            }));
                        }
                    }
                );
                
                // 监控部署进程状态
                deployProcess.on('exit', (code) => {
                    console.log(`📊 部署进程退出码: ${code}`);
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
    console.log(`🚀 优化版Webhook服务启动成功，监听端口: ${PORT}`);
    console.log(`🌐 Webhook地址: http://62.234.66.82:${PORT}/webhook`);
    console.log(`🔒 安全特性：IP白名单 + 签名验证`);
    console.log(`💾 备份策略：自动备份 + 清理旧备份`);
    console.log(`⏰ 超时设置：5分钟`);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
    console.log('🔄 收到关闭信号，优雅关闭服务...');
    server.close(() => {
        console.log('✅ Webhook服务已关闭');
        process.exit(0);
    });
});