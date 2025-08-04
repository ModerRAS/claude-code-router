/**
 * Configuration Validator
 * 
 * Provides comprehensive validation for logging configuration.
 * Ensures all configuration values are valid and compatible.
 */

import type { LogConfig, ConfigValidationResult } from '../types/log-config';
import type { MultiStreamConfig, AnyStreamConfig } from '../types/stream-entry';

/**
 * Validation rule interface
 */
interface ValidationRule<T = any> {
  /** Name of the validation rule */
  name: string;
  /** Description of what this rule validates */
  description: string;
  /** Validation function */
  validate: (value: T) => boolean;
  /** Error message template */
  errorMessage: (value: T) => string;
  /** Severity level */
  severity: 'error' | 'warning';
}

/**
 * Configuration Validator
 * 
 * Provides comprehensive validation for all aspects of logging configuration.
 */
export class ConfigValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private warnings: string[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize all validation rules
   */
  private initializeRules(): void {
    // Log level validation
    this.addRule('level', {
      name: 'valid_log_level',
      description: 'Log level must be one of: trace, debug, info, warn, error, fatal, silent',
      validate: (value: string) => ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(value),
      errorMessage: (value: string) => `Invalid log level: ${value}`,
      severity: 'error'
    });

    // Retention days validation
    this.addRule('retentionDays', {
      name: 'positive_retention_days',
      description: 'Retention days must be a positive number',
      validate: (value: number) => typeof value === 'number' && value > 0 && value <= 365,
      errorMessage: (value: number) => `Retention days must be between 1 and 365, got: ${value}`,
      severity: 'error'
    });

    // Log directory validation
    this.addRule('logDirectory', {
      name: 'valid_log_directory',
      description: 'Log directory must be a non-empty string',
      validate: (value: string) => typeof value === 'string' && value.trim().length > 0,
      errorMessage: (value: string) => `Log directory must be a non-empty string, got: ${value}`,
      severity: 'error'
    });

    // Max file size validation
    this.addRule('maxFileSize', {
      name: 'valid_max_file_size',
      description: 'Max file size must be in format like 100M, 1G, 50K',
      validate: (value: string) => {
        if (!value) return true; // Optional field
        const regex = /^\d+[KMG]?$/i;
        return regex.test(value);
      },
      errorMessage: (value: string) => `Max file size must be in format like 100M, 1G, 50K, got: ${value}`,
      severity: 'warning'
    });

    // Rotation interval validation
    this.addRule('rotationInterval', {
      name: 'valid_rotation_interval',
      description: 'Rotation interval must be in format like 1d, 1h, 30m',
      validate: (value: string) => {
        if (!value) return true; // Optional field
        const regex = /^\d+[smhdw]?$/i;
        return regex.test(value);
      },
      errorMessage: (value: string) => `Rotation interval must be in format like 1d, 1h, 30m, got: ${value}`,
      severity: 'warning'
    });

    // Performance buffer size validation
    this.addRule('performance.bufferSize', {
      name: 'valid_buffer_size',
      description: 'Buffer size must be between 512 and 65536 bytes',
      validate: (value: number) => value >= 512 && value <= 65536,
      errorMessage: (value: number) => `Buffer size must be between 512 and 65536, got: ${value}`,
      severity: 'warning'
    });

    // Performance flush interval validation
    this.addRule('performance.flushInterval', {
      name: 'valid_flush_interval',
      description: 'Flush interval must be between 100 and 60000 milliseconds',
      validate: (value: number) => value >= 100 && value <= 60000,
      errorMessage: (value: number) => `Flush interval must be between 100 and 60000ms, got: ${value}`,
      severity: 'warning'
    });

    // Performance max session age validation
    this.addRule('performance.maxSessionAge', {
      name: 'valid_max_session_age',
      description: 'Max session age must be between 60000 and 86400000 milliseconds',
      validate: (value: number) => value >= 60000 && value <= 86400000, // 1 minute to 24 hours
      errorMessage: (value: number) => `Max session age must be between 1 minute and 24 hours, got: ${value}`,
      severity: 'warning'
    });
  }

  /**
   * Add a validation rule
   */
  private addRule(key: string, rule: ValidationRule): void {
    if (!this.rules.has(key)) {
      this.rules.set(key, []);
    }
    this.rules.get(key)!.push(rule);
  }

  /**
   * Validate log configuration
   */
  public validateLogConfig(config: LogConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate all top-level keys
    this.validateObject(config, '', errors, warnings);

    // Validate logical constraints
    this.validateLogicalConstraints(config, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate stream configuration
   */
  public validateStreamConfig(config: MultiStreamConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate streams array
    if (!Array.isArray(config.streams) || config.streams.length === 0) {
      errors.push('Streams configuration must be a non-empty array');
      return { isValid: false, errors, warnings };
    }

    // Validate each stream
    config.streams.forEach((stream, index) => {
      const prefix = `streams[${index}]`;
      this.validateStream(stream, prefix, errors, warnings);
    });

    // Validate logger level against stream levels
    if (config.loggerLevel) {
      const lowestStreamLevel = this.getLowestStreamLevel(config.streams);
      if (this.compareLogLevels(config.loggerLevel, lowestStreamLevel) > 0) {
        warnings.push(`Logger level (${config.loggerLevel}) should be at or below the lowest stream level (${lowestStreamLevel})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single stream configuration
   */
  private validateStream(stream: AnyStreamConfig, prefix: string, errors: string[], warnings: string[]): void {
    // Validate required fields
    if (!stream.type || !Object.values(['file', 'console', 'network', 'custom']).includes(stream.type)) {
      errors.push(`${prefix}: Invalid stream type: ${stream.type}`);
    }

    if (!stream.level || !['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(stream.level)) {
      errors.push(`${prefix}: Invalid stream level: ${stream.level}`);
    }

    // Type-specific validation
    switch (stream.type) {
      case 'file':
        this.validateFileStream(stream as any, prefix, errors, warnings);
        break;
      case 'console':
        this.validateConsoleStream(stream as any, prefix, errors, warnings);
        break;
      case 'network':
        this.validateNetworkStream(stream as any, prefix, errors, warnings);
        break;
    }
  }

  /**
   * Validate file stream configuration
   */
  private validateFileStream(stream: any, prefix: string, errors: string[], warnings: string[]): void {
    if (!stream.filePath || typeof stream.filePath !== 'string') {
      errors.push(`${prefix}: File path is required and must be a string`);
    }

    if (stream.maxFileSize && typeof stream.maxFileSize !== 'string') {
      errors.push(`${prefix}: Max file size must be a string`);
    }

    if (stream.rotationInterval && typeof stream.rotationInterval !== 'string') {
      errors.push(`${prefix}: Rotation interval must be a string`);
    }
  }

  /**
   * Validate console stream configuration
   */
  private validateConsoleStream(stream: any, prefix: string, errors: string[], warnings: string[]): void {
    // Console streams have minimal validation requirements
    if (stream.prettyPrint !== undefined && typeof stream.prettyPrint !== 'boolean') {
      warnings.push(`${prefix}: Pretty print should be a boolean`);
    }
  }

  /**
   * Validate network stream configuration
   */
  private validateNetworkStream(stream: any, prefix: string, errors: string[], warnings: string[]): void {
    if (!stream.endpoint || typeof stream.endpoint !== 'string') {
      errors.push(`${prefix}: Endpoint is required and must be a string`);
    }

    if (stream.timeout && (typeof stream.timeout !== 'number' || stream.timeout <= 0)) {
      errors.push(`${prefix}: Timeout must be a positive number`);
    }

    if (stream.maxRetries && (typeof stream.maxRetries !== 'number' || stream.maxRetries < 0)) {
      errors.push(`${prefix}: Max retries must be a non-negative number`);
    }
  }

  /**
   * Validate object recursively
   */
  private validateObject(obj: any, prefix: string, errors: string[], warnings: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively validate nested objects
        this.validateObject(value, fullKey, errors, warnings);
      } else {
        // Validate primitive values
        this.validateValue(fullKey, value, errors, warnings);
      }
    }
  }

  /**
   * Validate a single value
   */
  private validateValue(key: string, value: any, errors: string[], warnings: string[]): void {
    const rules = this.rules.get(key);
    if (!rules) return; // No rules for this key

    for (const rule of rules) {
      if (!rule.validate(value)) {
        const message = rule.errorMessage(value);
        if (rule.severity === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }
  }

  /**
   * Validate logical constraints between different configuration values
   */
  private validateLogicalConstraints(config: LogConfig, errors: string[], warnings: string[]): void {
    // If file rotation is disabled, rotation-related settings should not be used
    if (!config.enableFileRotation) {
      if (config.maxFileSize) {
        warnings.push('Max file size is specified but file rotation is disabled');
      }
      if (config.rotationInterval) {
        warnings.push('Rotation interval is specified but file rotation is disabled');
      }
    }

    // Check if log directory is writable in production
    if (config.level !== 'silent' && config.logDirectory) {
      // Note: We can't actually check filesystem permissions here,
      // but we can warn about common issues
      if (config.logDirectory.startsWith('/root/') || config.logDirectory.startsWith('/usr/')) {
        warnings.push(`Log directory (${config.logDirectory}) may require root permissions to write to`);
      }
    }

    // Performance optimizations warnings
    if (config.performance) {
      const { bufferSize, flushInterval } = config.performance;
      
      if (bufferSize && flushInterval && bufferSize > flushInterval * 1024) {
        warnings.push('Buffer size is much larger than flush interval, consider reducing buffer size for more responsive logging');
      }
    }

    // Request tracking compatibility
    if (config.requestTracking) {
      if (config.requestTracking.includeDetails && !config.requestTracking.enabled) {
        warnings.push('Request tracking details are enabled but request tracking is disabled');
      }
    }
  }

  /**
   * Get the lowest log level from streams array
   */
  private getLowestStreamLevel(streams: AnyStreamConfig[]): string {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];
    const levelValues = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60, silent: Infinity };

    let lowestLevel = 'fatal';
    let lowestValue = levelValues.fatal;

    for (const stream of streams) {
      const streamValue = levelValues[stream.level as keyof typeof levelValues];
      if (streamValue < lowestValue) {
        lowestValue = streamValue;
        lowestLevel = stream.level;
      }
    }

    return lowestLevel;
  }

  /**
   * Compare two log levels
   * Returns negative if level1 < level2, positive if level1 > level2, 0 if equal
   */
  private compareLogLevels(level1: string, level2: string): number {
    const levelValues = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60, silent: Infinity };
    return levelValues[level1 as keyof typeof levelValues] - levelValues[level2 as keyof typeof levelValues];
  }

  /**
   * Validate and fix common configuration issues
   */
  public validateAndFix(config: LogConfig): { config: LogConfig; result: ConfigValidationResult } {
    const result = this.validateLogConfig(config);
    const fixedConfig = { ...config };

    // Apply automatic fixes for common issues
    if (result.errors.length > 0) {
      // Fix log level if invalid
      if (fixedConfig.level && !['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].includes(fixedConfig.level)) {
        fixedConfig.level = 'info';
      }

      // Fix retention days if invalid
      if (fixedConfig.retentionDays !== undefined && (typeof fixedConfig.retentionDays !== 'number' || fixedConfig.retentionDays < 1)) {
        fixedConfig.retentionDays = 7;
      }

      // Fix log directory if invalid
      if (fixedConfig.logDirectory && (typeof fixedConfig.logDirectory !== 'string' || fixedConfig.logDirectory.trim().length === 0)) {
        fixedConfig.logDirectory = './logs';
      }
    }

    return {
      config: fixedConfig,
      result
    };
  }
}