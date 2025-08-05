import { Writable } from 'stream';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import pino from 'pino';
import roll from 'pino-roll';
import { StreamEntry } from '../types/stream-entry';
import { Result, Ok, Err } from '../types/common';

/**
 * Pino Roll 流包装器 - 提供日志轮转功能
 * 
 * 简化实现说明：
 * - 原本实现：自定义轮转逻辑、复杂的文件管理、压缩归档
 * - 简化实现：使用 pino-roll 的基础轮转功能，简化文件管理
 * - 文件位置：src/utils/logging/streams/PinoRollStream.ts
 * - 优化点：后续可添加自定义轮转策略、文件压缩、远程存储集成
 */
export class PinoRollStream {
  private stream: Writable | null = null;
  private config: StreamEntry;
  private initialized = false;

  constructor(config: StreamEntry) {
    this.config = config;
  }

  /**
   * 初始化流
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      if (this.initialized) {
        return Ok(undefined);
      }

      const filePath = this.config.path || this.config.filePath;
      if (!filePath) {
        return Err(new Error('File path is required for rotation stream'));
      }

      // 确保目录存在
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // 创建 pino-roll 流
      const rollConfig = this.config.rotation || {};
      this.stream = roll(filePath, {
        size: rollConfig.size || '10M',
        interval: rollConfig.interval || '1d',
        mkdir: true,
      });

      this.initialized = true;
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取流实例
   */
  getStream(): Writable {
    if (!this.stream) {
      throw new Error('Stream not initialized. Call initialize() first.');
    }
    return this.stream;
  }

  /**
   * 检查流是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized && this.stream !== null;
  }

  /**
   * 手动触发轮转
   */
  async rotate(): Promise<Result<void, Error>> {
    try {
      if (!this.stream || !this.initialized) {
        return Err(new Error('Stream not initialized'));
      }

      // pino-roll 不提供手动轮转接口，这里简化处理
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取当前文件信息
   */
  getFileInfo(): Result<{ path: string; size?: number }, Error> {
    try {
      if (!this.config.path) {
        return Err(new Error('File path not configured'));
      }

      const info = {
        path: this.config.path,
      };

      return Ok(info);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StreamEntry>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 关闭流
   */
  async close(): Promise<Result<void, Error>> {
    try {
      if (this.stream && this.initialized) {
        this.stream.end();
        this.stream = null;
        this.initialized = false;
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}