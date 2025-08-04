import { ExistingLogIntegration, IntegrationConfig } from './ExistingLogIntegration';
import { Result, Ok, Err } from '../types/common';

/**
 * 日志集成工厂函数 - 提供便捷的集成接口
 * 
 * 简化实现说明：
 * - 原本实现：复杂的工厂模式、实例管理、配置优化、错误恢复
 * - 简化实现：基础的工厂函数，简化创建流程，基本错误处理
 * - 文件位置：src/utils/logging/integration/integration-factory.ts
 * - 优化点：后续可添加实例管理、配置优化、错误恢复机制
 */

/**
 * 全局集成实例
 */
let globalIntegration: ExistingLogIntegration | null = null;

/**
 * 创建日志集成实例
 */
export async function createLogIntegration(
  config?: IntegrationConfig
): Promise<Result<ExistingLogIntegration, Error>> {
  try {
    const integration = new ExistingLogIntegration(config);
    const initResult = await integration.initialize();
    
    if (initResult.isErr()) {
      return Err(initResult.error);
    }
    
    return Ok(integration);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 获取全局日志集成实例
 */
export async function getGlobalLogIntegration(): Promise<Result<ExistingLogIntegration, Error>> {
  if (globalIntegration) {
    return Ok(globalIntegration);
  }

  const result = await createLogIntegration();
  if (result.isOk()) {
    globalIntegration = result.value;
  }

  return result;
}

/**
 * 设置全局日志集成实例
 */
export function setGlobalLogIntegration(integration: ExistingLogIntegration): void {
  globalIntegration = integration;
}

/**
 * 初始化全局日志集成
 */
export async function initializeGlobalLogIntegration(
  config?: IntegrationConfig
): Promise<Result<void, Error>> {
  try {
    if (globalIntegration) {
      await globalIntegration.cleanup();
      globalIntegration = null;
    }

    const result = await createLogIntegration(config);
    if (result.isErr()) {
      return Err(result.error);
    }

    globalIntegration = result.value;

    // 自动替换现有日志函数
    const replaceResult = globalIntegration.replaceExistingLogFunction();
    if (replaceResult.isErr()) {
      console.warn('Failed to replace existing log function:', replaceResult.error.message);
    }

    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * 销毁全局日志集成
 */
export async function destroyGlobalLogIntegration(): Promise<void> {
  if (globalIntegration) {
    await globalIntegration.cleanup();
    globalIntegration = null;
  }
}

/**
 * 获取增强的日志函数（兼容现有接口）
 */
export async function getEnhancedLogFunction(): Promise<(...args: unknown[]) => void> {
  try {
    const result = await getGlobalLogIntegration();
    if (result.isOk()) {
      return result.value.getEnhancedLogFunction();
    }
    
    // 回退到 console.log
    return (...args: unknown[]) => console.log(...args);
  } catch (error) {
    // 回退到 console.log
    return (...args: unknown[]) => console.log(...args);
  }
}

/**
 * 获取请求日志器
 */
export async function getRequestLogger(requestId: string): Promise<{
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}> {
  try {
    const result = await getGlobalLogIntegration();
    if (result.isOk()) {
      return result.value.getRequestLogger(requestId);
    }
    
    // 回退到 console
    return {
      log: (...args: unknown[]) => console.log(...args),
      error: (...args: unknown[]) => console.error(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      debug: (...args: unknown[]) => console.debug(...args),
    };
  } catch (error) {
    // 回退到 console
    return {
      log: (...args: unknown[]) => console.log(...args),
      error: (...args: unknown[]) => console.error(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      debug: (...args: unknown[]) => console.debug(...args),
    };
  }
}

/**
 * 便捷的日志记录函数（增强版）
 */
export async function log(...args: unknown[]): Promise<void> {
  const logFunc = await getEnhancedLogFunction();
  logFunc(...args);
}

/**
 * 便捷的错误日志函数
 */
export async function logError(...args: unknown[]): Promise<void> {
  const logger = await getRequestLogger('global-error');
  logger.error(...args);
}

/**
 * 便捷的调试日志函数
 */
export async function logDebug(...args: unknown[]): Promise<void> {
  const logger = await getRequestLogger('global-debug');
  logger.debug(...args);
}

/**
 * 便捷的警告日志函数
 */
export async function logWarn(...args: unknown[]): Promise<void> {
  const logger = await getRequestLogger('global-warn');
  logger.warn(...args);
}

/**
 * 获取集成状态
 */
export async function getIntegrationStatus(): Promise<Record<string, unknown>> {
  try {
    const result = await getGlobalLogIntegration();
    if (result.isOk()) {
      return result.value.getIntegrationStatus();
    }
    
    return {
      status: 'not_initialized',
      message: 'Global log integration not available',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}