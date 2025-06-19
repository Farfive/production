from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class ManufacturerDiscoveryResponse(BaseModel):
    """Response model for manufacturer discovery"""
    id: int
    business_name: str
    description: Optional[str] = None
    location: Dict[str, Optional[str]]
    rating: Optional[float] = None
    review_count: Optional[int] = None
    capabilities: Optional[Dict[str, Any]] = None
    certifications: List[str] = []
    performance_metrics: Dict[str, Any]
    score: float
    score_breakdown: Dict[str, float]
    match_reasons: List[str]
    distance_km: Optional[float] = None
    response_time_hours: Optional[float] = None
    completion_rate: Optional[float] = None
    on_time_rate: Optional[float] = None
    verified: bool = False
    premium: bool = False
    similarity_score: Optional[float] = None
    match_highlights: Optional[List[str]] = None
    order_fit_score: Optional[float] = None
    total_score: Optional[float] = None


class ManufacturerAnalytics(BaseModel):
    """Comprehensive analytics for a manufacturer"""
    basic_info: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    quote_analytics: Dict[str, Any]
    capability_analysis: Dict[str, Any]
    market_position: Dict[str, Any]
    growth_trends: Dict[str, Any]
    competitive_analysis: Dict[str, Any]


class ManufacturerSearchCriteria(BaseModel):
    """Search criteria for manufacturer discovery"""
    capabilities: Optional[List[str]] = None
    materials: Optional[List[str]] = None
    processes: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    min_rating: Optional[float] = None
    max_distance_km: Optional[float] = None
    quantity_range: Optional[Dict[str, int]] = None
    delivery_deadline: Optional[datetime] = None
    budget_range: Optional[Dict[str, float]] = None
    quality_requirements: Optional[List[str]] = None


class ManufacturerRecommendationRequest(BaseModel):
    """Request for manufacturer recommendations"""
    order_id: int
    user_preferences: Optional[Dict[str, Any]] = None
    max_recommendations: Optional[int] = 15


class ManufacturerSimilarityResponse(BaseModel):
    """Response for similar manufacturers"""
    id: int
    business_name: str
    description: Optional[str] = None
    location: Dict[str, Optional[str]]
    rating: Optional[float] = None
    capabilities: Optional[Dict[str, Any]] = None
    similarity_score: float
    match_reasons: List[str]


class ManufacturerBatchAnalysisRequest(BaseModel):
    """Request for batch manufacturer analysis"""
    manufacturer_ids: List[int]
    analysis_type: str = "basic"  # basic, detailed, competitive


class ManufacturerBatchAnalysisResponse(BaseModel):
    """Response for batch manufacturer analysis"""
    analysis_type: str
    total_analyzed: int
    results: List[Dict[str, Any]]


class ManufacturerMarketInsights(BaseModel):
    """Market insights for manufacturers"""
    market_overview: Dict[str, Any]
    capability_trends: List[Dict[str, Any]]
    regional_analysis: Dict[str, Any]
    quality_metrics: Dict[str, Any]


class ManufacturerFilterOptions(BaseModel):
    """Available filter options for manufacturer search"""
    capabilities: List[str]
    materials: List[str]
    certifications: List[str]
    countries: List[str] 