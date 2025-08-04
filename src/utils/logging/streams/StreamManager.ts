import { pino } from 'pino';
import { StreamEntry, LogLevel } from '../types/stream-entry';
import { LogConfig } from '../types/log-config';
import { PinoRollStream } from './PinoRollStream';
import { DestinationStream } from './DestinationStream';
import { ConsoleStream } from './ConsoleStream';
import { Result, Ok, Err } from '../types/common';

/**
 * 流管理器 - 管理多流输出配置和生命周期
 * 
 * 简化实现说明：
 * - 原本实现：复杂的流状态管理、动态流切换、流健康检查
 * - 简化实现：基础的流配置管理和简单的生命周期控制
 * - 文件位置：src/utils/logging/streams/StreamManager.ts
 * - 优化点：后续可添加流健康监控、动态重配置、流性能优化
 */
export class StreamManager {
  private streams: Map<string, pino.MultiStreamRes> = new Map();
  private activeStreams: Set<string> = new Set();
  private config: LogConfig;

  constructor(config: LogConfig) {
    this.config = config;
  }

  /**
   * 初始化流管理器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      await this.createDefaultStreams();
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 创建默认流配置
   */
  private async createDefaultStreams(): Promise<void> {
    const { streams } = this.config;

    for (const streamConfig of streams) {
      const streamResult = await this.createStream(streamConfig);
      if (streamResult.isOk()) {
        const stream = streamResult.value;
        this.streams.set(streamConfig.name, stream);
        this.activeStreams.add(streamConfig.name);
      } else {
        console.error(`Failed to create stream ${streamConfig.name}:`, streamResult.error);
      }
    }
  }

  /**
   * 创建单个流
   */
  private async createStream(entry: StreamEntry): Promise<Result<pino.MultiStreamRes, Error>> {
    try {
      let stream: NodeJS.WritableStream;

      switch (entry.type) {
        case 'file':
          if (entry.rotation) {
            const rollStream = new PinoRollStream(entry);
            await rollStream.initialize();
            stream = rollStream.getStream();
          } else {
            const destStream = new DestinationStream(entry);
            await destStream.initialize();
            stream = destStream.getStream();
          }
          break;

        case 'console':
          const consoleStream = new ConsoleStream(entry);
          await consoleStream.initialize();
          stream = consoleStream.getStream();
          break;

        default:
          return Err(new Error(`Unsupported stream type: ${entry.type}`));
      }

      const multiStream: pino.MultiStreamRes = {
        stream,
        level: entry.level,
        autoEnd: entry.autoEnd ?? true,
      };

      return Ok(multiStream);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取多流配置
   */
  getMultiStreams(): pino.MultiStreamRes[] {
    return Array.from(this.streams.values()).filter(stream => 
      this.activeStreams.has(stream.level || 'info')
    );
  }

  /**
   * 添加新流
   */
  async addStream(entry: StreamEntry): Promise<Result<void, Error>> {
    try {
      const streamResult = await this.createStream(entry);
      if (streamResult.isOk()) {
        this.streams.set(entry.name, streamResult.value);
        this.activeStreams.add(entry.name);
        return Ok(undefined);
      }
      return Err(streamResult.error);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 移除流
   */
  removeStream(name: string): Result<void, Error> {
    try {
      const stream = this.streams.get(name);
      if (stream) {
        if (stream.autoEnd) {
          stream.stream.end();
        }
        this.streams.delete(name);
        this.activeStreams.delete(name);
        return Ok(undefined);
      }
      return Err(new Error(`Stream not found: ${name}`));
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 更新流配置
   */
  async updateStream(name: string, newConfig: Partial<StreamEntry>): Promise<Result<void, Error>> {
    try {
      // 先移除旧流
      const removeResult = this.removeStream(name);
      if (removeResult.isErr()) {
        return Err(removeResult.error);
      }

      // 创建新流
      const existingConfig = this.config.streams.find(s => s.name === name);
      if (!existingConfig) {
        return Err(new Error(`Stream configuration not found: ${name}`));
      }

      const updatedConfig = { ...existingConfig, ...newConfig };
      const addResult = await this.addStream(updatedConfig);
      if (addResult.isErr()) {
        return Err(addResult.error);
      }

      // 更新配置
      const configIndex = this.config.streams.findIndex(s => s.name === name);
      if (configIndex !== -1) {
        this.config.streams[configIndex] = updatedConfig;
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取流状态
   */
  getStreamStatus(name: string): Result<{ active: boolean; level?: LogLevel }, Error> {
    const stream = this.streams.get(name);
    if (stream) {
      return Ok({
        active: this.activeStreams.has(name),
        level: stream.level as LogLevel,
      });
    }
    return Err(new Error(`Stream not found: ${name}`));
  }

  /**
   * 获取所有流状态
   */
  getAllStreamStatus(): Record<string, { active: boolean; level?: LogLevel }> {
    const status: Record<string, { active: boolean; level?: LogLevel }> = {};
    
    for (const [name, stream] of this.streams) {
      status[name] = {
        active: this.activeStreams.has(name),
        level: stream.level as LogLevel,
      };
    }

    return status;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    for (const [name, stream] of this.streams) {
      if (stream.autoEnd) {
        try {
          stream.stream.end();
        } catch (error) {
          console.error(`Error ending stream ${name}:`, error);
        }
      }
    }
    
    this.streams.clear();
    this.activeStreams.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(config: LogConfig): void {
    this.config = config;
  }
}