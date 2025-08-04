import { EnhancedConfigLoader, CompleteConfigFile, EnhancedLoggingConfig } from './EnhancedConfigLoader';
import { LogConfigManager } from './LogConfigManager';
import { LogConfig } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 配置文件集成器 - 将新的配置文件系统集成到现有配置中
 * 
 * 简化实现说明：
 * - 原本实现：完整的配置集成、优先级处理、环境变量覆盖、配置合并
 * - 简化实现：基础的配置集成，简单的优先级处理，基本合并逻辑
 * - 文件位置：src/utils/logging/config/ConfigFileIntegration.ts
 * - 优化点：后续可添加优先级处理、环境变量覆盖、智能合并、配置验证
 */

/**
 * 配置优先级枚举
 */
export enum ConfigPriority {
  ENVIRONMENT = 1,      // 环境变量（最高优先级）
  CONFIG_FILE = 2,      // 配置文件
  PRESET = 3,           // 预设配置
  DEFAULT = 4,          // 默认配置（最低优先级）
}

/**
 * 配置源信息
 */
export interface ConfigSource {
  type: 'environment' | 'config-file' | 'preset' | 'default';
  priority: ConfigPriority;
  name?: string;
  config: LogConfig;
  timestamp: number;
}

/**
 * 配置集成结果
 */
export interface ConfigIntegrationResult {
  finalConfig: LogConfig;
  sources: ConfigSource[];
  mergedPaths: string[];
  conflicts: string[];
  warnings: string[];
}

/**
 * 配置文件集成器
 */
export class ConfigFileIntegration {
  private configLoader: EnhancedConfigLoader | null = null;
  private logConfigManager: LogConfigManager;
  private sources: ConfigSource[] = [];
  private warnings: string[] = [];

  constructor(logConfigManager: LogConfigManager) {
    this.logConfigManager = logConfigManager;
  }

