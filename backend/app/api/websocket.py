"""
WebSocket API endpoints for real-time communication
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.security import HTTPBearer
from loguru import logger

from app.core.websocket_config import connection_manager
from app.services.websocket_handler import websocket_handler
from app.services.message import MessageService
from app.core.security import get_current_user
from app.models.user import User


router = APIRouter(prefix="/ws", tags=["websocket"])
security = HTTPBearer()


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
    client_type: str = Query("web", description="Client type (web, mobile, desktop)"),
    client_version: str = Query("1.0.0", description="Client version"),
    device_id: str = Query(None, description="Unique device identifier")
):
    """
    Main WebSocket connection endpoint
    
    Query parameters:
    - token: JWT authentication token
    - client_type: Type of client (web, mobile, desktop)
    - client_version: Version of the client application
    - device_id: Unique device identifier for tracking
    """
    client_info = {
        'client_type': client_type,
        'client_version': client_version,
        'device_id': device_id,
        'user_agent': websocket.headers.get('user-agent', ''),
        'ip_address': websocket.client.host if websocket.client else None
    }
    
    await websocket_handler.handle_connection(websocket, token, client_info)


@router.get("/connection-stats")
async def get_connection_stats(current_user: User = Depends(get_current_user)):
    """Get current connection statistics"""
    try:
        stats = connection_manager.get_connection_stats()
        
        return {
            "status": "success",
            "data": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{room_name}/info")
async def get_room_info(
    room_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get information about a specific room"""
    try:
        message_service = MessageService()
        
        # Validate room access
        if not await websocket_handler._validate_room_access(current_user.id, room_name):
            raise HTTPException(status_code=403, detail="Access denied to room")
        
        # Get room statistics
        stats = await message_service.get_room_statistics(room_name)
        
        # Get online users in room
        online_users = await websocket_handler._get_room_online_users(room_name)
        
        # Get typing users
        typing_users = await message_service.get_typing_users(room_name)
        
        return {
            "status": "success",
            "data": {
                "room_name": room_name,
                "statistics": stats,
                "online_users": online_users,
                "typing_users": typing_users,
                "user_has_access": True
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms")
async def get_user_rooms(current_user: User = Depends(get_current_user)):
    """Get all rooms for the authenticated user"""
    try:
        message_service = MessageService()
        
        rooms = await message_service.get_user_rooms(current_user.id)
        
        return {
            "status": "success",
            "data": {
                "rooms": rooms,
                "total_rooms": len(rooms)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{room_name}/messages")
async def get_room_messages(
    room_name: str,
    limit: int = Query(50, description="Number of messages to retrieve", le=100),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: User = Depends(get_current_user)
):
    """Get message history for a room"""
    try:
        message_service = MessageService()
        
        # Validate room access
        if not await websocket_handler._validate_room_access(current_user.id, room_name):
            raise HTTPException(status_code=403, detail="Access denied to room")
        
        # Get messages
        messages = await message_service.get_room_messages(
            room_name=room_name,
            limit=limit,
            offset=offset,
            user_id=current_user.id
        )
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            content = msg.content
            
            # Decrypt if encrypted and user has access
            if msg.is_encrypted:
                try:
                    if await websocket_handler._can_decrypt_message(current_user.id, msg):
                        content = connection_manager.decrypt_sensitive_message(msg.content)
                    else:
                        content = "[Encrypted Message]"
                except:
                    content = "[Decryption Failed]"
            
            formatted_messages.append({
                'message_id': msg.id,
                'user': {
                    'id': msg.user_id,
                    'name': msg.user.name if msg.user else 'Unknown',
                    'avatar': getattr(msg.user, 'avatar_url', None) if msg.user else None
                },
                'content': content,
                'message_type': msg.message_type,
                'timestamp': msg.created_at.isoformat(),
                'is_encrypted': msg.is_encrypted,
                'is_edited': msg.is_edited,
                'edited_at': msg.edited_at.isoformat() if msg.edited_at else None
            })
        
        return {
            "status": "success",
            "data": {
                "room_name": room_name,
                "messages": formatted_messages,
                "has_more": len(messages) == limit,
                "total_retrieved": len(messages)
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{room_name}/unread-count")
async def get_unread_count(
    room_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get unread message count for a room"""
    try:
        message_service = MessageService()
        
        # Validate room access
        if not await websocket_handler._validate_room_access(current_user.id, room_name):
            raise HTTPException(status_code=403, detail="Access denied to room")
        
        unread_counts = await message_service.get_unread_message_count(
            user_id=current_user.id,
            room_name=room_name
        )
        
        return {
            "status": "success",
            "data": {
                "room_name": room_name,
                "unread_count": unread_counts.get(room_name, 0)
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rooms/{room_name}/mark-read")
async def mark_messages_read(
    room_name: str,
    message_ids: list[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Mark messages as read in a room"""
    try:
        message_service = MessageService()
        
        # Validate room access
        if not await websocket_handler._validate_room_access(current_user.id, room_name):
            raise HTTPException(status_code=403, detail="Access denied to room")
        
        read_count = await message_service.mark_messages_read(
            user_id=current_user.id,
            room_name=room_name,
            message_ids=message_ids
        )
        
        return {
            "status": "success",
            "data": {
                "room_name": room_name,
                "messages_marked_read": read_count
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/online-users")
async def get_online_users(
    room_name: str = Query(None, description="Filter by room"),
    current_user: User = Depends(get_current_user)
):
    """Get list of online users"""
    try:
        message_service = MessageService()
        
        # If room specified, validate access
        if room_name:
            if not await websocket_handler._validate_room_access(current_user.id, room_name):
                raise HTTPException(status_code=403, detail="Access denied to room")
        
        online_users = await message_service.get_online_users(room_name)
        
        return {
            "status": "success",
            "data": {
                "room_name": room_name,
                "online_users": online_users,
                "total_online": len(online_users)
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_messages(
    query: str = Query(..., description="Search query"),
    room_name: str = Query(None, description="Search in specific room"),
    limit: int = Query(50, description="Maximum results", le=100),
    current_user: User = Depends(get_current_user)
):
    """Search messages by content"""
    try:
        message_service = MessageService()
        
        # If room specified, validate access
        if room_name:
            if not await websocket_handler._validate_room_access(current_user.id, room_name):
                raise HTTPException(status_code=403, detail="Access denied to room")
        
        results = await message_service.search_messages(
            query=query,
            user_id=current_user.id,
            room_name=room_name,
            limit=limit
        )
        
        return {
            "status": "success",
            "data": {
                "query": query,
                "room_name": room_name,
                "results": results,
                "total_results": len(results)
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def websocket_health():
    """Get WebSocket system health status"""
    try:
        # Get connection stats
        stats = connection_manager.get_connection_stats()
        
        # Check Redis connection
        redis_healthy = False
        try:
            if connection_manager.redis:
                await connection_manager.redis.ping()
                redis_healthy = True
        except:
            pass
        
        # Calculate health score
        health_score = 100
        if not redis_healthy:
            health_score -= 30
        
        if stats['total_connections'] > 1000:  # High load
            health_score -= 20
        
        status = "healthy" if health_score >= 80 else "degraded" if health_score >= 50 else "unhealthy"
        
        return {
            "status": "success",
            "data": {
                "health_status": status,
                "health_score": health_score,
                "redis_connected": redis_healthy,
                "connection_stats": stats,
                "checks": {
                    "redis_connection": redis_healthy,
                    "high_load": stats['total_connections'] < 1000
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket utility endpoints for administration
@router.post("/admin/broadcast")
async def admin_broadcast_message(
    message_data: dict,
    room_name: str = None,
    current_user: User = Depends(get_current_user)  # Add admin check here
):
    """Admin endpoint to broadcast messages"""
    try:
        # Check if user is admin (implement your admin check)
        if not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        broadcast_message = {
            "type": "admin_broadcast",
            "message": message_data.get("message", ""),
            "timestamp": datetime.now().isoformat(),
            "sender": "System Administrator"
        }
        
        if room_name:
            await connection_manager.broadcast_to_room(room_name, broadcast_message)
        else:
            # Broadcast to all connections
            for connection_id in connection_manager.active_connections.keys():
                await connection_manager.send_personal_message(connection_id, broadcast_message)
        
        return {
            "status": "success",
            "data": {
                "message_sent": True,
                "room_name": room_name,
                "recipients": len(connection_manager.room_connections.get(room_name, {})) if room_name else len(connection_manager.active_connections)
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/disconnect-user")
async def admin_disconnect_user(
    user_id: int,
    reason: str = "Administrative action",
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to disconnect a specific user"""
    try:
        # Check if user is admin
        if not getattr(current_user, 'is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        disconnected_connections = 0
        
        if user_id in connection_manager.user_connections:
            connection_ids = connection_manager.user_connections[user_id].copy()
            
            for connection_id in connection_ids:
                # Send disconnect message
                await connection_manager.send_personal_message(connection_id, {
                    "type": "forced_disconnect",
                    "reason": reason,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Disconnect
                await connection_manager.disconnect(connection_id)
                disconnected_connections += 1
        
        return {
            "status": "success",
            "data": {
                "user_id": user_id,
                "disconnected_connections": disconnected_connections,
                "reason": reason
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Background task to cleanup stale connections and typing indicators
async def cleanup_background_task():
    """Background task for cleanup operations"""
    while True:
        try:
            # Cleanup stale connections (every 5 minutes)
            await connection_manager.cleanup_stale_connections(timeout_minutes=30)
            
            # Cleanup typing indicators (every minute)
            await websocket_handler.cleanup_typing_indicators(timeout_seconds=30)
            
            # Sleep for 1 minute
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Background cleanup error: {str(e)}")
            await asyncio.sleep(60)


# Initialize background tasks and Redis when the module loads
async def initialize_websocket_system():
    """Initialize WebSocket system components"""
    try:
        # Initialize Redis connections
        await connection_manager.initialize_redis()
        
        # Start background cleanup task
        asyncio.create_task(cleanup_background_task())
        
        logger.info("WebSocket system initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize WebSocket system: {str(e)}")


# Call initialization (this should be called during app startup)
# asyncio.create_task(initialize_websocket_system()) 