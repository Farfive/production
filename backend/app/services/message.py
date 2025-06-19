"""
Message service for handling chat operations and persistence
"""
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import and_, or_, desc, func
from loguru import logger

from app.core.database import get_db
from app.models.message import Message, MessageRead, Room, RoomParticipant, OnlineStatus, TypingIndicator
from app.models.user import User


class MessageService:
    """Service for handling real-time messages and chat operations"""
    
    def __init__(self):
        pass
    
    async def save_message(self, user_id: int, room_name: str, content: str, 
                          message_type: str = "text", is_encrypted: bool = False,
                          metadata: Dict[str, Any] = None) -> Message:
        """Save a new message to the database"""
        try:
            async with get_db() as db:
                message = Message(
                    user_id=user_id,
                    room_name=room_name,
                    content=content,
                    message_type=message_type,
                    is_encrypted=is_encrypted,
                    metadata=metadata or {}
                )
                
                db.add(message)
                await db.commit()
                await db.refresh(message)
                
                # Load user relationship
                await db.refresh(message, ['user'])
                
                logger.info(f"Message saved: {message.id} in room {room_name}")
                return message
                
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            raise
    
    async def get_room_messages(self, room_name: str, limit: int = 50, 
                               offset: int = 0, user_id: int = None) -> List[Message]:
        """Get messages for a room with pagination"""
        try:
            async with get_db() as db:
                query = db.query(Message).filter(
                    and_(
                        Message.room_name == room_name,
                        Message.is_deleted == False
                    )
                ).options(
                    selectinload(Message.user)
                ).order_by(
                    desc(Message.created_at)
                ).offset(offset).limit(limit)
                
                messages = await query.all()
                
                # Reverse to get chronological order
                return list(reversed(messages))
                
        except Exception as e:
            logger.error(f"Error getting room messages: {str(e)}")
            return []
    
    async def mark_messages_read(self, user_id: int, room_name: str, 
                                message_ids: List[int] = None) -> int:
        """Mark messages as read for a user"""
        try:
            async with get_db() as db:
                # Get messages to mark as read
                query = db.query(Message).filter(
                    and_(
                        Message.room_name == room_name,
                        Message.user_id != user_id,  # Don't mark own messages as read
                        Message.is_deleted == False
                    )
                )
                
                if message_ids:
                    query = query.filter(Message.id.in_(message_ids))
                
                messages = await query.all()
                
                # Mark as read
                read_count = 0
                for message in messages:
                    # Check if already read
                    existing_read = await db.query(MessageRead).filter(
                        and_(
                            MessageRead.message_id == message.id,
                            MessageRead.user_id == user_id
                        )
                    ).first()
                    
                    if not existing_read:
                        message_read = MessageRead(
                            message_id=message.id,
                            user_id=user_id
                        )
                        db.add(message_read)
                        read_count += 1
                
                await db.commit()
                
                logger.info(f"Marked {read_count} messages as read for user {user_id} in room {room_name}")
                return read_count
                
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
            return 0
    
    async def get_unread_message_count(self, user_id: int, room_name: str = None) -> Dict[str, int]:
        """Get unread message count for user (all rooms or specific room)"""
        try:
            async with get_db() as db:
                # Subquery for read messages
                read_subquery = db.query(MessageRead.message_id).filter(
                    MessageRead.user_id == user_id
                ).subquery()
                
                # Query for unread messages
                query = db.query(
                    Message.room_name,
                    func.count(Message.id).label('unread_count')
                ).filter(
                    and_(
                        Message.user_id != user_id,  # Exclude own messages
                        Message.is_deleted == False,
                        ~Message.id.in_(read_subquery)
                    )
                ).group_by(Message.room_name)
                
                if room_name:
                    query = query.filter(Message.room_name == room_name)
                
                result = await query.all()
                
                # Convert to dictionary
                unread_counts = {row.room_name: row.unread_count for row in result}
                
                if room_name:
                    return {room_name: unread_counts.get(room_name, 0)}
                
                return unread_counts
                
        except Exception as e:
            logger.error(f"Error getting unread message count: {str(e)}")
            return {}
    
    async def edit_message(self, message_id: int, user_id: int, new_content: str) -> Optional[Message]:
        """Edit a message (only by the original sender)"""
        try:
            async with get_db() as db:
                message = await db.query(Message).filter(
                    and_(
                        Message.id == message_id,
                        Message.user_id == user_id,  # Only original sender can edit
                        Message.is_deleted == False
                    )
                ).first()
                
                if not message:
                    return None
                
                message.content = new_content
                message.is_edited = True
                message.edited_at = datetime.now()
                
                await db.commit()
                await db.refresh(message)
                
                logger.info(f"Message {message_id} edited by user {user_id}")
                return message
                
        except Exception as e:
            logger.error(f"Error editing message: {str(e)}")
            return None
    
    async def delete_message(self, message_id: int, user_id: int, 
                            is_admin: bool = False) -> bool:
        """Delete a message (soft delete)"""
        try:
            async with get_db() as db:
                query_filter = and_(
                    Message.id == message_id,
                    Message.is_deleted == False
                )
                
                # Only original sender or admin can delete
                if not is_admin:
                    query_filter = and_(query_filter, Message.user_id == user_id)
                
                message = await db.query(Message).filter(query_filter).first()
                
                if not message:
                    return False
                
                message.is_deleted = True
                message.deleted_at = datetime.now()
                
                await db.commit()
                
                logger.info(f"Message {message_id} deleted by user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting message: {str(e)}")
            return False
    
    async def create_room(self, name: str, display_name: str = None, 
                         room_type: str = "chat", is_private: bool = False,
                         is_encrypted: bool = False, created_by: int = None) -> Optional[Room]:
        """Create a new chat room"""
        try:
            async with get_db() as db:
                # Check if room already exists
                existing_room = await db.query(Room).filter(Room.name == name).first()
                if existing_room:
                    return existing_room
                
                room = Room(
                    name=name,
                    display_name=display_name or name,
                    room_type=room_type,
                    is_private=is_private,
                    is_encrypted=is_encrypted
                )
                
                db.add(room)
                await db.commit()
                await db.refresh(room)
                
                # Add creator as admin if specified
                if created_by:
                    await self.add_room_participant(room.id, created_by, role="admin")
                
                logger.info(f"Room created: {name} (type: {room_type})")
                return room
                
        except Exception as e:
            logger.error(f"Error creating room: {str(e)}")
            return None
    
    async def add_room_participant(self, room_id: int, user_id: int, 
                                  role: str = "participant") -> bool:
        """Add a user to a room"""
        try:
            async with get_db() as db:
                # Check if already a participant
                existing = await db.query(RoomParticipant).filter(
                    and_(
                        RoomParticipant.room_id == room_id,
                        RoomParticipant.user_id == user_id,
                        RoomParticipant.is_active == True
                    )
                ).first()
                
                if existing:
                    return True
                
                participant = RoomParticipant(
                    room_id=room_id,
                    user_id=user_id,
                    role=role
                )
                
                db.add(participant)
                await db.commit()
                
                logger.info(f"User {user_id} added to room {room_id} as {role}")
                return True
                
        except Exception as e:
            logger.error(f"Error adding room participant: {str(e)}")
            return False
    
    async def remove_room_participant(self, room_id: int, user_id: int) -> bool:
        """Remove a user from a room"""
        try:
            async with get_db() as db:
                participant = await db.query(RoomParticipant).filter(
                    and_(
                        RoomParticipant.room_id == room_id,
                        RoomParticipant.user_id == user_id,
                        RoomParticipant.is_active == True
                    )
                ).first()
                
                if not participant:
                    return False
                
                participant.is_active = False
                participant.left_at = datetime.now()
                
                await db.commit()
                
                logger.info(f"User {user_id} removed from room {room_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error removing room participant: {str(e)}")
            return False
    
    async def get_user_rooms(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all rooms for a user"""
        try:
            async with get_db() as db:
                query = db.query(Room, RoomParticipant).join(
                    RoomParticipant, Room.id == RoomParticipant.room_id
                ).filter(
                    and_(
                        RoomParticipant.user_id == user_id,
                        RoomParticipant.is_active == True,
                        Room.is_active == True
                    )
                ).order_by(Room.updated_at.desc())
                
                results = await query.all()
                
                rooms = []
                for room, participant in results:
                    # Get last message
                    last_message = await db.query(Message).filter(
                        and_(
                            Message.room_name == room.name,
                            Message.is_deleted == False
                        )
                    ).order_by(desc(Message.created_at)).first()
                    
                    # Get unread count
                    unread_count = await self.get_unread_message_count(user_id, room.name)
                    
                    rooms.append({
                        'id': room.id,
                        'name': room.name,
                        'display_name': room.display_name,
                        'room_type': room.room_type,
                        'is_private': room.is_private,
                        'role': participant.role,
                        'last_message': {
                            'content': last_message.content[:100] if last_message else None,
                            'timestamp': last_message.created_at.isoformat() if last_message else None,
                            'user_name': last_message.user.name if last_message and last_message.user else None
                        } if last_message else None,
                        'unread_count': unread_count.get(room.name, 0),
                        'joined_at': participant.joined_at.isoformat()
                    })
                
                return rooms
                
        except Exception as e:
            logger.error(f"Error getting user rooms: {str(e)}")
            return []
    
    async def update_online_status(self, user_id: int, status: str = "online", 
                                  metadata: Dict[str, Any] = None) -> bool:
        """Update user online status"""
        try:
            async with get_db() as db:
                online_status = await db.query(OnlineStatus).filter(
                    OnlineStatus.user_id == user_id
                ).first()
                
                if online_status:
                    online_status.status = status
                    online_status.last_activity = datetime.now()
                    if status == "online":
                        online_status.connection_count += 1
                    elif status == "offline" and online_status.connection_count > 0:
                        online_status.connection_count -= 1
                    
                    if metadata:
                        if online_status.meta_json is None:
                            online_status.meta_json = {}
                        online_status.meta_json.update(metadata)
                else:
                    online_status = OnlineStatus(
                        user_id=user_id,
                        status=status,
                        connection_count=1 if status == "online" else 0,
                        meta_json=metadata or {}
                    )
                    db.add(online_status)
                
                await db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error updating online status: {str(e)}")
            return False
    
    async def get_online_users(self, room_name: str = None) -> List[Dict[str, Any]]:
        """Get list of online users"""
        try:
            async with get_db() as db:
                query = db.query(OnlineStatus, User).join(
                    User, OnlineStatus.user_id == User.id
                ).filter(
                    OnlineStatus.status.in_(["online", "away", "busy"])
                )
                
                if room_name:
                    # Filter by room participants
                    room = await db.query(Room).filter(Room.name == room_name).first()
                    if room:
                        participant_ids = db.query(RoomParticipant.user_id).filter(
                            and_(
                                RoomParticipant.room_id == room.id,
                                RoomParticipant.is_active == True
                            )
                        ).subquery()
                        
                        query = query.filter(OnlineStatus.user_id.in_(participant_ids))
                
                results = await query.all()
                
                online_users = []
                for status, user in results:
                    online_users.append({
                        'id': user.id,
                        'name': user.name,
                        'email': user.email,
                        'avatar': getattr(user, 'avatar_url', None),
                        'status': status.status,
                        'last_activity': status.last_activity.isoformat(),
                        'connection_count': status.connection_count
                    })
                
                return online_users
                
        except Exception as e:
            logger.error(f"Error getting online users: {str(e)}")
            return []
    
    async def update_typing_status(self, user_id: int, room_name: str, 
                                  is_typing: bool = True) -> bool:
        """Update typing indicator for a user in a room"""
        try:
            async with get_db() as db:
                if is_typing:
                    # Add or update typing indicator
                    typing = await db.query(TypingIndicator).filter(
                        and_(
                            TypingIndicator.user_id == user_id,
                            TypingIndicator.room_name == room_name
                        )
                    ).first()
                    
                    if typing:
                        typing.is_typing = True
                        typing.updated_at = datetime.now()
                    else:
                        typing = TypingIndicator(
                            user_id=user_id,
                            room_name=room_name,
                            is_typing=True
                        )
                        db.add(typing)
                else:
                    # Remove typing indicator
                    await db.query(TypingIndicator).filter(
                        and_(
                            TypingIndicator.user_id == user_id,
                            TypingIndicator.room_name == room_name
                        )
                    ).delete()
                
                await db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error updating typing status: {str(e)}")
            return False
    
    async def get_typing_users(self, room_name: str) -> List[Dict[str, Any]]:
        """Get users currently typing in a room"""
        try:
            async with get_db() as db:
                # Clean up old typing indicators (older than 30 seconds)
                cutoff_time = datetime.now() - timedelta(seconds=30)
                await db.query(TypingIndicator).filter(
                    TypingIndicator.updated_at < cutoff_time
                ).delete()
                
                # Get current typing users
                query = db.query(TypingIndicator, User).join(
                    User, TypingIndicator.user_id == User.id
                ).filter(
                    and_(
                        TypingIndicator.room_name == room_name,
                        TypingIndicator.is_typing == True
                    )
                )
                
                results = await query.all()
                
                typing_users = []
                for typing, user in results:
                    typing_users.append({
                        'id': user.id,
                        'name': user.name,
                        'started_at': typing.started_at.isoformat()
                    })
                
                return typing_users
                
        except Exception as e:
            logger.error(f"Error getting typing users: {str(e)}")
            return []
    
    async def search_messages(self, query: str, user_id: int, room_name: str = None,
                             limit: int = 50) -> List[Dict[str, Any]]:
        """Search messages by content"""
        try:
            async with get_db() as db:
                # Build search query
                search_query = db.query(Message).options(
                    selectinload(Message.user)
                ).filter(
                    and_(
                        Message.content.ilike(f"%{query}%"),
                        Message.is_deleted == False
                    )
                )
                
                if room_name:
                    search_query = search_query.filter(Message.room_name == room_name)
                else:
                    # Only search in rooms user has access to
                    accessible_rooms = db.query(RoomParticipant.room_id).join(
                        Room, RoomParticipant.room_id == Room.id
                    ).filter(
                        and_(
                            RoomParticipant.user_id == user_id,
                            RoomParticipant.is_active == True
                        )
                    ).subquery()
                    
                    search_query = search_query.join(
                        Room, Message.room_name == Room.name
                    ).filter(Room.id.in_(accessible_rooms))
                
                messages = await search_query.order_by(
                    desc(Message.created_at)
                ).limit(limit).all()
                
                # Format results
                results = []
                for message in messages:
                    results.append({
                        'message_id': message.id,
                        'room_name': message.room_name,
                        'user': {
                            'id': message.user_id,
                            'name': message.user.name if message.user else 'Unknown'
                        },
                        'content': message.content,
                        'message_type': message.message_type,
                        'timestamp': message.created_at.isoformat(),
                        'is_encrypted': message.is_encrypted
                    })
                
                return results
                
        except Exception as e:
            logger.error(f"Error searching messages: {str(e)}")
            return []
    
    async def cleanup_old_data(self, days_old: int = 90) -> Dict[str, int]:
        """Clean up old messages and data"""
        try:
            async with get_db() as db:
                cutoff_date = datetime.now() - timedelta(days=days_old)
                
                # Delete old typing indicators
                typing_deleted = await db.query(TypingIndicator).filter(
                    TypingIndicator.updated_at < cutoff_date
                ).delete()
                
                # Delete old message reads for deleted messages
                read_deleted = await db.query(MessageRead).join(
                    Message, MessageRead.message_id == Message.id
                ).filter(
                    Message.deleted_at < cutoff_date
                ).delete()
                
                # Archive old messages (don't delete, just mark as archived)
                # This is safer than hard deletion
                
                await db.commit()
                
                return {
                    'typing_indicators_deleted': typing_deleted,
                    'message_reads_deleted': read_deleted
                }
                
        except Exception as e:
            logger.error(f"Error cleaning up old data: {str(e)}")
            return {}
    
    async def get_room_statistics(self, room_name: str) -> Dict[str, Any]:
        """Get statistics for a room"""
        try:
            async with get_db() as db:
                # Total messages
                total_messages = await db.query(func.count(Message.id)).filter(
                    and_(
                        Message.room_name == room_name,
                        Message.is_deleted == False
                    )
                ).scalar()
                
                # Unique participants
                unique_participants = await db.query(
                    func.count(func.distinct(Message.user_id))
                ).filter(
                    and_(
                        Message.room_name == room_name,
                        Message.is_deleted == False
                    )
                ).scalar()
                
                # Last activity
                last_message = await db.query(Message).filter(
                    and_(
                        Message.room_name == room_name,
                        Message.is_deleted == False
                    )
                ).order_by(desc(Message.created_at)).first()
                
                return {
                    'room_name': room_name,
                    'total_messages': total_messages or 0,
                    'unique_participants': unique_participants or 0,
                    'last_activity': last_message.created_at.isoformat() if last_message else None,
                    'created_at': last_message.created_at.isoformat() if last_message else None
                }
                
        except Exception as e:
            logger.error(f"Error getting room statistics: {str(e)}")
            return {} 