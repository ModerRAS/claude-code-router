import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogManager } from '../LogManager';
import { createLogManager } from '../factory';
import { initializeGlobalLogIntegration } from '../integration/integration-factory';
import { LogConfig, StreamEntry, LogLevel } from '../types/log-config';
import { Ok, Err } from '../types/common';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Complete Logging System Integration Tests', () => {
  let logManager: LogManager | null = null;
  let testLogDir: string;
  let testLogFile: string;

  beforeEach(() => {
    // Create test directory
    testLogDir = join(__dirname, '..', '..', '..', 'test-logs');
    testLogFile = join(testLogDir, 'test.log');
    
    if (!existsSync(testLogDir)) {
      mkdirSync(testLogDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup
    if (logManager) {
      logManager.cleanup();
      logManager = null;
    }

    if (existsSync(testLogFile)) {
      rmSync(testLogFile);
    }
  });

  describe('End-to-End Logging Flow', () => {
    it('should handle complete logging lifecycle', async () => {
      // 1. Create log manager with comprehensive config
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'test-integration',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'test-console',
            type: 'console',
            level: 'info',
          },
          {
            name: 'test-file',
            type: 'file',
            level: 'debug',
            path: testLogFile,
          },
        ],
      };

      logManager = new LogManager(config);
      const initResult = await logManager.initialize();
      expect(initResult.isOk()).toBe(true);

      // 2. Get logger and verify basic functionality
      const logger = logManager.getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.error).toBe('function');

      // 3. Test logging at different levels
      logger.info('Test info message');
      logger.debug('Test debug message');
      logger.error('Test error message');

      // 4. Test request lifecycle tracking
      const requestId = 'test-request-123';
      const requestLogger = logManager.createRequestLogger(requestId);
      
      requestLogger.info('Request started');
      requestLogger.debug('Request processing');
      requestLogger.error('Request warning');
      requestLogger.info('Request completed');

      // 5. Test error logging with context
      const testError = new Error('Test integration error');
      logManager.logError(testError, {
        requestId,
        userId: 'test-user',
        operation: 'integration-test',
      });

      // 6. Verify log file was created and contains content
      expect(existsSync(testLogFile)).toBe(true);
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('test-integration');
      expect(logContent).toContain('Test info message');
      expect(logContent).toContain('Test debug message');

      // 7. Test health check
      const health = logManager.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.initialized).toBe(true);
      expect(health.config.serviceName).toBe('test-integration');

      // 8. Test configuration updates
      const updateResult = await logManager.updateConfig({
        level: 'error',
      });
      expect(updateResult.isOk()).toBe(true);

      const updatedLogger = logManager.getLogger();
      expect(updatedLogger.level).toBe('error');

      // 9. Cleanup
      await logManager.cleanup();
      expect(logManager.isInitialized()).toBe(false);
    });

    it('should handle multiple concurrent requests', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'concurrent-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'concurrent-console',
            type: 'console',
            level: 'debug',
          },
          {
            name: 'concurrent-file',
            type: 'file',
            level: 'debug',
            path: testLogFile,
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      // Simulate multiple concurrent requests
      const requestIds = Array.from({ length: 10 }, (_, i) => `concurrent-request-${i}`);
      const promises = requestIds.map(async (requestId) => {
        const requestLogger = logManager!.createRequestLogger(requestId);
        
        // Simulate request lifecycle
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        requestLogger.info(`Request ${requestId} started`);
        requestLogger.debug(`Request ${requestId} processing`);
        
        if (Math.random() > 0.8) {
          // Simulate error in some requests
          requestLogger.error(`Request ${requestId} warning`);
        }
        
        requestLogger.info(`Request ${requestId} completed`);
        
        return requestId;
      });

      // Wait for all requests to complete
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // Verify all requests were logged
      const logContent = readFileSync(testLogFile, 'utf8');
      requestIds.forEach(requestId => {
        expect(logContent).toContain(requestId);
      });
    });

    it('should handle stream rotation and large volumes', async () => {
      const largeLogConfig: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'volume-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'volume-file',
            type: 'file',
            level: 'debug',
            path: testLogFile,
          },
        ],
      };

      logManager = new LogManager(largeLogConfig);
      await logManager.initialize();

      const logger = logManager.getLogger();
      const messageCount = 1000;
      const startTime = Date.now();

      // Log many messages
      for (let i = 0; i < messageCount; i++) {
        logger.info(`Test message ${i} with some additional content to simulate real logging data`);
        
        if (i % 100 === 0) {
          logger.warn(`Warning message ${i}`);
        }
        
        if (i % 500 === 0) {
          logger.error(`Error message ${i}`);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance should be reasonable (less than 1 second for 1000 messages)
      expect(duration).toBeLessThan(1000);

      // Verify all messages were logged
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('Test message 0');
      expect(logContent).toContain(`Test message ${messageCount - 1}`);
      expect(logContent).toContain('Warning message 100');
      expect(logContent).toContain('Error message 500');

      console.log(`Logged ${messageCount} messages in ${duration}ms (${(messageCount / duration * 1000).toFixed(2)} messages/sec)`);
    });
  });

  describe('Factory Functions Integration', () => {
    it('should create log manager using factory functions', async () => {
      // Test default factory
      logManager = createLogManager();
      const initResult = await logManager.initialize();
      expect(initResult.isOk()).toBe(true);

      const logger = logManager.getLogger();
      logger.info('Factory created logger works');

      // Cleanup
      await logManager.cleanup();
    });

    it('should create environment-specific log managers', async () => {
      // Test development environment
      const devLogManager = createLogManager({
        level: 'debug',
        streams: [
          {
            name: 'dev-console',
            type: 'console',
            level: 'debug',
          },
        ],
      });

      const devInitResult = await devLogManager.initialize();
      expect(devInitResult.isOk()).toBe(true);

      const devLogger = devLogManager.getLogger();
      devLogger.debug('Development environment debug message');

      // Test production environment
      const prodLogManager = createLogManager({
        level: 'warn',
        streams: [
          {
            name: 'prod-file',
            type: 'file',
            level: 'error',
            path: testLogFile,
          },
        ],
      });

      const prodInitResult = await prodLogManager.initialize();
      expect(prodInitResult.isOk()).toBe(true);

      const prodLogger = prodLogManager.getLogger();
      prodLogger.error('Production environment error message');

      // Cleanup
      await devLogManager.cleanup();
      await prodLogManager.cleanup();
    });

    it('should handle factory function errors gracefully', async () => {
      // Test with invalid configuration
      const invalidConfig: LogConfig = {
        level: 'invalid' as LogLevel,
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [],
      };

      expect(() => {
        createLogManager(invalidConfig);
      }).toThrow();
    });
  });

  describe('Global Integration Integration', () => {
    it('should initialize global log integration', async () => {
      const integrationResult = await initializeGlobalLogIntegration({
        enableNewLogging: true,
        logDirectory: testLogDir,
        logLevel: 'debug',
      });

      expect(integrationResult.isOk()).toBe(true);

      // Test global log functions
      const { log, logError, getRequestLogger } = await import('../integration/integration-factory');

      // These should not throw
      await log('Global integration test message');
      await logError('Global integration test error');
      
      const requestLogger = await getRequestLogger('global-test-request');
      await requestLogger.log('Global request logger test');

      // Cleanup
      const { destroyGlobalLogIntegration } = await import('../integration/integration-factory');
      await destroyGlobalLogIntegration();
    });

    it('should handle global integration fallbacks', async () => {
      // Test with disabled enhanced logging
      const integrationResult = await initializeGlobalLogIntegration({
        enableNewLogging: false,
      });

      expect(integrationResult.isOk()).toBe(true);

      // Should still work without enhanced logging
      const { log, logError, getRequestLogger } = await import('../integration/integration-factory');

      await log('Fallback test message');
      await logError('Fallback test error');
      
      const requestLogger = await getRequestLogger('fallback-test-request');
      await requestLogger.log('Fallback request logger test');

      // Cleanup
      const { destroyGlobalLogIntegration } = await import('../integration/integration-factory');
      await destroyGlobalLogIntegration();
    });
  });

  describe('Error Scenarios Integration', () => {
    it('should handle logging system failures gracefully', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'error-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'error-test-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const logger = logManager.getLogger();

      // Test logging various error types
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new SyntaxError('Syntax error'),
        new RangeError('Range error'),
        new ReferenceError('Reference error'),
        new URIError('URI error'),
        new EvalError('Eval error'),
      ];

      for (const error of errors) {
        expect(() => {
          logger.error(`Logging ${error.name}: ${error.message}`, { error });
          logManager?.logError(error, { errorType: error.name });
        }).not.toThrow();
      }

      // Test logging with circular references
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      expect(() => {
        logger.info('Circular reference test', { circularObject });
      }).not.toThrow();

      // Test logging with very large objects
      const largeObject = { data: 'x'.repeat(1000000) };
      expect(() => {
        logger.info('Large object test', { largeObject });
      }).not.toThrow();

      await logManager.cleanup();
    });

    it('should handle file system errors', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'fs-error-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'invalid-path-file',
            type: 'file',
            level: 'debug',
            path: '/invalid/path/that/does/not/exist/test.log',
          },
          {
            name: 'fallback-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(config);
      
      // Should still initialize even with invalid file path
      const initResult = await logManager.initialize();
      expect(initResult.isOk()).toBe(true);

      const logger = logManager.getLogger();
      
      // Should still be able to log to console
      expect(() => {
        logger.info('Message should still work despite file system error');
      }).not.toThrow();

      await logManager.cleanup();
    });
  });

  describe('Configuration Integration', () => {
    it('should handle dynamic configuration changes', async () => {
      const initialConfig: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'dynamic-config-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'dynamic-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(initialConfig);
      await logManager.initialize();

      const logger = logManager.getLogger();

      // Log with initial configuration
      logger.info('Message with initial config');

      // Update configuration
      const updateResult = await logManager.updateConfig({
        level: 'debug',
        streams: [
          {
            name: 'updated-console',
            type: 'console',
            level: 'debug',
          },
          {
            name: 'updated-file',
            type: 'file',
            level: 'error',
            path: testLogFile,
          },
        ],
      });

      expect(updateResult.isOk()).toBe(true);

      const updatedLogger = logManager.getLogger();
      expect(updatedLogger.level).toBe('debug');

      // Log with updated configuration
      updatedLogger.debug('Message with updated config');
      updatedLogger.error('Error with updated config');

      // Verify file stream works
      expect(existsSync(testLogFile)).toBe(true);
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('Error with updated config');

      await logManager.cleanup();
    });

    it('should handle invalid configuration updates', async () => {
      const initialConfig: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'invalid-config-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'initial-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(initialConfig);
      await logManager.initialize();

      // Try to update with invalid configuration
      const invalidUpdateResult = await logManager.updateConfig({
        level: 'invalid' as LogLevel,
      });

      expect(invalidUpdateResult.isErr()).toBe(true);

      // Original configuration should remain intact
      const logger = logManager.getLogger();
      expect(logger.level).toBe('info');

      await logManager.cleanup();
    });
  });
});