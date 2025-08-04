/**
 * Log Configuration Manager
 * 
 * Handles loading, validation, and management of logging configuration.
 * Supports multiple configuration sources with proper priority handling.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { dotenv } from 'dotenv';
import json5 from 'json5';

import type {
  LogConfig,
  ConfigValidationResult,
  DEFAULT_LOG_CONFIG,
  ENVIRONMENT_CONFIGS
} from '../types/log-config';

import type { MultiStreamConfig, DEFAULT_STREAM_CONFIGS } from '../types/stream-entry';
import type { AsyncResult, Result, DeepPartial } from '../types/common';

/**
 * Configuration source enumeration
 */
export enum ConfigSource {
  DEFAULT = 'default',
  ENVIRONMENT = 'environment',
  CONFIG_FILE = 'config_file',
  ENVIRONMENT_VARIABLES = 'environment_variables'
}

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
  /** Path to the configuration file */
  configFilePath?: string;
  /** Environment to use (development, production, test) */
  environment?: string;
  /** Whether to load environment variables */
  loadEnvVars?: boolean;
  /** Whether to validate the configuration */
  validate?: boolean;
}

/**
 * Log Configuration Manager
 * 
 * Handles loading and merging configurations from multiple sources,
 * with proper validation and error handling.
 */
export class LogConfigManager {
  private config: LogConfig;
  private configSources: ConfigSource[];
  private loadOptions: ConfigLoadOptions;

  constructor(options: ConfigLoadOptions = {}) {
    this.loadOptions = {
      configFilePath: path.join(os.homedir(), '.claude-code-router', 'config.json'),
      environment: process.env.NODE_ENV || 'development',
      loadEnvVars: true,
      validate: true,
      ...options
    };

    this.configSources = [];
    this.config = this.loadConfiguration();
  }

  /**
   * Load configuration from all sources
   */
  private loadConfiguration(): LogConfig {
    const configs: DeepPartial<LogConfig>[] = [];

    // 1. Start with default configuration
    configs.push(DEFAULT_LOG_CONFIG);
    this.configSources.push(ConfigSource.DEFAULT);

    // 2. Apply environment-specific overrides
    const envConfig = ENVIRONMENT_CONFIGS[this.loadOptions.environment!];
    if (envConfig) {
      configs.push(envConfig);
      this.configSources.push(ConfigSource.ENVIRONMENT);
    }

    // 3. Load configuration file
    const fileConfig = this.loadConfigFile();
    if (fileConfig.success && fileConfig.value) {
      configs.push(fileConfig.value);
      this.configSources.push(ConfigSource.CONFIG_FILE);
    }

    // 4. Apply environment variable overrides
    if (this.loadOptions.loadEnvVars) {
      const envVarConfig = this.loadEnvironmentVariables();
      if (envVarConfig.success && envVarConfig.value) {
        configs.push(envVarConfig.value);
        this.configSources.push(ConfigSource.ENVIRONMENT_VARIABLES);
      }
    }

    // Merge all configurations
    const mergedConfig = this.mergeConfigurations(configs);

    // Validate if requested
    if (this.loadOptions.validate) {
      const validation = this.validateConfiguration(mergedConfig);
      if (!validation.isValid) {
        console.warn('Log configuration validation failed:', validation.errors);
        // Still proceed with warnings, but log them
        validation.warnings.forEach(warning => {
          console.warn('Configuration warning:', warning);
        });
      }
    }

    return mergedConfig as LogConfig;
  }

