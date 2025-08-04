/**
 * Streams Module Index
 * 
 * Re-exports all stream-related components.
 */

// Stream types (re-export from types)
export * from '../types/stream-entry';

// Stream managers (will be implemented)
export { StreamManager } from './StreamManager';
export { PinoRollStream } from './PinoRollStream';
export { DestinationStream } from './DestinationStream';
export { ConsoleStream } from './ConsoleStream';

// Stream factory
export { StreamFactory } from './StreamFactory';

// Default configurations
export { DEFAULT_STREAM_CONFIGS } from '../types/stream-entry';