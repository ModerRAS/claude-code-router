/**
 * Request Tracking Types
 * 
 * Defines types for request lifecycle tracking and monitoring.
 * Enables detailed tracing of HTTP requests through the system.
 */

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Request status enumeration
 * Tracks the different states of a request through its lifecycle.
 */
export enum RequestStatus {
  STARTED = 'started',
  ROUTING = 'routing',
  PROCESSING = 'processing',
  STREAMING = 'streaming',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * Stream state enumeration
 * Tracks the different states of streaming responses.
 */
export enum StreamStateType {
  START = 'start',
  CHUNK = 'chunk',
  END = 'end',
  ERROR = 'error',
  TIMEOUT = 'timeout'
}

/**
 * Simplified StreamState enumeration for basic tracking
 */
export enum StreamState {
  IDLE = 'idle',
  STARTED = 'started',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  ERROR = 'error',
  PAUSED = 'paused'
}

/**
 * Request finish reason enumeration
 * Defines the possible reasons for request termination.
 */
export enum FinishReason {
  NORMAL = 'stop',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  ABNORMAL = 'abnormal'
}

/**
 * Request context interface
 * Contains all information about a specific request being tracked.
 */
export interface RequestContext {
  /** Unique identifier for this request */
  id: string;
  /** Timestamp when the request started */
  startTime: Date;
  /** Timestamp when the request ended (if completed) */
  endTime?: Date;
  /** Total duration of the request in milliseconds */
  duration?: number;
  /** Current status of the request */
  status: RequestStatus;
  /** HTTP method of the request */
  method: string;
  /** URL of the request */
  url: string;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** User agent from request headers */
  userAgent?: string;
  /** Client IP address */
  clientIp?: string;
  /** LLM provider being used */
  provider?: string;
  /** LLM model being used */
  model?: string;
  /** Array of stream states for this request */
  streamStates: StreamState[];
  /** Error information if the request failed */
  error?: ErrorInfo;
  /** Token usage information */
  tokenUsage?: TokenUsage;
  /** Custom metadata for this request */
  metadata?: Record<string, any>;
}

/**
 * Stream state interface
 * Represents a specific state in the streaming response lifecycle.
 */
export interface StreamState {
  /** Type of the stream state */
  type: StreamStateType;
  /** Timestamp when this state occurred */
  timestamp: Date;
  /** Finish reason if the stream ended */
  finishReason?: FinishReason | null;
  /** Chunk data (for CHUNK type states) */
  data?: any;
  /** Size of the chunk in bytes (for CHUNK type states) */
  chunkSize?: number;
  /** Sequence number of this chunk (for CHUNK type states) */
  sequence?: number;
  /** Error information (for ERROR type states) */
  error?: ErrorInfo;
}

/**
 * Error information interface
 * Provides detailed information about errors that occur during request processing.
 */
export interface ErrorInfo {
  /** Error type or category */
  type: string;
  /** Error message */
  message: string;
  /** Error stack trace (if available) */
  stack?: string;
  /** Timestamp when the error occurred */
  timestamp: Date;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * Token usage information interface
 * Tracks token consumption for LLM requests.
 */
export interface TokenUsage {
  /** Number of prompt tokens used */
  prompt: number;
  /** Number of completion tokens used */
  completion: number;
  /** Total number of tokens used */
  total: number;
  /** Estimated cost in USD (if available) */
  cost?: number;
}

/**
 * Request tracking options interface
 * Configuration options for the request tracking system.
 */
export interface RequestTrackingOptions {
  /** Whether request tracking is enabled */
  enabled: boolean;
  /** Whether to include detailed information in logs */
  includeDetails: boolean;
  /** Whether to track stream states */
  trackStreams: boolean;
  /** Whether to track token usage */
  trackTokenUsage: boolean;
  /** Maximum number of active requests to track */
  maxActiveRequests: number;
  /** Maximum age for request contexts in milliseconds */
  maxContextAge: number;
  /** Whether to cleanup completed contexts automatically */
  autoCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Request session interface
 * Represents an active request tracking session.
 */
export interface RequestSession {
  /** Request context for this session */
  context: RequestContext;
  /** Original HTTP request object */
  request: IncomingMessage;
  /** Original HTTP response object (if available) */
  response?: ServerResponse;
  /** Array of callbacks to call when request ends */
  endCallbacks: Array<(context: RequestContext) => void>;
}

/**
 * Request tracking statistics interface
 * Provides statistics about the request tracking system.
 */
export interface RequestTrackingStats {
  /** Total number of requests tracked */
  totalRequests: number;
  /** Number of currently active requests */
  activeRequests: number;
  /** Number of completed requests */
  completedRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Number of timed out requests */
  timeoutRequests: number;
  /** Average request duration in milliseconds */
  averageDuration: number;
  /** Total tokens consumed across all requests */
  totalTokens: number;
  /** Peak number of concurrent requests */
  peakConcurrentRequests: number;
  /** Timestamp when tracking started */
  startTime: Date;
  /** Timestamp of last update */
  lastUpdateTime: Date;
}

/**
 * Request filter interface
 * Used to filter which requests should be tracked.
 */
export interface RequestFilter {
  /** Whether to track this request */
  shouldTrack(request: IncomingMessage): boolean;
  /** Priority of this filter (higher numbers = higher priority) */
  priority: number;
  /** Description of what this filter does */
  description: string;
}

/**
 * Stream event interface
 * Represents events that occur during stream processing.
 */
export interface StreamEvent {
  /** Type of the event */
  type: 'start' | 'chunk' | 'end' | 'error' | 'timeout';
  /** Request ID associated with this event */
  requestId: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Event data (varies by type) */
  data?: any;
}

/**
 * Default request tracking options
 */
export const DEFAULT_REQUEST_TRACKING_OPTIONS: RequestTrackingOptions = {
  enabled: true,
  includeDetails: true,
  trackStreams: true,
  trackTokenUsage: true,
  maxActiveRequests: 1000,
  maxContextAge: 3600000, // 1 hour
  autoCleanup: true,
  cleanupInterval: 60000 // 1 minute
};

/**
 * Simplified RequestContext for basic tracking
 */
export interface SimplifiedRequestContext {
  /** Unique identifier for this request */
  requestId: string;
  /** Session identifier */
  sessionId?: string;
  /** User identifier */
  userId?: string;
  /** Trace identifier for distributed tracing */
  traceId?: string;
  /** Current status of the request */
  status: RequestStatus;
  /** Timestamp when the request started */
  startTime?: number;
  /** Timestamp when the request ended */
  endTime?: number;
  /** Total duration of the request in milliseconds */
  duration?: number;
  /** HTTP method of the request */
  method?: string;
  /** URL of the request */
  url?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** HTTP status code */
  statusCode?: number;
  /** Error information if the request failed */
  error?: StreamError;
  /** Current stream state */
  streamState?: StreamState;
  /** Token usage information */
  tokenUsage?: TokenUsage;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Stream error information
 */
export interface StreamError {
  /** Timestamp when the error occurred */
  timestamp: number;
  /** Error information */
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Stream progress information
 */
export interface StreamProgress {
  /** Stream identifier */
  streamId: string;
  /** Start timestamp */
  startTime: number;
  /** Last update timestamp */
  lastUpdateTime: number;
  /** Bytes transferred */
  bytesTransferred: number;
  /** Chunks transferred */
  chunksTransferred: number;
  /** Transfer rate in bytes per second */
  transferRate: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Completion percentage */
  percentage: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  /** Number of prompt tokens used */
  promptTokens: number;
  /** Number of completion tokens used */
  completionTokens: number;
  /** Total number of tokens used */
  totalTokens: number;
}

/**
 * Request statistics
 */
export interface RequestStatistics {
  /** Total number of requests */
  totalRequests: number;
  /** Number of currently active requests */
  activeRequests: number;
  /** Number of completed requests */
  completedRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Timestamp of last update */
  lastUpdated: number;
}