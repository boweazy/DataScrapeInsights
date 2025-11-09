import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// Rate limiters for different endpoint types
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Stricter rate limit for expensive operations
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per hour
  message: 'Rate limit exceeded for this operation.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for scraper operations
export const scraperRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit to 5 scraper operations per minute
  message: 'Too many scraper requests. Please wait before starting another scrape.',
  skipSuccessfulRequests: false
});

// Rate limiter for export operations
export const exportRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit to 10 exports per 5 minutes
  message: 'Too many export requests. Please wait before creating another export.'
});

// Performance monitoring middleware
const requestTimings = new Map<string, number[]>();

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Track timings for this endpoint
    if (!requestTimings.has(path)) {
      requestTimings.set(path, []);
    }

    const timings = requestTimings.get(path)!;
    timings.push(duration);

    // Keep only last 100 requests
    if (timings.length > 100) {
      timings.shift();
    }

    // Log slow requests
    if (duration > 1000) {
      console.warn(`[Performance] Slow request: ${req.method} ${path} took ${duration}ms`);
    }
  });

  next();
}

// Get performance metrics
export function getPerformanceMetrics() {
  const metrics: Record<string, any> = {};

  requestTimings.forEach((timings, path) => {
    if (timings.length === 0) return;

    const sorted = [...timings].sort((a, b) => a - b);
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    metrics[path] = {
      requests: timings.length,
      avg: Math.round(avg),
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(sorted[0]),
      max: Math.round(sorted[sorted.length - 1])
    };
  });

  return metrics;
}

// Error tracking middleware
interface ErrorStats {
  count: number;
  lastOccurred: Date;
  messages: string[];
}

const errorStats = new Map<string, ErrorStats>();

export function errorTracker(err: any, req: Request, res: Response, next: NextFunction) {
  const errorKey = `${req.method}:${req.path}`;

  if (!errorStats.has(errorKey)) {
    errorStats.set(errorKey, {
      count: 0,
      lastOccurred: new Date(),
      messages: []
    });
  }

  const stats = errorStats.get(errorKey)!;
  stats.count++;
  stats.lastOccurred = new Date();

  const errorMessage = err.message || 'Unknown error';
  if (!stats.messages.includes(errorMessage)) {
    stats.messages.push(errorMessage);
    if (stats.messages.length > 10) {
      stats.messages.shift();
    }
  }

  console.error(`[Error] ${errorKey}: ${errorMessage}`);

  next(err);
}

export function getErrorStats() {
  const stats: Record<string, any> = {};

  errorStats.forEach((value, key) => {
    stats[key] = {
      count: value.count,
      lastOccurred: value.lastOccurred,
      recentMessages: value.messages.slice(-5)
    };
  });

  return stats;
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.socket.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} from ${ip}`);

  next();
}

// CORS configuration for API
export function corsConfig(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}
