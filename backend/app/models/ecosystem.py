"""
Database models for Cross-Platform Intelligence & Ecosystem Expansion - Phase 4

This module contains models for cross-platform synchronization, ecosystem integration,
global localization, autonomous AI, and industry intelligence features.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CrossPlatformProfile(Base):
    """
    Unified customer profile across all platforms (web, mobile, partner portals)
    """
    __tablename__ = "cross_platform_profiles"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Platform Synchronization
    platform_data = Column(JSON, nullable=False, default=dict)  # Data from each platform
    sync_status = Column(JSON, nullable=False, default=dict)  # Sync status per platform
    last_sync_timestamps = Column(JSON, nullable=False, default=dict)  # Last sync per platform
    conflict_resolution_log = Column(JSON, nullable=False, default=dict)  # Conflict resolution history
    
    # Unified Intelligence
    unified_preferences = Column(JSON, nullable=False, default=dict)  # Merged preferences across platforms
    cross_platform_behavior = Column(JSON, nullable=False, default=dict)  # Behavior patterns across platforms
    device_fingerprints = Column(JSON, nullable=False, default=dict)  # Device usage patterns
    session_continuity = Column(JSON, nullable=False, default=dict)  # Cross-platform session tracking
    
    # Platform-Specific Optimizations
    web_optimizations = Column(JSON, nullable=True)  # Web-specific UI/UX optimizations
    mobile_optimizations = Column(JSON, nullable=True)  # Mobile-specific optimizations
    partner_optimizations = Column(JSON, nullable=True)  # Partner portal optimizations
    api_optimizations = Column(JSON, nullable=True)  # API client optimizations
    
    # Engagement Analytics
    platform_engagement_scores = Column(JSON, nullable=False, default=dict)  # Engagement per platform
    preferred_platform = Column(String(50), nullable=True)  # Primary platform preference
    platform_switching_patterns = Column(JSON, nullable=True)  # When/why they switch platforms
    cross_platform_journey = Column(JSON, nullable=True)  # Complete customer journey map
    
    # Quality Scores
    data_quality_score = Column(Float, default=0.8)  # Overall data quality across platforms
    sync_accuracy = Column(Float, default=0.95)  # Synchronization accuracy
    profile_completeness = Column(Float, default=0.7)  # Profile completeness score
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_platform_activity = Column(DateTime(timezone=True), nullable=True)


class EcosystemIntegration(Base):
    """
    Integration with external ecosystem partners (suppliers, logistics, marketplaces)
    """
    __tablename__ = "ecosystem_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    integration_name = Column(String(255), nullable=False)
    integration_type = Column(String(100), nullable=False)  # supplier, logistics, marketplace, financial, regulatory
    
    # Integration Configuration
    partner_info = Column(JSON, nullable=False)  # Partner details and capabilities
    api_configuration = Column(JSON, nullable=False)  # API endpoints, keys, rate limits
    data_mapping = Column(JSON, nullable=False)  # Field mapping between systems
    sync_frequency = Column(String(50), default="real_time")  # real_time, hourly, daily, weekly
    
    # Data Flow
    inbound_data_types = Column(JSON, nullable=False)  # What data we receive
    outbound_data_types = Column(JSON, nullable=False)  # What data we send
    data_transformation_rules = Column(JSON, nullable=True)  # How to transform data
    validation_rules = Column(JSON, nullable=True)  # Data validation requirements
    
    # Performance Metrics
    integration_health_score = Column(Float, default=0.8)  # Overall integration health
    data_quality_metrics = Column(JSON, nullable=True)  # Data quality tracking
    response_time_metrics = Column(JSON, nullable=True)  # API response times
    error_rate_metrics = Column(JSON, nullable=True)  # Error rates and types
    
    # Business Impact
    value_delivered = Column(JSON, nullable=True)  # Business value metrics
    cost_savings = Column(JSON, nullable=True)  # Cost savings from integration
    efficiency_gains = Column(JSON, nullable=True)  # Efficiency improvements
    customer_impact = Column(JSON, nullable=True)  # Impact on customer experience
    
    # Status and Control
    status = Column(String(20), default="active")  # active, paused, maintenance, deprecated
    auto_sync_enabled = Column(Boolean, default=True)
    requires_manual_approval = Column(Boolean, default=False)
    
    # Security and Compliance
    security_config = Column(JSON, nullable=True)  # Security configurations
    compliance_requirements = Column(JSON, nullable=True)  # Regulatory compliance needs
    audit_trail = Column(JSON, nullable=True)  # Integration audit log
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_sync = Column(DateTime(timezone=True), nullable=True)
    next_sync_due = Column(DateTime(timezone=True), nullable=True)


class GlobalLocalization(Base):
    """
    Global localization engine for multi-market, multi-language, multi-cultural adaptation
    """
    __tablename__ = "global_localizations"
    
    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String(10), nullable=False, index=True)  # US, EU, APAC, etc.
    language_code = Column(String(10), nullable=False)  # en, es, fr, de, zh, ja, etc.
    country_code = Column(String(5), nullable=False)  # US, UK, DE, CN, JP, etc.
    
    # Cultural Adaptation
    cultural_preferences = Column(JSON, nullable=False, default=dict)  # Cultural business preferences
    communication_styles = Column(JSON, nullable=False, default=dict)  # Preferred communication styles
    business_practices = Column(JSON, nullable=False, default=dict)  # Local business practices
    decision_making_patterns = Column(JSON, nullable=False, default=dict)  # How decisions are made locally
    
    # Regulatory Environment
    regulatory_requirements = Column(JSON, nullable=False, default=dict)  # Local regulations
    compliance_frameworks = Column(JSON, nullable=False, default=dict)  # Required compliance standards
    data_protection_rules = Column(JSON, nullable=False, default=dict)  # Data protection requirements
    industry_regulations = Column(JSON, nullable=False, default=dict)  # Industry-specific regulations
    
    # Market Intelligence
    market_characteristics = Column(JSON, nullable=False, default=dict)  # Market size, growth, trends
    competitive_landscape = Column(JSON, nullable=False, default=dict)  # Local competitors and pricing
    supplier_ecosystem = Column(JSON, nullable=False, default=dict)  # Local supplier networks
    customer_segments = Column(JSON, nullable=False, default=dict)  # Local customer characteristics
    
    # Localized AI Models
    local_algorithm_weights = Column(JSON, nullable=False, default=dict)  # Localized algorithm weights
    cultural_bias_adjustments = Column(JSON, nullable=False, default=dict)  # Cultural bias corrections
    language_model_config = Column(JSON, nullable=False, default=dict)  # Language-specific ML configs
    local_success_metrics = Column(JSON, nullable=False, default=dict)  # What success means locally
    
    # Economic Factors
    currency_preferences = Column(JSON, nullable=False, default=dict)  # Preferred currencies
    payment_methods = Column(JSON, nullable=False, default=dict)  # Local payment preferences
    economic_indicators = Column(JSON, nullable=False, default=dict)  # Relevant economic data
    cost_structures = Column(JSON, nullable=False, default=dict)  # Local cost structures
    
    # Performance Tracking
    localization_effectiveness = Column(Float, default=0.7)  # How effective is localization
    customer_satisfaction_local = Column(Float, default=0.0)  # Local customer satisfaction
    market_penetration = Column(Float, default=0.0)  # Market penetration rate
    revenue_impact = Column(JSON, nullable=True)  # Revenue impact of localization
    
    # Status
    is_active = Column(Boolean, default=True)
    maturity_level = Column(String(20), default="developing")  # developing, mature, optimized
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_market_analysis = Column(DateTime(timezone=True), nullable=True)


class AutonomousProcurementAgent(Base):
    """
    Autonomous AI agents that handle procurement workflows with minimal human intervention
    """
    __tablename__ = "autonomous_procurement_agents"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Owner of the agent
    
    # Agent Configuration
    autonomy_level = Column(String(20), default="supervised")  # supervised, semi_autonomous, fully_autonomous
    decision_boundaries = Column(JSON, nullable=False)  # What decisions agent can make autonomously
    approval_workflows = Column(JSON, nullable=False)  # When human approval is needed
    escalation_rules = Column(JSON, nullable=False)  # When to escalate to humans
    
    # Learning Capabilities
    learning_model = Column(JSON, nullable=False)  # Agent's learning model configuration
    historical_decisions = Column(JSON, nullable=False, default=dict)  # Past decisions and outcomes
    success_patterns = Column(JSON, nullable=False, default=dict)  # Learned success patterns
    failure_analysis = Column(JSON, nullable=False, default=dict)  # Analysis of past failures
    
    # Operational Scope
    procurement_categories = Column(JSON, nullable=False)  # What categories agent handles
    budget_limits = Column(JSON, nullable=False)  # Budget constraints per category
    supplier_preferences = Column(JSON, nullable=False)  # Preferred supplier criteria
    quality_requirements = Column(JSON, nullable=False)  # Quality standards to maintain
    
    # Decision Making
    decision_criteria = Column(JSON, nullable=False)  # How agent makes decisions
    risk_tolerance = Column(Float, default=0.3)  # Agent's risk tolerance (0-1)
    optimization_goals = Column(JSON, nullable=False)  # What to optimize for
    constraint_handling = Column(JSON, nullable=False)  # How to handle constraints
    
    # Performance Tracking
    decisions_made = Column(Integer, default=0)  # Total autonomous decisions
    success_rate = Column(Float, default=0.0)  # Success rate of decisions
    cost_savings_achieved = Column(Float, default=0.0)  # Cost savings delivered
    time_savings_achieved = Column(Float, default=0.0)  # Time savings in hours
    
    # Agent Intelligence
    confidence_score = Column(Float, default=0.5)  # Agent's confidence in decisions
    learning_velocity = Column(Float, default=0.1)  # How quickly agent learns
    adaptation_rate = Column(Float, default=0.05)  # How quickly agent adapts to changes
    predictive_accuracy = Column(Float, default=0.7)  # Accuracy of agent's predictions
    
    # Human Collaboration
    human_override_frequency = Column(Float, default=0.2)  # How often humans override
    collaboration_effectiveness = Column(Float, default=0.8)  # Human-AI collaboration score
    trust_score = Column(Float, default=0.7)  # Human trust in agent decisions
    feedback_integration = Column(JSON, nullable=True)  # How agent integrates human feedback
    
    # Status and Control
    status = Column(String(20), default="active")  # active, paused, learning, maintenance
    last_decision = Column(DateTime(timezone=True), nullable=True)
    next_scheduled_action = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_learning_update = Column(DateTime(timezone=True), nullable=True)


class IndustryIntelligenceHub(Base):
    """
    Industry intelligence hub for market insights, trends, and competitive analysis
    """
    __tablename__ = "industry_intelligence_hubs"
    
    id = Column(Integer, primary_key=True, index=True)
    industry_sector = Column(String(100), nullable=False, index=True)  # automotive, electronics, aerospace, etc.
    intelligence_type = Column(String(50), nullable=False)  # market_trends, competitive_intel, supplier_analysis, etc.
    
    # Market Intelligence
    market_size_data = Column(JSON, nullable=True)  # Market size and growth data
    trend_analysis = Column(JSON, nullable=False, default=dict)  # Current and predicted trends
    growth_forecasts = Column(JSON, nullable=True)  # Growth predictions
    disruption_indicators = Column(JSON, nullable=True)  # Signals of market disruption
    
    # Competitive Intelligence
    competitor_analysis = Column(JSON, nullable=False, default=dict)  # Competitor strategies and performance
    pricing_intelligence = Column(JSON, nullable=False, default=dict)  # Market pricing trends
    capability_gaps = Column(JSON, nullable=False, default=dict)  # Market capability gaps
    emerging_competitors = Column(JSON, nullable=False, default=dict)  # New market entrants
    
    # Supplier Ecosystem Intelligence
    supplier_landscape = Column(JSON, nullable=False, default=dict)  # Supplier market overview
    capacity_analysis = Column(JSON, nullable=False, default=dict)  # Industry capacity analysis
    technology_trends = Column(JSON, nullable=False, default=dict)  # Technology adoption trends
    supply_chain_risks = Column(JSON, nullable=False, default=dict)  # Supply chain risk factors
    
    # Customer Intelligence
    customer_behavior_trends = Column(JSON, nullable=False, default=dict)  # How customers are changing
    demand_patterns = Column(JSON, nullable=False, default=dict)  # Demand pattern analysis
    buying_behavior_shifts = Column(JSON, nullable=False, default=dict)  # Changes in buying behavior
    customer_satisfaction_benchmarks = Column(JSON, nullable=False, default=dict)  # Industry satisfaction benchmarks
    
    # Regulatory Intelligence
    regulatory_changes = Column(JSON, nullable=False, default=dict)  # Upcoming regulatory changes
    compliance_trends = Column(JSON, nullable=False, default=dict)  # Compliance requirement trends
    policy_impacts = Column(JSON, nullable=False, default=dict)  # Impact of policy changes
    
    # Innovation Intelligence
    technology_innovations = Column(JSON, nullable=False, default=dict)  # Emerging technologies
    patent_landscape = Column(JSON, nullable=False, default=dict)  # Patent and IP trends
    startup_ecosystem = Column(JSON, nullable=False, default=dict)  # Startup activity and innovation
    investment_flows = Column(JSON, nullable=False, default=dict)  # Investment and funding trends
    
    # Actionable Insights
    strategic_recommendations = Column(JSON, nullable=False, default=dict)  # Strategic recommendations
    opportunity_identification = Column(JSON, nullable=False, default=dict)  # Market opportunities
    risk_assessments = Column(JSON, nullable=False, default=dict)  # Risk assessments and mitigation
    investment_priorities = Column(JSON, nullable=False, default=dict)  # Investment recommendations
    
    # Intelligence Quality
    data_sources = Column(JSON, nullable=False, default=dict)  # Sources of intelligence
    confidence_level = Column(Float, default=0.7)  # Confidence in intelligence quality
    freshness_score = Column(Float, default=0.8)  # How fresh/current the intelligence is
    accuracy_validation = Column(JSON, nullable=True)  # Accuracy validation metrics
    
    # Impact Tracking
    decision_influence = Column(JSON, nullable=True)  # How intelligence influenced decisions
    business_impact = Column(JSON, nullable=True)  # Measured business impact
    user_engagement = Column(JSON, nullable=True)  # How users engage with intelligence
    
    # Publication and Distribution
    publication_status = Column(String(20), default="draft")  # draft, published, archived
    target_audience = Column(JSON, nullable=False, default=dict)  # Who should see this intelligence
    distribution_channels = Column(JSON, nullable=False, default=dict)  # How to distribute
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    intelligence_date = Column(DateTime(timezone=True), nullable=False)  # When this intelligence is relevant
    expiry_date = Column(DateTime(timezone=True), nullable=True)  # When intelligence becomes outdated


class PlatformSynchronization(Base):
    """
    Tracks synchronization events and conflicts across platforms
    """
    __tablename__ = "platform_synchronizations"
    
    id = Column(Integer, primary_key=True, index=True)
    sync_id = Column(String(255), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Synchronization Details
    source_platform = Column(String(50), nullable=False)  # web, mobile, partner_portal, api
    target_platforms = Column(JSON, nullable=False)  # Platforms being synced to
    sync_type = Column(String(50), nullable=False)  # profile, preferences, orders, interactions
    
    # Data Changes
    data_changes = Column(JSON, nullable=False)  # What data changed
    conflict_detection = Column(JSON, nullable=True)  # Detected conflicts
    conflict_resolution = Column(JSON, nullable=True)  # How conflicts were resolved
    
    # Synchronization Results
    sync_status = Column(String(20), default="pending")  # pending, completed, failed, partial
    success_platforms = Column(JSON, nullable=True)  # Successfully synced platforms
    failed_platforms = Column(JSON, nullable=True)  # Platforms that failed to sync
    error_details = Column(JSON, nullable=True)  # Error details for failed syncs
    
    # Performance Metrics
    sync_duration_ms = Column(Integer, nullable=True)  # How long sync took
    data_size_bytes = Column(Integer, nullable=True)  # Size of synced data
    retry_attempts = Column(Integer, default=0)  # Number of retry attempts
    
    # Quality Assurance
    data_integrity_check = Column(Boolean, default=True)  # Data integrity verified
    validation_results = Column(JSON, nullable=True)  # Validation check results
    
    # Timestamps
    sync_initiated = Column(DateTime(timezone=True), server_default=func.now())
    sync_completed = Column(DateTime(timezone=True), nullable=True)
    next_sync_scheduled = Column(DateTime(timezone=True), nullable=True)


class EcosystemTransaction(Base):
    """
    Tracks transactions and data exchanges with ecosystem partners
    """
    __tablename__ = "ecosystem_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(255), nullable=False, unique=True, index=True)
    integration_id = Column(Integer, ForeignKey("ecosystem_integrations.id"), nullable=False)
    
    # Transaction Details
    transaction_type = Column(String(50), nullable=False)  # data_sync, order_placement, quote_request, etc.
    direction = Column(String(20), nullable=False)  # inbound, outbound, bidirectional
    
    # Data Exchange
    data_payload = Column(JSON, nullable=True)  # Transaction data (may be large)
    data_summary = Column(JSON, nullable=False)  # Summary of transaction data
    data_classification = Column(String(20), default="standard")  # standard, sensitive, confidential
    
    # Processing Results
    status = Column(String(20), default="processing")  # processing, completed, failed, cancelled
    response_data = Column(JSON, nullable=True)  # Response from partner system
    error_details = Column(JSON, nullable=True)  # Error information if failed
    
    # Performance Metrics
    processing_time_ms = Column(Integer, nullable=True)  # Processing time
    partner_response_time_ms = Column(Integer, nullable=True)  # Partner system response time
    data_size_bytes = Column(Integer, nullable=True)  # Size of exchanged data
    
    # Business Impact
    business_value = Column(Float, nullable=True)  # Estimated business value
    cost_impact = Column(Float, nullable=True)  # Cost impact of transaction
    customer_impact = Column(String(20), nullable=True)  # positive, negative, neutral
    
    # Audit and Compliance
    audit_trail = Column(JSON, nullable=True)  # Complete audit trail
    compliance_flags = Column(JSON, nullable=True)  # Compliance-related flags
    
    # Timestamps
    initiated_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    partner_timestamp = Column(DateTime(timezone=True), nullable=True)  # Partner system timestamp 