"""
Advanced Personalization API Endpoints - Phase 3

This module provides REST API endpoints for advanced personalization features including:
- Individual customer profiling
- A/B testing management
- Predictive analytics
- Real-time optimization
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import uuid
import logging

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.personalization import (
    CustomerPersonalizationProfile,
    ABTestExperiment,
    ExperimentParticipant,
    MultiObjectiveGoal,
    PredictiveModel,
    RealtimeOptimization,
    PersonalizationInsight
)
from app.services.advanced_personalization_engine import (
    advanced_personalization_engine,
    PersonalizedRecommendationRequest,
    PersonalizationProfile,
    ABTestAssignment,
    OptimizationDecision
)
from app.services.ab_testing_service import (
    ab_testing_service,
    ExperimentConfig,
    ExperimentResults,
    StatisticalTest
)
from app.services.predictive_analytics_service import (
    predictive_analytics_service,
    PredictionRequest,
    PredictionResult,
    CustomerBehaviorPrediction,
    ModelPerformance
)

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models for request/response
from pydantic import BaseModel, Field


class PersonalizedRecommendationRequest(BaseModel):
    order_context: Dict[str, Any]
    customer_preferences: Optional[Dict[str, Any]] = None
    complexity_level: str = "moderate"
    use_ab_testing: bool = True
    optimization_goal: str = "balanced"


class PersonalizedRecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    personalization_metadata: Dict[str, Any]
    session_id: str
    timestamp: datetime


class ExperimentCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    experiment_type: str = Field(..., pattern="^(algorithm|weights|ui|explanation)$")
    control_config: Dict[str, Any]
    treatment_configs: Dict[str, Dict[str, Any]]
    traffic_allocation: Dict[str, float]
    primary_metric: str = "conversion_rate"
    secondary_metrics: List[str] = []
    target_segments: Optional[List[str]] = None
    minimum_sample_size: int = Field(100, ge=20, le=10000)
    minimum_effect_size: float = Field(0.05, ge=0.01, le=0.5)
    confidence_level: float = Field(0.95, ge=0.8, le=0.99)
    max_duration_days: int = Field(30, ge=1, le=90)


class ExperimentResponse(BaseModel):
    id: int
    name: str
    status: str
    experiment_type: str
    start_date: Optional[datetime]
    participants: int
    results: Optional[Dict[str, Any]]


class PredictionRequestModel(BaseModel):
    order_context: Dict[str, Any] = {}
    prediction_types: List[str] = ["success_prediction", "satisfaction_prediction"]
    include_confidence: bool = True


class PredictionResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    behavior_prediction: Optional[Dict[str, Any]]
    timestamp: datetime


class PersonalProfileUpdateRequest(BaseModel):
    interaction_data: Dict[str, Any]
    choice_data: Optional[Dict[str, Any]] = None


# Personalized Recommendations Endpoints
@router.post("/recommendations/personalized", response_model=PersonalizedRecommendationResponse)
async def get_personalized_recommendations(
    request: PersonalizedRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get personalized recommendations using advanced AI personalization
    """
    try:
        logger.info(f"Getting personalized recommendations for user {current_user.id}")
        
        # Create request object
        personalization_request = PersonalizedRecommendationRequest(
            user_id=current_user.id,
            order_context=request.order_context,
            customer_preferences=request.customer_preferences,
            complexity_level=request.complexity_level,
            use_ab_testing=request.use_ab_testing,
            optimization_goal=request.optimization_goal
        )
        
        # Get personalized recommendations
        recommendations, metadata = advanced_personalization_engine.get_personalized_recommendations(
            db, personalization_request
        )
        
        return PersonalizedRecommendationResponse(
            recommendations=[rec.__dict__ if hasattr(rec, '__dict__') else rec for rec in recommendations],
            personalization_metadata=metadata,
            session_id=str(uuid.uuid4()),
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error getting personalized recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating personalized recommendations: {str(e)}"
        )


@router.get("/profile/personal")
async def get_personal_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current user's personalization profile
    """
    try:
        profile = db.query(CustomerPersonalizationProfile).filter(
            CustomerPersonalizationProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            return {
                "message": "No personalization profile found",
                "user_id": current_user.id,
                "profile_exists": False
            }
        
        return {
            "user_id": profile.user_id,
            "personal_weights": profile.personal_weights,
            "behavior_patterns": profile.behavior_patterns,
            "total_interactions": profile.total_interactions,
            "successful_matches": profile.successful_matches,
            "personal_confidence": profile.personal_confidence,
            "decision_speed_profile": profile.decision_speed_profile,
            "explanation_preference": profile.explanation_preference,
            "complexity_comfort_level": profile.complexity_comfort_level,
            "risk_tolerance": profile.risk_tolerance,
            "avg_satisfaction_score": profile.avg_satisfaction_score,
            "conversion_rate": profile.conversion_rate,
            "last_interaction": profile.last_interaction,
            "profile_exists": True
        }
        
    except Exception as e:
        logger.error(f"Error getting personal profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving personal profile: {str(e)}"
        )


@router.post("/profile/update")
async def update_personal_profile(
    request: PersonalProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update personal profile based on user interactions and choices
    """
    try:
        success = advanced_personalization_engine.update_personal_profile(
            db=db,
            user_id=current_user.id,
            interaction_data=request.interaction_data,
            choice_data=request.choice_data
        )
        
        if success:
            return {
                "message": "Personal profile updated successfully",
                "user_id": current_user.id,
                "updated_at": datetime.now()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update personal profile"
            )
        
    except Exception as e:
        logger.error(f"Error updating personal profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating personal profile: {str(e)}"
        )


