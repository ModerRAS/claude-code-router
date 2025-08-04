import { BackwardCompatibility } from '../compatibility/BackwardCompatibility';
import { LegacyLogConfig } from '../compatibility/ConfigConverter';
import { LogManager } from '../LogManager';
import { LogConfig } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 现有日志系统集成器 - 将新日志系统无缝集成到现有代码中
 * 
 * 简化实现说明：
 * - 原本实现：完整的集成方案、自动迁移、配置适配、性能优化
 * - 简化实现：基础的集成适配，简化迁移路径，保持现有API兼容
 * - 文件位置：src/utils/logging/integration/ExistingLogIntegration.ts
 * - 优化点：后续可添加自动迁移、性能优化、智能配置适配
 */

/**
 * 集成配置接口
 */
export interface IntegrationConfig {
  enableNewLogging?: boolean;
  migrateExistingLogs?: boolean;
  preserveExistingBehavior?: boolean;
  enableEnhancedFeatures?: boolean;
  logDirectory?: string;
  logLevel?: string;
}

/**
 * 现有日志系统集成器
 */
export class ExistingLogIntegration {
  private compatibility: BackwardCompatibility | null = null;
  private config: IntegrationConfig;
  private initialized = false;

  constructor(config: IntegrationConfig = {}) {
    this.config = {
      enableNewLogging: true,
      migrateExistingLogs: true,
      preserveExistingBehavior: true,
      enableEnhancedFeatures: true,
      logDirectory: process.env.HOME_DIR ? `${process.env.HOME_DIR}/.claude-code-router/logs` : './logs',
      logLevel: process.env.LOG_LEVEL || 'info',
      ...config,
    };
  }

  /**
   * 初始化集成
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      if (!this.config.enableNewLogging) {
        // 如果不启用新日志系统，直接返回
        this.initialized = true;
        return Ok(undefined);
      }

      // 创建新系统的配置
      const newConfig = this.createNewConfig();
      
      // 初始化兼容性层
      this.compatibility = new BackwardCompatibility();
      const initResult = await this.compatibility.initWithNewConfig(newConfig);
      
      if (initResult.isErr()) {
        return Err(initResult.error);
      }

      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 替换现有的 log 函数
   */
  replaceExistingLogFunction(): Result<void, Error> {
    try {
      if (!this.compatibility || !this.initialized) {
        return Err(new Error('Integration not initialized'));
      }

      const logger = this.compatibility.getLogger();

      // 创建新的 log 函数
      const newLogFunction = (...args: unknown[]) => {
        const message = args
          .map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
          .join(' ');
        
        logger.info(message);
      };

      // 这里我们可以选择性地替换全局的 log 函数
      // 但为了安全起见，我们提供一个新的函数而不是直接替换
      (global as any).enhancedLog = newLogFunction;

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取增强的日志函数
   */
  getEnhancedLogFunction(): (...args: unknown[]) => void {
    if (!this.compatibility || !this.initialized) {
      // 回退到简单的 console.log
      return (...args: unknown[]) => {
        console.log(...args);
      };
    }

    const logger = this.compatibility.getLogger();

    return (...args: unknown[]) => {
      const message = args
        .map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
        .join(' ');
      
      logger.info(message);
    };
  }

  /**
   * 获取请求追踪日志器
   */
  getRequestLogger(requestId: string): {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  } {
    if (!this.compatibility || !this.initialized) {
      // 回退到简单的 console
      return {
        log: (...args: unknown[]) => console.log(...args),
        error: (...args: unknown[]) => console.error(...args),
        warn: (...args: unknown[]) => console.warn(...args),
        debug: (...args: unknown[]) => console.debug(...args),
      };
    }

    const logger = this.compatibility.getLogger().withRequest(requestId);

    return {
      log: (message: string, ...args: unknown[]) => logger.info(message, ...args),
      error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
      warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
      debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
    };
  }

  /**
   * 记录请求生命周期
   */
  trackRequest(requestId: string, method: string, url: string, headers?: Record<string, string>): void {
    if (this.compatibility && this.initialized) {
      this.compatibility.getLogger().logRequestStart(requestId, method, url, headers);
    }
  }

  /**
   * 记录请求结束
   */
  trackRequestEnd(requestId: string, statusCode: number, duration: number, responseSize?: number): void {
    if (this.compatibility && this.initialized) {
      this.compatibility.getLogger().logRequestEnd(requestId, statusCode, duration, responseSize);
    }
  }

  /**
   * 记录请求错误
   */
  trackRequestError(requestId: string, error: Error, statusCode?: number): void {
    if (this.compatibility && this.initialized) {
      this.compatibility.getLogger().logRequestError(requestId, error, statusCode);
    }
  }

  /**
   * 获取日志管理器实例
   */
  getLogManager(): LogManager | null {
    return this.compatibility?.getLogManager() || null;
  }

  /**
   * 获取兼容性实例
   */
  getCompatibility(): BackwardCompatibility | null {
    return this.compatibility;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取集成状态
   */
  getIntegrationStatus(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      newLoggingEnabled: this.config.enableNewLogging,
      enhancedFeaturesEnabled: this.config.enableEnhancedFeatures,
      compatibilityInitialized: this.compatibility?.isInitialized() || false,
      logDirectory: this.config.logDirectory,
      logLevel: this.config.logLevel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 更新集成配置
   */
  async updateConfig(newConfig: Partial<IntegrationConfig>): Promise<Result<void, Error>> {
    try {
      this.config = { ...this.config, ...newConfig };

      if (this.compatibility && this.initialized) {
        const newLogConfig = this.createNewConfig();
        const updateResult = await this.compatibility.updateConfig(undefined, newLogConfig);
        
        if (updateResult.isErr()) {
          return Err(updateResult.error);
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.compatibility) {
      await this.compatibility.cleanup();
      this.compatibility = null;
    }

    this.initialized = false;
  }

  /**
   * 创建新系统的配置
   */
  private createNewConfig(): LogConfig {
    const streams = [];

    // 添加文件输出流
    if (this.config.logDirectory) {
      streams.push({
        name: 'main-file',
        type: 'file',
        level: this.config.logLevel as any,
        path: `${this.config.logDirectory}/claude-code-router.log`,
        rotation: {
          size: '10M',
          interval: '1d',
        },
      });

      // 添加错误日志文件
      streams.push({
        name: 'error-file',
        type: 'file',
        level: 'error',
        path: `${this.config.logDirectory}/error.log`,
        rotation: {
          size: '10M',
          interval: '1d',
        },
      });
    }

    // 添加控制台输出
    streams.push({
      name: 'console',
      type: 'console',
      level: this.config.logLevel as any,
    });

    return {
      level: this.config.logLevel as any,
      timestamp: true,
      serviceName: 'claude-code-router',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      streams,
    };
  }
}