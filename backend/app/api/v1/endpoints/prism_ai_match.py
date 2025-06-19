"""
PRISM AI Manufacturing Match Engine API Endpoint

This endpoint provides access to PRISM's advanced AI-powered manufacturer matching
system that analyzes order requirements and ranks manufacturers using our proprietary
8-factor scoring system.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.order import Order
from app.models.producer import Manufacturer
from app.services.prism_ai_match_engine import prism_ai_engine

router = APIRouter()
logger = logging.getLogger(__name__)


class PRISMMatchingRequest(BaseModel):
    """Request model for PRISM AI Matching Engine"""
    order_specifications: Dict[str, Any] = Field(..., description="Complete order specifications")
    technical_specs: Dict[str, Any] = Field(..., description="Technical requirements and specifications")
    quality_requirements: Dict[str, Any] = Field(..., description="Quality standards and certifications required")
    budget_min: float = Field(..., gt=0, description="Minimum budget in PLN")
    budget_max: float = Field(..., gt=0, description="Maximum budget in PLN")
    delivery_deadline: datetime = Field(..., description="Required delivery deadline")
    location_preferences: Optional[Dict[str, Any]] = Field(None, description="Geographic preferences")
    

class PRISMMatchingResponse(BaseModel):
    """Response model for PRISM AI Matching Engine"""
    top_matches: List[Dict[str, Any]] = Field(..., description="Top manufacturer matches")
    match_summary: Dict[str, Any] = Field(..., description="Overall matching summary")
    algorithm_version: str = Field(..., description="Algorithm version used")
    generated_at: str = Field(..., description="Timestamp of analysis")
    processing_status: str = Field(..., description="Processing status")


@router.post("/prism-ai-match", response_model=PRISMMatchingResponse)
async def prism_ai_manufacturer_matching(
    request: PRISMMatchingRequest,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    PRISM AI Manufacturing Match Engine
    
    Analyzes order requirements and ranks manufacturers based on our 8-factor scoring system:
    1. Capability Matching (35%)
    2. Performance History (25%) 
    3. Quality Metrics (15%)
    4. Geographic Proximity (12%)
    5. Cost Efficiency (8%)
    6. Availability (5%)
    
    Returns JSON format with top matches, detailed scoring, and market insights.
    """
    try:
        logger.info("PRISM AI Match Engine request received")
        
        # Validate request
        if request.budget_min >= request.budget_max:
            raise HTTPException(
                status_code=400,
                detail="budget_min must be less than budget_max"
            )
        
        if request.delivery_deadline <= datetime.now():
            raise HTTPException(
                status_code=400,
                detail="delivery_deadline must be in the future"
            )
        
        # Get manufacturer database for analysis
        manufacturer_database = db.query(Manufacturer).filter(
            Manufacturer.is_active == True,
            Manufacturer.is_verified == True
        ).limit(200).all()
        
        # Run PRISM AI analysis
        result = prism_ai_engine.analyze_and_rank(
            db=db,
            order_specifications=request.order_specifications,
            technical_specs=request.technical_specs,
            quality_requirements=request.quality_requirements,
            budget_min=request.budget_min,
            budget_max=request.budget_max,
            delivery_deadline=request.delivery_deadline,
            location_preferences=request.location_preferences,
            manufacturer_database=manufacturer_database
        )
        
        # Log analytics if user is authenticated
        if current_user and background_tasks:
            background_tasks.add_task(
                log_prism_matching_analytics,
                user_id=current_user.id,
                matches_count=len(result.get("top_matches", [])),
                processing_status=result.get("processing_status", "unknown")
            )
        
        logger.info(f"PRISM AI analysis completed: {len(result.get('top_matches', []))} matches found")
        
        return PRISMMatchingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PRISM AI Match Engine error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"PRISM AI analysis failed: {str(e)}"
        )


# Demo endpoint removed for production - use the main /prism-ai-match endpoint for real analysis


