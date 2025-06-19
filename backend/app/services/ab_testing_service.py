"""
A/B Testing Service - Phase 3 Implementation

This service provides real-time A/B testing capabilities for the recommendation system,
including experiment management, statistical analysis, and automated decision-making.
"""

import logging
import numpy as np
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass
from scipy import stats
import uuid

from app.models.personalization import (
    ABTestExperiment,
    ExperimentParticipant,
    MultiObjectiveGoal
)

logger = logging.getLogger(__name__)


@dataclass
class ExperimentConfig:
    """Configuration for a new A/B test experiment"""
    name: str
    description: str
    experiment_type: str  # algorithm, weights, ui, explanation
    control_config: Dict[str, Any]
    treatment_configs: Dict[str, Dict[str, Any]]
    traffic_allocation: Dict[str, float]
    primary_metric: str
    secondary_metrics: List[str]
    target_segments: Optional[List[str]] = None
    minimum_sample_size: int = 100
    minimum_effect_size: float = 0.05
    confidence_level: float = 0.95
    max_duration_days: int = 30


@dataclass
class ExperimentResults:
    """Results from an A/B test experiment"""
    experiment_id: int
    status: str
    control_performance: Dict[str, float]
    treatment_performance: Dict[str, Dict[str, float]]
    statistical_significance: float
    effect_size: float
    confidence_interval: Tuple[float, float]
    winner: Optional[str]
    recommendation: str
    insights: List[str]


@dataclass
class StatisticalTest:
    """Statistical test results"""
    test_type: str
    p_value: float
    effect_size: float
    confidence_interval: Tuple[float, float]
    sample_size_control: int
    sample_size_treatment: int
    power: float
    significant: bool


