import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : 'http://localhost:5000',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
      console.log(`[WebSocket] Client ${socket.id} subscribed to ${channel}`);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from ${channel}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initializeWebSocket first.');
  }
  return io;
}

// Event emitters for different data types
export const WebSocketEvents = {
  // Activity events
  ACTIVITY_CREATED: 'activity:created',

  // Scraper events
  SCRAPER_STARTED: 'scraper:started',
  SCRAPER_PROGRESS: 'scraper:progress',
  SCRAPER_COMPLETED: 'scraper:completed',
  SCRAPER_FAILED: 'scraper:failed',

  // Query events
  QUERY_EXECUTED: 'query:executed',
  QUERY_SAVED: 'query:saved',

  // Export events
  EXPORT_STARTED: 'export:started',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_COMPLETED: 'export:completed',
  EXPORT_FAILED: 'export:failed',

  // Social media events
  SOCIAL_DATA_COLLECTED: 'social:collected',
  SENTIMENT_ANALYZED: 'social:analyzed',

  // Stats updates
  STATS_UPDATED: 'stats:updated',

  // Alert events
  ALERT_TRIGGERED: 'alert:triggered',

  // System events
  SYSTEM_STATUS: 'system:status'
} as const;

export type WebSocketEvent = typeof WebSocketEvents[keyof typeof WebSocketEvents];

// Helper to emit events to specific channels
export function emitToChannel(channel: string, event: WebSocketEvent, data: any) {
  const socketIO = getIO();
  socketIO.to(channel).emit(event, {
    timestamp: new Date().toISOString(),
    data
  });
}

// Helper to broadcast events to all connected clients
export function broadcastEvent(event: WebSocketEvent, data: any) {
  const socketIO = getIO();
  socketIO.emit(event, {
    timestamp: new Date().toISOString(),
    data
  });
}
