from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from loguru import logger
from pydantic import BaseModel, Field

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.services.manufacturer_discovery_service import ManufacturerDiscoveryService
from app.schemas.manufacturer import ManufacturerDiscoveryResponse, ManufacturerAnalytics

router = APIRouter()

# Initialize service
manufacturer_discovery_service = ManufacturerDiscoveryService()

# ---------------------------------------------------------------------------
#  Production Capacity (lightweight implementation for loop-closure)
# ---------------------------------------------------------------------------

class CapabilityEntry(BaseModel):
    category: str
    currentUtilization: float = Field(..., ge=0, le=100)
    maxCapacity: float = Field(100, ge=1)
    averageLeadTime: int = Field(..., ge=0)


class ProductionCapacityPayload(BaseModel):
    totalUtilization: float = Field(..., ge=0, le=100)
    capabilities: List[CapabilityEntry]


# Very simple in-memory store keyed by manufacturer/user id
_CAPACITY_STORE: Dict[int, ProductionCapacityPayload] = {}

# Helper to get capacity (returns default mock if none stored)
def _get_capacity_for_user(user_id: int) -> ProductionCapacityPayload:
    if user_id not in _CAPACITY_STORE:
        # seed with default values similar to frontend INITIAL_CAPACITY
        _CAPACITY_STORE[user_id] = ProductionCapacityPayload(
            totalUtilization=75.5,
            capabilities=[
                CapabilityEntry(category="CNC_MACHINING", currentUtilization=75, maxCapacity=100, averageLeadTime=7),
                CapabilityEntry(category="SHEET_METAL", currentUtilization=60, maxCapacity=100, averageLeadTime=5),
                CapabilityEntry(category="ASSEMBLY", currentUtilization=90, maxCapacity=100, averageLeadTime=3),
            ],
        )
    return _CAPACITY_STORE[user_id]


# ---------------------------------------------------------------------------
#  Capacity Endpoints
# ---------------------------------------------------------------------------


@router.get("/capacity", response_model=ProductionCapacityPayload)
def get_production_capacity(
    current_user: User = Depends(get_current_user),
):
    """Return current production-capacity profile for the authenticated manufacturer user."""
    try:
        return _get_capacity_for_user(current_user.id)
    except Exception as e:
        logger.error(f"Error fetching capacity: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch production capacity")


@router.put("/capacity", response_model=ProductionCapacityPayload)
def update_production_capacity(
    payload: ProductionCapacityPayload,
    current_user: User = Depends(get_current_user),
):
    """Update production capacity for the manufacturer."""
    try:
        _CAPACITY_STORE[current_user.id] = payload
        logger.info(f"Capacity updated for manufacturer {current_user.id}")
        return payload
    except Exception as e:
        logger.error(f"Error updating capacity: {e}")
        raise HTTPException(status_code=500, detail="Failed to update production capacity")


