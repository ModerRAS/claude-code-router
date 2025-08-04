/**
 * Stream Configuration Types
 * 
 * Defines types for multi-stream output configuration.
 * Based on Pino 9.x multistream functionality.
 */

import type { Level, DestinationStream } from 'pino';

/**
 * Stream entry configuration for Pino multistream
 * 
 * Each stream entry defines a specific output destination with its own
 * log level filter. This allows for fine-grained control over where
 * different levels of logs are written.
 */
export interface StreamEntry {
  /** Type of the stream */
  type: string;
  /** Minimum log level for this stream */
  level: Level;
  /** The destination stream for log output */
  stream?: DestinationStream;
  /** Optional name for identifying this stream */
  name: string;
  /** File path for file streams */
  path?: string;
  /** File path for file streams (alternative) */
  filePath?: string;
  /** Enable rotation for file streams */
  rotation?: boolean;
  /** Auto end stream */
  autoEnd?: boolean;
  /** Output to stderr for console streams */
  stderr?: boolean;
  /** Additional properties */
  [key: string]: any;
}

/**
 * Stream type enumeration
 */
export enum StreamType {
  FILE = 'file',
  CONSOLE = 'console',
  NETWORK = 'network',
  CUSTOM = 'custom'
}

/**
 * Base stream configuration interface
 */
export interface BaseStreamConfig {
  /** Type of the stream */
  type: StreamType;
  /** Minimum log level for this stream */
  level: Level;
  /** Whether this stream is enabled */
  enabled?: boolean;
}

/**
 * File stream configuration
 */
export interface FileStreamConfig extends BaseStreamConfig {
  type: StreamType.FILE;
  /** File path for log output */
  filePath: string;
  /** Whether to enable file rotation */
  enableRotation?: boolean;
  /** Maximum file size before rotation */
  maxFileSize?: string;
  /** Rotation interval */
  rotationInterval?: string;
  /** Whether to compress rotated files */
  compress?: boolean;
  /** Whether to create directories if they don't exist */
  mkdir?: boolean;
}

/**
 * Console stream configuration
 */
export interface ConsoleStreamConfig extends BaseStreamConfig {
  type: StreamType.CONSOLE;
  /** Whether to use pretty printing for console output */
  prettyPrint?: boolean;
  /** Colorize console output */
  colorize?: boolean;
  /** Time format for console output */
  timeFormat?: string;
}

/**
 * Network stream configuration
 */
export interface NetworkStreamConfig extends BaseStreamConfig {
  type: StreamType.NETWORK;
  /** Network endpoint URL */
  endpoint: string;
  /** Authentication token */
  token?: string;
  /** Additional headers for network requests */
  headers?: Record<string, string>;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Custom stream configuration
 */
export interface CustomStreamConfig extends BaseStreamConfig {
  type: StreamType.CUSTOM;
  /** Custom stream implementation */
  stream: DestinationStream;
  /** Stream factory function */
  factory?: () => DestinationStream;
  /** Stream configuration options */
  options?: Record<string, any>;
}

/**
 * Union type for all stream configurations
 */
export type AnyStreamConfig = 
  | FileStreamConfig 
  | ConsoleStreamConfig 
  | NetworkStreamConfig 
  | CustomStreamConfig;

/**
 * Multi-stream configuration
 */
export interface MultiStreamConfig {
  /** Array of stream configurations */
  streams: AnyStreamConfig[];
  /** Overall minimum log level for the logger */
  loggerLevel?: Level;
  /** Whether to deduplicate log entries across streams */
  dedupe?: boolean;
}

/**
 * Stream factory interface
 */
export interface StreamFactory {
  /** Create a stream from configuration */
  createStream(config: AnyStreamConfig): Promise<DestinationStream>;
  /** Validate stream configuration */
  validateConfig(config: AnyStreamConfig): boolean;
}

/**
 * Stream validation result
 */
export interface StreamValidationResult {
  /** Whether the stream configuration is valid */
  isValid: boolean;
  /** Array of validation error messages */
  errors: string[];
  /** The validated stream configuration (if valid) */
  config?: AnyStreamConfig;
}

/**
 * Default stream configurations
 */
export const DEFAULT_STREAM_CONFIGS: MultiStreamConfig = {
  streams: [
    {
      type: StreamType.FILE,
      level: 'info',
      filePath: './logs/info.log',
      enableRotation: true,
      maxFileSize: '100M',
      rotationInterval: '1d',
      compress: false,
      mkdir: true
    } as FileStreamConfig,
    {
      type: StreamType.FILE,
      level: 'error',
      filePath: './logs/error.log',
      enableRotation: true,
      maxFileSize: '100M',
      rotationInterval: '1d',
      compress: false,
      mkdir: true
    } as FileStreamConfig
  ],
  loggerLevel: 'info',
  dedupe: false
};