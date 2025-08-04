# Claude Code Router 增强日志系统使用指南

## 概述

Claude Code Router 内置了一个基于 Pino 9.x 的高性能增强日志系统，提供了强大的日志记录、监控和故障排除功能。本指南将详细介绍如何配置和使用增强日志系统。

## 快速开始

### 1. 启用增强日志系统

#### 方法一：使用配置文件

在项目根目录创建 `config.example.enhanced-logging.json`：

```json
{
  "Logging": {
    "enabled": true,
    "level": "info",
    "timestamp": true,
    "serviceName": "claude-code-router",
    "version": "1.0.0",
    "environment": "development",
    "streams": [
      {
        "name": "console",
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
        "maxActiveRequests": 1000
      },
      "errorLogging": {
        "enabled": true
      }
    }
  }
}
```

#### 方法二：使用环境变量

```bash
export ENABLE_ENHANCED_LOGGING=true
export LOG_LEVEL=info
export LOG_DIRECTORY=./logs
```

### 2. 基本使用

```typescript
import { createLogManager } from './src/utils/logging';

// 创建日志管理器
const logManager = createLogManager();

// 初始化
await logManager.initialize();

// 获取日志器
const logger = logManager.getLogger();

// 记录日志
logger.info('Application started');
logger.error('Something went wrong');
logger.debug('Debug information');
```

## 核心功能

### 1. 多流输出

支持同时向多个目标输出日志，每个流可以独立配置级别和格式：

```json
{
  "streams": [
    {
      "name": "console",
      "type": "console",
      "level": "info",
      "stderr": false
    },
    {
      "name": "combined-file",
      "type": "file",
      "level": "info",
      "path": "./logs/combined.log",
      "rotation": {
        "size": "50M",
        "interval": "1d"
      }
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
    },
    {
      "name": "network-log",
      "type": "network",
      "level": "error",
      "url": "http://log-collector:8080/logs",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer your-token"
      }
    }
  ]
}
```

### 2. 请求生命周期追踪

自动跟踪每个请求的完整生命周期，包括开始时间、结束时间、性能指标和错误状态：

```typescript
// 创建请求专用日志器
const requestLogger = logManager.createRequestLogger('req-123');

// 记录请求开始
requestLogger.info('Request started', {
  method: 'POST',
  url: '/api/chat',
  headers: { 'user-agent': 'test' }
});

// 记录请求处理过程
requestLogger.debug('Processing request');

// 记录请求完成
requestLogger.info('Request completed', {
  statusCode: 200,
  duration: 150,
  responseSize: 1024
});
```

### 3. 流式响应状态追踪

对于流式响应，系统会自动追踪传输状态、令牌使用情况和传输进度：

```typescript
// 流式响应开始
logManager.logStreamStart('req-123', {
  modelName: 'gpt-4',
  estimatedTokens: 1000
});

// 流式传输过程中
logManager.logStreamProgress('req-123', {
  tokensSent: 250,
  totalTokens: 1000,
  progress: 0.25,
  timestamp: Date.now()
});

// 流式传输完成
logManager.logStreamEnd('req-123', {
  totalTokens: 1023,
  totalDuration: 3200,
  averageSpeed: 320
});
```

### 4. 增强错误日志

提供详细的错误日志记录，包括错误统计、趋势分析和上下文信息：

```typescript
// 记录错误
logManager.logError(new Error('API request failed'), {
  requestId: 'req-123',
  userId: 'user-456',
  endpoint: '/api/chat',
  retryCount: 3,
  duration: 5000
});

// 获取错误统计
const errorStats = logManager.getErrorLogger().getErrorStatistics();
console.log('Total errors:', errorStats.totalCount);
console.log('Error rate:', errorStats.errorRate);
```

## 配置详解

### 1. 基础配置

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `enabled` | boolean | true | 是否启用增强日志系统 |
| `level` | string | 'info' | 日志级别 |
| `timestamp` | boolean | true | 是否包含时间戳 |
| `serviceName` | string | 'claude-code-router' | 服务名称 |
| `version` | string | '1.0.0' | 版本号 |
| `environment` | string | 'development' | 运行环境 |

### 2. 日志级别

支持的日志级别（从低到高）：
- `trace`: 最详细的信息，用于调试
- `debug`: 调试信息
- `info`: 一般信息
- `warn`: 警告信息
- `error`: 错误信息
- `fatal`: 致命错误信息
- `silent`: 完全静默

### 3. 流配置

#### 3.1 控制台流

```json
{
  "name": "console",
  "type": "console",
  "level": "info",
  "stderr": false,
  "autoEnd": true
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
    "interval": "1d",
    "compress": true
  },
  "autoEnd": true
}
```

