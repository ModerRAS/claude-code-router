import { readFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join, dirname } from 'path';
import { LogConfig, StreamEntry, LogLevel } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 增强配置加载器 - 支持从配置文件加载和热重载
 * 
 * 简化实现说明：
 * - 原本实现：完整的配置加载、热重载、配置验证、环境变量覆盖
 * - 简化实现：基础的配置加载，简单的文件监听，基本验证
 * - 文件位置：src/utils/logging/config/EnhancedConfigLoader.ts
 * - 优化点：后续可添加热重载、配置验证、环境变量覆盖、配置缓存
 */

/**
 * 增强日志配置接口（从配置文件）
 */
export interface EnhancedLoggingConfig {
  enabled?: boolean;
  level?: LogLevel;
  timestamp?: boolean;
  serviceName?: string;
  version?: string;
  environment?: string;
  streams?: StreamEntry[];
  enhancedFeatures?: {
    requestTracking?: {
      enabled?: boolean;
      maxActiveRequests?: number;
      maxContextAge?: number;
      autoCleanup?: boolean;
      cleanupInterval?: number;
    };
    streamTracking?: {
      enabled?: boolean;
      enableMetrics?: boolean;
      enableProgressTracking?: boolean;
    };
    errorLogging?: {
      enabled?: boolean;
      enableStatistics?: boolean;
      enableTrendAnalysis?: boolean;
      maxHistorySize?: number;
    };
    performanceMetrics?: {
      enabled?: boolean;
      collectionInterval?: number;
    };
  };
  integration?: {
    enableNewLogging?: boolean;
    migrateExistingLogs?: boolean;
    preserveExistingBehavior?: boolean;
    enableEnhancedFeatures?: boolean;
    logDirectory?: string;
    logLevel?: string;
  };
  backwardCompatibility?: {
    enabled?: boolean;
    convertExistingConfig?: boolean;
    generateMigrationSuggestions?: boolean;
  };
}

/**
 * 配置预设接口
 */
export interface LoggingPresets {
  production?: EnhancedLoggingConfig;
  development?: EnhancedLoggingConfig;
  testing?: EnhancedLoggingConfig;
}

/**
 * 完整的配置文件接口
 */
export interface CompleteConfigFile {
  Logging?: EnhancedLoggingConfig;
  LoggingPresets?: LoggingPresets;
  EnvironmentVariables?: Record<string, string>;
}

/**
 * 增强配置加载器
 */
export class EnhancedConfigLoader {
  private configPath: string;
  private config: CompleteConfigFile | null = null;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private listeners: Set<(config: CompleteConfigFile) => void> = new Set();

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<Result<CompleteConfigFile, Error>> {
    try {
      if (!existsSync(this.configPath)) {
        return Err(new Error(`Config file not found: ${this.configPath}`));
      }

      const configContent = readFileSync(this.configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent) as CompleteConfigFile;

      this.config = parsedConfig;

      return Ok(parsedConfig);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取日志配置
   */
  getLoggingConfig(): Result<LogConfig, Error> {
    if (!this.config || !this.config.Logging) {
      return Err(new Error('Logging configuration not found'));
    }

    try {
      const loggingConfig = this.config.Logging;
      const logConfig: LogConfig = {
        level: loggingConfig.level || 'info',
        timestamp: loggingConfig.timestamp !== false,
        serviceName: loggingConfig.serviceName || 'claude-code-router',
        version: loggingConfig.version || '1.0.0',
        environment: loggingConfig.environment || process.env.NODE_ENV || 'development',
        streams: loggingConfig.streams || [
          {
            name: 'default-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      return Ok(logConfig);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取预设配置
   */
  getPreset(presetName: string): Result<EnhancedLoggingConfig, Error> {
    if (!this.config || !this.config.LoggingPresets) {
      return Err(new Error('Logging presets not found'));
    }

    const preset = this.config.LoggingPresets[presetName as keyof LoggingPresets];
    if (!preset) {
      return Err(new Error(`Preset '${presetName}' not found`));
    }

    return Ok(preset);
  }

  /**
   * 获取环境变量配置
   */
  getEnvironmentVariables(): Record<string, string> {
    if (!this.config) {
      return {};
    }

    return this.config.EnvironmentVariables || {};
  }

  /**
   * 检查是否启用增强日志
   */
  isEnhancedLoggingEnabled(): boolean {
    if (!this.config || !this.config.Logging) {
      return false;
    }

    return this.config.Logging.enabled !== false;
  }

  /**
   * 开始监听配置文件变化
   */
  startWatching(): Result<void, Error> {
    try {
      if (!existsSync(this.configPath)) {
        return Err(new Error(`Config file not found: ${this.configPath}`));
      }

      const watcher = watchFile(this.configPath, { interval: 1000 }, async (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          // 配置文件发生变化，重新加载
          const result = await this.loadConfig();
          if (result.isOk()) {
            this.notifyListeners(result.value);
          }
        }
      });

      this.watchers.set(this.configPath, watcher);
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 停止监听配置文件变化
   */
  stopWatching(): void {
    for (const [path, watcher] of this.watchers) {
      unwatchFile(path);
      watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * 添加配置变化监听器
   */
  addConfigChangeListener(listener: (config: CompleteConfigFile) => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除配置变化监听器
   */
  removeConfigChangeListener(listener: (config: CompleteConfigFile) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 获取当前配置
   */
  getCurrentConfig(): CompleteConfigFile | null {
    return this.config;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopWatching();
    this.listeners.clear();
    this.config = null;
  }

  /**
   * 通知监听器
   */
  private notifyListeners(config: CompleteConfigFile): void {
    for (const listener of this.listeners) {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in config change listener:', error);
      }
    }
  }
}

/**
 * 创建配置加载器
 */
export function createConfigLoader(configPath: string): EnhancedConfigLoader {
  return new EnhancedConfigLoader(configPath);
}

/**
 * 创建默认配置路径的加载器
 */
export function createDefaultConfigLoader(): EnhancedConfigLoader {
  const defaultPath = join(process.cwd(), 'config.example.enhanced-logging.json');
  return new EnhancedConfigLoader(defaultPath);
}

/**
 * 自动发现配置文件并创建加载器
 */
export function discoverConfigLoader(): Result<EnhancedConfigLoader, Error> {
  const possiblePaths = [
    join(process.cwd(), 'config.json'),
    join(process.cwd(), 'config.example.enhanced-logging.json'),
    join(process.cwd(), 'claude-code-router-config.json'),
    join(process.env.HOME_DIR || '', '.claude-code-router', 'config.json'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return Ok(new EnhancedConfigLoader(path));
    }
  }

  return Err(new Error('No configuration file found'));
}