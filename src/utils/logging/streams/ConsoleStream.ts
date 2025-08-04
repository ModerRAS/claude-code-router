import { Writable } from 'stream';
import { createWriteStream } from 'fs';
import { StreamEntry } from '../types/stream-entry';
import { Result, Ok, Err } from '../types/common';

/**
 * 控制台流 - 标准输出/错误流
 * 
 * 简化实现说明：
 * - 原本实现：复杂的格式化、颜色控制、TTY检测、输出重定向
 * - 简化实现：直接使用 process.stdout/stderr，简化格式化逻辑
 * - 文件位置：src/utils/logging/streams/ConsoleStream.ts
 * - 优化点：后续可添加颜色支持、TTY检测、智能格式化、输出过滤
 */
export class ConsoleStream {
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

      // 根据配置选择输出流
      if (this.config.stderr) {
        this.stream = process.stderr;
      } else {
        this.stream = process.stdout;
      }

      // 处理流错误
      this.stream.on('error', (error) => {
        console.error('Console stream error:', error);
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
   * 检查是否为TTY
   */
  isTTY(): boolean {
    return this.stream ? this.stream.isTTY : false;
  }

  /**
   * 获取流类型
   */
  getStreamType(): 'stdout' | 'stderr' | 'unknown' {
    if (!this.stream) {
      return 'unknown';
    }
    
    if (this.stream === process.stdout) {
      return 'stdout';
    } else if (this.stream === process.stderr) {
      return 'stderr';
    }
    
    return 'unknown';
  }

  /**
   * 检查流是否可写
   */
  isWritable(): boolean {
    return this.isInitialized() && !this.stream!.destroyed;
  }

  /**
   * 设置编码
   */
  setEncoding(encoding: BufferEncoding): Result<void, Error> {
    try {
      if (!this.stream || !this.initialized) {
        return Err(new Error('Stream not initialized'));
      }

      this.stream.setDefaultEncoding(encoding);
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 强制刷新缓冲区
   */
  async flush(): Promise<Result<void, Error>> {
    try {
      if (!this.stream || !this.initialized) {
        return Err(new Error('Stream not initialized'));
      }

      // Node.js process.stdout/stderr 没有直接的 flush 方法，这里简化处理
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取流信息
   */
  getStreamInfo(): Result<{
    type: 'stdout' | 'stderr' | 'unknown';
    isTTY: boolean;
    writable: boolean;
  }, Error> {
    try {
      if (!this.stream || !this.initialized) {
        return Err(new Error('Stream not initialized'));
      }

      return Ok({
        type: this.getStreamType(),
        isTTY: this.isTTY(),
        writable: this.isWritable(),
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
   * 重新初始化流（用于动态切换输出目标）
   */
  async reinitialize(): Promise<Result<void, Error>> {
    try {
      // 关闭现有流
      if (this.stream && this.initialized) {
        this.stream.removeAllListeners();
        this.stream = null;
        this.initialized = false;
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
        this.stream.removeAllListeners();
        this.stream = null;
        this.initialized = false;
      }
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}