@router.get("/", response_model=List[Dict[str, Any]])
def get_manufacturers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of manufacturers with basic filtering
    """
    try:
        # For now, return mock data since we don't have manufacturer profiles in the database yet
        mock_manufacturers = [
            {
                "id": 1,
                "company_name": "TechParts Manufacturing",
                "description": "Leading CNC machining and precision manufacturing",
                "location": {"city": "Detroit", "state": "MI", "country": "US"},
                "rating": 4.8,
                "review_count": 245,
                "capabilities": ["CNC Machining", "Precision Manufacturing"],
                "verified": True,
                "active": True
            },
            {
                "id": 2,
                "company_name": "Precision Works Inc",
                "description": "High-quality metal fabrication and welding services",
                "location": {"city": "Chicago", "state": "IL", "country": "US"},
                "rating": 4.6,
                "review_count": 189,
                "capabilities": ["Metal Fabrication", "Welding", "Assembly"],
                "verified": True,
                "active": True
            },
            {
                "id": 3,
                "company_name": "3D Print Solutions",
                "description": "Rapid prototyping and 3D printing services",
                "location": {"city": "Austin", "state": "TX", "country": "US"},
                "rating": 4.4,
                "review_count": 156,
                "capabilities": ["3D Printing", "Rapid Prototyping", "Design"],
                "verified": True,
                "active": True
            },
            {
                "id": 4,
                "company_name": "Industrial Casting Co",
                "description": "Specialized in aluminum and steel casting",
                "location": {"city": "Pittsburgh", "state": "PA", "country": "US"},
                "rating": 4.7,
                "review_count": 203,
                "capabilities": ["Casting", "Machining", "Finishing"],
                "verified": True,
                "active": True
            },
            {
                "id": 5,
                "company_name": "Polymer Solutions Ltd",
                "description": "Injection molding and plastic manufacturing",
                "location": {"city": "Los Angeles", "state": "CA", "country": "US"},
                "rating": 4.5,
                "review_count": 178,
                "capabilities": ["Injection Molding", "Plastic Manufacturing"],
                "verified": True,
                "active": True
            }
        ]
        
        # Apply basic filtering
        filtered_manufacturers = mock_manufacturers
        
        if search:
            search_lower = search.lower()
            filtered_manufacturers = [
                m for m in filtered_manufacturers 
                if search_lower in m["company_name"].lower() or 
                   search_lower in m["description"].lower() or
                   any(search_lower in cap.lower() for cap in m["capabilities"])
            ]
        
        if country:
            filtered_manufacturers = [
                m for m in filtered_manufacturers 
                if m["location"]["country"].lower() == country.lower()
            ]
        
        # Apply pagination
        start = skip
        end = skip + limit
        paginated_manufacturers = filtered_manufacturers[start:end]
        
        return paginated_manufacturers
        
    except Exception as e:
        logger.error(f"Error getting manufacturers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get manufacturers")


@router.post("/discover", response_model=List[ManufacturerDiscoveryResponse])
def discover_manufacturers(
    search_criteria: Dict[str, Any],
    user_location: Optional[Dict[str, float]] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Discover manufacturers based on comprehensive search criteria
    """
    try:
        manufacturers = manufacturer_discovery_service.discover_manufacturers(
            db=db,
            search_criteria=search_criteria,
            user_location=user_location,
            limit=limit
        )
        return manufacturers
    except Exception as e:
        logger.error(f"Error discovering manufacturers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to discover manufacturers")