#### 3.3 网络流

```json
{
  "name": "network",
  "type": "network",
  "level": "error",
  "url": "http://log-collector:8080/logs",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-token",
    "Content-Type": "application/json"
  },
  "timeout": 5000,
  "retries": 3
}
```

### 4. 增强功能配置

#### 4.1 请求追踪

```json
{
  "requestTracking": {
    "enabled": true,
    "maxActiveRequests": 1000,
    "maxContextAge": 1800000,
    "autoCleanup": true,
    "cleanupInterval": 300000,
    "includeDetails": true,
    "trackPerformance": true
  }
}
```

#### 4.2 流追踪

```json
{
  "streamTracking": {
    "enabled": true,
    "enableMetrics": true,
    "enableProgressTracking": true,
    "trackTokenUsage": true,
    "trackTiming": true,
    "maxHistorySize": 10000
  }
}
```

#### 4.3 错误日志

```json
{
  "errorLogging": {
    "enabled": true,
    "enableStatistics": true,
    "enableTrendAnalysis": true,
    "maxHistorySize": 1000,
    "includeStackTrace": true,
    "includeContext": true,
    "groupByType": true,
    "trendWindowMs": 86400000 // 24 hours
  }
}
```

#### 4.4 性能指标

```json
{
  "performanceMetrics": {
    "enabled": true,
    "collectionInterval": 60000,
    "enableThroughputMetrics": true,
    "enableLatencyMetrics": true,
    "enableErrorRateMetrics": true,
    "enableMemoryMetrics": true,
    "metricsRetentionMs": 3600000 // 1 hour
  }
}
```

## 高级用法

### 1. 动态配置更新

```typescript
// 运行时更新配置
const result = await logManager.updateConfig({
  level: 'debug',
  streams: [
    // 添加新的流
    {
      name: 'debug-file',
      'type': 'file',
      'level': 'debug',
      'path': './logs/debug.log'
    }
  ]
});

if (result.isOk()) {
  console.log('Configuration updated successfully');
} else {
  console.error('Failed to update configuration:', result.error);
}
```

### 2. 流管理

```typescript
const streamManager = logManager.getStreamManager();

// 添加流
const addResult = streamManager.addStream({
  name: 'audit-file',
  type: 'file',
  level: 'info',
  path: './logs/audit.log'
});

// 移除流
const removeResult = streamManager.removeStream('console');

// 更新流
const updateResult = streamManager.updateStream('error-file', {
  level: 'warn'
});
```

### 3. 健康检查和监控

```typescript
// 系统健康检查
const health = logManager.healthCheck();
console.log('System status:', health.status);
console.log('Uptime:', health.uptime);
console.log('Streams count:', health.streams.length);

// 获取请求追踪器统计
const requestStats = logManager.getRequestTracker().getStatistics();
console.log('Active requests:', requestStats.activeCount);
console.log('Completed requests:', requestStats.completedCount);

// 获取错误统计
const errorStats = logManager.getErrorLogger().getErrorStatistics();
console.log('Total errors:', errorStats.totalCount);
console.log('Error rate:', errorStats.errorRate);
```

### 4. 子日志器创建

```typescript
// 创建带有上下文的子日志器
const childLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
  sessionId: 'session-789'
});

// 子日志器会自动包含上下文信息
childLogger.info('Child logger message');
// 输出: {"level":"info","requestId":"req-123","userId":"user-456","sessionId":"session-789","msg":"Child logger message"}
```

## 监控和分析

### 1. 性能监控

系统内置性能指标收集：

```typescript
// 性能指标示例
const metrics = {
  throughput: 1250,      // 消息/秒
  averageLatency: 2.3,   // 平均延迟 (ms)
  errorRate: 0.02,      // 错误率
  memoryUsage: 45.2,   // 内存使用 (MB)
  diskUsage: 78.5      // 磁盘使用 (%)
};
```

### 2. 错误分析

提供丰富的错误分析功能：

```typescript
// 错误趋势分析
const errorTrends = {
  dailyErrors: [45, 52, 38, 41, 47],  // 最近5天的错误数量
  trend: 'increasing',                  // 趋势
  topErrors: [
    { type: 'NetworkError', count: 23, rate: 0.35 },
    { type: 'TimeoutError', count: 15, rate: 0.23 },
    { type: 'ValidationError', count: 12, rate: 0.18 }
  ]
};
```

### 3. 请求分析

详细的请求分析报告：

