"""
Security Management API Endpoints
Advanced security controls and monitoring for the manufacturing platform
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import secrets
import qrcode
from io import BytesIO
import base64

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.security import (
    PasswordSecurity, TokenSecurity, EncryptionSecurity, MFASecurity,
    SecurityAuditLogger, RateLimiter, SecurityConfig, generate_api_key,
    hash_api_key, verify_api_key
)
from app.core.security_middleware import SecurityEventDetector
from app.core.database import get_db
from app.models.user import User
from app.models.security_log import SecurityLog, LoginAttempt, SecurityEvent

router = APIRouter(prefix="/security", tags=["security"])
security = HTTPBearer()
audit_logger = SecurityAuditLogger()
event_detector = SecurityEventDetector()

# Pydantic Models
class SecurityEventResponse(BaseModel):
    id: int
    event_type: str
    user_id: Optional[int]
    ip_address: str
    timestamp: datetime
    risk_level: str
    details: Dict[str, Any]

class SecurityStatsResponse(BaseModel):
    total_events: int
    high_risk_events: int
    failed_logins: int
    blocked_ips: int
    active_sessions: int
    security_score: int

class MFASetupRequest(BaseModel):
    user_id: int

class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]

class MFAVerifyRequest(BaseModel):
    user_id: int
    token: str

class APIKeyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    expires_at: Optional[datetime] = None

class APIKeyResponse(BaseModel):
    id: int
    name: str
    key: str  # Only returned once during creation
    permissions: List[str]
    created_at: datetime
    expires_at: Optional[datetime]

class SecurityPolicyRequest(BaseModel):
    policy_type: str
    settings: Dict[str, Any]

class ThreatIntelRequest(BaseModel):
    indicator_type: str  # ip, domain, hash, etc.
    indicator_value: str
    threat_type: str
    confidence: int = Field(ge=0, le=100)
    description: Optional[str] = None

class SecurityScanRequest(BaseModel):
    scan_type: str  # vulnerability, penetration, compliance
    target: str
    options: Dict[str, Any] = {}

class SecurityAuditRequest(BaseModel):
    audit_type: str  # access, permissions, data, compliance
    scope: str
    parameters: Dict[str, Any] = {}

class IncidentResponse(BaseModel):
    incident_id: str
    severity: str
    status: str
    description: str
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ComplianceReportResponse(BaseModel):
    framework: str  # GDPR, SOC2, ISO27001, etc.
    score: int
    requirements_met: int
    total_requirements: int
    findings: List[Dict[str, Any]]
    recommendations: List[str]

# Helper Functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = TokenSecurity.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

def require_admin(user: User = Depends(get_current_user)):
    """Require admin privileges"""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user

# Security Event Endpoints
@router.get("/events", response_model=List[SecurityEventResponse])
async def get_security_events(
    limit: int = 100,
    offset: int = 0,
    risk_level: Optional[str] = None,
    event_type: Optional[str] = None,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get security events with filtering"""
    query = db.query(SecurityEvent)
    
    if risk_level:
        query = query.filter(SecurityEvent.risk_level == risk_level)
    
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
    
    events = query.order_by(SecurityEvent.timestamp.desc()).offset(offset).limit(limit).all()
    
    return [SecurityEventResponse(
        id=event.id,
        event_type=event.event_type,
        user_id=event.user_id,
        ip_address=event.ip_address,
        timestamp=event.timestamp,
        risk_level=event.risk_level,
        details=event.details
    ) for event in events]

@router.get("/stats", response_model=SecurityStatsResponse)
async def get_security_stats(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get security statistics"""
    # Calculate various security metrics
    total_events = db.query(SecurityEvent).count()
    high_risk_events = db.query(SecurityEvent).filter(SecurityEvent.risk_level == "HIGH").count()
    failed_logins = db.query(LoginAttempt).filter(LoginAttempt.success == False).count()
    
    # Calculate security score based on recent events
    recent_date = datetime.utcnow() - timedelta(days=7)
    recent_incidents = db.query(SecurityEvent).filter(
        SecurityEvent.timestamp >= recent_date,
        SecurityEvent.risk_level.in_(["HIGH", "CRITICAL"])
    ).count()
    
    security_score = max(0, 100 - (recent_incidents * 10))
    
    return SecurityStatsResponse(
        total_events=total_events,
        high_risk_events=high_risk_events,
        failed_logins=failed_logins,
        blocked_ips=0,  # Would be calculated from blocked IP list
        active_sessions=0,  # Would be calculated from active sessions
        security_score=security_score
    )

# Multi-Factor Authentication Endpoints
@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    request: MFASetupRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup Multi-Factor Authentication for user"""
    if user.id != request.user_id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only setup MFA for own account"
        )
    
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate MFA secret
    secret = MFASecurity.generate_secret()
    qr_code = MFASecurity.generate_qr_code(secret, target_user.email)
    backup_codes = MFASecurity.generate_backup_codes()
    
    # Store encrypted secret in database
    encryption = EncryptionSecurity()
    encrypted_secret = encryption.encrypt(secret)
    encrypted_backup_codes = encryption.encrypt_dict({"codes": backup_codes})
    
    # Update user with MFA settings
    target_user.mfa_secret = encrypted_secret
    target_user.mfa_backup_codes = encrypted_backup_codes
    target_user.mfa_enabled = False  # Will be enabled after verification
    
    db.commit()
    
    # Log MFA setup
    audit_logger.log_security_event({
        "event_type": "MFA_SETUP",
        "user_id": target_user.id,
        "ip_address": "system",
        "timestamp": datetime.utcnow(),
        "details": {"action": "mfa_secret_generated"},
        "risk_level": "LOW"
    })
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )

