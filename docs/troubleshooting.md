# 故障排除指南

本文档提供了 Claude Code Router 增强日志系统的常见问题诊断和解决方案。

## 常见问题

### 1. 初始化问题

#### 1.1 配置文件加载失败

**错误信息：**
```
Error: 无法加载日志配置文件: ENOENT: no such file or directory
```

**可能原因：**
- 配置文件不存在
- 文件路径错误
- 权限不足

**解决方案：**

1. 检查配置文件是否存在：
```bash
ls -la ~/.claude-code-router/enhanced-log-config.json
```

2. 如果文件不存在，创建默认配置：
```bash
mkdir -p ~/.claude-code-router
cp config.example.enhanced-logging.json ~/.claude-code-router/enhanced-log-config.json
```

3. 检查文件权限：
```bash
chmod 644 ~/.claude-code-router/enhanced-log-config.json
```

#### 1.2 配置验证失败

**错误信息：**
```
Error: 配置验证失败: Invalid log level: 'invalid-level'
```

**可能原因：**
- 配置格式错误
- 无效的日志级别
- 缺少必需字段

**解决方案：**

1. 验证配置格式：
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('~/.claude-code-router/enhanced-log-config.json', 'utf8')))"
```

2. 检查日志级别是否有效：
```bash
node -e "
const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
const config = JSON.parse(require('fs').readFileSync('~/.claude-code-router/enhanced-log-config.json', 'utf8'));
console.log('日志级别有效:', validLevels.includes(config.level));
"
```

3. 使用配置验证工具：
```typescript
import { LogConfigManager } from './src/utils/logging/config/LogConfigManager';

const configManager = new LogConfigManager();
const result = await configManager.loadConfig();

if (result.isErr()) {
  console.error('配置验证失败:', result.error);
  process.exit(1);
}

console.log('配置验证通过');
```

### 2. 运行时问题

#### 2.1 日志文件写入失败

**错误信息：**
```
Error: 无法写入日志文件: EACCES: permission denied
```

**可能原因：**
- 日志目录权限不足
- 磁盘空间不足
- 文件被其他进程锁定

**解决方案：**

1. 检查目录权限：
```bash
ls -la ./logs/
chmod 755 ./logs/
```

2. 检查磁盘空间：
```bash
df -h
```

3. 检查文件锁定：
```bash
lsof | grep app.log
```

4. 使用更安全的文件写入模式：
```typescript
// 在配置中使用更安全的权限设置
const config = {
  // ... 其他配置
  streams: [
    {
      type: 'file',
      level: 'info',
      path: './logs/app.log',
      options: {
        mode: 0o644, // 设置文件权限
        flags: 'a'   // 追加模式
      }
    }
  ]
};
```

#### 2.2 内存使用过高

**错误信息：**
```
Warning: 内存使用过高: 85%
```

**可能原因：**
- 请求跟踪数据积累过多
- 日志缓冲区过大
- 内存泄漏

**解决方案：**

1. 监控内存使用：
```typescript
const logManager = new LogManager();
await logManager.initialize();

