"""
Message model for real-time chat and communication
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Message(Base):
    """Model for storing chat messages"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    room_name = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(50), default="text", nullable=False)
    
    # Encryption and security
    is_encrypted = Column(Boolean, default=False, nullable=False)
    
    # Message metadata
    meta_json = Column('metadata', JSON, default={})
    
    # Status tracking
    is_edited = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="messages")
    message_reads = relationship("MessageRead", back_populates="message", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_messages_room_created', 'room_name', 'created_at'),
        Index('idx_messages_user_room', 'user_id', 'room_name'),
        Index('idx_messages_room_type', 'room_name', 'message_type'),
    )
    
    def __repr__(self):
        return f"<Message(id={self.id}, user_id={self.user_id}, room='{self.room_name}')>"


class MessageRead(Base):
    """Model for tracking message read status"""
    __tablename__ = "message_reads"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="message_reads")
    user = relationship("User", back_populates="message_reads")
    
    # Indexes
    __table_args__ = (
        Index('idx_message_reads_user_message', 'user_id', 'message_id'),
        Index('idx_message_reads_message_user', 'message_id', 'user_id'),
    )
    
    def __repr__(self):
        return f"<MessageRead(message_id={self.message_id}, user_id={self.user_id})>"


class Room(Base):
    """Model for chat rooms and conversations"""
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    room_type = Column(String(50), default="chat", nullable=False)  # chat, order, quote, support
    
    # Room settings
    is_private = Column(Boolean, default=False, nullable=False)
    is_encrypted = Column(Boolean, default=False, nullable=False)
    max_participants = Column(Integer, default=100, nullable=True)
    
    # Metadata
    meta_json = Column('metadata', JSON, default={})
    description = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    room_participants = relationship("RoomParticipant", back_populates="room", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_rooms_type_active', 'room_type', 'is_active'),
        Index('idx_rooms_private_active', 'is_private', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Room(id={self.id}, name='{self.name}', type='{self.room_type}')>"


class RoomParticipant(Base):
    """Model for room participants and permissions"""
    __tablename__ = "room_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Participant role and permissions
    role = Column(String(50), default="participant", nullable=False)  # admin, moderator, participant
    can_send_messages = Column(Boolean, default=True, nullable=False)
    can_edit_messages = Column(Boolean, default=False, nullable=False)
    can_delete_messages = Column(Boolean, default=False, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_muted = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    left_at = Column(DateTime(timezone=True), nullable=True)
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    room = relationship("Room", back_populates="room_participants")
    user = relationship("User", back_populates="room_participations")
    
    # Indexes
    __table_args__ = (
        Index('idx_room_participants_room_user', 'room_id', 'user_id'),
        Index('idx_room_participants_user_active', 'user_id', 'is_active'),
    )
    
    def __repr__(self):
        return f"<RoomParticipant(room_id={self.room_id}, user_id={self.user_id}, role='{self.role}')>"


class OnlineStatus(Base):
    """Model for tracking user online status"""
    __tablename__ = "online_status"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Status
    status = Column(String(20), default="offline", nullable=False)  # online, away, busy, offline
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Connection info
    connection_count = Column(Integer, default=0, nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Metadata
    meta_json = Column('metadata', JSON, default={})  # Device info, location, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="online_status")
    
    # Indexes
    __table_args__ = (
        Index('idx_online_status_status_updated', 'status', 'updated_at'),
        Index('idx_online_status_last_seen', 'last_seen'),
    )
    
    def __repr__(self):
        return f"<OnlineStatus(user_id={self.user_id}, status='{self.status}')>"


class TypingIndicator(Base):
    """Model for tracking typing indicators"""
    __tablename__ = "typing_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    room_name = Column(String(255), nullable=False)
    
    # Status
    is_typing = Column(Boolean, default=True, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="typing_indicators")
    
    # Indexes
    __table_args__ = (
        Index('idx_typing_indicators_room_user', 'room_name', 'user_id'),
        Index('idx_typing_indicators_updated', 'updated_at'),
    )
    
    def __repr__(self):
        return f"<TypingIndicator(user_id={self.user_id}, room='{self.room_name}')>" 