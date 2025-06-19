import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
}

const useWebSocket = (
  url: string = process.env.REACT_APP_WS_URL || 'ws://localhost:3001'
): UseWebSocketReturn => {
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000);

  const connect = useCallback(() => {
    if (socket?.connected || !user || !token) return;

    console.log('Connecting to WebSocket...');
    
    const newSocket = io(url, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectDelayRef.current,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      reconnectDelayRef.current = 1000;
      
      // Join user-specific room
      newSocket.emit('join-user-room', user.id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // Attempt to reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Server initiated disconnect or client initiated disconnect
        return;
      }
      
      attemptReconnect();
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
      attemptReconnect();
    });

    // Authentication events
    newSocket.on('auth_error', (error) => {
      console.error('WebSocket authentication error:', error);
      // Handle auth errors by clearing token and redirecting to login
      disconnect();
    });

    // Heartbeat/ping events
    newSocket.on('ping', () => {
      newSocket.emit('pong');
    });

    setSocket(newSocket);
  }, [user, token, url]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    
    console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${reconnectDelayRef.current}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000); // Exponential backoff up to 30s
    }, reconnectDelayRef.current);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      console.log('Disconnecting WebSocket...');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }, [socket]);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (!socket) {
      console.warn('Cannot subscribe to event: WebSocket not available');
      return () => {};
    }

    socket.on(event, callback);
    
    // Return unsubscribe function
    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user && token && !socket) {
      connect();
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, token, socket, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, we might want to reduce activity
        return;
      }
      
      // Page is visible again, ensure connection is active
      if (user && token && !socket?.connected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, token, socket, connect]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (user && token && !socket?.connected) {
        connect();
      }
    };

    const handleOffline = () => {
      // Optionally disconnect when offline to prevent connection errors
      // disconnect();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, token, socket, connect]);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    subscribe,
  };
};

export default useWebSocket; 