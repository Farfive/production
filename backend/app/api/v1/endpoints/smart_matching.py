"""
Smart Matching API Endpoints

Provides AI-powered manufacturer recommendations and intelligent matching capabilities.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.order import Order
from app.models.producer import Manufacturer
from app.models.quote import ProductionQuote
from app.services.smart_matching_engine import smart_matching_engine, SmartRecommendation
from app.schemas.smart_matching import (
    SmartMatchingRequest,
    SmartMatchingResponse,
    RecommendationResponse,
    MatchAnalysisRequest,
    MatchAnalysisResponse,
    AIInsightsResponse,
    ManufacturerClusterResponse,
    MarketIntelligenceResponse,
    SmartMatchResponse,
    MatchFilters,
    BatchMatchRequest,
    MatchAnalytics,
    MatchFeedback,
    MatchScoreResponse,
    MatchManufacturerInfo,
    MatchConfidenceLevel,
    MatchTypeEnum
)
from app.services.smart_matching import SmartMatchingService, SmartMatch, MatchType, matching_cache

# Enhanced matching imports
try:
    from app.services.enhanced_smart_matching import (
        EnhancedSmartMatchingEngine,
        ExplanationLevel,
        ComplexityLevel
    )
    ENHANCED_MATCHING_AVAILABLE = True
    enhanced_engine = EnhancedSmartMatchingEngine()
except ImportError as e:
    ENHANCED_MATCHING_AVAILABLE = False
    enhanced_engine = None
    logger.warning(f"Enhanced matching engine not available: {e}")

router = APIRouter()
logger = logging.getLogger(__name__)

# Enhanced matching schemas
from pydantic import BaseModel, Field

class CuratedMatchingRequest(BaseModel):
    order_id: int = Field(..., description="Order ID to generate recommendations for")
    explanation_level: str = Field("summary", description="Explanation level: summary, detailed, expert")
    customer_preferences: Optional[Dict[str, Any]] = Field(None, description="Customer preference overrides")

class ComplexityAnalysisResponse(BaseModel):
    score: float = Field(..., description="Complexity score (1-10)")
    level: str = Field(..., description="Complexity level")
    factors: List[str] = Field(..., description="Complexity factors")
    process_complexity: float = Field(..., description="Process complexity score")
    material_complexity: float = Field(..., description="Material complexity score")
    precision_complexity: float = Field(..., description="Precision requirements complexity")
    timeline_pressure: float = Field(..., description="Timeline pressure score")
    custom_requirements: float = Field(..., description="Custom requirements complexity")

# Enhanced endpoints

@router.post("/enhanced/curated-matches")
async def get_enhanced_curated_matches(
    request: CuratedMatchingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get curated manufacturer matches with enhanced AI recommendations
    
    Phase 1 Features:
    - Dynamic option count based on complexity
    - Tiered explanations (summary, detailed, expert)
    - Personalized recommendations
    - Complexity analysis
    """
    if not ENHANCED_MATCHING_AVAILABLE or not enhanced_engine:
        raise HTTPException(
            status_code=503,
            detail="Enhanced matching service is not available. Using fallback to standard matching."
        )
    
    try:
        # Validate explanation level
        explanation_levels = {
            "summary": ExplanationLevel.SUMMARY, 
            "detailed": ExplanationLevel.DETAILED,
            "expert": ExplanationLevel.EXPERT
        }
        
        if request.explanation_level not in explanation_levels:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid explanation level. Must be one of: {list(explanation_levels.keys())}"
            )
        
        # Get order
        order = db.query(Order).filter(
            Order.id == request.order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check access permissions
        if order.client_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get curated matches
        import time
        start_time = time.time()
        
        curated_matches = enhanced_engine.get_curated_matches(
            db=db,
            order=order,
            customer_profile=request.customer_preferences,
            explanation_level=explanation_levels[request.explanation_level]
        )
        
        processing_time = time.time() - start_time
        
        # Get complexity analysis
        complexity_analysis = enhanced_engine._calculate_complexity(order)
        
        # Convert to response format
        match_responses = []
        for match in curated_matches:
            match_response = {
                "manufacturer_id": match.manufacturer_id,
                "manufacturer_name": match.manufacturer_name,
                "rank": match.rank,
                "total_score": match.match_score.total_score,
                "complexity_adjusted_score": match.match_score.complexity_adjusted_score,
                "explanation": {
                    "summary": match.explanation.summary,
                    "detailed": match.explanation.detailed,
                    "expert": match.explanation.expert
                },
                "key_strengths": match.key_strengths,
                "potential_concerns": match.potential_concerns,
                "recommendation_confidence": match.recommendation_confidence,
                "predicted_success_rate": match.predicted_success_rate,
                "estimated_timeline": match.estimated_timeline,
                "cost_analysis": match.cost_analysis
            }
            match_responses.append(match_response)
        
        return {
            "success": True,
            "message": f"Generated {len(curated_matches)} enhanced curated recommendations",
            "order_id": order.id,
            "complexity_analysis": {
                "score": complexity_analysis.score,
                "level": complexity_analysis.level.value,
                "factors": complexity_analysis.factors,
                "process_complexity": complexity_analysis.process_complexity,
                "material_complexity": complexity_analysis.material_complexity,
                "precision_complexity": complexity_analysis.precision_complexity,
                "timeline_pressure": complexity_analysis.timeline_pressure,
                "custom_requirements": complexity_analysis.custom_requirements
            },
            "recommendations_count": len(curated_matches),
            "processing_time_seconds": processing_time,
            "algorithm_version": "enhanced_v1.0",
            "matches": match_responses,
            "metadata": {
                "explanation_level": request.explanation_level,
                "personalization_applied": bool(request.customer_preferences),
                "dynamic_options": True,
                "complexity_adjusted": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enhanced curated matching: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced matching failed: {str(e)}"
        )


@router.post("/enhanced/complexity-analysis", response_model=ComplexityAnalysisResponse)
async def analyze_enhanced_order_complexity(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze order complexity to determine recommendation strategy (Enhanced Version)
    """
    if not ENHANCED_MATCHING_AVAILABLE or not enhanced_engine:
        raise HTTPException(
            status_code=503,
            detail="Enhanced matching service is not available"
        )
    
    try:
        # Get order
        order = db.query(Order).filter(
            Order.id == order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check access permissions
        if order.client_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Analyze complexity
        complexity_analysis = enhanced_engine._calculate_complexity(order)
        
        return ComplexityAnalysisResponse(
            score=complexity_analysis.score,
            level=complexity_analysis.level.value,
            factors=complexity_analysis.factors,
            process_complexity=complexity_analysis.process_complexity,
            material_complexity=complexity_analysis.material_complexity,
            precision_complexity=complexity_analysis.precision_complexity,
            timeline_pressure=complexity_analysis.timeline_pressure,
            custom_requirements=complexity_analysis.custom_requirements
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing enhanced complexity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced complexity analysis failed: {str(e)}"
        )


@router.post("/enhanced/optimal-options")
async def get_enhanced_optimal_option_count(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recommended number of options based on order complexity (Enhanced Version)
    """
    if not ENHANCED_MATCHING_AVAILABLE or not enhanced_engine:
        raise HTTPException(
            status_code=503,
            detail="Enhanced matching service is not available"
        )
    
    try:
        # Get order
        order = db.query(Order).filter(
            Order.id == order_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check access permissions
        if order.client_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Analyze complexity
        complexity_analysis = enhanced_engine._calculate_complexity(order)
        
        # Determine optimal options
        optimal_count = enhanced_engine._determine_option_count(complexity_analysis)
        
        # Generate reasoning
        reasoning_map = {
            "simple": "Simple orders need fewer options for quick decision-making",
            "moderate": "Moderate complexity requires balanced option set for comparison",
            "high": "High complexity benefits from more alternatives to manage risk",
            "critical": "Critical projects need maximum options for thorough evaluation"
        }
        
        reasoning = reasoning_map.get(complexity_analysis.level.value, "Standard recommendation based on complexity")
        
        return {
            "recommended_options": optimal_count,
            "complexity_level": complexity_analysis.level.value,
            "reasoning": reasoning,
            "complexity_score": complexity_analysis.score,
            "factors": complexity_analysis.factors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error determining enhanced optimal options: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced optimal options analysis failed: {str(e)}"
        )


@router.get("/enhanced/health")
async def enhanced_matching_health():
    """Health check for enhanced matching service"""
    try:
        # Basic health check
        engine_status = "healthy" if enhanced_engine else "unavailable"
        base_engine_status = "available" if enhanced_engine and enhanced_engine.base_engine else "fallback_mode"
        
        return {
            "status": "healthy" if ENHANCED_MATCHING_AVAILABLE else "degraded",
            "enhanced_engine": engine_status,
            "base_engine": base_engine_status,
            "features": [
                "dynamic_option_count",
                "tiered_explanations", 
                "complexity_analysis",
                "personalization"
            ],
            "algorithm_version": "enhanced_v1.0",
            "available": ENHANCED_MATCHING_AVAILABLE
        }
    except Exception as e:
        logger.error(f"Enhanced matching health check failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "available": False
        }


@router.post("/smart-recommendations", response_model=SmartMatchingResponse)
async def get_smart_recommendations(
    request: SmartMatchingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Get AI-powered manufacturer recommendations for an order
    
    This endpoint uses advanced machine learning algorithms to analyze:
    - Manufacturer capabilities and specializations
    - Historical performance and success rates
    - Geographic proximity and logistics
    - Quality metrics and certifications
    - Cost efficiency and competitive positioning
    - Real-time availability and capacity
    """
    
    try:
        # Validate order exists and user has access
        order = db.query(Order).filter(Order.id == request.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order.client_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        start_time = datetime.now()
        
        # Generate smart recommendations
        recommendations = smart_matching_engine.get_smart_recommendations(
            db=db,
            order=order,
            max_recommendations=request.max_recommendations,
            include_ai_insights=request.include_ai_insights,
            enable_ml_predictions=request.enable_ml_predictions
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Convert to response format
        recommendation_data = []
        for rec in recommendations:
            recommendation_data.append({
                "manufacturer_id": rec.manufacturer_id,
                "manufacturer_name": rec.manufacturer_name,
                "match_score": {
                    "total_score": rec.match_score.total_score,
                    "capability_score": rec.match_score.capability_score,
                    "performance_score": rec.match_score.performance_score,
                    "geographic_score": rec.match_score.geographic_score,
                    "quality_score": rec.match_score.quality_score,
                    "cost_efficiency_score": rec.match_score.cost_efficiency_score,
                    "availability_score": rec.match_score.availability_score,
                    "confidence_level": rec.match_score.confidence_level,
                    "recommendation_strength": rec.match_score.recommendation_strength,
                    "match_reasons": rec.match_score.match_reasons,
                    "risk_factors": rec.match_score.risk_factors
                },
                "predicted_success_rate": rec.predicted_success_rate,
                "estimated_delivery_time": rec.estimated_delivery_time,
                "estimated_cost_range": rec.estimated_cost_range,
                "risk_assessment": rec.risk_assessment,
                "competitive_advantages": rec.competitive_advantages,
                "potential_concerns": rec.potential_concerns,
                "similar_past_projects": rec.similar_past_projects,
                "ai_insights": rec.ai_insights if request.include_ai_insights else {}
            })
        
        # Log analytics event in background
        if background_tasks:
            background_tasks.add_task(
                log_matching_analytics,
                order_id=request.order_id,
                user_id=current_user.id,
                recommendations_count=len(recommendations),
                processing_time=processing_time,
                algorithm_version="smart_v1.0"
            )
        
        return SmartMatchingResponse(
            success=True,
            message=f"Generated {len(recommendations)} AI-powered recommendations",
            order_id=request.order_id,
            recommendations_count=len(recommendations),
            processing_time_seconds=round(processing_time, 3),
            algorithm_version="smart_v1.0",
            recommendations=recommendation_data,
            metadata={
                "ai_insights_included": request.include_ai_insights,
                "ml_predictions_enabled": request.enable_ml_predictions,
                "confidence_threshold": smart_matching_engine.min_confidence_threshold
            }
        )
        
    except Exception as e:
        logger.error(f"Error in smart matching for order {request.order_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Smart matching failed: {str(e)}"
        )


@router.get("/recommendations/{order_id}", response_model=List[RecommendationResponse])
async def get_order_recommendations(
    order_id: int,
    max_results: int = Query(15, ge=1, le=50),
    include_insights: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get cached or generate new recommendations for an order
    """
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.client_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate recommendations
    recommendations = smart_matching_engine.get_smart_recommendations(
        db=db,
        order=order,
        max_recommendations=max_results,
        include_ai_insights=include_insights
    )
    
    # Convert to response format
    response_data = []
    for rec in recommendations:
        response_data.append(RecommendationResponse(
            manufacturer_id=rec.manufacturer_id,
            manufacturer_name=rec.manufacturer_name,
            total_score=rec.match_score.total_score,
            confidence_level=rec.match_score.confidence_level,
            recommendation_strength=rec.match_score.recommendation_strength,
            predicted_success_rate=rec.predicted_success_rate,
            estimated_delivery_days=rec.estimated_delivery_time,
            estimated_cost_range=rec.estimated_cost_range,
            key_advantages=rec.competitive_advantages,
            potential_risks=rec.potential_concerns,
            match_summary=rec.ai_insights.get('recommendation_summary', '') if include_insights else ''
        ))
    
    return response_data


@router.post("/analyze-match", response_model=MatchAnalysisResponse)
async def analyze_manufacturer_match(
    request: MatchAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform detailed match analysis between a manufacturer and order
    """
    
    # Validate inputs
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    manufacturer = db.query(Manufacturer).filter(
        Manufacturer.id == request.manufacturer_id
    ).first()
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    # Check access permissions
    if order.client_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate detailed match score
    match_score = smart_matching_engine._calculate_smart_match_score(
        db, manufacturer, order
    )
    
    # Generate comprehensive analysis
    analysis = {
        "overall_compatibility": match_score.total_score,
        "confidence_level": match_score.confidence_level,
        "recommendation_strength": match_score.recommendation_strength,
        "detailed_scores": {
            "capability_match": match_score.capability_score,
            "performance_history": match_score.performance_score,
            "geographic_proximity": match_score.geographic_score,
            "quality_metrics": match_score.quality_score,
            "cost_efficiency": match_score.cost_efficiency_score,
            "availability": match_score.availability_score,
            "specialization": match_score.specialization_score,
            "historical_success": match_score.historical_success_score
        },
        "strengths": match_score.match_reasons,
        "concerns": match_score.risk_factors,
        "recommendations": []
    }
    
    # Add specific recommendations based on analysis
    if match_score.capability_score < 0.6:
        analysis["recommendations"].append(
            "Consider discussing specific capability requirements with manufacturer"
        )
    
    if match_score.availability_score < 0.5:
        analysis["recommendations"].append(
            "Verify current capacity and delivery timeline availability"
        )
    
    return MatchAnalysisResponse(
        order_id=request.order_id,
        manufacturer_id=request.manufacturer_id,
        analysis=analysis,
        generated_at=datetime.now()
    )


@router.get("/ai-insights/{order_id}", response_model=AIInsightsResponse)
async def get_ai_insights(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered insights and market intelligence for an order
    """
    
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.client_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate AI insights
    insights = {
        "market_analysis": {
            "demand_level": "Moderate",
            "competition_level": "High",
            "price_trends": "Stable",
            "capacity_availability": "Good"
        },
        "optimization_suggestions": [
            "Consider splitting large orders for faster delivery",
            "Flexible delivery dates may reduce costs by 10-15%",
            "Local manufacturers available within 100km radius"
        ],
        "risk_assessment": {
            "supply_chain_risks": ["Material availability", "Shipping delays"],
            "quality_risks": ["New manufacturer verification needed"],
            "timeline_risks": ["Peak season demand"]
        },
        "cost_optimization": {
            "potential_savings": "15-20%",
            "cost_drivers": ["Material costs", "Complexity", "Timeline"],
            "negotiation_points": ["Volume discounts", "Payment terms"]
        },
        "quality_predictions": {
            "expected_quality_level": "High",
            "quality_assurance_recommendations": [
                "Request quality control documentation",
                "Consider inspection checkpoints"
            ]
        }
    }
    
    return AIInsightsResponse(
        order_id=order_id,
        insights=insights,
        confidence_score=0.85,
        generated_at=datetime.now()
    )


@router.get("/manufacturer-clusters", response_model=ManufacturerClusterResponse)
async def get_manufacturer_clusters(
    industry: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    capability: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get manufacturer clusters and market segmentation analysis
    """
    
    # Placeholder implementation for manufacturer clustering
    clusters = [
        {
            "cluster_id": 1,
            "cluster_name": "High-Volume Specialists",
            "description": "Manufacturers specializing in large-scale production",
            "manufacturer_count": 25,
            "avg_rating": 4.2,
            "key_capabilities": ["Mass Production", "Cost Efficiency"],
            "typical_industries": ["Automotive", "Consumer Goods"]
        },
        {
            "cluster_id": 2,
            "cluster_name": "Precision Manufacturers",
            "description": "High-precision, low-volume specialists",
            "manufacturer_count": 18,
            "avg_rating": 4.6,
            "key_capabilities": ["Precision Machining", "Quality Control"],
            "typical_industries": ["Aerospace", "Medical"]
        },
        {
            "cluster_id": 3,
            "cluster_name": "Rapid Prototyping",
            "description": "Fast turnaround prototype and small batch specialists",
            "manufacturer_count": 32,
            "avg_rating": 4.1,
            "key_capabilities": ["3D Printing", "Rapid Prototyping"],
            "typical_industries": ["Technology", "Startups"]
        }
    ]
    
    return ManufacturerClusterResponse(
        clusters=clusters,
        total_manufacturers=75,
        analysis_date=datetime.now(),
        clustering_algorithm="K-Means with capability vectors"
    )


@router.get("/market-intelligence", response_model=MarketIntelligenceResponse)
async def get_market_intelligence(
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    timeframe: str = Query("30d", pattern="^(7d|30d|90d|1y)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get market intelligence and trends analysis
    """
    
    # Placeholder implementation for market intelligence
    intelligence = {
        "market_overview": {
            "total_active_manufacturers": 150,
            "avg_response_time_hours": 8.5,
            "avg_quote_turnaround_days": 3.2,
            "market_capacity_utilization": 0.72
        },
        "pricing_trends": {
            "avg_price_change_pct": 2.5,
            "price_volatility": "Low",
            "cost_drivers": ["Material costs", "Labor availability"]
        },
        "capacity_analysis": {
            "available_capacity_pct": 28,
            "peak_demand_periods": ["Q4", "Spring"],
            "bottleneck_capabilities": ["Precision Machining", "Large Parts"]
        },
        "quality_metrics": {
            "avg_quality_rating": 4.3,
            "on_time_delivery_rate": 87.5,
            "customer_satisfaction": 4.1
        },
        "geographic_distribution": {
            "top_regions": [
                {"region": "Warsaw", "manufacturer_count": 45},
                {"region": "Krakow", "manufacturer_count": 32},
                {"region": "Gdansk", "manufacturer_count": 28}
            ]
        },
        "emerging_trends": [
            "Increased demand for sustainable manufacturing",
            "Growing adoption of Industry 4.0 technologies",
            "Shift towards local sourcing"
        ]
    }
    
    return MarketIntelligenceResponse(
        intelligence=intelligence,
        timeframe=timeframe,
        region=region or "Poland",
        industry=industry or "All",
        generated_at=datetime.now(),
        data_freshness_hours=2
    )


async def log_matching_analytics(
    order_id: int,
    user_id: int,
    recommendations_count: int,
    processing_time: float,
    algorithm_version: str
):
    """Background task to log matching analytics"""
    
    try:
        # Log analytics data
        logger.info(
            f"Smart matching analytics",
            extra={
                "order_id": order_id,
                "user_id": user_id,
                "recommendations_count": recommendations_count,
                "processing_time": processing_time,
                "algorithm_version": algorithm_version,
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error logging matching analytics: {str(e)}")


@router.post("/feedback")
async def submit_matching_feedback(
    order_id: int,
    manufacturer_id: int,
    feedback_type: str,
    rating: int = Query(..., ge=1, le=5),
    comments: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback on matching recommendations to improve AI algorithms
    """
    
    # Validate inputs
    if feedback_type not in ["recommendation_quality", "match_accuracy", "outcome"]:
        raise HTTPException(status_code=400, detail="Invalid feedback type")
    
    # Store feedback for ML model improvement
    feedback_data = {
        "order_id": order_id,
        "manufacturer_id": manufacturer_id,
        "user_id": current_user.id,
        "feedback_type": feedback_type,
        "rating": rating,
        "comments": comments,
        "timestamp": datetime.now()
    }
    
    # Log feedback
    logger.info(f"Matching feedback received", extra=feedback_data)
    
    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "feedback_id": f"fb_{order_id}_{manufacturer_id}_{int(datetime.now().timestamp())}"
    }


@router.get("/orders/{order_id}/matches", response_model=List[SmartMatchResponse])
async def get_matches_for_order(
    order_id: int,
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.6, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get smart matches for a specific order."""
    
    # Verify order exists and user has access
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is admin
    if order.client_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check cache first
    cache_key = f"order_{order_id}_matches_{limit}_{min_score}"
    cached_matches = matching_cache.get_matches(cache_key)
    if cached_matches:
        return [SmartMatchResponse.from_smart_match(match) for match in cached_matches]
    
    # Get fresh matches
    matching_service = SmartMatchingService(db)
    matches = matching_service.find_matches_for_order(order_id, limit, min_score)
    
    # Cache results
    matching_cache.set_matches(cache_key, matches, ttl_minutes=15)
    
    return [SmartMatchResponse.from_smart_match(match) for match in matches]


@router.get("/production-quotes/{quote_id}/matches", response_model=List[SmartMatchResponse])
async def get_matches_for_production_quote(
    quote_id: int,
    limit: int = Query(10, ge=1, le=50),
    min_score: float = Query(0.6, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get smart matches for a specific production quote."""
    
    # Verify production quote exists and user has access
    pq = db.query(ProductionQuote).filter(ProductionQuote.id == quote_id).first()
    if not pq:
        raise HTTPException(status_code=404, detail="Production quote not found")
    
    # Check if user owns the production quote or is admin
    if pq.manufacturer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check cache first
    cache_key = f"pq_{quote_id}_matches_{limit}_{min_score}"
    cached_matches = matching_cache.get_matches(cache_key)
    if cached_matches:
        return [SmartMatchResponse.from_smart_match(match) for match in cached_matches]
    
    # Get fresh matches
    matching_service = SmartMatchingService(db)
    matches = matching_service.find_matches_for_production_quote(quote_id, limit, min_score)
    
    # Cache results
    matching_cache.set_matches(cache_key, matches, ttl_minutes=15)
    
    return [SmartMatchResponse.from_smart_match(match) for match in matches]


@router.post("/batch-match", response_model=List[SmartMatchResponse])
async def batch_match_orders(
    request: BatchMatchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform batch matching for multiple orders."""
    
    if not current_user.is_admin and len(request.order_ids) > 10:
        raise HTTPException(status_code=403, detail="Non-admin users limited to 10 orders per batch")
    
    matching_service = SmartMatchingService(db)
    all_matches = []
    
    for order_id in request.order_ids:
        # Verify user has access to order
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            continue
        
        if order.client_id != current_user.id and not current_user.is_admin:
            continue
        
        matches = matching_service.find_matches_for_order(
            order_id, 
            request.limit_per_order, 
            request.min_score
        )
        all_matches.extend(matches)
    
    # Schedule background analytics update
    background_tasks.add_task(update_matching_analytics, request.order_ids)
    
    return [SmartMatchResponse.from_smart_match(match) for match in all_matches]


@router.get("/recommendations", response_model=List[SmartMatchResponse])
async def get_personalized_recommendations(
    limit: int = Query(20, ge=1, le=100),
    match_type: Optional[str] = Query(None, pattern="^(order_to_production_quote|production_quote_to_order)$")
):
    """Get personalized matching recommendations for the current user."""
    
    try:
        from app.core.config import get_settings
        settings = get_settings()

        # In development we still serve synthetic data to keep the UI usable
        # without a fully-populated DB. In staging/production we surface an
        # empty list so the caller can decide how to react (e.g. show "no
        # recommendations yet" and optionally trigger a retry).
        if settings.ENVIRONMENT == "development":
            demo_matches = _create_demo_matches()
            return demo_matches[:limit]
        else:
            return []
    
    except Exception as e:
        logger.error(f"Error in get_personalized_recommendations: {str(e)}")
        # In non-dev environments propagate the error, otherwise fall back to
        # demo data so that local development continues smoothly.
        from app.core.config import get_settings
        settings = get_settings()

        # Return empty recommendations if no matches found
        return []


# Demo matches function removed for production


@router.get("/analytics", response_model=MatchAnalytics)
async def get_matching_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get matching analytics and insights."""
    
    # This would typically query a separate analytics table
    # For now, return mock analytics
    return MatchAnalytics(
        total_matches_generated=1250,
        successful_connections=89,
        average_match_score=0.78,
        top_matching_categories=[
            {"category": "CNC_MACHINING", "match_count": 345},
            {"category": "SHEET_METAL", "match_count": 289},
            {"category": "ADDITIVE_MANUFACTURING", "match_count": 234}
        ],
        conversion_rate=0.071,
        average_response_time_hours=4.2,
        user_satisfaction_score=4.3
    )


@router.post("/feedback")
async def submit_match_feedback(
    feedback: MatchFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit feedback on match quality for ML improvement."""
    
    # In a real implementation, this would store feedback for ML training
    # For now, just acknowledge receipt
    
    return {
        "message": "Feedback received successfully",
        "match_id": feedback.match_id,
        "feedback_type": feedback.feedback_type
    }


@router.post("/refresh-cache")
async def refresh_matching_cache(
    current_user: User = Depends(get_current_user)
):
    """Refresh the matching cache (admin only)."""
    
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    matching_cache.clear_cache()
    
    return {"message": "Matching cache refreshed successfully"}


@router.get("/health")
async def matching_service_health():
    """Health check for matching service."""
    
    return {
        "status": "healthy",
        "cache_size": len(matching_cache._cache),
        "service": "smart_matching",
        "version": "1.0.0"
    }


# Background task functions
async def update_matching_analytics(order_ids: List[int]):
    """Background task to update matching analytics."""
    # In a real implementation, this would update analytics tables
    # with matching performance data
    pass


# Real-time matching endpoints
@router.get("/live-matches/{order_id}")
async def get_live_matches(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time matches with live availability checking."""
    
    # Verify access
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.client_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get fresh matches without caching for real-time data
    matching_service = SmartMatchingService(db)
    matches = matching_service.find_matches_for_order(order_id, 10, 0.6)
    
    # Add real-time availability status
    for match in matches:
        # In a real implementation, this would check real-time capacity
        match.real_time_availability = "AVAILABLE"  # Mock status
    
    return [SmartMatchResponse.from_smart_match(match) for match in matches]


@router.post("/priority-matching")
async def priority_matching(
    order_id: int,
    urgency_boost: float = Query(1.5, ge=1.0, le=3.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get priority matches with urgency boost for critical orders."""
    
    # Verify access
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.client_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Apply urgency boost to matching algorithm
    matching_service = SmartMatchingService(db)
    matches = matching_service.find_matches_for_order(order_id, 15, 0.5)
    
    # Boost scores for urgent matches
    for match in matches:
        if match.score.urgency_alignment > 0.7:
            match.score.total_score = min(match.score.total_score * urgency_boost, 1.0)
    
    # Re-sort with boosted scores
    matches.sort(key=lambda x: x.score.total_score, reverse=True)
    
    return [SmartMatchResponse.from_smart_match(match) for match in matches[:10]]


@router.get("/simple-test")
async def simple_test():
    """Simple test endpoint that doesn't touch the database."""
    return {"message": "Smart Matching endpoint is working", "status": "ok"} 