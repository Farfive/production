"""
Feedback Learning API Endpoints - Phase 2

Provides endpoints for:
- Recording customer choices and feedback
- Tracking interactions with recommendations
- Getting learning analytics and insights
- Managing feedback sessions
"""

from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.feedback_learning_engine import (
    feedback_learning_engine,
    CustomerChoiceData
)

router = APIRouter()


# Request/Response Models
class StartFeedbackSessionRequest(BaseModel):
    """Request to start a feedback session"""
    order_id: int
    recommendations: List[Dict[str, Any]]
    customer_preferences: Optional[Dict[str, Any]] = None
    explanation_level: str = Field(default="summary", pattern="^(summary|detailed|expert)$")
    algorithm_version: str = "enhanced_v1.0"


class RecordChoiceRequest(BaseModel):
    """Request to record customer choice"""
    session_id: str
    chosen_manufacturer_id: Optional[int] = None
    chosen_rank: Optional[int] = None
    choice_type: str = Field(..., pattern="^(selected|contacted|rejected_all|abandoned)$")
    choice_reason: Optional[str] = None
    important_factors: Optional[List[str]] = None
    time_to_decision: Optional[int] = None


class RecordInteractionRequest(BaseModel):
    """Request to record customer interaction"""
    session_id: str
    manufacturer_id: int
    interaction_type: str = Field(..., pattern="^(viewed|expanded|compared|contacted)$")
    interaction_data: Optional[Dict[str, Any]] = None


class FeedbackSessionResponse(BaseModel):
    """Response for feedback session"""
    session_id: str
    status: str
    message: str


@router.post("/start-session", response_model=FeedbackSessionResponse)
async def start_feedback_session(
    request: StartFeedbackSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new feedback session to track customer interactions
    """
    try:
        # Convert recommendations to structured match objects for feedback tracking
        structured_matches = []
        for i, rec in enumerate(request.recommendations):
            # Create structured match object from recommendation data
            match_obj = feedback_learning_engine.create_match_object_from_recommendation(
                rec, i + 1
            )
            structured_matches.append(match_obj)
        
        session_id = feedback_learning_engine.start_feedback_session(
            db=db,
            order_id=request.order_id,
            user_id=current_user.id,
            curated_matches=structured_matches,
            customer_preferences=request.customer_preferences,
            explanation_level=request.explanation_level,
            algorithm_version=request.algorithm_version
        )
        
        return FeedbackSessionResponse(
            session_id=session_id,
            status="success",
            message=f"Feedback session started with {len(structured_matches)} recommendations"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting feedback session: {str(e)}"
        )


@router.post("/record-choice", response_model=Dict[str, Any])
async def record_customer_choice(
    request: RecordChoiceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record customer's final choice from recommendations
    """
    try:
        choice_data = CustomerChoiceData(
            session_id=request.session_id,
            chosen_manufacturer_id=request.chosen_manufacturer_id,
            chosen_rank=request.chosen_rank,
            choice_type=request.choice_type,
            choice_reason=request.choice_reason,
            important_factors=request.important_factors,
            time_to_decision=request.time_to_decision
        )
        
        success = feedback_learning_engine.record_customer_choice(
            db=db,
            choice_data=choice_data
        )
        
        if success:
            return {
                "status": "success",
                "message": "Customer choice recorded successfully",
                "learning_triggered": True
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record customer choice"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recording customer choice: {str(e)}"
        )


@router.post("/record-interaction", response_model=Dict[str, Any])
async def record_recommendation_interaction(
    request: RecordInteractionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record customer interaction with specific recommendation
    """
    try:
        success = feedback_learning_engine.record_interaction(
            db=db,
            session_id=request.session_id,
            manufacturer_id=request.manufacturer_id,
            interaction_type=request.interaction_type,
            interaction_data=request.interaction_data
        )
        
        if success:
            return {
                "status": "success",
                "message": "Interaction recorded successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to record interaction"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recording interaction: {str(e)}"
        )


@router.get("/analytics", response_model=Dict[str, Any])
async def get_feedback_analytics(
    days_back: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive feedback and learning analytics
    """
    try:
        # Get analytics
        analytics = feedback_learning_engine.get_feedback_analytics(
            db=db,
            days_back=days_back
        )
        
        # Get learning insights
        insights = []
        try:
            from app.models.matching_feedback import LearningWeights
            from sqlalchemy import and_
            
            learned_weights = db.query(LearningWeights).filter(
                and_(
                    LearningWeights.confidence_score >= 0.6,
                    LearningWeights.sample_size >= 5
                )
            ).all()
            
            for weights in learned_weights:
                insight = {
                    "customer_segment": weights.customer_segment,
                    "complexity_level": weights.complexity_level,
                    "sample_size": weights.sample_size,
                    "confidence_score": round(weights.confidence_score, 3),
                    "avg_choice_rank": weights.avg_choice_rank,
                    "conversion_rate": weights.conversion_rate,
                    "top_weights": {
                        "capability": round(weights.capability_weight, 3),
                        "performance": round(weights.performance_weight, 3),
                        "quality": round(weights.quality_weight, 3),
                        "geographic": round(weights.geographic_weight, 3)
                    }
                }
                insights.append(insight)
                
        except Exception as insight_error:
            print(f"Error getting insights: {insight_error}")
            insights = []
        
        return {
            "status": "success",
            "analytics": analytics,
            "insights": insights
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting feedback analytics: {str(e)}"
        )


@router.get("/health", response_model=Dict[str, Any])
async def feedback_learning_health():
    """
    Health check for feedback learning system
    """
    return {
        "status": "healthy",
        "service": "feedback_learning",
        "phase": "2",
        "features": [
            "customer_choice_tracking",
            "interaction_recording",
            "weight_learning",
            "analytics_reporting"
        ],
        "timestamp": datetime.now().isoformat()
    } 