// 获取内存使用情况
const memoryUsage = process.memoryUsage();
console.log('内存使用情况:', {
  rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
  heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
  external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
});
```

2. 清理请求跟踪数据：
```typescript
// 手动清理过期请求
const tracker = logManager.getRequestTracker('some-request-id');
if (tracker) {
  tracker.complete(false, undefined, new Error('手动清理'));
}
```

3. 调整配置限制：
```json
{
  "requestTracking": {
    "enabled": true,
    "maxTrackedRequests": 5000,
    "cleanupInterval": 30000,
    "retentionPeriod": 3600000
  }
}
```

#### 2.3 性能下降

**症状：**
- 日志写入变慢
- 请求响应时间增加
- CPU 使用率升高

**可能原因：**
- 同步日志写入
- 日志级别过低
- 磁盘 I/O 瓶颈

**解决方案：**

1. 检查日志级别：
```bash
grep -r "level.*debug" ~/.claude-code-router/enhanced-log-config.json
```

2. 启用异步日志：
```json
{
  "streams": [
    {
      "type": "file",
      "level": "info",
      "path": "./logs/app.log",
      "async": true,
      "bufferSize": 1000
    }
  ]
}
```

3. 优化磁盘 I/O：
```json
{
  "streams": [
    {
      "type": "file",
      "level": "info",
      "path": "./logs/app.log",
      "options": {
        "highWaterMark": 65536
      }
    }
  ]
}
```

### 3. 集成问题

#### 3.1 与现有日志系统冲突

**错误信息：**
```
Error: 日志系统初始化冲突: Multiple logger instances detected
```

**可能原因：**
- 多个日志实例同时运行
- 全局日志变量冲突
- 模块重复加载

**解决方案：**

1. 检查日志实例：
```typescript
// 检查全局日志状态
console.log('全局日志实例:', global.logger ? '存在' : '不存在');
console.log('LogManager 实例数:', global.__logManagerCount || 0);
```

2. 使用单例模式：
```typescript
// 单例模式的 LogManager
class LogManager {
  private static instance: LogManager;
  
  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }
}

// 使用单例
const logManager = LogManager.getInstance();
```

3. 清理全局状态：
```typescript
// 清理全局日志状态
delete global.logger;
delete global.__logManagerCount;
```

#### 3.2 请求跟踪失效

**症状：**
- 请求跟踪数据丢失
- 请求生命周期不完整
- 性能监控数据不准确

**可能原因：**
- 请求 ID 冲突
- 跟踪器未正确关闭
- 内存清理过于激进

**解决方案：**

1. 检查请求跟踪状态：
```typescript
const logManager = new LogManager();
await logManager.initialize();

// 获取所有活跃请求
const healthStatus = logManager.getHealthStatus();
console.log('活跃请求数:', healthStatus.activeRequests);
console.log('系统状态:', healthStatus.status);
```

2. 验证请求跟踪器：
```typescript
const tracker = logManager.trackRequest('test-request', {
  method: 'GET',
  url: '/test'
});

console.log('跟踪器状态:', tracker.getStatus());
console.log('跟踪器是否活跃:', tracker.getStatus().state === 'running');
```

3. 启用调试模式：
```json
{
  "requestTracking": {
    "enabled": true,
    "debug": true,
    "logLifecycle": true
  }
}
```

### 4. 部署问题

#### 4.1 Docker 容器日志问题

**错误信息：**
```
Error: 无法创建日志目录: EROFS: read-only file system
```

**可能原因：**
- 容器文件系统只读
- 卷挂载失败
- 权限问题

**解决方案：**

1. 检查 Docker 卷挂载：
```bash
docker inspect <container-id> | grep -A 10 "Mounts"
```

2. 修改 Dockerfile：
```dockerfile
# 确保日志目录存在并可写
RUN mkdir -p /app/logs && chmod 755 /app/logs

# 使用非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
```

3. 更新 docker-compose 配置：
```yaml
services:
  claude-code-router:
    volumes:
      - ./logs:/app/logs
    environment:
      - LOG_DIR=/app/logs
```

#### 4.2 Kubernetes 日志持久化问题

**错误信息：**
```
Warning: 日志文件丢失，Pod 重新调度后数据丢失
```

**可能原因：**
- PersistentVolumeClaim 未正确配置
- Pod 重新调度导致数据丢失
- 存储类配置问题

**解决方案：**

1. 检查 PVC 状态：
```bash
kubectl get pvc
kubectl describe pvc log-pvc
```

2. 验证存储类：
```bash
kubectl get storageclass
```

3. 更新 Kubernetes 配置：
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: log-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
```

## 诊断工具

### 1. 系统健康检查

