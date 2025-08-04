# Claude Code Router 增强日志系统部署指南

## 概述

本指南提供了如何部署具有增强日志功能的 Claude Code Router 的详细说明。增强日志系统基于 Pino 9.x 构建，提供了高性能、多流输出、请求追踪和错误日志增强等功能。

## 部署选项

### 1. Docker 部署

#### 1.1 基础 Docker 部署

```bash
# 构建镜像
docker build -f Dockerfile.logging -t claude-code-router:logging .

# 运行容器
docker run -d \
  --name claude-code-router-logging \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/config:/app/config \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  claude-code-router:logging
```

#### 1.2 使用 Docker Compose

```bash
# 使用默认配置启动
docker-compose -f docker-compose.logging.yml up -d

# 启动完整监控系统（包括 Prometheus 和 Grafana）
docker-compose -f docker-compose.logging.yml --profile monitoring up -d

# 启动 ELK Stack（用于高级日志分析）
docker-compose -f docker-compose.logging.yml --profile elk up -d

# 启动所有服务
docker-compose -f docker-compose.logging.yml --profile full up -d
```

#### 1.3 环境变量配置

```bash
# 创建 .env 文件
cat > .env << EOF
NODE_ENV=production
LOG_LEVEL=info
LOG_DIRECTORY=/app/logs
LOG_RETENTION_DAYS=30
LOG_MAX_FILE_SIZE=10M
LOG_MAX_FILES=10
ENABLE_REQUEST_TRACKING=true
ENABLE_STREAM_TRACKING=true
ENABLE_ERROR_ENHANCEMENT=true
ENABLE_PERFORMANCE_METRICS=true
EOF

# 使用环境变量启动
docker-compose -f docker-compose.logging.yml --env-file .env up -d
```

### 2. Kubernetes 部署

#### 2.1 基础 K8s 部署

```bash
# 创建命名空间
kubectl create namespace claude-code-router-logging

# 部署应用
kubectl apply -f k8s/logging-deployment.yaml

# 检查部署状态
kubectl get pods -n claude-code-router-logging
kubectl get services -n claude-code-router-logging
```

#### 2.2 配置更新

```bash
# 更新配置
kubectl edit configmap logging-config -n claude-code-router-logging

# 重新部署以应用更改
kubectl rollout restart deployment/claude-code-router-logging -n claude-code-router-logging
```

#### 2.3 扩展和管理

```bash
# 扩展副本数
kubectl scale deployment/claude-code-router-logging --replicas=5 -n claude-code-router-logging

# 查看日志
kubectl logs -f deployment/claude-code-router-logging -n claude-code-router-logging

# 进入容器调试
kubectl exec -it deployment/claude-code-router-logging -n claude-code-router-logging -- /bin/sh
```

### 3. 传统部署

#### 3.1 系统要求

- Node.js 18.x 或更高版本
- npm 或 pnpm 包管理器
- 足够的磁盘空间用于日志文件

#### 3.2 安装和配置

```bash
# 克隆项目
git clone https://github.com/your-repo/claude-code-router.git
cd claude-code-router

# 安装依赖
pnpm install

# 构建应用
pnpm run build

# 配置日志系统
cp config.example.enhanced-logging.json config/logging-config.json

# 编辑配置文件
nano config/logging-config.json
```

#### 3.3 启动服务

```bash
# 启动应用
node dist/cli.js

# 或使用 PM2（推荐）
pnpm install -g pm2
pm2 start dist/cli.js --name "claude-code-router"
pm2 save
pm2 startup
```

## 配置说明

### 1. 日志配置文件

配置文件位于 `config/logging-config.json`，主要配置项：

