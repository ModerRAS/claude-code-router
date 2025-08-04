import pino, { Logger } from 'pino';
import { LogConfigManager } from './config/LogConfigManager';
import { StreamManager } from './streams/StreamManager';
import { RequestContextTracker } from './tracking/RequestContextTracker';
import { StreamStateTracker } from './tracking/StreamStateTracker';
import { ErrorLogger } from './enhanced/ErrorLogger';
import { LogConfig, LogLevel } from './types/log-config';
import { RequestContext } from './types/request-context';
import { StreamState } from './types/request-context';
import { Result, Ok, Err } from './types/common';

/**
 * 主日志管理器 - 核心日志管理入口
 * 
 * 简化实现说明：
 * - 原本实现：复杂的日志管理、插件系统、热重载、高级过滤
 * - 简化实现：基础的日志记录功能，简化配置管理，基本请求追踪
 * - 文件位置：src/utils/logging/LogManager.ts
 * - 优化点：后续可添加插件系统、热重载、高级过滤规则、性能优化
 */
export class LogManager {
  private configManager: LogConfigManager;
  private streamManager: StreamManager;
  private requestTracker: RequestContextTracker | null = null;
  private streamTracker: StreamStateTracker | null = null;
  private errorLogger: ErrorLogger | null = null;
  private logger: Logger | null = null;
  private initialized = false;

  constructor(config?: Partial<LogConfig>) {
    this.configManager = new LogConfigManager(config);
    this.streamManager = new StreamManager(this.configManager.getConfig());
  }

  /**
   * 初始化日志管理器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      if (this.initialized) {
        return Ok(undefined);
      }

      // 初始化配置
      const configResult = await this.configManager.initialize();
      if (configResult.isErr()) {
        return Err(configResult.error);
      }

      // 初始化流管理器
      const streamResult = await this.streamManager.initialize();
      if (streamResult.isErr()) {
        return Err(streamResult.error);
      }

      // 创建主日志器
      const config = this.configManager.getConfig();
      const multiStreams = this.streamManager.getMultiStreams();

      this.logger = pino({
        level: config.level,
        base: {
          service: config.serviceName,
          version: config.version,
          environment: config.environment,
        },
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: config.timestamp ? pino.stdTimeFunctions.isoTime : false,
      }, pino.multistream(multiStreams));

      // 初始化请求追踪器
      this.requestTracker = new RequestContextTracker(this.logger);
      const trackerResult = await this.requestTracker.initialize();
      if (trackerResult.isErr()) {
        return Err(trackerResult.error);
      }

      // 初始化流状态追踪器
      this.streamTracker = new StreamStateTracker(this.logger);
      const streamTrackerResult = await this.streamTracker.initialize();
      if (streamTrackerResult.isErr()) {
        return Err(streamTrackerResult.error);
      }

      // 初始化错误日志增强器
      this.errorLogger = new ErrorLogger(this.logger);
      const errorLoggerResult = await this.errorLogger.initialize();
      if (errorLoggerResult.isErr()) {
        return Err(errorLoggerResult.error);
      }

      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取日志器实例
   */
  getLogger(): Logger {
    if (!this.logger) {
      throw new Error('LogManager not initialized. Call initialize() first.');
    }
    return this.logger;
  }

  /**
   * 获取请求追踪器
   */
  getRequestTracker(): RequestContextTracker {
    if (!this.requestTracker) {
      throw new Error('RequestTracker not initialized. Call initialize() first.');
    }
    return this.requestTracker;
  }

  /**
   * 获取流状态追踪器
   */
  getStreamTracker(): StreamStateTracker {
    if (!this.streamTracker) {
      throw new Error('StreamTracker not initialized. Call initialize() first.');
    }
    return this.streamTracker;
  }

  /**
   * 获取错误日志增强器
   */
  getErrorLogger(): ErrorLogger {
    if (!this.errorLogger) {
      throw new Error('ErrorLogger not initialized. Call initialize() first.');
    }
    return this.errorLogger;
  }

