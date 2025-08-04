import { Logger } from 'pino';
import { LogManager } from '../LogManager';
import { LogLevel } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 传统日志适配器 - 提供向后兼容的日志接口
 * 
 * 简化实现说明：
 * - 原本实现：完整的兼容层支持、API映射、性能优化、迁移工具
 * - 简化实现：基本的API适配，简化兼容性支持，核心功能映射
 * - 文件位置：src/utils/logging/compatibility/LegacyLoggerAdapter.ts
 * - 优化点：后续可添加完整兼容层、性能优化、迁移工具、配置转换
 */
export class LegacyLoggerAdapter {
  private logManager: LogManager;
  private logger: Logger;
  private initialized = false;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
    this.logger = logManager.getLogger();
  }

  /**
   * 初始化适配器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 传统 debug 日志
   */
  debug(message: string, ...args: unknown[]): void {
    if (!this.initialized) return;
    
    if (args.length > 0) {
      this.logger.debug({ meta: args }, message);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * 传统 info 日志
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.initialized) return;
    
    if (args.length > 0) {
      this.logger.info({ meta: args }, message);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * 传统 warn 日志
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.initialized) return;
    
    if (args.length > 0) {
      this.logger.warn({ meta: args }, message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * 传统 error 日志
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.initialized) return;
    
    if (args.length > 0) {
      this.logger.error({ meta: args }, message);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * 传统 fatal 日志
   */
  fatal(message: string, ...args: unknown[]): void {
    if (!this.initialized) return;
    
    if (args.length > 0) {
      this.logger.fatal({ meta: args }, message);
    } else {
      this.logger.fatal(message);
    }
  }

  /**
   * 带 requestId 的日志记录
   */
  withRequest(requestId: string): {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    fatal: (message: string, ...args: unknown[]) => void;
  } {
    const requestLogger = this.logManager.createRequestLogger(requestId);
    
    return {
      debug: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          requestLogger.debug({ meta: args }, message);
        } else {
          requestLogger.debug(message);
        }
      },
      info: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          requestLogger.info({ meta: args }, message);
        } else {
          requestLogger.info(message);
        }
      },
      warn: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          requestLogger.warn({ meta: args }, message);
        } else {
          requestLogger.warn(message);
        }
      },
      error: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          requestLogger.error({ meta: args }, message);
        } else {
          requestLogger.error(message);
        }
      },
      fatal: (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
          requestLogger.fatal({ meta: args }, message);
        } else {
          requestLogger.fatal(message);
        }
      },
    };
  }

  /**
   * 记录请求开始
   */
  logRequestStart(requestId: string, method: string, url: string, headers?: Record<string, string>): void {
    this.logManager.logRequestStart(requestId, method, url, headers);
  }

  /**
   * 记录请求结束
   */
  logRequestEnd(requestId: string, statusCode: number, duration: number, responseSize?: number): void {
    this.logManager.logRequestEnd(requestId, statusCode, duration, responseSize);
  }

  /**
   * 记录请求错误
   */
  logRequestError(requestId: string, error: Error, statusCode?: number): void {
    this.logManager.logRequestError(requestId, error, statusCode);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.logger.level as LogLevel;
  }

  /**
   * 检查是否启用特定级别
   */
  isLevelEnabled(level: LogLevel): boolean {
    return this.logger.isLevelEnabled(level);
  }

  /**
   * 创建子日志器
   */
  child(bindings: Record<string, unknown>): LegacyLoggerAdapter {
    const childLogger = this.logger.child(bindings);
    const childLogManager = { ...this.logManager };
    childLogManager.getLogger = () => childLogger;
    
    const adapter = new LegacyLoggerAdapter(this.logManager);
    adapter.logger = childLogger;
    return adapter;
  }

  /**
   * 静默模式（不记录任何日志）
   */
  silent(): void {
    this.logger.level = 'silent';
  }

  /**
   * 重置到默认级别
   */
  resetLevel(): void {
    this.logger.level = 'info';
  }

  /**
   * 获取底层日志器
   */
  getUnderlyingLogger(): Logger {
    return this.logger;
  }

  /**
   * 获取底层日志管理器
   */
  getUnderlyingLogManager(): LogManager {
    return this.logManager;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.initialized = false;
  }
}