@router.post("/mfa/verify")
async def verify_mfa(
    request: MFAVerifyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify MFA token and enable MFA"""
    if user.id != request.user_id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only verify MFA for own account"
        )
    
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user or not target_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MFA not setup for user"
        )
    
    # Decrypt and verify secret
    encryption = EncryptionSecurity()
    secret = encryption.decrypt(target_user.mfa_secret)
    
    if not MFASecurity.verify_totp(secret, request.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA token"
        )
    
    # Enable MFA
    target_user.mfa_enabled = True
    db.commit()
    
    # Log MFA verification
    audit_logger.log_security_event({
        "event_type": "MFA_ENABLED",
        "user_id": target_user.id,
        "ip_address": "system",
        "timestamp": datetime.utcnow(),
        "details": {"action": "mfa_verified_and_enabled"},
        "risk_level": "LOW"
    })
    
    return {"message": "MFA enabled successfully"}

@router.delete("/mfa/{user_id}")
async def disable_mfa(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable MFA for user"""
    if user.id != user_id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only disable MFA for own account"
        )
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Disable MFA
    target_user.mfa_enabled = False
    target_user.mfa_secret = None
    target_user.mfa_backup_codes = None
    
    db.commit()
    
    # Log MFA disable
    audit_logger.log_security_event({
        "event_type": "MFA_DISABLED",
        "user_id": target_user.id,
        "ip_address": "system",
        "timestamp": datetime.utcnow(),
        "details": {"action": "mfa_disabled"},
        "risk_level": "MEDIUM"
    })
    
    return {"message": "MFA disabled successfully"}

# API Key Management
@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    request: APIKeyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new API key"""
    # Generate API key
    api_key = generate_api_key()
    key_hash = hash_api_key(api_key)
    
    # Create API key record
    api_key_record = APIKey(
        name=request.name,
        description=request.description,
        key_hash=key_hash,
        permissions=request.permissions,
        user_id=user.id,
        expires_at=request.expires_at,
        created_at=datetime.utcnow()
    )
    
    db.add(api_key_record)
    db.commit()
    db.refresh(api_key_record)
    
    # Log API key creation
    audit_logger.log_security_event({
        "event_type": "API_KEY_CREATED",
        "user_id": user.id,
        "ip_address": "system",
        "timestamp": datetime.utcnow(),
        "details": {"api_key_name": request.name, "permissions": request.permissions},
        "risk_level": "LOW"
    })
    
    return APIKeyResponse(
        id=api_key_record.id,
        name=api_key_record.name,
        key=api_key,  # Only returned once
        permissions=api_key_record.permissions,
        created_at=api_key_record.created_at,
        expires_at=api_key_record.expires_at
    )

@router.get("/api-keys")
async def list_api_keys(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's API keys"""
    api_keys = db.query(APIKey).filter(APIKey.user_id == user.id).all()
    
    return [
        {
            "id": key.id,
            "name": key.name,
            "permissions": key.permissions,
            "created_at": key.created_at,
            "expires_at": key.expires_at,
            "last_used": key.last_used
        }
        for key in api_keys
    ]

@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke API key"""
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()
    
    # Log API key revocation
    audit_logger.log_security_event({
        "event_type": "API_KEY_REVOKED",
        "user_id": user.id,
        "ip_address": "system",
        "timestamp": datetime.utcnow(),
        "details": {"api_key_id": key_id, "api_key_name": api_key.name},
        "risk_level": "LOW"
    })
    
    return {"message": "API key revoked successfully"}

# Security Scanning and Assessment
@router.post("/scan")
async def initiate_security_scan(
    request: SecurityScanRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Initiate security scan"""
    # Create scan record
    scan_id = secrets.token_urlsafe(16)
    
    scan_record = SecurityScan(
        scan_id=scan_id,
        scan_type=request.scan_type,
        target=request.target,
        options=request.options,
        status="initiated",
        initiated_by=user.id,
        created_at=datetime.utcnow()
    )
    
    db.add(scan_record)
    db.commit()
    
    # In production, this would trigger actual security scanning
    # For now, we'll simulate the scan initiation
    
    return {
        "scan_id": scan_id,
        "status": "initiated",
        "message": f"{request.scan_type} scan initiated for {request.target}"
    }

