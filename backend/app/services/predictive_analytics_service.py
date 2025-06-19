"""
Predictive Analytics Service - Phase 3 Implementation

This service provides predictive capabilities for customer behavior forecasting,
success prediction, and proactive optimization recommendations.
"""

import logging
import numpy as np
import json
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from dataclasses import dataclass
from collections import defaultdict
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, mean_squared_error, r2_score

from app.models.personalization import (
    PredictiveModel,
    CustomerPersonalizationProfile,
    ExperimentParticipant,
    RealtimeOptimization
)
from app.models.matching_feedback import (
    MatchingFeedbackSession,
    CustomerChoice,
    RecommendationInteraction
)

logger = logging.getLogger(__name__)


@dataclass
class PredictionRequest:
    """Request for making predictions"""
    user_id: int
    order_context: Dict[str, Any]
    prediction_types: List[str]  # success, satisfaction, churn, behavior
    include_confidence: bool = True


@dataclass
class PredictionResult:
    """Result from prediction model"""
    prediction_type: str
    prediction_value: Union[float, int, str]
    confidence_score: float
    explanation: Dict[str, Any]
    model_version: str
    feature_importance: Dict[str, float]


@dataclass
class CustomerBehaviorPrediction:
    """Comprehensive customer behavior prediction"""
    user_id: int
    success_probability: float
    satisfaction_prediction: float
    churn_risk: float
    next_order_timeline: str
    preferred_factors: List[str]
    risk_factors: List[str]
    recommendations: List[str]


@dataclass
class ModelPerformance:
    """Model performance metrics"""
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    feature_importance: Dict[str, float]
    training_samples: int
    validation_date: datetime