```json
{
  "enabled": true,
  "level": "info",
  "timestamp": true,
  "serviceName": "claude-code-router",
  "streams": [
    {
      "name": "console-output",
      "type": "console",
      "level": "info"
    },
    {
      "name": "error-file",
      "type": "file",
      "level": "error",
      "path": "./logs/error.log",
      "rotation": {
        "size": "10M",
        "interval": "1d"
      }
    }
  ],
  "enhancedFeatures": {
    "requestTracking": {
      "enabled": true,
      "maxActiveRequests": 1000,
      "maxContextAge": 1800000
    },
    "streamTracking": {
      "enabled": true,
      "enableMetrics": true
    },
    "errorLogging": {
      "enabled": true,
      "enableStatistics": true,
      "maxHistorySize": 1000
    }
  }
}
```

### 2. 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `NODE_ENV` | `development` | 运行环境 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `LOG_DIRECTORY` | `./logs` | 日志目录 |
| `LOG_RETENTION_DAYS` | `30` | 日志保留天数 |
| `LOG_MAX_FILE_SIZE` | `10M` | 最大日志文件大小 |
| `LOG_MAX_FILES` | `10` | 最大日志文件数量 |
| `ENABLE_REQUEST_TRACKING` | `true` | 是否启用请求追踪 |
| `ENABLE_STREAM_TRACKING` | `true` | 是否启用流追踪 |
| `ENABLE_ERROR_ENHANCEMENT` | `true` | 是否启用错误日志增强 |

### 3. 流配置

支持多种流类型：

#### 3.1 控制台流
```json
{
  "name": "console",
  "type": "console",
  "level": "info",
  "stderr": false
}
```

#### 3.2 文件流
```json
{
  "name": "file",
  "type": "file",
  "level": "error",
  "path": "./logs/error.log",
  "rotation": {
    "size": "10M",
    "interval": "1d"
  }
}
```

#### 3.3 网络流
```json
{
  "name": "network",
  "type": "network",
  "level": "info",
  "url": "http://log-collector:8080/logs",
  "method": "POST"
}
```

## 监控和维护

### 1. 日志轮转

系统支持自动日志轮转：

```bash
# 手动触发日志轮转
./scripts/log-rotation.sh

# 设置定时任务（每天执行）
echo "0 0 * * * /app/scripts/log-rotation.sh" | crontab -
```

### 2. 日志监控

```bash
# 运行日志监控脚本
./scripts/log-monitoring.sh

# 设置定时任务（每5分钟执行）
echo "*/5 * * * * /app/scripts/log-monitoring.sh" | crontab -
```

### 3. 性能监控

#### 3.1 使用 Prometheus 和 Grafana

```bash
# 启动监控系统
docker-compose -f docker-compose.logging.yml --profile monitoring up -d

# 访问 Grafana
# http://localhost:3001
# 用户名: admin
# 密码: admin
```

#### 3.2 关键指标

- **日志吞吐量**: 每秒处理的日志消息数量
- **延迟**: 日志记录的延迟时间
- **错误率**: 错误日志的比例
- **磁盘使用**: 日志文件占用的磁盘空间
- **内存使用**: 日志系统的内存消耗

### 4. 告警配置

#### 4.1 磁盘空间告警

```bash
# 设置磁盘空间告警（当使用率超过80%时触发）
echo "*/5 * * * * df -h /app/logs | awk 'NR==2 && \$5+0 > 80 {print \"Disk usage critical: \" \$5}' | mail -s \"Disk Space Alert\" admin@example.com" | crontab -
```

#### 4.2 错误日志告警

```bash
# 设置错误日志告警（当1小时内错误超过100条时触发）
echo "0 * * * * grep -c \"ERROR\" /app/logs/error.log | awk '\$1 > 100 {print \"Error count critical: \" \$1}' | mail -s \"Error Log Alert\" admin@example.com" | crontab -
```

## 故障排除

### 1. 常见问题

#### 1.1 日志文件权限问题

```bash
# 检查日志目录权限
ls -la /app/logs/

# 修复权限
sudo chown -R nodejs:nodejs /app/logs
sudo chmod -R 755 /app/logs
```

#### 1.2 磁盘空间不足

```bash
# 检查磁盘空间
df -h /app/logs

# 清理旧日志文件
find /app/logs -name "*.log.*" -mtime +30 -delete

# 压缩日志文件
find /app/logs -name "*.log.*" -mtime +1 -exec gzip {} \;
```

