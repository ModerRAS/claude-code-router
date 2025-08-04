# API 参考文档

本文档提供了 Claude Code Router 增强日志系统的完整 API 参考。

## 核心类和接口

### LogManager

日志系统的核心管理类，负责协调所有日志组件。

#### 构造函数

```typescript
constructor(configPath?: string)
```

- `configPath`: 可选配置文件路径，默认为 `~/.claude-code-router/enhanced-log-config.json`

#### 主要方法

##### `initialize(): Promise<Result<void, Error>>`

初始化日志系统。

**返回值:** `Result<void, Error>` - 初始化结果

**示例:**
```typescript
const logManager = new LogManager();
const result = await logManager.initialize();
if (result.isErr()) {
  console.error('初始化失败:', result.error);
}
```

##### `getLogger(category?: string): PinoLogger`

获取指定类别的日志记录器。

**参数:**
- `category`: 日志类别，可选

**返回值:** `PinoLogger` - Pino 日志记录器实例

**示例:**
```typescript
const logger = logManager.getLogger('request');
logger.info('请求开始');
```

##### `trackRequest(requestId: string, metadata?: RequestMetadata): RequestTracker`

开始跟踪请求。

**参数:**
- `requestId`: 请求唯一标识符
- `metadata`: 请求元数据，可选

**返回值:** `RequestTracker` - 请求跟踪器实例

**示例:**
```typescript
const tracker = logManager.trackRequest('req-123', {
  method: 'POST',
  url: '/api/chat',
  userAgent: 'Claude Code'
});
```

##### `getRequestTracker(requestId: string): RequestTracker | undefined`

获取现有请求跟踪器。

**参数:**
- `requestId`: 请求唯一标识符

**返回值:** `RequestTracker | undefined` - 请求跟踪器实例

##### `logError(error: Error | string, context?: LogContext): void`

记录错误信息。

**参数:**
- `error`: 错误对象或错误消息
- `context`: 错误上下文信息，可选

**示例:**
```typescript
try {
  // 可能出错的代码
} catch (err) {
  logManager.logError(err, {
    component: 'UserService',
    operation: 'createUser',
    userId: 'user-123'
  });
}
```

##### `getHealthStatus(): LogSystemHealth`

获取日志系统健康状态。

**返回值:** `LogSystemHealth` - 健康状态对象

##### `shutdown(): Promise<void>`

优雅关闭日志系统。

**示例:**
```typescript
process.on('SIGTERM', async () => {
  await logManager.shutdown();
  process.exit(0);
});
```

### LogConfigManager

日志配置管理器，负责加载和管理配置。

#### 构造函数

```typescript
constructor(configPath?: string)
```

#### 主要方法

##### `loadConfig(): Promise<Result<LogConfig, Error>>`

加载配置文件。

**返回值:** `Result<LogConfig, Error>` - 加载结果

##### `getConfig(): LogConfig`

获取当前配置。

**返回值:** `LogConfig` - 当前配置对象

##### `updateConfig(updates: Partial<LogConfig>): void`

更新配置。

**参数:**
- `updates`: 配置更新对象

##### `validateConfig(config: Partial<LogConfig>): ValidationResult`

验证配置有效性。

**参数:**
- `config`: 待验证的配置

**返回值:** `ValidationResult` - 验证结果

### RequestTracker

请求跟踪器，用于监控请求生命周期。

#### 构造函数

```typescript
constructor(requestId: string, metadata?: RequestMetadata)
```

#### 主要方法

##### `startPhase(phase: string, metadata?: Record<string, unknown>): void`

开始请求阶段。

**参数:**
- `phase`: 阶段名称
- `metadata`: 阶段元数据

**示例:**
```typescript
tracker.startPhase('processing', {
  model: 'claude-3-sonnet',
  tokens: 1000
});
```

##### `endPhase(phase: string, success?: boolean, error?: Error): void`

结束请求阶段。

**参数:**
- `phase`: 阶段名称
- `success`: 是否成功，默认为 true
- `error`: 错误对象，如果失败

**示例:**
```typescript
tracker.endPhase('processing', true);
```

##### `updateProgress(percentage: number, message?: string): void`

更新请求进度。

