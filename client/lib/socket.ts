import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback } from 'react';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  }

  return socket;
}

// React hook for subscribing to WebSocket events
export function useWebSocket<T = any>(
  event: string,
  handler: (data: { timestamp: string; data: T }) => void,
  deps: any[] = []
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    ws.on('connect', onConnect);
    ws.on('disconnect', onDisconnect);
    ws.on(event, handler);

    setIsConnected(ws.connected);

    return () => {
      ws.off('connect', onConnect);
      ws.off('disconnect', onDisconnect);
      ws.off(event, handler);
    };
  }, [event, ...deps]);

  return { isConnected, socket: getSocket() };
}

// Hook for subscribing to specific channels
export function useWebSocketChannel(channel: string) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const ws = getSocket();

    ws.emit('subscribe', channel);
    setIsSubscribed(true);

    return () => {
      ws.emit('unsubscribe', channel);
      setIsSubscribed(false);
    };
  }, [channel]);

  return { isSubscribed };
}

// Utility function to emit events
export function emitEvent(event: string, data: any) {
  const ws = getSocket();
  ws.emit(event, data);
}