```typescript
// 请求分析示例
const requestAnalysis = {
  totalRequests: 15420,
  averageDuration: 156.7,
  successRate: 0.987,
  topEndpoints: [
    { endpoint: '/api/chat', count: 8920, avgDuration: 145.3 },
    { endpoint: '/api/completions', count: 4560, avgDuration: 178.9 },
    { endpoint: '/api/models', count: 1940, avgDuration: 89.2 }
  ]
};
```

## 部署和运维

### 1. 日志轮转

系统支持自动日志轮转，防止日志文件过大：

```bash
# 手动触发日志轮转
./scripts/log-rotation.sh

# 设置定时任务
0 0 * * * /path/to/scripts/log-rotation.sh
```

### 2. 日志监控

定期监控日志系统状态：

```bash
# 运行监控脚本
./scripts/log-monitoring.sh

# 设置定时任务
*/5 * * * * /path/to/scripts/log-monitoring.sh
```

### 3. 告警配置

配置告警规则：

```bash
# 磁盘空间告警
df -h /app/logs | awk 'NR==2 && $5+0 > 80 {print "Disk usage critical: " $5}'

# 错误日志告警
grep -c "ERROR" /app/logs/error.log | awk '$1 > 100 {print "Error count critical: " $1}'
```

### 4. 性能调优

#### 4.1 生产环境调优

```json
{
  "Logging": {
    "level": "warn",
    "streams": [
      {
        "name": "error-file",
        "type": "file",
        "level": "error",
        "path": "./logs/error.log",
        "bufferSize": 65536,
        "flushInterval": 5000
      }
    ],
    "enhancedFeatures": {
      "requestTracking": {
        "enabled": true,
        "maxActiveRequests": 5000,
        "autoCleanup": true,
        "cleanupInterval": 600000
      }
    }
  }
}
```

#### 4.2 开发环境调优

```json
{
  "Logging": {
    "level": "debug",
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
}
```

## 故障排除

### 1. 常见问题

#### 1.1 日志文件权限问题

```bash
# 检查权限
ls -la /app/logs/

# 修复权限
sudo chown -R $USER:$USER /app/logs
chmod 755 /app/logs
chmod 644 /app/logs/*.log
```

#### 1.2 磁盘空间不足

```bash
# 检查磁盘使用
df -h /app/logs

# 清理旧日志
find /app/logs -name "*.log.*" -mtime +30 -delete

# 压缩日志
find /app/logs -name "*.log.*" -mtime +1 -exec gzip {} \;
```

#### 1.3 内存使用过高

```bash
# 检查内存使用
ps aux | grep claude-code-router

# 调整配置减少内存使用
{
  "enhancedFeatures": {
    "requestTracking": {
      "maxActiveRequests": 500,  // 减少最大并发数
      "maxContextAge": 900000     // 减少上下文保留时间
    },
    "errorLogging": {
      "maxHistorySize": 500       // 减少错误历史大小
    }
  }
}
```

### 2. 调试模式

启用详细的调试信息：

```json
{
  "Logging": {
    "level": "trace",
    "streams": [
      {
        "name": "debug-console",
        "type": "console",
        "level": "trace"
      }
    ],
    "enhancedFeatures": {
      "performanceMetrics": {
        "enabled": true,
        "collectionInterval": 10000  // 更频繁的指标收集
      }
    }
  }
}
```

### 3. 性能分析

使用内置的性能分析工具：

```typescript
// 获取详细的性能报告
const performanceReport = logManager.getPerformanceReport();
console.log('Performance report:', performanceReport);

// 导出性能数据
const performanceData = logManager.exportPerformanceData();
// 保存到文件或发送到监控系统
```

## 最佳实践

### 1. 生产环境

- 使用 `warn` 或 `error` 级别减少日志量
- 启用日志轮转和压缩
- 配置监控系统
- 定期清理旧日志文件
- 设置合理的内存和性能限制

### 2. 开发环境

- 使用 `debug` 级别获取详细信息
- 启用控制台输出
- 配置较小的日志文件保留期限
- 启用所有增强功能用于调试

### 3. 测试环境

- 使用与生产环境相似的配置
- 启用所有监控功能
- 配置详细的错误追踪
- 测试日志轮转和清理功能

### 4. 性能优化建议

- 使用适当的日志级别
- 配置合理的缓冲区大小
- 定期清理过期数据
- 监控系统资源使用
- 避免在生产环境中使用 `trace` 级别

## 总结

增强日志系统为 Claude Code Router 提供了强大的日志记录、监控和分析能力。通过合理的配置和使用，可以：

- 提高系统的可观测性
- 快速定位和解决问题
- 监控系统性能和健康状况
- 支持大规模部署和运维
- 提供详细的审计和合规信息

根据您的具体需求和环境，选择合适的配置和部署方式，充分利用增强日志系统的功能。