**参数:**
- `percentage`: 进度百分比 (0-100)
- `message`: 进度消息，可选

##### `addTiming(label: string, duration: number): void`

添加时间标记。

**参数:**
- `label`: 时间标记名称
- `duration`: 持续时间（毫秒）

##### `setStreamState(state: StreamState): void`

设置流状态。

**参数:**
- `state`: 流状态

**示例:**
```typescript
tracker.setStreamState({
  active: true,
  bytesSent: 1024,
  bytesReceived: 2048,
  lastActivity: Date.now()
});
```

##### `complete(success: boolean, result?: any, error?: Error): void`

完成请求跟踪。

**参数:**
- `success`: 是否成功
- `result`: 请求结果，可选
- `error`: 错误对象，如果失败

##### `getStatus(): RequestStatus`

获取请求状态。

**返回值:** `RequestStatus` - 请求状态对象

### ErrorLogger

增强的错误日志记录器。

#### 主要方法

##### `log(error: Error | string, context?: LogContext): void`

记录错误。

**参数:**
- `error`: 错误对象或错误消息
- `context`: 错误上下文

##### `getStats(): ErrorStats`

获取错误统计信息。

**返回值:** `ErrorStats` - 错误统计对象

##### `getRecentErrors(count?: number): ErrorEntry[]`

获取最近的错误记录。

**参数:**
- `count`: 返回的错误数量，默认为 10

**返回值:** `ErrorEntry[]` - 错误记录数组

### StreamManager

流管理器，管理多流输出。

#### 主要方法

##### `addStream(stream: LogStream): void`

添加日志流。

**参数:**
- `stream`: 日志流对象

##### `removeStream(streamId: string): void`

移除日志流。

**参数:**
- `streamId`: 流ID

##### `getStreamStatus(): StreamStatus[]`

获取所有流状态。

**返回值:** `StreamStatus[]` - 流状态数组

##### `reconfigureStreams(config: LogConfig): Promise<Result<void, Error>>`

重新配置流。

**参数:**
- `config`: 新的日志配置

**返回值:** `Result<void, Error>` - 重新配置结果

## 核心类型和接口

### LogConfig

日志配置接口。

```typescript
interface LogConfig {
  level: LogLevel;
  prettyPrint: boolean;
  enableRotation: boolean;
  rotationConfig: RotationConfig;
  streams: StreamConfig[];
  requestTracking: RequestTrackingConfig;
  errorHandling: ErrorHandlingConfig;
  performance: PerformanceConfig;
}
```

### RequestMetadata

请求元数据接口。

```typescript
interface RequestMetadata {
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}
```

### LogContext

日志上下文接口。

```typescript
interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: unknown;
}
```

### StreamState

流状态接口。

```typescript
interface StreamState {
  active: boolean;
  bytesSent?: number;
  bytesReceived?: number;
  lastActivity: number;
  errorCount?: number;
  [key: string]: unknown;
}
```

### RequestStatus

请求状态接口。

```typescript
interface RequestStatus {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  state: 'pending' | 'running' | 'completed' | 'failed';
  phases: RequestPhase[];
  progress?: number;
  metadata?: RequestMetadata;
  streamState?: StreamState;
  success?: boolean;
  error?: string;
  result?: any;
}
```

### RequestPhase

请求阶段接口。

```typescript
interface RequestPhase {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}
```

### LogSystemHealth

日志系统健康状态接口。

```typescript
interface LogSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    config: 'healthy' | 'unhealthy';
    streams: 'healthy' | 'degraded' | 'unhealthy';
    requestTracker: 'healthy' | 'degraded' | 'unhealthy';
    errorLogger: 'healthy' | 'degraded' | 'unhealthy';
  };
  uptime: number;
  lastHealthCheck: number;
  activeRequests: number;
  totalErrors: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}
```

### Result

结果类型，用于安全的错误处理。

```typescript
interface Result<T, E = Error> {
  success: boolean;
  value?: T;
  error?: E;
  isOk(): boolean;
  isErr(): boolean;
  map<U>(fn: (value: T) => U): Result<U, E>;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  match<U>(patterns: {
    Ok: (value: T) => U;
    Err: (error: E) => U;
  }): U;
}
```

## 枚举和常量

### LogLevel

