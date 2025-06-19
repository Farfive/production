# WebSocket Real-time Communication System

## Overview

This document describes the comprehensive real-time communication system built for the manufacturing platform using WebSockets. The system provides real-time messaging, notifications, presence indicators, and collaborative features.

## Architecture

### Core Components

1. **Connection Manager** (`app/core/websocket_config.py`)
   - Manages WebSocket connections
   - Handles user authentication
   - Implements room-based messaging
   - Redis support for horizontal scaling
   - Rate limiting and security

2. **WebSocket Handler** (`app/services/websocket_handler.py`)
   - Message routing and processing
   - Real-time features implementation
   - Typing indicators
   - Presence management

3. **Message Service** (`app/services/message.py`)
   - Message persistence
   - Chat history management
   - Room management
   - Notification handling

4. **Notification Service** (`app/services/realtime_notifications.py`)
   - Order status updates
   - Quote notifications
   - System alerts
   - Push notifications

## Features

### Real-time Messaging
- **Order-specific chat rooms**: Dedicated rooms for each order (`order_{id}`)
- **Quote discussions**: Real-time communication during quote negotiations (`quote_{id}`)
- **Direct messaging**: Private conversations between users (`user_{id1}_{id2}`)
- **Message persistence**: All messages stored in database with history
- **Message encryption**: Sensitive content automatically encrypted
- **Rich message types**: Text, files, images, system notifications

### Live Indicators
- **Typing indicators**: Real-time typing status in conversations
- **Online presence**: User online/offline/away status
- **Read receipts**: Message read status tracking
- **Connection status**: Real-time connection health monitoring

### Notifications
- **Order updates**: Real-time order status changes
- **Quote notifications**: New quotes and updates
- **Payment alerts**: Payment status updates
- **System notifications**: Maintenance and important announcements
- **Deadline reminders**: Approaching deadlines and follow-ups

### Security & Scalability
- **JWT authentication**: Secure WebSocket connections
- **Rate limiting**: Protection against spam and abuse
- **Message encryption**: Automatic encryption for sensitive content
- **Redis clustering**: Horizontal scaling support
- **Connection pooling**: Efficient resource management

## Setup and Configuration

### 1. Install Dependencies

```bash
pip install websockets python-socketio cryptography redis aioredis
```

### 2. Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/1
WEBSOCKET_ENCRYPTION_KEY=your-encryption-key-here

# WebSocket Settings
WEBSOCKET_MAX_CONNECTIONS_PER_IP=10
WEBSOCKET_MESSAGE_RATE_LIMIT=60
WEBSOCKET_CONNECTION_TIMEOUT=1800
```

### 3. Database Migration

```bash
# Run the WebSocket tables migration
alembic upgrade 002_add_websocket_tables
```

### 4. Initialize WebSocket System

```python
from app.api.websocket import initialize_websocket_system
import asyncio

# Initialize during app startup
asyncio.create_task(initialize_websocket_system())
```

## API Documentation

### WebSocket Connection

**Endpoint**: `ws://localhost:8000/ws/connect`

**Query Parameters**:
- `token`: JWT authentication token (required)
- `client_type`: Client type (web, mobile, desktop)
- `client_version`: Client application version
- `device_id`: Unique device identifier

**Example Connection**:
```javascript
const ws = new WebSocket(
  'ws://localhost:8000/ws/connect?token=your-jwt-token&client_type=web'
);
```

### Message Types

#### 1. Chat Message
```json
{
  "type": "chat_message",
  "room": "order_123",
  "content": "Hello, how is the order progressing?",
  "message_type": "text"
}
```

#### 2. Join Room
```json
{
  "type": "join_room",
  "room": "order_123"
}
```

#### 3. Typing Indicators
```json
{
  "type": "typing_start",
  "room": "order_123"
}
```

#### 4. Subscribe to Updates
```json
{
  "type": "subscribe_order_updates",
  "order_id": 123
}
```

### REST API Endpoints

#### Get Room Messages
```http
GET /ws/rooms/{room_name}/messages?limit=50&offset=0
Authorization: Bearer your-jwt-token
```

#### Get User Rooms
```http
GET /ws/rooms
Authorization: Bearer your-jwt-token
```

#### Mark Messages as Read
```http
POST /ws/rooms/{room_name}/mark-read
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "message_ids": [1, 2, 3]
}
```

#### Search Messages
```http
GET /ws/search?query=order%20status&room_name=order_123
Authorization: Bearer your-jwt-token
```

## Client Implementation Examples

### JavaScript/TypeScript Client