@router.get("/scan/{scan_id}")
async def get_scan_results(
    scan_id: str,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get security scan results"""
    scan = db.query(SecurityScan).filter(SecurityScan.scan_id == scan_id).first()
    
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    # In production, this would return actual scan results
    return {
        "scan_id": scan_id,
        "scan_type": scan.scan_type,
        "target": scan.target,
        "status": scan.status,
        "results": scan.results or {},
        "created_at": scan.created_at,
        "completed_at": scan.completed_at
    }

# Compliance and Auditing
@router.post("/audit")
async def initiate_security_audit(
    request: SecurityAuditRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Initiate security audit"""
    audit_id = secrets.token_urlsafe(16)
    
    audit_record = SecurityAudit(
        audit_id=audit_id,
        audit_type=request.audit_type,
        scope=request.scope,
        parameters=request.parameters,
        status="initiated",
        initiated_by=user.id,
        created_at=datetime.utcnow()
    )
    
    db.add(audit_record)
    db.commit()
    
    return {
        "audit_id": audit_id,
        "status": "initiated",
        "message": f"{request.audit_type} audit initiated for {request.scope}"
    }

@router.get("/compliance/{framework}")
async def get_compliance_report(
    framework: str,
    user: User = Depends(require_admin)
):
    """Get compliance report for specific framework"""
    # In production, this would generate actual compliance reports
    # This is a mock implementation
    
    frameworks = {
        "gdpr": {"score": 85, "requirements_met": 17, "total": 20},
        "soc2": {"score": 92, "requirements_met": 23, "total": 25},
        "iso27001": {"score": 78, "requirements_met": 39, "total": 50},
        "pci_dss": {"score": 88, "requirements_met": 11, "total": 12}
    }
    
    if framework.lower() not in frameworks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compliance framework not supported"
        )
    
    data = frameworks[framework.lower()]
    
    return ComplianceReportResponse(
        framework=framework.upper(),
        score=data["score"],
        requirements_met=data["requirements_met"],
        total_requirements=data["total"],
        findings=[
            {"requirement": "Data encryption", "status": "compliant"},
            {"requirement": "Access controls", "status": "compliant"},
            {"requirement": "Audit logging", "status": "partial"},
            {"requirement": "Incident response", "status": "non-compliant"}
        ],
        recommendations=[
            "Implement comprehensive audit logging",
            "Establish formal incident response procedures",
            "Enhance data classification policies",
            "Regular security awareness training"
        ]
    )

# Threat Intelligence
@router.post("/threat-intel")
async def add_threat_indicator(
    request: ThreatIntelRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Add threat intelligence indicator"""
    threat_indicator = ThreatIndicator(
        indicator_type=request.indicator_type,
        indicator_value=request.indicator_value,
        threat_type=request.threat_type,
        confidence=request.confidence,
        description=request.description,
        added_by=user.id,
        created_at=datetime.utcnow()
    )
    
    db.add(threat_indicator)
    db.commit()
    
    return {"message": "Threat indicator added successfully"}

@router.get("/threat-intel")
async def get_threat_indicators(
    indicator_type: Optional[str] = None,
    threat_type: Optional[str] = None,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get threat intelligence indicators"""
    query = db.query(ThreatIndicator)
    
    if indicator_type:
        query = query.filter(ThreatIndicator.indicator_type == indicator_type)
    
    if threat_type:
        query = query.filter(ThreatIndicator.threat_type == threat_type)
    
    indicators = query.order_by(ThreatIndicator.created_at.desc()).limit(100).all()
    
    return [
        {
            "id": indicator.id,
            "indicator_type": indicator.indicator_type,
            "indicator_value": indicator.indicator_value,
            "threat_type": indicator.threat_type,
            "confidence": indicator.confidence,
            "description": indicator.description,
            "created_at": indicator.created_at
        }
        for indicator in indicators
    ]

# Security Configuration
@router.post("/policy")
async def update_security_policy(
    request: SecurityPolicyRequest,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update security policy"""
    policy = db.query(SecurityPolicy).filter(
        SecurityPolicy.policy_type == request.policy_type
    ).first()
    
    if policy:
        policy.settings = request.settings
        policy.updated_by = user.id
        policy.updated_at = datetime.utcnow()
    else:
        policy = SecurityPolicy(
            policy_type=request.policy_type,
            settings=request.settings,
            created_by=user.id,
            updated_by=user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(policy)
    
    db.commit()
    
    return {"message": f"Security policy '{request.policy_type}' updated successfully"}

@router.get("/policy")
async def get_security_policies(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all security policies"""
    policies = db.query(SecurityPolicy).all()
    
    return [
        {
            "policy_type": policy.policy_type,
            "settings": policy.settings,
            "created_at": policy.created_at,
            "updated_at": policy.updated_at
        }
        for policy in policies
    ]

# Health and Status
@router.get("/health")
async def security_health_check():
    """Security system health check"""
    return {
        "status": "healthy",
        "encryption": "operational",
        "authentication": "operational",
        "monitoring": "operational",
        "timestamp": datetime.utcnow().isoformat()
    } 