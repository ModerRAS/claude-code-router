import { Logger } from 'pino';
import { StreamState, StreamError, StreamProgress } from '../types/request-context';
import { Result, Ok, Err } from '../types/common';

/**
 * 流式响应状态追踪器 - 专门跟踪流式响应的状态和进度
 * 
 * 简化实现说明：
 * - 原本实现：复杂的流状态管理、实时监控、性能分析、断点续传
 * - 简化实现：基础的流状态跟踪，简单的进度计算，基本的错误处理
 * - 文件位置：src/utils/logging/tracking/StreamStateTracker.ts
 * - 优化点：后续可添加实时监控、性能分析、断点续传、流优化建议
 */
export class StreamStateTracker {
  private logger: Logger;
  private activeStreams: Map<string, StreamState> = new Map();
  private streamProgress: Map<string, StreamProgress> = new Map();
  private streamErrors: Map<string, StreamError[]> = new Map();
  private metrics: Map<string, Map<string, number>> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 初始化追踪器
   */
  async initialize(): Promise<Result<void, Error>> {
    try {
      this.logger.info('StreamStateTracker initialized');
      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 开始流式响应
   */
  startStream(streamId: string, contentType: string, expectedSize?: number): Result<void, Error> {
    try {
      const startTime = Date.now();
      const state: StreamState = {
        id: streamId,
        status: 'started',
        startTime,
        contentType,
        expectedSize,
        bytesReceived: 0,
        chunksReceived: 0,
      };

      const progress: StreamProgress = {
        streamId,
        startTime,
        lastUpdateTime: startTime,
        bytesTransferred: 0,
        chunksTransferred: 0,
        transferRate: 0,
        estimatedTimeRemaining: expectedSize ? this.calculateEstimatedTime(0, expectedSize, startTime) : undefined,
        percentage: 0,
      };

      this.activeStreams.set(streamId, state);
      this.streamProgress.set(streamId, progress);
      this.streamErrors.set(streamId, []);

      this.logger.info({
        streamId,
        contentType,
        expectedSize,
      }, 'Stream started');

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 更新流进度
   */
  updateStreamProgress(
    streamId: string, 
    bytesReceived: number, 
    chunksReceived: number,
    data?: string | Buffer
  ): Result<void, Error> {
    try {
      const state = this.activeStreams.get(streamId);
      const progress = this.streamProgress.get(streamId);

      if (!state || !progress) {
        return Err(new Error(`Stream not found: ${streamId}`));
      }

      const now = Date.now();
      const timeElapsed = now - progress.startTime;
      const bytesDelta = bytesReceived - progress.bytesTransferred;

      // 更新状态
      state.bytesReceived = bytesReceived;
      state.chunksReceived = chunksReceived;
      state.status = 'progress';

      // 更新进度
      progress.bytesTransferred = bytesReceived;
      progress.chunksTransferred = chunksReceived;
      progress.lastUpdateTime = now;
      progress.transferRate = timeElapsed > 0 ? (bytesDelta / (timeElapsed / 1000)) : 0;
      progress.percentage = state.expectedSize ? (bytesReceived / state.expectedSize) * 100 : 0;
      progress.estimatedTimeRemaining = this.calculateEstimatedTime(
        bytesReceived, 
        state.expectedSize, 
        progress.startTime
      );

      // 记录指标
      this.recordMetric(streamId, 'bytes_received', bytesReceived);
      this.recordMetric(streamId, 'chunks_received', chunksReceived);
      this.recordMetric(streamId, 'transfer_rate', progress.transferRate);

      // 定期记录进度日志
      if (chunksReceived % 10 === 0) { // 每10个块记录一次
        this.logger.debug({
          streamId,
          bytesReceived,
          chunksReceived,
          transferRate: progress.transferRate.toFixed(2) + ' bytes/s',
          percentage: progress.percentage.toFixed(2) + '%',
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        }, 'Stream progress update');
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 完成流式响应
   */
  completeStream(streamId: string, finalSize?: number): Result<void, Error> {
    try {
      const state = this.activeStreams.get(streamId);
      const progress = this.streamProgress.get(streamId);

      if (!state || !progress) {
        return Err(new Error(`Stream not found: ${streamId}`));
      }

      const endTime = Date.now();
      const duration = endTime - progress.startTime;

      // 更新状态
      state.status = 'completed';
      state.endTime = endTime;
      state.duration = duration;
      if (finalSize) {
        state.bytesReceived = finalSize;
        state.expectedSize = finalSize;
      }

      // 更新进度
      progress.lastUpdateTime = endTime;
      progress.bytesTransferred = state.bytesReceived;
      progress.percentage = 100;
      progress.estimatedTimeRemaining = 0;

      // 记录最终指标
      this.recordMetric(streamId, 'duration', duration);
      this.recordMetric(streamId, 'final_size', state.bytesReceived);
      this.recordMetric(streamId, 'total_chunks', state.chunksReceived);

      this.logger.info({
        streamId,
        duration,
        finalSize: state.bytesReceived,
        chunksReceived: state.chunksReceived,
        averageTransferRate: (state.bytesReceived / (duration / 1000)).toFixed(2) + ' bytes/s',
      }, 'Stream completed');

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理流错误
   */
  handleStreamError(streamId: string, error: Error, context?: Record<string, unknown>): Result<void, Error> {
    try {
      const state = this.activeStreams.get(streamId);
      const progress = this.streamProgress.get(streamId);

      if (!state || !progress) {
        return Err(new Error(`Stream not found: ${streamId}`));
      }

      const endTime = Date.now();
      const duration = endTime - progress.startTime;

      // 创建错误记录
      const streamError: StreamError = {
        timestamp: endTime,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
      };

      // 更新状态
      state.status = 'error';
      state.endTime = endTime;
      state.duration = duration;
      state.error = streamError;

      // 添加错误到错误列表
      const errors = this.streamErrors.get(streamId) || [];
      errors.push(streamError);
      this.streamErrors.set(streamId, errors);

      // 记录错误指标
      this.recordMetric(streamId, 'error_count', errors.length);
      this.recordMetric(streamId, 'error_duration', duration);

      this.logger.error({
        streamId,
        error: error.message,
        duration,
        context,
      }, 'Stream error occurred');

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 暂停流
   */
  pauseStream(streamId: string): Result<void, Error> {
    try {
      const state = this.activeStreams.get(streamId);
      if (!state) {
        return Err(new Error(`Stream not found: ${streamId}`));
      }

      if (state.status === 'progress') {
        state.status = 'paused';
        state.pauseTime = Date.now();

        this.logger.info({ streamId }, 'Stream paused');
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 恢复流
   */
  resumeStream(streamId: string): Result<void, Error> {
    try {
      const state = this.activeStreams.get(streamId);
      if (!state) {
        return Err(new Error(`Stream not found: ${streamId}`));
      }

      if (state.status === 'paused' && state.pauseTime) {
        const pauseDuration = Date.now() - state.pauseTime;
        state.status = 'progress';
        state.pauseTime = undefined;
        state.totalPauseDuration = (state.totalPauseDuration || 0) + pauseDuration;

        this.logger.info({ 
          streamId, 
          pauseDuration,
          totalPauseDuration: state.totalPauseDuration 
        }, 'Stream resumed');
      }

      return Ok(undefined);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 获取流状态
   */
  getStreamState(streamId: string): Result<{ state: StreamState; progress: StreamProgress }, Error> {
    const state = this.activeStreams.get(streamId);
    const progress = this.streamProgress.get(streamId);

    if (!state || !progress) {
      return Err(new Error(`Stream not found: ${streamId}`));
    }

    return Ok({ state, progress });
  }

  /**
   * 获取流错误
   */
  getStreamErrors(streamId: string): StreamError[] {
    return this.streamErrors.get(streamId) || [];
  }

  /**
   * 获取活跃流列表
   */
  getActiveStreams(): StreamState[] {
    return Array.from(this.activeStreams.values()).filter(
      state => state.status === 'started' || state.status === 'progress'
    );
  }

  /**
   * 获取流指标
   */
  getStreamMetrics(streamId: string): Record<string, number> {
    const metrics = this.metrics.get(streamId);
    return metrics ? Object.fromEntries(metrics) : {};
  }

  /**
   * 获取所有流的状态概览
   */
  getStreamOverview(): Record<string, unknown> {
    const activeStreams = this.getActiveStreams();
    const totalStreams = this.activeStreams.size;
    const completedStreams = Array.from(this.activeStreams.values()).filter(
      state => state.status === 'completed'
    ).length;
    const errorStreams = Array.from(this.activeStreams.values()).filter(
      state => state.status === 'error'
    ).length;

    return {
      totalStreams,
      activeStreams: activeStreams.length,
      completedStreams,
      errorStreams,
      activeStreamDetails: activeStreams.map(state => ({
        id: state.id,
        status: state.status,
        bytesReceived: state.bytesReceived,
        chunksReceived: state.chunksReceived,
        duration: state.duration,
      })),
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1小时

    // 清理旧的流状态
    for (const [streamId, state] of this.activeStreams) {
      if (state.endTime && (now - state.endTime) > maxAge) {
        this.activeStreams.delete(streamId);
        this.streamProgress.delete(streamId);
        this.streamErrors.delete(streamId);
        this.metrics.delete(streamId);
      }
    }

    this.logger.info('StreamStateTracker cleaned up');
  }

  /**
   * 记录指标
   */
  private recordMetric(streamId: string, name: string, value: number): void {
    if (!this.metrics.has(streamId)) {
      this.metrics.set(streamId, new Map());
    }

    const streamMetrics = this.metrics.get(streamId)!;
    streamMetrics.set(name, value);
  }

  /**
   * 计算预计剩余时间
   */
  private calculateEstimatedTime(
    bytesTransferred: number, 
    totalBytes: number | undefined, 
    startTime: number
  ): number | undefined {
    if (!totalBytes || totalBytes <= 0 || bytesTransferred <= 0) {
      return undefined;
    }

    const elapsed = Date.now() - startTime;
    const remainingBytes = totalBytes - bytesTransferred;
    
    if (elapsed <= 0 || remainingBytes <= 0) {
      return 0;
    }

    const transferRate = bytesTransferred / (elapsed / 1000); // bytes per second
    return transferRate > 0 ? remainingBytes / transferRate : undefined;
  }
}