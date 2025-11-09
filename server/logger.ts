import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports = [
  // Console output
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // HTTP logs
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Stream for Morgan integration
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },

  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },

  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },

  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },

  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },

  // Structured logging for different events
  scraper: {
    started: (scraperId: number, scraperName: string) => {
      logger.info('Scraper started', { scraperId, scraperName, event: 'scraper.started' });
    },
    completed: (scraperId: number, scraperName: string, itemsScraped: number) => {
      logger.info('Scraper completed', { scraperId, scraperName, itemsScraped, event: 'scraper.completed' });
    },
    failed: (scraperId: number, scraperName: string, error: string) => {
      logger.error('Scraper failed', { scraperId, scraperName, error, event: 'scraper.failed' });
    },
  },

  query: {
    executed: (queryId: number, query: string, rowCount: number, duration: number) => {
      logger.info('Query executed', { queryId, query, rowCount, duration, event: 'query.executed' });
    },
    failed: (queryId: number, query: string, error: string) => {
      logger.error('Query failed', { queryId, query, error, event: 'query.failed' });
    },
  },

  export: {
    started: (exportId: number, type: string, recordCount: number) => {
      logger.info('Export started', { exportId, type, recordCount, event: 'export.started' });
    },
    completed: (exportId: number, type: string, filename: string) => {
      logger.info('Export completed', { exportId, type, filename, event: 'export.completed' });
    },
    failed: (exportId: number, type: string, error: string) => {
      logger.error('Export failed', { exportId, type, error, event: 'export.failed' });
    },
  },

  performance: (path: string, method: string, duration: number, statusCode: number) => {
    logger.http('Request performance', { path, method, duration, statusCode });
  },
};

export default logger;