#### 1.3 日志系统未启动

```bash
# 检查进程状态
ps aux | grep claude-code-router

# 检查日志
tail -f /app/logs/error.log

# 重启服务
pm2 restart claude-code-router
```

### 2. 性能优化

#### 2.1 日志级别优化

```json
{
  "level": "warn",  // 生产环境使用较高级别
  "streams": [
    {
      "name": "error-file",
      "type": "file",
      "level": "error",
      "path": "./logs/error.log"
    }
  ]
}
```

#### 2.2 缓冲区优化

```json
{
  "streams": [
    {
      "name": "buffered-file",
      "type": "file",
      "level": "info",
      "path": "./logs/buffered.log",
      "bufferSize": 65536,
      "flushInterval": 5000
    }
  ]
}
```

#### 2.3 并发优化

```json
{
  "enhancedFeatures": {
    "requestTracking": {
      "enabled": true,
      "maxActiveRequests": 2000,  // 增加并发请求数
      "maxContextAge": 3600000      // 增加上下文保留时间
    }
  }
}
```

### 3. 安全配置

#### 3.1 日志文件权限

```bash
# 设置严格的日志文件权限
chmod 750 /app/logs
chmod 640 /app/logs/*.log
```

#### 3.2 网络安全

```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: logging-netpol
spec:
  podSelector:
    matchLabels:
      app: claude-code-router
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: monitoring
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 10.0.0.0/8
        - 172.16.0.0/12
        - 192.168.0.0/16
```

## 最佳实践

### 1. 生产环境配置

```json
{
  "level": "warn",
  "timestamp": true,
  "serviceName": "claude-code-router",
  "streams": [
    {
      "name": "error-file",
      "type": "file",
      "level": "error",
      "path": "./logs/error.log",
      "rotation": {
        "size": "50M",
        "interval": "1d"
      }
    },
    {
      "name": "combined-file",
      "type": "file",
      "level": "info",
      "path": "./logs/combined.log",
      "rotation": {
        "size": "100M",
        "interval": "1d"
      }
    }
  ],
  "enhancedFeatures": {
    "requestTracking": {
      "enabled": true,
      "maxActiveRequests": 1000,
      "autoCleanup": true,
      "cleanupInterval": 300000
    },
    "errorLogging": {
      "enabled": true,
      "enableStatistics": true,
      "maxHistorySize": 5000
    }
  }
}
```

### 2. 开发环境配置

```json
{
  "level": "debug",
  "timestamp": true,
  "serviceName": "claude-code-router-dev",
  "streams": [
    {
      "name": "console",
      "type": "console",
      "level": "debug"
    },
    {
      "name": "debug-file",
      "type": "file",
      "level": "debug",
      "path": "./logs/debug.log"
    }
  ],
  "enhancedFeatures": {
    "requestTracking": {
      "enabled": true,
      "maxActiveRequests": 100,
      "autoCleanup": true,
      "cleanupInterval": 60000
    }
  }
}
```

### 3. 测试环境配置

```json
{
  "level": "debug",
  "timestamp": true,
  "serviceName": "claude-code-router-test",
  "streams": [
    {
      "name": "console",
      "type": "console",
      "level": "debug"
    }
  ],
  "enhancedFeatures": {
    "requestTracking": {
      "enabled": false
    },
    "streamTracking": {
      "enabled": false
    }
  }
}
```

## 总结

本部署指南提供了多种部署选项，从简单的 Docker 部署到完整的 Kubernetes 集群部署。根据您的具体需求和环境，选择合适的部署方式。

关键要点：
1. **生产环境**: 使用 Kubernetes 部署，配置完整的监控和告警系统
2. **开发环境**: 使用 Docker Compose 快速启动
3. **测试环境**: 简化配置，专注于功能验证
4. **监控**: 使用 Prometheus + Grafana 进行性能监控
5. **维护**: 定期清理日志文件，监控系统状态

通过合理的配置和部署，增强日志系统将为您的 Claude Code Router 提供强大的日志记录、监控和故障排除能力。