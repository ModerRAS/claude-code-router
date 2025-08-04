import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LogManager } from '../LogManager';
import { createLogManager } from '../factory';
import { LogConfig } from '../types/log-config';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Logging System Performance Benchmarks', () => {
  let logManager: LogManager | null = null;
  let testLogDir: string;
  let testLogFile: string;

  beforeEach(() => {
    // Create test directory
    testLogDir = join(__dirname, '..', '..', '..', 'test-perf-logs');
    testLogFile = join(testLogDir, 'benchmark.log');
    
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

  describe('Basic Logging Performance', () => {
    it('should measure single message logging throughput', async () => {
      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'benchmark-test',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'benchmark-console',
            type: 'console',
            level: 'info',
          },
          {
            name: 'benchmark-file',
            type: 'file',
            level: 'info',
            path: testLogFile,
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const logger = logManager.getLogger();
      const iterations = 10000;
      const message = 'Performance benchmark test message with some context data';

      // Warm up
      for (let i = 0; i < 1000; i++) {
        logger.info(`Warm-up ${i}: ${message}`);
      }

      // Actual benchmark
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        logger.info(`Benchmark ${i}: ${message}`, { iteration: i });
      }
      
      const endTime = process.hrtime.bigint();
      const durationNs = Number(endTime - startTime);
      const durationMs = durationNs / 1000000;
      const messagesPerSecond = (iterations / durationMs) * 1000;

      console.log(`Single message logging performance:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(messagesPerSecond).toBeGreaterThan(1000); // Should be faster than 1000 msg/sec

      // Verify logging worked
      expect(existsSync(testLogFile)).toBe(true);
      const logContent = readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('Performance benchmark test message');
    });

    it('should measure concurrent logging performance', async () => {
      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'concurrent-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'concurrent-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const logger = logManager.getLogger();
      const concurrentRequests = 100;
      const messagesPerRequest = 100;
      const message = 'Concurrent benchmark message';

      const startTime = process.hrtime.bigint();

      // Simulate concurrent requests
      const promises = Array.from({ length: concurrentRequests }, async (_, requestId) => {
        const requestLogger = logManager!.createRequestLogger(`request-${requestId}`);
        
        for (let i = 0; i < messagesPerRequest; i++) {
          requestLogger.info(`Request ${requestId}, message ${i}: ${message}`);
        }
        
        return requestId;
      });

      await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const durationNs = Number(endTime - startTime);
      const durationMs = durationNs / 1000000;
      const totalMessages = concurrentRequests * messagesPerRequest;
      const messagesPerSecond = (totalMessages / durationMs) * 1000;

      console.log(`Concurrent logging performance:`);
      console.log(`  Concurrent requests: ${concurrentRequests}`);
      console.log(`  Messages per request: ${messagesPerRequest}`);
      console.log(`  Total messages: ${totalMessages}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(messagesPerSecond).toBeGreaterThan(500); // Should be faster than 500 msg/sec
    });

    it('should measure memory usage during high-volume logging', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'memory-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'memory-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const logger = logManager.getLogger();
      const iterations = 50000;
      const message = 'Memory benchmark test message';

      // Get initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Perform high-volume logging
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        logger.info(`Memory test ${i}: ${message}`, { iteration: i, data: 'x'.repeat(100) });
      }
      
      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage();

      const durationMs = Number(endTime - startTime) / 1000000;
      const messagesPerSecond = (iterations / durationMs) * 1000;

      // Calculate memory growth
      const heapGrowthMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const rssGrowthMB = (finalMemory.rss - initialMemory.rss) / 1024 / 1024;

      console.log(`Memory usage performance:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);
      console.log(`  Heap growth: ${heapGrowthMB.toFixed(2)}MB`);
      console.log(`  RSS growth: ${rssGrowthMB.toFixed(2)}MB`);

      // Performance assertions
      expect(messagesPerSecond).toBeGreaterThan(500); // Should be faster than 500 msg/sec
      expect(heapGrowthMB).toBeLessThan(50); // Heap growth should be reasonable (< 50MB)
      expect(rssGrowthMB).toBeLessThan(100); // RSS growth should be reasonable (< 100MB)
    });
  });

  describe('Logger Creation Performance', () => {
    it('should measure request logger creation performance', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'request-logger-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'request-logger-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const iterations = 10000;
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const requestLogger = logManager.createRequestLogger(`request-${i}`);
        requestLogger.debug(`Test message from request ${i}`);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const loggersPerSecond = (iterations / durationMs) * 1000;

      console.log(`Request logger creation performance:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${loggersPerSecond.toFixed(2)} loggers/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(loggersPerSecond).toBeGreaterThan(1000); // Should be faster than 1000 loggers/sec
    });

    it('should measure child logger creation performance', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'child-logger-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'child-logger-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const parentLogger = logManager.getLogger();
      const iterations = 10000;
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const childLogger = parentLogger.child({
          requestId: `child-${i}`,
          userId: `user-${i % 100}`,
          sessionId: `session-${i % 10}`,
        });
        childLogger.debug(`Test message from child ${i}`);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const loggersPerSecond = (iterations / durationMs) * 1000;

      console.log(`Child logger creation performance:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${loggersPerSecond.toFixed(2)} loggers/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(loggersPerSecond).toBeGreaterThan(1000); // Should be faster than 1000 loggers/sec
    });
  });

  describe('Configuration Update Performance', () => {
    it('should measure dynamic configuration update performance', async () => {
      const initialConfig: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'config-update-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'config-update-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(initialConfig);
      await logManager.initialize();

      const iterations = 1000;
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const newLevel = levels[i % levels.length];
        const result = await logManager.updateConfig({ level: newLevel });
        expect(result.isOk()).toBe(true);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const updatesPerSecond = (iterations / durationMs) * 1000;

      console.log(`Configuration update performance:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${updatesPerSecond.toFixed(2)} updates/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(updatesPerSecond).toBeGreaterThan(100); // Should be faster than 100 updates/sec
    });
  });

  describe('Stream Management Performance', () => {
    it('should measure stream add/remove performance', async () => {
      const config: LogConfig = {
        level: 'debug',
        timestamp: true,
        serviceName: 'stream-management-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'stream-mgmt-console',
            type: 'console',
            level: 'debug',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const streamManager = logManager.getStreamManager();
      const iterations = 1000;
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        // Add a new stream
        const addResult = streamManager.addStream({
          name: `benchmark-stream-${i}`,
          type: 'console',
          level: 'info',
        });
        expect(addResult.isOk()).toBe(true);
        
        // Remove the stream
        const removeResult = streamManager.removeStream(`benchmark-stream-${i}`);
        expect(removeResult.isOk()).toBe(true);
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      const operationsPerSecond = ((iterations * 2) / durationMs) * 1000;

      console.log(`Stream management performance:`);
      console.log(`  Iterations: ${iterations} (add + remove)`);
      console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
      console.log(`  Throughput: ${operationsPerSecond.toFixed(2)} operations/second`);

      // Performance assertions
      expect(durationMs).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(operationsPerSecond).toBeGreaterThan(200); // Should be faster than 200 ops/sec
    });
  });

  describe('Scalability Performance', () => {
    it('should measure performance with increasing load', async () => {
      const config: LogConfig = {
        level: 'info',
        timestamp: true,
        serviceName: 'scalability-benchmark',
        version: '1.0.0',
        environment: 'test',
        streams: [
          {
            name: 'scalability-console',
            type: 'console',
            level: 'info',
          },
        ],
      };

      logManager = new LogManager(config);
      await logManager.initialize();

      const logger = logManager.getLogger();
      const message = 'Scalability benchmark test message';
      
      // Test with increasing load
      const loads = [100, 1000, 5000, 10000];
      
      for (const load of loads) {
        const startTime = process.hrtime.bigint();
        
        for (let i = 0; i < load; i++) {
          logger.info(`Load test ${i}/${load}: ${message}`);
        }
        
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        const messagesPerSecond = (load / durationMs) * 1000;
        
        console.log(`Scalability test (${load} messages):`);
        console.log(`  Duration: ${durationMs.toFixed(2)}ms`);
        console.log(`  Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);
        
        // Performance should degrade gracefully
        expect(durationMs).toBeLessThan(5000); // Should complete in under 5 seconds
        
        // Throughput should remain reasonable
        if (load >= 1000) {
          expect(messagesPerSecond).toBeGreaterThan(500);
        }
      }
    });
  });
});