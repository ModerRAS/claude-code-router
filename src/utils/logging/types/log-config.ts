/**
 * Log Configuration Types
 * 
 * Defines the configuration interfaces for the enhanced logging system.
 * Based on Pino 9.x official documentation and best practices.
 */

import type { Level } from 'pino';

/**
 * Main logging configuration interface
 * 
 * This interface defines all configurable aspects of the logging system,
 * including output targets, rotation settings, and compatibility options.
 */
export interface LogConfig {
  /** Minimum log level to output (follows Pino standard levels) */
  level: LogLevel;
  
  /** Enable automatic log file rotation */
  enableFileRotation: boolean;
  
  /** Number of days to retain log files before cleanup */
  retentionDays: number;
  
  /** Directory where log files will be stored */
  logDirectory: string;
  
  /** Enable backward compatibility with existing log system */
  enableBackwardCompatibility: boolean;
  
  /** Maximum file size before rotation (e.g., '100M', '1G') */
  maxFileSize?: string;
  
  /** Rotation interval (e.g., '1d' for daily, '1h' for hourly) */
  rotationInterval?: string;
  
  /** Whether to compress rotated log files */
  compressLogs?: boolean;
  
  /** Whether to output logs to console */
  consoleOutput?: boolean;
  
  /** Request tracking configuration */
  requestTracking: {
    /** Enable request lifecycle tracking */
    enabled: boolean;
    /** Include detailed request information in logs */
    includeDetails: boolean;
  };
  
  /** Performance optimization settings */
  performance?: {
    /** Buffer size for batch writes (in bytes) */
    bufferSize?: number;
    /** Flush interval for buffered writes (in milliseconds) */
    flushInterval?: number;
    /** Maximum age for request sessions (in milliseconds) */
    maxSessionAge?: number;
  };
}

/**
 * Pino log level enumeration
 * 
 * Matches the standard Pino log levels with their numeric values.
 * This ensures type safety and consistency across the logging system.
 */
export const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
} as const;

/**
 * Type alias for log level keys
 */
export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Type guard to check if a value is a valid log level
 */
export function isLogLevel(value: string): value is LogLevel {
  return value in LOG_LEVELS;
}

/**
 * Map string log level to numeric value
 */
export function logLevelToNumber(level: LogLevel): number {
  return LOG_LEVELS[level];
}

/**
 * Map numeric log level to string key
 */
export function numberToLogLevel(level: number): LogLevel {
  const entry = Object.entries(LOG_LEVELS).find(([, value]) => value === level);
  return entry ? (entry[0] as LogLevel) : 'info';
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Array of validation error messages */
  errors: string[];
  /** Array of validation warning messages */
  warnings: string[];
}

/**
 * Default log configuration values
 */
export const DEFAULT_LOG_CONFIG: Partial<LogConfig> = {
  level: 'info',
  enableFileRotation: true,
  retentionDays: 7,
  logDirectory: '~/.claude-code-router/logs',
  enableBackwardCompatibility: true,
  maxFileSize: '100M',
  rotationInterval: '1d',
  compressLogs: false,
  consoleOutput: false,
  requestTracking: {
    enabled: true,
    includeDetails: true
  },
  performance: {
    bufferSize: 4096,
    flushInterval: 5000,
    maxSessionAge: 3600000 // 1 hour
  }
};

/**
 * Environment-specific configuration overrides
 */
export const ENVIRONMENT_CONFIGS: Record<string, Partial<LogConfig>> = {
  development: {
    level: 'debug',
    consoleOutput: true,
    compressLogs: false
  },
  production: {
    level: 'info',
    consoleOutput: false,
    compressLogs: true,
    performance: {
      bufferSize: 8192,
      flushInterval: 10000
    }
  },
  test: {
    level: 'silent',
    consoleOutput: true,
    enableFileRotation: false
  }
};