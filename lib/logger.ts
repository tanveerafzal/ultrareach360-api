/**
 * Structured Logger for Vercel Deployment
 *
 * Outputs JSON-formatted logs that are properly captured by Vercel's logging system.
 * Each log entry includes timestamp, level, request context, and structured data.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  durationMs?: number;
}

// Log levels for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get minimum log level from environment (default: 'debug' in dev, 'info' in prod)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Core logging function - outputs structured JSON to console
 */
function log(level: LogLevel, message: string, context?: LogContext, data?: Record<string, any>, error?: Error): void {
  // Skip if below minimum log level
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (data && Object.keys(data).length > 0) {
    entry.data = data;
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }

  // Output as JSON for Vercel's log parser
  const output = JSON.stringify(entry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

/**
 * Logger class for request-scoped logging
 */
export class Logger {
  private context: LogContext;
  private startTime: number;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.startTime = Date.now();
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger({ ...this.context, ...additionalContext });
    childLogger.startTime = this.startTime;
    return childLogger;
  }

  /**
   * Set user context after authentication
   */
  setUser(userId: string, email: string): void {
    this.context.userId = userId;
    this.context.userEmail = email;
  }

  /**
   * Get elapsed time since logger creation
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  debug(message: string, data?: Record<string, any>): void {
    log('debug', message, this.context, data);
  }

  info(message: string, data?: Record<string, any>): void {
    log('info', message, this.context, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    log('warn', message, this.context, data);
  }

  error(message: string, error?: Error | any, data?: Record<string, any>): void {
    const errorObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

    // Merge additional error data
    const mergedData = { ...data };
    if (error && !(error instanceof Error)) {
      mergedData.errorData = error;
    }

    log('error', message, this.context, Object.keys(mergedData).length > 0 ? mergedData : undefined, errorObj);
  }

  /**
   * Log request start
   */
  requestStart(data?: Record<string, any>): void {
    this.info('Request started', data);
  }

  /**
   * Log request completion
   */
  requestEnd(statusCode: number, data?: Record<string, any>): void {
    const durationMs = this.getElapsedMs();
    this.info('Request completed', {
      statusCode,
      durationMs,
      ...data
    });
  }

  /**
   * Log request error
   */
  requestError(statusCode: number, error: Error | any, data?: Record<string, any>): void {
    const durationMs = this.getElapsedMs();
    this.error('Request failed', error, {
      statusCode,
      durationMs,
      ...data
    });
  }

  /**
   * Log authentication events
   */
  authSuccess(userId: string, email: string): void {
    this.setUser(userId, email);
    this.info('Authentication successful', { userId, email });
  }

  authFailure(reason: string, data?: Record<string, any>): void {
    this.warn('Authentication failed', { reason, ...data });
  }

  /**
   * Log external service calls
   */
  externalServiceStart(service: string, operation: string, data?: Record<string, any>): void {
    this.debug(`External service call started: ${service}`, { service, operation, ...data });
  }

  externalServiceSuccess(service: string, operation: string, data?: Record<string, any>): void {
    this.info(`External service call succeeded: ${service}`, { service, operation, ...data });
  }

  externalServiceError(service: string, operation: string, error: Error | any, data?: Record<string, any>): void {
    this.error(`External service call failed: ${service}`, error, { service, operation, ...data });
  }

  /**
   * Log database operations
   */
  dbOperation(operation: string, data?: Record<string, any>): void {
    this.debug(`Database operation: ${operation}`, { operation, ...data });
  }

  /**
   * Log validation errors
   */
  validationError(field: string, reason: string, data?: Record<string, any>): void {
    this.warn('Validation error', { field, reason, ...data });
  }
}

/**
 * Create a logger from NextRequest
 */
export function createRequestLogger(request: Request, requestId?: string): Logger {
  const url = new URL(request.url);

  const context: LogContext = {
    requestId: requestId || generateRequestId(),
    method: request.method,
    path: url.pathname,
    ip: request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };

  return new Logger(context);
}

/**
 * Global logger for non-request contexts (startup, config, etc.)
 */
export const globalLogger = new Logger({ context: 'global' });

// Export convenience functions for quick logging
export const logger = {
  debug: (message: string, data?: Record<string, any>) => log('debug', message, undefined, data),
  info: (message: string, data?: Record<string, any>) => log('info', message, undefined, data),
  warn: (message: string, data?: Record<string, any>) => log('warn', message, undefined, data),
  error: (message: string, error?: Error | any, data?: Record<string, any>) => {
    const errorObj = error instanceof Error ? error : undefined;
    log('error', message, undefined, data, errorObj);
  },
};

export default Logger;
