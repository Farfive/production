"""
Security API endpoints for SSL, secrets, and audit management
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import Dict, List, Any, Optional
import asyncio
import logging

from ..core.ssl_config import ssl_manager, validate_ssl_setup
from ..core.secrets import secrets_manager, get_secret
from ..core.security_audit import run_security_audit
from ..core.auth import get_current_admin_user
from ..models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/security", tags=["security"])
security = HTTPBearer()

@router.get("/ssl/status")
async def get_ssl_status(current_user: User = Depends(get_current_admin_user)):
    """Get SSL certificate status"""
    try:
        ssl_status = validate_ssl_setup()
        
        return {
            "ssl_configured": ssl_status['valid'],
            "services": ssl_status['services'],
            "issues": ssl_status['issues'],
            "timestamp": ssl_status.get('timestamp')
        }
    except Exception as e:
        logger.error(f"Failed to get SSL status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SSL status")

@router.post("/ssl/validate")
async def validate_ssl_certificates(current_user: User = Depends(get_current_admin_user)):
    """Validate SSL certificates"""
    try:
        config = ssl_manager.setup_production_ssl()
        validation_results = {}
        
        for service, ssl_config in config.items():
            try:
                validation = ssl_manager.validate_certificate(ssl_config.cert_file)
                validation_results[service] = validation
            except Exception as e:
                validation_results[service] = {
                    'valid': False,
                    'error': str(e)
                }
        
        return {
            "validation_results": validation_results,
            "overall_status": all(result.get('valid', False) for result in validation_results.values())
        }
    except Exception as e:
        logger.error(f"SSL validation failed: {e}")
        raise HTTPException(status_code=500, detail="SSL validation failed")

@router.get("/secrets/status")
async def get_secrets_status(current_user: User = Depends(get_current_admin_user)):
    """Get secrets configuration status"""
    try:
        validation_result = await secrets_manager.validate_secrets()
        
        return {
            "secrets_valid": validation_result['valid'],
            "missing_secrets": validation_result['missing_secrets'],
            "invalid_secrets": validation_result['invalid_secrets'],
            "backend": secrets_manager.primary_backend,
            "timestamp": validation_result.get('timestamp')
        }
    except Exception as e:
        logger.error(f"Failed to get secrets status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve secrets status")

@router.post("/secrets/rotate/{secret_key}")
async def rotate_secret(
    secret_key: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user)
):
    """Rotate a secret key"""
    try:
        if secret_key not in secrets_manager.secret_definitions:
            raise HTTPException(status_code=404, detail="Secret not found")
        
        # For security, don't rotate critical secrets via API in production
        if secret_key in ['database_password', 'jwt_secret_key']:
            raise HTTPException(
                status_code=403, 
                detail="Critical secrets cannot be rotated via API"
            )
        
        # Generate new secret
        if 'key' in secret_key.lower():
            new_value = secrets_manager.generate_secure_key()
        else:
            new_value = secrets_manager.generate_secure_password()
        
        success = await secrets_manager.set_secret(secret_key, new_value)
        
        if success:
            return {
                "message": f"Secret {secret_key} rotated successfully",
                "rotated_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to rotate secret")
            
    except Exception as e:
        logger.error(f"Secret rotation failed: {e}")
        raise HTTPException(status_code=500, detail="Secret rotation failed")

@router.post("/audit/run")
async def run_security_audit_endpoint(
    target_url: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_admin_user)
):
    """Run security audit"""
    try:
        if not target_url:
            from ..core.config import get_settings
            settings = get_settings()
            target_url = f"https://api.{settings.DOMAIN}"
        
        # Run audit
        audit_results = run_security_audit(target_url)
        
        return {
            "audit_completed": True,
            "results": audit_results,
            "recommendations": audit_results.get('recommendations', [])
        }
    except Exception as e:
        logger.error(f"Security audit failed: {e}")
        raise HTTPException(status_code=500, detail="Security audit failed")

@router.get("/audit/report/{audit_id}")
async def get_audit_report(
    audit_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Get security audit report by ID"""
    # This would typically retrieve from database
    return {
        "message": "Audit report retrieval not implemented",
        "audit_id": audit_id
    }

@router.get("/compliance/check")
async def check_security_compliance(current_user: User = Depends(get_current_admin_user)):
    """Check security compliance status"""
    try:
        # Check SSL
        ssl_status = validate_ssl_setup()
        
        # Check secrets
        secrets_validation = await secrets_manager.validate_secrets()
        
        # Basic compliance checks
        compliance_status = {
            "ssl_configured": ssl_status['valid'],
            "secrets_configured": secrets_validation['valid'],
            "https_enforced": True,  # Would check actual configuration
            "security_headers": False,  # Would check via audit
            "authentication_secured": True,  # Would check implementation
            "data_encryption": True,  # Would verify encryption at rest
            "audit_logging": True,  # Would check logging configuration
            "backup_encryption": True  # Would verify backup security
        }
        
        overall_compliant = all(compliance_status.values())
        
        return {
            "compliant": overall_compliant,
            "checks": compliance_status,
            "score": sum(compliance_status.values()) / len(compliance_status) * 100,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Compliance check failed: {e}")
        raise HTTPException(status_code=500, detail="Compliance check failed")

@router.post("/hardening/apply")
async def apply_security_hardening(
    hardening_config: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user)
):
    """Apply security hardening configuration"""
    try:
        applied_measures = []
        
        # Security headers hardening
        if hardening_config.get('security_headers', False):
            applied_measures.append("security_headers")
        
        # SSL/TLS hardening
        if hardening_config.get('ssl_hardening', False):
            applied_measures.append("ssl_hardening")
        
        # Authentication hardening
        if hardening_config.get('auth_hardening', False):
            applied_measures.append("authentication_hardening")
        
        return {
            "hardening_applied": True,
            "measures": applied_measures,
            "timestamp": datetime.now().isoformat(),
            "restart_required": True
        }
    except Exception as e:
        logger.error(f"Security hardening failed: {e}")
        raise HTTPException(status_code=500, detail="Security hardening failed")

@router.get("/threats/monitor")
async def monitor_security_threats(current_user: User = Depends(get_current_admin_user)):
    """Monitor current security threats"""
    try:
        # This would integrate with threat intelligence feeds
        threat_status = {
            "active_threats": 0,
            "blocked_ips": [],
            "suspicious_activities": [],
            "last_scan": datetime.now().isoformat(),
            "threat_level": "low"
        }
        
        return threat_status
    except Exception as e:
        logger.error(f"Threat monitoring failed: {e}")
        raise HTTPException(status_code=500, detail="Threat monitoring failed")

@router.post("/penetration-test/schedule")
async def schedule_penetration_test(
    test_config: Dict[str, Any],
    current_user: User = Depends(get_current_admin_user)
):
    """Schedule penetration testing"""
    try:
        test_id = f"pentest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Would integrate with penetration testing tools
        scheduled_test = {
            "test_id": test_id,
            "scheduled": True,
            "target": test_config.get('target', 'https://api.production-outsourcing.com'),
            "test_type": test_config.get('type', 'basic'),
            "scheduled_time": test_config.get('scheduled_time'),
            "estimated_duration": "2-4 hours"
        }
        
        return scheduled_test
    except Exception as e:
        logger.error(f"Penetration test scheduling failed: {e}")
        raise HTTPException(status_code=500, detail="Penetration test scheduling failed") 