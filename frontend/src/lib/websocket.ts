export interface WebSocketMessage {
  type: 'supply_chain_update' | 'order_update' | 'quote_update' | 'notification';
  data: any;
  timestamp: string;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;

    try {
      // Use environment variable for WebSocket URL, fallback to localhost
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send authentication if needed
        this.send({
          type: 'auth',
          data: { token: localStorage.getItem('auth_token') }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms... (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle all messages with wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error handling WebSocket message with wildcard handler:', error);
      }
    });
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', data);
    }
  }

  public subscribe(eventType: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Supply Chain specific methods
  public subscribeToSupplyChainUpdates(handler: (data: any) => void): () => void {
    return this.subscribe('supply_chain_update', (message) => {
      handler(message.data);
    });
  }

  public subscribeToOrderUpdates(handler: (data: any) => void): () => void {
    return this.subscribe('order_update', (message) => {
      handler(message.data);
    });
  }

  public subscribeToQuoteUpdates(handler: (data: any) => void): () => void {
    return this.subscribe('quote_update', (message) => {
      handler(message.data);
    });
  }

  public subscribeToNotifications(handler: (data: any) => void): () => void {
    return this.subscribe('notification', (message) => {
      handler(message.data);
    });
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

// Hook for React components
export const useWebSocket = () => {
  const subscribe = (eventType: string, handler: WebSocketEventHandler) => {
    return websocketService.subscribe(eventType, handler);
  };

  const send = (data: any) => {
    websocketService.send(data);
  };

  const isConnected = () => {
    return websocketService.isConnected();
  };

  return {
    subscribe,
    send,
    isConnected,
    subscribeToSupplyChainUpdates: websocketService.subscribeToSupplyChainUpdates.bind(websocketService),
    subscribeToOrderUpdates: websocketService.subscribeToOrderUpdates.bind(websocketService),
    subscribeToQuoteUpdates: websocketService.subscribeToQuoteUpdates.bind(websocketService),
    subscribeToNotifications: websocketService.subscribeToNotifications.bind(websocketService)
  };
}; 