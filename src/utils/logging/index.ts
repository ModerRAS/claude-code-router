/**
 * Claude Code Router Enhanced Logging System
 * 
 * A comprehensive logging system built on Pino 9.x with features including:
 * - Multi-stream output with log level separation
 * - Request lifecycle tracking
 * - Log rotation with pino-roll
 * - Stream state monitoring
 * - Enhanced error logging
 * - Backward compatibility with existing log system
 * - Performance optimizations for production use
 * 
 * @module EnhancedLoggingSystem
 */

// 主要导出
export { LogManager } from './LogManager';
export { 
  createLogManager, 
  createDefaultLogManager, 
  createProductionLogManager, 
  createDevelopmentLogManager, 
  createTestLogManager,
  getGlobalLogManager,
  setGlobalLogManager,
  initializeGlobalLogManager,
  destroyGlobalLogManager
} from './factory';

// 配置相关
export { LogConfigManager } from './config/LogConfigManager';
export { EnvironmentConfig } from './config/EnvironmentConfig';
export { ConfigValidator } from './config/ConfigValidator';

// 流管理相关
export { StreamManager } from './streams/StreamManager';
export { PinoRollStream } from './streams/PinoRollStream';
export { DestinationStream } from './streams/DestinationStream';
export { ConsoleStream } from './streams/ConsoleStream';

// 追踪相关
export { RequestContextTracker } from './tracking/RequestContextTracker';
export { StreamStateTracker } from './tracking/StreamStateTracker';

// 增强功能
export { ErrorLogger } from './enhanced/ErrorLogger';

// 向后兼容性
export { LegacyLoggerAdapter } from './compatibility/LegacyLoggerAdapter';
export { BackwardCompatibility } from './compatibility/BackwardCompatibility';
export { 
  convertLegacyConfig, 
  detectAndConvertConfig, 
  generateMigrationSuggestions,
  validateConvertedConfig,
  type LegacyLogConfig 
} from './compatibility/ConfigConverter';
export {
  createCompatibleLogger,
  createCompatibleLoggerWithLegacyConfig,
  createCompatibleLoggerWithNewConfig,
  createSimpleLegacyLogger,
  getGlobalCompatibleLogger,
  setGlobalCompatibleLogger,
  initializeGlobalCompatibleLogger,
  destroyGlobalCompatibleLogger
} from './compatibility/compatibility-factory';

// 集成模块
export { ExistingLogIntegration } from './integration/ExistingLogIntegration';
export { 
  createLogIntegration,
  getGlobalLogIntegration,
  setGlobalLogIntegration,
  initializeGlobalLogIntegration,
  destroyGlobalLogIntegration,
  getEnhancedLogFunction,
  getRequestLogger,
  log,
  logError,
  logDebug,
  logWarn,
  getIntegrationStatus
} from './integration/integration-factory';
export type { IntegrationConfig } from './integration/ExistingLogIntegration';

// 类型定义
export type { LogConfig } from './types/log-config';
export type { StreamEntry } from './types/stream-entry';
export type { RequestContext } from './types/request-context';
export type { LogLevel } from './types/log-config';
export type { TokenUsage, RequestStatistics } from './types/request-context';
export type { StreamState, StreamError, StreamProgress } from './types/request-context';
export type { Result, Ok, Err } from './types/common';

// 版本信息
export const LOG_MODULE_VERSION = '1.0.0';

// 便捷的日志级别常量
export const LOG_LEVELS = {
  ERROR: 'error' as const,
  WARN: 'warn' as const,
  INFO: 'info' as const,
  DEBUG: 'debug' as const,
  TRACE: 'trace' as const,
};

// 便捷的流类型常量
export const STREAM_TYPES = {
  FILE: 'file' as const,
  CONSOLE: 'console' as const,
  NETWORK: 'network' as const,
  CUSTOM: 'custom' as const,
};

// 便捷的请求状态常量
export const REQUEST_STATUS = {
  CREATED: 'created' as const,
  ACTIVE: 'active' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
};

// 便捷的流状态常量
export const STREAM_STATE = {
  IDLE: 'idle' as const,
  STARTED: 'started' as const,
  PROGRESS: 'progress' as const,
  COMPLETED: 'completed' as const,
  ERROR: 'error' as const,
  PAUSED: 'paused' as const,
};