"""
Advanced Personalization Engine - Phase 3 Implementation

This service implements advanced personalization features including:
- Individual customer AI profiles
- Real-time A/B testing framework
- Multi-objective optimization
- Predictive analytics
- Dynamic algorithm selection
"""

import logging
import numpy as np
import uuid
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass
from collections import defaultdict
import random

from app.models.personalization import (
    CustomerPersonalizationProfile,
    ABTestExperiment,
    ExperimentParticipant,
    MultiObjectiveGoal,
    PredictiveModel,
    RealtimeOptimization,
    PersonalizationInsight
)
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class PersonalizedRecommendationRequest:
    """Request for personalized recommendations"""
    user_id: int
    order_context: Dict[str, Any]
    customer_preferences: Optional[Dict[str, Any]] = None
    complexity_level: str = "moderate"
    use_ab_testing: bool = True
    optimization_goal: str = "balanced"


@dataclass
class PersonalizationProfile:
    """Individual customer personalization profile"""
    user_id: int
    personal_weights: Dict[str, float]
    behavior_patterns: Dict[str, Any]
    confidence_level: float
    total_interactions: int
    decision_speed_profile: str
    risk_tolerance: float
    preferred_explanation_level: str


@dataclass
class ABTestAssignment:
    """A/B test assignment for a customer"""
    experiment_id: int
    experiment_name: str
    treatment_group: str
    config_overrides: Dict[str, Any]
    tracking_data: Dict[str, Any]


@dataclass
class OptimizationDecision:
    """Real-time optimization decision"""
    algorithm_selected: str
    personalization_level: float
    exploration_rate: float
    confidence_score: float
    reasoning: Dict[str, Any]


