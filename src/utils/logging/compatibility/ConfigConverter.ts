import { LogConfig, StreamEntry, LogLevel } from '../types/log-config';
import { Result, Ok, Err } from '../types/common';

/**
 * 配置转换器 - 将传统日志配置转换为新系统配置
 * 
 * 简化实现说明：
 * - 原本实现：完整的配置转换、自动映射、验证、优化建议
 * - 简化实现：基础的配置转换逻辑，简化映射规则
 * - 文件位置：src/utils/logging/compatibility/ConfigConverter.ts
 * - 优化点：后续可添加智能转换、配置优化建议、迁移工具
 */

/**
 * 传统日志配置接口
 */
export interface LegacyLogConfig {
  level?: LogLevel;
  silent?: boolean;
  outputPath?: string;
  errorPath?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableRotation?: boolean;
  maxFileSize?: string;
  maxFiles?: number;
  datePattern?: string;
  format?: 'json' | 'text';
  prettyPrint?: boolean;
  timestamp?: boolean;
}

/**
 * 转换传统配置到新系统配置
 */
export function convertLegacyConfig(legacyConfig: LegacyLogConfig): Result<LogConfig, Error> {
  try {
    const streams: StreamEntry[] = [];

    // 构建流配置
    if (legacyConfig.enableFile !== false && legacyConfig.outputPath) {
      // 主日志文件
      const mainStream: StreamEntry = {
        name: 'main-file',
        type: 'file',
        level: legacyConfig.level || 'info',
        path: legacyConfig.outputPath,
      };

      // 添加轮转配置
      if (legacyConfig.enableRotation) {
        mainStream.rotation = {
          size: legacyConfig.maxFileSize || '10M',
          interval: legacyConfig.datePattern || '1d',
        };
      }

      streams.push(mainStream);
    }

    // 错误日志文件
    if (legacyConfig.errorPath) {
      const errorStream: StreamEntry = {
        name: 'error-file',
        type: 'file',
        level: 'error',
        path: legacyConfig.errorPath,
      };

      if (legacyConfig.enableRotation) {
        errorStream.rotation = {
          size: legacyConfig.maxFileSize || '10M',
          interval: legacyConfig.datePattern || '1d',
        };
      }

      streams.push(errorStream);
    }

    // 控制台输出
    if (legacyConfig.enableConsole !== false) {
      streams.push({
        name: 'console',
        type: 'console',
        level: legacyConfig.level || 'info',
      });
    }

    // 如果没有配置任何流，提供默认配置
    if (streams.length === 0) {
      streams.push({
        name: 'default-console',
        type: 'console',
        level: legacyConfig.level || 'info',
      });
    }

    const newConfig: LogConfig = {
      level: legacyConfig.silent ? 'silent' : (legacyConfig.level || 'info'),
      timestamp: legacyConfig.timestamp !== false,
      serviceName: 'claude-code-router',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      streams,
    };

    return Ok(newConfig);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 检测传统配置文件并转换
 */
export function detectAndConvertConfig(configPath?: string): Result<LogConfig | null, Error> {
  try {
    // 这里可以添加配置文件检测逻辑
    // 目前简化处理，返回 null 表示没有检测到传统配置
    return Ok(null);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 生成配置迁移建议
 */
export function generateMigrationSuggestions(legacyConfig: LegacyLogConfig): string[] {
  const suggestions: string[] = [];

  if (legacyConfig.outputPath && !legacyConfig.errorPath) {
    suggestions.push('建议配置单独的错误日志文件路径，以便更好地分离错误日志');
  }

  if (legacyConfig.enableRotation && !legacyConfig.maxFileSize) {
    suggestions.push('建议配置 maxFileSize 参数以控制日志文件大小');
  }

  if (legacyConfig.prettyPrint) {
    suggestions.push('新系统默认使用 JSON 格式，如需美化输出可以使用 pino-pretty');
  }

  if (!legacyConfig.enableConsole && !legacyConfig.enableFile) {
    suggestions.push('至少需要启用一种输出方式（控制台或文件）');
  }

  if (legacyConfig.silent) {
    suggestions.push('静默模式将关闭所有日志输出，建议仅在特殊情况下使用');
  }

  return suggestions;
}

/**
 * 验证转换后的配置
 */
export function validateConvertedConfig(config: LogConfig): Result<void, Error> {
  if (!config.streams || config.streams.length === 0) {
    return Err(new Error('至少需要配置一个输出流'));
  }

  // 检查文件路径
  for (const stream of config.streams) {
    if (stream.type === 'file' && !stream.path) {
      return Err(new Error(`文件流 ${stream.name} 需要配置 path 参数`));
    }
  }

  // 检查日志级别
  const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace', 'silent'];
  if (config.level && !validLevels.includes(config.level)) {
    return Err(new Error(`无效的日志级别: ${config.level}`));
  }

  return Ok(undefined);
}