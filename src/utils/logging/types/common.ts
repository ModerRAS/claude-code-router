/**
 * Common Utility Types
 * 
 * Defines common utility types used throughout the logging system.
 */

/**
 * Result type for operations that can succeed or fail
 */
export interface Result<T, E = Error> {
  /** Whether the operation was successful */
  success: boolean;
  /** The result value (if successful) */
  value?: T;
  /** The error (if failed) */
  error?: E;
  /** Additional context information */
  context?: Record<string, any>;
  
  /** Check if the operation was successful */
  isOk(): boolean;
  /** Check if the operation failed */
  isErr(): boolean;
  /** Map the value if successful */
  map<U>(fn: (value: T) => U): Result<U, E>;
  /** Map the error if failed */
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  /** Unwrap the value or throw an error */
  unwrap(): T;
  /** Unwrap the error or throw if successful */
  unwrapErr(): E;
  /** Get the value or return a default */
  unwrapOr(defaultValue: T): T;
}

/**
 * Create a successful Result
 */
export function Ok<T>(value: T, context?: Record<string, any>): Result<T> {
  return {
    success: true,
    value,
    context,
    isOk(): boolean { return true; },
    isErr(): boolean { return false; },
    map<U>(fn: (value: T) => U): Result<U> { return Ok(fn(this.value!), this.context); },
    mapErr<F>(fn: (error: Error) => F): Result<T, F> { return this as any; },
    unwrap(): T { return this.value!; },
    unwrapErr(): Error { throw new Error('Called unwrapErr on Ok result'); },
    unwrapOr(defaultValue: T): T { return this.value!; },
  };
}

/**
 * Create a failed Result
 */
export function Err<E extends Error = Error>(error: E, context?: Record<string, any>): Result<never, E> {
  return {
    success: false,
    error,
    context,
    isOk(): boolean { return false; },
    isErr(): boolean { return true; },
    map<U>(fn: (value: never) => U): Result<U, E> { return this as any; },
    mapErr<F>(fn: (error: E) => F): Result<never, F> { return Err(fn(this.error!), this.context); },
    unwrap(): never { throw this.error!; },
    unwrapErr(): E { return this.error!; },
    unwrapOr(defaultValue: never): never { return this.error! as any; },
  };
}

/**
 * Async result type for operations that can succeed or fail asynchronously
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Options type for configuration objects
 */
export interface Options {
  /** Additional options */
  [key: string]: any;
}

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Merge configuration type
 */
export type MergeConfigs<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T 
    ? K extends keyof U 
      ? T[K] | U[K] 
      : T[K]
    : K extends keyof U 
      ? U[K] 
      : never;
};

/**
 * Event handler type
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * Async event handler type
 */
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

/**
 * Disposable interface for resources that need cleanup
 */
export interface Disposable {
  /** Dispose of the resource */
  dispose(): void | Promise<void>;
}

/**
 * Logger interface abstraction
 */
export interface Logger {
  trace(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  fatal(message: string, meta?: any): void;
  child(bindings: any): Logger;
}

/**
 * Serializable interface for objects that can be serialized to JSON
 */
export interface Serializable {
  toJSON(): any;
}

/**
 * Configurable interface for objects that can be configured
 */
export interface Configurable<T = Options> {
  configure(options: T): void;
  getConfiguration(): T;
}

/**
 * Validatable interface for objects that can be validated
 */
export interface Validatable {
  validate(): Result<void, string[]>;
}

/**
 * Initializable interface for objects that need initialization
 */
export interface Initializable {
  initialize(): Promise<void> | void;
  isInitialized(): boolean;
}

/**
 * Startable interface for objects that can be started and stopped
 */
export interface Startable {
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  isRunning(): boolean;
}

/**
 * Flushable interface for objects that support flushing buffered data
 */
export interface Flushable {
  flush(): Promise<void> | void;
}

/**
 * Health check interface for objects that can report health status
 */
export interface HealthCheck {
  health(): Promise<HealthStatus> | HealthStatus;
}

/**
 * Health status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: HealthStatus;
  /** Health check results for individual components */
  components: Record<string, HealthCheckResult>;
  /** Additional health information */
  info?: Record<string, any>;
  /** Timestamp when health check was performed */
  timestamp: Date;
  /** Version information */
  version?: string;
}

/**
 * Metric interface for telemetry and monitoring
 */
export interface Metric {
  /** Name of the metric */
  name: string;
  /** Value of the metric */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Timestamp when metric was recorded */
  timestamp: Date;
  /** Tags associated with this metric */
  tags?: Record<string, string>;
}

/**
 * Counter metric interface
 */
export interface Counter extends Metric {
  type: 'counter';
}

/**
 * Gauge metric interface
 */
export interface Gauge extends Metric {
  type: 'gauge';
}

/**
 * Histogram metric interface
 */
export interface Histogram extends Metric {
  type: 'histogram';
  buckets: number[];
}

/**
 * Timer metric interface
 */
export interface Timer extends Metric {
  type: 'timer';
  duration: number;
}

/**
 * Union type for all metric types
 */
export type AnyMetric = Counter | Gauge | Histogram | Timer;

/**
 * Telemetry interface for metrics collection
 */
export interface Telemetry {
  /** Record a counter metric */
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  /** Record a gauge metric */
  setGauge(name: string, value: number, tags?: Record<string, string>): void;
  /** Record a histogram metric */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  /** Record a timer metric */
  recordTimer(name: string, duration: number, tags?: Record<string, string>): void;
  /** Flush all buffered metrics */
  flush(): Promise<void>;
}