```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(token: string) {
    this.token = token;
  }
  
  connect() {
    const wsUrl = `ws://localhost:8000/ws/connect?token=${this.token}&client_type=web`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private handleMessage(message: any) {
    switch (message.type) {
      case 'chat_message':
        this.onChatMessage(message);
        break;
      case 'order_status_update':
        this.onOrderUpdate(message);
        break;
      case 'typing_indicator':
        this.onTypingIndicator(message);
        break;
      case 'presence_update':
        this.onPresenceUpdate(message);
        break;
    }
  }
  
  sendMessage(room: string, content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        room,
        content,
        message_type: 'text'
      }));
    }
  }
  
  joinRoom(room: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join_room',
        room
      }));
    }
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      setTimeout(() => this.connect(), delay);
    }
  }
  
  // Event handlers (implement based on your UI framework)
  private onChatMessage(message: any) { /* Handle new message */ }
  private onOrderUpdate(message: any) { /* Handle order update */ }
  private onTypingIndicator(message: any) { /* Show/hide typing indicator */ }
  private onPresenceUpdate(message: any) { /* Update user presence */ }
}
```

### React Hook Example

```typescript
import { useEffect, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  token: string;
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket({ token, onMessage, onConnect, onDisconnect }: UseWebSocketOptions) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  const connect = useCallback(() => {
    const wsUrl = `ws://localhost:8000/ws/connect?token=${token}&client_type=web`;
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'connection_established') {
        setConnectionId(message.connection_id);
      }
      
      onMessage?.(message);
    };
    
    websocket.onclose = () => {
      setIsConnected(false);
      setConnectionId(null);
      onDisconnect?.();
    };
    
    setWs(websocket);
  }, [token, onMessage, onConnect, onDisconnect]);
  
  const sendMessage = useCallback((message: any) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message));
    }
  }, [ws, isConnected]);
  
  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return {
    isConnected,
    connectionId,
    sendMessage,
    reconnect: connect,
    disconnect
  };
}
```

## Room Types and Naming Convention

### Room Naming Convention
- **Order rooms**: `order_{order_id}` (e.g., `order_123`)
- **Quote rooms**: `quote_{quote_id}` (e.g., `quote_456`)
- **Direct messages**: `user_{user_id1}_{user_id2}` (lower ID first)
- **Support rooms**: `support_{ticket_id}`
- **Public channels**: `channel_{name}`

### Room Access Control
- **Order rooms**: Accessible by customer and assigned manufacturer
- **Quote rooms**: Accessible by customer and manufacturer involved in quote
- **Direct messages**: Only accessible by the two users involved
- **Support rooms**: Accessible by user and support team
- **Public channels**: Accessible by all authenticated users

## Monitoring and Analytics

### Connection Metrics
- Total active connections
- Connections per user
- Room participation statistics
- Message volume by room type
- Error rates and connection stability

### Performance Metrics
- Message delivery latency
- Connection establishment time
- Memory usage per connection
- Redis operation performance
- Database query performance

### Health Checks
```http
GET /ws/health
```

Response:
```json
{
  "status": "success",
  "data": {
    "health_status": "healthy",
    "health_score": 95,
    "redis_connected": true,
    "connection_stats": {
      "total_connections": 245,
      "unique_users": 123,
      "total_rooms": 67
    }
  }
}
```

## Background Tasks and Maintenance

### Celery Tasks
- **Connection cleanup**: Remove stale connections
- **Message archiving**: Archive old messages
- **Notification delivery**: Handle offline notifications
- **Performance monitoring**: Track system health
- **Data synchronization**: Sync with external systems

### Scheduled Maintenance
- **Hourly**: Cleanup stale connections and typing indicators
- **Daily**: Archive old messages and update statistics
- **Weekly**: Generate usage reports and performance analysis
- **Monthly**: Clean up old archived data

## Security Best Practices

### Authentication & Authorization
- JWT token validation for all connections
- Role-based access control for rooms
- Rate limiting per user and IP address
- Connection timeout management

### Data Protection
- Automatic encryption of sensitive messages
- Secure message storage with proper indexing
- Audit logging for all WebSocket operations
- Data retention policies

### Network Security
- WebSocket over SSL/TLS (WSS) in production
- CORS configuration for web clients
- IP allowlisting for administrative operations
- DDoS protection and rate limiting

## Troubleshooting

### Common Issues

#### Connection Drops
```bash
# Check Redis connectivity
redis-cli ping

# Monitor WebSocket connections
curl http://localhost:8000/ws/connection-stats

# Check server logs
tail -f logs/websocket.log
```

#### Message Delivery Issues
```bash
# Check message queue status
celery -A app.core.celery_config inspect active

# Monitor Redis pub/sub
redis-cli monitor

# Check database connections
psql -c "SELECT count(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 hour';"
```

#### Performance Issues
```bash
# Monitor Redis memory usage
redis-cli info memory

# Check connection pool status
curl http://localhost:8000/ws/health

# Monitor database performance
psql -c "SELECT * FROM pg_stat_activity WHERE application_name LIKE '%websocket%';"
```

### Debugging Commands

```bash
# Test WebSocket connection
wscat -c "ws://localhost:8000/ws/connect?token=your-token"

# Monitor Redis traffic
redis-cli monitor | grep websocket

# Check Celery task status
celery -A app.core.celery_config inspect stats

# Database query analysis
psql -c "EXPLAIN ANALYZE SELECT * FROM messages WHERE room_name = 'order_123' ORDER BY created_at DESC LIMIT 50;"
```

## Production Deployment

### Docker Configuration
```yaml
version: '3.8'
services:
  websocket:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/1
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
    depends_on:
      - redis
      - postgres
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Load Balancing
- Use sticky sessions for WebSocket connections
- Configure Redis for session sharing
- Implement connection migration for failover
- Monitor connection distribution across instances

### Scaling Considerations
- Horizontal scaling with Redis pub/sub
- Database read replicas for message history
- CDN for static assets and file uploads
- Monitoring and alerting for capacity planning

## Future Enhancements

### Planned Features
- Voice/video calling integration
- File sharing with real-time upload progress
- Message reactions and emoji support
- Advanced search with full-text indexing
- Mobile push notifications
- Webhook integration for external systems

### Performance Optimizations
- Message batching for high-volume scenarios
- Compressed message protocols
- Edge caching for frequently accessed data
- Database partitioning for message history
- Connection pooling optimization

For more technical details, refer to the source code documentation and inline comments in the respective modules. 