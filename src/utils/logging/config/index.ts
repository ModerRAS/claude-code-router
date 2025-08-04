/**
 * Configuration Module Index
 * 
 * Re-exports all configuration-related components.
 */

// Configuration types (re-export from types)
export * from '../types/log-config';
export * from '../types/stream-entry';

// Configuration manager (will be implemented)
export { LogConfigManager } from './LogConfigManager';
export { EnvironmentConfig } from './EnvironmentConfig';

// Configuration validation
export { ConfigValidator } from './ConfigValidator';

// Enhanced configuration loading
export {
  EnhancedConfigLoader,
  type EnhancedLoggingConfig,
  type LoggingPresets,
  type CompleteConfigFile,
  createConfigLoader,
  createDefaultConfigLoader,
  discoverConfigLoader,
} from './EnhancedConfigLoader';

// Configuration file integration
export {
  ConfigFileIntegration,
  ConfigPriority,
  type ConfigSource,
  type ConfigIntegrationResult,
} from './ConfigFileIntegration';

// Default configurations
export { DEFAULT_LOG_CONFIG, ENVIRONMENT_CONFIGS } from '../types/log-config';
export { DEFAULT_STREAM_CONFIGS } from '../types/stream-entry';