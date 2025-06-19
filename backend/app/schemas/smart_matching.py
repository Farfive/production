"""
Pydantic schemas for Smart Matching Engine API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

from .base import BaseSchema


class MatchConfidenceLevel(str, Enum):
    EXCELLENT = "EXCELLENT"
    VERY_GOOD = "VERY_GOOD"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"


class MatchTypeEnum(str, Enum):
    ORDER_TO_PRODUCTION_QUOTE = "order_to_production_quote"
    PRODUCTION_QUOTE_TO_ORDER = "production_quote_to_order"


class FeedbackType(str, Enum):
    HELPFUL = "helpful"
    NOT_HELPFUL = "not_helpful"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    IRRELEVANT = "irrelevant"


class SmartMatchingRequest(BaseModel):
    """Request model for smart matching recommendations"""
    order_id: int = Field(..., description="Order ID to generate recommendations for")
    max_recommendations: int = Field(15, ge=1, le=50, description="Maximum number of recommendations")
    include_ai_insights: bool = Field(True, description="Include AI-powered insights")
    enable_ml_predictions: bool = Field(True, description="Enable machine learning predictions")
    custom_weights: Optional[Dict[str, float]] = Field(None, description="Custom scoring weights")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")


class MatchScoreBreakdown(BaseModel):
    """Detailed match score breakdown"""
    total_score: float = Field(..., ge=0, le=1, description="Overall match score")
    capability_score: float = Field(..., ge=0, le=1, description="Capability matching score")
    performance_score: float = Field(..., ge=0, le=1, description="Performance history score")
    geographic_score: float = Field(..., ge=0, le=1, description="Geographic proximity score")
    quality_score: float = Field(..., ge=0, le=1, description="Quality metrics score")
    cost_efficiency_score: float = Field(..., ge=0, le=1, description="Cost efficiency score")
    availability_score: float = Field(..., ge=0, le=1, description="Availability score")
    confidence_level: float = Field(..., ge=0, le=1, description="Confidence in the match")
    recommendation_strength: str = Field(..., description="STRONG, MODERATE, or WEAK")
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for the match")
    risk_factors: List[str] = Field(default_factory=list, description="Potential risk factors")


class SmartRecommendationData(BaseModel):
    """Individual smart recommendation data"""
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    manufacturer_name: str = Field(..., description="Manufacturer business name")
    match_score: MatchScoreBreakdown = Field(..., description="Detailed match score")
    predicted_success_rate: float = Field(..., ge=0, le=1, description="AI-predicted success rate")
    estimated_delivery_time: int = Field(..., description="Estimated delivery time in days")
    estimated_cost_range: Dict[str, float] = Field(..., description="Estimated cost range")
    risk_assessment: Dict[str, Any] = Field(..., description="Risk assessment details")
    competitive_advantages: List[str] = Field(default_factory=list, description="Key advantages")
    potential_concerns: List[str] = Field(default_factory=list, description="Potential concerns")
    similar_past_projects: List[Dict[str, Any]] = Field(default_factory=list, description="Similar projects")
    ai_insights: Dict[str, Any] = Field(default_factory=dict, description="AI-generated insights")


class SmartMatchingResponse(BaseModel):
    """Response model for smart matching recommendations"""
    success: bool = Field(..., description="Request success status")
    message: str = Field(..., description="Response message")
    order_id: int = Field(..., description="Order ID")
    recommendations_count: int = Field(..., description="Number of recommendations generated")
    processing_time_seconds: float = Field(..., description="Processing time in seconds")
    algorithm_version: str = Field(..., description="Algorithm version used")
    recommendations: List[SmartRecommendationData] = Field(..., description="Smart recommendations")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class RecommendationResponse(BaseModel):
    """Simplified recommendation response"""
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    manufacturer_name: str = Field(..., description="Manufacturer name")
    total_score: float = Field(..., ge=0, le=1, description="Total match score")
    confidence_level: float = Field(..., ge=0, le=1, description="Confidence level")
    recommendation_strength: str = Field(..., description="Recommendation strength")
    predicted_success_rate: float = Field(..., ge=0, le=1, description="Predicted success rate")
    estimated_delivery_days: int = Field(..., description="Estimated delivery days")
    estimated_cost_range: Dict[str, float] = Field(..., description="Cost range estimate")
    key_advantages: List[str] = Field(default_factory=list, description="Key advantages")
    potential_risks: List[str] = Field(default_factory=list, description="Potential risks")
    match_summary: str = Field("", description="AI-generated match summary")


class MatchAnalysisRequest(BaseModel):
    """Request for detailed match analysis"""
    order_id: int = Field(..., description="Order ID")
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    analysis_depth: str = Field("detailed", description="Analysis depth: basic, detailed, comprehensive")


class MatchAnalysisResponse(BaseModel):
    """Response for detailed match analysis"""
    order_id: int = Field(..., description="Order ID")
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    analysis: Dict[str, Any] = Field(..., description="Detailed analysis results")
    generated_at: datetime = Field(..., description="Analysis generation timestamp")


class AIInsightsResponse(BaseModel):
    """AI insights response"""
    order_id: int = Field(..., description="Order ID")
    insights: Dict[str, Any] = Field(..., description="AI-generated insights")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence in insights")
    generated_at: datetime = Field(..., description="Generation timestamp")


class ManufacturerCluster(BaseModel):
    """Manufacturer cluster information"""
    cluster_id: int = Field(..., description="Cluster ID")
    cluster_name: str = Field(..., description="Cluster name")
    description: str = Field(..., description="Cluster description")
    manufacturer_count: int = Field(..., description="Number of manufacturers in cluster")
    avg_rating: float = Field(..., description="Average rating in cluster")
    key_capabilities: List[str] = Field(..., description="Key capabilities")
    typical_industries: List[str] = Field(..., description="Typical industries served")


class ManufacturerClusterResponse(BaseModel):
    """Manufacturer clustering response"""
    clusters: List[ManufacturerCluster] = Field(..., description="Manufacturer clusters")
    total_manufacturers: int = Field(..., description="Total manufacturers analyzed")
    analysis_date: datetime = Field(..., description="Analysis date")
    clustering_algorithm: str = Field(..., description="Clustering algorithm used")


class MarketIntelligenceResponse(BaseModel):
    """Market intelligence response"""
    intelligence: Dict[str, Any] = Field(..., description="Market intelligence data")
    timeframe: str = Field(..., description="Analysis timeframe")
    region: str = Field(..., description="Geographic region")
    industry: str = Field(..., description="Industry focus")
    generated_at: datetime = Field(..., description="Generation timestamp")
    data_freshness_hours: int = Field(..., description="Data freshness in hours")


class MatchingFeedback(BaseModel):
    """Matching feedback model"""
    order_id: int = Field(..., description="Order ID")
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    feedback_type: str = Field(..., description="Type of feedback")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5")
    comments: Optional[str] = Field(None, description="Additional comments")


class MatchingAnalytics(BaseModel):
    """Matching analytics data"""
    total_matches_generated: int = Field(..., description="Total matches generated")
    avg_processing_time: float = Field(..., description="Average processing time")
    success_rate: float = Field(..., description="Matching success rate")
    user_satisfaction: float = Field(..., description="User satisfaction score")
    algorithm_performance: Dict[str, float] = Field(..., description="Algorithm performance metrics")


class SmartMatchingConfig(BaseModel):
    """Smart matching configuration"""
    weights: Dict[str, float] = Field(..., description="Scoring weights")
    thresholds: Dict[str, float] = Field(..., description="Matching thresholds")
    ml_enabled: bool = Field(True, description="Machine learning enabled")
    clustering_enabled: bool = Field(True, description="Clustering enabled")
    max_recommendations: int = Field(15, description="Maximum recommendations")


class BatchMatchingRequest(BaseModel):
    """Batch matching request for multiple orders"""
    order_ids: List[int] = Field(..., description="List of order IDs")
    max_recommendations_per_order: int = Field(10, description="Max recommendations per order")
    include_ai_insights: bool = Field(False, description="Include AI insights")
    priority: str = Field("normal", description="Processing priority: low, normal, high")


class BatchMatchingResponse(BaseModel):
    """Batch matching response"""
    success: bool = Field(..., description="Batch processing success")
    processed_orders: int = Field(..., description="Number of orders processed")
    total_recommendations: int = Field(..., description="Total recommendations generated")
    processing_time_seconds: float = Field(..., description="Total processing time")
    results: List[SmartMatchingResponse] = Field(..., description="Individual results")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Processing errors")


class RealtimeMatchingUpdate(BaseModel):
    """Real-time matching update"""
    order_id: int = Field(..., description="Order ID")
    update_type: str = Field(..., description="Update type")
    new_recommendations: List[SmartRecommendationData] = Field(default_factory=list)
    removed_recommendations: List[int] = Field(default_factory=list)
    score_updates: Dict[int, float] = Field(default_factory=dict)
    timestamp: datetime = Field(..., description="Update timestamp")


class MatchingPerformanceMetrics(BaseModel):
    """Matching performance metrics"""
    algorithm_version: str = Field(..., description="Algorithm version")
    avg_processing_time_ms: float = Field(..., description="Average processing time in milliseconds")
    accuracy_score: float = Field(..., description="Matching accuracy score")
    precision: float = Field(..., description="Precision metric")
    recall: float = Field(..., description="Recall metric")
    f1_score: float = Field(..., description="F1 score")
    user_satisfaction_rating: float = Field(..., description="User satisfaction rating")
    conversion_rate: float = Field(..., description="Recommendation to quote conversion rate")


class SmartMatchingHealthCheck(BaseModel):
    """Smart matching system health check"""
    status: str = Field(..., description="System status: healthy, degraded, down")
    ml_models_loaded: bool = Field(..., description="ML models loaded status")
    database_connection: bool = Field(..., description="Database connection status")
    cache_status: str = Field(..., description="Cache system status")
    last_model_update: datetime = Field(..., description="Last ML model update")
    active_recommendations: int = Field(..., description="Active recommendations count")
    system_load: float = Field(..., description="Current system load")


class ExplainabilityReport(BaseModel):
    """AI explainability report for recommendations"""
    order_id: int = Field(..., description="Order ID")
    manufacturer_id: int = Field(..., description="Manufacturer ID")
    decision_factors: List[Dict[str, Any]] = Field(..., description="Key decision factors")
    feature_importance: Dict[str, float] = Field(..., description="Feature importance scores")
    similar_cases: List[Dict[str, Any]] = Field(..., description="Similar historical cases")
    confidence_intervals: Dict[str, List[float]] = Field(..., description="Confidence intervals")
    what_if_scenarios: List[Dict[str, Any]] = Field(..., description="What-if scenario analysis")
    generated_at: datetime = Field(..., description="Report generation timestamp")


# Core Match Score Schema
class MatchScoreResponse(BaseModel):
    total_score: float = Field(..., ge=0.0, le=1.0, description="Overall match score")
    category_match: float = Field(..., ge=0.0, le=1.0, description="Manufacturing category compatibility")
    price_compatibility: float = Field(..., ge=0.0, le=1.0, description="Price range compatibility")
    timeline_compatibility: float = Field(..., ge=0.0, le=1.0, description="Delivery timeline compatibility")
    geographic_proximity: float = Field(..., ge=0.0, le=1.0, description="Geographic proximity score")
    capacity_availability: float = Field(..., ge=0.0, le=1.0, description="Production capacity availability")
    manufacturer_rating: float = Field(..., ge=0.0, le=1.0, description="Manufacturer quality rating")
    urgency_alignment: float = Field(..., ge=0.0, le=1.0, description="Urgency level alignment")
    specification_match: float = Field(..., ge=0.0, le=1.0, description="Technical specification match")
    confidence_level: MatchConfidenceLevel = Field(..., description="Overall confidence in match")
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for the match")
    potential_issues: List[str] = Field(default_factory=list, description="Potential concerns or issues")


# Manufacturer Info Schema
class MatchManufacturerInfo(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    verified: bool = False
    completed_orders: int = 0


# Main Smart Match Response
class SmartMatchResponse(BaseModel):
    match_id: str = Field(..., description="Unique match identifier")
    match_type: MatchTypeEnum = Field(..., description="Type of match")
    order_id: Optional[int] = Field(None, description="Order ID if applicable")
    production_quote_id: Optional[int] = Field(None, description="Production quote ID if applicable")
    score: MatchScoreResponse = Field(..., description="Detailed match scoring")
    estimated_price: Optional[float] = Field(None, description="Estimated price for the match")
    estimated_delivery_days: Optional[int] = Field(None, description="Estimated delivery time in days")
    manufacturer_info: MatchManufacturerInfo = Field(..., description="Manufacturer information")
    created_at: datetime = Field(..., description="When the match was generated")
    expires_at: Optional[datetime] = Field(None, description="When the match expires")
    real_time_availability: Optional[str] = Field(None, description="Real-time availability status")

    @classmethod
    def from_smart_match(cls, smart_match):
        """Convert SmartMatch service object to response schema."""
        return cls(
            match_id=smart_match.match_id,
            match_type=smart_match.match_type.value,
            order_id=smart_match.order_id,
            production_quote_id=smart_match.production_quote_id,
            score=MatchScoreResponse(
                total_score=smart_match.score.total_score,
                category_match=smart_match.score.category_match,
                price_compatibility=smart_match.score.price_compatibility,
                timeline_compatibility=smart_match.score.timeline_compatibility,
                geographic_proximity=smart_match.score.geographic_proximity,
                capacity_availability=smart_match.score.capacity_availability,
                manufacturer_rating=smart_match.score.manufacturer_rating,
                urgency_alignment=smart_match.score.urgency_alignment,
                specification_match=smart_match.score.specification_match,
                confidence_level=smart_match.score.confidence_level,
                match_reasons=smart_match.score.match_reasons,
                potential_issues=smart_match.score.potential_issues
            ),
            estimated_price=smart_match.estimated_price,
            estimated_delivery_days=smart_match.estimated_delivery_days,
            manufacturer_info=MatchManufacturerInfo(**smart_match.manufacturer_info),
            created_at=smart_match.created_at,
            expires_at=smart_match.expires_at,
            real_time_availability=getattr(smart_match, 'real_time_availability', None)
        )


# Filter and Search Schemas
class MatchFilters(BaseModel):
    min_score: Optional[float] = Field(0.6, ge=0.0, le=1.0, description="Minimum match score")
    max_price: Optional[float] = Field(None, gt=0, description="Maximum acceptable price")
    max_delivery_days: Optional[int] = Field(None, gt=0, description="Maximum delivery time in days")
    required_categories: Optional[List[str]] = Field(None, description="Required manufacturing categories")
    preferred_locations: Optional[List[str]] = Field(None, description="Preferred geographic locations")
    min_manufacturer_rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="Minimum manufacturer rating")
    verified_only: bool = Field(False, description="Only include verified manufacturers")
    confidence_levels: Optional[List[MatchConfidenceLevel]] = Field(None, description="Acceptable confidence levels")


# Batch Processing Schemas
class BatchMatchRequest(BaseModel):
    order_ids: List[int] = Field(..., min_items=1, max_items=50, description="List of order IDs to match")
    limit_per_order: int = Field(5, ge=1, le=20, description="Maximum matches per order")
    min_score: float = Field(0.6, ge=0.0, le=1.0, description="Minimum match score threshold")
    filters: Optional[MatchFilters] = Field(None, description="Additional filtering criteria")


# Analytics Schemas
class CategoryMatchStats(BaseModel):
    category: str
    match_count: int
    average_score: Optional[float] = None
    conversion_rate: Optional[float] = None


class MatchAnalytics(BaseModel):
    total_matches_generated: int = Field(..., description="Total matches generated")
    successful_connections: int = Field(..., description="Matches that led to connections")
    average_match_score: float = Field(..., ge=0.0, le=1.0, description="Average match score")
    top_matching_categories: List[Dict[str, Any]] = Field(..., description="Top performing categories")
    conversion_rate: float = Field(..., ge=0.0, le=1.0, description="Overall conversion rate")
    average_response_time_hours: float = Field(..., gt=0, description="Average response time in hours")
    user_satisfaction_score: float = Field(..., ge=0.0, le=5.0, description="User satisfaction rating")
    match_quality_trends: Optional[List[Dict[str, Any]]] = Field(None, description="Match quality over time")
    geographic_distribution: Optional[Dict[str, int]] = Field(None, description="Matches by geographic region")


# Feedback Schema
class MatchFeedback(BaseModel):
    match_id: str = Field(..., description="ID of the match being rated")
    feedback_type: FeedbackType = Field(..., description="Type of feedback")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1-5")
    comment: Optional[str] = Field(None, max_length=500, description="Optional feedback comment")
    contacted_manufacturer: bool = Field(False, description="Whether user contacted the manufacturer")
    resulted_in_quote: bool = Field(False, description="Whether it resulted in a quote")
    resulted_in_order: bool = Field(False, description="Whether it resulted in an order")


# Real-time Matching Schemas
class LiveMatchRequest(BaseModel):
    order_id: int = Field(..., description="Order ID for live matching")
    include_capacity_check: bool = Field(True, description="Include real-time capacity checking")
    priority_boost: Optional[float] = Field(None, ge=1.0, le=3.0, description="Priority boost multiplier")


class LiveMatchResponse(SmartMatchResponse):
    real_time_capacity: Optional[Dict[str, Any]] = Field(None, description="Real-time capacity information")
    availability_window: Optional[Dict[str, str]] = Field(None, description="Current availability window")
    response_time_estimate: Optional[int] = Field(None, description="Estimated response time in minutes")


# Recommendation Schemas
class RecommendationRequest(BaseModel):
    user_preferences: Optional[Dict[str, Any]] = Field(None, description="User preference overrides")
    include_historical: bool = Field(True, description="Include historical performance data")
    boost_new_manufacturers: bool = Field(False, description="Boost newer manufacturers for diversity")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of recommendations")


class PersonalizedRecommendation(SmartMatchResponse):
    recommendation_reason: str = Field(..., description="Why this was recommended")
    historical_performance: Optional[Dict[str, Any]] = Field(None, description="Historical performance data")
    similarity_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Similarity to past successful matches")


# Advanced Matching Schemas
class MLMatchingInsights(BaseModel):
    predicted_success_rate: float = Field(..., ge=0.0, le=1.0, description="ML predicted success rate")
    key_success_factors: List[str] = Field(..., description="Key factors for success")
    risk_factors: List[str] = Field(..., description="Potential risk factors")
    similar_successful_matches: Optional[List[str]] = Field(None, description="Similar successful match IDs")
    confidence_interval: Optional[Dict[str, float]] = Field(None, description="Confidence interval for predictions")


class EnhancedMatchResponse(SmartMatchResponse):
    ml_insights: Optional[MLMatchingInsights] = Field(None, description="Machine learning insights")
    market_context: Optional[Dict[str, Any]] = Field(None, description="Current market context")
    competitive_analysis: Optional[Dict[str, Any]] = Field(None, description="Competitive positioning")


# Notification Schemas
class MatchNotification(BaseModel):
    notification_id: str = Field(..., description="Unique notification ID")
    match_id: str = Field(..., description="Associated match ID")
    recipient_id: int = Field(..., description="User ID to notify")
    notification_type: str = Field(..., description="Type of notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    priority: str = Field("normal", description="Notification priority")
    created_at: datetime = Field(..., description="When notification was created")
    expires_at: Optional[datetime] = Field(None, description="When notification expires")
    action_url: Optional[str] = Field(None, description="URL for notification action")


# Export Schemas
class MatchExportRequest(BaseModel):
    match_ids: Optional[List[str]] = Field(None, description="Specific match IDs to export")
    date_range: Optional[Dict[str, str]] = Field(None, description="Date range for export")
    format: str = Field("csv", pattern="^(csv|excel|pdf)$", description="Export format")
    include_analytics: bool = Field(True, description="Include analytics data")
    include_feedback: bool = Field(False, description="Include feedback data")


class MatchExportResponse(BaseModel):
    export_id: str = Field(..., description="Export job ID")
    status: str = Field(..., description="Export status")
    download_url: Optional[str] = Field(None, description="Download URL when ready")
    created_at: datetime = Field(..., description="Export creation time")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    record_count: Optional[int] = Field(None, description="Number of records to export")