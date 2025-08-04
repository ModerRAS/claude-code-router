import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogConfigManager } from './LogConfigManager';
import { LogConfig, StreamEntry, LogLevel } from '../types/log-config';
import { Ok, Err } from '../types/common';

describe('LogConfigManager', () => {
  let configManager: LogConfigManager;

  beforeEach(() => {
    configManager = new LogConfigManager();
  });

  afterEach(() => {
    configManager.cleanup();
  });

  describe('Configuration Management', () => {
    it('should load default configuration on initialization', async () => {
      await configManager.initialize();
      const config = configManager.getConfig();

      // In test environment, level should be 'silent'
      expect(config.level).toBe('silent');
      expect(config.timestamp).toBe(true);
      expect(config.serviceName).toBe('claude-code-router');
      expect(config.version).toBe('1.0.0');
      expect(config.environment).toBeDefined();
      expect(Array.isArray(config.streams)).toBe(true);
    });

    it('should load custom configuration', async () => {
      const customConfig: LogConfig = {
        level: 'debug',
        timestamp: false,
        serviceName: 'test-service',
        version: '2.0.0',
        environment: 'test',
        streams: [
          {
            name: 'test-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      configManager = new LogConfigManager(customConfig);
      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.level).toBe('debug');
      expect(config.timestamp).toBe(false);
      expect(config.serviceName).toBe('test-service');
      expect(config.version).toBe('2.0.0');
      expect(config.environment).toBe('test');
      expect(config.streams).toHaveLength(1);
      expect(config.streams[0].name).toBe('test-console');
    });

    it('should update configuration dynamically', async () => {
      await configManager.initialize();
      
      const newConfig: Partial<LogConfig> = {
        level: 'error',
        timestamp: false,
        serviceName: 'updated-service',
      };

      const result = await configManager.updateConfig(newConfig);
      expect(result.isOk()).toBe(true);

      const config = configManager.getConfig();
      expect(config.level).toBe('error');
      expect(config.timestamp).toBe(false);
      expect(config.serviceName).toBe('updated-service');
      // Unchanged properties should remain
      expect(config.version).toBe('1.0.0');
    });

    it('should validate configuration on update', async () => {
      await configManager.initialize();

      // Invalid stream configuration
      const invalidConfig: Partial<LogConfig> = {
        streams: [
          {
            name: '',
            type: 'invalid' as any,
            level: 'info',
          } as StreamEntry,
        ],
      };

      const result = await configManager.updateConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Configuration update failed');
    });
  });

  describe('Stream Management', () => {
    beforeEach(() => {
      configManager = new LogConfigManager();
    });
    
    it('should add stream successfully', async () => {
      await configManager.initialize();
      
      const newStream: StreamEntry = {
        name: 'test-file',
        type: 'file',
        level: 'error',
        path: './test.log',
      };

      const result = configManager.addStream(newStream);
      expect(result.isOk()).toBe(true);

      const config = configManager.getConfig();
      expect(config.streams.some(s => s.name === 'test-file')).toBe(true);
    });

    it('should remove stream successfully', async () => {
      await configManager.initialize();
      
      const result = configManager.removeStream('default-console');
      expect(result.isOk()).toBe(true);

      const config = configManager.getConfig();
      expect(config.streams.some(s => s.name === 'default-console')).toBe(false);
    });

    it('should update existing stream', async () => {
      const configManager = new LogConfigManager();
      await configManager.initialize();
      
      const updatedStream: Partial<StreamEntry> = {
        level: 'debug',
      };

      const result = configManager.updateStream('default-console', updatedStream);
      expect(result.isOk()).toBe(true);

      const config = configManager.getConfig();
      const consoleStream = config.streams.find(s => s.name === 'default-console');
      expect(consoleStream?.level).toBe('debug');
    });

    it('should fail to update non-existent stream', async () => {
      await configManager.initialize();
      
      const result = configManager.updateStream('non-existent', { level: 'debug' });
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('not found');
    });

    it('should get stream by name', async () => {
      const configManager = new LogConfigManager();
      await configManager.initialize();
      
      const stream = configManager.getStream('default-console');
      expect(stream).toBeDefined();
      expect(stream?.name).toBe('default-console');
    });

    it('should return undefined for non-existent stream', async () => {
      await configManager.initialize();
      
      const stream = configManager.getStream('non-existent');
      expect(stream).toBeUndefined();
    });
  });

  describe('Environment Configuration', () => {
    beforeEach(() => {
      // Store original environment variables
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_SERVICE_NAME = 'env-test-service';
      process.env.LOG_TIMESTAMP = 'false';
    });

    afterEach(() => {
      // Restore environment variables
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_SERVICE_NAME;
      delete process.env.LOG_TIMESTAMP;
    });

    it('should load configuration from environment', async () => {
      configManager = new LogConfigManager();
      await configManager.initialize();
      
      const config = configManager.getConfig();
      expect(config.level).toBe('debug');
      expect(config.serviceName).toBe('env-test-service');
      expect(config.timestamp).toBe(false);
    });

    it('should prioritize environment variables over defaults', async () => {
      const customConfig: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'custom-service',
        version: '1.0.0',
        environment: 'development',
        streams: [],
      };

      configManager = new LogConfigManager(customConfig);
      await configManager.initialize();
      
      // Environment variables should override custom config
      const config = configManager.getConfig();
      expect(config.level).toBe('debug'); // From env
      expect(config.serviceName).toBe('env-test-service'); // From env
      expect(config.timestamp).toBe(false); // From env
      expect(config.version).toBe('1.0.0'); // From custom config
    });
  });

  describe('Validation', () => {
    it('should validate log levels', async () => {
      const validLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];
      
      for (const level of validLevels) {
        const config: LogConfig = {
          level,
          timestamp: true,
          serviceName: 'test',
          version: '1.0.0',
          environment: 'test',
          streams: [],
        };

        configManager = new LogConfigManager(config);
        const result = await configManager.initialize();
        expect(result.isOk()).toBe(true);
      }
    });

    it('should reject invalid log levels', async () => {
      const config: LogConfig = {
        level: 'invalid' as LogLevel,
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [],
      };

      configManager = new LogConfigManager(config);
      const result = await configManager.initialize();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('level');
    });

    it('should validate stream configurations', async () => {
      const validStreams: StreamEntry[] = [
        { name: 'console', type: 'console', level: 'info' },
        { name: 'file', type: 'file', level: 'error', path: './test.log' },
      ];

      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: validStreams,
      };

      configManager = new LogConfigManager(config);
      const result = await configManager.initialize();
      expect(result.isOk()).toBe(true);
    });

    it('should reject invalid stream types', async () => {
      const invalidStream: StreamEntry = {
        name: 'invalid',
        type: 'invalid' as any,
        level: 'info',
      };

      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [invalidStream],
      };

      configManager = new LogConfigManager(config);
      const result = await configManager.initialize();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('type');
    });

    it('should require file path for file streams', async () => {
      const invalidStream: StreamEntry = {
        name: 'file-no-path',
        type: 'file',
        level: 'error',
        // Missing path
      };

      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [invalidStream],
      };

      configManager = new LogConfigManager(config);
      const result = await configManager.initialize();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('path');
    });
  });

  describe('Events and Notifications', () => {
    it('should emit configuration change events', async () => {
      await configManager.initialize();
      
      const mockListener = vi.fn();
      configManager.onConfigChange(mockListener);

      const newConfig: Partial<LogConfig> = { level: 'debug' };
      await configManager.updateConfig(newConfig);

      expect(mockListener).toHaveBeenCalled();
      const callArg = mockListener.mock.calls[0][0];
      expect(callArg.level).toBe('debug');
    });

    it('should allow removing event listeners', async () => {
      await configManager.initialize();
      
      const mockListener = vi.fn();
      configManager.onConfigChange(mockListener);
      configManager.offConfigChange(mockListener);

      const newConfig: Partial<LogConfig> = { level: 'debug' };
      await configManager.updateConfig(newConfig);

      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should emit stream change events', async () => {
      await configManager.initialize();
      
      const mockListener = vi.fn();
      configManager.onStreamChange(mockListener);

      const newStream: StreamEntry = {
        name: 'test-stream',
        type: 'console',
        level: 'info',
      };

      configManager.addStream(newStream);

      expect(mockListener).toHaveBeenCalled();
      const callArg = mockListener.mock.calls[0][0];
      expect(Array.isArray(callArg)).toBe(true);
      expect(callArg.some((stream: any) => stream.name === 'test-stream')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', () => {
      // This would be tested with a mock that throws errors
      // For now, we test that the manager can be created
      expect(() => new LogConfigManager()).not.toThrow();
    });

    it('should handle configuration update errors', async () => {
      await configManager.initialize();
      
      // Mock a validation error
      const invalidConfig = { level: 'invalid' as LogLevel };
      const result = await configManager.updateConfig(invalidConfig);
      
      expect(result.isErr()).toBe(true);
      expect(typeof result.error?.message).toBe('string');
    });

    it('should maintain last known good configuration', async () => {
      await configManager.initialize();
      
      // Store original config
      const originalConfig = configManager.getConfig();
      
      // Attempt invalid update
      const invalidResult = await configManager.updateConfig({ level: 'invalid' as LogLevel });
      expect(invalidResult.isErr()).toBe(true);
      
      // Config should be unchanged
      const currentConfig = configManager.getConfig();
      expect(currentConfig.level).toBe(originalConfig.level);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      configManager = new LogConfigManager();
      expect(() => configManager.cleanup()).not.toThrow();
    });

    it('should allow reinitialization after cleanup', async () => {
      await configManager.initialize();
      configManager.cleanup();
      
      const result = await configManager.initialize();
      expect(result.isOk()).toBe(true);
    });
  });
});