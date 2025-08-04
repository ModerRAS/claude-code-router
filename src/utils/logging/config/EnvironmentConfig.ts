/**
 * Environment Configuration
 * 
 * Handles environment-specific configuration and detection.
 */

import os from 'os';
import path from 'path';

import type { LogConfig } from '../types/log-config';

/**
 * Environment enumeration
 */
export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Platform enumeration
 */
export enum Platform {
  LINUX = 'linux',
  DARWIN = 'darwin',
  WIN32 = 'win32'
}

/**
 * Environment detection utilities
 */
export class EnvironmentUtils {
  /**
   * Detect current environment
   */
  static detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const npmConfig = process.env.npm_lifecycle_event?.toLowerCase();

    // Check various indicators
    if (nodeEnv === 'production' || npmConfig?.includes('publish')) {
      return Environment.PRODUCTION;
    }
    
    if (nodeEnv === 'test' || npmConfig?.includes('test')) {
      return Environment.TEST;
    }

    return Environment.DEVELOPMENT;
  }

  /**
   * Detect current platform
   */
  static detectPlatform(): Platform {
    const platform = os.platform();
    switch (platform) {
      case 'linux':
        return Platform.LINUX;
      case 'darwin':
        return Platform.DARWIN;
      case 'win32':
        return Platform.WIN32;
      default:
        return Platform.LINUX; // Default to Linux
    }
  }

  /**
   * Check if running in container
   */
  static isContainer(): boolean {
    return (
      process.env.DOCKERIZED === 'true' ||
      process.env.CONTAINER === 'true' ||
      fs.existsSync('/.dockerenv') ||
      fs.existsSync('/.dockerinit')
    );
  }

  /**
   * Check if running in CI/CD environment
   */
  static isCI(): boolean {
    const ciIndicators = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'GITHUB_ACTIONS',
      'GITLAB_CI',
      'JENKINS_URL',
      'TRAVIS',
      'CIRCLECI',
      'APPVEYOR',
      'BUILDKITE',
      'AZURE_PIPELINES'
    ];

    return ciIndicators.some(indicator => process.env[indicator] !== undefined);
  }

  /**
   * Get home directory
   */
  static getHomeDirectory(): string {
    return os.homedir();
  }

  /**
   * Get default log directory for current environment
   */
  static getDefaultLogDirectory(): string {
    const platform = this.detectPlatform();
    const homeDir = this.getHomeDirectory();
    const isContainer = this.isContainer();
    const environment = this.detectEnvironment();

    // Container environments often use different paths
    if (isContainer) {
      return '/var/log/claude-code-router';
    }

    // Platform-specific paths
    switch (platform) {
      case Platform.DARWIN:
        return path.join(homeDir, 'Library', 'Logs', 'claude-code-router');
      case Platform.WIN32:
        return path.join(homeDir, 'AppData', 'Local', 'claude-code-router', 'logs');
      case Platform.LINUX:
      default:
        return path.join(homeDir, '.claude-code-router', 'logs');
    }
  }

  /**
   * Get default configuration file path
   */
  static getDefaultConfigFilePath(): string {
    const homeDir = this.getHomeDirectory();
    return path.join(homeDir, '.claude-code-router', 'config.json');
  }

  /**
   * Get temporary directory
   */
  static getTempDirectory(): string {
    return os.tmpdir();
  }
}

/**
 * Environment-specific configuration factory
 */
export class EnvironmentConfig {
  /**
   * Create environment-specific configuration
   */
  static createConfig(environment: Environment): Partial<LogConfig> {
    switch (environment) {
      case Environment.DEVELOPMENT:
        return this.getDevelopmentConfig();
      case Environment.PRODUCTION:
        return this.getProductionConfig();
      case Environment.TEST:
        return this.getTestConfig();
      default:
        return this.getDevelopmentConfig();
    }
  }