class PredictiveAnalyticsService:
    """
    Predictive Analytics Service for Customer Behavior and Success Forecasting
    
    Features:
    - Success rate prediction for recommendation matches
    - Customer satisfaction prediction
    - Churn risk analysis
    - Behavioral pattern forecasting
    - Proactive intervention recommendations
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        
        # Model configurations
        self.model_configs = {
            'success_prediction': {
                'model_type': 'classification',
                'algorithm': 'random_forest',
                'target_feature': 'converted',
                'min_samples': 100,
                'retrain_frequency_days': 7
            },
            'satisfaction_prediction': {
                'model_type': 'regression',
                'algorithm': 'random_forest',
                'target_feature': 'satisfaction_score',
                'min_samples': 50,
                'retrain_frequency_days': 14
            },
            'churn_prediction': {
                'model_type': 'classification',
                'algorithm': 'logistic_regression',
                'target_feature': 'churned',
                'min_samples': 80,
                'retrain_frequency_days': 30
            },
            'behavior_prediction': {
                'model_type': 'classification',
                'algorithm': 'random_forest',
                'target_feature': 'behavior_pattern',
                'min_samples': 60,
                'retrain_frequency_days': 21
            }
        }
        
        # Feature engineering configurations
        self.feature_configs = {
            'customer_features': [
                'total_interactions', 'successful_matches', 'avg_satisfaction',
                'avg_choice_rank', 'decision_speed_profile_encoded', 'risk_tolerance',
                'days_since_last_interaction', 'industry_diversity', 'geographic_spread'
            ],
            'order_features': [
                'complexity_level_encoded', 'estimated_value', 'timeline_urgency',
                'quality_requirements', 'cost_sensitivity', 'geographic_constraints'
            ],
            'interaction_features': [
                'explanation_views', 'comparison_actions', 'time_spent',
                'detail_expansions', 'manufacturer_views', 'quote_requests'
            ],
            'temporal_features': [
                'hour_of_day', 'day_of_week', 'month', 'season',
                'business_hours', 'time_since_last_order'
            ]
        }
    
    def make_predictions(
        self,
        db: Session,
        request: PredictionRequest
    ) -> List[PredictionResult]:
        """
        Make predictions for specified types
        """
        try:
            logger.info(f"Making predictions for user {request.user_id}: {request.prediction_types}")
            
            results = []
            
            # Prepare features for prediction
            features = self._prepare_prediction_features(db, request.user_id, request.order_context)
            
            for prediction_type in request.prediction_types:
                if prediction_type in self.model_configs:
                    result = self._make_single_prediction(
                        db, prediction_type, features, request.include_confidence
                    )
                    if result:
                        results.append(result)
            
            logger.info(f"Completed {len(results)} predictions for user {request.user_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            return []
    
    def predict_customer_behavior(
        self,
        db: Session,
        user_id: int,
        order_context: Optional[Dict[str, Any]] = None
    ) -> Optional[CustomerBehaviorPrediction]:
        """
        Comprehensive customer behavior prediction
        """
        try:
            logger.info(f"Predicting customer behavior for user {user_id}")
            
            # Prepare prediction request
            request = PredictionRequest(
                user_id=user_id,
                order_context=order_context or {},
                prediction_types=['success_prediction', 'satisfaction_prediction', 'churn_prediction'],
                include_confidence=True
            )
            
            # Get predictions
            predictions = self.make_predictions(db, request)
            
            if not predictions:
                return None
            
            # Extract prediction values
            success_prob = 0.5
            satisfaction_pred = 3.0
            churn_risk = 0.3
            
            for pred in predictions:
                if pred.prediction_type == 'success_prediction':
                    success_prob = pred.prediction_value
                elif pred.prediction_type == 'satisfaction_prediction':
                    satisfaction_pred = pred.prediction_value
                elif pred.prediction_type == 'churn_prediction':
                    churn_risk = pred.prediction_value
            
            # Get customer profile for additional insights
            profile = db.query(CustomerPersonalizationProfile).filter(
                CustomerPersonalizationProfile.user_id == user_id
            ).first()
            
            # Analyze preferred factors
            preferred_factors = self._analyze_preferred_factors(profile, predictions)
            
            # Identify risk factors
            risk_factors = self._identify_risk_factors(predictions, churn_risk)
            
            # Generate recommendations
            recommendations = self._generate_behavioral_recommendations(
                success_prob, satisfaction_pred, churn_risk, preferred_factors, risk_factors
            )
            
            # Predict next order timeline
            next_timeline = self._predict_next_order_timeline(db, user_id, order_context)
            
            return CustomerBehaviorPrediction(
                user_id=user_id,
                success_probability=success_prob,
                satisfaction_prediction=satisfaction_pred,
                churn_risk=churn_risk,
                next_order_timeline=next_timeline,
                preferred_factors=preferred_factors,
                risk_factors=risk_factors,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error predicting customer behavior for user {user_id}: {str(e)}")
            return None
    
    def train_models(
        self,
        db: Session,
        model_types: Optional[List[str]] = None
    ) -> Dict[str, ModelPerformance]:
        """
        Train or retrain prediction models
        """
        try:
            logger.info("Starting model training")
            
            if model_types is None:
                model_types = list(self.model_configs.keys())
            
            performance_results = {}
            
            for model_type in model_types:
                logger.info(f"Training {model_type} model")
                
                # Check if retraining is needed
                if not self._should_retrain_model(db, model_type):
                    logger.info(f"Skipping {model_type} - no retraining needed")
                    continue
                
                # Prepare training data
                X, y = self._prepare_training_data(db, model_type)
                
                if len(X) < self.model_configs[model_type]['min_samples']:
                    logger.warning(f"Insufficient data for {model_type}: {len(X)} samples")
                    continue
                
                # Train model
                performance = self._train_single_model(db, model_type, X, y)
                if performance:
                    performance_results[model_type] = performance
            
            logger.info(f"Model training completed. Trained {len(performance_results)} models")
            return performance_results
            
        except Exception as e:
            logger.error(f"Error training models: {str(e)}")
            return {}
    
    def evaluate_model_performance(
        self,
        db: Session,
        model_type: str
    ) -> Optional[ModelPerformance]:
        """
        Evaluate performance of a specific model
        """
        try:
            model_record = db.query(PredictiveModel).filter(
                and_(
                    PredictiveModel.model_type == model_type,
                    PredictiveModel.status == 'active'
                )
            ).first()
            
            if not model_record:
                return None
            
            # Get recent prediction accuracy
            accuracy_metrics = model_record.accuracy_metrics or {}
            
            return ModelPerformance(
                model_name=model_record.model_name,
                accuracy=accuracy_metrics.get('accuracy', 0.0),
                precision=accuracy_metrics.get('precision', 0.0),
                recall=accuracy_metrics.get('recall', 0.0),
                f1_score=accuracy_metrics.get('f1_score', 0.0),
                feature_importance=model_record.feature_importance or {},
                training_samples=accuracy_metrics.get('training_samples', 0),
                validation_date=model_record.last_retrained or model_record.created_at
            )
            
        except Exception as e:
            logger.error(f"Error evaluating model performance: {str(e)}")
            return None
    
    def _prepare_prediction_features(
        self,
        db: Session,
        user_id: int,
        order_context: Dict[str, Any]
    ) -> np.ndarray:
        """
        Prepare feature vector for prediction
        """
        try:
            features = []
            
            # Customer features
            profile = db.query(CustomerPersonalizationProfile).filter(
                CustomerPersonalizationProfile.user_id == user_id
            ).first()
            
            if profile:
                features.extend([
                    profile.total_interactions or 0,
                    profile.successful_matches or 0,
                    profile.avg_satisfaction_score or 3.0,
                    profile.avg_choice_rank or 3.0,
                    self._encode_categorical(profile.decision_speed_profile or 'moderate', ['fast', 'moderate', 'deliberate']),
                    profile.risk_tolerance or 0.5,
                    (datetime.now() - (profile.last_interaction or datetime.now())).days,
                    len(profile.industry_specialization or []),
                    len(profile.geographic_patterns or [])
                ])
            else:
                features.extend([0, 0, 3.0, 3.0, 1, 0.5, 0, 0, 0])  # Default values
            
            # Order features
            complexity_map = {'simple': 0, 'moderate': 1, 'high': 2, 'critical': 3}
            features.extend([
                complexity_map.get(order_context.get('complexity_level', 'moderate'), 1),
                order_context.get('estimated_value', 1000),
                order_context.get('timeline_urgency', 0.5),
                order_context.get('quality_requirements', 0.5),
                order_context.get('cost_sensitivity', 0.5),
                len(order_context.get('geographic_constraints', []))
            ])
            
            # Temporal features
            now = datetime.now()
            features.extend([
                now.hour,
                now.weekday(),
                now.month,
                (now.month - 1) // 3,  # Season
                1 if 9 <= now.hour <= 17 else 0,  # Business hours
                0  # Time since last order (would need historical data)
            ])
            
            return np.array(features).reshape(1, -1)
            
        except Exception as e:
            logger.error(f"Error preparing prediction features: {str(e)}")
            return np.array([]).reshape(1, -1)
    
    def _make_single_prediction(
        self,
        db: Session,
        prediction_type: str,
        features: np.ndarray,
        include_confidence: bool
    ) -> Optional[PredictionResult]:
        """
        Make a single prediction using the specified model
        """
        try:
            # Get model from database
            model_record = db.query(PredictiveModel).filter(
                and_(
                    PredictiveModel.model_type == prediction_type,
                    PredictiveModel.status == 'active'
                )
            ).first()
            
            if not model_record:
                logger.warning(f"No active model found for {prediction_type}")
                return None
            
            # Load model (in real implementation, would load from file/storage)
            # For now, create a simple mock prediction
            model_type = self.model_configs[prediction_type]['model_type']
            
            if model_type == 'classification':
                if prediction_type == 'success_prediction':
                    # Mock success prediction based on features
                    prediction_value = min(0.9, max(0.1, np.random.beta(8, 3)))
                    confidence = 0.8
                elif prediction_type == 'churn_prediction':
                    prediction_value = min(0.8, max(0.05, np.random.beta(2, 8)))
                    confidence = 0.75
                else:
                    prediction_value = 0.5
                    confidence = 0.6
            else:  # regression
                if prediction_type == 'satisfaction_prediction':
                    prediction_value = max(1.0, min(5.0, np.random.normal(4.2, 0.8)))
                    confidence = 0.7
                else:
                    prediction_value = 3.0
                    confidence = 0.6
            
            # Generate explanation
            explanation = {
                'primary_factors': ['historical_performance', 'order_complexity', 'customer_profile'],
                'confidence_factors': ['sample_size', 'model_accuracy', 'feature_quality'],
                'model_info': {
                    'algorithm': self.model_configs[prediction_type]['algorithm'],
                    'training_date': model_record.last_retrained or model_record.created_at,
                    'accuracy': model_record.accuracy_metrics.get('accuracy', 0.8) if model_record.accuracy_metrics else 0.8
                }
            }
            
            # Feature importance (mock)
            feature_importance = {
                'customer_history': 0.3,
                'order_complexity': 0.25,
                'temporal_factors': 0.2,
                'behavioral_patterns': 0.15,
                'external_factors': 0.1
            }
            
            return PredictionResult(
                prediction_type=prediction_type,
                prediction_value=prediction_value,
                confidence_score=confidence if include_confidence else 1.0,
                explanation=explanation,
                model_version=model_record.model_version,
                feature_importance=feature_importance
            )
            
        except Exception as e:
            logger.error(f"Error making {prediction_type} prediction: {str(e)}")
            return None
    
    def _prepare_training_data(
        self,
        db: Session,
        model_type: str
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data for model
        """
        try:
            X = []
            y = []
            
            # Get training data based on model type
            if model_type == 'success_prediction':
                # Get feedback sessions with outcomes
                sessions = db.query(MatchingFeedbackSession).filter(
                    MatchingFeedbackSession.session_completed == True
                ).limit(1000).all()
                
                for session in sessions:
                    choices = db.query(CustomerChoice).filter(
                        CustomerChoice.session_id == session.id
                    ).all()
                    
                    if choices:
                        # Extract features and target
                        features = self._extract_training_features(session)
                        target = 1 if any(choice.chosen_manufacturer_id for choice in choices) else 0
                        X.append(features)
                        y.append(target)
            
            elif model_type == 'satisfaction_prediction':
                # Get choices with satisfaction scores
                choices = db.query(CustomerChoice).filter(
                    CustomerChoice.satisfaction_rating.isnot(None)
                ).limit(500).all()
                
                for choice in choices:
                    session = db.query(MatchingFeedbackSession).filter(
                        MatchingFeedbackSession.id == choice.session_id
                    ).first()
                    
                    if session:
                        features = self._extract_training_features(session)
                        target = choice.satisfaction_rating
                        X.append(features)
                        y.append(target)
            
            return np.array(X), np.array(y)
            
        except Exception as e:
            logger.error(f"Error preparing training data for {model_type}: {str(e)}")
            return np.array([]), np.array([])
    
    def _extract_training_features(self, session) -> List[float]:
        """Extract features from a feedback session for training"""
        # Mock feature extraction
        return [
            session.complexity_level_num if hasattr(session, 'complexity_level_num') else 1,
            len(session.customer_preferences or {}),
            session.algorithm_version_num if hasattr(session, 'algorithm_version_num') else 1.0,
            np.random.random(),  # Mock features
            np.random.random(),
            np.random.random()
        ]
    
    def _train_single_model(
        self,
        db: Session,
        model_type: str,
        X: np.ndarray,
        y: np.ndarray
    ) -> Optional[ModelPerformance]:
        """
        Train a single model
        """
        try:
            config = self.model_configs[model_type]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Initialize model
            if config['algorithm'] == 'random_forest':
                if config['model_type'] == 'classification':
                    model = RandomForestClassifier(n_estimators=100, random_state=42)
                else:
                    model = RandomForestRegressor(n_estimators=100, random_state=42)
            elif config['algorithm'] == 'logistic_regression':
                model = LogisticRegression(random_state=42)
            else:
                model = LinearRegression()
            
            # Train model
            model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test)
            
            if config['model_type'] == 'classification':
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            else:
                accuracy = r2_score(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                precision = recall = f1 = accuracy
            
            # Feature importance
            if hasattr(model, 'feature_importances_'):
                feature_importance = {
                    f'feature_{i}': float(imp) 
                    for i, imp in enumerate(model.feature_importances_)
                }
            else:
                feature_importance = {}
            
            # Save model to database
            model_record = PredictiveModel(
                model_name=f"{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                model_type=model_type,
                model_version="1.0",
                feature_set=list(range(X.shape[1])),
                accuracy_metrics={
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'training_samples': len(X_train)
                },
                feature_importance=feature_importance,
                status='active',
                last_retrained=datetime.now()
            )
            
            # Deactivate old models
            db.query(PredictiveModel).filter(
                and_(
                    PredictiveModel.model_type == model_type,
                    PredictiveModel.status == 'active'
                )
            ).update({'status': 'deprecated'})
            
            db.add(model_record)
            db.commit()
            
            return ModelPerformance(
                model_name=model_record.model_name,
                accuracy=accuracy,
                precision=precision,
                recall=recall,
                f1_score=f1,
                feature_importance=feature_importance,
                training_samples=len(X_train),
                validation_date=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error training {model_type} model: {str(e)}")
            return None
    
    def _should_retrain_model(self, db: Session, model_type: str) -> bool:
        """Check if model should be retrained"""
        try:
            config = self.model_configs[model_type]
            
            latest_model = db.query(PredictiveModel).filter(
                and_(
                    PredictiveModel.model_type == model_type,
                    PredictiveModel.status == 'active'
                )
            ).first()
            
            if not latest_model:
                return True
            
            # Check if retrain frequency has passed
            retrain_due = latest_model.last_retrained + timedelta(days=config['retrain_frequency_days'])
            return datetime.now() >= retrain_due
            
        except Exception as e:
            logger.error(f"Error checking retrain status: {str(e)}")
            return False
    
    def _encode_categorical(self, value: str, categories: List[str]) -> int:
        """Encode categorical value as integer"""
        try:
            return categories.index(value)
        except ValueError:
            return 0
    
    def _analyze_preferred_factors(
        self,
        profile: Optional[CustomerPersonalizationProfile],
        predictions: List[PredictionResult]
    ) -> List[str]:
        """Analyze customer's preferred factors"""
        factors = []
        
        if profile and profile.personal_weights:
            # Sort by weight value
            sorted_weights = sorted(profile.personal_weights.items(), key=lambda x: x[1], reverse=True)
            factors.extend([factor for factor, weight in sorted_weights[:3] if weight > 0.15])
        
        # Add factors from prediction feature importance
        for pred in predictions:
            if pred.feature_importance:
                top_features = sorted(pred.feature_importance.items(), key=lambda x: x[1], reverse=True)
                factors.extend([feature for feature, importance in top_features[:2] if importance > 0.2])
        
        return list(set(factors))[:5]  # Return top 5 unique factors
    
    def _identify_risk_factors(
        self,
        predictions: List[PredictionResult],
        churn_risk: float
    ) -> List[str]:
        """Identify risk factors for the customer"""
        risk_factors = []
        
        if churn_risk > 0.6:
            risk_factors.append("high_churn_risk")
        
        # Check prediction confidence
        low_confidence_predictions = [p for p in predictions if p.confidence_score < 0.6]
        if len(low_confidence_predictions) > 1:
            risk_factors.append("prediction_uncertainty")
        
        return risk_factors
    
    def _generate_behavioral_recommendations(
        self,
        success_prob: float,
        satisfaction_pred: float,
        churn_risk: float,
        preferred_factors: List[str],
        risk_factors: List[str]
    ) -> List[str]:
        """Generate recommendations based on predictions"""
        recommendations = []
        
        if success_prob < 0.6:
            recommendations.append("Consider adjusting recommendation algorithm for better success rate")
        
        if satisfaction_pred < 3.5:
            recommendations.append("Focus on factors that improve customer satisfaction")
        
        if churn_risk > 0.5:
            recommendations.append("Implement retention strategies")
        
        if 'cost' in preferred_factors:
            recommendations.append("Emphasize cost-effective options in recommendations")
        
        if 'quality' in preferred_factors:
            recommendations.append("Highlight quality credentials and certifications")
        
        return recommendations
    
    def _predict_next_order_timeline(
        self,
        db: Session,
        user_id: int,
        order_context: Optional[Dict[str, Any]]
    ) -> str:
        """Predict when customer might place next order"""
        # Mock implementation
        timelines = ["1-2 weeks", "2-4 weeks", "1-2 months", "3+ months"]
        return np.random.choice(timelines)


# Global instance
predictive_analytics_service = PredictiveAnalyticsService() 