  /**
   * 创建带请求上下文的日志器
   */
  createRequestLogger(requestId: string, context?: Partial<RequestContext>): Logger {
    if (!this.logger || !this.requestTracker) {
      throw new Error('LogManager not initialized. Call initialize() first.');
    }

    // 创建请求上下文
    const requestContext = this.requestTracker.createContext(requestId, context);

    // 创建绑定请求上下文的日志器
    const childLogger = this.logger.child({
      requestId: requestContext.requestId,
      sessionId: requestContext.sessionId,
      userId: requestContext.userId,
      traceId: requestContext.traceId,
    });

    return childLogger;
  }

  /**
   * 记录请求开始
   */
  logRequestStart(requestId: string, method: string, url: string, headers?: Record<string, string>): void {
    if (!this.requestTracker) {
      return;
    }

    this.requestTracker.trackRequestStart(requestId, method, url, headers);
  }

  /**
   * 记录请求结束
   */
  logRequestEnd(requestId: string, statusCode: number, duration: number, responseSize?: number): void {
    if (!this.requestTracker) {
      return;
    }

    this.requestTracker.trackRequestEnd(requestId, statusCode, duration, responseSize);
  }

  /**
   * 记录请求错误
   */
  logRequestError(requestId: string, error: Error, statusCode?: number): void {
    if (!this.requestTracker) {
      return;
    }

    this.requestTracker.trackRequestError(requestId, error, statusCode);
  }

  /**
   * 记录流式响应状态
   */
  logStreamUpdate(requestId: string, status: 'started' | 'progress' | 'completed' | 'error', message?: string): void {
    if (!this.requestTracker) {
      return;
    }

    this.requestTracker.trackStreamState(requestId, status, message);
  }