```typescript
// 完整的健康检查脚本
import { LogManager } from './src/utils/logging/LogManager';

async function healthCheck() {
  console.log('开始系统健康检查...');
  
  try {
    const logManager = new LogManager();
    const initResult = await logManager.initialize();
    
    if (initResult.isErr()) {
      console.error('❌ 日志系统初始化失败:', initResult.error);
      return false;
    }
    
    console.log('✅ 日志系统初始化成功');
    
    // 检查配置
    const healthStatus = logManager.getHealthStatus();
    console.log('📊 系统状态:', healthStatus.status);
    console.log('📈 活跃请求数:', healthStatus.activeRequests);
    console.log('❌ 总错误数:', healthStatus.totalErrors);
    console.log('⏱️ 运行时间:', Math.round(healthStatus.uptime / 1000), '秒');
    
    // 检查内存使用
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    console.log('💾 内存使用率:', Math.round(memoryPercentage) + '%');
    
    // 检查文件系统
    const fs = require('fs');
    const logDir = './logs';
    if (fs.existsSync(logDir)) {
      const stats = fs.statSync(logDir);
      console.log('📁 日志目录状态:', stats.isDirectory() ? '正常' : '异常');
    } else {
      console.log('⚠️ 日志目录不存在');
    }
    
    // 测试日志记录
    const logger = logManager.getLogger('health-check');
    logger.info('健康检查测试日志');
    console.log('✅ 日志记录功能正常');
    
    // 测试请求跟踪
    const tracker = logManager.trackRequest('health-check-request');
    tracker.startPhase('test');
    tracker.endPhase('test');
    tracker.complete(true);
    console.log('✅ 请求跟踪功能正常');
    
    console.log('🎉 系统健康检查完成');
    return true;
    
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    return false;
  }
}

// 运行健康检查
healthCheck().then(success => {
  process.exit(success ? 0 : 1);
});
```

### 2. 性能分析工具

```typescript
// 性能分析脚本
import { performance } from 'perf_hooks';

async function performanceAnalysis() {
  console.log('开始性能分析...');
  
  const logManager = new LogManager();
  await logManager.initialize();
  
  // 测试日志记录性能
  const iterations = 1000;
  const logger = logManager.getLogger('performance-test');
  
  console.log(`📊 测试日志记录性能 (${iterations} 次迭代)...`);
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    logger.info(`性能测试消息 ${i}`, { index: i, timestamp: Date.now() });
  }
  
  const end = performance.now();
  const duration = end - start;
  const throughput = iterations / (duration / 1000);
  
  console.log(`📈 日志记录性能结果:`);
  console.log(`   总耗时: ${duration.toFixed(2)}ms`);
  console.log(`   吞吐量: ${throughput.toFixed(2)} ops/sec`);
  console.log(`   平均延迟: ${(duration / iterations).toFixed(2)}ms`);
  
  // 测试请求跟踪性能
  console.log(`📊 测试请求跟踪性能 (${iterations} 次迭代)...`);
  const requestStart = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const tracker = logManager.trackRequest(`perf-test-${i}`);
    tracker.startPhase('processing');
    tracker.endPhase('processing');
    tracker.complete(true);
  }
  
  const requestEnd = performance.now();
  const requestDuration = requestEnd - requestStart;
  const requestThroughput = iterations / (requestDuration / 1000);
  
  console.log(`📈 请求跟踪性能结果:`);
  console.log(`   总耗时: ${requestDuration.toFixed(2)}ms`);
  console.log(`   吞吐量: ${requestThroughput.toFixed(2)} ops/sec`);
  console.log(`   平均延迟: ${(requestDuration / iterations).toFixed(2)}ms`);
  
  // 内存使用分析
  const memoryBefore = process.memoryUsage();
  console.log(`💾 内存使用情况:`);
  console.log(`   RSS: ${Math.round(memoryBefore.rss / 1024 / 1024)}MB`);
  console.log(`   Heap Total: ${Math.round(memoryBefore.heapTotal / 1024 / 1024)}MB`);
  console.log(`   Heap Used: ${Math.round(memoryBefore.heapUsed / 1024 / 1024)}MB`);
  console.log(`   External: ${Math.round(memoryBefore.external / 1024 / 1024)}MB`);
  
  // 系统负载
  const cpuUsage = process.cpuUsage();
  console.log(`🖥️ CPU 使用情况:`);
  console.log(`   User: ${(cpuUsage.user / 1000).toFixed(2)}ms`);
  console.log(`   System: ${(cpuUsage.system / 1000).toFixed(2)}ms`);
  
  console.log('🎉 性能分析完成');
}

// 运行性能分析
performanceAnalysis().catch(console.error);
```

