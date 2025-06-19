"""
Security Database Models
Comprehensive models for security logging, monitoring, and management
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Dict, Any, Optional

from app.core.database import Base

class SecurityEvent(Base):
    """Security events and incidents"""
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    risk_level = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    details = Column(JSON, nullable=True)
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="security_events")
    resolver = relationship("User", foreign_keys=[resolved_by])
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_security_events_timestamp_risk', 'timestamp', 'risk_level'),
        Index('idx_security_events_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_security_events_ip_timestamp', 'ip_address', 'timestamp'),
    )

class LoginAttempt(Base):
    """Login attempt tracking"""
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    success = Column(Boolean, nullable=False, index=True)
    failure_reason = Column(String(255), nullable=True)
    mfa_used = Column(Boolean, default=False, nullable=False)
    session_id = Column(String(255), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="login_attempts")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_login_attempts_ip_timestamp', 'ip_address', 'timestamp'),
        Index('idx_login_attempts_user_success', 'user_id', 'success'),
        Index('idx_login_attempts_timestamp_success', 'timestamp', 'success'),
    )

class SecurityAudit(Base):
    """Security audit records"""
    __tablename__ = "security_audits"
    
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(255), unique=True, nullable=False, index=True)
    audit_type = Column(String(100), nullable=False, index=True)  # access, permissions, data, compliance
    scope = Column(String(255), nullable=False)
    parameters = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="initiated", index=True)
    findings = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    initiator = relationship("User", back_populates="initiated_audits")

class SecurityScan(Base):
    """Security scan records"""
    __tablename__ = "security_scans"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String(255), unique=True, nullable=False, index=True)
    scan_type = Column(String(100), nullable=False, index=True)  # vulnerability, penetration, compliance
    target = Column(String(255), nullable=False)
    options = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="initiated", index=True)
    results = Column(JSON, nullable=True)
    vulnerabilities_found = Column(Integer, default=0, nullable=False)
    risk_score = Column(Integer, nullable=True)  # 0-100
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    initiator = relationship("User", back_populates="initiated_scans")

class ThreatIndicator(Base):
    """Threat intelligence indicators"""
    __tablename__ = "threat_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    indicator_type = Column(String(50), nullable=False, index=True)  # ip, domain, hash, url, email
    indicator_value = Column(String(500), nullable=False, index=True)
    threat_type = Column(String(100), nullable=False, index=True)  # malware, phishing, botnet, etc.
    confidence = Column(Integer, nullable=False)  # 0-100
    description = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    tags = Column(JSON, nullable=True)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    added_by_user = relationship("User", back_populates="added_threat_indicators")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_threat_indicators_type_value', 'indicator_type', 'indicator_value'),
        Index('idx_threat_indicators_threat_type', 'threat_type'),
        Index('idx_threat_indicators_active_confidence', 'is_active', 'confidence'),
    )

class APIKey(Base):
    """API key management"""
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA256 hash
    permissions = Column(JSON, nullable=False, default=list)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")

class SecurityPolicy(Base):
    """Security policy configurations"""
    __tablename__ = "security_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    policy_type = Column(String(100), nullable=False, unique=True, index=True)
    settings = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

class SecurityIncident(Base):
    """Security incident management"""
    __tablename__ = "security_incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), nullable=False, default="open", index=True)  # open, investigating, resolved, closed
    category = Column(String(100), nullable=False, index=True)  # data_breach, malware, unauthorized_access, etc.
    affected_systems = Column(JSON, nullable=True)
    indicators_of_compromise = Column(JSON, nullable=True)
    timeline = Column(JSON, nullable=True)
    response_actions = Column(JSON, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    detected_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    reporter = relationship("User", foreign_keys=[reported_by])

class SecurityConfiguration(Base):
    """System security configurations"""
    __tablename__ = "security_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(255), nullable=False, unique=True, index=True)
    config_value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # auth, encryption, monitoring, etc.
    is_sensitive = Column(Boolean, default=False, nullable=False)  # If true, value should be encrypted
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserSession(Base):
    """Active user sessions"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_sessions_user_active', 'user_id', 'is_active'),
        Index('idx_user_sessions_expires_active', 'expires_at', 'is_active'),
    )

class SecurityMetric(Base):
    """Security metrics and KPIs"""
    __tablename__ = "security_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(255), nullable=False, index=True)
    metric_value = Column(JSON, nullable=False)  # Can store numbers, arrays, objects
    metric_type = Column(String(50), nullable=False, index=True)  # counter, gauge, histogram
    category = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    tags = Column(JSON, nullable=True)  # Additional metadata
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_security_metrics_name_timestamp', 'metric_name', 'timestamp'),
        Index('idx_security_metrics_category_timestamp', 'category', 'timestamp'),
    )

class ComplianceReport(Base):
    """Compliance assessment reports"""
    __tablename__ = "compliance_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(255), unique=True, nullable=False, index=True)
    framework = Column(String(100), nullable=False, index=True)  # GDPR, SOC2, ISO27001, etc.
    scope = Column(String(255), nullable=False)
    score = Column(Integer, nullable=False)  # 0-100
    requirements_met = Column(Integer, nullable=False)
    total_requirements = Column(Integer, nullable=False)
    findings = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    evidence = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="draft")
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Relationships
    generator = relationship("User", foreign_keys=[generated_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

class SecurityTraining(Base):
    """Security training and awareness"""
    __tablename__ = "security_training"
    
    id = Column(Integer, primary_key=True, index=True)
    training_id = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # phishing, data_protection, access_control
    difficulty_level = Column(String(20), nullable=False)  # beginner, intermediate, advanced
    content = Column(JSON, nullable=True)  # Training content and materials
    quiz_questions = Column(JSON, nullable=True)
    passing_score = Column(Integer, default=80, nullable=False)
    is_mandatory = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="created_trainings")

class SecurityTrainingCompletion(Base):
    """User training completion records"""
    __tablename__ = "security_training_completions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    training_id = Column(Integer, ForeignKey("security_training.id"), nullable=False, index=True)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)  # Quiz score if applicable
    passed = Column(Boolean, nullable=True)
    attempts = Column(Integer, default=1, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="training_completions")
    training = relationship("SecurityTraining", back_populates="completions")
    
    # Unique constraint to prevent duplicate completions
    __table_args__ = (
        Index('idx_training_completions_user_training', 'user_id', 'training_id'),
    )

# Add relationships to existing User model (would be added to user.py)
"""
Add these relationships to the User model:

security_events = relationship("SecurityEvent", foreign_keys="SecurityEvent.user_id", back_populates="user")
login_attempts = relationship("LoginAttempt", back_populates="user")
initiated_audits = relationship("SecurityAudit", back_populates="initiator")
initiated_scans = relationship("SecurityScan", back_populates="initiator")
added_threat_indicators = relationship("ThreatIndicator", back_populates="added_by_user")
api_keys = relationship("APIKey", back_populates="user")
sessions = relationship("UserSession", back_populates="user")
created_trainings = relationship("SecurityTraining", back_populates="creator")
training_completions = relationship("SecurityTrainingCompletion", back_populates="user")

# Add MFA fields to User model:
mfa_enabled = Column(Boolean, default=False, nullable=False)
mfa_secret = Column(Text, nullable=True)  # Encrypted TOTP secret
mfa_backup_codes = Column(Text, nullable=True)  # Encrypted backup codes
""" 