import { Logger } from 'pino';
import { RequestContext, RequestStatus, StreamState } from '../types/request-context';
import { TokenUsage, RequestStatistics } from '../types/request-context';
import { Result, Ok, Err } from '../types/common';

/**
 * 请求上下文追踪器 - 跟踪请求生命周期和状态
 * 
 * 简化实现说明：
 * - 原本实现：复杂的请求生命周期管理、分布式追踪、性能分析
 * - 简化实现：基础的请求状态跟踪，简单的内存存储，基本的统计功能
 * - 文件位置：src/utils/logging/tracking/RequestContextTracker.ts
 * - 优化点：后续可添加分布式追踪、性能分析、持久化存储、实时监控
 */
export class RequestContextTracker {
  private logger: Logger;
  private requestContexts: Map<string, RequestContext> = new Map();
  private statistics: RequestStatistics = {
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastUpdated: Date.now(),
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly maxAge = 30 * 60 * 1000; // 30分钟

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 初始化追踪器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      // 启动清理任务
      this.cleanupInterval = setInterval(() => {
        this.cleanupOldContexts();
      }, 5 * 60 * 1000); // 每5分钟清理一次

      this.logger.info('RequestContextTracker initialized');
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 创建请求上下文
   */
  createContext(requestId: string, context?: Partial<RequestContext>): RequestContext {
    const now = Date.now();
    const requestContext: RequestContext = {
      requestId,
      sessionId: context?.sessionId || this.generateSessionId(),
      userId: context?.userId,
      traceId: context?.traceId || this.generateTraceId(),
      status: RequestStatus.CREATED,
      startTime: now,
      endTime: undefined,
      duration: undefined,
      method: context?.method || 'UNKNOWN',
      url: context?.url || '',
      headers: context?.headers || {},
      statusCode: context?.statusCode,
      error: context?.error,
      streamState: context?.streamState || StreamState.IDLE,
      tokenUsage: context?.tokenUsage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata: context?.metadata || {},
    };

    this.requestContexts.set(requestId, requestContext);
    this.statistics.totalRequests++;
    this.statistics.activeRequests++;
    this.statistics.lastUpdated = now;

    this.logger.debug({ requestId, context: requestContext }, 'Created request context');
    return requestContext;
  }

  /**
   * 获取请求上下文
   */
  getContext(requestId: string): RequestContext | undefined {
    return this.requestContexts.get(requestId);
  }

  /**
   * 更新请求上下文
   */
  updateContext(requestId: string, updates: Partial<RequestContext>): Result<void, Error> {
    try {
      const context = this.requestContexts.get(requestId);
      if (!context) {
        return Err(new Error(`Request context not found: ${requestId}`));
      }

      const updatedContext = { ...context, ...updates };
      this.requestContexts.set(requestId, updatedContext);

      this.logger.debug({ requestId, updates }, 'Updated request context');
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 跟踪请求开始
   */
  trackRequestStart(requestId: string, method: string, url: string, headers?: Record<string, string>): void {
    const context = this.getContext(requestId);
    if (!context) {
      this.createContext(requestId, { method, url, headers });
    } else {
      this.updateContext(requestId, {
        status: RequestStatus.ACTIVE,
        method,
        url,
        headers: headers || context.headers,
      });
    }

    this.logger.info({ requestId, method, url }, 'Request started');
  }

  /**
   * 跟踪请求结束
   */
  trackRequestEnd(requestId: string, statusCode: number, duration: number, responseSize?: number): void {
    const endTime = Date.now();
    const updates: Partial<RequestContext> = {
      status: statusCode >= 400 ? RequestStatus.FAILED : RequestStatus.COMPLETED,
      endTime,
      duration,
      statusCode,
      metadata: {
        responseSize,
      },
    };

    const result = this.updateContext(requestId, updates);
    if (result.isOk()) {
      this.statistics.activeRequests--;
      if (statusCode >= 400) {
        this.statistics.failedRequests++;
      } else {
        this.statistics.completedRequests++;
      }

      // 更新平均响应时间
      this.updateAverageResponseTime(duration);

      this.logger.info({ requestId, statusCode, duration, responseSize }, 'Request completed');
    }
  }

  /**
   * 跟踪请求错误
   */
  trackRequestError(requestId: string, error: Error, statusCode?: number): void {
    const endTime = Date.now();
    const context = this.getContext(requestId);
    const duration = context ? endTime - context.startTime : 0;

    const updates: Partial<RequestContext> = {
      status: RequestStatus.FAILED,
      endTime,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      statusCode,
    };

    const result = this.updateContext(requestId, updates);
    if (result.isOk()) {
      this.statistics.activeRequests--;
      this.statistics.failedRequests++;

      this.logger.error({ requestId, error: error.message, statusCode }, 'Request failed');
    }
  }

  /**
   * 跟踪流状态
   */
  trackStreamState(requestId: string, status: StreamState, message?: string): void {
    const updates: Partial<RequestContext> = {
      streamState: status,
      metadata: {
        streamMessage: message,
      },
    };

    const result = this.updateContext(requestId, updates);
    if (result.isOk()) {
      this.logger.debug({ requestId, streamState: status, message }, 'Stream state updated');
    }
  }

  /**
   * 更新令牌使用情况
   */
  updateTokenUsage(requestId: string, tokenUsage: Partial<TokenUsage>): Result<void, Error> {
    const context = this.getContext(requestId);
    if (!context) {
      return Err(new Error(`Request context not found: ${requestId}`));
    }

    const updatedTokenUsage: TokenUsage = {
      promptTokens: (context.tokenUsage?.promptTokens || 0) + (tokenUsage.promptTokens || 0),
      completionTokens: (context.tokenUsage?.completionTokens || 0) + (tokenUsage.completionTokens || 0),
      totalTokens: (context.tokenUsage?.totalTokens || 0) + (tokenUsage.totalTokens || 0),
    };

    return this.updateContext(requestId, { tokenUsage: updatedTokenUsage });
  }

  /**
   * 获取请求统计信息
   */
  getStatistics(): RequestStatistics {
    return { ...this.statistics };
  }

  /**
   * 获取追踪状态
   */
  getTrackingStatus(): Record<string, unknown> {
    return {
      activeRequests: this.statistics.activeRequests,
      totalRequests: this.statistics.totalRequests,
      completedRequests: this.statistics.completedRequests,
      failedRequests: this.statistics.failedRequests,
      averageResponseTime: this.statistics.averageResponseTime,
      contextCount: this.requestContexts.size,
      lastUpdated: this.statistics.lastUpdated,
    };
  }

  /**
   * 获取所有活跃请求
   */
  getActiveRequests(): RequestContext[] {
    return Array.from(this.requestContexts.values()).filter(
      context => context.status === RequestStatus.ACTIVE
    );
  }

  /**
   * 获取最近的请求
   */
  getRecentRequests(limit: number = 100): RequestContext[] {
    const contexts = Array.from(this.requestContexts.values());
    return contexts
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      .slice(0, limit);
  }

  /**
   * 健康检查
   */
  healthCheck(): Record<string, unknown> {
    return {
      status: 'healthy',
      contextCount: this.requestContexts.size,
      activeRequests: this.statistics.activeRequests,
      totalRequests: this.statistics.totalRequests,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.requestContexts.clear();
    this.logger.info('RequestContextTracker cleaned up');
  }

  /**
   * 清理旧的上下文
   */
  private cleanupOldContexts(): void {
    const now = Date.now();
    const cutoffTime = now - this.maxAge;

    let cleanedCount = 0;
    for (const [requestId, context] of this.requestContexts) {
      if (context.startTime && context.startTime < cutoffTime) {
        this.requestContexts.delete(requestId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug({ cleanedCount }, 'Cleaned up old request contexts');
    }
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(newDuration: number): void {
    const totalCompleted = this.statistics.completedRequests + this.statistics.failedRequests;
    if (totalCompleted === 0) {
      this.statistics.averageResponseTime = newDuration;
    } else {
      this.statistics.averageResponseTime = 
        (this.statistics.averageResponseTime * (totalCompleted - 1) + newDuration) / totalCompleted;
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}