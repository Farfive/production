"""
Database models for Advanced Personalization System - Phase 3

This module contains models for individual customer profiling,
A/B testing, and advanced optimization features.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CustomerPersonalizationProfile(Base):
    """
    Individual customer AI profile with personal preferences and behavior patterns
    """
    __tablename__ = "customer_personalization_profiles"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Personal AI Model
    personal_weights = Column(JSON, nullable=False, default=dict)  # Individual learned weights
    behavior_patterns = Column(JSON, nullable=False, default=dict)  # Interaction patterns
    preference_evolution = Column(JSON, nullable=False, default=dict)  # How preferences change over time
    
    # Learning Metadata
    total_interactions = Column(Integer, default=0)
    successful_matches = Column(Integer, default=0)
    personal_confidence = Column(Float, default=0.0)  # 0-1 confidence in personal model
    learning_velocity = Column(Float, default=0.1)  # How quickly to adapt to new data
    
    # Behavioral Insights
    decision_speed_profile = Column(String(50), nullable=True)  # fast, moderate, deliberate
    explanation_preference = Column(String(20), default="summary")  # summary, detailed, expert
    complexity_comfort_level = Column(Float, default=0.5)  # 0-1 scale
    risk_tolerance = Column(Float, default=0.5)  # 0-1 scale
    
    # Business Context
    industry_specialization = Column(JSON, nullable=True)  # Industries they work in
    typical_order_values = Column(JSON, nullable=True)  # Value ranges they typically order
    geographic_patterns = Column(JSON, nullable=True)  # Location preferences
    timing_patterns = Column(JSON, nullable=True)  # When they typically place orders
    
    # Personalization Features
    custom_factor_weights = Column(JSON, nullable=True)  # Custom importance weights
    preferred_manufacturer_types = Column(JSON, nullable=True)  # Small/large, local/global etc
    communication_preferences = Column(JSON, nullable=True)  # How they like to be contacted
    
    # Performance Tracking
    avg_satisfaction_score = Column(Float, nullable=True)
    avg_choice_rank = Column(Float, nullable=True)
    conversion_rate = Column(Float, nullable=True)
    recommendation_acceptance_rate = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_interaction = Column(DateTime(timezone=True), nullable=True)


class ABTestExperiment(Base):
    """
    A/B testing experiments for recommendation strategies
    """
    __tablename__ = "ab_test_experiments"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Experiment Configuration
    experiment_type = Column(String(50), nullable=False)  # algorithm, weights, ui, explanation
    control_config = Column(JSON, nullable=False)  # Control group configuration
    treatment_configs = Column(JSON, nullable=False)  # Treatment group configurations (can be multiple)
    traffic_allocation = Column(JSON, nullable=False)  # Traffic split percentages
    
    # Targeting & Segmentation
    target_segments = Column(JSON, nullable=True)  # Which customer segments to include
    complexity_filters = Column(JSON, nullable=True)  # Complexity levels to test
    geographic_filters = Column(JSON, nullable=True)  # Geographic restrictions
    order_value_filters = Column(JSON, nullable=True)  # Order value ranges
    
    # Experiment Lifecycle
    status = Column(String(20), nullable=False, default="draft")  # draft, active, paused, completed, archived
    start_date = Column(DateTime(timezone=True), nullable=True)
    planned_end_date = Column(DateTime(timezone=True), nullable=True)
    actual_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Success Metrics
    primary_metric = Column(String(50), nullable=False, default="conversion_rate")
    secondary_metrics = Column(JSON, nullable=True)
    minimum_sample_size = Column(Integer, default=100)
    minimum_effect_size = Column(Float, default=0.05)  # 5% minimum improvement
    confidence_level = Column(Float, default=0.95)  # 95% confidence
    
    # Real-time Results
    control_participants = Column(Integer, default=0)
    treatment_participants = Column(JSON, default=dict)
    control_conversions = Column(Integer, default=0)
    treatment_conversions = Column(JSON, default=dict)
    
    # Statistical Analysis
    statistical_significance = Column(Float, nullable=True)  # p-value
    effect_size = Column(Float, nullable=True)  # Measured effect size
    confidence_interval = Column(JSON, nullable=True)  # [lower, upper] bounds
    winner = Column(String(20), nullable=True)  # control, treatment_1, treatment_2, etc.
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExperimentParticipant(Base):
    """
    Track individual customer participation in A/B tests
    """
    __tablename__ = "experiment_participants"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("ab_test_experiments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Assignment Details
    treatment_group = Column(String(20), nullable=False)  # control, treatment_1, treatment_2, etc.
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    session_id = Column(String(255), nullable=True)  # Link to feedback session
    
    # Outcome Tracking
    converted = Column(Boolean, default=False)
    conversion_timestamp = Column(DateTime(timezone=True), nullable=True)
    satisfaction_score = Column(Integer, nullable=True)  # 1-5
    choice_rank = Column(Integer, nullable=True)
    
    # Additional Metrics
    time_to_decision = Column(Integer, nullable=True)  # Seconds
    interactions_count = Column(Integer, default=0)
    explanation_views = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MultiObjectiveGoal(Base):
    """
    Define multiple objectives for optimization (conversion, satisfaction, business metrics)
    """
    __tablename__ = "multi_objective_goals"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Goal Configuration
    objectives = Column(JSON, nullable=False)  # List of objectives with weights
    constraints = Column(JSON, nullable=True)  # Business constraints
    optimization_horizon = Column(String(20), default="short_term")  # short_term, long_term, balanced
    
    # Objective Definitions
    # objectives example:
    # {
    #   "conversion_rate": {"weight": 0.4, "target": 0.8, "direction": "maximize"},
    #   "customer_satisfaction": {"weight": 0.3, "target": 4.0, "direction": "maximize"},
    #   "revenue_per_match": {"weight": 0.2, "target": 500, "direction": "maximize"},
    #   "time_to_match": {"weight": 0.1, "target": 300, "direction": "minimize"}
    # }
    
    # Performance Tracking
    current_performance = Column(JSON, nullable=True)  # Current metrics
    historical_performance = Column(JSON, nullable=True)  # Performance over time
    pareto_frontier = Column(JSON, nullable=True)  # Trade-off analysis
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PredictiveModel(Base):
    """
    Store predictive models for customer behavior and success forecasting
    """
    __tablename__ = "predictive_models"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(255), nullable=False)
    model_type = Column(String(50), nullable=False)  # success_prediction, churn_prediction, satisfaction_prediction
    
    # Model Configuration
    model_version = Column(String(50), nullable=False)
    feature_set = Column(JSON, nullable=False)  # Features used by the model
    hyperparameters = Column(JSON, nullable=True)  # Model hyperparameters
    training_data_period = Column(JSON, nullable=True)  # Data period used for training
    
    # Model Performance
    accuracy_metrics = Column(JSON, nullable=True)  # Accuracy, precision, recall, F1, etc.
    validation_results = Column(JSON, nullable=True)  # Cross-validation results
    feature_importance = Column(JSON, nullable=True)  # Feature importance scores
    
    # Model Artifacts
    model_artifacts = Column(JSON, nullable=True)  # Serialized model or reference
    preprocessing_pipeline = Column(JSON, nullable=True)  # Data preprocessing steps
    
    # Lifecycle
    status = Column(String(20), default="training")  # training, validating, active, deprecated
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    last_retrained = Column(DateTime(timezone=True), nullable=True)
    next_retrain_due = Column(DateTime(timezone=True), nullable=True)
    
    # Performance Monitoring
    drift_score = Column(Float, nullable=True)  # Model drift detection
    prediction_accuracy = Column(Float, nullable=True)  # Real-time accuracy
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RealtimeOptimization(Base):
    """
    Track real-time optimization decisions and their outcomes
    """
    __tablename__ = "realtime_optimizations"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Optimization Context
    optimization_trigger = Column(String(50), nullable=False)  # user_behavior, market_change, performance_drop
    context_data = Column(JSON, nullable=False)  # Situational context
    available_algorithms = Column(JSON, nullable=False)  # Algorithms considered
    
    # Decision Process
    algorithm_selected = Column(String(100), nullable=False)  # Chosen algorithm
    selection_reasoning = Column(JSON, nullable=True)  # Why this algorithm was chosen
    confidence_score = Column(Float, nullable=False)  # Confidence in decision
    
    # Optimization Parameters
    personalization_level = Column(Float, nullable=False)  # 0-1 scale
    exploration_rate = Column(Float, nullable=False)  # Exploration vs exploitation
    risk_tolerance = Column(Float, nullable=False)  # Risk level for this decision
    
    # Outcome Tracking
    optimization_outcome = Column(String(50), nullable=True)  # success, failure, neutral
    performance_metrics = Column(JSON, nullable=True)  # Measured performance
    customer_feedback = Column(JSON, nullable=True)  # Direct customer feedback
    
    # Learning Integration
    contributed_to_learning = Column(Boolean, default=False)
    learning_value = Column(Float, nullable=True)  # How much this contributed to learning
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PersonalizationInsight(Base):
    """
    Store discovered insights about customer behavior and preferences
    """
    __tablename__ = "personalization_insights"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    insight_type = Column(String(50), nullable=False)  # behavior_pattern, preference_shift, success_factor
    
    # Insight Content
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    insight_data = Column(JSON, nullable=False)  # Structured insight data
    
    # Scope and Context
    scope = Column(String(20), nullable=False)  # individual, segment, global
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # For individual insights
    customer_segment = Column(String(100), nullable=True)  # For segment insights
    
    # Confidence and Evidence
    confidence_level = Column(Float, nullable=False)  # 0-1 confidence
    evidence_strength = Column(String(20), nullable=False)  # weak, moderate, strong
    sample_size = Column(Integer, nullable=False)
    
    # Actionability
    is_actionable = Column(Boolean, default=False)
    suggested_actions = Column(JSON, nullable=True)  # Recommended actions
    business_impact = Column(String(20), nullable=True)  # low, medium, high
    
    # Lifecycle
    status = Column(String(20), default="new")  # new, reviewed, applied, archived
    applied_at = Column(DateTime(timezone=True), nullable=True)
    impact_measured = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 