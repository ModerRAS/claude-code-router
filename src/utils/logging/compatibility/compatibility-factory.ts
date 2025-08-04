import { BackwardCompatibility } from './BackwardCompatibility';
import { LegacyLogConfig, LogConfig } from './ConfigConverter';
import { Result, Ok, Err } from '../types/common';

/**
 * 向后兼容性工厂函数 - 提供便捷的创建和初始化接口
 * 
 * 简化实现说明：
 * - 原本实现：复杂的工厂模式、缓存管理、配置验证、错误处理
 * - 简化实现：基础的工厂函数，简化创建流程，基本错误处理
 * - 文件位置：src/utils/logging/compatibility/compatibility-factory.ts
 * - 优化点：后续可添加缓存管理、配置验证、性能优化
 */

/**
 * 创建兼容性实例（自动初始化）
 */
export async function createCompatibleLogger(): Promise<Result<BackwardCompatibility, Error>> {
  try {
    const compatibility = new BackwardCompatibility();
    const initResult = await compatibility.autoInitialize();
    
    if (initResult.isErr()) {
      return Err(initResult.error);
    }
    
    return Ok(compatibility);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 使用传统配置创建兼容性实例
 */
export async function createCompatibleLoggerWithLegacyConfig(
  config: LegacyLogConfig
): Promise<Result<BackwardCompatibility, Error>> {
  try {
    const compatibility = new BackwardCompatibility();
    const initResult = await compatibility.initWithLegacyConfig(config);
    
    if (initResult.isErr()) {
      return Err(initResult.error);
    }
    
    return Ok(compatibility);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 使用新配置创建兼容性实例
 */
export async function createCompatibleLoggerWithNewConfig(
  config: LogConfig
): Promise<Result<BackwardCompatibility, Error>> {
  try {
    const compatibility = new BackwardCompatibility();
    const initResult = await compatibility.initWithNewConfig(config);
    
    if (initResult.isErr()) {
      return Err(initResult.error);
    }
    
    return Ok(compatibility);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 创建简单的兼容性日志器（传统风格接口）
 */
export async function createSimpleLegacyLogger(): Promise<Result<{
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  fatal: (message: string, ...args: unknown[]) => void;
}, Error>> {
  try {
    const compatibilityResult = await createCompatibleLogger();
    
    if (compatibilityResult.isErr()) {
      return Err(compatibilityResult.error);
    }
    
    const logger = compatibilityResult.value.getLogger();
    
    return Ok({
      debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
      info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
      warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
      error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
      fatal: (message: string, ...args: unknown[]) => logger.fatal(message, ...args),
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 全局兼容性日志器实例
 */
let globalCompatibleLogger: BackwardCompatibility | null = null;

/**
 * 获取全局兼容性日志器
 */
export async function getGlobalCompatibleLogger(): Promise<Result<BackwardCompatibility, Error>> {
  if (globalCompatibleLogger) {
    return Ok(globalCompatibleLogger);
  }

  const result = await createCompatibleLogger();
  if (result.isOk()) {
    globalCompatibleLogger = result.value;
  }

  return result;
}

/**
 * 设置全局兼容性日志器
 */
export function setGlobalCompatibleLogger(logger: BackwardCompatibility): void {
  globalCompatibleLogger = logger;
}

/**
 * 初始化全局兼容性日志器
 */
export async function initializeGlobalCompatibleLogger(
  config?: LegacyLogConfig | LogConfig
): Promise<Result<void, Error>> {
  try {
    if (globalCompatibleLogger) {
      await globalCompatibleLogger.cleanup();
      globalCompatibleLogger = null;
    }

    let compatibility: BackwardCompatibility;
    
    if (config && 'enableConsole' in config) {
      // 传统配置
      const result = await createCompatibleLoggerWithLegacyConfig(config as LegacyLogConfig);
      if (result.isErr()) {
        return Err(result.error);
      }
      compatibility = result.value;
    } else if (config) {
      // 新配置
      const result = await createCompatibleLoggerWithNewConfig(config as LogConfig);
      if (result.isErr()) {
        return Err(result.error);
      }
      compatibility = result.value;
    } else {
      // 自动配置
      const result = await createCompatibleLogger();
      if (result.isErr()) {
        return Err(result.error);
      }
      compatibility = result.value;
    }

    globalCompatibleLogger = compatibility;
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 销毁全局兼容性日志器
 */
export async function destroyGlobalCompatibleLogger(): Promise<void> {
  if (globalCompatibleLogger) {
    await globalCompatibleLogger.cleanup();
    globalCompatibleLogger = null;
  }
}