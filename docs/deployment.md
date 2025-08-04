# 部署指南

本文档提供了 Claude Code Router 的完整部署指南，包括多种部署方式和配置选项。

## 部署方式概述

Claude Code Router 支持多种部署方式，以适应不同的使用场景和基础设施需求：

1. **本地部署**: 直接在服务器上运行
2. **Docker 容器化部署**: 使用 Docker 进行容器化部署
3. **Kubernetes 部署**: 在 Kubernetes 集群中部署
4. **云服务部署**: 部署到主流云服务平台

## 本地部署

### 系统要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+), macOS 10.15+, Windows 10+
- **Node.js**: 18.x 或更高版本
- **内存**: 至少 2GB RAM
- **存储**: 至少 100MB 可用磁盘空间
- **网络**: 可访问互联网以下载依赖项

### 安装步骤

#### 1. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# macOS (使用 Homebrew)
brew install node

# Windows (使用 Chocolatey)
choco install nodejs
```

#### 2. 克隆项目代码

```bash
git clone https://github.com/your-org/claude-code-router.git
cd claude-code-router
```

#### 3. 安装依赖

```bash
npm install
```

#### 4. 构建项目

```bash
npm run build
```

#### 5. 配置环境

创建配置文件：

```bash
mkdir -p ~/.claude-code-router
cp config.example.json ~/.claude-code-router/config.json
```

编辑配置文件：

```bash
nano ~/.claude-code-router/config.json
```

#### 6. 启动服务

```bash
# 启动服务
ccr start

# 检查服务状态
ccr status

# 停止服务
ccr stop
```

### 配置文件

#### 主配置文件

默认配置文件路径：`~/.claude-code-router/config.json`

```json
{
  "Logging": {
    "level": "info",
    "enableFileRotation": true,
    "retentionDays": 7,
    "logDirectory": "./logs",
    "enableBackwardCompatibility": true,
    "maxFileSize": "100M",
    "rotationInterval": "1d",
    "compressLogs": true,
    "consoleOutput": true,
    "requestTracking": {
      "enabled": true,
      "includeDetails": true
    }
  },
  "Providers": {
    "anthropic": {
      "apiKey": "your-anthropic-api-key"
    },
    "openai": {
      "apiKey": "your-openai-api-key"
    }
  },
  "Routing": {
    "default": "claude-3-sonnet",
    "background": "claude-3-haiku",
    "think": "claude-3-opus",
    "longContext": "claude-3-sonnet",
    "webSearch": "claude-3-haiku"
  }
}
```

#### 环境变量配置

也可以使用环境变量进行配置：

```bash
# 日志配置
export LOG_LEVEL=info
export LOG_ENABLE_FILE_ROTATION=true
export LOG_RETENTION_DAYS=7
export LOG_DIRECTORY=./logs

# API 密钥
export ANTHROPIC_API_KEY=your-anthropic-api-key
export OPENAI_API_KEY=your-openai-api-key

# 路由配置
export DEFAULT_MODEL=claude-3-sonnet
export BACKGROUND_MODEL=claude-3-haiku
```

### 服务管理

#### 启动服务

```bash
ccr start
```

#### 停止服务

```bash
ccr stop
```

#### 重启服务

```bash
ccr restart
```

#### 检查服务状态

```bash
ccr status
```

#### 查看日志

```bash
ccr logs
```

### 性能调优

#### 系统资源限制

编辑系统配置以提高性能：

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 增加进程限制
echo "* soft nproc 65536" >> /etc/security/limits.conf
echo "* hard nproc 65536" >> /etc/security/limits.conf
```

#### Node.js 调优

使用 PM2 进行进程管理：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name claude-code-router

# 设置开机自启
pm2 startup
pm2 save
```

## Docker 部署

### Docker Compose 部署（推荐）

#### 1. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  claude-code-router:
    image: claude-code-router:latest
    container_name: claude-code-router
    ports:
      - "3000:3000"
    volumes:
      - ./config:/root/.claude-code-router
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 2. 构建镜像

```bash
docker build -t claude-code-router:latest .
```

#### 3. 启动服务

```bash
docker-compose up -d
```

#### 4. 管理服务

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down
```

### 单独 Docker 部署

#### 1. 拉取镜像

```bash
docker pull claude-code-router:latest
```

#### 2. 运行容器

```bash
docker run -d \
  --name claude-code-router \
  -p 3000:3000 \
  -v $(pwd)/config:/root/.claude-code-router \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  claude-code-router:latest
```

### Docker 配置

#### 环境变量

