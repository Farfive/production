"""
Feedback Learning Engine - Phase 2 Implementation

This service implements machine learning from customer feedback to continuously
improve recommendation quality and personalization.

Key Features:
- Customer choice tracking and analysis
- Dynamic weight adjustment based on feedback patterns
- A/B testing framework for recommendation strategies
- Customer segmentation and personalized learning
- Real-time performance monitoring
"""

import logging
import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from dataclasses import dataclass

from app.models.matching_feedback import (
    MatchingFeedbackSession,
    MatchingRecommendation,
    CustomerChoice,
    RecommendationInteraction,
    LearningWeights,
    FeedbackAnalytics
)

logger = logging.getLogger(__name__)


@dataclass
class CustomerChoiceData:
    """Customer choice information"""
    session_id: str
    chosen_manufacturer_id: Optional[int]
    chosen_rank: Optional[int]
    choice_type: str  # 'selected', 'contacted', 'rejected_all', 'abandoned'
    choice_reason: Optional[str]
    important_factors: Optional[List[str]]
    time_to_decision: Optional[int]


@dataclass
class LearningInsights:
    """Insights from learning analysis"""
    customer_segment: str
    complexity_level: str
    preferred_factors: List[str]
    avg_choice_rank: float
    conversion_rate: float
    confidence_score: float
    sample_size: int
    recommendations: List[str]


