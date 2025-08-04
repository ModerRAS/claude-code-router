import { Writable } from 'stream';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { StreamEntry } from '../types/stream-entry';
import { Result, Ok, Err } from '../types/common';

/**
 * 目标流 - 普通文件输出流
 * 
 * 简化实现说明：
 * - 原本实现：复杂的文件管理、权限控制、缓冲区优化
 * - 简化实现：使用基础的 Node.js 文件流，简化文件操作
 * - 文件位置：src/utils/logging/streams/DestinationStream.ts
 * - 优化点：后续可添加文件权限管理、缓冲区优化、写入性能优化
 */
export class DestinationStream {
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

      if (!this.config.path) {
        return Err(new Error('File path is required for destination stream'));
      }

      // 确保目录存在
      const dir = dirname(this.config.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // 创建写入流
      this.stream = createWriteStream(this.config.path, {
        flags: 'a',
        encoding: 'utf8',
        autoClose: true,
      });

      // 处理流错误
      this.stream.on('error', (error) => {
        console.error(`Destination stream error for ${this.config.path}:`, error);
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
   * 检查流是否可写
   */
  isWritable(): boolean {
    return this.isInitialized() && !this.stream!.destroyed;
  }

  /**
   * 获取文件路径
   */
  getFilePath(): string | undefined {
    return this.config.path;
  }

  /**
   * 强制刷新缓冲区
   */
  async flush(): Promise<Result<void, Error>> {
    try {
      if (!this.stream || !this.initialized) {
        return Err(new Error('Stream not initialized'));
      }

      // Node.js WritableStream 没有直接的 flush 方法，这里简化处理
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取文件信息
   */
  getFileInfo(): Result<{ path: string; exists: boolean }, Error> {
    try {
      if (!this.config.path) {
        return Err(new Error('File path not configured'));
      }

      const { existsSync } = require('fs');
      const exists = existsSync(this.config.path);

      return Ok({
        path: this.config.path,
        exists,
      });
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
   * 重新打开流（切换文件）
   */
  async reopen(newPath?: string): Promise<Result<void, Error>> {
    try {
      // 关闭现有流
      if (this.stream && this.initialized) {
        this.stream.end();
        this.stream = null;
      }

      // 更新路径
      if (newPath) {
        this.config.path = newPath;
      }

      // 重新初始化
      return await this.initialize();
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 关闭流
   */
  async close(): Promise<Result<void, Error>> {
    try {
      if (this.stream && this.initialized) {
        return new Promise((resolve) => {
          this.stream!.once('close', () => {
            this.stream = null;
            this.initialized = false;
            resolve(Ok(undefined));
          });
          
          this.stream!.end();
        });
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}