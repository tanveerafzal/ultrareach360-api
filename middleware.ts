import { NextResponse, type NextRequest } from 'next/server';
import { generateRequestId } from '@/lib/logger';

/**
 * Next.js Middleware for comprehensive request logging
 *
 * This middleware runs on every request and:
 * 1. Generates a unique request ID for tracing
 * 2. Logs incoming requests
 * 3. Logs response status and timing
 * 4. Passes request ID to route handlers via headers
 */

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // Extract request details
  const { method } = request;
  const url = new URL(request.url);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams);

  // Get client info
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');

  // Log incoming request
  const requestLog = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Incoming request',
    context: {
      requestId,
      method,
      path,
      ip,
      userAgent,
    },
    data: {
      query: Object.keys(query).length > 0 ? query : undefined,
      contentType,
      contentLength,
      host: url.host,
    },
  };

  console.log(JSON.stringify(requestLog));

  // Clone the request and add request ID header for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Create response with request ID header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add request ID to response headers for client correlation
  response.headers.set('x-request-id', requestId);

  // Log response (timing will be approximate since middleware completes before route handler)
  // The actual response logging happens in each route handler
  const durationMs = Date.now() - startTime;

  const middlewareLog = {
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: 'Middleware completed',
    context: {
      requestId,
      method,
      path,
    },
    data: {
      middlewareDurationMs: durationMs,
    },
  };

  console.log(JSON.stringify(middlewareLog));

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    '/v1/:path*',
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
