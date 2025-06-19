"""
Autonomous AI Service - Phase 4 Implementation

This service provides autonomous AI agents that handle procurement workflows
with minimal human intervention, learning and adapting over time.
"""

import logging
import json
import uuid
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
import joblib

from app.models.ecosystem import AutonomousProcurementAgent
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class ProcurementDecision:
    """Autonomous procurement decision"""
    agent_id: int
    decision_type: str
    context: Dict[str, Any]
    recommended_action: str
    confidence_score: float
    reasoning: List[str]
    requires_approval: bool
    alternatives: List[Dict[str, Any]]


@dataclass
class LearningEvent:
    """Learning event for agent improvement"""
    agent_id: int
    decision_id: str
    outcome: str  # success, failure, partial_success
    feedback: Dict[str, Any]
    lesson_learned: str
    confidence_impact: float


@dataclass
class AgentPerformance:
    """Agent performance metrics"""
    agent_id: int
    agent_name: str
    success_rate: float
    cost_savings: float
    time_savings: float
    decision_accuracy: float
    learning_velocity: float
    autonomy_level: str
    recommendations: List[str]


class AutonomousAIService:
    """
    Autonomous AI Service - Phase 4 Implementation
    
    Features:
    - Self-learning procurement agents
    - Autonomous decision making with human oversight
    - Continuous learning and adaptation
    - Risk assessment and mitigation
    - Performance optimization and reporting
    """
    
    def __init__(self):
        # Agent autonomy levels and capabilities
        self.autonomy_levels = {
            'supervised': {
                'max_decision_value': 1000,
                'requires_approval': True,
                'learning_rate': 0.05,
                'risk_tolerance': 0.1
            },
            'semi_autonomous': {
                'max_decision_value': 10000,
                'requires_approval': False,
                'learning_rate': 0.1,
                'risk_tolerance': 0.3
            },
            'fully_autonomous': {
                'max_decision_value': 100000,
                'requires_approval': False,
                'learning_rate': 0.15,
                'risk_tolerance': 0.5
            }
        }
        
        # Decision types and their complexity
        self.decision_types = {
            'supplier_selection': {
                'complexity': 'high',
                'factors': ['cost', 'quality', 'delivery_time', 'reliability'],
                'min_confidence': 0.8
            },
            'pricing_negotiation': {
                'complexity': 'medium',
                'factors': ['market_price', 'volume', 'relationship', 'urgency'],
                'min_confidence': 0.7
            },
            'order_timing': {
                'complexity': 'low',
                'factors': ['inventory_level', 'demand_forecast', 'lead_time'],
                'min_confidence': 0.6
            },
            'quality_assessment': {
                'complexity': 'high',
                'factors': ['specifications', 'certifications', 'testing_results'],
                'min_confidence': 0.9
            },
            'contract_terms': {
                'complexity': 'very_high',
                'factors': ['legal_terms', 'risk_allocation', 'compliance'],
                'min_confidence': 0.95
            }
        }
        
        # Learning algorithms for different decision types
        self.learning_models = {
            'classification': RandomForestClassifier(n_estimators=100, random_state=42),
            'regression': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'optimization': 'genetic_algorithm'  # Would implement custom optimization
        }
    
    def create_autonomous_agent(
        self,
        db: Session,
        user_id: int,
        agent_config: Dict[str, Any]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Create new autonomous procurement agent
        """
        try:
            logger.info(f"Creating autonomous agent for user {user_id}")
            
            # Validate agent configuration
            validation_result = self._validate_agent_config(agent_config)
            if not validation_result['valid']:
                return False, validation_result
            
            # Initialize learning model
            learning_model = self._initialize_learning_model(agent_config)
            
            # Create agent record
            agent = AutonomousProcurementAgent(
                agent_name=agent_config['agent_name'],
                user_id=user_id,
                autonomy_level=agent_config.get('autonomy_level', 'supervised'),
                decision_boundaries=agent_config.get('decision_boundaries', {}),
                approval_workflows=agent_config.get('approval_workflows', {}),
                escalation_rules=agent_config.get('escalation_rules', {}),
                learning_model=learning_model,
                procurement_categories=agent_config.get('procurement_categories', []),
                budget_limits=agent_config.get('budget_limits', {}),
                supplier_preferences=agent_config.get('supplier_preferences', {}),
                quality_requirements=agent_config.get('quality_requirements', {}),
                decision_criteria=agent_config.get('decision_criteria', {}),
                optimization_goals=agent_config.get('optimization_goals', {}),
                constraint_handling=agent_config.get('constraint_handling', {}),
                status='active'
            )
            
            db.add(agent)
            db.commit()
            
            # Initialize agent with baseline training
            training_result = self._perform_baseline_training(db, agent)
            
            return True, {
                'agent_id': agent.id,
                'agent_name': agent.agent_name,
                'autonomy_level': agent.autonomy_level,
                'status': 'created',
                'training_result': training_result,
                'message': f'Autonomous agent {agent.agent_name} created successfully'
            }
            
        except Exception as e:
            logger.error(f"Error creating autonomous agent: {str(e)}")
            db.rollback()
            return False, {'error': str(e)}
    
    def make_autonomous_decision(
        self,
        db: Session,
        agent_id: int,
        decision_context: Dict[str, Any]
    ) -> ProcurementDecision:
        """
        Make autonomous procurement decision
        """
        try:
            agent = db.query(AutonomousProcurementAgent).filter(
                AutonomousProcurementAgent.id == agent_id
            ).first()
            
            if not agent or agent.status != 'active':
                raise ValueError(f"Agent {agent_id} not found or not active")
            
            decision_type = decision_context.get('decision_type', 'supplier_selection')
            
            # Analyze decision context
            context_analysis = self._analyze_decision_context(agent, decision_context)
            
            # Generate decision using AI model
            decision_recommendation = self._generate_decision_recommendation(
                agent, decision_type, context_analysis
            )
            
            # Assess confidence and risk
            confidence_assessment = self._assess_decision_confidence(
                agent, decision_recommendation, context_analysis
            )
            
            # Determine if human approval is needed
            requires_approval = self._requires_human_approval(
                agent, decision_recommendation, confidence_assessment
            )
            
            # Generate alternatives
            alternatives = self._generate_decision_alternatives(
                agent, decision_recommendation, context_analysis
            )
            
            # Create decision record
            decision = ProcurementDecision(
                agent_id=agent_id,
                decision_type=decision_type,
                context=decision_context,
                recommended_action=decision_recommendation['action'],
                confidence_score=confidence_assessment['confidence'],
                reasoning=decision_recommendation['reasoning'],
                requires_approval=requires_approval,
                alternatives=alternatives
            )
            
            # Log decision for learning
            self._log_decision_for_learning(db, agent, decision)
            
            return decision
            
        except Exception as e:
            logger.error(f"Error making autonomous decision: {str(e)}")
            raise
    
    def execute_autonomous_action(
        self,
        db: Session,
        agent_id: int,
        decision: ProcurementDecision,
        human_approval: Optional[bool] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Execute autonomous action based on decision
        """
        try:
            agent = db.query(AutonomousProcurementAgent).filter(
                AutonomousProcurementAgent.id == agent_id
            ).first()
            
            if not agent:
                return False, {'error': f'Agent {agent_id} not found'}
            
            # Check if approval is required and provided
            if decision.requires_approval and human_approval is None:
                return False, {'error': 'Human approval required but not provided'}
            
            if decision.requires_approval and not human_approval:
                return False, {'error': 'Human approval denied'}
            
            # Execute the action
            execution_result = self._execute_procurement_action(agent, decision)
            
            # Update agent performance metrics
            self._update_agent_performance(db, agent, decision, execution_result)
            
            # Learn from the execution
            learning_event = LearningEvent(
                agent_id=agent_id,
                decision_id=str(uuid.uuid4()),
                outcome='success' if execution_result['success'] else 'failure',
                feedback=execution_result,
                lesson_learned=self._extract_lesson_learned(decision, execution_result),
                confidence_impact=0.05 if execution_result['success'] else -0.05
            )
            
            self._process_learning_event(db, agent, learning_event)
            
            return execution_result['success'], {
                'action_taken': decision.recommended_action,
                'execution_result': execution_result,
                'learning_applied': True,
                'agent_confidence_updated': True
            }
            
        except Exception as e:
            logger.error(f"Error executing autonomous action: {str(e)}")
            return False, {'error': str(e)}
    
    def train_agent_from_feedback(
        self,
        db: Session,
        agent_id: int,
        feedback_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Train agent from human feedback and past decisions
        """
        try:
            agent = db.query(AutonomousProcurementAgent).filter(
                AutonomousProcurementAgent.id == agent_id
            ).first()
            
            if not agent:
                return {'error': f'Agent {agent_id} not found'}
            
            # Prepare training data
            training_features, training_labels = self._prepare_training_data(agent, feedback_data)
            
            if len(training_features) < 10:  # Minimum training samples
                return {'error': 'Insufficient training data'}
            
            # Train the model
            training_result = self._train_agent_model(agent, training_features, training_labels)
            
            # Update agent's learning model
            agent.learning_model = training_result['model_config']
            agent.learning_velocity = training_result['learning_velocity']
            agent.confidence_score = training_result['confidence_score']
            agent.last_learning_update = datetime.now()
            
            db.commit()
            
            # Evaluate improvement
            performance_improvement = self._evaluate_training_improvement(agent, training_result)
            
            return {
                'training_successful': True,
                'samples_processed': len(training_features),
                'model_accuracy': training_result['accuracy'],
                'confidence_improvement': performance_improvement['confidence_delta'],
                'expected_performance_improvement': performance_improvement['expected_improvement'],
                'next_training_recommended': datetime.now() + timedelta(weeks=2)
            }
            
        except Exception as e:
            logger.error(f"Error training agent: {str(e)}")
            return {'error': str(e)}
    
    def get_agent_performance(
        self,
        db: Session,
        agent_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> List[AgentPerformance]:
        """
        Get performance metrics for autonomous agents
        """
        try:
            query = db.query(AutonomousProcurementAgent)
            
            if agent_id:
                query = query.filter(AutonomousProcurementAgent.id == agent_id)
            elif user_id:
                query = query.filter(AutonomousProcurementAgent.user_id == user_id)
            
            agents = query.all()
            performance_reports = []
            
            for agent in agents:
                # Calculate performance metrics
                metrics = self._calculate_agent_metrics(db, agent)
                
                # Generate recommendations
                recommendations = self._generate_performance_recommendations(agent, metrics)
                
                performance_reports.append(AgentPerformance(
                    agent_id=agent.id,
                    agent_name=agent.agent_name,
                    success_rate=metrics['success_rate'],
                    cost_savings=metrics['cost_savings'],
                    time_savings=metrics['time_savings'],
                    decision_accuracy=metrics['decision_accuracy'],
                    learning_velocity=agent.learning_velocity or 0.1,
                    autonomy_level=agent.autonomy_level,
                    recommendations=recommendations
                ))
            
            return performance_reports
            
        except Exception as e:
            logger.error(f"Error getting agent performance: {str(e)}")
            return []
    
    def optimize_agent_parameters(
        self,
        db: Session,
        agent_id: int
    ) -> Dict[str, Any]:
        """
        Optimize agent parameters based on performance history
        """
        try:
            agent = db.query(AutonomousProcurementAgent).filter(
                AutonomousProcurementAgent.id == agent_id
            ).first()
            
            if not agent:
                return {'error': f'Agent {agent_id} not found'}
            
            # Analyze current performance
            current_performance = self._calculate_agent_metrics(db, agent)
            
            # Identify optimization opportunities
            optimization_opportunities = self._identify_optimization_opportunities(
                agent, current_performance
            )
            
            # Generate optimized parameters
            optimized_params = self._generate_optimized_parameters(
                agent, optimization_opportunities
            )
            
            # Apply optimizations
            applied_optimizations = self._apply_parameter_optimizations(
                db, agent, optimized_params
            )
            
            return {
                'agent_id': agent_id,
                'current_performance': current_performance,
                'optimization_opportunities': optimization_opportunities,
                'optimized_parameters': optimized_params,
                'applied_optimizations': applied_optimizations,
                'expected_improvement': self._calculate_expected_improvement(
                    current_performance, optimized_params
                )
            }
            
        except Exception as e:
            logger.error(f"Error optimizing agent parameters: {str(e)}")
            return {'error': str(e)}
    
    def _validate_agent_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate agent configuration"""
        validation_errors = []
        
        # Check required fields
        required_fields = ['agent_name', 'procurement_categories']
        for field in required_fields:
            if field not in config:
                validation_errors.append(f"Missing required field: {field}")
        
        # Check autonomy level
        autonomy_level = config.get('autonomy_level', 'supervised')
        if autonomy_level not in self.autonomy_levels:
            validation_errors.append(f"Invalid autonomy level: {autonomy_level}")
        
        # Check budget limits
        budget_limits = config.get('budget_limits', {})
        if not isinstance(budget_limits, dict):
            validation_errors.append("Budget limits must be a dictionary")
        
        return {
            'valid': len(validation_errors) == 0,
            'errors': validation_errors
        }
    
    def _initialize_learning_model(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize learning model for agent"""
        autonomy_level = config.get('autonomy_level', 'supervised')
        autonomy_config = self.autonomy_levels[autonomy_level]
        
        model_config = {
            'model_type': 'random_forest',
            'learning_rate': autonomy_config['learning_rate'],
            'risk_tolerance': autonomy_config['risk_tolerance'],
            'feature_importance': {},
            'training_history': [],
            'model_version': '1.0',
            'last_updated': datetime.now().isoformat()
        }
        
        return model_config
    
    def _perform_baseline_training(
        self,
        db: Session,
        agent: AutonomousProcurementAgent
    ) -> Dict[str, Any]:
        """Perform baseline training for new agent"""
        try:
            # Generate synthetic training data for initial model
            synthetic_data = self._generate_synthetic_training_data(agent)
            
            # Train initial model
            features = synthetic_data['features']
            labels = synthetic_data['labels']
            
            # Split data for training and validation
            X_train, X_val, y_train, y_val = train_test_split(
                features, labels, test_size=0.2, random_state=42
            )
            
            # Train model
            model = self.learning_models['classification']
            model.fit(X_train, y_train)
            
            # Evaluate model
            accuracy = model.score(X_val, y_val)
            
            # Update agent with trained model
            agent.learning_model['model_accuracy'] = accuracy
            agent.learning_model['training_samples'] = len(features)
            agent.confidence_score = 0.5  # Initial confidence
            
            db.commit()
            
            return {
                'training_successful': True,
                'initial_accuracy': accuracy,
                'training_samples': len(features),
                'model_type': 'random_forest'
            }
            
        except Exception as e:
            logger.error(f"Error in baseline training: {str(e)}")
            return {'training_successful': False, 'error': str(e)}
    
    def _analyze_decision_context(
        self,
        agent: AutonomousProcurementAgent,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze decision context"""
        analysis = {
            'complexity_score': 0.5,
            'risk_level': 'medium',
            'urgency': context.get('urgency', 'normal'),
            'budget_impact': context.get('budget_impact', 'medium'),
            'stakeholder_impact': context.get('stakeholder_impact', 'medium'),
            'regulatory_implications': context.get('regulatory_implications', []),
            'market_conditions': context.get('market_conditions', {})
        }
        
        # Calculate complexity based on multiple factors
        complexity_factors = [
            len(context.get('requirements', [])) / 10,  # Normalized requirement count
            1.0 if context.get('custom_specifications') else 0.0,
            len(context.get('suppliers', [])) / 5,  # Normalized supplier count
            1.0 if context.get('multi_location_delivery') else 0.0
        ]
        
        analysis['complexity_score'] = min(1.0, sum(complexity_factors) / len(complexity_factors))
        
        # Determine risk level
        risk_factors = [
            context.get('budget_amount', 0) / agent.budget_limits.get('max_amount', 100000),
            1.0 if context.get('new_supplier') else 0.0,
            len(analysis['regulatory_implications']) / 5
        ]
        
        risk_score = sum(risk_factors) / len(risk_factors)
        if risk_score > 0.7:
            analysis['risk_level'] = 'high'
        elif risk_score > 0.4:
            analysis['risk_level'] = 'medium'
        else:
            analysis['risk_level'] = 'low'
        
        return analysis
    
    def _generate_decision_recommendation(
        self,
        agent: AutonomousProcurementAgent,
        decision_type: str,
        context_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate decision recommendation using AI"""
        decision_config = self.decision_types.get(decision_type, {})
        factors = decision_config.get('factors', [])
        
        # Real ML-based decision generation using trained models
        try:
            # Load the trained procurement decision model
            import os
            from ..core.config import settings
            import joblib
            
            model_path = f"{settings.ML_MODELS_PATH}/procurement_decision_model.pkl"
            if os.path.exists(model_path):
                # Extract features from context analysis
                features = self._extract_decision_features(context_analysis, factors)
                
                # Load model and make prediction
                model = joblib.load(model_path)
                action_probabilities = model.predict_proba([features])[0]
                
                # Map probabilities to actions
                actions = ['proceed_with_top_supplier', 'request_additional_quotes', 'negotiate_terms', 'select_alternative']
                best_action = actions[np.argmax(action_probabilities)]
                confidence_score = float(np.max(action_probabilities))
                
                # Generate reasoning based on feature importance
                reasoning = self._generate_ml_reasoning(features, factors, best_action)
                
                recommendation = {
                    'action': best_action,
                    'reasoning': reasoning,
                    'confidence_factors': {
                        factor: float(features[i]) if i < len(features) else 0.7 
                        for i, factor in enumerate(factors)
                    },
                    'risk_assessment': context_analysis['risk_level'],
                    'expected_outcome': 'positive' if confidence_score > 0.7 else 'uncertain',
                    'ml_confidence': confidence_score
                }
            else:
                raise FileNotFoundError("ML model not available")
                
        except (FileNotFoundError, ImportError, Exception) as e:
            logger.warning(f"ML model unavailable, using rule-based fallback: {str(e)}")
            # Fallback to rule-based decision making
            recommendation = self._rule_based_decision(context_analysis, factors)
        
        # Adjust recommendation based on agent's optimization goals
        optimization_goals = agent.optimization_goals or {}
        
        if optimization_goals.get('primary_goal') == 'cost_minimization':
            recommendation['action'] = 'select_lowest_cost_option'
            recommendation['reasoning'].insert(0, 'Optimizing for cost minimization')
        elif optimization_goals.get('primary_goal') == 'quality_maximization':
            recommendation['action'] = 'select_highest_quality_option'
            recommendation['reasoning'].insert(0, 'Optimizing for quality maximization')
        elif optimization_goals.get('primary_goal') == 'speed_optimization':
            recommendation['action'] = 'select_fastest_delivery_option'
            recommendation['reasoning'].insert(0, 'Optimizing for delivery speed')
        
        return recommendation
    
    def _assess_decision_confidence(
        self,
        agent: AutonomousProcurementAgent,
        recommendation: Dict[str, Any],
        context_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess confidence in decision"""
        base_confidence = agent.confidence_score or 0.5
        
        # Adjust confidence based on various factors
        confidence_adjustments = []
        
        # Experience in this decision type
        decision_history = agent.historical_decisions.get('decision_types', {})
        experience_factor = min(1.0, decision_history.get(recommendation.get('action', ''), 0) / 10)
        confidence_adjustments.append(experience_factor * 0.2)
        
        # Context complexity
        complexity_penalty = context_analysis['complexity_score'] * 0.1
        confidence_adjustments.append(-complexity_penalty)
        
        # Risk level
        risk_penalty = {'low': 0, 'medium': 0.05, 'high': 0.15}[context_analysis['risk_level']]
        confidence_adjustments.append(-risk_penalty)
        
        # Model confidence
        model_confidence = recommendation.get('confidence_factors', {})
        avg_model_confidence = sum(model_confidence.values()) / len(model_confidence) if model_confidence else 0.7
        confidence_adjustments.append((avg_model_confidence - 0.5) * 0.3)
        
        final_confidence = max(0.0, min(1.0, base_confidence + sum(confidence_adjustments)))
        
        return {
            'confidence': final_confidence,
            'confidence_factors': {
                'base_confidence': base_confidence,
                'experience_factor': experience_factor,
                'complexity_penalty': complexity_penalty,
                'risk_penalty': risk_penalty,
                'model_confidence': avg_model_confidence
            },
            'confidence_level': 'high' if final_confidence > 0.8 else 'medium' if final_confidence > 0.6 else 'low'
        }
    
    def _requires_human_approval(
        self,
        agent: AutonomousProcurementAgent,
        recommendation: Dict[str, Any],
        confidence_assessment: Dict[str, Any]
    ) -> bool:
        """Determine if human approval is required"""
        autonomy_config = self.autonomy_levels[agent.autonomy_level]
        
        # Always require approval for supervised agents
        if agent.autonomy_level == 'supervised':
            return True
        
        # Check confidence threshold
        min_confidence = self.decision_types.get(
            recommendation.get('action', ''), {}
        ).get('min_confidence', 0.7)
        
        if confidence_assessment['confidence'] < min_confidence:
            return True
        
        # Check decision value threshold
        decision_value = recommendation.get('estimated_value', 0)
        if decision_value > autonomy_config['max_decision_value']:
            return True
        
        # Check risk level
        if recommendation.get('risk_assessment') == 'high':
            return True
        
        # Check escalation rules
        escalation_rules = agent.escalation_rules or {}
        for rule, condition in escalation_rules.items():
            if self._evaluate_escalation_condition(recommendation, condition):
                return True
        
        return False
    
    def _generate_decision_alternatives(
        self,
        agent: AutonomousProcurementAgent,
        recommendation: Dict[str, Any],
        context_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate alternative decisions"""
        alternatives = []
        
        # Generate cost-optimized alternative
        if recommendation['action'] != 'select_lowest_cost_option':
            alternatives.append({
                'action': 'select_lowest_cost_option',
                'rationale': 'Cost optimization alternative',
                'trade_offs': ['Lower cost', 'Potentially longer delivery time'],
                'confidence': 0.75
            })
        
        # Generate quality-optimized alternative
        if recommendation['action'] != 'select_highest_quality_option':
            alternatives.append({
                'action': 'select_highest_quality_option',
                'rationale': 'Quality optimization alternative',
                'trade_offs': ['Higher quality', 'Higher cost'],
                'confidence': 0.80
            })
        
        # Generate speed-optimized alternative
        if recommendation['action'] != 'select_fastest_delivery_option':
            alternatives.append({
                'action': 'select_fastest_delivery_option',
                'rationale': 'Speed optimization alternative',
                'trade_offs': ['Faster delivery', 'Potentially higher cost'],
                'confidence': 0.70
            })
        
        # Generate conservative alternative
        alternatives.append({
            'action': 'request_additional_quotes',
            'rationale': 'Conservative approach - gather more information',
            'trade_offs': ['More information', 'Delayed decision'],
            'confidence': 0.90
        })
        
        return alternatives[:3]  # Return top 3 alternatives
    
    def _log_decision_for_learning(
        self,
        db: Session,
        agent: AutonomousProcurementAgent,
        decision: ProcurementDecision
    ):
        """Log decision for future learning"""
        # Update historical decisions
        historical = agent.historical_decisions or {}
        
        if 'decisions' not in historical:
            historical['decisions'] = []
        
        historical['decisions'].append({
            'timestamp': datetime.now().isoformat(),
            'decision_type': decision.decision_type,
            'action': decision.recommended_action,
            'confidence': decision.confidence_score,
            'context': decision.context,
            'outcome': 'pending'  # Will be updated when outcome is known
        })
        
        # Keep only last 100 decisions
        historical['decisions'] = historical['decisions'][-100:]
        
        agent.historical_decisions = historical
        agent.decisions_made += 1
        agent.last_decision = datetime.now()
        
        db.commit()
    
    def _execute_procurement_action(
        self,
        agent: AutonomousProcurementAgent,
        decision: ProcurementDecision
    ) -> Dict[str, Any]:
        """Execute the procurement action"""
        try:
            # Mock execution - would integrate with actual procurement systems
            action = decision.recommended_action
            
            execution_result = {
                'success': True,
                'action_executed': action,
                'execution_time': datetime.now().isoformat(),
                'cost_savings': np.random.uniform(500, 5000),  # Mock savings
                'time_savings': np.random.uniform(1, 10),  # Hours saved
                'quality_score': np.random.uniform(0.8, 1.0),
                'supplier_selected': 'Supplier A',  # Mock
                'order_value': decision.context.get('budget_amount', 10000)
            }
            
            # Simulate some failures for learning
            if np.random.random() < 0.1:  # 10% failure rate
                execution_result['success'] = False
                execution_result['error_reason'] = 'Supplier capacity issue'
                execution_result['cost_savings'] = 0
                execution_result['time_savings'] = 0
            
            return execution_result
            
        except Exception as e:
            logger.error(f"Error executing procurement action: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'action_executed': decision.recommended_action
            }
    
    def _update_agent_performance(
        self,
        db: Session,
        agent: AutonomousProcurementAgent,
        decision: ProcurementDecision,
        execution_result: Dict[str, Any]
    ):
        """Update agent performance metrics"""
        if execution_result['success']:
            agent.success_rate = (
                (agent.success_rate * agent.decisions_made + 1) / (agent.decisions_made + 1)
            ) if agent.decisions_made > 0 else 1.0
            
            agent.cost_savings_achieved += execution_result.get('cost_savings', 0)
            agent.time_savings_achieved += execution_result.get('time_savings', 0)
        else:
            agent.success_rate = (
                (agent.success_rate * agent.decisions_made) / (agent.decisions_made + 1)
            ) if agent.decisions_made > 0 else 0.0
        
        db.commit()
    
    def _extract_lesson_learned(
        self,
        decision: ProcurementDecision,
        execution_result: Dict[str, Any]
    ) -> str:
        """Extract lesson learned from decision outcome"""
        if execution_result['success']:
            return f"Successful {decision.decision_type} with {decision.confidence_score:.2f} confidence"
        else:
            error_reason = execution_result.get('error_reason', 'Unknown error')
            return f"Failed {decision.decision_type} due to: {error_reason}"
    
    def _process_learning_event(
        self,
        db: Session,
        agent: AutonomousProcurementAgent,
        learning_event: LearningEvent
    ):
        """Process learning event to improve agent"""
        # Update confidence based on outcome
        current_confidence = agent.confidence_score or 0.5
        new_confidence = max(0.0, min(1.0, current_confidence + learning_event.confidence_impact))
        agent.confidence_score = new_confidence
        
        # Update learning velocity
        agent.learning_velocity = min(0.2, agent.learning_velocity + 0.01)
        
        # Update success patterns
        success_patterns = agent.success_patterns or {}
        pattern_key = f"{learning_event.outcome}_{len(learning_event.feedback)}"
        success_patterns[pattern_key] = success_patterns.get(pattern_key, 0) + 1
        agent.success_patterns = success_patterns
        
        # Update failure analysis if applicable
        if learning_event.outcome == 'failure':
            failure_analysis = agent.failure_analysis or {}
            error_reason = learning_event.feedback.get('error_reason', 'unknown')
            failure_analysis[error_reason] = failure_analysis.get(error_reason, 0) + 1
            agent.failure_analysis = failure_analysis
        
        db.commit()
    
    def _prepare_training_data(
        self,
        agent: AutonomousProcurementAgent,
        feedback_data: List[Dict[str, Any]]
    ) -> Tuple[List[List[float]], List[int]]:
        """Prepare training data from feedback"""
        features = []
        labels = []
        
        for feedback in feedback_data:
            # Extract features from feedback
            feature_vector = [
                feedback.get('budget_amount', 0) / 100000,  # Normalized budget
                len(feedback.get('requirements', [])),  # Number of requirements
                1.0 if feedback.get('urgent') else 0.0,  # Urgency flag
                feedback.get('supplier_count', 1),  # Number of suppliers
                feedback.get('complexity_score', 0.5)  # Complexity
            ]
            
            # Extract label (1 for successful decisions, 0 for unsuccessful)
            label = 1 if feedback.get('outcome') == 'success' else 0
            
            features.append(feature_vector)
            labels.append(label)
        
        return features, labels
    
    def _train_agent_model(
        self,
        agent: AutonomousProcurementAgent,
        features: List[List[float]],
        labels: List[int]
    ) -> Dict[str, Any]:
        """Train agent's machine learning model"""
        try:
            # Convert to numpy arrays
            X = np.array(features)
            y = np.array(labels)
            
            # Split for training and validation
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Train model
            model = self.learning_models['classification']
            model.fit(X_train, y_train)
            
            # Evaluate model
            accuracy = model.score(X_val, y_val)
            
            # Calculate learning velocity
            learning_velocity = min(0.2, agent.learning_velocity + 0.02)
            
            # Update confidence based on accuracy
            confidence_score = max(0.3, min(0.95, accuracy * 0.9 + 0.1))
            
            return {
                'model_config': {
                    'model_type': 'random_forest',
                    'accuracy': accuracy,
                    'training_samples': len(features),
                    'last_updated': datetime.now().isoformat()
                },
                'accuracy': accuracy,
                'learning_velocity': learning_velocity,
                'confidence_score': confidence_score
            }
            
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            return {
                'model_config': agent.learning_model,
                'accuracy': 0.5,
                'learning_velocity': agent.learning_velocity,
                'confidence_score': agent.confidence_score
            }
    
    def _evaluate_training_improvement(
        self,
        agent: AutonomousProcurementAgent,
        training_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate improvement from training"""
        old_confidence = agent.confidence_score or 0.5
        new_confidence = training_result['confidence_score']
        
        confidence_delta = new_confidence - old_confidence
        
        expected_improvement = {
            'confidence_delta': confidence_delta,
            'expected_improvement': f"{confidence_delta * 100:.1f}% improvement in decision confidence"
        }
        
        if confidence_delta > 0.1:
            expected_improvement['impact'] = 'significant'
        elif confidence_delta > 0.05:
            expected_improvement['impact'] = 'moderate'
        else:
            expected_improvement['impact'] = 'minimal'
        
        return expected_improvement
    
    def _calculate_agent_metrics(
        self,
        db: Session,
        agent: AutonomousProcurementAgent
    ) -> Dict[str, Any]:
        """Calculate comprehensive agent metrics"""
        try:
            # Get basic metrics from agent record
            metrics = {
                'success_rate': agent.success_rate or 0.0,
                'cost_savings': agent.cost_savings_achieved or 0.0,
                'time_savings': agent.time_savings_achieved or 0.0,
                'decisions_made': agent.decisions_made or 0,
                'confidence_score': agent.confidence_score or 0.5,
                'learning_velocity': agent.learning_velocity or 0.1
            }
            
            # Calculate decision accuracy from historical data
            historical = agent.historical_decisions or {}
            decisions = historical.get('decisions', [])
            
            if decisions:
                successful_decisions = len([d for d in decisions if d.get('outcome') == 'success'])
                metrics['decision_accuracy'] = successful_decisions / len(decisions)
            else:
                metrics['decision_accuracy'] = 0.5
            
            # Calculate ROI
            if metrics['cost_savings'] > 0:
                # Estimate operational cost (mock calculation)
                operational_cost = metrics['decisions_made'] * 100  # $100 per decision
                metrics['roi'] = (metrics['cost_savings'] - operational_cost) / operational_cost
            else:
                metrics['roi'] = 0.0
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating agent metrics: {str(e)}")
            return {
                'success_rate': 0.0,
                'cost_savings': 0.0,
                'time_savings': 0.0,
                'decision_accuracy': 0.5,
                'decisions_made': 0,
                'confidence_score': 0.5,
                'learning_velocity': 0.1,
                'roi': 0.0
            }
    
    def _generate_performance_recommendations(
        self,
        agent: AutonomousProcurementAgent,
        metrics: Dict[str, Any]
    ) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        # Success rate recommendations
        if metrics['success_rate'] < 0.7:
            recommendations.append("Increase training frequency to improve success rate")
        
        # Confidence recommendations
        if metrics['confidence_score'] < 0.6:
            recommendations.append("Provide more feedback to build agent confidence")
        
        # Learning velocity recommendations
        if metrics['learning_velocity'] < 0.05:
            recommendations.append("Introduce more diverse training scenarios")
        
        # Decision volume recommendations
        if metrics['decisions_made'] < 10:
            recommendations.append("Increase agent autonomy to handle more decisions")
        
        # ROI recommendations
        if metrics['roi'] < 0.5:
            recommendations.append("Focus on higher-value procurement decisions")
        
        return recommendations
    
    def _identify_optimization_opportunities(
        self,
        agent: AutonomousProcurementAgent,
        performance: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identify parameter optimization opportunities"""
        opportunities = []
        
        # Risk tolerance optimization
        if performance['success_rate'] > 0.8 and agent.risk_tolerance < 0.4:
            opportunities.append({
                'parameter': 'risk_tolerance',
                'current_value': agent.risk_tolerance,
                'recommended_value': min(0.6, agent.risk_tolerance + 0.1),
                'rationale': 'High success rate suggests agent can handle more risk'
            })
        
        # Learning rate optimization
        if performance['learning_velocity'] < 0.1:
            opportunities.append({
                'parameter': 'learning_rate',
                'current_value': agent.learning_model.get('learning_rate', 0.1),
                'recommended_value': 0.15,
                'rationale': 'Slow learning velocity suggests need for higher learning rate'
            })
        
        # Autonomy level optimization
        if performance['success_rate'] > 0.85 and agent.autonomy_level == 'supervised':
            opportunities.append({
                'parameter': 'autonomy_level',
                'current_value': agent.autonomy_level,
                'recommended_value': 'semi_autonomous',
                'rationale': 'High success rate suggests readiness for increased autonomy'
            })
        
        return opportunities
    
    def _generate_optimized_parameters(
        self,
        agent: AutonomousProcurementAgent,
        opportunities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate optimized parameters"""
        optimized_params = {}
        
        for opportunity in opportunities:
            param = opportunity['parameter']
            recommended_value = opportunity['recommended_value']
            optimized_params[param] = recommended_value
        
        return optimized_params
    
    def _apply_parameter_optimizations(
        self,
        db: Session,
        agent: AutonomousProcurementAgent,
        optimized_params: Dict[str, Any]
    ) -> List[str]:
        """Apply parameter optimizations"""
        applied = []
        
        for param, value in optimized_params.items():
            if param == 'risk_tolerance':
                agent.risk_tolerance = value
                applied.append(f"Updated risk tolerance to {value}")
            elif param == 'learning_rate':
                learning_model = agent.learning_model or {}
                learning_model['learning_rate'] = value
                agent.learning_model = learning_model
                applied.append(f"Updated learning rate to {value}")
            elif param == 'autonomy_level':
                agent.autonomy_level = value
                applied.append(f"Updated autonomy level to {value}")
        
        db.commit()
        return applied
    
    def _calculate_expected_improvement(
        self,
        current_performance: Dict[str, Any],
        optimized_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate expected improvement from optimizations"""
        improvements = {}
        
        if 'risk_tolerance' in optimized_params:
            improvements['decision_speed'] = '10-20% faster decisions'
        
        if 'learning_rate' in optimized_params:
            improvements['adaptation_speed'] = '15-25% faster learning'
        
        if 'autonomy_level' in optimized_params:
            improvements['operational_efficiency'] = '30-50% more autonomous operations'
        
        improvements['overall_impact'] = 'Moderate to significant improvement expected'
        
        return improvements
    
    def _evaluate_escalation_condition(
        self,
        recommendation: Dict[str, Any],
        condition: Dict[str, Any]
    ) -> bool:
        """Evaluate if escalation condition is met"""
        # Mock escalation logic
        condition_type = condition.get('type', 'value_threshold')
        
        if condition_type == 'value_threshold':
            threshold = condition.get('threshold', 10000)
            decision_value = recommendation.get('estimated_value', 0)
            return decision_value > threshold
        elif condition_type == 'risk_level':
            return recommendation.get('risk_assessment') == condition.get('risk_level', 'high')
        
        return False
    
    def _generate_synthetic_training_data(
        self,
        agent: AutonomousProcurementAgent
    ) -> Dict[str, Any]:
        """Generate synthetic training data for initial model"""
        # Generate synthetic procurement scenarios
        n_samples = 100
        features = []
        labels = []
        
        for _ in range(n_samples):
            # Generate random feature values
            feature_vector = [
                np.random.uniform(1000, 100000),  # Budget amount
                np.random.randint(1, 10),  # Number of requirements
                np.random.choice([0, 1]),  # Urgency flag
                np.random.randint(1, 5),  # Number of suppliers
                np.random.uniform(0.1, 1.0)  # Complexity score
            ]
            
            # Generate label based on feature values (mock logic)
            budget_factor = 1.0 if feature_vector[0] > 50000 else 0.8
            urgency_factor = 0.9 if feature_vector[2] == 1 else 1.0
            complexity_factor = 1.0 - feature_vector[4] * 0.3
            
            success_probability = budget_factor * urgency_factor * complexity_factor
            label = 1 if success_probability > 0.7 else 0
            
            features.append(feature_vector)
            labels.append(label)
        
        return {
            'features': features,
            'labels': labels
        }
    
    def _extract_decision_features(self, context_analysis: Dict[str, Any], factors: List[str]) -> List[float]:
        """Extract numerical features from context analysis for ML model"""
        features = []
        
        # Risk level (0=low, 1=medium, 2=high)
        risk_mapping = {'low': 0.0, 'medium': 0.5, 'high': 1.0}
        features.append(risk_mapping.get(context_analysis.get('risk_level', 'medium'), 0.5))
        
        # Complexity score
        features.append(context_analysis.get('complexity_score', 0.5))
        
        # Budget factor
        features.append(context_analysis.get('budget_factor', 0.5))
        
        # Timeline urgency
        features.append(context_analysis.get('timeline_urgency', 0.5))
        
        # Supplier count
        supplier_count = len(context_analysis.get('suppliers', []))
        features.append(min(1.0, supplier_count / 5.0))  # Normalize to 0-1
        
        # Quality requirements
        features.append(context_analysis.get('quality_requirements', 0.7))
        
        # Market conditions
        features.append(context_analysis.get('market_conditions', 0.5))
        
        return features
    
    def _generate_ml_reasoning(self, features: List[float], factors: List[str], action: str) -> List[str]:
        """Generate human-readable reasoning based on ML decision"""
        reasoning = []
        
        # Risk assessment reasoning
        if features[0] < 0.3:
            reasoning.append("Low risk environment supports automated decision")
        elif features[0] > 0.7:
            reasoning.append("High risk factors identified, conservative approach recommended")
        
        # Complexity reasoning
        if features[1] < 0.4:
            reasoning.append("Straightforward procurement case with clear requirements")
        elif features[1] > 0.6:
            reasoning.append("Complex procurement requiring careful supplier evaluation")
        
        # Budget reasoning
        if features[2] > 0.7:
            reasoning.append("Sufficient budget allows for quality-focused selection")
        elif features[2] < 0.3:
            reasoning.append("Budget constraints require cost-optimization focus")
        
        # Action-specific reasoning
        if action == 'proceed_with_top_supplier':
            reasoning.append("Top supplier meets all key criteria for immediate selection")
        elif action == 'request_additional_quotes':
            reasoning.append("Additional market research recommended before decision")
        elif action == 'negotiate_terms':
            reasoning.append("Current terms present opportunities for improvement")
        
        return reasoning[:4]  # Return top 4 reasons
    
    def _rule_based_decision(self, context_analysis: Dict[str, Any], factors: List[str]) -> Dict[str, Any]:
        """Fallback rule-based decision when ML model is unavailable"""
        risk_level = context_analysis.get('risk_level', 'medium')
        complexity = context_analysis.get('complexity_score', 0.5)
        suppliers = context_analysis.get('suppliers', [])
        
        # Simple rule-based logic
        if risk_level == 'high' or complexity > 0.8:
            action = 'request_additional_quotes'
            reasoning = ["High risk or complexity requires additional evaluation"]
        elif len(suppliers) < 2:
            action = 'request_additional_quotes'
            reasoning = ["Insufficient supplier options for comparison"]
        elif complexity < 0.3 and risk_level == 'low':
            action = 'proceed_with_top_supplier'
            reasoning = ["Low complexity and risk support immediate procurement"]
        else:
            action = 'negotiate_terms'
            reasoning = ["Moderate complexity suggests negotiation opportunities"]
        
        return {
            'action': action,
            'reasoning': reasoning,
            'confidence_factors': {factor: 0.7 for factor in factors},
            'risk_assessment': risk_level,
            'expected_outcome': 'positive' if risk_level != 'high' else 'uncertain'
        }


# Global instance
autonomous_ai_service = AutonomousAIService() 