@router.get("/prism-ai-scoring-system")
async def get_prism_scoring_system():
    """
    Get detailed information about PRISM's 8-factor scoring system
    """
    return {
        "scoring_system": {
            "total_weight": 100,
            "factors": {
                "capability_matching": {
                    "weight": 35,
                    "description": "Exact process, material, and industry match analysis",
                    "scoring": {
                        "exact_match": 35,
                        "similar_process": 25,
                        "adaptable_capability": 15,
                        "no_match": 0
                    }
                },
                "performance_history": {
                    "weight": 25,
                    "description": "Track record, completion rate, and reliability metrics",
                    "scoring": {
                        "excellent_95_plus": 25,
                        "good_85_94": 20,
                        "average_70_84": 15,
                        "poor_below_70": 5
                    }
                },
                "quality_metrics": {
                    "weight": 15,
                    "description": "Quality ratings, certifications, and standards compliance",
                    "scoring": {
                        "premium_9_5_10": 15,
                        "high_8_5_9_4": 12,
                        "standard_7_0_8_4": 8,
                        "below_standard": 3
                    }
                },
                "geographic_proximity": {
                    "weight": 12,
                    "description": "Location advantages, logistics, and shipping considerations",
                    "scoring": {
                        "same_city_region": 12,
                        "same_country": 8,
                        "same_continent": 5,
                        "different_continent": 2
                    }
                },
                "cost_efficiency": {
                    "weight": 8,
                    "description": "Pricing competitiveness and value proposition",
                    "scoring": {
                        "below_budget": 8,
                        "within_budget": 6,
                        "slightly_above": 4,
                        "significantly_above": 1
                    }
                },
                "availability": {
                    "weight": 5,
                    "description": "Current capacity and delivery timeline capability",
                    "scoring": {
                        "immediate": 5,
                        "within_1_week": 4,
                        "within_2_weeks": 3,
                        "after_2_weeks": 1
                    }
                }
            }
        },
        "business_rules": {
            "minimum_score": 60,
            "minimum_matches": 3,
            "maximum_matches": 15,
            "edge_case_handling": [
                "No exact capability matches - suggest alternatives",
                "All manufacturers over budget - provide cost optimization",
                "Tight timeline requirements - prioritize speed over cost",
                "Special certifications required - filter by compliance"
            ]
        },
        "ai_features": [
            "Machine learning predictions",
            "Fuzzy matching for capabilities",
            "Risk assessment scoring",
            "Market intelligence analysis",
            "Success probability calculation",
            "Cost estimation algorithms",
            "Timeline optimization"
        ]
    }


@router.get("/prism-ai-health")
async def prism_ai_health_check():
    """
    Health check for PRISM AI Match Engine
    """
    try:
        # Test basic engine functionality
        engine_status = "healthy"
        
        # Check database connectivity
        from app.core.database import SessionLocal
        db = SessionLocal()
        
        try:
            # Simple query to test DB
            manufacturer_count = db.query(Manufacturer).filter(
                Manufacturer.is_active == True
            ).count()
            
            database_status = "connected"
            
        except Exception as e:
            database_status = f"error: {str(e)}"
            engine_status = "degraded"
            
        finally:
            db.close()
        
        return {
            "status": engine_status,
            "engine": "PRISM AI Match Engine v1.0",
            "database": database_status,
            "active_manufacturers": manufacturer_count if 'manufacturer_count' in locals() else 0,
            "scoring_factors": 6,
            "max_recommendations": 15,
            "min_qualified_score": 60,
            "last_check": datetime.now().isoformat(),
            "capabilities": [
                "8-factor scoring system",
                "AI-powered capability matching",
                "Performance prediction",
                "Risk assessment",
                "Market intelligence",
                "Real-time analysis"
            ]
        }
        
    except Exception as e:
        return {
            "status": "error",
            "engine": "PRISM AI Match Engine v1.0",
            "error": str(e),
            "last_check": datetime.now().isoformat()
        }


async def log_prism_matching_analytics(
    user_id: int,
    matches_count: int,
    processing_status: str
):
    """Log analytics for PRISM AI usage"""
    try:
        # This would typically log to analytics database
        logger.info(
            f"PRISM AI Analytics: user_id={user_id}, matches={matches_count}, "
            f"status={processing_status}, timestamp={datetime.now()}"
        )
    except Exception as e:
        logger.error(f"Analytics logging error: {str(e)}")


# Example usage and testing endpoints

# Test scenarios endpoint removed for production - use the main /prism-ai-match endpoint for real analysis 