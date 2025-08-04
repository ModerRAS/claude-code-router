import { LegacyLoggerAdapter } from './LegacyLoggerAdapter';
import { convertLegacyConfig, detectAndConvertConfig, generateMigrationSuggestions, validateConvertedConfig, type LegacyLogConfig } from './ConfigConverter';
import { LogManager } from '../LogManager';
import { LogConfig } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 向后兼容性入口 - 提供与传统日志系统的兼容性支持
 * 
 * 简化实现说明：
 * - 原本实现：完整的兼容性系统、自动迁移、配置转换、性能优化
 * - 简化实现：基础的兼容性接口，简化迁移路径，核心功能支持
 * - 文件位置：src/utils/logging/compatibility/BackwardCompatibility.ts
 * - 优化点：后续可添加自动迁移、性能优化、完整兼容性支持
 */
export class BackwardCompatibility {
  private logManager: LogManager | null = null;
  private adapter: LegacyLoggerAdapter | null = null;
  private initialized = false;

  /**
   * 使用传统配置初始化
   */
  async initWithLegacyConfig(legacyConfig: LegacyLogConfig): Promise<Result<void, Error>> {
    try {
      // 转换配置
      const configResult = convertLegacyConfig(legacyConfig);
      if (configResult.isErr()) {
        return Err(configResult.error);
      }

      const newConfig = configResult.value;

      // 创建日志管理器
      this.logManager = new LogManager(newConfig);
      const initResult = await this.logManager.initialize();
      if (initResult.isErr()) {
        return Err(initResult.error);
      }

      // 创建适配器
      this.adapter = new LegacyLoggerAdapter(this.logManager);
      const adapterInitResult = await this.adapter.initialize();
      if (adapterInitResult.isErr()) {
        return Err(adapterInitResult.error);
      }

      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 使用新配置初始化
   */
  async initWithNewConfig(config: LogConfig): Promise<Result<void, Error>> {
    try {
      this.logManager = new LogManager(config);
      const initResult = await this.logManager.initialize();
      if (initResult.isErr()) {
        return Err(initResult.error);
      }

      this.adapter = new LegacyLoggerAdapter(this.logManager);
      const adapterInitResult = await this.adapter.initialize();
      if (adapterInitResult.isErr()) {
        return Err(adapterInitResult.error);
      }

      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 自动检测配置并初始化
   */
  async autoInitialize(): Promise<Result<void, Error>> {
    try {
      // 尝试检测传统配置
      const detectResult = detectAndConvertConfig();
      if (detectResult.isErr()) {
        return Err(detectResult.error);
      }

      const detectedConfig = detectResult.value;
      
      if (detectedConfig) {
        // 使用检测到的配置
        return await this.initWithNewConfig(detectedConfig);
      } else {
        // 使用默认配置
        const defaultConfig: LogConfig = {
          level: 'info',
          timestamp: true,
          serviceName: 'claude-code-router',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          streams: [
            {
              name: 'console',
              type: 'console',
              level: 'info',
            },
          ],
        };
        
        return await this.initWithNewConfig(defaultConfig);
      }
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取传统日志适配器
   */
  getLogger(): LegacyLoggerAdapter {
    if (!this.adapter) {
      throw new Error('Logger not initialized. Call one of the init methods first.');
    }
    return this.adapter;
  }

  /**
   * 获取底层日志管理器
   */
  getLogManager(): LogManager {
    if (!this.logManager) {
      throw new Error('LogManager not initialized. Call one of the init methods first.');
    }
    return this.logManager;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 生成迁移建议
   */
  getMigrationSuggestions(legacyConfig?: LegacyLogConfig): string[] {
    if (legacyConfig) {
      return generateMigrationSuggestions(legacyConfig);
    }
    
    return [
      '建议配置单独的错误日志文件',
      '建议启用日志轮转以控制文件大小',
      '建议配置适当的日志级别',
      '建议考虑使用多流输出以分离不同级别的日志',
    ];
  }

  /**
   * 获取兼容性状态
   */
  getCompatibilityStatus(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      hasLegacyAdapter: this.adapter !== null,
      hasLogManager: this.logManager !== null,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 更新配置
   */
  async updateConfig(legacyConfig?: LegacyLogConfig, newConfig?: LogConfig): Promise<Result<void, Error>> {
    try {
      if (!this.logManager) {
        return Err(new Error('LogManager not initialized'));
      }

      if (legacyConfig) {
        const configResult = convertLegacyConfig(legacyConfig);
        if (configResult.isErr()) {
          return Err(configResult.error);
        }
        
        const updateResult = await this.logManager.updateConfig(configResult.value);
        if (updateResult.isErr()) {
          return Err(updateResult.error);
        }
      } else if (newConfig) {
        const updateResult = await this.logManager.updateConfig(newConfig);
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
    if (this.adapter) {
      await this.adapter.cleanup();
      this.adapter = null;
    }

    if (this.logManager) {
      await this.logManager.cleanup();
      this.logManager = null;
    }

    this.initialized = false;
  }
}