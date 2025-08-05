import { LogManager } from './LogManager';
import { LogConfig } from './types/log-config';
import { LogConfigManager } from './config/LogConfigManager';

/**
 * 日志管理器工厂函数 - 提供便捷的创建和配置接口
 * 
 * 简化实现说明：
 * - 原本实现：复杂的工厂模式、多实例管理、配置缓存、插件加载
 * - 简化实现：简单的工厂函数，基础的实例创建，简化配置管理
 * - 文件位置：src/utils/logging/factory.ts
 * - 优化点：后续可添加实例池、配置缓存、插件系统、动态配置
 */

/**
 * 创建日志管理器实例
 */
export function createLogManager(config?: Partial<LogConfig>): LogManager {
  // 如果提供了配置，提前进行验证
  if (config) {
    const tempManager = new LogConfigManager(config);
    const validation = tempManager.validateConfiguration(config);
    if (!validation.isValid) {
      throw new Error(`Invalid log configuration: ${validation.errors.join(', ')}`);
    }
  }
  
  return new LogManager(config);
}

/**
 * 创建默认配置的日志管理器
 */
export function createDefaultLogManager(): LogManager {
  return new LogManager();
}

/**
 * 创建生产环境配置的日志管理器
 */
export function createProductionLogManager(): LogManager {
  return new LogManager({
    level: 'info',
    environment: 'production',
    timestamp: true,
    streams: [
      {
        name: 'error-file',
        type: 'file',
        level: 'error',
        path: './logs/error.log',
        rotation: {
          size: '10M',
          interval: '1d',
        },
      },
      {
        name: 'combined-file',
        type: 'file',
        level: 'info',
        path: './logs/combined.log',
        rotation: {
          size: '10M',
          interval: '1d',
        },
      },
      {
        name: 'console-error',
        type: 'console',
        level: 'error',
        stderr: true,
      },
    ],
  });
}

/**
 * 创建开发环境配置的日志管理器
 */
export function createDevelopmentLogManager(): LogManager {
  return new LogManager({
    level: 'debug',
    environment: 'development',
    timestamp: true,
    streams: [
      {
        name: 'console-output',
        type: 'console',
        level: 'debug',
        stderr: false,
      },
      {
        name: 'dev-file',
        type: 'file',
        level: 'debug',
        path: './logs/development.log',
        rotation: {
          size: '5M',
          interval: '1h',
        },
      },
    ],
  });
}

/**
 * 创建测试环境配置的日志管理器
 */
export function createTestLogManager(): LogManager {
  return new LogManager({
    level: 'debug',
    environment: 'test',
    timestamp: false,
    streams: [
      {
        name: 'test-console',
        type: 'console',
        level: 'debug',
        stderr: false,
      },
    ],
  });
}

/**
 * 全局日志管理器实例（可选的单例模式）
 */
let globalLogManager: LogManager | null = null;

/**
 * 获取全局日志管理器实例
 */
export function getGlobalLogManager(): LogManager {
  if (!globalLogManager) {
    globalLogManager = createDefaultLogManager();
  }
  return globalLogManager;
}

/**
 * 设置全局日志管理器实例
 */
export function setGlobalLogManager(manager: LogManager): void {
  globalLogManager = manager;
}

/**
 * 初始化全局日志管理器
 */
export async function initializeGlobalLogManager(config?: Partial<LogConfig>): Promise<void> {
  const manager = createLogManager(config);
  const result = await manager.initialize();
  
  if (result.isErr()) {
    throw result.error;
  }
  
  setGlobalLogManager(manager);
}

/**
 * 销毁全局日志管理器
 */
export async function destroyGlobalLogManager(): Promise<void> {
  if (globalLogManager) {
    await globalLogManager.cleanup();
    globalLogManager = null;
  }
}