@router.get("/search", response_model=List[ManufacturerDiscoveryResponse])
def search_manufacturers_by_text(
    q: str = Query(..., description="Search query"),
    country: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    capabilities: Optional[List[str]] = Query(None),
    materials: Optional[List[str]] = Query(None),
    certifications: Optional[List[str]] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search manufacturers using text-based search with AI similarity
    """
    
    # Build filters from query parameters
    filters = {}
    if country:
        filters["country"] = country
    if state:
        filters["state"] = state
    if city:
        filters["city"] = city
    if min_rating:
        filters["min_rating"] = min_rating
    if capabilities:
        filters["capabilities"] = capabilities
    if materials:
        filters["materials"] = materials
    if certifications:
        filters["certifications"] = certifications
    
    try:
        manufacturers = manufacturer_discovery_service.search_manufacturers_by_text(
            db=db,
            search_text=q,
            filters=filters if filters else None,
            limit=limit
        )
        return manufacturers
    except Exception as e:
        logger.error(f"Error searching manufacturers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search manufacturers")


@router.get("/{manufacturer_id}/similar", response_model=List[ManufacturerDiscoveryResponse])
def find_similar_manufacturers(
    manufacturer_id: int,
    limit: int = Query(10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find manufacturers similar to a given manufacturer
    """
    try:
        similar_manufacturers = manufacturer_discovery_service.find_similar_manufacturers(
            db=db,
            manufacturer_id=manufacturer_id,
            limit=limit
        )
        return similar_manufacturers
    except Exception as e:
        logger.error(f"Error finding similar manufacturers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to find similar manufacturers")


@router.get("/recommendations/order/{order_id}", response_model=List[ManufacturerDiscoveryResponse])
def get_manufacturer_recommendations_for_order(
    order_id: int,
    user_preferences: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-powered manufacturer recommendations for a specific order
    """
    # Check if order exists and user has access
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Authorization check
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
    
    try:
        recommendations = manufacturer_discovery_service.get_manufacturer_recommendations(
            db=db,
            order=order,
            user_preferences=user_preferences
        )
        return recommendations
    except Exception as e:
        logger.error(f"Error getting manufacturer recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations")


@router.get("/{manufacturer_id}/analytics", response_model=ManufacturerAnalytics)
def get_manufacturer_analytics(
    manufacturer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics for a manufacturer
    """
    try:
        analytics = manufacturer_discovery_service.get_manufacturer_analytics(
            db=db,
            manufacturer_id=manufacturer_id
        )
        
        if not analytics:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting manufacturer analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get manufacturer analytics")


@router.get("/filters/options")
def get_filter_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get available filter options for manufacturer search
    """
    try:
        # This would typically come from a database or configuration
        # For now, return common manufacturing options
        filter_options = {
            "capabilities": [
                "CNC Machining",
                "3D Printing",
                "Injection Molding",
                "Sheet Metal Fabrication",
                "Welding",
                "Assembly",
                "Casting",
                "Forging",
                "Stamping",
                "Laser Cutting",
                "Waterjet Cutting",
                "EDM",
                "Grinding",
                "Turning",
                "Milling"
            ],
            "materials": [
                "Aluminum",
                "Steel",
                "Stainless Steel",
                "Titanium",
                "Brass",
                "Copper",
                "Plastic",
                "ABS",
                "PLA",
                "PETG",
                "Nylon",
                "Carbon Fiber",
                "Fiberglass",
                "Rubber",
                "Silicone"
            ],
            "certifications": [
                "ISO 9001",
                "ISO 14001",
                "AS9100",
                "TS 16949",
                "ISO 13485",
                "NADCAP",
                "FDA",
                "CE",
                "UL",
                "RoHS",
                "REACH",
                "ITAR"
            ],
            "countries": [
                "United States",
                "Canada",
                "Mexico",
                "Germany",
                "United Kingdom",
                "France",
                "Italy",
                "Spain",
                "Netherlands",
                "China",
                "Japan",
                "South Korea",
                "India",
                "Australia",
                "Brazil"
            ]
        }
        
        return filter_options
    except Exception as e:
        logger.error(f"Error getting filter options: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get filter options")


@router.get("/market-insights")
def get_market_insights(
    country: Optional[str] = Query(None),
    capability: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get market insights and trends for manufacturers
    """
    try:
        # This would analyze market data and trends
        # For now, return sample insights
        insights = {
            "market_overview": {
                "total_manufacturers": 1250,
                "active_manufacturers": 980,
                "average_rating": 4.2,
                "growth_rate": "12% YoY"
            },
            "capability_trends": [
                {
                    "capability": "3D Printing",
                    "demand_growth": "25%",
                    "avg_lead_time": "5 days",
                    "price_trend": "stable"
                },
                {
                    "capability": "CNC Machining",
                    "demand_growth": "8%",
                    "avg_lead_time": "12 days",
                    "price_trend": "increasing"
                }
            ],
            "regional_analysis": {
                "top_regions": [
                    {"region": "North America", "manufacturers": 450, "avg_rating": 4.3},
                    {"region": "Europe", "manufacturers": 380, "avg_rating": 4.4},
                    {"region": "Asia", "manufacturers": 320, "avg_rating": 4.1}
                ]
            },
            "quality_metrics": {
                "avg_completion_rate": 94.5,
                "avg_on_time_rate": 89.2,
                "avg_response_time": 18.5
            }
        }
        
        return insights
    except Exception as e:
        logger.error(f"Error getting market insights: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get market insights")


@router.post("/batch-analyze")
def batch_analyze_manufacturers(
    manufacturer_ids: List[int],
    analysis_type: str = Query("basic", pattern="^(basic|detailed|competitive)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform batch analysis on multiple manufacturers
    """
    if len(manufacturer_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 manufacturers allowed for batch analysis")
    
    try:
        results = []
        for manufacturer_id in manufacturer_ids:
            if analysis_type == "detailed":
                analytics = manufacturer_discovery_service.get_manufacturer_analytics(
                    db=db,
                    manufacturer_id=manufacturer_id
                )
                results.append({
                    "manufacturer_id": manufacturer_id,
                    "analytics": analytics
                })
            else:
                # Basic analysis - just return basic info
                results.append({
                    "manufacturer_id": manufacturer_id,
                    "status": "analyzed"
                })
        
        return {
            "analysis_type": analysis_type,
            "total_analyzed": len(results),
            "results": results
        }
    except Exception as e:
        logger.error(f"Error in batch analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to perform batch analysis") 