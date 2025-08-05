import { Logger } from 'pino';
import { StreamError } from '../types/request-context';
import { Result, Ok, Err } from '../types/common';

/**
 * 增强错误日志器 - 提供更详细的错误记录和分析功能
 * 
 * 简化实现说明：
 * - 原本实现：复杂的错误分析、错误聚合、错误分类、智能诊断
 * - 简化实现：基础的错误增强记录，简单的错误分类，基本的上下文信息
 * - 文件位置：src/utils/logging/enhanced/ErrorLogger.ts
 * - 优化点：后续可添加错误分析、错误聚合、智能诊断、错误模式识别
 */
export class ErrorLogger {
  private logger: Logger;
  private errorCounts: Map<string, number> = new Map();
  private errorHistory: Array<{
    timestamp: number;
    errorName: string;
    errorMessage: string;
    context?: Record<string, unknown>;
  }> = [];
  private readonly maxHistorySize = 1000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 初始化错误日志器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      // 安全地记录初始化日志
      try {
        this.logger.info('ErrorLogger initialized');
      } catch (logError) {
        // 在测试环境中，流可能已经关闭，忽略初始化日志错误
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Failed to log ErrorLogger initialization:', logError);
        }
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 记录增强错误日志
   */
  logError(
    error: Error,
    context: {
      requestId?: string;
      userId?: string;
      sessionId?: string;
      operation?: string;
      component?: string;
      [key: string]: unknown;
    } = {}
  ): void {
    const timestamp = Date.now();
    
    // 增强错误信息
    const enhancedError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      errno: (error as any).errno,
      syscall: (error as any).syscall,
      hostname: (error as any).hostname,
      timestamp,
      requestId: context.requestId,
      userId: context.userId,
      sessionId: context.sessionId,
      operation: context.operation,
      component: context.component,
      environment: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    };

    // 更新错误计数
    this.updateErrorCount(error.name);

    // 添加到历史记录
    this.addToErrorHistory({
      timestamp,
      errorName: error.name,
      errorMessage: error.message,
      context,
    });

    // 记录到日志
    this.logger.error({
      error: enhancedError,
      context,
      timestamp,
    }, `Enhanced error: ${error.name} - ${error.message}`);