日志级别枚举。

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
```

### StreamType

流类型枚举。

```typescript
type StreamType = 'console' | 'file' | 'network' | 'custom';
```

### LOG_LEVELS

日志级别数值映射。

```typescript
const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Infinity
} as const;
```

## 工具函数

### Ok

创建成功结果。

```typescript
function Ok<T, E = Error>(value: T): Result<T, E>
```

### Err

创建失败结果。

```typescript
function Err<T, E = Error>(error: E): Result<T, E>
```

### createLogManager

创建并初始化 LogManager 实例。

```typescript
async function createLogManager(configPath?: string): Promise<Result<LogManager, Error>>
```

### createRequestTracker

创建请求跟踪器。

```typescript
function createRequestTracker(
  requestId: string,
  metadata?: RequestMetadata
): RequestTracker
```

## 向后兼容性

### LegacyLogger

传统日志记录器包装器。

```typescript
interface LegacyLogger {
  log(level: string, message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
```

### createLegacyAdapter

创建传统日志适配器。

```typescript
function createLegacyAdapter(logger: PinoLogger): LegacyLogger
```

## 使用示例

### 基础使用

```typescript
import { LogManager } from './src/utils/logging/LogManager';

// 创建并初始化日志管理器
const logManager = new LogManager();
await logManager.initialize();

// 获取日志记录器
const logger = logManager.getLogger('app');
logger.info('应用程序启动');

// 跟踪请求
const tracker = logManager.trackRequest('req-123', {
  method: 'GET',
  url: '/api/status'
});

// 开始处理阶段
tracker.startPhase('validation');
// ... 验证逻辑
tracker.endPhase('validation', true);

// 完成请求
tracker.complete(true, { status: 'ok' });
```

### 错误处理

```typescript
import { LogManager, LogContext } from './src/utils/logging/LogManager';

const logManager = new LogManager();
await logManager.initialize();

try {
  // 可能出错的代码
  throw new Error('处理失败');
} catch (error) {
  const context: LogContext = {
    component: 'UserService',
    operation: 'createUser',
    userId: 'user-123'
  };
  
  logManager.logError(error, context);
}
```

### 配置管理

```typescript
import { LogConfigManager } from './src/utils/logging/config/LogConfigManager';

const configManager = new LogConfigManager();
const result = await configManager.loadConfig();

if (result.isOk()) {
  const config = result.value;
  console.log('当前配置:', config);
  
  // 更新配置
  configManager.updateConfig({
    level: 'debug',
    prettyPrint: true
  });
} else {
  console.error('配置加载失败:', result.error);
}
```

### 自定义流

```typescript
import { StreamManager, LogStream } from './src/utils/logging/StreamManager';

const streamManager = new StreamManager();

// 添加自定义流
const customStream: LogStream = {
  id: 'custom-stream',
  type: 'custom',
  level: 'info',
  write: (data) => {
    // 自定义写入逻辑
    console.log('自定义流:', data);
  }
};

streamManager.addStream(customStream);
```

## 最佳实践

1. **请求跟踪**: 始终为每个请求创建跟踪器，确保完整的请求生命周期监控
2. **错误上下文**: 记录错误时提供详细的上下文信息，便于问题排查
3. **配置管理**: 使用环境变量和配置文件的组合，灵活管理日志配置
4. **性能监控**: 定期检查错误统计和性能指标，及时发现潜在问题
5. **优雅关闭**: 在应用程序关闭时正确关闭日志系统，确保所有日志都被正确写入

## 错误处理模式

```typescript
// 使用 Result 模式进行错误处理
async function processRequest(requestId: string) {
  const logManager = new LogManager();
  const initResult = await logManager.initialize();
  
  if (initResult.isErr()) {
    return Err(initResult.error);
  }
  
  const tracker = logManager.trackRequest(requestId);
  tracker.startPhase('processing');
  
  try {
    // 处理逻辑
    const result = await doProcessing();
    
    tracker.complete(true, result);
    return Ok(result);
  } catch (error) {
    tracker.complete(false, undefined, error);
    logManager.logError(error, { requestId });
    return Err(error);
  }
}
```

这个 API 参考文档提供了完整的类型定义和使用示例，可以作为开发者的主要参考资料。