  /**
   * Load configuration from file
   */
  private loadConfigFile(): Result<DeepPartial<LogConfig>, Error> {
    try {
      const configContent = fs.readFileSync(this.loadOptions.configFilePath!, 'utf8');
      const parsedConfig = json5.parse(configContent);
      
      // Extract logging configuration if it exists
      const logConfig = parsedConfig.Logging || {};
      
      return {
        success: true,
        value: logConfig
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, that's okay
        return {
          success: true,
          value: {}
        };
      }
      
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadEnvironmentVariables(): Result<DeepPartial<LogConfig>, Error> {
    try {
      // Load .env file if it exists
      dotenv.config();

      const envConfig: DeepPartial<LogConfig> = {};

      // Map environment variables to configuration
      const envMappings: Record<string, keyof LogConfig> = {
        'LOG_LEVEL': 'level',
        'LOG_ENABLE_FILE_ROTATION': 'enableFileRotation',
        'LOG_RETENTION_DAYS': 'retentionDays',
        'LOG_DIRECTORY': 'logDirectory',
        'LOG_ENABLE_BACKWARD_COMPATIBILITY': 'enableBackwardCompatibility',
        'LOG_MAX_FILE_SIZE': 'maxFileSize',
        'LOG_ROTATION_INTERVAL': 'rotationInterval',
        'LOG_COMPRESS_LOGS': 'compressLogs',
        'LOG_CONSOLE_OUTPUT': 'consoleOutput'
      };

      // Apply environment variable mappings
      for (const [envVar, configKey] of Object.entries(envMappings)) {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
          envConfig[configKey] = this.parseEnvValue(envValue, configKey);
        }
      }

      // Handle nested request tracking configuration
      if (process.env.LOG_REQUEST_TRACKING_ENABLED !== undefined) {
        envConfig.requestTracking = {
          enabled: process.env.LOG_REQUEST_TRACKING_ENABLED === 'true',
          includeDetails: process.env.LOG_REQUEST_TRACKING_INCLUDE_DETAILS === 'true'
        };
      }

      return {
        success: true,
        value: envConfig
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Parse environment variable value based on configuration key
   */
  private parseEnvValue(value: string, key: keyof LogConfig): any {
    switch (key) {
      case 'level':
        return value.toLowerCase();
      case 'enableFileRotation':
      case 'enableBackwardCompatibility':
      case 'compressLogs':
      case 'consoleOutput':
        return value.toLowerCase() === 'true';
      case 'retentionDays':
        return parseInt(value, 10);
      case 'maxFileSize':
      case 'rotationInterval':
        return value;
      case 'logDirectory':
        return value;
      default:
        return value;
    }
  }

  /**
   * Merge multiple configurations with proper priority handling
   */
  private mergeConfigurations(configs: DeepPartial<LogConfig>[]): DeepPartial<LogConfig> {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as DeepPartial<LogConfig>);
  }

  /**
   * Deep merge two objects
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }

    return result;
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: DeepPartial<LogConfig>): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate log level
    if (config.level && !['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(config.level)) {
      errors.push(`Invalid log level: ${config.level}`);
    }

    // Validate retention days
    if (config.retentionDays !== undefined) {
      if (typeof config.retentionDays !== 'number' || config.retentionDays < 1) {
        errors.push('Retention days must be a positive number');
      }
    }

    // Validate log directory
    if (config.logDirectory && typeof config.logDirectory !== 'string') {
      errors.push('Log directory must be a string');
    }

    // Validate max file size format
    if (config.maxFileSize) {
      const sizeRegex = /^\d+[MG]?$/i;
      if (!sizeRegex.test(config.maxFileSize)) {
        warnings.push(`Max file size format may be invalid: ${config.maxFileSize}`);
      }
    }

    // Validate rotation interval format
    if (config.rotationInterval) {
      const intervalRegex = /^\d+[smhdw]?$/i;
      if (!intervalRegex.test(config.rotationInterval)) {
        warnings.push(`Rotation interval format may be invalid: ${config.rotationInterval}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get the current configuration
   */
  public getConfiguration(): LogConfig {
    return { ...this.config };
  }

  /**
   * Get the configuration sources that were loaded
   */
  public getConfigSources(): ConfigSource[] {
    return [...this.configSources];
  }

  /**
   * Reload configuration
   */
  public reload(): AsyncResult<void, Error> {
    try {
      this.config = this.loadConfiguration();
      return Promise.resolve({
        success: true,
        value: undefined
      });
    } catch (error) {
      return Promise.resolve({
        success: false,
        error: error as Error
      });
    }
  }

  /**
   * Update configuration with new values
   */
  public updateConfiguration(updates: DeepPartial<LogConfig>): void {
    this.config = this.deepMerge(this.config, updates);
    
    // Validate the updated configuration
    const validation = this.validateConfiguration(this.config);
    if (!validation.isValid) {
      throw new Error(`Configuration update failed: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Export configuration to file
   */
  public async exportToFile(filePath: string): Promise<Result<void, Error>> {
    try {
      const exportConfig = {
        Logging: this.config
      };

      await fs.writeFile(filePath, JSON.stringify(exportConfig, null, 2), 'utf8');
      
      return {
        success: true,
        value: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Get stream configuration
   */
  public getStreamConfig(): MultiStreamConfig {
    const logConfig = this.getConfiguration();
    
    // Convert log config to stream config
    return {
      streams: [
        {
          type: 'file' as const,
          level: logConfig.level === 'error' ? 'error' : logConfig.level,
          filePath: path.join(logConfig.logDirectory, 'info.log'),
          enableRotation: logConfig.enableFileRotation,
          maxFileSize: logConfig.maxFileSize,
          rotationInterval: logConfig.rotationInterval,
          compress: logConfig.compressLogs,
          mkdir: true
        },
        {
          type: 'file' as const,
          level: 'error',
          filePath: path.join(logConfig.logDirectory, 'error.log'),
          enableRotation: logConfig.enableFileRotation,
          maxFileSize: logConfig.maxFileSize,
          rotationInterval: logConfig.rotationInterval,
          compress: logConfig.compressLogs,
          mkdir: true
        }
      ],
      loggerLevel: logConfig.level,
      dedupe: false
    };
  }

  /**
   * Check if a specific configuration source was loaded
   */
  public hasConfigSource(source: ConfigSource): boolean {
    return this.configSources.includes(source);
  }

  /**
   * Get configuration value by key
   */
  public getConfigValue<K extends keyof LogConfig>(key: K): LogConfig[K] {
    return this.config[key];
  }
}