  /**
   * Development environment configuration
   */
  private static getDevelopmentConfig(): Partial<LogConfig> {
    return {
      level: 'debug',
      enableFileRotation: true,
      retentionDays: 3,
      logDirectory: EnvironmentUtils.getDefaultLogDirectory(),
      enableBackwardCompatibility: true,
      maxFileSize: '50M',
      rotationInterval: '1h',
      compressLogs: false,
      consoleOutput: true,
      requestTracking: {
        enabled: true,
        includeDetails: true
      },
      performance: {
        bufferSize: 2048,
        flushInterval: 1000,
        maxSessionAge: 1800000 // 30 minutes
      }
    };
  }

  /**
   * Production environment configuration
   */
  private static getProductionConfig(): Partial<LogConfig> {
    return {
      level: 'info',
      enableFileRotation: true,
      retentionDays: 30,
      logDirectory: EnvironmentUtils.getDefaultLogDirectory(),
      enableBackwardCompatibility: false,
      maxFileSize: '100M',
      rotationInterval: '1d',
      compressLogs: true,
      consoleOutput: false,
      requestTracking: {
        enabled: true,
        includeDetails: true
      },
      performance: {
        bufferSize: 8192,
        flushInterval: 5000,
        maxSessionAge: 7200000 // 2 hours
      }
    };
  }

  /**
   * Test environment configuration
   */
  private static getTestConfig(): Partial<LogConfig> {
    return {
      level: 'silent',
      enableFileRotation: false,
      retentionDays: 1,
      logDirectory: path.join(EnvironmentUtils.getTempDirectory(), 'claude-code-router-test-logs'),
      enableBackwardCompatibility: false,
      maxFileSize: '10M',
      rotationInterval: '1h',
      compressLogs: false,
      consoleOutput: true,
      requestTracking: {
        enabled: false,
        includeDetails: false
      },
      performance: {
        bufferSize: 512,
        flushInterval: 100,
        maxSessionAge: 60000 // 1 minute
      }
    };
  }

  /**
   * Create optimized configuration for specific platform
   */
  static createPlatformOptimizedConfig(environment: Environment): Partial<LogConfig> {
    const platform = EnvironmentUtils.detectPlatform();
    const baseConfig = this.createConfig(environment);

    const platformOptimizations: Partial<Record<Platform, Partial<LogConfig>>> = {
      [Platform.LINUX]: {
        // Linux optimizations
        performance: {
          bufferSize: platform === Platform.LINUX ? 8192 : 4096,
          flushInterval: platform === Platform.LINUX ? 5000 : 1000
        }
      },
      [Platform.DARWIN]: {
        // macOS optimizations
        performance: {
          bufferSize: 4096,
          flushInterval: 1000
        }
      },
      [Platform.WIN32]: {
        // Windows optimizations
        performance: {
          bufferSize: 2048,
          flushInterval: 2000
        }
      }
    };

    return {
      ...baseConfig,
      ...platformOptimizations[platform]
    };
  }

  /**
   * Create container-optimized configuration
   */
  static createContainerOptimizedConfig(environment: Environment): Partial<LogConfig> {
    const baseConfig = this.createConfig(environment);

    return {
      ...baseConfig,
      logDirectory: '/var/log/claude-code-router',
      performance: {
        bufferSize: 16384, // Larger buffer for container environments
        flushInterval: 10000,
        maxSessionAge: 3600000 // 1 hour
      }
    };
  }

  /**
   * Create CI/CD optimized configuration
   */
  static createCIOptimizedConfig(environment: Environment): Partial<LogConfig> {
    const baseConfig = this.createConfig(environment);

    return {
      ...baseConfig,
      level: 'info',
      consoleOutput: true,
      enableFileRotation: true,
      retentionDays: 7,
      performance: {
        bufferSize: 4096,
        flushInterval: 2000,
        maxSessionAge: 1800000 // 30 minutes
      }
    };
  }
}

// Import fs for container detection (moved to bottom to avoid circular dependency)
import { promises as fs } from 'fs';