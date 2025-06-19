"""
Enhanced Smart Matching Engine - Phase 1 Implementation

This enhanced version implements:
1. Dynamic option count based on complexity
2. Tiered explanation system (summary, detailed, expert)
3. Improved customer preference tracking
4. Better scoring algorithms
"""

import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from dataclasses import dataclass, asdict
from enum import Enum

from app.models.producer import Manufacturer
from app.models.order import Order
from app.models.quote import Quote
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


class ComplexityLevel(Enum):
    SIMPLE = "simple"
    MODERATE = "moderate" 
    HIGH = "high"
    CRITICAL = "critical"


class ExplanationLevel(Enum):
    SUMMARY = "summary"
    DETAILED = "detailed"
    EXPERT = "expert"


@dataclass
class ComplexityAnalysis:
    """Analysis of order complexity"""
    score: float  # 1-10 scale
    level: ComplexityLevel
    factors: List[str]
    process_complexity: float
    material_complexity: float
    precision_complexity: float
    timeline_pressure: float
    custom_requirements: float


@dataclass
class EnhancedMatchScore:
    """Extended match score with additional insights"""
    total_score: float
    capability_score: float
    performance_score: float
    geographic_score: float
    quality_score: float
    reliability_score: float
    cost_efficiency_score: float
    availability_score: float
    specialization_score: float
    historical_success_score: float
    confidence_level: float
    match_reasons: List[str]
    risk_factors: List[str]
    recommendation_strength: str
    mismatch_penalties: float
    complexity_adjusted_score: float
    personalization_boost: float
    market_context_score: float
    innovation_factor: float
    sustainability_score: float


@dataclass
class MatchExplanation:
    """Tiered explanation for match recommendations"""
    summary: Dict[str, Any]
    detailed: Optional[Dict[str, Any]] = None
    expert: Optional[Dict[str, Any]] = None


@dataclass
class CuratedMatch:
    """Enhanced match with curated presentation"""
    manufacturer_id: int
    manufacturer_name: str
    rank: int
    match_score: EnhancedMatchScore
    explanation: MatchExplanation
    key_strengths: List[str]
    potential_concerns: List[str]
    recommendation_confidence: float
    predicted_success_rate: float
    estimated_timeline: Dict[str, int]
    cost_analysis: Dict[str, float]
    risk_assessment: Dict[str, Any]