    // 根据错误类型进行特殊处理
    this.handleSpecialErrorTypes(error, context);
  }

  /**
   * 记录流错误
   */
  logStreamError(
    streamError: StreamError,
    context: {
      streamId?: string;
      requestId?: string;
      operation?: string;
      [key: string]: unknown;
    } = {}
  ): void {
    const enhancedStreamError = {
      timestamp: streamError.timestamp,
      error: {
        name: streamError.error.name,
        message: streamError.error.message,
        stack: streamError.error.stack,
      },
      context: streamError.context,
      streamId: context.streamId,
      requestId: context.requestId,
      operation: context.operation,
      environment: process.env.NODE_ENV,
    };

    this.logger.error({
      streamError: enhancedStreamError,
      context,
    }, `Stream error: ${streamError.error.name} - ${streamError.error.message}`);
  }

  /**
   * 记录性能错误
   */
  logPerformanceError(
    operation: string,
    duration: number,
    threshold: number,
    context: Record<string, unknown> = {}
  ): void {
    const performanceError = {
      operation,
      duration,
      threshold,
      exceededBy: duration - threshold,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      memoryUsage: process.memoryUsage(),
    };

    this.logger.warn({
      performanceError,
      context,
    }, `Performance threshold exceeded: ${operation} took ${duration}ms (threshold: ${threshold}ms)`);
  }

  /**
   * 记录验证错误
   */
  logValidationError(
    field: string,
    value: unknown,
    expected: string,
    context: Record<string, unknown> = {}
  ): void {
    const validationError = {
      field,
      value,
      expected,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
    };

    this.logger.warn({
      validationError,
      context,
    }, `Validation failed: ${field} expected ${expected}, got ${typeof value}`);
  }

  /**
   * 记录安全相关错误
   */
  logSecurityError(
    type: string,
    details: Record<string, unknown>,
    context: Record<string, unknown> = {}
  ): void {
    const securityError = {
      type,
      details,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      ip: context.ip,
      userAgent: context.userAgent,
    };

    this.logger.error({
      securityError,
      context,
    }, `Security error: ${type}`);
  }

  /**
   * 记录外部服务错误
   */
  logExternalServiceError(
    service: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    context: Record<string, unknown> = {}
  ): void {
    const externalError = {
      service,
      endpoint,
      statusCode,
      responseTime,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
    };

    this.logger.error({
      externalError,
      context,
    }, `External service error: ${service} ${endpoint} returned ${statusCode} in ${responseTime}ms`);
  }

  /**
   * 获取错误统计
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorCounts: Record<string, number>;
    recentErrors: Array<{
      timestamp: number;
      errorName: string;
      errorMessage: string;
    }>;
    topErrors: Array<{ name: string; count: number }>;
  } {
    const errorCounts: Record<string, number> = {};
    for (const [name, count] of this.errorCounts) {
      errorCounts[name] = count;
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentErrors = this.errorHistory
      .slice(-50)
      .map(({ timestamp, errorName, errorMessage }) => ({
        timestamp,
        errorName,
        errorMessage,
      }));

    return {
      totalErrors: this.errorHistory.length,
      errorCounts,
      recentErrors,
      topErrors,
    };
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(
    limit: number = 100,
    errorName?: string
  ): Array<{
    timestamp: number;
    errorName: string;
    errorMessage: string;
    context?: Record<string, unknown>;
  }> {
    let history = this.errorHistory;
    
    if (errorName) {
      history = history.filter(entry => entry.errorName === errorName);
    }
    
    return history.slice(-limit);
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(timeRange: number = 60 * 60 * 1000): Array<{
    timestamp: number;
    count: number;
  }> {
    const now = Date.now();
    const startTime = now - timeRange;
    const interval = timeRange / 60; // 60个数据点

    const trend: Array<{ timestamp: number; count: number }> = [];
    
    for (let i = 0; i < 60; i++) {
      const intervalStart = startTime + (i * interval);
      const intervalEnd = intervalStart + interval;
      
      const count = this.errorHistory.filter(entry => 
        entry.timestamp >= intervalStart && entry.timestamp < intervalEnd
      ).length;
      
      trend.push({
        timestamp: intervalStart,
        count,
      });
    }

    return trend;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.errorCounts.clear();
    this.errorHistory = [];
    // 清理时不记录日志，避免流关闭后的写入错误
  }

  /**
   * 更新错误计数
   */
  private updateErrorCount(errorName: string): void {
    const currentCount = this.errorCounts.get(errorName) || 0;
    this.errorCounts.set(errorName, currentCount + 1);
  }

  /**
   * 添加到错误历史
   */
  private addToErrorHistory(error: {
    timestamp: number;
    errorName: string;
    errorMessage: string;
    context?: Record<string, unknown>;
  }): void {
    this.errorHistory.push(error);
    
    // 保持历史记录在限制范围内
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 处理特殊错误类型
   */
  private handleSpecialErrorTypes(error: Error, context: Record<string, unknown>): void {
    // 处理网络错误
    if (error.name === 'ECONNREFUSED' || error.name === 'ENOTFOUND') {
      this.logger.warn({
        networkError: {
          name: error.name,
          message: error.message,
          context,
        },
      }, 'Network connectivity issue detected');
    }

    // 处理权限错误
    if (error.name === 'EACCES' || error.name === 'EPERM') {
      this.logger.warn({
        permissionError: {
          name: error.name,
          message: error.message,
          context,
        },
      }, 'Permission issue detected');
    }

    // 处理内存错误
    if (error.name === 'OutOfMemoryError' || error.message.includes('out of memory')) {
      this.logger.error({
        memoryError: {
          name: error.name,
          message: error.message,
          memoryUsage: process.memoryUsage(),
          context,
        },
      }, 'Memory issue detected');
    }

    // 处理超时错误
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      this.logger.warn({
        timeoutError: {
          name: error.name,
          message: error.message,
          context,
        },
      }, 'Timeout issue detected');
    }
  }
}