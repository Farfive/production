"""
Database models for Enhanced Smart Matching Customer Feedback System
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MatchingFeedbackSession(Base):
    """
    Represents a customer feedback session with recommendations
    """
    __tablename__ = "matching_feedback_sessions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Recommendation details
    algorithm_version = Column(String(50), nullable=False, default="enhanced_v1.0")
    complexity_level = Column(String(20), nullable=False)  # simple, moderate, high, critical
    complexity_score = Column(Float, nullable=False)
    recommendations_shown = Column(Integer, nullable=False)
    explanation_level = Column(String(20), nullable=False, default="summary")
    
    # Customer profile at time of recommendation
    customer_preferences = Column(JSON, nullable=True)
    
    # Session metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)


class MatchingRecommendation(Base):
    """
    Individual recommendation shown to customer
    """
    __tablename__ = "matching_recommendations"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), ForeignKey("matching_feedback_sessions.session_id"), nullable=False)
    manufacturer_id = Column(Integer, nullable=False)
    
    # Recommendation details
    rank = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    total_score = Column(Float, nullable=False)
    complexity_adjusted_score = Column(Float, nullable=False)
    
    # Score breakdown
    capability_score = Column(Float, nullable=False)
    performance_score = Column(Float, nullable=False)
    geographic_score = Column(Float, nullable=False)
    quality_score = Column(Float, nullable=False)
    cost_efficiency_score = Column(Float, nullable=False)
    availability_score = Column(Float, nullable=False)
    
    # Enhanced factors
    personalization_boost = Column(Float, nullable=False, default=0.0)
    complexity_boost = Column(Float, nullable=False, default=0.0)
    confidence_level = Column(Float, nullable=False)
    
    # Explanation data
    key_strengths = Column(JSON, nullable=True)
    potential_concerns = Column(JSON, nullable=True)
    explanation_summary = Column(JSON, nullable=True)
    
    # Prediction and estimates
    predicted_success_rate = Column(Float, nullable=True)
    estimated_timeline_days = Column(Integer, nullable=True)
    estimated_cost_min = Column(Float, nullable=True)
    estimated_cost_max = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CustomerChoice(Base):
    """
    Customer's final choice from recommendations
    """
    __tablename__ = "customer_choices"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), ForeignKey("matching_feedback_sessions.session_id"), nullable=False)
    chosen_manufacturer_id = Column(Integer, nullable=True)
    chosen_rank = Column(Integer, nullable=True)  # Which rank they chose (1st, 2nd, 3rd option)
    
    # Choice details
    choice_type = Column(String(50), nullable=False)  # 'selected', 'contacted', 'rejected_all', 'abandoned'
    choice_timestamp = Column(DateTime(timezone=True), nullable=False)
    time_to_decision_seconds = Column(Integer, nullable=True)
    
    # Why they chose (if provided)
    choice_reason = Column(Text, nullable=True)
    important_factors = Column(JSON, nullable=True)  # ['price', 'quality', 'location', 'timeline']
    
    # Outcome tracking
    contacted_manufacturer = Column(Boolean, default=False)
    received_quote = Column(Boolean, default=False)
    accepted_quote = Column(Boolean, default=False)
    order_completed = Column(Boolean, default=False)
    
    # Follow-up data
    actual_cost = Column(Float, nullable=True)
    actual_timeline_days = Column(Integer, nullable=True)
    satisfaction_rating = Column(Integer, nullable=True)  # 1-5
    would_recommend = Column(Boolean, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RecommendationInteraction(Base):
    """
    Track how customers interact with individual recommendations
    """
    __tablename__ = "recommendation_interactions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    recommendation_id = Column(Integer, ForeignKey("matching_recommendations.id"), nullable=False)
    
    # Interaction details
    interaction_type = Column(String(50), nullable=False)  # 'viewed', 'expanded', 'compared', 'contacted'
    interaction_timestamp = Column(DateTime(timezone=True), nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)
    
    # What they looked at
    viewed_explanation_level = Column(String(20), nullable=True)  # summary, detailed, expert
    expanded_sections = Column(JSON, nullable=True)  # ['timeline', 'cost', 'strengths']
    
    # User feedback
    helpful_rating = Column(Integer, nullable=True)  # 1-5 for explanation helpfulness
    feedback_text = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningWeights(Base):
    """
    Store learned weights for different customer segments and scenarios
    """
    __tablename__ = "learning_weights"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Segmentation
    customer_segment = Column(String(100), nullable=True)  # 'price_sensitive', 'quality_focused', etc.
    complexity_level = Column(String(20), nullable=True)  # 'simple', 'moderate', 'high', 'critical'
    industry_type = Column(String(100), nullable=True)
    
    # Learned weights
    capability_weight = Column(Float, nullable=False, default=0.35)
    performance_weight = Column(Float, nullable=False, default=0.25)
    geographic_weight = Column(Float, nullable=False, default=0.12)
    quality_weight = Column(Float, nullable=False, default=0.15)
    cost_weight = Column(Float, nullable=False, default=0.08)
    availability_weight = Column(Float, nullable=False, default=0.05)
    
    # Personalization factors
    local_preference_boost = Column(Float, nullable=False, default=0.08)
    quality_focus_boost = Column(Float, nullable=False, default=0.06)
    price_sensitivity_boost = Column(Float, nullable=False, default=0.06)
    speed_priority_boost = Column(Float, nullable=False, default=0.05)
    
    # Learning metadata
    confidence_score = Column(Float, nullable=False, default=0.5)
    sample_size = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Performance metrics
    avg_choice_rank = Column(Float, nullable=True)  # Average rank of chosen recommendations
    conversion_rate = Column(Float, nullable=True)  # % that led to successful connections
    satisfaction_score = Column(Float, nullable=True)  # Average satisfaction rating


class ABTestExperiment(Base):
    """
    A/B testing experiments for recommendation strategies
    """
    __tablename__ = "matching_ab_test_experiments"  # Renamed to avoid conflict
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Experiment configuration
    variant_a_config = Column(JSON, nullable=False)  # Control group configuration
    variant_b_config = Column(JSON, nullable=False)  # Test group configuration
    traffic_split = Column(Float, nullable=False, default=0.5)  # % of traffic to variant B
    
    # Targeting
    target_complexity_levels = Column(JSON, nullable=True)
    target_customer_segments = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False, default="draft")  # draft, active, paused, completed
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Results tracking
    variant_a_sessions = Column(Integer, default=0)
    variant_b_sessions = Column(Integer, default=0)
    variant_a_conversions = Column(Integer, default=0)
    variant_b_conversions = Column(Integer, default=0)
    variant_a_avg_rank = Column(Float, nullable=True)
    variant_b_avg_rank = Column(Float, nullable=True)
    
    # Statistical significance
    confidence_level = Column(Float, nullable=True)
    p_value = Column(Float, nullable=True)
    winner = Column(String(10), nullable=True)  # 'A', 'B', or 'inconclusive'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)


class FeedbackAnalytics(Base):
    """
    Aggregated analytics for feedback system performance
    """
    __tablename__ = "feedback_analytics"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    
    # Daily metrics
    total_sessions = Column(Integer, default=0)
    total_choices = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    
    # Performance metrics
    avg_choice_rank = Column(Float, nullable=True)
    conversion_rate = Column(Float, nullable=True)
    avg_satisfaction = Column(Float, nullable=True)
    avg_time_to_decision = Column(Float, nullable=True)
    
    # By complexity
    simple_sessions = Column(Integer, default=0)
    moderate_sessions = Column(Integer, default=0)
    high_sessions = Column(Integer, default=0)
    critical_sessions = Column(Integer, default=0)
    
    # Algorithm performance
    algorithm_version = Column(String(50), nullable=False)
    avg_confidence_score = Column(Float, nullable=True)
    prediction_accuracy = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 