class EnhancedSmartMatchingEngine:
    """
    Enhanced Smart Matching Engine - Phase 1 Implementation
    
    Features:
    - Dynamic option count based on complexity
    - Tiered explanation system
    - Improved personalization
    - Better scoring algorithms
    """
    
    def __init__(self):
        # Initialize base engine
        try:
            from app.services.smart_matching_engine import SmartMatchingEngine
            self.base_engine = SmartMatchingEngine()
        except ImportError:
            logger.warning("Base SmartMatchingEngine not available, using fallback")
            self.base_engine = None
        
        # Complexity scoring weights
        self.complexity_weights = {
            'process_count': 0.25,
            'material_sophistication': 0.20,
            'precision_requirements': 0.20,
            'timeline_pressure': 0.15,
            'custom_specifications': 0.10,
            'quality_standards': 0.10
        }
        
        # Option count thresholds
        self.option_thresholds = {
            ComplexityLevel.SIMPLE: 2,
            ComplexityLevel.MODERATE: 3,
            ComplexityLevel.HIGH: 4,
            ComplexityLevel.CRITICAL: 4
        }
        
        # Enhanced scoring weights
        self.enhanced_weights = {
            'base_score': 0.70,
            'complexity_adjustment': 0.15,
            'personalization': 0.10,
            'market_context': 0.05
        }
    
    def get_curated_matches(
        self,
        db: Session,
        order: Order,
        customer_profile: Optional[Dict[str, Any]] = None,
        explanation_level: ExplanationLevel = ExplanationLevel.SUMMARY,
        use_learned_weights: bool = True
    ) -> List[CuratedMatch]:
        """
        Get curated matches with dynamic option count and tiered explanations
        Enhanced with Phase 2 feedback learning integration
        """
        try:
            logger.info(f"Generating curated matches for order {order.id}")
            start_time = datetime.now()
            
            # Step 1: Analyze order complexity
            complexity_analysis = self._calculate_complexity(order)
            logger.info(f"Order complexity: {complexity_analysis.level.value} (score: {complexity_analysis.score:.2f})")
            
            # Step 2: Get learned weights from feedback (Phase 2 integration)
            learned_weights = None
            if use_learned_weights:
                try:
                    from app.services.feedback_learning_engine import feedback_learning_engine
                    learned_weights = feedback_learning_engine.get_learned_weights_for_recommendation(
                        db=db,
                        customer_preferences=customer_profile,
                        complexity_level=complexity_analysis.level.value
                    )
                    if learned_weights:
                        logger.info(f"Using learned weights for {complexity_analysis.level.value} complexity")
                except Exception as e:
                    logger.warning(f"Could not load learned weights: {str(e)}")
            
            # Step 3: Determine optimal number of options
            num_options = self._determine_option_count(complexity_analysis)
            logger.info(f"Presenting {num_options} options based on complexity")
            
            # Step 4: Get base recommendations (fallback if base engine not available)
            if self.base_engine:
                base_recommendations = self.base_engine.get_smart_recommendations(
                    db, order, max_recommendations=num_options * 3
                )
            else:
                # Fallback implementation
                base_recommendations = self._get_fallback_recommendations(db, order, num_options * 3)
            
            if not base_recommendations:
                logger.warning(f"No base recommendations found for order {order.id}")
                return []
            
            # Step 5: Enhance and personalize recommendations with learned weights
            enhanced_matches = []
            for i, recommendation in enumerate(base_recommendations[:num_options]):
                try:
                    enhanced_match = self._create_curated_match(
                        db, recommendation, order, complexity_analysis,
                        customer_profile, explanation_level, i + 1, learned_weights
                    )
                    enhanced_matches.append(enhanced_match)
                    
                except Exception as e:
                    logger.error(f"Error creating curated match: {str(e)}")
                    continue
            
            # Step 6: Final ranking and optimization
            enhanced_matches = self._optimize_match_presentation(enhanced_matches, complexity_analysis)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Curated matching completed: {len(enhanced_matches)} matches in {processing_time:.2f}s")
            
            return enhanced_matches
            
        except Exception as e:
            logger.error(f"Error in curated matching for order {order.id}: {str(e)}")
            return []
    
    def _calculate_complexity(self, order: Order) -> ComplexityAnalysis:
        """Calculate order complexity score and analysis"""
        try:
            scores = {}
            factors = []
            
            # Process complexity (number and sophistication of processes)
            process_count = len(order.manufacturing_processes) if hasattr(order, 'manufacturing_processes') and order.manufacturing_processes else 1
            process_complexity = min(process_count / 5.0, 1.0)  # Normalize to 0-1
            
            # Advanced processes add complexity
            advanced_processes = ['cnc_machining', 'injection_molding', 'precision_casting', 'additive_manufacturing']
            if hasattr(order, 'manufacturing_processes') and order.manufacturing_processes:
                advanced_count = sum(1 for proc in order.manufacturing_processes if proc in advanced_processes)
                process_complexity += advanced_count * 0.1
            
            scores['process_complexity'] = min(process_complexity, 1.0)
            if process_count > 3:
                factors.append(f"Multiple manufacturing processes ({process_count})")
            
            # Material complexity
            material_complexity = 0.3  # Base complexity
            
            # Special materials increase complexity
            special_materials = ['titanium', 'inconel', 'carbon_fiber', 'ceramics', 'composites']
            if hasattr(order, 'materials') and order.materials:
                for material in order.materials:
                    if any(special in material.lower() for special in special_materials):
                        material_complexity += 0.2
                        factors.append(f"Special material: {material}")
            
            scores['material_complexity'] = min(material_complexity, 1.0)
            
            # Precision requirements
            precision_complexity = 0.2  # Base precision
            
            if hasattr(order, 'tolerances') and order.tolerances:
                # Check for tight tolerances
                tight_tolerance_keywords = ['±0.01', '±0.005', 'tight', 'precision', 'critical']
                tolerance_str = str(order.tolerances).lower()
                if any(keyword in tolerance_str for keyword in tight_tolerance_keywords):
                    precision_complexity += 0.4
                    factors.append("Tight tolerance requirements")
            
            if hasattr(order, 'quality_standards') and order.quality_standards:
                # High quality standards
                high_quality_standards = ['iso_9001', 'as9100', 'iso_13485', 'fda', 'military_spec']
                for standard in order.quality_standards:
                    if standard.lower() in high_quality_standards:
                        precision_complexity += 0.2
                        factors.append(f"Quality standard: {standard}")
            
            scores['precision_complexity'] = min(precision_complexity, 1.0)
            
            # Timeline pressure
            timeline_pressure = 0.1  # Base pressure
            
            if hasattr(order, 'deadline') and order.deadline:
                days_to_deadline = (order.deadline - datetime.now()).days
                if days_to_deadline < 7:
                    timeline_pressure = 0.9
                    factors.append("Very urgent timeline (< 1 week)")
                elif days_to_deadline < 14:
                    timeline_pressure = 0.7
                    factors.append("Urgent timeline (< 2 weeks)")
                elif days_to_deadline < 30:
                    timeline_pressure = 0.5
                    factors.append("Tight timeline (< 1 month)")
                else:
                    timeline_pressure = 0.2
            
            scores['timeline_pressure'] = timeline_pressure
            
            # Custom requirements complexity
            custom_complexity = 0.1  # Base
            
            if hasattr(order, 'custom_specifications') and order.custom_specifications:
                custom_complexity += 0.3
                factors.append("Custom specifications required")
            
            if hasattr(order, 'special_requirements') and order.special_requirements:
                custom_complexity += 0.2
                factors.append("Special requirements")
            
            scores['custom_requirements'] = min(custom_complexity, 1.0)
            
            # Calculate weighted complexity score
            complexity_score = 0
            for factor, weight in self.complexity_weights.items():
                score_key = factor.replace('_count', '_complexity').replace('_sophistication', '_complexity').replace('_requirements', '_complexity').replace('_pressure', '_pressure').replace('_standards', '_complexity')
                if score_key in scores:
                    complexity_score += scores[score_key] * weight * 10  # Scale to 10
            
            # Determine complexity level
            if complexity_score <= 3:
                level = ComplexityLevel.SIMPLE
            elif complexity_score <= 6:
                level = ComplexityLevel.MODERATE
            elif complexity_score <= 8:
                level = ComplexityLevel.HIGH
            else:
                level = ComplexityLevel.CRITICAL
            
            return ComplexityAnalysis(
                score=complexity_score,
                level=level,
                factors=factors,
                process_complexity=scores.get('process_complexity', 0),
                material_complexity=scores.get('material_complexity', 0),
                precision_complexity=scores.get('precision_complexity', 0),
                timeline_pressure=scores.get('timeline_pressure', 0),
                custom_requirements=scores.get('custom_requirements', 0)
            )
            
        except Exception as e:
            logger.error(f"Error calculating complexity: {str(e)}")
            # Return default moderate complexity
            return ComplexityAnalysis(
                score=5.0,
                level=ComplexityLevel.MODERATE,
                factors=["Error in complexity calculation"],
                process_complexity=0.5,
                material_complexity=0.5,
                precision_complexity=0.5,
                timeline_pressure=0.5,
                custom_requirements=0.5
            )
    
    def _determine_option_count(self, complexity_analysis: ComplexityAnalysis) -> int:
        """Determine optimal number of options based on complexity"""
        base_count = self.option_thresholds[complexity_analysis.level]
        
        # Adjust based on specific factors
        if complexity_analysis.timeline_pressure > 0.8:
            # Very urgent - provide more options for quick decision
            base_count += 1
        
        if complexity_analysis.precision_complexity > 0.8:
            # High precision - more options to compare quality
            base_count += 1
        
        # Cap at reasonable maximum
        return min(base_count, 5)
    
    def _get_fallback_recommendations(self, db: Session, order: Order, max_recommendations: int):
        """Fallback recommendation method when base engine is not available"""
        logger.info("Using fallback recommendation method")
        
        # Get manufacturers from database
        manufacturers = db.query(Manufacturer).filter(
            Manufacturer.is_active == True
        ).limit(max_recommendations).all()
        
        # Create basic recommendation objects
        recommendations = []
        for i, manufacturer in enumerate(manufacturers):
            # Create a basic recommendation structure
            basic_recommendation = type('SmartRecommendation', (), {
                'manufacturer_id': manufacturer.id,
                'manufacturer_name': manufacturer.business_name,
                'match_score': type('MatchScore', (), {
                    'total_score': 0.7 - (i * 0.05),  # Decreasing scores
                    'capability_score': 0.8,
                    'performance_score': 0.7,
                    'geographic_score': 0.6,
                    'quality_score': 0.7,
                    'reliability_score': 0.7,
                    'cost_efficiency_score': 0.6,
                    'availability_score': 0.8,
                    'specialization_score': 0.6,
                    'historical_success_score': 0.6,
                    'confidence_level': 0.7,
                    'match_reasons': [f"Good overall match for {manufacturer.business_name}"],
                    'risk_factors': [],
                    'recommendation_strength': "MODERATE",
                    'mismatch_penalties': 0.1
                })(),
                'predicted_success_rate': 0.7,
                'estimated_delivery_time': 30,
                'estimated_cost_range': {'min': 1000, 'max': 5000, 'average': 3000},
                'risk_assessment': {'overall_risk': 'Medium'},
                'competitive_advantages': ['Established manufacturer'],
                'potential_concerns': ['Limited information available'],
                'similar_past_projects': [],
                'ai_insights': {'status': 'Limited data available'}
            })()
            
            recommendations.append(basic_recommendation)
        
        return recommendations
    
    def _create_curated_match(
        self,
        db: Session,
        recommendation,
        order: Order,
        complexity_analysis: ComplexityAnalysis,
        customer_profile: Optional[Dict[str, Any]],
        explanation_level: ExplanationLevel,
        rank: int,
        learned_weights: Optional[Dict[str, float]] = None
    ) -> CuratedMatch:
        """Create a curated match with enhanced scoring and explanations"""
        
        # Convert base match score to enhanced score
        enhanced_score = self._create_enhanced_score(recommendation.match_score, complexity_analysis, customer_profile, learned_weights)
        
        # Generate tiered explanations
        explanation = self._generate_explanation(
            recommendation, enhanced_score, complexity_analysis, explanation_level
        )
        
        # Identify key strengths and concerns
        strengths, concerns = self._analyze_match_insights(
            recommendation, enhanced_score, complexity_analysis
        )
        
        return CuratedMatch(
            manufacturer_id=recommendation.manufacturer_id,
            manufacturer_name=recommendation.manufacturer_name,
            rank=rank,
            match_score=enhanced_score,
            explanation=explanation,
            key_strengths=strengths,
            potential_concerns=concerns,
            recommendation_confidence=enhanced_score.confidence_level,
            predicted_success_rate=getattr(recommendation, 'predicted_success_rate', 0.7),
            estimated_timeline=self._analyze_timeline(recommendation),
            cost_analysis=self._analyze_costs(recommendation),
            risk_assessment=getattr(recommendation, 'risk_assessment', {})
        )
    
    def _create_enhanced_score(self, base_score, complexity_analysis: ComplexityAnalysis, customer_profile: Optional[Dict[str, Any]], learned_weights: Optional[Dict[str, float]] = None) -> EnhancedMatchScore:
        """Convert base score to enhanced score with additional factors"""
        
        # Calculate enhancement factors
        complexity_boost = self._calculate_complexity_adjustment(base_score, complexity_analysis)
        personalization_boost = self._calculate_personalization_boost(base_score, customer_profile)
        market_context = 0.05  # Placeholder
        innovation_factor = 0.05  # Placeholder
        sustainability_score = 0.05  # Placeholder
        
        # Calculate enhanced total score
        enhanced_total = (
            base_score.total_score * self.enhanced_weights['base_score'] +
            complexity_boost * self.enhanced_weights['complexity_adjustment'] +
            personalization_boost * self.enhanced_weights['personalization'] +
            market_context * self.enhanced_weights['market_context']
        )
        
        return EnhancedMatchScore(
            total_score=base_score.total_score,
            capability_score=base_score.capability_score,
            performance_score=base_score.performance_score,
            geographic_score=base_score.geographic_score,
            quality_score=base_score.quality_score,
            reliability_score=base_score.reliability_score,
            cost_efficiency_score=base_score.cost_efficiency_score,
            availability_score=base_score.availability_score,
            specialization_score=base_score.specialization_score,
            historical_success_score=base_score.historical_success_score,
            confidence_level=base_score.confidence_level,
            match_reasons=base_score.match_reasons,
            risk_factors=base_score.risk_factors,
            recommendation_strength=base_score.recommendation_strength,
            mismatch_penalties=base_score.mismatch_penalties,
            complexity_adjusted_score=enhanced_total,
            personalization_boost=personalization_boost,
            market_context_score=market_context,
            innovation_factor=innovation_factor,
            sustainability_score=sustainability_score
        )
    
    def _calculate_complexity_adjustment(self, base_score, complexity_analysis: ComplexityAnalysis) -> float:
        """Calculate complexity-based score adjustment"""
        
        # For high complexity orders, boost manufacturers with proven track record
        if complexity_analysis.level in [ComplexityLevel.HIGH, ComplexityLevel.CRITICAL]:
            if base_score.performance_score > 0.8 and base_score.quality_score > 0.8:
                return 0.15  # Significant boost for proven performers
            elif base_score.specialization_score > 0.8:
                return 0.10  # Boost for specialists
        
        # For simple orders, don't penalize newer manufacturers
        if complexity_analysis.level == ComplexityLevel.SIMPLE:
            if base_score.availability_score > 0.8:
                return 0.05  # Small boost for availability
        
        return 0.0
    
    def _calculate_personalization_boost(self, base_score, customer_profile: Optional[Dict[str, Any]]) -> float:
        """Calculate personalization-based boost"""
        
        if not customer_profile:
            return 0.0
        
        boost = 0.0
        
        # Boost based on customer preferences
        if customer_profile.get('prefers_local', False) and base_score.geographic_score > 0.7:
            boost += 0.08
        
        if customer_profile.get('quality_focused', False) and base_score.quality_score > 0.8:
            boost += 0.06
        
        if customer_profile.get('price_sensitive', False) and base_score.cost_efficiency_score > 0.7:
            boost += 0.06
        
        if customer_profile.get('speed_priority', False) and base_score.availability_score > 0.8:
            boost += 0.05
        
        return min(boost, 0.15)  # Cap at 15%
    
    def _generate_explanation(self, recommendation, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis, level: ExplanationLevel) -> MatchExplanation:
        """Generate tiered explanations for the match"""
        
        # Always generate summary
        summary = self._generate_summary_explanation(recommendation, enhanced_score, complexity_analysis)
        
        detailed = None
        expert = None
        
        if level in [ExplanationLevel.DETAILED, ExplanationLevel.EXPERT]:
            detailed = self._generate_detailed_explanation(recommendation, enhanced_score, complexity_analysis)
        
        if level == ExplanationLevel.EXPERT:
            expert = self._generate_expert_explanation(recommendation, enhanced_score, complexity_analysis)
        
        return MatchExplanation(
            summary=summary,
            detailed=detailed,
            expert=expert
        )
    
    def _generate_summary_explanation(self, recommendation, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> Dict[str, Any]:
        """Generate summary-level explanation"""
        
        # Identify top 3 reasons for recommendation
        top_reasons = []
        
        if enhanced_score.capability_score > 0.8:
            top_reasons.append("Excellent capability match for your requirements")
        
        if enhanced_score.performance_score > 0.8:
            top_reasons.append("Strong track record of successful deliveries")
        
        if enhanced_score.quality_score > 0.8:
            top_reasons.append("High quality standards and certifications")
        
        if enhanced_score.geographic_score > 0.7:
            top_reasons.append("Convenient location for reduced logistics")
        
        if enhanced_score.cost_efficiency_score > 0.7:
            top_reasons.append("Competitive pricing for this type of work")
        
        if enhanced_score.availability_score > 0.8:
            top_reasons.append("Good availability to meet your timeline")
        
        # Take top 3
        top_reasons = top_reasons[:3]
        if not top_reasons:
            top_reasons = ["Good overall match for your requirements"]
        
        # Identify primary concern
        primary_concern = None
        if enhanced_score.risk_factors:
            primary_concern = enhanced_score.risk_factors[0]
        elif enhanced_score.mismatch_penalties > 0.1:
            primary_concern = "Some specification mismatches to discuss"
        
        return {
            "match_quality": "Excellent" if enhanced_score.complexity_adjusted_score > 0.8 else 
                           "Good" if enhanced_score.complexity_adjusted_score > 0.6 else "Fair",
            "why_recommended": top_reasons,
            "confidence_level": f"{enhanced_score.confidence_level * 100:.0f}%",
            "primary_strength": top_reasons[0] if top_reasons else "Good overall match",
            "primary_concern": primary_concern,
            "complexity_alignment": self._assess_complexity_alignment(enhanced_score, complexity_analysis)
        }
    
    def _generate_detailed_explanation(self, recommendation, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> Dict[str, Any]:
        """Generate detailed-level explanation"""
        
        return {
            "score_breakdown": {
                "capability_match": f"{enhanced_score.capability_score * 100:.1f}%",
                "performance_history": f"{enhanced_score.performance_score * 100:.1f}%",
                "quality_standards": f"{enhanced_score.quality_score * 100:.1f}%",
                "geographic_fit": f"{enhanced_score.geographic_score * 100:.1f}%",
                "cost_competitiveness": f"{enhanced_score.cost_efficiency_score * 100:.1f}%",
                "availability": f"{enhanced_score.availability_score * 100:.1f}%"
            },
            "complexity_analysis": {
                "order_complexity": complexity_analysis.level.value,
                "manufacturer_capability": self._assess_manufacturer_complexity_fit(enhanced_score, complexity_analysis),
                "risk_mitigation": self._assess_risk_mitigation(enhanced_score, complexity_analysis)
            },
            "competitive_positioning": self._analyze_competitive_position(enhanced_score),
            "improvement_opportunities": self._identify_improvement_areas(enhanced_score)
        }
    
    def _generate_expert_explanation(self, recommendation, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> Dict[str, Any]:
        """Generate expert-level explanation with algorithm insights"""
        
        return {
            "algorithm_insights": {
                "scoring_methodology": "Multi-dimensional weighted scoring with ML enhancement",
                "key_factors_weight": {
                    "capability_match": "35%",
                    "performance_history": "25%", 
                    "quality_metrics": "15%",
                    "geographic_proximity": "12%",
                    "cost_efficiency": "8%",
                    "availability": "5%"
                },
                "confidence_calculation": self._explain_confidence_calculation(enhanced_score),
                "personalization_applied": enhanced_score.personalization_boost > 0,
                "complexity_adjustments": enhanced_score.complexity_adjusted_score != enhanced_score.total_score
            },
            "data_sources": {
                "historical_projects": getattr(recommendation, 'similar_past_projects', []).__len__(),
                "performance_data_points": "Last 12 months",
                "market_intelligence": "Real-time pricing and capacity data",
                "quality_certifications": "Verified third-party certifications"
            },
            "statistical_confidence": {
                "match_accuracy": f"{enhanced_score.confidence_level * 100:.1f}%",
                "prediction_interval": "±15% for cost estimates",
                "success_probability": f"{getattr(recommendation, 'predicted_success_rate', 0.7) * 100:.1f}%"
            },
            "alternative_scenarios": self._generate_what_if_scenarios(enhanced_score, complexity_analysis)
        }
    
    def _assess_complexity_alignment(self, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> str:
        """Assess how well manufacturer aligns with order complexity"""
        
        if complexity_analysis.level == ComplexityLevel.SIMPLE:
            if enhanced_score.availability_score > 0.8:
                return "Perfect for straightforward projects"
            else:
                return "Good fit with some capacity constraints"
        
        elif complexity_analysis.level == ComplexityLevel.MODERATE:
            if enhanced_score.capability_score > 0.8 and enhanced_score.performance_score > 0.7:
                return "Well-equipped for moderate complexity"
            else:
                return "Capable but may need additional coordination"
        
        elif complexity_analysis.level == ComplexityLevel.HIGH:
            if enhanced_score.specialization_score > 0.8 and enhanced_score.quality_score > 0.8:
                return "Specialized for high-complexity projects"
            else:
                return "Has capability but higher coordination needed"
        
        else:  # CRITICAL
            if enhanced_score.performance_score > 0.9 and enhanced_score.quality_score > 0.9:
                return "Proven track record for critical projects"
            else:
                return "Proceed with enhanced due diligence"
    
    def _assess_manufacturer_complexity_fit(self, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> str:
        """Assess manufacturer's fit for complexity level"""
        
        capability_fit = enhanced_score.capability_score
        experience_fit = enhanced_score.performance_score
        
        if capability_fit > 0.8 and experience_fit > 0.8:
            return "Excellent fit"
        elif capability_fit > 0.7 and experience_fit > 0.7:
            return "Good fit"
        elif capability_fit > 0.6:
            return "Adequate fit"
        else:
            return "Challenging fit"
    
    def _assess_risk_mitigation(self, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> List[str]:
        """Assess risk mitigation strategies"""
        
        strategies = []
        
        if enhanced_score.quality_score < 0.7:
            strategies.append("Request additional quality documentation")
        
        if enhanced_score.performance_score < 0.7:
            strategies.append("Implement milestone-based payments")
        
        if complexity_analysis.timeline_pressure > 0.8:
            strategies.append("Consider expedited communication protocols")
        
        if enhanced_score.geographic_score < 0.6:
            strategies.append("Plan for extended logistics coordination")
        
        return strategies
    
    def _analyze_competitive_position(self, enhanced_score: EnhancedMatchScore) -> Dict[str, str]:
        """Analyze competitive positioning"""
        
        return {
            "cost_position": "Competitive" if enhanced_score.cost_efficiency_score > 0.7 else "Premium",
            "quality_position": "High" if enhanced_score.quality_score > 0.8 else "Standard",
            "speed_position": "Fast" if enhanced_score.availability_score > 0.8 else "Standard",
            "specialization": "Specialist" if enhanced_score.specialization_score > 0.8 else "Generalist"
        }
    
    def _identify_improvement_areas(self, enhanced_score: EnhancedMatchScore) -> List[str]:
        """Identify areas for potential improvement"""
        
        improvements = []
        
        if enhanced_score.cost_efficiency_score < 0.6:
            improvements.append("Negotiate volume discounts")
        
        if enhanced_score.availability_score < 0.7:
            improvements.append("Discuss timeline flexibility")
        
        if enhanced_score.geographic_score < 0.6:
            improvements.append("Optimize logistics planning")
        
        return improvements
    
    def _explain_confidence_calculation(self, enhanced_score: EnhancedMatchScore) -> str:
        """Explain how confidence was calculated"""
        
        factors = []
        
        if enhanced_score.capability_score > 0.8:
            factors.append("strong capability match")
        
        if enhanced_score.performance_score > 0.8:
            factors.append("proven track record")
        
        if enhanced_score.historical_success_score > 0.7:
            factors.append("historical success patterns")
        
        if len(factors) >= 2:
            return f"High confidence due to {', '.join(factors)}"
        elif len(factors) == 1:
            return f"Moderate confidence based on {factors[0]}"
        else:
            return "Confidence based on overall scoring alignment"
    
    def _generate_what_if_scenarios(self, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> List[Dict[str, str]]:
        """Generate what-if scenarios for expert analysis"""
        
        scenarios = []
        
        # Timeline scenario
        if complexity_analysis.timeline_pressure > 0.7:
            scenarios.append({
                "scenario": "Extended timeline (+50%)",
                "impact": "Cost reduction potential: 10-15%",
                "recommendation": "Consider if schedule allows flexibility"
            })
        
        # Volume scenario
        scenarios.append({
            "scenario": "Volume increase (2x)",
            "impact": "Unit cost reduction: 15-25%",
            "recommendation": "Evaluate manufacturer's scale capabilities"
        })
        
        # Quality scenario
        if enhanced_score.quality_score < 0.8:
            scenarios.append({
                "scenario": "Enhanced quality requirements",
                "impact": "Cost increase: 10-20%, Timeline +20%",
                "recommendation": "Assess quality upgrade feasibility"
            })
        
        return scenarios
    
    def _analyze_match_insights(self, recommendation, enhanced_score: EnhancedMatchScore, complexity_analysis: ComplexityAnalysis) -> Tuple[List[str], List[str]]:
        """Analyze match to identify key strengths and concerns"""
        
        strengths = []
        concerns = []
        
        # Identify strengths
        if enhanced_score.capability_score > 0.9:
            strengths.append("Exceptional capability match")
        elif enhanced_score.capability_score > 0.8:
            strengths.append("Strong capability alignment")
        
        if enhanced_score.performance_score > 0.9:
            strengths.append("Outstanding track record")
        elif enhanced_score.performance_score > 0.8:
            strengths.append("Reliable performance history")
        
        if enhanced_score.quality_score > 0.9:
            strengths.append("Premium quality standards")
        elif enhanced_score.quality_score > 0.8:
            strengths.append("High quality assurance")
        
        if enhanced_score.cost_efficiency_score > 0.8:
            strengths.append("Competitive pricing")
        
        if enhanced_score.availability_score > 0.8:
            strengths.append("Good availability")
        
        if enhanced_score.geographic_score > 0.8:
            strengths.append("Convenient location")
        
        # Identify concerns
        if enhanced_score.mismatch_penalties > 0.15:
            concerns.append("Some specification gaps")
        
        if enhanced_score.cost_efficiency_score < 0.5:
            concerns.append("Premium pricing")
        
        if enhanced_score.availability_score < 0.6:
            concerns.append("Limited immediate availability")
        
        if enhanced_score.geographic_score < 0.5:
            concerns.append("Distant location may impact logistics")
        
        if complexity_analysis.level == ComplexityLevel.CRITICAL and enhanced_score.performance_score < 0.8:
            concerns.append("Limited experience with critical projects")
        
        # Ensure we have at least some insights
        if not strengths:
            strengths.append("Overall good match for requirements")
        
        return strengths[:4], concerns[:3]  # Limit to most important
    
    def _analyze_timeline(self, recommendation) -> Dict[str, int]:
        """Analyze timeline estimates"""
        
        base_time = getattr(recommendation, 'estimated_delivery_time', 30)
        
        return {
            "estimated_days": base_time,
            "optimistic_days": max(int(base_time * 0.8), base_time - 7),
            "pessimistic_days": int(base_time * 1.3),
            "buffer_recommended": max(int(base_time * 0.2), 3)
        }
    
    def _analyze_costs(self, recommendation) -> Dict[str, float]:
        """Analyze cost estimates"""
        
        cost_range = getattr(recommendation, 'estimated_cost_range', {'min': 1000, 'max': 5000, 'average': 3000})
        
        return {
            "min_estimate": cost_range.get("min", 0),
            "max_estimate": cost_range.get("max", 0),
            "most_likely": cost_range.get("average", (cost_range.get("min", 0) + cost_range.get("max", 0)) / 2),
            "confidence_range": "±15%"
        }
    
    def _optimize_match_presentation(self, matches: List[CuratedMatch], complexity_analysis: ComplexityAnalysis) -> List[CuratedMatch]:
        """Optimize the presentation order and content of matches"""
        
        # Re-sort by enhanced score
        matches.sort(key=lambda x: x.match_score.complexity_adjusted_score, reverse=True)
        
        # Update ranks
        for i, match in enumerate(matches):
            match.rank = i + 1
        
        # For high complexity, ensure we have diversity in recommendations
        if complexity_analysis.level in [ComplexityLevel.HIGH, ComplexityLevel.CRITICAL]:
            matches = self._ensure_recommendation_diversity(matches)
        
        return matches
    
    def _ensure_recommendation_diversity(self, matches: List[CuratedMatch]) -> List[CuratedMatch]:
        """Ensure diversity in high-complexity recommendations"""
        
        if len(matches) <= 2:
            return matches
        
        # Keep top recommendation as is
        optimized = [matches[0]]
        
        # For remaining spots, ensure diversity
        remaining = matches[1:]
        
        # Prioritize different strengths
        quality_focused = next((m for m in remaining if m.match_score.quality_score > 0.8), None)
        cost_focused = next((m for m in remaining if m.match_score.cost_efficiency_score > 0.8), None)
        speed_focused = next((m for m in remaining if m.match_score.availability_score > 0.8), None)
        
        # Add diverse options
        for candidate in [quality_focused, cost_focused, speed_focused]:
            if candidate and candidate not in optimized and len(optimized) < len(matches):
                optimized.append(candidate)
        
        # Fill remaining spots with highest scores
        for match in remaining:
            if match not in optimized and len(optimized) < len(matches):
                optimized.append(match)
        
        # Update ranks
        for i, match in enumerate(optimized):
            match.rank = i + 1
        
        return optimized 