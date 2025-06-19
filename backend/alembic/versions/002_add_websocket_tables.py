"""Add WebSocket and messaging tables

Revision ID: 002_add_websocket_tables
Revises: 001_initial_migration
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_websocket_tables'
down_revision = '001_initial_migration'
branch_labels = None
depends_on = None


def upgrade():
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('room_name', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(50), nullable=False),
        sa.Column('is_encrypted', sa.Boolean(), nullable=False, default=False),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('is_edited', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for messages
    op.create_index('idx_messages_room_created', 'messages', ['room_name', 'created_at'])
    op.create_index('idx_messages_user_room', 'messages', ['user_id', 'room_name'])
    op.create_index('idx_messages_room_type', 'messages', ['room_name', 'message_type'])
    op.create_index(op.f('ix_messages_id'), 'messages', ['id'])
    op.create_index(op.f('ix_messages_user_id'), 'messages', ['user_id'])
    op.create_index(op.f('ix_messages_room_name'), 'messages', ['room_name'])
    
    # Create message_reads table
    op.create_table(
        'message_reads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for message_reads
    op.create_index('idx_message_reads_user_message', 'message_reads', ['user_id', 'message_id'])
    op.create_index('idx_message_reads_message_user', 'message_reads', ['message_id', 'user_id'])
    
    # Create rooms table
    op.create_table(
        'rooms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('room_type', sa.String(50), nullable=False, default='chat'),
        sa.Column('is_private', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_encrypted', sa.Boolean(), nullable=False, default=False),
        sa.Column('max_participants', sa.Integer(), nullable=True),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create indexes for rooms
    op.create_index('idx_rooms_type_active', 'rooms', ['room_type', 'is_active'])
    op.create_index('idx_rooms_private_active', 'rooms', ['is_private', 'is_active'])
    op.create_index(op.f('ix_rooms_id'), 'rooms', ['id'])
    op.create_index(op.f('ix_rooms_name'), 'rooms', ['name'])
    
    # Create room_participants table
    op.create_table(
        'room_participants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, default='participant'),
        sa.Column('can_send_messages', sa.Boolean(), nullable=False, default=True),
        sa.Column('can_edit_messages', sa.Boolean(), nullable=False, default=False),
        sa.Column('can_delete_messages', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_muted', sa.Boolean(), nullable=False, default=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for room_participants
    op.create_index('idx_room_participants_room_user', 'room_participants', ['room_id', 'user_id'])
    op.create_index('idx_room_participants_user_active', 'room_participants', ['user_id', 'is_active'])
    
    # Create online_status table
    op.create_table(
        'online_status',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='offline'),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('connection_count', sa.Integer(), nullable=False, default=0),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create indexes for online_status
    op.create_index('idx_online_status_status_updated', 'online_status', ['status', 'updated_at'])
    op.create_index('idx_online_status_last_seen', 'online_status', ['last_seen'])
    
    # Create typing_indicators table
    op.create_table(
        'typing_indicators',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('room_name', sa.String(255), nullable=False),
        sa.Column('is_typing', sa.Boolean(), nullable=False, default=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for typing_indicators
    op.create_index('idx_typing_indicators_room_user', 'typing_indicators', ['room_name', 'user_id'])
    op.create_index('idx_typing_indicators_updated', 'typing_indicators', ['updated_at'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('typing_indicators')
    op.drop_table('online_status')
    op.drop_table('room_participants')
    op.drop_table('rooms')
    op.drop_table('message_reads')
    op.drop_table('messages') 