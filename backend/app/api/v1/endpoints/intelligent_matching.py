from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.producer import Manufacturer
from app.services.intelligent_matching import intelligent_matching_service, MatchingWeights


router = APIRouter()


class MatchingRequest(BaseModel):
    """Request model for manufacturer matching"""
    order_id: int
    max_results: int = Field(default=10, ge=1, le=50)
    enable_fallback: bool = True
    ab_test_group: Optional[str] = None
    custom_weights: Optional[dict] = None


class BroadcastRequest(BaseModel):
    """Request model for broadcasting to multiple manufacturers"""
    order_id: int
    manufacturer_ids: List[int]


class MatchingResponse(BaseModel):
    """Response model for matching results"""
    success: bool
    message: str
    order_id: int
    matches_found: int
    processing_time_seconds: float
    matches: List[dict]
    ab_test_group: Optional[str] = None


class BroadcastResponse(BaseModel):
    """Response model for broadcast results"""
    success: bool
    message: str
    broadcast_results: dict


@router.post("/find-matches", response_model=MatchingResponse)
async def find_manufacturer_matches(
    request: MatchingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find best manufacturer matches for an order using intelligent scoring algorithm
    
    Features:
    - Capability-based scoring (80% weight) with fuzzy matching
    - Geographic proximity scoring (15% weight) using coordinates
    - Historical performance scoring (5% weight) from ratings and delivery
    - Real-time availability checking
    - Capacity-based filtering
    - Lead time compatibility
    - Quality certification matching
    - Fallback mechanisms for no matches
    """
    import time
    start_time = time.time()
    
    # Verify order exists and user has permission
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is an admin
    if order.client_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
    
    try:
        # Configure custom weights if provided
        service = intelligent_matching_service
        if request.custom_weights:
            custom_weights = MatchingWeights(
                capability_weight=request.custom_weights.get('capability_weight', 0.80),
                geographic_weight=request.custom_weights.get('geographic_weight', 0.15),
                performance_weight=request.custom_weights.get('performance_weight', 0.05)
            )
            service.weights = custom_weights
        
        # Find matches
        matches = service.find_best_matches(
            db=db,
            order=order,
            max_results=request.max_results,
            enable_fallback=request.enable_fallback,
            ab_test_group=request.ab_test_group
        )
        
        processing_time = time.time() - start_time
        
        # Convert matches to response format
        match_data = [match.to_dict() for match in matches]
        
        return MatchingResponse(
            success=True,
            message=f"Found {len(matches)} matching manufacturers",
            order_id=request.order_id,
            matches_found=len(matches),
            processing_time_seconds=round(processing_time, 3),
            matches=match_data,
            ab_test_group=request.ab_test_group
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in matching algorithm: {str(e)}"
        )


@router.post("/broadcast", response_model=BroadcastResponse)
async def broadcast_to_manufacturers(
    request: BroadcastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Broadcast order to multiple manufacturers for competitive bidding
    
    This endpoint allows clients to send their order to multiple pre-selected
    manufacturers simultaneously, enabling competitive bidding.
    """
    
    # Verify order exists and user has permission
    order = db.query(Order).filter(Order.id == request.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.client_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
    
    # Verify manufacturers exist
    manufacturers = db.query(Manufacturer).filter(
        Manufacturer.id.in_(request.manufacturer_ids)
    ).all()
    
    if len(manufacturers) != len(request.manufacturer_ids):
        found_ids = [m.id for m in manufacturers]
        missing_ids = [id for id in request.manufacturer_ids if id not in found_ids]
        raise HTTPException(
            status_code=400,
            detail=f"Manufacturers not found: {missing_ids}"
        )
    
    try:
        broadcast_results = intelligent_matching_service.broadcast_to_multiple_manufacturers(
            db=db,
            order=order,
            manufacturer_ids=request.manufacturer_ids
        )
        
        return BroadcastResponse(
            success=True,
            message=f"Order broadcasted to {len(manufacturers)} manufacturers",
            broadcast_results=broadcast_results
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error broadcasting order: {str(e)}"
        )


@router.get("/algorithm-config")
async def get_algorithm_configuration(
    current_user: User = Depends(get_current_user)
):
    """
    Get current algorithm configuration and weights
    
    Returns the current scoring weights and configuration parameters
    used by the intelligent matching algorithm.
    """
    
    return {
        "weights": {
            "capability_weight": intelligent_matching_service.weights.capability_weight,
            "geographic_weight": intelligent_matching_service.weights.geographic_weight,
            "performance_weight": intelligent_matching_service.weights.performance_weight
        },
        "thresholds": {
            "fuzzy_threshold": intelligent_matching_service.fuzzy_threshold,
            "min_match_score": intelligent_matching_service.min_match_score
        },
        "geographic_settings": {
            "max_distance_km": intelligent_matching_service.max_distance_km,
            "local_radius_km": intelligent_matching_service.local_radius_km
        },
        "performance_settings": {
            "enable_caching": intelligent_matching_service.enable_caching,
            "cache_ttl_minutes": intelligent_matching_service.cache_ttl_minutes
        }
    }


@router.get("/manufacturers/{manufacturer_id}/match-analysis")
async def analyze_manufacturer_match(
    manufacturer_id: int,
    order_id: int = Query(..., description="Order ID to analyze match against"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze how well a specific manufacturer matches an order
    
    Provides detailed breakdown of matching scores for a specific
    manufacturer-order pair, useful for understanding algorithm decisions.
    """
    
    # Verify order and manufacturer exist
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    manufacturer = db.query(Manufacturer).filter(Manufacturer.id == manufacturer_id).first()
    if not manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    # Check permissions
    if order.client_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
    
    try:
        # Calculate detailed match analysis
        match_result = intelligent_matching_service._calculate_comprehensive_score(manufacturer, order)
        
        return {
            "manufacturer_id": manufacturer_id,
            "manufacturer_name": manufacturer.business_name,
            "order_id": order_id,
            "order_title": order.title,
            "analysis": match_result.to_dict(),
            "detailed_breakdown": {
                "capability_analysis": {
                    "score": round(match_result.capability_score, 3),
                    "weight": intelligent_matching_service.weights.capability_weight,
                    "weighted_contribution": round(
                        match_result.capability_score * intelligent_matching_service.weights.capability_weight, 3
                    ),
                    "capability_matches": match_result.capability_matches
                },
                "geographic_analysis": {
                    "score": round(match_result.geographic_score, 3),
                    "weight": intelligent_matching_service.weights.geographic_weight,
                    "weighted_contribution": round(
                        match_result.geographic_score * intelligent_matching_service.weights.geographic_weight, 3
                    ),
                    "distance_km": match_result.distance_km,
                    "manufacturer_location": f"{manufacturer.city}, {manufacturer.country}"
                },
                "performance_analysis": {
                    "score": round(match_result.performance_score, 3),
                    "weight": intelligent_matching_service.weights.performance_weight,
                    "weighted_contribution": round(
                        match_result.performance_score * intelligent_matching_service.weights.performance_weight, 3
                    ),
                    "overall_rating": float(manufacturer.overall_rating or 0),
                    "orders_completed": manufacturer.total_orders_completed,
                    "on_time_delivery_rate": manufacturer.on_time_delivery_rate
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing match: {str(e)}"
        )


@router.get("/statistics")
async def get_matching_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get matching algorithm statistics and performance metrics
    
    Provides insights into algorithm performance for platform optimization.
    Admin only endpoint.
    """
    
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get basic statistics
        total_manufacturers = db.query(Manufacturer).filter(Manufacturer.is_active == True).count()
        verified_manufacturers = db.query(Manufacturer).filter(
            Manufacturer.is_active == True,
            Manufacturer.is_verified == True
        ).count()
        
        total_orders = db.query(Order).count()
        active_orders = db.query(Order).filter(Order.status.in_(['active', 'quoted'])).count()
        
        return {
            "platform_statistics": {
                "total_active_manufacturers": total_manufacturers,
                "verified_manufacturers": verified_manufacturers,
                "verification_rate": round((verified_manufacturers / total_manufacturers) * 100, 1) if total_manufacturers > 0 else 0,
                "total_orders": total_orders,
                "active_orders": active_orders
            },
            "algorithm_performance": {
                "avg_processing_time_ms": "See logs for detailed metrics",
                "cache_hit_rate": "Not implemented",
                "fallback_usage_rate": "See logs for detailed metrics"
            },
            "matching_quality": {
                "avg_match_score": "Calculate from recent matches",
                "successful_match_rate": "Track order completion rates",
                "client_satisfaction": "From ratings and feedback"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving statistics: {str(e)}"
        ) 