  /**
   * 初始化配置集成
   */
  async initialize(configPath?: string): Promise<Result<void, Error>> {
    try {
      // 创建配置加载器
      if (configPath) {
        this.configLoader = new EnhancedConfigLoader(configPath);
      } else {
        const discoverResult = this.discoverConfigLoader();
        if (discoverResult.isErr()) {
          this.warnings.push(`No config file found, using defaults: ${discoverResult.error.message}`);
          this.configLoader = null;
        } else {
          this.configLoader = discoverResult.value;
        }
      }

      // 如果有配置加载器，加载配置文件
      if (this.configLoader) {
        const loadResult = await this.configLoader.loadConfig();
        if (loadResult.isErr()) {
          this.warnings.push(`Failed to load config file: ${loadResult.error.message}`);
        }
      }

      // 开始监听配置文件变化
      if (this.configLoader) {
        const watchResult = this.configLoader.startWatching();
        if (watchResult.isErr()) {
          this.warnings.push(`Failed to watch config file: ${watchResult.error.message}`);
        }
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 集成配置
   */
  async integrateConfig(presetName?: string): Promise<Result<ConfigIntegrationResult, Error>> {
    try {
      const sources: ConfigSource[] = [];
      const mergedPaths: string[] = [];
      const conflicts: string[] = [];
      const warnings: string[] = [];

      // 1. 收集所有配置源
      await this.collectConfigSources(sources, presetName);

      // 2. 合并配置
      const finalConfig = this.mergeConfigs(sources, mergedPaths, conflicts, warnings);

      // 3. 应用到配置管理器
      const applyResult = this.logConfigManager.updateConfig(finalConfig);
      if (applyResult.isErr()) {
        return Err(applyResult.error);
      }

      const result: ConfigIntegrationResult = {
        finalConfig,
        sources,
        mergedPaths,
        conflicts,
        warnings: [...this.warnings, ...warnings],
      };

      return Ok(result);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取集成状态
   */
  getIntegrationStatus(): Record<string, unknown> {
    return {
      configLoaderInitialized: this.configLoader !== null,
      configFilePath: this.configLoader?.getCurrentConfig() ? this.configLoader?.configPath : null,
      sourcesCount: this.sources.length,
      warnings: this.warnings,
      enhancedLoggingEnabled: this.configLoader?.isEnhancedLoggingEnabled(),
      environmentVariables: this.configLoader?.getEnvironmentVariables(),
    };
  }

  /**
   * 手动重新加载配置
   */
  async reloadConfig(): Promise<Result<ConfigIntegrationResult, Error>> {
    try {
      // 重新加载配置文件
      if (this.configLoader) {
        const loadResult = await this.configLoader.loadConfig();
        if (loadResult.isErr()) {
          return Err(loadResult.error);
        }
      }

      // 重新集成配置
      return await this.integrateConfig();
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 添加配置变化监听器
   */
  addConfigChangeListener(listener: () => void): void {
    if (this.configLoader) {
      this.configLoader.addConfigChangeListener(async () => {
        try {
          const result = await this.reloadConfig();
          if (result.isErr()) {
            console.error('Failed to reload config:', result.error.message);
          } else {
            listener();
          }
        } catch (error) {
          console.error('Error in config change listener:', error);
        }
      });
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.configLoader) {
      this.configLoader.cleanup();
    }
    this.sources = [];
    this.warnings = [];
  }

  /**
   * 发现配置加载器
   */
  private discoverConfigLoader(): Result<EnhancedConfigLoader, Error> {
    const possiblePaths = [
      './config.json',
      './config.example.enhanced-logging.json',
      './claude-code-router-config.json',
    ];

    for (const path of possiblePaths) {
      try {
        const loader = new EnhancedConfigLoader(path);
        const result = loader.loadConfig();
        if (result.isOk()) {
          return Ok(loader);
        }
      } catch (error) {
        // 继续尝试下一个路径
      }
    }

    return Err(new Error('No valid configuration file found'));
  }

  /**
   * 收集配置源
   */
  private async collectConfigSources(sources: ConfigSource[], presetName?: string): Promise<void> {
    // 默认配置
    const defaultConfig = this.logConfigManager.getDefaultConfig();
    sources.push({
      type: 'default',
      priority: ConfigPriority.DEFAULT,
      config: defaultConfig,
      timestamp: Date.now(),
    });

    // 预设配置
    if (presetName && this.configLoader) {
      const presetResult = this.configLoader.getPreset(presetName);
      if (presetResult.isOk()) {
        const presetConfig = this.convertEnhancedToLogConfig(presetResult.value);
        sources.push({
          type: 'preset',
          priority: ConfigPriority.PRESET,
          name: presetName,
          config: presetConfig,
          timestamp: Date.now(),
        });
      } else {
        this.warnings.push(`Failed to load preset '${presetName}': ${presetResult.error.message}`);
      }
    }

    // 配置文件
    if (this.configLoader) {
      const configResult = this.configLoader.getLoggingConfig();
      if (configResult.isOk()) {
        sources.push({
          type: 'config-file',
          priority: ConfigPriority.CONFIG_FILE,
          config: configResult.value,
          timestamp: Date.now(),
        });
      } else {
        this.warnings.push(`Failed to load logging config from file: ${configResult.error.message}`);
      }
    }

    // 环境变量
    const envConfig = this.loadEnvironmentConfig();
    if (envConfig) {
      sources.push({
        type: 'environment',
        priority: ConfigPriority.ENVIRONMENT,
        config: envConfig,
        timestamp: Date.now(),
      });
    }

    // 按优先级排序
    sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 合并配置
   */
  private mergeConfigs(
    sources: ConfigSource[],
    mergedPaths: string[],
    conflicts: string[],
    warnings: string[]
  ): LogConfig {
    let mergedConfig: LogConfig = {
      level: 'info',
      timestamp: true,
      serviceName: 'claude-code-router',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      streams: [],
    };

    for (const source of sources) {
      const sourceConfig = source.config;
      const sourceType = source.type;

      // 合并基本配置
      if (sourceConfig.level && sourceConfig.level !== mergedConfig.level) {
        mergedPaths.push(`level from ${sourceType}`);
        mergedConfig.level = sourceConfig.level;
      }

      if (typeof sourceConfig.timestamp === 'boolean' && sourceConfig.timestamp !== mergedConfig.timestamp) {
        mergedPaths.push(`timestamp from ${sourceType}`);
        mergedConfig.timestamp = sourceConfig.timestamp;
      }

      if (sourceConfig.serviceName && sourceConfig.serviceName !== mergedConfig.serviceName) {
        mergedPaths.push(`serviceName from ${sourceType}`);
        mergedConfig.serviceName = sourceConfig.serviceName;
      }

      if (sourceConfig.version && sourceConfig.version !== mergedConfig.version) {
        mergedPaths.push(`version from ${sourceType}`);
        mergedConfig.version = sourceConfig.version;
      }

      if (sourceConfig.environment && sourceConfig.environment !== mergedConfig.environment) {
        mergedPaths.push(`environment from ${sourceType}`);
        mergedConfig.environment = sourceConfig.environment;
      }

      // 合并流配置（更复杂的逻辑）
      if (sourceConfig.streams && sourceConfig.streams.length > 0) {
        if (mergedConfig.streams.length === 0) {
          // 如果还没有流配置，直接使用
          mergedConfig.streams = sourceConfig.streams;
          mergedPaths.push(`streams from ${sourceType}`);
        } else {
          // 合并流配置
          const existingStreams = new Set(mergedConfig.streams.map(s => s.name));
          for (const stream of sourceConfig.streams) {
            if (existingStreams.has(stream.name)) {
              conflicts.push(`Stream '${stream.name}' conflict from ${sourceType}`);
            } else {
              mergedConfig.streams.push(stream);
              mergedPaths.push(`stream '${stream.name}' from ${sourceType}`);
            }
          }
        }
      }
    }

    return mergedConfig;
  }

  /**
   * 转换增强配置到日志配置
   */
  private convertEnhancedToLogConfig(enhancedConfig: EnhancedLoggingConfig): LogConfig {
    return {
      level: enhancedConfig.level || 'info',
      timestamp: enhancedConfig.timestamp !== false,
      serviceName: enhancedConfig.serviceName || 'claude-code-router',
      version: enhancedConfig.version || '1.0.0',
      environment: enhancedConfig.environment || process.env.NODE_ENV || 'development',
      streams: enhancedConfig.streams || [
        {
          name: 'default-console',
          type: 'console',
          level: 'info',
        },
      ],
    };
  }

  /**
   * 加载环境变量配置
   */
  private loadEnvironmentConfig(): LogConfig | null {
    const envConfig: LogConfig = {
      level: (process.env.LOG_LEVEL as any) || 'info',
      timestamp: process.env.LOG_TIMESTAMP !== 'false',
      serviceName: process.env.LOG_SERVICE_NAME || 'claude-code-router',
      version: process.env.LOG_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      streams: [],
    };

    // 如果有环境变量设置的流配置
    if (process.env.LOG_STREAMS) {
      try {
        const streams = JSON.parse(process.env.LOG_STREAMS);
        envConfig.streams = streams;
      } catch (error) {
        this.warnings.push(`Failed to parse LOG_STREAMS environment variable`);
      }
    }

    return envConfig;
  }
}