```bash
# 基础配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 日志配置
LOG_LEVEL=info
LOG_ENABLE_FILE_ROTATION=true
LOG_RETENTION_DAYS=7
LOG_DIRECTORY=/app/logs
LOG_MAX_FILE_SIZE=100M
LOG_ROTATION_INTERVAL=1d
LOG_COMPRESS_LOGS=true

# 性能配置
LOG_PERFORMANCE_BUFFER_SIZE=8192
LOG_PERFORMANCE_FLUSH_INTERVAL=10000
LOG_PERFORMANCE_MAX_SESSION_AGE=3600000
```

#### 卷挂载

```bash
# 配置文件挂载
-v /host/config:/root/.claude-code-router

# 日志文件挂载
-v /host/logs:/app/logs

# 数据文件挂载（如果需要）
-v /host/data:/app/data
```

## Kubernetes 部署

### 部署配置

#### 1. 创建命名空间

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: claude-code-router
```

#### 2. 创建配置映射

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: claude-code-router-config
  namespace: claude-code-router
data:
  config.json: |
    {
      "Logging": {
        "level": "info",
        "enableFileRotation": true,
        "retentionDays": 7,
        "logDirectory": "/app/logs",
        "enableBackwardCompatibility": true,
        "maxFileSize": "100M",
        "rotationInterval": "1d",
        "compressLogs": true,
        "consoleOutput": true,
        "requestTracking": {
          "enabled": true,
          "includeDetails": true
        }
      },
      "Providers": {
        "anthropic": {
          "apiKey": "your-anthropic-api-key"
        }
      },
      "Routing": {
        "default": "claude-3-sonnet",
        "background": "claude-3-haiku",
        "think": "claude-3-opus",
        "longContext": "claude-3-sonnet",
        "webSearch": "claude-3-haiku"
      }
    }
```

#### 3. 创建密钥

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: claude-code-router-secrets
  namespace: claude-code-router
type: Opaque
data:
  anthropic-api-key: <base64-encoded-api-key>
```

#### 4. 创建部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-code-router
  namespace: claude-code-router
spec:
  replicas: 3
  selector:
    matchLabels:
      app: claude-code-router
  template:
    metadata:
      labels:
        app: claude-code-router
    spec:
      containers:
      - name: claude-code-router
        image: claude-code-router:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: config-volume
          mountPath: /root/.claude-code-router
        - name: logs-volume
          mountPath: /app/logs
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config-volume
        configMap:
          name: claude-code-router-config
      - name: logs-volume
        persistentVolumeClaim:
          claimName: claude-code-router-logs-pvc
```

#### 5. 创建服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: claude-code-router-service
  namespace: claude-code-router
spec:
  selector:
    app: claude-code-router
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

#### 6. 创建 Ingress（可选）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: claude-code-router-ingress
  namespace: claude-code-router
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: claude-code-router.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: claude-code-router-service
            port:
              number: 80
```

### 部署命令

```bash
# 应用配置
kubectl apply -f k8s/

# 查看部署状态
kubectl get deployments -n claude-code-router

# 查看服务状态
kubectl get services -n claude-code-router

# 查看 Pod 状态
kubectl get pods -n claude-code-router