class ABTestingService:
    """
    A/B Testing Service for Recommendation System
    
    Features:
    - Real-time experiment management
    - Statistical significance testing
    - Multi-armed bandit capabilities
    - Automated stopping rules
    - Performance monitoring
    """
    
    def __init__(self):
        self.significance_threshold = 0.05
        self.min_sample_size = 50
        self.max_experiment_duration = 30  # days
        self.min_effect_size = 0.05
        
        # Supported experiment types and their configurations
        self.experiment_types = {
            'algorithm': {
                'description': 'Test different recommendation algorithms',
                'config_fields': ['algorithm_name', 'parameters'],
                'metrics': ['conversion_rate', 'satisfaction_score', 'choice_rank']
            },
            'weights': {
                'description': 'Test different factor weight configurations',
                'config_fields': ['factor_weights'],
                'metrics': ['conversion_rate', 'customer_satisfaction', 'time_to_decision']
            },
            'ui': {
                'description': 'Test different user interface presentations',
                'config_fields': ['layout', 'explanation_format', 'interaction_style'],
                'metrics': ['conversion_rate', 'time_to_decision', 'explanation_views']
            },
            'explanation': {
                'description': 'Test different explanation strategies',
                'config_fields': ['explanation_level', 'explanation_style', 'detail_level'],
                'metrics': ['customer_satisfaction', 'explanation_understanding', 'trust_score']
            }
        }
    
    def create_experiment(
        self,
        db: Session,
        config: ExperimentConfig,
        created_by: int
    ) -> int:
        """
        Create a new A/B test experiment
        """
        try:
            logger.info(f"Creating new experiment: {config.name}")
            
            # Validate configuration
            self._validate_experiment_config(config)
            
            # Create experiment record
            experiment = ABTestExperiment(
                name=config.name,
                description=config.description,
                experiment_type=config.experiment_type,
                control_config=config.control_config,
                treatment_configs=config.treatment_configs,
                traffic_allocation=config.traffic_allocation,
                target_segments=config.target_segments,
                primary_metric=config.primary_metric,
                secondary_metrics=config.secondary_metrics,
                minimum_sample_size=config.minimum_sample_size,
                minimum_effect_size=config.minimum_effect_size,
                confidence_level=config.confidence_level,
                status='draft',
                created_by=created_by,
                planned_end_date=datetime.now() + timedelta(days=config.max_duration_days)
            )
            
            db.add(experiment)
            db.commit()
            
            logger.info(f"Created experiment {experiment.id}: {config.name}")
            return experiment.id
            
        except Exception as e:
            logger.error(f"Error creating experiment: {str(e)}")
            db.rollback()
            raise
    
    def start_experiment(
        self,
        db: Session,
        experiment_id: int
    ) -> bool:
        """
        Start an A/B test experiment
        """
        try:
            experiment = db.query(ABTestExperiment).filter(
                ABTestExperiment.id == experiment_id
            ).first()
            
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            if experiment.status != 'draft':
                raise ValueError(f"Experiment {experiment_id} is not in draft status")
            
            # Final validation before starting
            self._validate_experiment_before_start(experiment)
            
            # Start experiment
            experiment.status = 'active'
            experiment.start_date = datetime.now()
            
            # Initialize tracking counters
            experiment.control_participants = 0
            experiment.control_conversions = 0
            experiment.treatment_participants = {group: 0 for group in experiment.treatment_configs.keys()}
            experiment.treatment_conversions = {group: 0 for group in experiment.treatment_configs.keys()}
            
            db.commit()
            
            logger.info(f"Started experiment {experiment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting experiment {experiment_id}: {str(e)}")
            db.rollback()
            return False
    
    def stop_experiment(
        self,
        db: Session,
        experiment_id: int,
        reason: str = "manual_stop"
    ) -> bool:
        """
        Stop an A/B test experiment
        """
        try:
            experiment = db.query(ABTestExperiment).filter(
                ABTestExperiment.id == experiment_id
            ).first()
            
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            if experiment.status != 'active':
                raise ValueError(f"Experiment {experiment_id} is not active")
            
            # Perform final analysis
            results = self.analyze_experiment(db, experiment_id)
            
            # Update experiment status
            experiment.status = 'completed'
            experiment.actual_end_date = datetime.now()
            
            # Store final results
            if results:
                experiment.statistical_significance = results.statistical_significance
                experiment.effect_size = results.effect_size
                experiment.confidence_interval = results.confidence_interval
                experiment.winner = results.winner
            
            db.commit()
            
            logger.info(f"Stopped experiment {experiment_id}, reason: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping experiment {experiment_id}: {str(e)}")
            db.rollback()
            return False
    
    def analyze_experiment(
        self,
        db: Session,
        experiment_id: int
    ) -> Optional[ExperimentResults]:
        """
        Analyze A/B test experiment results
        """
        try:
            experiment = db.query(ABTestExperiment).filter(
                ABTestExperiment.id == experiment_id
            ).first()
            
            if not experiment:
                return None
            
            # Get participant data
            participants = db.query(ExperimentParticipant).filter(
                ExperimentParticipant.experiment_id == experiment_id
            ).all()
            
            if not participants:
                return None
            
            # Group participants by treatment
            control_participants = [p for p in participants if p.treatment_group == 'control']
            treatment_groups = {}
            
            for participant in participants:
                if participant.treatment_group != 'control':
                    if participant.treatment_group not in treatment_groups:
                        treatment_groups[participant.treatment_group] = []
                    treatment_groups[participant.treatment_group].append(participant)
            
            # Calculate performance metrics
            control_performance = self._calculate_group_performance(control_participants, experiment.primary_metric)
            treatment_performance = {}
            
            for group_name, group_participants in treatment_groups.items():
                treatment_performance[group_name] = self._calculate_group_performance(
                    group_participants, experiment.primary_metric
                )
            
            # Perform statistical tests
            best_treatment = None
            best_p_value = 1.0
            best_effect_size = 0.0
            best_confidence_interval = (0.0, 0.0)
            
            for group_name, group_performance in treatment_performance.items():
                test_result = self._perform_statistical_test(
                    control_participants, treatment_groups[group_name], experiment.primary_metric
                )
                
                if test_result.significant and test_result.p_value < best_p_value:
                    best_treatment = group_name
                    best_p_value = test_result.p_value
                    best_effect_size = test_result.effect_size
                    best_confidence_interval = test_result.confidence_interval
            
            # Determine winner
            if best_treatment and best_effect_size >= experiment.minimum_effect_size:
                winner = best_treatment
                recommendation = f"Implement {best_treatment} treatment"
            elif best_p_value > self.significance_threshold:
                winner = None
                recommendation = "No significant difference found, continue with control"
            else:
                winner = 'control'
                recommendation = "Control performs best, no changes needed"
            
            # Generate insights
            insights = self._generate_experiment_insights(
                experiment, control_performance, treatment_performance, best_p_value, best_effect_size
            )
            
            return ExperimentResults(
                experiment_id=experiment_id,
                status=experiment.status,
                control_performance=control_performance,
                treatment_performance=treatment_performance,
                statistical_significance=best_p_value,
                effect_size=best_effect_size,
                confidence_interval=best_confidence_interval,
                winner=winner,
                recommendation=recommendation,
                insights=insights
            )
            
        except Exception as e:
            logger.error(f"Error analyzing experiment {experiment_id}: {str(e)}")
            return None
    
    def check_stopping_rules(
        self,
        db: Session,
        experiment_id: int
    ) -> Tuple[bool, str]:
        """
        Check if experiment should be stopped based on automated rules
        """
        try:
            experiment = db.query(ABTestExperiment).filter(
                ABTestExperiment.id == experiment_id
            ).first()
            
            if not experiment or experiment.status != 'active':
                return False, "Experiment not active"
            
            # Check duration
            if experiment.start_date:
                duration = (datetime.now() - experiment.start_date).days
                if duration >= self.max_experiment_duration:
                    return True, "Maximum duration reached"
            
            # Check sample size
            total_participants = experiment.control_participants + sum(experiment.treatment_participants.values())
            if total_participants < experiment.minimum_sample_size:
                return False, "Insufficient sample size"
            
            # Check for statistical significance
            results = self.analyze_experiment(db, experiment_id)
            if results:
                # Early stopping for strong significance
                if results.statistical_significance < 0.01 and abs(results.effect_size) > experiment.minimum_effect_size * 2:
                    return True, "Strong statistical significance achieved"
                
                # Early stopping for futility (very low likelihood of achieving significance)
                if results.statistical_significance > 0.5 and total_participants > experiment.minimum_sample_size * 2:
                    return True, "Low probability of achieving significance"
            
            return False, "Continue experiment"
            
        except Exception as e:
            logger.error(f"Error checking stopping rules for experiment {experiment_id}: {str(e)}")
            return False, f"Error: {str(e)}"
    
    def get_active_experiments(
        self,
        db: Session,
        experiment_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of active experiments
        """
        try:
            query = db.query(ABTestExperiment).filter(
                ABTestExperiment.status == 'active'
            )
            
            if experiment_type:
                query = query.filter(ABTestExperiment.experiment_type == experiment_type)
            
            experiments = query.all()
            
            result = []
            for exp in experiments:
                total_participants = exp.control_participants + sum(exp.treatment_participants.values()) if exp.treatment_participants else exp.control_participants
                
                result.append({
                    'id': exp.id,
                    'name': exp.name,
                    'type': exp.experiment_type,
                    'start_date': exp.start_date,
                    'participants': total_participants,
                    'traffic_allocation': exp.traffic_allocation,
                    'primary_metric': exp.primary_metric
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting active experiments: {str(e)}")
            return []
    
    def _validate_experiment_config(self, config: ExperimentConfig):
        """Validate experiment configuration"""
        if not config.name or len(config.name) < 3:
            raise ValueError("Experiment name must be at least 3 characters")
        
        if config.experiment_type not in self.experiment_types:
            raise ValueError(f"Unknown experiment type: {config.experiment_type}")
        
        if not config.traffic_allocation or sum(config.traffic_allocation.values()) != 1.0:
            raise ValueError("Traffic allocation must sum to 1.0")
        
        if 'control' not in config.traffic_allocation:
            raise ValueError("Traffic allocation must include 'control' group")
        
        if config.minimum_sample_size < 20:
            raise ValueError("Minimum sample size must be at least 20")
        
        if not 0.01 <= config.minimum_effect_size <= 0.5:
            raise ValueError("Minimum effect size must be between 0.01 and 0.5")
        
        if not 0.8 <= config.confidence_level <= 0.99:
            raise ValueError("Confidence level must be between 0.8 and 0.99")
    
    def _validate_experiment_before_start(self, experiment: ABTestExperiment):
        """Additional validation before starting experiment"""
        # Check for conflicts with other active experiments
        # Implementation would depend on business rules
        pass
    
    def _calculate_group_performance(
        self,
        participants: List[ExperimentParticipant],
        primary_metric: str
    ) -> Dict[str, float]:
        """Calculate performance metrics for a group"""
        if not participants:
            return {}
        
        performance = {}
        
        # Conversion rate
        converted = sum(1 for p in participants if p.converted)
        performance['conversion_rate'] = converted / len(participants) if participants else 0.0
        
        # Average satisfaction score
        satisfaction_scores = [p.satisfaction_score for p in participants if p.satisfaction_score is not None]
        performance['avg_satisfaction'] = np.mean(satisfaction_scores) if satisfaction_scores else 0.0
        
        # Average choice rank
        choice_ranks = [p.choice_rank for p in participants if p.choice_rank is not None]
        performance['avg_choice_rank'] = np.mean(choice_ranks) if choice_ranks else 0.0
        
        # Average time to decision
        decision_times = [p.time_to_decision for p in participants if p.time_to_decision is not None]
        performance['avg_time_to_decision'] = np.mean(decision_times) if decision_times else 0.0
        
        # Sample size
        performance['sample_size'] = len(participants)
        
        return performance
    
    def _perform_statistical_test(
        self,
        control_group: List[ExperimentParticipant],
        treatment_group: List[ExperimentParticipant],
        metric: str
    ) -> StatisticalTest:
        """Perform statistical test between control and treatment groups"""
        try:
            if metric == 'conversion_rate':
                # Proportion test for conversion rate
                control_conversions = sum(1 for p in control_group if p.converted)
                treatment_conversions = sum(1 for p in treatment_group if p.converted)
                
                control_rate = control_conversions / len(control_group) if control_group else 0
                treatment_rate = treatment_conversions / len(treatment_group) if treatment_group else 0
                
                # Two-proportion z-test
                if len(control_group) > 0 and len(treatment_group) > 0:
                    z_stat, p_value = stats.proportions_ztest(
                        [control_conversions, treatment_conversions],
                        [len(control_group), len(treatment_group)]
                    )
                    
                    effect_size = treatment_rate - control_rate
                    
                    # Calculate confidence interval for difference
                    se = np.sqrt(
                        (control_rate * (1 - control_rate) / len(control_group)) +
                        (treatment_rate * (1 - treatment_rate) / len(treatment_group))
                    )
                    margin_error = 1.96 * se  # 95% confidence
                    ci_lower = effect_size - margin_error
                    ci_upper = effect_size + margin_error
                    
                else:
                    p_value = 1.0
                    effect_size = 0.0
                    ci_lower = ci_upper = 0.0
                
            else:
                # t-test for continuous metrics
                control_values = []
                treatment_values = []
                
                if metric == 'avg_satisfaction':
                    control_values = [p.satisfaction_score for p in control_group if p.satisfaction_score is not None]
                    treatment_values = [p.satisfaction_score for p in treatment_group if p.satisfaction_score is not None]
                elif metric == 'avg_choice_rank':
                    control_values = [p.choice_rank for p in control_group if p.choice_rank is not None]
                    treatment_values = [p.choice_rank for p in treatment_group if p.choice_rank is not None]
                elif metric == 'avg_time_to_decision':
                    control_values = [p.time_to_decision for p in control_group if p.time_to_decision is not None]
                    treatment_values = [p.time_to_decision for p in treatment_group if p.time_to_decision is not None]
                
                if len(control_values) > 1 and len(treatment_values) > 1:
                    t_stat, p_value = stats.ttest_ind(control_values, treatment_values)
                    effect_size = np.mean(treatment_values) - np.mean(control_values)
                    
                    # Calculate confidence interval
                    pooled_se = np.sqrt(
                        (np.var(control_values, ddof=1) / len(control_values)) +
                        (np.var(treatment_values, ddof=1) / len(treatment_values))
                    )
                    df = len(control_values) + len(treatment_values) - 2
                    t_critical = stats.t.ppf(0.975, df)  # 95% confidence
                    margin_error = t_critical * pooled_se
                    ci_lower = effect_size - margin_error
                    ci_upper = effect_size + margin_error
                else:
                    p_value = 1.0
                    effect_size = 0.0
                    ci_lower = ci_upper = 0.0
            
            # Calculate statistical power (simplified)
            power = 0.8 if p_value < 0.05 else 0.5  # Placeholder calculation
            
            return StatisticalTest(
                test_type='z-test' if metric == 'conversion_rate' else 't-test',
                p_value=float(p_value),
                effect_size=float(effect_size),
                confidence_interval=(float(ci_lower), float(ci_upper)),
                sample_size_control=len(control_group),
                sample_size_treatment=len(treatment_group),
                power=power,
                significant=p_value < self.significance_threshold
            )
            
        except Exception as e:
            logger.error(f"Error performing statistical test: {str(e)}")
            return StatisticalTest('error', 1.0, 0.0, (0.0, 0.0), 0, 0, 0.0, False)
    
    def _generate_experiment_insights(
        self,
        experiment: ABTestExperiment,
        control_performance: Dict[str, float],
        treatment_performance: Dict[str, Dict[str, float]],
        p_value: float,
        effect_size: float
    ) -> List[str]:
        """Generate insights from experiment results"""
        insights = []
        
        if p_value < 0.05:
            if effect_size > 0:
                insights.append(f"Treatment shows statistically significant improvement of {effect_size:.2%}")
            else:
                insights.append(f"Treatment shows statistically significant decrease of {abs(effect_size):.2%}")
        else:
            insights.append("No statistically significant difference detected")
        
        # Sample size insights
        total_sample = control_performance.get('sample_size', 0) + sum(
            perf.get('sample_size', 0) for perf in treatment_performance.values()
        )
        if total_sample < experiment.minimum_sample_size:
            insights.append(f"Sample size ({total_sample}) below minimum required ({experiment.minimum_sample_size})")
        
        # Performance insights
        control_conversion = control_performance.get('conversion_rate', 0)
        for group, perf in treatment_performance.items():
            treatment_conversion = perf.get('conversion_rate', 0)
            if treatment_conversion > control_conversion * 1.1:
                insights.append(f"{group} shows {((treatment_conversion / control_conversion - 1) * 100):.1f}% higher conversion rate")
        
        return insights


# Global instance
ab_testing_service = ABTestingService() 