class FeedbackLearningEngine:
    """
    Main engine for processing customer feedback and learning from choices
    """
    
    def __init__(self):
        self.learning_rate = 0.1  # How quickly to adjust weights
        self.min_sample_size = 10  # Minimum samples before confident learning
        self.confidence_threshold = 0.7  # Threshold for applying learned weights
        
        # Customer segmentation rules
        self.segmentation_rules = {
            'price_sensitive': lambda prefs: prefs.get('price_sensitive', False),
            'quality_focused': lambda prefs: prefs.get('quality_focused', False),
            'speed_priority': lambda prefs: prefs.get('speed_priority', False),
            'local_preference': lambda prefs: prefs.get('prefers_local', False),
            'premium_buyer': lambda prefs: prefs.get('quality_focused', False) and not prefs.get('price_sensitive', False),
            'balanced': lambda prefs: not any([prefs.get('price_sensitive'), prefs.get('quality_focused'), prefs.get('speed_priority')])
        }
    
    def start_feedback_session(
        self,
        db: Session,
        order_id: int,
        user_id: int,
        curated_matches: List[Any],
        customer_preferences: Optional[Dict[str, Any]] = None,
        explanation_level: str = "summary",
        algorithm_version: str = "enhanced_v1.0"
    ) -> str:
        """
        Start a new feedback session to track customer interactions
        """
        try:
            session_id = str(uuid.uuid4())
            
            # Determine complexity info from first match
            complexity_level = "moderate"
            complexity_score = 5.0
            
            if curated_matches:
                # Extract complexity from the first match
                complexity_level = getattr(curated_matches[0], 'complexity_level', 'moderate')
                complexity_score = getattr(curated_matches[0], 'complexity_score', 5.0)
            
            # Create feedback session
            feedback_session = MatchingFeedbackSession(
                order_id=order_id,
                user_id=user_id,
                session_id=session_id,
                algorithm_version=algorithm_version,
                complexity_level=complexity_level,
                complexity_score=complexity_score,
                recommendations_shown=len(curated_matches),
                explanation_level=explanation_level,
                customer_preferences=customer_preferences,
                is_active=True
            )
            
            db.add(feedback_session)
            db.flush()  # Get the ID
            
            # Store individual recommendations
            for match in curated_matches:
                recommendation = MatchingRecommendation(
                    session_id=session_id,
                    manufacturer_id=match.manufacturer_id,
                    rank=match.rank,
                    total_score=match.match_score.total_score,
                    complexity_adjusted_score=match.match_score.complexity_adjusted_score,
                    capability_score=match.match_score.capability_score,
                    performance_score=match.match_score.performance_score,
                    geographic_score=match.match_score.geographic_score,
                    quality_score=match.match_score.quality_score,
                    cost_efficiency_score=match.match_score.cost_efficiency_score,
                    availability_score=match.match_score.availability_score,
                    personalization_boost=match.match_score.personalization_boost,
                    complexity_boost=match.match_score.complexity_adjusted_score - match.match_score.total_score,
                    confidence_level=match.match_score.confidence_level,
                    key_strengths=match.key_strengths,
                    potential_concerns=match.potential_concerns,
                    explanation_summary=match.explanation.summary,
                    predicted_success_rate=match.predicted_success_rate,
                    estimated_timeline_days=match.estimated_timeline.get('estimated_days') if match.estimated_timeline else None,
                    estimated_cost_min=match.cost_analysis.get('min_estimate') if match.cost_analysis else None,
                    estimated_cost_max=match.cost_analysis.get('max_estimate') if match.cost_analysis else None
                )
                db.add(recommendation)
            
            db.commit()
            
            logger.info(f"Started feedback session {session_id} for order {order_id} with {len(curated_matches)} recommendations")
            return session_id
            
        except Exception as e:
            logger.error(f"Error starting feedback session: {str(e)}")
            db.rollback()
            raise
    
    def record_customer_choice(
        self,
        db: Session,
        choice_data: CustomerChoiceData
    ) -> bool:
        """
        Record customer's final choice and trigger learning
        """
        try:
            # Get session
            session = db.query(MatchingFeedbackSession).filter(
                MatchingFeedbackSession.session_id == choice_data.session_id
            ).first()
            
            if not session:
                logger.error(f"Feedback session {choice_data.session_id} not found")
                return False
            
            # Record choice
            customer_choice = CustomerChoice(
                session_id=choice_data.session_id,
                chosen_manufacturer_id=choice_data.chosen_manufacturer_id,
                chosen_rank=choice_data.chosen_rank,
                choice_type=choice_data.choice_type,
                choice_timestamp=datetime.now(),
                time_to_decision_seconds=choice_data.time_to_decision,
                choice_reason=choice_data.choice_reason,
                important_factors=choice_data.important_factors
            )
            
            db.add(customer_choice)
            
            # Mark session as completed
            session.completed_at = datetime.now()
            session.is_active = False
            
            db.commit()
            
            # Trigger learning process
            self._trigger_learning_update(db, session, customer_choice)
            
            logger.info(f"Recorded customer choice for session {choice_data.session_id}: {choice_data.choice_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording customer choice: {str(e)}")
            db.rollback()
            return False
    
    def record_interaction(
        self,
        db: Session,
        session_id: str,
        manufacturer_id: int,
        interaction_type: str,
        interaction_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record customer interaction with specific recommendation
        """
        try:
            # Get recommendation
            recommendation = db.query(MatchingRecommendation).filter(
                and_(
                    MatchingRecommendation.session_id == session_id,
                    MatchingRecommendation.manufacturer_id == manufacturer_id
                )
            ).first()
            
            if not recommendation:
                logger.warning(f"Recommendation not found for session {session_id}, manufacturer {manufacturer_id}")
                return False
            
            # Record interaction
            interaction = RecommendationInteraction(
                recommendation_id=recommendation.id,
                interaction_type=interaction_type,
                interaction_timestamp=datetime.now(),
                time_spent_seconds=interaction_data.get('time_spent') if interaction_data else None,
                viewed_explanation_level=interaction_data.get('explanation_level') if interaction_data else None,
                expanded_sections=interaction_data.get('expanded_sections') if interaction_data else None,
                helpful_rating=interaction_data.get('helpful_rating') if interaction_data else None,
                feedback_text=interaction_data.get('feedback_text') if interaction_data else None
            )
            
            db.add(interaction)
            db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording interaction: {str(e)}")
            db.rollback()
            return False
    
    def get_learned_weights_for_recommendation(
        self,
        db: Session,
        customer_preferences: Optional[Dict[str, Any]],
        complexity_level: str
    ) -> Optional[Dict[str, float]]:
        """
        Get learned weights to apply to recommendation scoring
        """
        try:
            customer_segment = self._determine_customer_segment(customer_preferences)
            
            learned_weights = db.query(LearningWeights).filter(
                and_(
                    LearningWeights.customer_segment == customer_segment,
                    LearningWeights.complexity_level == complexity_level,
                    LearningWeights.confidence_score >= self.confidence_threshold,
                    LearningWeights.sample_size >= self.min_sample_size
                )
            ).first()
            
            if learned_weights:
                return {
                    'capability': learned_weights.capability_weight,
                    'performance': learned_weights.performance_weight,
                    'geographic': learned_weights.geographic_weight,
                    'quality': learned_weights.quality_weight,
                    'cost': learned_weights.cost_weight,
                    'availability': learned_weights.availability_weight
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting learned weights: {str(e)}")
            return None
    
    def get_feedback_analytics(
        self,
        db: Session,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive feedback analytics
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            # Get recent analytics
            analytics = db.query(FeedbackAnalytics).filter(
                FeedbackAnalytics.date >= cutoff_date
            ).all()
            
            if not analytics:
                return {
                    "total_sessions": 0,
                    "conversion_rate": 0,
                    "avg_choice_rank": 0,
                    "message": "No analytics data available"
                }
            
            # Aggregate metrics
            total_sessions = sum(a.total_sessions for a in analytics)
            total_conversions = sum(a.total_conversions for a in analytics)
            total_choices = sum(a.total_choices for a in analytics)
            
            # Calculate averages
            conversion_rate = total_conversions / total_choices if total_choices > 0 else 0
            
            # Weighted average of choice ranks
            weighted_rank_sum = sum(a.avg_choice_rank * a.total_choices for a in analytics if a.avg_choice_rank)
            avg_choice_rank = weighted_rank_sum / total_choices if total_choices > 0 else 0
            
            # Complexity breakdown
            complexity_breakdown = {
                'simple': sum(a.simple_sessions for a in analytics),
                'moderate': sum(a.moderate_sessions for a in analytics),
                'high': sum(a.high_sessions for a in analytics),
                'critical': sum(a.critical_sessions for a in analytics)
            }
            
            # Learning progress
            learning_weights_count = db.query(LearningWeights).filter(
                LearningWeights.confidence_score >= 0.7
            ).count()
            
            return {
                "period_days": days_back,
                "total_sessions": total_sessions,
                "total_conversions": total_conversions,
                "conversion_rate": round(conversion_rate, 3),
                "avg_choice_rank": round(avg_choice_rank, 2),
                "complexity_breakdown": complexity_breakdown,
                "learned_segments": learning_weights_count,
                "learning_confidence": "High" if learning_weights_count > 5 else "Building"
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback analytics: {str(e)}")
            return {"error": str(e)}
    
    def _determine_customer_segment(
        self,
        customer_preferences: Optional[Dict[str, Any]]
    ) -> str:
        """
        Determine customer segment based on preferences
        """
        if not customer_preferences:
            return 'balanced'
        
        for segment, rule in self.segmentation_rules.items():
            if rule(customer_preferences):
                return segment
        
        return 'balanced'
    
    def _trigger_learning_update(
        self,
        db: Session,
        session: MatchingFeedbackSession,
        choice: CustomerChoice
    ):
        """
        Trigger learning algorithm to update weights based on customer choice
        """
        try:
            # Determine customer segment
            customer_segment = self._determine_customer_segment(session.customer_preferences)
            
            # Get current learned weights for this segment and complexity
            learned_weights = self._get_learned_weights(
                db, customer_segment, session.complexity_level
            )
            
            # Analyze the choice and update weights
            if choice.choice_type in ['selected', 'contacted'] and choice.chosen_rank:
                self._update_weights_from_choice(
                    db, learned_weights, session, choice
                )
            
            # Update analytics
            self._update_analytics(db, session, choice)
            
        except Exception as e:
            logger.error(f"Error in learning update: {str(e)}")
    
    def _get_learned_weights(
        self,
        db: Session,
        customer_segment: str,
        complexity_level: str
    ) -> LearningWeights:
        """
        Get or create learned weights for specific segment and complexity
        """
        learned_weights = db.query(LearningWeights).filter(
            and_(
                LearningWeights.customer_segment == customer_segment,
                LearningWeights.complexity_level == complexity_level
            )
        ).first()
        
        if not learned_weights:
            # Create new weights with defaults
            learned_weights = LearningWeights(
                customer_segment=customer_segment,
                complexity_level=complexity_level,
                sample_size=0,
                confidence_score=0.5
            )
            db.add(learned_weights)
            db.flush()
        
        return learned_weights
    
    def _update_weights_from_choice(
        self,
        db: Session,
        learned_weights: LearningWeights,
        session: MatchingFeedbackSession,
        choice: CustomerChoice
    ):
        """
        Update learned weights based on customer choice
        """
        try:
            # Get the chosen recommendation
            chosen_rec = db.query(MatchingRecommendation).filter(
                and_(
                    MatchingRecommendation.session_id == session.session_id,
                    MatchingRecommendation.rank == choice.chosen_rank
                )
            ).first()
            
            if not chosen_rec:
                return
            
            # Calculate learning signal
            rank_penalty = (choice.chosen_rank - 1) * 0.1
            learning_signal = 1.0 - rank_penalty
            
            # Update weights based on important factors
            important_factors = choice.important_factors or []
            
            # Simple weight adjustment based on choice
            if 'price' in important_factors:
                learned_weights.cost_weight = min(0.2, learned_weights.cost_weight + 0.05)
            if 'quality' in important_factors:
                learned_weights.quality_weight = min(0.3, learned_weights.quality_weight + 0.05)
            if 'location' in important_factors:
                learned_weights.geographic_weight = min(0.3, learned_weights.geographic_weight + 0.05)
            if 'timeline' in important_factors:
                learned_weights.availability_weight = min(0.15, learned_weights.availability_weight + 0.05)
            
            # Update metadata
            learned_weights.sample_size += 1
            learned_weights.confidence_score = min(1.0, learned_weights.sample_size / 20.0)
            learned_weights.last_updated = datetime.now()
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error updating weights from choice: {str(e)}")
    
    def _update_analytics(
        self,
        db: Session,
        session: MatchingFeedbackSession,
        choice: CustomerChoice
    ):
        """
        Update daily analytics
        """
        try:
            today = datetime.now().date()
            
            # Get or create today's analytics
            analytics = db.query(FeedbackAnalytics).filter(
                and_(
                    func.date(FeedbackAnalytics.date) == today,
                    FeedbackAnalytics.algorithm_version == session.algorithm_version
                )
            ).first()
            
            if not analytics:
                analytics = FeedbackAnalytics(
                    date=datetime.now(),
                    algorithm_version=session.algorithm_version,
                    total_sessions=0,
                    total_choices=0,
                    total_conversions=0
                )
                db.add(analytics)
            
            # Update metrics
            analytics.total_sessions += 1
            analytics.total_choices += 1
            
            if choice.choice_type in ['selected', 'contacted']:
                analytics.total_conversions += 1
            
            # Update complexity-specific counters
            if session.complexity_level == 'simple':
                analytics.simple_sessions += 1
            elif session.complexity_level == 'moderate':
                analytics.moderate_sessions += 1
            elif session.complexity_level == 'high':
                analytics.high_sessions += 1
            elif session.complexity_level == 'critical':
                analytics.critical_sessions += 1
            
            # Calculate updated averages
            if analytics.total_choices > 0:
                analytics.conversion_rate = analytics.total_conversions / analytics.total_choices
            
            # Update choice rank average
            if choice.chosen_rank:
                current_avg = analytics.avg_choice_rank or 2.0
                analytics.avg_choice_rank = (
                    (current_avg * (analytics.total_choices - 1) + choice.chosen_rank) / 
                    analytics.total_choices
                )
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error updating analytics: {str(e)}")
    
    def create_match_object_from_recommendation(
        self,
        rec_data: Dict[str, Any],
        rank: int
    ) -> Any:
        """
        Create a structured match object from recommendation data for feedback tracking
        """
        
        class StructuredMatch:
            def __init__(self, data, rank):
                self.manufacturer_id = data.get('manufacturer_id')
                self.rank = rank
                self.complexity_level = data.get('complexity_level', 'moderate')
                self.complexity_score = data.get('complexity_score', 5.0)
                
                # Structured match score
                class StructuredScore:
                    def __init__(self, score_data):
                        self.total_score = score_data.get('total_score', 0.8)
                        self.complexity_adjusted_score = score_data.get('complexity_adjusted_score', 0.85)
                        self.capability_score = score_data.get('capability_score', 0.8)
                        self.performance_score = score_data.get('performance_score', 0.8)
                        self.geographic_score = score_data.get('geographic_score', 0.8)
                        self.quality_score = score_data.get('quality_score', 0.8)
                        self.cost_efficiency_score = score_data.get('cost_efficiency_score', 0.8)
                        self.availability_score = score_data.get('availability_score', 0.8)
                        self.personalization_boost = score_data.get('personalization_boost', 0.05)
                        self.confidence_level = score_data.get('confidence_level', 0.8)
                
                self.match_score = StructuredScore(data.get('match_score', {}))
                self.key_strengths = data.get('key_strengths', [])
                self.potential_concerns = data.get('potential_concerns', [])
                
                # Structured explanation
                class StructuredExplanation:
                    def __init__(self, expl_data):
                        self.summary = expl_data.get('summary', {})
                
                self.explanation = StructuredExplanation(data.get('explanation', {}))
                self.predicted_success_rate = data.get('predicted_success_rate', 0.8)
                self.estimated_timeline = data.get('estimated_timeline', {})
                self.cost_analysis = data.get('cost_analysis', {})
        
        return StructuredMatch(rec_data, rank)


# Global instance
feedback_learning_engine = FeedbackLearningEngine() 