### 3. 配置验证工具

```typescript
// 配置验证脚本
import { LogConfigManager } from './src/utils/logging/config/LogConfigManager';
import { ConfigValidator } from './src/utils/logging/config/ConfigValidator';

async function validateConfiguration() {
  console.log('开始配置验证...');
  
  const configManager = new LogConfigManager();
  const validator = new ConfigValidator();
  
  try {
    // 加载配置
    const loadResult = await configManager.loadConfig();
    
    if (loadResult.isErr()) {
      console.error('❌ 配置加载失败:', loadResult.error);
      return false;
    }
    
    const config = loadResult.value;
    console.log('✅ 配置加载成功');
    
    // 验证配置
    const validation = validator.validate(config);
    
    if (!validation.isValid) {
      console.error('❌ 配置验证失败:');
      validation.errors.forEach(error => {
        console.error(`   - ${error.field}: ${error.message}`);
      });
      
      if (validation.suggestions.length > 0) {
        console.log('💡 修复建议:');
        validation.suggestions.forEach(suggestion => {
          console.log(`   - ${suggestion}`);
        });
      }
      
      return false;
    }
    
    console.log('✅ 配置验证通过');
    
    // 检查配置完整性
    const requiredFields = ['level', 'streams', 'requestTracking'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ 缺少必需字段:', missingFields.join(', '));
      return false;
    }
    
    console.log('✅ 配置完整性检查通过');
    
    // 检查日志级别
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
    if (!validLevels.includes(config.level)) {
      console.error('❌ 无效的日志级别:', config.level);
      return false;
    }
    
    console.log('✅ 日志级别检查通过');
    
    // 检查流配置
    if (!Array.isArray(config.streams) || config.streams.length === 0) {
      console.error('❌ 流配置无效或为空');
      return false;
    }
    
    console.log('✅ 流配置检查通过');
    
    console.log('🎉 配置验证完成');
    return true;
    
  } catch (error) {
    console.error('❌ 配置验证失败:', error);
    return false;
  }
}

// 运行配置验证
validateConfiguration().then(success => {
  process.exit(success ? 0 : 1);
});
```

## 调试技巧

### 1. 启用调试模式

```typescript
// 启用详细调试信息
process.env.DEBUG = 'claude-code-router:logging';
process.env.LOG_LEVEL = 'debug';

const logManager = new LogManager();
await logManager.initialize();

// 调试配置加载
console.log('当前配置:', JSON.stringify(logManager.getConfig(), null, 2));

// 调试流状态
const streamManager = (logManager as any).streamManager;
console.log('流状态:', streamManager.getStreamStatus());
```

### 2. 使用日志断点

```typescript
// 在关键位置添加日志断点
function debugRequest(requestId: string) {
  const logManager = new LogManager();
  const tracker = logManager.trackRequest(requestId);
  
  console.log('🔍 [DEBUG] 请求开始:', requestId);
  console.log('🔍 [DEBUG] 请求状态:', tracker.getStatus());
  
  // 在关键步骤添加断点
  tracker.startPhase('debug-phase');
  console.log('🔍 [DEBUG] 阶段开始:', tracker.getStatus());
  
  // ... 逻辑处理
  
  tracker.endPhase('debug-phase');
  console.log('🔍 [DEBUG] 阶段结束:', tracker.getStatus());
  
  tracker.complete(true);
  console.log('🔍 [DEBUG] 请求完成:', tracker.getStatus());
}
```

### 3. 性能分析