  /**
   * 开始流式响应
   */
  startStream(streamId: string, contentType: string, expectedSize?: number): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.startStream(streamId, contentType, expectedSize);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to start stream');
    }
  }

  /**
   * 更新流进度
   */
  updateStreamProgress(streamId: string, bytesReceived: number, chunksReceived: number, data?: string | Buffer): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.updateStreamProgress(streamId, bytesReceived, chunksReceived, data);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to update stream progress');
    }
  }

  /**
   * 完成流式响应
   */
  completeStream(streamId: string, finalSize?: number): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.completeStream(streamId, finalSize);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to complete stream');
    }
  }

  /**
   * 处理流错误
   */
  handleStreamError(streamId: string, error: Error, context?: Record<string, unknown>): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.handleStreamError(streamId, error, context);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to handle stream error');
    }
  }

  /**
   * 暂停流
   */
  pauseStream(streamId: string): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.pauseStream(streamId);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to pause stream');
    }
  }

  /**
   * 恢复流
   */
  resumeStream(streamId: string): void {
    if (!this.streamTracker) {
      return;
    }

    const result = this.streamTracker.resumeStream(streamId);
    if (result.isErr()) {
      this.logger?.error({ streamId, error: result.error.message }, 'Failed to resume stream');
    }
  }

  /**
   * 记录错误日志（增强版）
   */
  logError(error: Error, context?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    // 使用基础日志记录
    this.logger.error({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    }, 'Error occurred');

    // 使用增强错误日志器
    if (this.errorLogger) {
      this.errorLogger.logError(error, context || {});
    }
  }

  /**
   * 记录性能指标
   */
  logMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!this.logger) {
      return;
    }

    this.logger.info({
      metric: {
        name,
        value,
        unit,
        tags,
      },
      timestamp: new Date().toISOString(),
    }, 'Performance metric');
  }

  /**
   * 记录性能错误
   */
  logPerformanceError(operation: string, duration: number, threshold: number, context?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    if (this.errorLogger) {
      this.errorLogger.logPerformanceError(operation, duration, threshold, context || {});
    }
  }

  /**
   * 记录验证错误
   */
  logValidationError(field: string, value: unknown, expected: string, context?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    if (this.errorLogger) {
      this.errorLogger.logValidationError(field, value, expected, context || {});
    }
  }

  /**
   * 记录安全错误
   */
  logSecurityError(type: string, details: Record<string, unknown>, context?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    if (this.errorLogger) {
      this.errorLogger.logSecurityError(type, details, context || {});
    }
  }

  /**
   * 记录外部服务错误
   */
  logExternalServiceError(service: string, endpoint: string, statusCode: number, responseTime: number, context?: Record<string, unknown>): void {
    if (!this.logger) {
      return;
    }

    if (this.errorLogger) {
      this.errorLogger.logExternalServiceError(service, endpoint, statusCode, responseTime, context || {});
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: Partial<LogConfig>): Promise<Result<void, Error>> {
    try {
      // 更新配置管理器
      const configResult = this.configManager.updateConfig(newConfig);
      if (configResult.isErr()) {
        return Err(configResult.error);
      }

      // 更新流管理器
      this.streamManager.updateConfig(this.configManager.getConfig());

      // 重新初始化流管理器
      await this.streamManager.cleanup();
      const streamResult = await this.streamManager.initialize();
      if (streamResult.isErr()) {
        return Err(streamResult.error);
      }

      // 重新创建日志器
      const config = this.configManager.getConfig();
      const multiStreams = this.streamManager.getMultiStreams();

      this.logger = pino({
        level: config.level,
        base: {
          service: config.serviceName,
          version: config.version,
          environment: config.environment,
        },
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: config.timestamp ? pino.stdTimeFunctions.isoTime : false,
      }, pino.multistream(multiStreams));

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取配置信息
   */
  getConfig(): LogConfig {
    return this.configManager.getConfig();
  }

  /**
   * 获取流状态
   */
  getStreamStatus(): Record<string, { active: boolean; level?: LogLevel }> {
    return this.streamManager.getAllStreamStatus();
  }

  /**
   * 获取请求追踪状态
   */
  getRequestTrackingStatus(): Record<string, unknown> {
    if (!this.requestTracker) {
      return { status: 'not_initialized' };
    }
    return this.requestTracker.getTrackingStatus();
  }

  /**
   * 获取流状态追踪状态
   */
  getStreamTrackingStatus(): Record<string, unknown> {
    if (!this.streamTracker) {
      return { status: 'not_initialized' };
    }
    return this.streamTracker.getStreamOverview();
  }

  /**
   * 获取错误统计信息
   */
  getErrorStatistics(): Record<string, unknown> {
    if (!this.errorLogger) {
      return { status: 'not_initialized' };
    }
    return this.errorLogger.getErrorStatistics();
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit: number = 100, errorName?: string): Record<string, unknown> {
    if (!this.errorLogger) {
      return { status: 'not_initialized' };
    }
    return {
      history: this.errorLogger.getErrorHistory(limit, errorName),
    };
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(timeRange?: number): Record<string, unknown> {
    if (!this.errorLogger) {
      return { status: 'not_initialized' };
    }
    return {
      trend: this.errorLogger.getErrorTrend(timeRange),
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<Result<void, Error>> {
    try {
      // 清理流管理器
      await this.streamManager.cleanup();

      // 清理请求追踪器
      if (this.requestTracker) {
        await this.requestTracker.cleanup();
      }

      // 清理流状态追踪器
      if (this.streamTracker) {
        await this.streamTracker.cleanup();
      }

      // 清理错误日志增强器
      if (this.errorLogger) {
        await this.errorLogger.cleanup();
      }

      // 重置状态
      this.logger = null;
      this.requestTracker = null;
      this.streamTracker = null;
      this.errorLogger = null;
      this.initialized = false;

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 健康检查
   */
  healthCheck(): Result<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }, Error> {
    try {
      const details: Record<string, unknown> = {
        initialized: this.initialized,
        configManager: this.configManager.healthCheck(),
        streams: this.streamManager.getAllStreamStatus(),
      };

      if (this.requestTracker) {
        details.requestTracker = this.requestTracker.healthCheck();
      }

      if (this.streamTracker) {
        details.streamTracker = this.streamTracker.getStreamOverview();
      }

      if (this.errorLogger) {
        details.errorLogger = {
          status: 'initialized',
          statistics: this.errorLogger.getErrorStatistics(),
        };
      }

      const status = this.initialized ? 'healthy' : 'unhealthy';
      return Ok({ status, details });
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}