# 查看日志
kubectl logs -n claude-code-router -l app=claude-code-router
```

## 云服务部署

### AWS 部署

#### 使用 ECS

```json
{
  "family": "claude-code-router",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "claude-code-router",
      "image": "claude-code-router:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/claude-code-router",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 使用 EC2

```bash
# 在 EC2 实例上安装 Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# 拉取并运行镜像
docker run -d \
  --name claude-code-router \
  -p 80:3000 \
  -e NODE_ENV=production \
  claude-code-router:latest
```

### Google Cloud 部署

#### 使用 Cloud Run

```bash
# 构建并推送镜像到 Container Registry
gcloud builds submit --tag gcr.io/your-project/claude-code-router

# 部署到 Cloud Run
gcloud run deploy claude-code-router \
  --image gcr.io/your-project/claude-code-router \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### 使用 GKE

```bash
# 创建 GKE 集群
gcloud container clusters create claude-code-router-cluster \
  --num-nodes=3 \
  --zone=us-central1-a

# 部署应用
kubectl apply -f k8s/
```

### Azure 部署

#### 使用 Azure Container Instances

```bash
az container create \
  --resource-group claude-code-router-rg \
  --name claude-code-router \
  --image claude-code-router:latest \
  --dns-name-label claude-code-router \
  --ports 3000
```

#### 使用 Azure Kubernetes Service

```bash
# 创建 AKS 集群
az aks create \
  --resource-group claude-code-router-rg \
  --name claude-code-router-cluster \
  --node-count 3

# 获取凭据
az aks get-credentials \
  --resource-group claude-code-router-rg \
  --name claude-code-router-cluster

# 部署应用
kubectl apply -f k8s/
```

## 监控和日志

### 日志管理

#### 日志轮转

日志系统支持自动轮转，配置示例：

```json
{
  "Logging": {
    "enableFileRotation": true,
    "maxFileSize": "100M",
    "rotationInterval": "1d",
    "retentionDays": 7,
    "compressLogs": true
  }
}
```

#### 日志级别

支持以下日志级别：
- `trace`: 最详细的日志信息
- `debug`: 调试信息
- `info`: 一般信息
- `warn`: 警告信息
- `error`: 错误信息
- `fatal`: 致命错误
- `silent`: 静默模式，不输出日志

### 性能监控

#### 请求跟踪

启用请求跟踪以监控请求生命周期：

```json
{
  "Logging": {
    "requestTracking": {
      "enabled": true,
      "includeDetails": true
    }
  }
}
```

#### 性能指标

监控关键性能指标：

```bash
# 查看系统状态
ccr status

# 查看健康检查
curl http://localhost:3000/health

# 查看指标
curl http://localhost:3000/metrics
```

### 告警配置

#### 基于日志的告警

```bash
# 监控错误日志
tail -f /app/logs/error.log | grep -E "(ERROR|FATAL)" | while read line; do
  echo "Error detected: $line" | mail -s "Claude Code Router Error" admin@example.com
done
```

#### 基于指标的告警

```bash
# 监控 CPU 使用率
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if [ "$cpu_usage" -gt 80 ]; then
  echo "High CPU usage: $cpu_usage%" | mail -s "High CPU Alert" admin@example.com
fi
```

## 故障排除

### 常见问题

#### 服务无法启动

```bash
# 检查端口占用
lsof -i :3000

# 检查进程状态
ps aux | grep claude-code-router

# 查看详细日志
ccr logs --verbose
```

#### 配置文件错误

```bash
# 验证配置文件格式
node -e "console.log(JSON.parse(require('fs').readFileSync('~/.claude-code-router/config.json', 'utf8')))"

# 检查配置项
ccr config validate
```

#### 网络连接问题

```bash
# 检查网络连接
ping api.anthropic.com

# 检查 DNS 解析
nslookup api.anthropic.com

# 检查防火墙
sudo ufw status
```

### 性能问题

#### 内存使用过高

```bash
# 监控内存使用
watch -n 1 'ps aux | grep claude-code-router | awk "{print \$4}"'

# 生成内存快照
node --inspect dist/index.js
```

#### 响应时间慢

```bash
# 监控响应时间
ab -n 1000 -c 10 http://localhost:3000/health

# 分析性能瓶颈
node --prof dist/index.js
```

## 安全配置

### 访问控制

#### API 密钥管理

```bash
# 使用环境变量存储密钥
export ANTHROPIC_API_KEY=your-api-key

# 或使用密钥管理服务
aws secretsmanager get-secret-value --secret-id claude-code-router-keys
```

#### 网络安全

```bash
# 配置防火墙
sudo ufw allow from 192.168.1.0/24 to any port 3000

# 使用 HTTPS
# 配置反向代理 (Nginx/Apache)
```

### 数据保护

#### 日志加密

```json
{
  "Logging": {
    "encryptLogs": true,
    "encryptionKey": "your-encryption-key"
  }
}
```

#### 敏感信息过滤

```json
{
  "Logging": {
    "filterSensitiveData": true,
    "sensitiveFields": ["apiKey", "password", "token"]
  }
}
```

## 升级和维护

### 版本升级

#### 备份当前配置

```bash
# 备份配置文件
cp ~/.claude-code-router/config.json ~/.claude-code-router/config.json.backup

# 备份日志文件
tar -czf logs-backup-$(date +%Y%m%d).tar.gz ./logs
```

#### 执行升级

```bash
# 停止服务
ccr stop

# 拉取新版本
git pull origin main

# 安装依赖
npm install

# 构建项目
npm run build

# 启动服务
ccr start
```

### 定期维护

#### 日志清理

```bash
# 清理旧日志文件
find ./logs -name "*.log" -mtime +7 -delete

# 压缩日志文件
gzip ./logs/*.log
```

#### 系统更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新 Node.js
sudo npm install -g n
sudo n stable
```

## 备份和恢复

### 配置备份

```bash
# 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz ~/.claude-code-router

# 恢复配置文件
tar -xzf config-backup-20240101.tar.gz -C /
```

### 数据备份

```bash
# 备份所有数据
tar -czf claude-code-router-backup-$(date +%Y%m%d).tar.gz \
  ~/.claude-code-router \
  ./logs \
  ./data

# 恢复数据
tar -xzf claude-code-router-backup-20240101.tar.gz
```

这个部署指南提供了 Claude Code Router 的完整部署方案，包括本地、Docker、Kubernetes 和云服务部署方式，以及监控、安全和维护等方面的详细说明。