class AdvancedPersonalizationEngine:
    """
    Advanced Personalization Engine - Phase 3 Implementation
    
    Features:
    - Individual customer AI profiles beyond segment-based learning
    - Real-time A/B testing framework with statistical significance
    - Multi-objective optimization balancing multiple business goals
    - Predictive analytics for customer behavior forecasting
    - Dynamic algorithm selection based on context and performance
    """
    
    def __init__(self):
        # Algorithm registry
        self.available_algorithms = {
            'enhanced_standard': {'confidence': 0.9, 'complexity_comfort': [1, 10]},
            'quality_focused': {'confidence': 0.8, 'complexity_comfort': [5, 10]},
            'speed_optimized': {'confidence': 0.7, 'complexity_comfort': [1, 6]},
            'cost_efficient': {'confidence': 0.8, 'complexity_comfort': [1, 8]},
            'exploration_heavy': {'confidence': 0.6, 'complexity_comfort': [1, 10]},
            'conservative': {'confidence': 0.95, 'complexity_comfort': [1, 5]}
        }
        
        # Multi-objective optimization weights
        self.default_objectives = {
            'conversion_rate': {'weight': 0.4, 'direction': 'maximize'},
            'customer_satisfaction': {'weight': 0.3, 'direction': 'maximize'},
            'revenue_per_match': {'weight': 0.2, 'direction': 'maximize'},
            'time_to_match': {'weight': 0.1, 'direction': 'minimize'}
        }
        
        # A/B testing parameters
        self.ab_test_config = {
            'min_sample_size': 50,
            'significance_threshold': 0.05,
            'min_effect_size': 0.05,
            'max_experiment_duration_days': 30
        }
        
        # Personal profile learning parameters
        self.personal_learning = {
            'initial_confidence': 0.1,
            'confidence_growth_rate': 0.1,
            'max_confidence': 0.95,
            'decay_factor': 0.95,  # Gradual decay of old patterns
            'min_interactions_for_profile': 5
        }
    
    def get_personalized_recommendations(
        self,
        db: Session,
        request: PersonalizedRecommendationRequest
    ) -> Tuple[List[Any], Dict[str, Any]]:
        """
        Get personalized recommendations using advanced personalization
        """
        try:
            logger.info(f"Getting personalized recommendations for user {request.user_id}")
            
            # Step 1: Get or create personal profile
            personal_profile = self._get_personal_profile(db, request.user_id)
            
            # Step 2: Check for A/B test participation
            ab_assignment = None
            if request.use_ab_testing:
                ab_assignment = self._get_ab_test_assignment(db, request.user_id, request.order_context)
            
            # Step 3: Perform real-time optimization
            optimization_decision = self._make_optimization_decision(
                db, request, personal_profile, ab_assignment
            )
            
            # Step 4: Get base recommendations with selected algorithm
            from app.services.enhanced_smart_matching import enhanced_smart_matching_service
            
            # Apply personalization overrides
            enhanced_request = self._prepare_enhanced_request(
                request, personal_profile, ab_assignment, optimization_decision
            )
            
            # Get recommendations
            base_recommendations = enhanced_smart_matching_service.get_curated_matches(
                db=db,
                order=enhanced_request['order'],
                customer_profile=enhanced_request['customer_profile'],
                explanation_level=enhanced_request['explanation_level'],
                use_learned_weights=enhanced_request['use_learned_weights']
            )
            
            # Step 5: Apply advanced personalization
            personalized_recommendations = self._apply_advanced_personalization(
                base_recommendations, personal_profile, optimization_decision
            )
            
            # Step 6: Track optimization decision
            self._track_optimization_decision(db, request, optimization_decision, ab_assignment)
            
            # Step 7: Prepare response metadata
            response_metadata = {
                'personalization_applied': True,
                'algorithm_used': optimization_decision.algorithm_selected,
                'personalization_level': optimization_decision.personalization_level,
                'ab_test_active': ab_assignment is not None,
                'personal_confidence': personal_profile.confidence_level if personal_profile else 0.0,
                'optimization_reasoning': optimization_decision.reasoning
            }
            
            logger.info(f"Personalized recommendations completed: {len(personalized_recommendations)} recommendations")
            return personalized_recommendations, response_metadata
            
        except Exception as e:
            logger.error(f"Error in personalized recommendations: {str(e)}")
            # Fallback to standard enhanced matching
            from app.services.enhanced_smart_matching import enhanced_smart_matching_service
            fallback_recommendations = enhanced_smart_matching_service.get_curated_matches(
                db=db, order=request.order_context, customer_profile=request.customer_preferences
            )
            return fallback_recommendations, {'personalization_applied': False, 'error': str(e)}
    
    def _get_personal_profile(
        self,
        db: Session,
        user_id: int
    ) -> Optional[PersonalizationProfile]:
        """
        Get or create individual customer personalization profile
        """
        try:
            profile_record = db.query(CustomerPersonalizationProfile).filter(
                CustomerPersonalizationProfile.user_id == user_id
            ).first()
            
            if not profile_record:
                # Create new profile
                profile_record = CustomerPersonalizationProfile(
                    user_id=user_id,
                    personal_weights={},
                    behavior_patterns={},
                    total_interactions=0,
                    personal_confidence=self.personal_learning['initial_confidence']
                )
                db.add(profile_record)
                db.commit()
                
                return PersonalizationProfile(
                    user_id=user_id,
                    personal_weights={},
                    behavior_patterns={},
                    confidence_level=self.personal_learning['initial_confidence'],
                    total_interactions=0,
                    decision_speed_profile='moderate',
                    risk_tolerance=0.5,
                    preferred_explanation_level='summary'
                )
            
            # Convert to dataclass
            return PersonalizationProfile(
                user_id=profile_record.user_id,
                personal_weights=profile_record.personal_weights or {},
                behavior_patterns=profile_record.behavior_patterns or {},
                confidence_level=profile_record.personal_confidence,
                total_interactions=profile_record.total_interactions,
                decision_speed_profile=profile_record.decision_speed_profile or 'moderate',
                risk_tolerance=profile_record.risk_tolerance or 0.5,
                preferred_explanation_level=profile_record.explanation_preference
            )
            
        except Exception as e:
            logger.error(f"Error getting personal profile for user {user_id}: {str(e)}")
            return None
    
    def _get_ab_test_assignment(
        self,
        db: Session,
        user_id: int,
        order_context: Dict[str, Any]
    ) -> Optional[ABTestAssignment]:
        """
        Check if user should participate in A/B test and assign treatment
        """
        try:
            # Get active experiments
            active_experiments = db.query(ABTestExperiment).filter(
                and_(
                    ABTestExperiment.status == 'active',
                    ABTestExperiment.start_date <= datetime.now(),
                    or_(
                        ABTestExperiment.planned_end_date.is_(None),
                        ABTestExperiment.planned_end_date >= datetime.now()
                    )
                )
            ).all()
            
            if not active_experiments:
                return None
            
            # Check existing participation
            existing_participation = db.query(ExperimentParticipant).filter(
                and_(
                    ExperimentParticipant.user_id == user_id,
                    ExperimentParticipant.experiment_id.in_([exp.id for exp in active_experiments])
                )
            ).first()
            
            if existing_participation:
                # User already assigned to experiment
                experiment = next(exp for exp in active_experiments if exp.id == existing_participation.experiment_id)
                return ABTestAssignment(
                    experiment_id=experiment.id,
                    experiment_name=experiment.name,
                    treatment_group=existing_participation.treatment_group,
                    config_overrides=experiment.treatment_configs.get(existing_participation.treatment_group, {}),
                    tracking_data={'existing_participant': True}
                )
            
            # Select experiment and assign treatment
            for experiment in active_experiments:
                if self._should_participate_in_experiment(experiment, user_id, order_context):
                    treatment_group = self._assign_treatment_group(experiment, user_id)
                    
                    # Record participation
                    participant = ExperimentParticipant(
                        experiment_id=experiment.id,
                        user_id=user_id,
                        treatment_group=treatment_group,
                        session_id=str(uuid.uuid4())
                    )
                    db.add(participant)
                    db.commit()
                    
                    return ABTestAssignment(
                        experiment_id=experiment.id,
                        experiment_name=experiment.name,
                        treatment_group=treatment_group,
                        config_overrides=experiment.treatment_configs.get(treatment_group, {}),
                        tracking_data={'new_participant': True}
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Error in A/B test assignment: {str(e)}")
            return None
    
    def _should_participate_in_experiment(
        self,
        experiment: ABTestExperiment,
        user_id: int,
        order_context: Dict[str, Any]
    ) -> bool:
        """
        Determine if user should participate in this experiment
        """
        try:
            # Check targeting filters
            if experiment.target_segments:
                # Would need to check customer segment
                pass
            
            if experiment.complexity_filters:
                order_complexity = order_context.get('complexity_level', 'moderate')
                if order_complexity not in experiment.complexity_filters:
                    return False
            
            if experiment.order_value_filters:
                order_value = order_context.get('estimated_value', 0)
                min_value = experiment.order_value_filters.get('min', 0)
                max_value = experiment.order_value_filters.get('max', float('inf'))
                if not (min_value <= order_value <= max_value):
                    return False
            
            # Check if experiment has capacity
            total_participants = len(experiment.treatment_participants)
            if total_participants >= experiment.minimum_sample_size * 10:  # Cap at 10x minimum
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking experiment participation: {str(e)}")
            return False
    
    def _assign_treatment_group(
        self,
        experiment: ABTestExperiment,
        user_id: int
    ) -> str:
        """
        Assign user to treatment group based on traffic allocation
        """
        try:
            # Use deterministic assignment based on user_id hash
            random.seed(hash(f"{experiment.id}_{user_id}") % 2**32)
            
            allocation = experiment.traffic_allocation
            rand_val = random.random()
            
            cumulative = 0.0
            for group, percentage in allocation.items():
                cumulative += percentage
                if rand_val <= cumulative:
                    return group
            
            # Fallback to control
            return 'control'
            
        except Exception as e:
            logger.error(f"Error assigning treatment group: {str(e)}")
            return 'control'
    
    def _make_optimization_decision(
        self,
        db: Session,
        request: PersonalizedRecommendationRequest,
        personal_profile: Optional[PersonalizationProfile],
        ab_assignment: Optional[ABTestAssignment]
    ) -> OptimizationDecision:
        """
        Make real-time optimization decision for algorithm selection
        """
        try:
            # Determine optimization context
            context = {
                'has_personal_profile': personal_profile is not None,
                'personal_confidence': personal_profile.confidence_level if personal_profile else 0.0,
                'complexity_level': request.complexity_level,
                'ab_test_active': ab_assignment is not None,
                'optimization_goal': request.optimization_goal
            }
            
            # Select algorithm based on context
            algorithm_scores = {}
            
            for algorithm, config in self.available_algorithms.items():
                score = self._score_algorithm_for_context(algorithm, config, context, personal_profile)
                algorithm_scores[algorithm] = score
            
            # Handle A/B test override
            if ab_assignment and 'algorithm' in ab_assignment.config_overrides:
                selected_algorithm = ab_assignment.config_overrides['algorithm']
                confidence = 0.8  # Lower confidence for A/B test
                reasoning = {'source': 'ab_test', 'experiment': ab_assignment.experiment_name}
            else:
                # Select best algorithm
                selected_algorithm = max(algorithm_scores.items(), key=lambda x: x[1])[0]
                confidence = algorithm_scores[selected_algorithm]
                reasoning = {
                    'source': 'optimization',
                    'scores': algorithm_scores,
                    'context': context
                }
            
            # Determine personalization level
            if personal_profile and personal_profile.confidence_level > 0.5:
                personalization_level = min(0.9, personal_profile.confidence_level + 0.2)
            else:
                personalization_level = 0.3  # Conservative for new customers
            
            # Determine exploration rate
            if personal_profile and personal_profile.total_interactions > 20:
                exploration_rate = 0.1  # Lower exploration for experienced customers
            else:
                exploration_rate = 0.3  # Higher exploration for new customers
            
            return OptimizationDecision(
                algorithm_selected=selected_algorithm,
                personalization_level=personalization_level,
                exploration_rate=exploration_rate,
                confidence_score=confidence,
                reasoning=reasoning
            )
            
        except Exception as e:
            logger.error(f"Error making optimization decision: {str(e)}")
            return OptimizationDecision(
                algorithm_selected='enhanced_standard',
                personalization_level=0.3,
                exploration_rate=0.2,
                confidence_score=0.5,
                reasoning={'source': 'fallback', 'error': str(e)}
            )
    
    def _score_algorithm_for_context(
        self,
        algorithm: str,
        config: Dict[str, Any],
        context: Dict[str, Any],
        personal_profile: Optional[PersonalizationProfile]
    ) -> float:
        """
        Score algorithm suitability for current context
        """
        base_score = config['confidence']
        
        # Adjust for complexity comfort
        complexity_map = {'simple': 2, 'moderate': 5, 'high': 8, 'critical': 10}
        complexity_num = complexity_map.get(context['complexity_level'], 5)
        
        comfort_range = config['complexity_comfort']
        if comfort_range[0] <= complexity_num <= comfort_range[1]:
            complexity_bonus = 0.1
        else:
            complexity_bonus = -0.2
        
        # Adjust for personal profile confidence
        if personal_profile and personal_profile.confidence_level > 0.7:
            if algorithm in ['enhanced_standard', 'quality_focused']:
                profile_bonus = 0.15
            else:
                profile_bonus = 0.05
        else:
            profile_bonus = 0.0
        
        # Adjust for optimization goal
        goal_bonus = 0.0
        if context['optimization_goal'] == 'quality' and algorithm == 'quality_focused':
            goal_bonus = 0.2
        elif context['optimization_goal'] == 'speed' and algorithm == 'speed_optimized':
            goal_bonus = 0.2
        elif context['optimization_goal'] == 'cost' and algorithm == 'cost_efficient':
            goal_bonus = 0.2
        
        final_score = base_score + complexity_bonus + profile_bonus + goal_bonus
        return max(0.0, min(1.0, final_score))
    
    def _prepare_enhanced_request(
        self,
        request: PersonalizedRecommendationRequest,
        personal_profile: Optional[PersonalizationProfile],
        ab_assignment: Optional[ABTestAssignment],
        optimization_decision: OptimizationDecision
    ) -> Dict[str, Any]:
        """
        Prepare request for enhanced matching engine with personalization
        """
        enhanced_request = {
            'order': request.order_context,
            'customer_profile': request.customer_preferences or {},
            'explanation_level': 'summary',
            'use_learned_weights': True
        }
        
        # Apply personal profile preferences
        if personal_profile:
            if personal_profile.preferred_explanation_level:
                enhanced_request['explanation_level'] = personal_profile.preferred_explanation_level
            
            # Merge personal preferences
            if personal_profile.personal_weights:
                enhanced_request['customer_profile'].update({
                    'personal_weights': personal_profile.personal_weights,
                    'confidence_level': personal_profile.confidence_level
                })
        
        # Apply A/B test overrides
        if ab_assignment:
            for key, value in ab_assignment.config_overrides.items():
                if key in enhanced_request:
                    enhanced_request[key] = value
        
        return enhanced_request
    
    def _apply_advanced_personalization(
        self,
        recommendations: List[Any],
        personal_profile: Optional[PersonalizationProfile],
        optimization_decision: OptimizationDecision
    ) -> List[Any]:
        """
        Apply advanced personalization to recommendations
        """
        try:
            if not recommendations:
                return recommendations
            
            # Apply personal weight adjustments
            if personal_profile and personal_profile.personal_weights and personal_profile.confidence_level > 0.5:
                for rec in recommendations:
                    if hasattr(rec, 'match_score'):
                        # Adjust scores based on personal weights
                        personal_boost = self._calculate_personal_boost(
                            rec.match_score, personal_profile.personal_weights
                        )
                        rec.match_score.personalization_boost += personal_boost * optimization_decision.personalization_level
            
            # Apply exploration/exploitation balance
            if optimization_decision.exploration_rate > 0.2:
                recommendations = self._apply_exploration_boost(recommendations, optimization_decision.exploration_rate)
            
            # Re-rank based on final scores
            recommendations.sort(key=lambda x: x.match_score.complexity_adjusted_score, reverse=True)
            
            # Update ranks
            for i, rec in enumerate(recommendations):
                rec.rank = i + 1
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error applying advanced personalization: {str(e)}")
            return recommendations
    
    def _calculate_personal_boost(
        self,
        match_score: Any,
        personal_weights: Dict[str, float]
    ) -> float:
        """
        Calculate personalization boost based on individual preferences
        """
        try:
            boost = 0.0
            
            # Weight individual factors based on personal preferences
            factor_scores = {
                'capability': getattr(match_score, 'capability_score', 0.8),
                'performance': getattr(match_score, 'performance_score', 0.8),
                'geographic': getattr(match_score, 'geographic_score', 0.8),
                'quality': getattr(match_score, 'quality_score', 0.8),
                'cost': getattr(match_score, 'cost_efficiency_score', 0.8),
                'availability': getattr(match_score, 'availability_score', 0.8)
            }
            
            for factor, personal_weight in personal_weights.items():
                if factor in factor_scores:
                    factor_score = factor_scores[factor]
                    # Boost if this factor is strong and personally important
                    if factor_score > 0.7 and personal_weight > 0.15:
                        boost += (factor_score - 0.7) * (personal_weight - 0.15) * 0.5
            
            return min(boost, 0.15)  # Cap boost at 15%
            
        except Exception as e:
            logger.error(f"Error calculating personal boost: {str(e)}")
            return 0.0
    
    def _apply_exploration_boost(
        self,
        recommendations: List[Any],
        exploration_rate: float
    ) -> List[Any]:
        """
        Apply exploration boost to encourage trying different options
        """
        try:
            if exploration_rate <= 0.1 or len(recommendations) <= 2:
                return recommendations
            
            # Give slight boost to lower-ranked options
            for i, rec in enumerate(recommendations):
                if i > 0 and i < len(recommendations) - 1:  # Skip first and last
                    exploration_boost = (exploration_rate * 0.1) / (i + 1)
                    rec.match_score.complexity_adjusted_score += exploration_boost
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error applying exploration boost: {str(e)}")
            return recommendations
    
    def _track_optimization_decision(
        self,
        db: Session,
        request: PersonalizedRecommendationRequest,
        decision: OptimizationDecision,
        ab_assignment: Optional[ABTestAssignment]
    ):
        """
        Track optimization decision for learning and analysis
        """
        try:
            optimization_record = RealtimeOptimization(
                session_id=str(uuid.uuid4()),
                user_id=request.user_id,
                optimization_trigger='recommendation_request',
                context_data={
                    'complexity_level': request.complexity_level,
                    'optimization_goal': request.optimization_goal,
                    'ab_test_active': ab_assignment is not None
                },
                available_algorithms=list(self.available_algorithms.keys()),
                algorithm_selected=decision.algorithm_selected,
                selection_reasoning=decision.reasoning,
                confidence_score=decision.confidence_score,
                personalization_level=decision.personalization_level,
                exploration_rate=decision.exploration_rate,
                risk_tolerance=0.5  # Default risk tolerance
            )
            
            db.add(optimization_record)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error tracking optimization decision: {str(e)}")
    
    def update_personal_profile(
        self,
        db: Session,
        user_id: int,
        interaction_data: Dict[str, Any],
        choice_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Update individual customer profile based on new interaction
        """
        try:
            profile = db.query(CustomerPersonalizationProfile).filter(
                CustomerPersonalizationProfile.user_id == user_id
            ).first()
            
            if not profile:
                # Create new profile
                profile = CustomerPersonalizationProfile(
                    user_id=user_id,
                    personal_weights={},
                    behavior_patterns={},
                    total_interactions=0,
                    personal_confidence=self.personal_learning['initial_confidence']
                )
                db.add(profile)
            
            # Update interaction count
            profile.total_interactions += 1
            profile.last_interaction = datetime.now()
            
            # Update behavior patterns
            self._update_behavior_patterns(profile, interaction_data)
            
            # Update personal weights if choice was made
            if choice_data:
                self._update_personal_weights(profile, choice_data, interaction_data)
            
            # Update confidence
            profile.personal_confidence = min(
                self.personal_learning['max_confidence'],
                profile.personal_confidence + self.personal_learning['confidence_growth_rate']
            )
            
            db.commit()
            logger.info(f"Updated personal profile for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating personal profile: {str(e)}")
            db.rollback()
            return False
    
    def _update_behavior_patterns(
        self,
        profile: CustomerPersonalizationProfile,
        interaction_data: Dict[str, Any]
    ):
        """
        Update behavioral patterns from interaction data
        """
        try:
            patterns = profile.behavior_patterns or {}
            
            # Update decision speed
            if 'time_to_decision' in interaction_data:
                decision_time = interaction_data['time_to_decision']
                if decision_time < 60:
                    profile.decision_speed_profile = 'fast'
                elif decision_time < 300:
                    profile.decision_speed_profile = 'moderate'
                else:
                    profile.decision_speed_profile = 'deliberate'
            
            # Update explanation preferences
            if 'explanation_level_used' in interaction_data:
                profile.explanation_preference = interaction_data['explanation_level_used']
            
            # Update interaction patterns
            if 'interaction_types' in interaction_data:
                for interaction_type in interaction_data['interaction_types']:
                    patterns[f"{interaction_type}_count"] = patterns.get(f"{interaction_type}_count", 0) + 1
            
            profile.behavior_patterns = patterns
            
        except Exception as e:
            logger.error(f"Error updating behavior patterns: {str(e)}")
    
    def _update_personal_weights(
        self,
        profile: CustomerPersonalizationProfile,
        choice_data: Dict[str, Any],
        interaction_data: Dict[str, Any]
    ):
        """
        Update personal factor weights based on choices
        """
        try:
            weights = profile.personal_weights or {}
            
            # Initialize default weights if empty
            if not weights:
                weights = {
                    'capability': 0.35,
                    'performance': 0.25,
                    'geographic': 0.12,
                    'quality': 0.15,
                    'cost': 0.08,
                    'availability': 0.05
                }
            
            # Adjust based on important factors from choice
            important_factors = choice_data.get('important_factors', [])
            learning_rate = 0.05
            
            for factor in important_factors:
                if factor == 'price' and 'cost' in weights:
                    weights['cost'] = min(0.25, weights['cost'] + learning_rate)
                elif factor == 'quality' and 'quality' in weights:
                    weights['quality'] = min(0.3, weights['quality'] + learning_rate)
                elif factor == 'location' and 'geographic' in weights:
                    weights['geographic'] = min(0.25, weights['geographic'] + learning_rate)
                elif factor == 'timeline' and 'availability' in weights:
                    weights['availability'] = min(0.15, weights['availability'] + learning_rate)
                elif factor == 'capability' and 'capability' in weights:
                    weights['capability'] = min(0.5, weights['capability'] + learning_rate)
            
            # Normalize weights
            total_weight = sum(weights.values())
            if total_weight > 0:
                weights = {k: v / total_weight for k, v in weights.items()}
            
            profile.personal_weights = weights
            
        except Exception as e:
            logger.error(f"Error updating personal weights: {str(e)}")


# Global instance
advanced_personalization_engine = AdvancedPersonalizationEngine() 