# A/B Testing Endpoints
@router.post("/experiments", response_model=ExperimentResponse)
async def create_experiment(
    request: ExperimentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new A/B test experiment
    """
    try:
        # Validate traffic allocation sums to 1.0
        if abs(sum(request.traffic_allocation.values()) - 1.0) > 0.001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Traffic allocation must sum to 1.0"
            )
        
        # Create experiment configuration
        config = ExperimentConfig(
            name=request.name,
            description=request.description,
            experiment_type=request.experiment_type,
            control_config=request.control_config,
            treatment_configs=request.treatment_configs,
            traffic_allocation=request.traffic_allocation,
            primary_metric=request.primary_metric,
            secondary_metrics=request.secondary_metrics,
            target_segments=request.target_segments,
            minimum_sample_size=request.minimum_sample_size,
            minimum_effect_size=request.minimum_effect_size,
            confidence_level=request.confidence_level,
            max_duration_days=request.max_duration_days
        )
        
        # Create experiment
        experiment_id = ab_testing_service.create_experiment(
            db=db,
            config=config,
            created_by=current_user.id
        )
        
        # Get created experiment
        experiment = db.query(ABTestExperiment).filter(
            ABTestExperiment.id == experiment_id
        ).first()
        
        return ExperimentResponse(
            id=experiment.id,
            name=experiment.name,
            status=experiment.status,
            experiment_type=experiment.experiment_type,
            start_date=experiment.start_date,
            participants=0,
            results=None
        )
        
    except Exception as e:
        logger.error(f"Error creating experiment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating experiment: {str(e)}"
        )


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start an A/B test experiment
    """
    try:
        success = ab_testing_service.start_experiment(db, experiment_id)
        
        if success:
            return {
                "message": "Experiment started successfully",
                "experiment_id": experiment_id,
                "started_at": datetime.now()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to start experiment"
            )
        
    except Exception as e:
        logger.error(f"Error starting experiment {experiment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting experiment: {str(e)}"
        )


@router.post("/experiments/{experiment_id}/stop")
async def stop_experiment(
    experiment_id: int,
    reason: str = Query("manual_stop", description="Reason for stopping experiment"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stop an A/B test experiment
    """
    try:
        success = ab_testing_service.stop_experiment(db, experiment_id, reason)
        
        if success:
            return {
                "message": "Experiment stopped successfully",
                "experiment_id": experiment_id,
                "stopped_at": datetime.now(),
                "reason": reason
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to stop experiment"
            )
        
    except Exception as e:
        logger.error(f"Error stopping experiment {experiment_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error stopping experiment: {str(e)}"
        )


@router.get("/experiments/{experiment_id}/results")
async def get_experiment_results(
    experiment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get A/B test experiment results and analysis
    """
    try:
        results = ab_testing_service.analyze_experiment(db, experiment_id)
        
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No results found for experiment {experiment_id}"
            )
        
        return {
            "experiment_id": results.experiment_id,
            "status": results.status,
            "control_performance": results.control_performance,
            "treatment_performance": results.treatment_performance,
            "statistical_significance": results.statistical_significance,
            "effect_size": results.effect_size,
            "confidence_interval": results.confidence_interval,
            "winner": results.winner,
            "recommendation": results.recommendation,
            "insights": results.insights,
            "analysis_timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting experiment results: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving experiment results: {str(e)}"
        )


@router.get("/experiments/active")
async def get_active_experiments(
    experiment_type: Optional[str] = Query(None, description="Filter by experiment type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of active A/B test experiments
    """
    try:
        experiments = ab_testing_service.get_active_experiments(db, experiment_type)
        
        return {
            "active_experiments": experiments,
            "count": len(experiments),
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting active experiments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving active experiments: {str(e)}"
        )


# Predictive Analytics Endpoints
@router.post("/predictions", response_model=PredictionResponse)
async def make_predictions(
    request: PredictionRequestModel,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Make predictions for customer behavior and outcomes
    """
    try:
        # Create prediction request
        prediction_request = PredictionRequest(
            user_id=current_user.id,
            order_context=request.order_context,
            prediction_types=request.prediction_types,
            include_confidence=request.include_confidence
        )
        
        # Get predictions
        predictions = predictive_analytics_service.make_predictions(db, prediction_request)
        
        # Get comprehensive behavior prediction
        behavior_prediction = predictive_analytics_service.predict_customer_behavior(
            db=db,
            user_id=current_user.id,
            order_context=request.order_context
        )
        
        return PredictionResponse(
            predictions=[
                {
                    "type": pred.prediction_type,
                    "value": pred.prediction_value,
                    "confidence": pred.confidence_score,
                    "explanation": pred.explanation,
                    "model_version": pred.model_version,
                    "feature_importance": pred.feature_importance
                }
                for pred in predictions
            ],
            behavior_prediction={
                "success_probability": behavior_prediction.success_probability,
                "satisfaction_prediction": behavior_prediction.satisfaction_prediction,
                "churn_risk": behavior_prediction.churn_risk,
                "next_order_timeline": behavior_prediction.next_order_timeline,
                "preferred_factors": behavior_prediction.preferred_factors,
                "risk_factors": behavior_prediction.risk_factors,
                "recommendations": behavior_prediction.recommendations
            } if behavior_prediction else None,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error making predictions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error making predictions: {str(e)}"
        )


@router.post("/models/train")
async def train_models(
    background_tasks: BackgroundTasks,
    model_types: Optional[List[str]] = Query(None, description="Model types to train"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Train or retrain prediction models (background task)
    """
    try:
        # Add training task to background
        background_tasks.add_task(
            predictive_analytics_service.train_models,
            db,
            model_types
        )
        
        return {
            "message": "Model training started in background",
            "model_types": model_types or "all",
            "started_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error starting model training: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting model training: {str(e)}"
        )


@router.get("/models/performance")
async def get_model_performance(
    model_type: str = Query(..., description="Model type to check performance"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get performance metrics for a specific model
    """
    try:
        performance = predictive_analytics_service.evaluate_model_performance(db, model_type)
        
        if not performance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active model found for type: {model_type}"
            )
        
        return {
            "model_name": performance.model_name,
            "model_type": model_type,
            "accuracy": performance.accuracy,
            "precision": performance.precision,
            "recall": performance.recall,
            "f1_score": performance.f1_score,
            "feature_importance": performance.feature_importance,
            "training_samples": performance.training_samples,
            "validation_date": performance.validation_date,
            "retrieved_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting model performance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving model performance: {str(e)}"
        )


# Real-time Optimization Endpoints
@router.get("/optimization/decisions")
async def get_optimization_decisions(
    limit: int = Query(50, ge=1, le=100, description="Number of recent decisions to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent real-time optimization decisions for analysis
    """
    try:
        decisions = db.query(RealtimeOptimization).filter(
            RealtimeOptimization.user_id == current_user.id
        ).order_by(desc(RealtimeOptimization.created_at)).limit(limit).all()
        
        return {
            "optimization_decisions": [
                {
                    "session_id": decision.session_id,
                    "optimization_trigger": decision.optimization_trigger,
                    "algorithm_selected": decision.algorithm_selected,
                    "personalization_level": decision.personalization_level,
                    "exploration_rate": decision.exploration_rate,
                    "confidence_score": decision.confidence_score,
                    "selection_reasoning": decision.selection_reasoning,
                    "optimization_outcome": decision.optimization_outcome,
                    "performance_metrics": decision.performance_metrics,
                    "created_at": decision.created_at
                }
                for decision in decisions
            ],
            "count": len(decisions),
            "user_id": current_user.id,
            "retrieved_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting optimization decisions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving optimization decisions: {str(e)}"
        )


@router.get("/insights")
async def get_personalization_insights(
    scope: str = Query("individual", pattern="^(individual|segment|global)$"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get personalization insights for the current user
    """
    try:
        query = db.query(PersonalizationInsight).filter(
            PersonalizationInsight.scope == scope
        )
        
        if scope == "individual":
            query = query.filter(PersonalizationInsight.target_user_id == current_user.id)
        
        insights = query.order_by(desc(PersonalizationInsight.created_at)).limit(limit).all()
        
        return {
            "insights": [
                {
                    "id": insight.id,
                    "insight_type": insight.insight_type,
                    "title": insight.title,
                    "description": insight.description,
                    "insight_data": insight.insight_data,
                    "confidence_level": insight.confidence_level,
                    "evidence_strength": insight.evidence_strength,
                    "is_actionable": insight.is_actionable,
                    "suggested_actions": insight.suggested_actions,
                    "business_impact": insight.business_impact,
                    "status": insight.status,
                    "created_at": insight.created_at
                }
                for insight in insights
            ],
            "count": len(insights),
            "scope": scope,
            "user_id": current_user.id if scope == "individual" else None,
            "retrieved_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting personalization insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving personalization insights: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for advanced personalization system
    """
    return {
        "status": "healthy",
        "service": "advanced_personalization",
        "version": "3.0.0",
        "features": [
            "individual_customer_profiles",
            "ab_testing_framework", 
            "predictive_analytics",
            "real_time_optimization",
            "multi_objective_optimization"
        ],
        "timestamp": datetime.now()
    } 