import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogManager } from './LogManager';
import { LogConfig, StreamEntry, LogLevel } from './types/log-config';
import { Ok, Err } from './types/common';

// Mock pino
vi.mock('pino', async () => {
  const actual = await vi.importActual('pino');
  const mockLogger = {
    level: 'info',
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(() => ({
      level: 'info',
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
    })),
    isLevelEnabled: vi.fn(() => true),
  };
  
  const mockPino = vi.fn(() => mockLogger);
  
  // 添加multistream作为pino函数的静态属性
  mockPino.multistream = vi.fn(() => [
    {
      level: 'info',
      stream: {
        write: vi.fn(),
      },
    },
  ]);
  
  return {
    ...actual,
    default: mockPino,
    multistream: mockPino.multistream,
    stdTimeFunctions: {
      isoTime: vi.fn(() => new Date().toISOString()),
    },
  };
});

describe('LogManager', () => {
  let logManager: LogManager;
  let mockConsole: { log: jest.Mock, error: jest.Mock };

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    };
    global.console = mockConsole as any;
  });

  afterEach(() => {
    if (logManager) {
      logManager.cleanup();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      logManager = new LogManager();
      const result = await logManager.initialize();
      
      // 添加调试信息
      if (result.isErr()) {
        console.error('Initialization error:', result.error);
      }

      expect(result.isOk()).toBe(true);
      expect(logManager.isInitialized()).toBe(true);
      expect(logManager.getLogger()).toBeDefined();
    });

    it('should initialize with custom configuration', async () => {
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

      logManager = new LogManager(customConfig);
      const result = await logManager.initialize();

      expect(result.isOk()).toBe(true);
      expect(logManager.isInitialized()).toBe(true);
      expect(logManager.getLogger()).toBeDefined();
    });

    it('should fail to initialize if already initialized', async () => {
      logManager = new LogManager();
      await logManager.initialize();

      const result = await logManager.initialize();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('already initialized');
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock a configuration that would cause errors
      const invalidConfig: LogConfig = {
        level: 'invalid' as LogLevel,
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [],
      };

      logManager = new LogManager(invalidConfig);
      const result = await logManager.initialize();

      expect(result.isErr()).toBe(true);
    });
  });

  describe('Logger Creation', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should return a valid logger instance', () => {
      const logger = logManager.getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.trace).toBe('function');
    });

    it('should create child logger with bindings', () => {
      const parentLogger = logManager.getLogger();
      const childLogger = parentLogger.child({ requestId: 'test-123' });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should check if level is enabled', () => {
      const logger = logManager.getLogger();
      const isEnabled = logger.isLevelEnabled('info');

      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('Request Logger Creation', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should create request logger with valid ID', () => {
      const requestId = 'test-request-123';
      const requestLogger = logManager.createRequestLogger(requestId);

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
      expect(typeof requestLogger.debug).toBe('function');
      expect(typeof requestLogger.warn).toBe('function');
      expect(typeof requestLogger.error).toBe('function');
      expect(typeof requestLogger.fatal).toBe('function');
      expect(typeof requestLogger.trace).toBe('function');
    });

    it('should handle invalid request IDs', () => {
      const invalidIds = ['', null, undefined, 123 as any];
      
      for (const invalidId of invalidIds) {
        expect(() => {
          logManager.createRequestLogger(invalidId);
        }).not.toThrow();
      }
    });

    it('should create unique loggers for different requests', () => {
      const logger1 = logManager.createRequestLogger('request-1');
      const logger2 = logManager.createRequestLogger('request-2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('Request Tracking', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should track request start', () => {
      const requestId = 'test-123';
      const method = 'GET';
      const url = '/api/test';
      const headers = { 'user-agent': 'test' };

      expect(() => {
        logManager.logRequestStart(requestId, method, url, headers);
      }).not.toThrow();
    });

    it('should track request end', () => {
      const requestId = 'test-123';
      const statusCode = 200;
      const duration = 150;
      const responseSize = 1024;

      expect(() => {
        logManager.logRequestEnd(requestId, statusCode, duration, responseSize);
      }).not.toThrow();
    });

    it('should track request errors', () => {
      const requestId = 'test-123';
      const error = new Error('Test error');
      const statusCode = 500;

      expect(() => {
        logManager.logRequestError(requestId, error, statusCode);
      }).not.toThrow();
    });

    it('should handle tracking with minimal parameters', () => {
      const requestId = 'test-123';

      expect(() => {
        logManager.logRequestStart(requestId, 'POST', '/api/test');
        logManager.logRequestEnd(requestId, 200, 100);
        logManager.logRequestError(requestId, new Error('error'));
      }).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should log errors with context', () => {
      const error = new Error('Test error');
      const context = {
        requestId: 'test-123',
        userId: 'user-456',
        additional: 'info',
      };

      expect(() => {
        logManager.logError(error, context);
      }).not.toThrow();
    });

    it('should handle errors without context', () => {
      const error = new Error('Test error');

      expect(() => {
        logManager.logError(error);
      }).not.toThrow();
    });

    it('should handle different error types', () => {
      const errors = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new SyntaxError('Syntax error'),
        new RangeError('Range error'),
        new ReferenceError('Reference error'),
      ];

      for (const error of errors) {
        expect(() => {
          logManager.logError(error, { errorType: error.name });
        }).not.toThrow();
      }
    });

    it('should log enhanced error information', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      const enhancedContext = {
        requestId: 'test-123',
        timestamp: Date.now(),
        severity: 'high',
        category: 'network',
      };

      expect(() => {
        logManager.logError(error, enhancedContext);
      }).not.toThrow();
    });
  });

  describe('Stream Management', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should get stream manager', () => {
      const streamManager = logManager.getStreamManager();
      expect(streamManager).toBeDefined();
    });

    it('should handle stream operations through manager', async () => {
      const streamManager = logManager.getStreamManager();
      
      // Test that stream manager methods exist
      expect(typeof streamManager.addStream).toBe('function');
      expect(typeof streamManager.removeStream).toBe('function');
      expect(typeof streamManager.updateStream).toBe('function');
      expect(typeof streamManager.getStream).toBe('function');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should update configuration dynamically', async () => {
      const newConfig: Partial<LogConfig> = {
        level: 'error',
        timestamp: false,
      };

      const result = await logManager.updateConfig(newConfig);
      expect(result.isOk()).toBe(true);

      const logger = logManager.getLogger();
      expect(logger.level).toBe('error');
    });

    it('should validate configuration before update', async () => {
      const invalidConfig: Partial<LogConfig> = {
        level: 'invalid' as LogLevel,
      };

      const result = await logManager.updateConfig(invalidConfig);
      expect(result.isErr()).toBe(true);
    });

    it('should maintain logger instances after config update', async () => {
      const originalLogger = logManager.getLogger();
      
      const newConfig: Partial<LogConfig> = {
        level: 'debug',
      };

      const result = await logManager.updateConfig(newConfig);
      expect(result.isOk()).toBe(true);

      const updatedLogger = logManager.getLogger();
      expect(updatedLogger).toBeDefined();
      expect(updatedLogger.level).toBe('debug');
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      logManager = new LogManager();
      await logManager.initialize();
    });

    it('should perform health check', () => {
      const health = logManager.healthCheck();
      
      expect(health).toBeDefined();
      expect(typeof health.status).toBe('string');
      expect(typeof health.uptime).toBe('number');
      expect(typeof health.timestamp).toBe('number');
      expect(health.config).toBeDefined();
      expect(health.streams).toBeDefined();
      expect(Array.isArray(health.streams)).toBe(true);
    });

    it('should reflect current status in health check', () => {
      const health = logManager.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.initialized).toBe(true);
      expect(health.uptime).toBeGreaterThan(0);
    });

    it('should include configuration information', () => {
      const health = logManager.healthCheck();
      
      expect(health.config).toBeDefined();
      expect(health.config.level).toBeDefined();
      expect(health.config.serviceName).toBeDefined();
      expect(health.config.version).toBeDefined();
      expect(health.config.environment).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations before initialization', () => {
      logManager = new LogManager();
      
      expect(() => {
        logManager.getLogger();
      }).toThrow();
    });

    it('should handle operations after cleanup', async () => {
      logManager = new LogManager();
      await logManager.initialize();
      await logManager.cleanup();
      
      expect(() => {
        logManager.getLogger();
      }).toThrow();
    });

    it('should handle invalid configuration during initialization', async () => {
      const invalidConfig: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'invalid-stream',
            type: 'invalid' as any,
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(invalidConfig);
      const result = await logManager.initialize();
      
      expect(result.isErr()).toBe(true);
    });

    it('should handle concurrent initialization attempts', async () => {
      logManager = new LogManager();
      
      // Start multiple initializations in parallel with slight delays to ensure concurrency
      const promises = [
        logManager.initialize(),
        new Promise(resolve => setTimeout(() => resolve(logManager.initialize()), 1)),
        new Promise(resolve => setTimeout(() => resolve(logManager.initialize()), 2))
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBe(1);
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup resources properly', async () => {
      logManager = new LogManager();
      await logManager.initialize();
      
      await expect(logManager.cleanup()).resolves.not.toThrow();
      
      expect(logManager.isInitialized()).toBe(false);
    });

    it('should allow reinitialization after cleanup', async () => {
      logManager = new LogManager();
      await logManager.initialize();
      await logManager.cleanup();
      
      const result = await logManager.initialize();
      expect(result.isOk()).toBe(true);
      expect(logManager.isInitialized()).toBe(true);
    });

    it('should handle multiple cleanup calls', async () => {
      logManager = new LogManager();
      await logManager.initialize();
      
      expect(async () => {
        await logManager.cleanup();
        await logManager.cleanup();
        await logManager.cleanup();
      }).not.toThrow();
    });
  });
});