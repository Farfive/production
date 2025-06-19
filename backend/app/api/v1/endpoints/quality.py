from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.producer import Manufacturer
from app.models.quote import Quote
from loguru import logger

router = APIRouter()


class QualityCheck(BaseModel):
    id: str
    order_id: int
    order_number: str
    check_name: str
    description: str
    status: str  # pending, in_progress, passed, failed, requires_review
    priority: str  # low, medium, high, critical
    scheduled_date: datetime
    completed_date: Optional[datetime] = None
    assigned_to: Dict[str, Any]
    checked_by: Optional[Dict[str, Any]] = None
    criteria: List[Dict[str, Any]] = []
    overall_score: float = 0.0
    notes: str = ""
    photos: List[Dict[str, Any]] = []
    documents: List[Dict[str, Any]] = []


class QualityMetrics(BaseModel):
    total_checks: int
    passed_checks: int
    failed_checks: int
    pending_checks: int
    average_score: float
    trends_data: List[Dict[str, Any]] = []


class QualityDashboardData(BaseModel):
    metrics: QualityMetrics
    checks: List[QualityCheck]
    recent_issues: List[Dict[str, Any]]
    compliance_status: Dict[str, Any]
    certifications: List[Dict[str, Any]]


@router.get("/dashboard", response_model=QualityDashboardData)
async def get_quality_dashboard(
    manufacturer_id: Optional[str] = Query(None, description="Manufacturer ID filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quality control dashboard data with metrics and checks"""
    try:
        # Get manufacturer filter
        manufacturer_filter = None
        if manufacturer_id and current_user.role == UserRole.ADMIN:
            manufacturer_filter = int(manufacturer_id)
        elif current_user.role == UserRole.MANUFACTURER:
            manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                manufacturer_filter = manufacturer.id

        # Mock quality checks data
        quality_checks = [
            QualityCheck(
                id="QC-001",
                order_id=1,
                order_number="ORD-000001",
                check_name="Dimensional Inspection",
                description="Verify all dimensions meet specifications",
                status="passed",
                priority="high",
                scheduled_date=datetime.now() - timedelta(days=2),
                completed_date=datetime.now() - timedelta(days=1),
                assigned_to={"id": "1", "name": "John Smith", "role": "Quality Inspector"},
                checked_by={"id": "1", "name": "John Smith", "role": "Quality Inspector"},
                criteria=[
                    {
                        "id": "1",
                        "name": "Length tolerance",
                        "description": "±0.1mm",
                        "status": "passed",
                        "notes": "Within specification",
                        "photos": []
                    }
                ],
                overall_score=95.5,
                notes="All dimensions within tolerance",
                photos=[],
                documents=[]
            ),
            QualityCheck(
                id="QC-002",
                order_id=2,
                order_number="ORD-000002",
                check_name="Surface Finish Inspection",
                description="Check surface roughness and finish quality",
                status="in_progress",
                priority="medium",
                scheduled_date=datetime.now(),
                assigned_to={"id": "2", "name": "Jane Doe", "role": "Quality Inspector"},
                criteria=[],
                overall_score=0.0,
                notes="",
                photos=[],
                documents=[]
            ),
            QualityCheck(
                id="QC-003",
                order_id=3,
                order_number="ORD-000003",
                check_name="Material Verification",
                description="Verify material composition and properties",
                status="failed",
                priority="critical",
                scheduled_date=datetime.now() - timedelta(days=1),
                completed_date=datetime.now(),
                assigned_to={"id": "1", "name": "John Smith", "role": "Quality Inspector"},
                checked_by={"id": "1", "name": "John Smith", "role": "Quality Inspector"},
                criteria=[
                    {
                        "id": "1",
                        "name": "Material composition",
                        "description": "Aluminum 6061-T6",
                        "status": "failed",
                        "notes": "Different alloy detected",
                        "photos": []
                    }
                ],
                overall_score=35.0,
                notes="Material does not match specification",
                photos=[],
                documents=[]
            )
        ]

        # Calculate metrics
        total_checks = len(quality_checks)
        passed_checks = len([c for c in quality_checks if c.status == "passed"])
        failed_checks = len([c for c in quality_checks if c.status == "failed"])
        pending_checks = len([c for c in quality_checks if c.status in ["pending", "in_progress"]])
        average_score = sum(c.overall_score for c in quality_checks if c.overall_score > 0) / max(1, len([c for c in quality_checks if c.overall_score > 0]))

        # Generate trends data
        trends_data = [
            {
                "date": (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d"),
                "passed": 15 - i,
                "failed": 2 + (i % 2),
                "score": 92.5 - (i * 0.5)
            }
            for i in range(7)
        ]

        metrics = QualityMetrics(
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            pending_checks=pending_checks,
            average_score=average_score,
            trends_data=trends_data
        )

        # Mock recent issues
        recent_issues = [
            {
                "id": "ISS-001",
                "order_id": 3,
                "issue_type": "Material Non-Conformance",
                "severity": "critical",
                "description": "Material composition does not match specification",
                "reported_date": datetime.now().isoformat(),
                "status": "open",
                "assigned_to": "Quality Manager"
            },
            {
                "id": "ISS-002",
                "order_id": 5,
                "issue_type": "Dimensional Deviation",
                "severity": "medium",
                "description": "Minor dimensional deviation detected",
                "reported_date": (datetime.now() - timedelta(hours=6)).isoformat(),
                "status": "investigating",
                "assigned_to": "Quality Inspector"
            }
        ]

        # Mock compliance status
        compliance_status = {
            "iso_9001": {
                "status": "compliant",
                "last_audit": "2024-01-15",
                "next_audit": "2024-07-15",
                "score": 95.2
            },
            "iso_14001": {
                "status": "compliant",
                "last_audit": "2024-02-01",
                "next_audit": "2024-08-01",
                "score": 92.8
            },
            "as9100": {
                "status": "pending_review",
                "last_audit": "2023-12-01",
                "next_audit": "2024-06-01",
                "score": 87.5
            }
        }

        # Mock certifications
        certifications = [
            {
                "id": "CERT-001",
                "name": "ISO 9001:2015",
                "type": "Quality Management",
                "status": "active",
                "issued_date": "2023-06-15",
                "expiry_date": "2026-06-15",
                "issuing_body": "Bureau Veritas",
                "certificate_number": "ISO9001-2023-001"
            },
            {
                "id": "CERT-002",
                "name": "ISO 14001:2015",
                "type": "Environmental Management",
                "status": "active",
                "issued_date": "2023-08-01",
                "expiry_date": "2026-08-01",
                "issuing_body": "SGS",
                "certificate_number": "ISO14001-2023-002"
            }
        ]

        return QualityDashboardData(
            metrics=metrics,
            checks=quality_checks,
            recent_issues=recent_issues,
            compliance_status=compliance_status,
            certifications=certifications
        )

    except Exception as e:
        logger.error(f"Error loading quality dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load quality dashboard: {str(e)}"
        )


@router.put("/checks/{check_id}")
async def update_quality_check(
    check_id: str,
    updates: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update quality check status and details"""
    try:
        # Mock update - in real implementation, this would update database
        return {
            "success": True,
            "message": f"Quality check {check_id} updated successfully",
            "updated_fields": list(updates.keys())
        }
        
    except Exception as e:
        logger.error(f"Error updating quality check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checks/{check_id}/photos")
async def upload_check_photos(
    check_id: str,
    photos: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload photos for quality check"""
    try:
        uploaded_photos = []
        for photo in photos:
            # Mock photo upload - in real implementation, this would save files
            photo_data = {
                "id": f"photo_{len(uploaded_photos) + 1}",
                "filename": photo.filename,
                "url": f"/uploads/quality/{check_id}/{photo.filename}",
                "uploaded_at": datetime.now().isoformat(),
                "size": photo.size if hasattr(photo, 'size') else 0
            }
            uploaded_photos.append(photo_data)
        
        return {
            "success": True,
            "message": f"Uploaded {len(uploaded_photos)} photos for check {check_id}",
            "photos": uploaded_photos
        }
        
    except Exception as e:
        logger.error(f"Error uploading photos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_quality_metrics(
    manufacturer_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed quality metrics"""
    try:
        # Mock metrics data
        metrics = {
            "overall_quality_score": 92.5,
            "defect_rate": 2.1,  # percentage
            "first_pass_yield": 94.8,  # percentage
            "customer_satisfaction": 4.7,  # out of 5
            "on_time_delivery": 96.2,  # percentage
            "cost_of_quality": {
                "prevention": 15000,
                "appraisal": 8000,
                "internal_failure": 3000,
                "external_failure": 1200
            },
            "trends": {
                "quality_score": [
                    {"period": "2024-01", "value": 91.2},
                    {"period": "2024-02", "value": 92.5},
                    {"period": "2024-03", "value": 93.1}
                ],
                "defect_rate": [
                    {"period": "2024-01", "value": 2.8},
                    {"period": "2024-02", "value": 2.1},
                    {"period": "2024-03", "value": 1.9}
                ]
            }
        }
        
        return {"success": True, "data": metrics}
        
    except Exception as e:
        logger.error(f"Error getting quality metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checks")
async def create_quality_check(
    check_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new quality check"""
    try:
        # Mock check creation
        new_check_id = f"QC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "success": True,
            "message": "Quality check created successfully",
            "check_id": new_check_id,
            "data": check_data
        }
        
    except Exception as e:
        logger.error(f"Error creating quality check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/standards")
async def get_quality_standards(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quality standards and specifications"""
    try:
        # Mock quality standards
        standards = [
            {
                "id": "STD-001",
                "name": "Dimensional Tolerance Standard",
                "category": "dimensional",
                "description": "Standard tolerances for machined parts",
                "specifications": {
                    "linear_tolerance": "±0.1mm",
                    "angular_tolerance": "±0.5°",
                    "surface_roughness": "Ra 3.2μm"
                },
                "applicable_processes": ["cnc_machining", "turning", "milling"]
            },
            {
                "id": "STD-002",
                "name": "Material Verification Standard",
                "category": "material",
                "description": "Standards for material composition verification",
                "specifications": {
                    "composition_tolerance": "±2%",
                    "hardness_range": "HRC 58-62",
                    "tensile_strength": "≥500 MPa"
                },
                "applicable_processes": ["heat_treatment", "material_testing"]
            }
        ]
        
        if category:
            standards = [s for s in standards if s["category"] == category]
        
        return {"success": True, "data": standards}
        
    except Exception as e:
        logger.error(f"Error getting quality standards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compliance")
async def get_compliance_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get compliance status and certifications"""
    try:
        compliance_data = {
            "overall_compliance_score": 94.2,
            "standards": {
                "iso_9001": {
                    "status": "compliant",
                    "score": 95.2,
                    "last_audit": "2024-01-15",
                    "next_audit": "2024-07-15",
                    "issues": []
                },
                "iso_14001": {
                    "status": "compliant",
                    "score": 92.8,
                    "last_audit": "2024-02-01",
                    "next_audit": "2024-08-01",
                    "issues": []
                },
                "as9100": {
                    "status": "pending_review",
                    "score": 87.5,
                    "last_audit": "2023-12-01",
                    "next_audit": "2024-06-01",
                    "issues": [
                        {
                            "id": "NCR-001",
                            "description": "Documentation update required",
                            "severity": "minor",
                            "due_date": "2024-03-01"
                        }
                    ]
                }
            },
            "certifications": [
                {
                    "name": "ISO 9001:2015",
                    "status": "active",
                    "expiry_date": "2026-06-15",
                    "days_until_expiry": 850
                },
                {
                    "name": "ISO 14001:2015",
                    "status": "active", 
                    "expiry_date": "2026-08-01",
                    "days_until_expiry": 897
                }
            ]
        }
        
        return {"success": True, "data": compliance_data}
        
    except Exception as e:
        logger.error(f"Error getting compliance status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issues")
async def get_quality_issues(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quality issues and non-conformances"""
    try:
        # Mock quality issues
        issues = [
            {
                "id": "ISS-001",
                "order_id": 123,
                "issue_type": "Material Non-Conformance",
                "severity": "critical",
                "status": "open",
                "description": "Material composition does not match specification",
                "reported_by": "John Smith",
                "reported_date": datetime.now().isoformat(),
                "assigned_to": "Quality Manager",
                "root_cause": "Supplier material variation",
                "corrective_actions": [
                    "Contact supplier for explanation",
                    "Implement additional incoming inspection",
                    "Update supplier requirements"
                ]
            },
            {
                "id": "ISS-002",
                "order_id": 124,
                "issue_type": "Dimensional Deviation",
                "severity": "medium",
                "status": "investigating",
                "description": "Minor dimensional deviation detected in batch",
                "reported_by": "Jane Doe",
                "reported_date": (datetime.now() - timedelta(hours=6)).isoformat(),
                "assigned_to": "Quality Inspector",
                "root_cause": "Tool wear suspected",
                "corrective_actions": [
                    "Inspect tooling condition",
                    "Adjust machining parameters",
                    "Increase inspection frequency"
                ]
            }
        ]
        
        # Apply filters
        if status:
            issues = [i for i in issues if i["status"] == status]
        if severity:
            issues = [i for i in issues if i["severity"] == severity]
        
        return {"success": True, "data": issues[:limit]}
        
    except Exception as e:
        logger.error(f"Error getting quality issues: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 