```typescript
// 使用 performance API 进行性能分析
const performance = require('perf_hooks');

async function debugPerformance() {
  const start = performance.now();
  
  // 执行需要调试的操作
  const logManager = new LogManager();
  await logManager.initialize();
  
  const initEnd = performance.now();
  console.log('🔍 [DEBUG] 初始化耗时:', (initEnd - start).toFixed(2), 'ms');
  
  // 测试日志记录
  const logger = logManager.getLogger('debug-test');
  const logStart = performance.now();
  
  for (let i = 0; i < 100; i++) {
    logger.info('调试日志', { iteration: i });
  }
  
  const logEnd = performance.now();
  console.log('🔍 [DEBUG] 日志记录耗时:', (logEnd - logStart).toFixed(2), 'ms');
  
  // 测试请求跟踪
  const trackStart = performance.now();
  
  for (let i = 0; i < 100; i++) {
    const tracker = logManager.trackRequest(`debug-${i}`);
    tracker.complete(true);
  }
  
  const trackEnd = performance.now();
  console.log('🔍 [DEBUG] 请求跟踪耗时:', (trackEnd - trackStart).toFixed(2), 'ms');
}
```

## 常见解决方案

### 1. 快速恢复步骤

当遇到日志系统问题时，按照以下步骤进行恢复：

1. **检查基本状态**
```bash
# 检查进程状态
ps aux | grep claude-code-router

# 检查端口占用
lsof -i :3000

# 检查磁盘空间
df -h
```

2. **备份并重置配置**
```bash
# 备份当前配置
cp ~/.claude-code-router/enhanced-log-config.json ~/.claude-code-router/enhanced-log-config.json.backup

# 重置为默认配置
cp config.example.enhanced-logging.json ~/.claude-code-router/enhanced-log-config.json
```

3. **清理日志文件**
```bash
# 清理日志文件
rm -rf ./logs/*
mkdir -p ./logs
chmod 755 ./logs
```

4. **重启服务**
```bash
# 停止服务
ccr stop

# 启动服务
ccr start

# 检查状态
ccr status
```

### 2. 性能优化配置

```json
{
  "level": "info",
  "prettyPrint": false,
  "enableRotation": true,
  "rotationConfig": {
    "size": "10M",
    "interval": "1d",
    "compress": true,
    "maxFiles": 5
  },
  "streams": [
    {
      "type": "console",
      "level": "error"
    },
    {
      "type": "file",
      "level": "info",
      "path": "./logs/app.log",
      "async": true,
      "bufferSize": 1000
    }
  ],
  "requestTracking": {
    "enabled": true,
    "maxTrackedRequests": 5000,
    "cleanupInterval": 30000,
    "retentionPeriod": 3600000
  },
  "errorHandling": {
    "maxRetries": 3,
    "retryInterval": 1000,
    "enableStatistics": true
  }
}
```

### 3. 监控脚本

```bash
#!/bin/bash
# monitor.sh - 日志系统监控脚本

LOG_DIR="./logs"
CONFIG_FILE="$HOME/.claude-code-router/enhanced-log-config.json"
MAX_LOG_SIZE=$((50 * 1024 * 1024)) # 50MB

echo "🔍 开始监控日志系统..."

# 检查配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

echo "✅ 配置文件存在"

# 检查日志目录
if [ ! -d "$LOG_DIR" ]; then
    echo "❌ 日志目录不存在: $LOG_DIR"
    exit 1
fi

echo "✅ 日志目录存在"

# 检查日志文件大小
for log_file in "$LOG_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        file_size=$(stat -c%s "$log_file")
        if [ $file_size -gt $MAX_LOG_SIZE ]; then
            echo "⚠️ 日志文件过大: $log_file ($((file_size / 1024 / 1024))MB)"
        fi
    fi
done

# 检查磁盘空间
disk_usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "⚠️ 磁盘使用率过高: ${disk_usage}%"
fi

# 检查进程
if pgrep -f "claude-code-router" > /dev/null; then
    echo "✅ Claude Code Router 进程正在运行"
else
    echo "❌ Claude Code Router 进程未运行"
fi

echo "🎉 监控完成"
```

这个故障排除指南提供了全面的诊断工具、常见问题解决方案和调试技巧，可以帮助用户快速识别和解决日志系统中的各种问题。