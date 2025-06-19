"""
PRISM's Quote Analysis AI - Intelligent Quote Evaluation System

This AI service evaluates submitted manufacturing quotes and provides comprehensive
analysis with intelligent recommendations to help clients make informed decisions.

Analysis Framework:
1. Cost Analysis - Price competitiveness and market comparison
2. Technical Compliance - Specification adherence and capability assessment
3. Risk Assessment - Reliability and project risk evaluation
4. Value Proposition - Overall value and partnership potential
"""

import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import numpy as np
import statistics
from fuzzywuzzy import fuzz

from app.models.quote import Quote
from app.models.producer import Manufacturer
from app.models.order import Order

logger = logging.getLogger(__name__)


@dataclass
class CostAnalysis:
    """Cost analysis results"""
    score: float
    market_comparison: str
    cost_breakdown_analysis: str
    price_per_unit: float
    market_variance: float


@dataclass
class TechnicalCompliance:
    """Technical compliance assessment"""
    score: float
    compliance_rate: float
    gaps_identified: List[str]
    capability_match: float


@dataclass
class RiskAssessment:
    """Risk assessment results"""
    overall_risk: str  # LOW, MEDIUM, HIGH
    risk_factors: List[str]
    mitigation_suggestions: List[str]
    reliability_score: float


@dataclass
class ValueProposition:
    """Value proposition analysis"""
    score: float
    key_advantages: List[str]
    differentiators: List[str]
    long_term_value: float


@dataclass
class QuoteAnalysisResult:
    """Complete quote analysis result"""
    quote_id: str
    manufacturer_name: str
    overall_score: float
    ranking: int
    cost_analysis: CostAnalysis
    technical_compliance: TechnicalCompliance
    risk_assessment: RiskAssessment
    value_proposition: ValueProposition
    recommendation: str
    reasoning: str
    questions_to_ask: List[str]


@dataclass
class MarketInsights:
    """Market intelligence and trends"""
    price_range_analysis: str
    quality_trends: str
    delivery_time_analysis: str
    market_conditions: str


@dataclass
class DecisionGuidance:
    """Decision guidance and recommendations"""
    top_recommendation: str
    alternative_options: List[str]
    negotiation_points: List[str]
    red_flags: List[str]


class PrismQuoteAnalyzer:
    """
    PRISM's Quote Analysis AI
    
    Evaluates manufacturing quotes using multi-dimensional analysis framework
    to provide intelligent recommendations and decision support.
    """
    
    def __init__(self):
        # Analysis weights
        self.weights = {
            'cost_analysis': 0.30,
            'technical_compliance': 0.35,
            'risk_assessment': 0.20,
            'value_proposition': 0.15
        }
        
        # Quality gates and thresholds
        self.quality_gates = {
            'min_acceptable_score': 60,
            'price_variance_warning': 0.30,  # 30% below market
            'delivery_time_warning': 0.40,   # 40% faster than typical
            'min_compliance_rate': 0.80,     # 80% specification compliance
            'high_risk_threshold': 70        # Risk score above 70
        }
        
        # Market benchmarks (would be loaded from market data)
        self.market_benchmarks = {
            'avg_price_per_kg': 150,  # PLN per kg
            'avg_delivery_days': 30,
            'quality_standard': 4.0,
            'typical_markup': 0.25
        }
        
        logger.info("PRISM Quote Analyzer initialized")
    
    def analyze_quotes(
        self,
        db: Session,
        order_details: Dict[str, Any],
        quotes_array: List[Dict[str, Any]],
        market_data: Optional[Dict[str, Any]] = None,
        manufacturer_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main quote analysis function
        
        Analyzes multiple quotes and returns comprehensive evaluation
        """
        try:
            logger.info(f"Starting quote analysis for {len(quotes_array)} quotes")
            
            # Update market data if provided
            if market_data:
                self._update_market_benchmarks(market_data)
            
            # Analyze each quote
            quote_analyses = []
            for i, quote_data in enumerate(quotes_array):
                analysis = self._analyze_single_quote(
                    db, order_details, quote_data, manufacturer_data
                )
                quote_analyses.append(analysis)
            
            # Rank quotes by overall score
            quote_analyses.sort(key=lambda x: x.overall_score, reverse=True)
            for i, analysis in enumerate(quote_analyses):
                analysis.ranking = i + 1
            
            # Generate market insights
            market_insights = self._generate_market_insights(
                order_details, quotes_array, quote_analyses
            )
            
            # Generate decision guidance
            decision_guidance = self._generate_decision_guidance(
                quote_analyses, order_details
            )
            
            # Format response
            return self._format_analysis_response(
                quote_analyses, market_insights, decision_guidance
            )
            
        except Exception as e:
            logger.error(f"Quote analysis error: {str(e)}")
            return self._format_error_response(str(e))
    
    def _analyze_single_quote(
        self,
        db: Session,
        order_details: Dict[str, Any],
        quote_data: Dict[str, Any],
        manufacturer_data: Optional[List[Dict[str, Any]]]
    ) -> QuoteAnalysisResult:
        """Analyze a single quote comprehensively"""
        
        # Get manufacturer information
        manufacturer_info = self._get_manufacturer_info(
            db, quote_data.get('manufacturer_id'), manufacturer_data
        )
        
        # Perform analysis components
        cost_analysis = self._analyze_cost_competitiveness(
            order_details, quote_data, manufacturer_info
        )
        
        technical_compliance = self._analyze_technical_compliance(
            order_details, quote_data, manufacturer_info
        )
        
        risk_assessment = self._assess_risks(
            order_details, quote_data, manufacturer_info
        )
        
        value_proposition = self._analyze_value_proposition(
            order_details, quote_data, manufacturer_info
        )
        
        # Calculate overall score
        overall_score = (
            cost_analysis.score * self.weights['cost_analysis'] +
            technical_compliance.score * self.weights['technical_compliance'] +
            (100 - risk_assessment.reliability_score) * self.weights['risk_assessment'] +
            value_proposition.score * self.weights['value_proposition']
        )
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            overall_score, cost_analysis, technical_compliance, 
            risk_assessment, value_proposition
        )
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            overall_score, cost_analysis, technical_compliance,
            risk_assessment, value_proposition, manufacturer_info
        )
        
        # Generate questions
        questions = self._generate_clarification_questions(
            quote_data, technical_compliance, risk_assessment
        )
        
        return QuoteAnalysisResult(
            quote_id=str(quote_data.get('id', 'unknown')),
            manufacturer_name=manufacturer_info.get('name', 'Unknown'),
            overall_score=round(overall_score, 1),
            ranking=0,  # Will be set during ranking
            cost_analysis=cost_analysis,
            technical_compliance=technical_compliance,
            risk_assessment=risk_assessment,
            value_proposition=value_proposition,
            recommendation=recommendation,
            reasoning=reasoning,
            questions_to_ask=questions
        )
    
    def _analyze_cost_competitiveness(
        self,
        order_details: Dict[str, Any],
        quote_data: Dict[str, Any],
        manufacturer_info: Dict[str, Any]
    ) -> CostAnalysis:
        """Analyze cost competitiveness against market rates"""
        
        quote_price = float(quote_data.get('total_price', 0))
        quantity = float(order_details.get('quantity', 1))
        
        # Calculate price per unit
        price_per_unit = quote_price / quantity if quantity > 0 else quote_price
        
        # Estimate market benchmark
        material_weight = order_details.get('estimated_weight', 10)  # kg
        complexity_multiplier = self._get_complexity_multiplier(order_details)
        
        estimated_market_price = (
            material_weight * 
            self.market_benchmarks['avg_price_per_kg'] * 
            complexity_multiplier * 
            quantity
        )
        
        # Calculate variance
        market_variance = (quote_price - estimated_market_price) / estimated_market_price
        
        # Score based on competitiveness
        if market_variance <= -0.20:  # 20% below market
            score = 90
            comparison = f"Excellent value - {abs(market_variance)*100:.1f}% below market rate"
        elif market_variance <= -0.10:  # 10% below market
            score = 80
            comparison = f"Good value - {abs(market_variance)*100:.1f}% below market rate"
        elif market_variance <= 0.10:   # Within 10% of market
            score = 70
            comparison = "Competitive pricing aligned with market rates"
        elif market_variance <= 0.25:   # Up to 25% above market
            score = 50
            comparison = f"Above market rate by {market_variance*100:.1f}%"
        else:  # More than 25% above market
            score = 30
            comparison = f"Significantly above market rate by {market_variance*100:.1f}%"
        
        # Cost breakdown analysis
        breakdown_analysis = self._analyze_cost_breakdown(quote_data, estimated_market_price)
        
        return CostAnalysis(
            score=score,
            market_comparison=comparison,
            cost_breakdown_analysis=breakdown_analysis,
            price_per_unit=price_per_unit,
            market_variance=market_variance
        )
    
    def _analyze_technical_compliance(
        self,
        order_details: Dict[str, Any],
        quote_data: Dict[str, Any],
        manufacturer_info: Dict[str, Any]
    ) -> TechnicalCompliance:
        """Analyze technical specification compliance"""
        
        required_specs = order_details.get('technical_specifications', {})
        quoted_specs = quote_data.get('technical_compliance', {})
        
        compliance_items = []
        gaps = []
        
        # Check material compliance
        if 'materials' in required_specs:
            required_materials = required_specs['materials']
            quoted_materials = quoted_specs.get('materials', [])
            
            if isinstance(required_materials, str):
                required_materials = [required_materials]
            
            material_compliance = 0
            for req_material in required_materials:
                if any(fuzz.ratio(req_material.lower(), qm.lower()) >= 80 
                       for qm in quoted_materials):
                    material_compliance += 1
                else:
                    gaps.append(f"Material specification gap: {req_material}")
            
            if required_materials:
                compliance_items.append(material_compliance / len(required_materials))
        
        # Check process compliance
        if 'manufacturing_process' in required_specs:
            required_process = required_specs['manufacturing_process']
            quoted_process = quoted_specs.get('manufacturing_process', '')
            
            if fuzz.ratio(required_process.lower(), quoted_process.lower()) >= 70:
                compliance_items.append(1.0)
            else:
                compliance_items.append(0.5)
                gaps.append(f"Process mismatch: required {required_process}, quoted {quoted_process}")
        
        # Check tolerance compliance
        if 'tolerances' in required_specs:
            required_tolerance = required_specs['tolerances']
            quoted_tolerance = quoted_specs.get('tolerances', '')
            
            if quoted_tolerance:
                compliance_items.append(1.0)
            else:
                compliance_items.append(0.0)
                gaps.append("Tolerance specifications not addressed")
        
        # Check certification compliance
        if 'certifications' in required_specs:
            required_certs = required_specs['certifications']
            manufacturer_certs = manufacturer_info.get('certifications', [])
            quoted_certs = quoted_specs.get('certifications', [])
            
            all_certs = list(set(manufacturer_certs + quoted_certs))
            cert_compliance = 0
            
            for req_cert in required_certs:
                if any(fuzz.ratio(req_cert.lower(), cert.lower()) >= 80 
                       for cert in all_certs):
                    cert_compliance += 1
                else:
                    gaps.append(f"Missing certification: {req_cert}")
            
            if required_certs:
                compliance_items.append(cert_compliance / len(required_certs))
        
        # Calculate overall compliance
        compliance_rate = sum(compliance_items) / len(compliance_items) if compliance_items else 0.5
        
        # Score based on compliance
        if compliance_rate >= 0.95:
            score = 100
        elif compliance_rate >= 0.85:
            score = 85
        elif compliance_rate >= 0.70:
            score = 70
        elif compliance_rate >= 0.50:
            score = 50
        else:
            score = 30
        
        # Capability match assessment
        capability_match = self._assess_manufacturer_capability(
            order_details, manufacturer_info
        )
        
        return TechnicalCompliance(
            score=score,
            compliance_rate=compliance_rate,
            gaps_identified=gaps,
            capability_match=capability_match
        )
    
    def _assess_risks(
        self,
        order_details: Dict[str, Any],
        quote_data: Dict[str, Any],
        manufacturer_info: Dict[str, Any]
    ) -> RiskAssessment:
        """Comprehensive risk assessment"""
        
        risk_factors = []
        mitigation_suggestions = []
        risk_score = 0
        
        # Delivery risk assessment
        quoted_delivery = quote_data.get('delivery_days', 30)
        required_delivery = order_details.get('required_delivery_days', 45)
        
        if quoted_delivery > required_delivery:
            risk_factors.append("Delivery timeline exceeds requirements")
            risk_score += 20
        elif quoted_delivery < required_delivery * 0.6:
            risk_factors.append("Unrealistic delivery promise - may indicate inexperience")
            risk_score += 15
            mitigation_suggestions.append("Request detailed project timeline and milestones")
        
        # Manufacturer reliability risk
        total_orders = manufacturer_info.get('total_orders_completed', 0)
        overall_rating = manufacturer_info.get('overall_rating', 3.0)
        
        if total_orders < 10:
            risk_factors.append("Limited manufacturing experience")
            risk_score += 25
            mitigation_suggestions.append("Request references from similar projects")
        
        if overall_rating < 3.5:
            risk_factors.append("Below-average customer ratings")
            risk_score += 20
            mitigation_suggestions.append("Implement additional quality checkpoints")
        
        # Price risk assessment
        market_variance = quote_data.get('market_variance', 0)
        if market_variance < -0.30:  # More than 30% below market
            risk_factors.append("Price significantly below market - quality concerns")
            risk_score += 30
            mitigation_suggestions.append("Request detailed quality assurance plan")
        
        # Technical capability risk
        capability_score = manufacturer_info.get('capability_match', 70)
        if capability_score < 60:
            risk_factors.append("Limited technical capability match")
            risk_score += 20
            mitigation_suggestions.append("Conduct technical capability assessment")
        
        # Communication risk
        response_time = manufacturer_info.get('avg_response_time_hours', 24)
        if response_time > 48:
            risk_factors.append("Slow communication response times")
            risk_score += 10
            mitigation_suggestions.append("Establish clear communication protocols")
        
        # Financial stability risk
        if not manufacturer_info.get('verified', False):
            risk_factors.append("Manufacturer not fully verified")
            risk_score += 15
            mitigation_suggestions.append("Complete manufacturer verification process")
        
        # Determine overall risk level
        if risk_score <= 20:
            overall_risk = "LOW"
        elif risk_score <= 40:
            overall_risk = "MEDIUM"
        else:
            overall_risk = "HIGH"
        
        return RiskAssessment(
            overall_risk=overall_risk,
            risk_factors=risk_factors,
            mitigation_suggestions=mitigation_suggestions,
            reliability_score=risk_score
        )
    
    def _analyze_value_proposition(
        self,
        order_details: Dict[str, Any],
        quote_data: Dict[str, Any],
        manufacturer_info: Dict[str, Any]
    ) -> ValueProposition:
        """Analyze overall value proposition"""
        
        value_factors = []
        advantages = []
        differentiators = []
        
        # Quality-to-price ratio
        quality_rating = manufacturer_info.get('quality_rating', 3.0)
        price_competitiveness = quote_data.get('cost_score', 70)
        
        quality_price_ratio = (quality_rating / 5.0) * 100 / (price_competitiveness / 100)
        value_factors.append(min(quality_price_ratio, 100))
        
        if quality_rating >= 4.5:
            advantages.append("Exceptional quality ratings")
        if price_competitiveness >= 80:
            advantages.append("Competitive pricing")
        
        # Additional services value
        additional_services = quote_data.get('additional_services', [])
        service_value = len(additional_services) * 5  # 5 points per service
        value_factors.append(min(service_value, 30))
        
        for service in additional_services:
            advantages.append(f"Includes {service}")
        
        # Innovation and technology
        technology_score = manufacturer_info.get('technology_score', 50)
        value_factors.append(technology_score)
        
        if technology_score >= 80:
            differentiators.append("Advanced manufacturing technology")
        
        # Partnership potential
        partnership_indicators = 0
        
        if manufacturer_info.get('rush_order_available', False):
            partnership_indicators += 20
            differentiators.append("Rush order capabilities")
        
        if manufacturer_info.get('design_support', False):
            partnership_indicators += 15
            differentiators.append("Design and engineering support")
        
        if manufacturer_info.get('years_in_business', 0) >= 10:
            partnership_indicators += 10
            advantages.append("Established industry presence")
        
        value_factors.append(partnership_indicators)
        
        # Calculate overall value score
        overall_value = sum(value_factors) / len(value_factors) if value_factors else 50
        
        # Long-term value assessment
        long_term_factors = [
            manufacturer_info.get('overall_rating', 3.0) * 20,
            min(manufacturer_info.get('total_orders_completed', 0) * 2, 100),
            technology_score,
            partnership_indicators
        ]
        
        long_term_value = sum(long_term_factors) / len(long_term_factors)
        
        return ValueProposition(
            score=min(overall_value, 100),
            key_advantages=advantages,
            differentiators=differentiators,
            long_term_value=long_term_value
        )
    
    def _generate_recommendation(
        self,
        overall_score: float,
        cost_analysis: CostAnalysis,
        technical_compliance: TechnicalCompliance,
        risk_assessment: RiskAssessment,
        value_proposition: ValueProposition
    ) -> str:
        """Generate recommendation category"""
        
        # Check quality gates
        if overall_score >= 85 and risk_assessment.overall_risk == "LOW":
            return "HIGHLY_RECOMMENDED"
        elif overall_score >= 70 and technical_compliance.compliance_rate >= 0.80:
            return "RECOMMENDED"
        elif overall_score >= 60 and risk_assessment.overall_risk != "HIGH":
            return "CONDITIONAL"
        else:
            return "NOT_RECOMMENDED"
    
    def _generate_reasoning(
        self,
        overall_score: float,
        cost_analysis: CostAnalysis,
        technical_compliance: TechnicalCompliance,
        risk_assessment: RiskAssessment,
        value_proposition: ValueProposition,
        manufacturer_info: Dict[str, Any]
    ) -> str:
        """Generate detailed reasoning for recommendation"""
        
        company_name = manufacturer_info.get('name', 'This manufacturer')
        
        reasoning_parts = []
        
        # Overall score assessment
        if overall_score >= 80:
            reasoning_parts.append(f"{company_name} demonstrates excellent overall compatibility with a score of {overall_score:.1f}/100.")
        elif overall_score >= 70:
            reasoning_parts.append(f"{company_name} shows strong compatibility with a score of {overall_score:.1f}/100.")
        elif overall_score >= 60:
            reasoning_parts.append(f"{company_name} presents a moderate option with a score of {overall_score:.1f}/100.")
        else:
            reasoning_parts.append(f"{company_name} has limited compatibility with a score of {overall_score:.1f}/100.")
        
        # Key strengths
        if cost_analysis.score >= 80:
            reasoning_parts.append("Pricing is highly competitive.")
        if technical_compliance.compliance_rate >= 0.90:
            reasoning_parts.append("Technical specifications are well-matched.")
        if risk_assessment.overall_risk == "LOW":
            reasoning_parts.append("Risk profile is favorable.")
        if value_proposition.score >= 80:
            reasoning_parts.append("Value proposition is strong.")
        
        # Key concerns
        if risk_assessment.overall_risk == "HIGH":
            reasoning_parts.append("However, there are significant risk factors to consider.")
        if technical_compliance.compliance_rate < 0.70:
            reasoning_parts.append("Technical compliance has notable gaps.")
        if cost_analysis.market_variance > 0.25:
            reasoning_parts.append("Pricing is above market expectations.")
        
        return " ".join(reasoning_parts)
    
    def _generate_clarification_questions(
        self,
        quote_data: Dict[str, Any],
        technical_compliance: TechnicalCompliance,
        risk_assessment: RiskAssessment
    ) -> List[str]:
        """Generate clarification questions based on analysis"""
        
        questions = []
        
        # Technical gaps
        for gap in technical_compliance.gaps_identified:
            if "Material" in gap:
                questions.append("Can you confirm material specifications and provide material certificates?")
            elif "Process" in gap:
                questions.append("Please clarify the manufacturing process details and capabilities.")
            elif "certification" in gap.lower():
                questions.append("What quality certifications do you hold for this type of work?")
            elif "Tolerance" in gap:
                questions.append("How will you ensure the required dimensional tolerances?")
        
        # Risk-based questions
        for risk in risk_assessment.risk_factors:
            if "delivery" in risk.lower():
                questions.append("Can you provide a detailed project timeline with milestones?")
            elif "experience" in risk.lower():
                questions.append("Can you provide references from similar projects?")
            elif "quality" in risk.lower():
                questions.append("What quality control measures will be implemented?")
            elif "communication" in risk.lower():
                questions.append("What communication protocols will be established for this project?")
        
        # General clarification questions
        if not quote_data.get('warranty_terms'):
            questions.append("What warranty terms are included with this quote?")
        
        if not quote_data.get('payment_terms'):
            questions.append("What are the proposed payment terms and schedule?")
        
        return questions[:5]  # Limit to top 5 questions
    
    def _get_manufacturer_info(
        self,
        db: Session,
        manufacturer_id: str,
        manufacturer_data: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Get manufacturer information from various sources"""
        
        # Try to get from provided data first
        if manufacturer_data:
            for mfg_data in manufacturer_data:
                if str(mfg_data.get('id')) == str(manufacturer_id):
                    return mfg_data
        
        # Try to get from database
        try:
            if manufacturer_id and manufacturer_id.isdigit():
                manufacturer = db.query(Manufacturer).filter(
                    Manufacturer.id == int(manufacturer_id)
                ).first()
                
                if manufacturer:
                    return {
                        'id': manufacturer.id,
                        'name': manufacturer.business_name,
                        'overall_rating': manufacturer.overall_rating,
                        'quality_rating': manufacturer.quality_rating,
                        'total_orders_completed': manufacturer.total_orders_completed,
                        'verified': manufacturer.is_verified,
                        'certifications': manufacturer.capabilities.get('certifications', []) if manufacturer.capabilities else [],
                        'rush_order_available': manufacturer.rush_order_available,
                        'avg_response_time_hours': manufacturer.avg_response_time_hours,
                        'years_in_business': manufacturer.years_in_business,
                    }
        except Exception as e:
            logger.warning(f"Could not fetch manufacturer data: {str(e)}")
        
        # Return default info
        return {
            'id': manufacturer_id,
            'name': 'Unknown Manufacturer',
            'overall_rating': 3.0,
            'quality_rating': 3.0,
            'total_orders_completed': 0,
            'verified': False,
            'certifications': [],
            'rush_order_available': False,
            'avg_response_time_hours': 24,
            'years_in_business': 0,
        }
    
    def _get_complexity_multiplier(self, order_details: Dict[str, Any]) -> float:
        """Calculate complexity multiplier for cost estimation"""
        
        complexity = order_details.get('complexity', 'medium').lower()
        
        multipliers = {
            'low': 1.0,
            'medium': 1.3,
            'high': 1.8,
            'very_high': 2.5
        }
        
        return multipliers.get(complexity, 1.3)
    
    def _analyze_cost_breakdown(
        self,
        quote_data: Dict[str, Any],
        estimated_market_price: float
    ) -> str:
        """Analyze cost breakdown if available"""
        
        cost_breakdown = quote_data.get('cost_breakdown', {})
        
        if not cost_breakdown:
            return "Detailed cost breakdown not provided in quote."
        
        analysis_parts = []
        
        # Analyze major cost components
        if 'materials' in cost_breakdown:
            material_cost = cost_breakdown['materials']
            material_percentage = (material_cost / quote_data.get('total_price', 1)) * 100
            analysis_parts.append(f"Materials: {material_percentage:.1f}% of total cost")
        
        if 'labor' in cost_breakdown:
            labor_cost = cost_breakdown['labor']
            labor_percentage = (labor_cost / quote_data.get('total_price', 1)) * 100
            analysis_parts.append(f"Labor: {labor_percentage:.1f}% of total cost")
        
        if 'overhead' in cost_breakdown:
            overhead_cost = cost_breakdown['overhead']
            overhead_percentage = (overhead_cost / quote_data.get('total_price', 1)) * 100
            analysis_parts.append(f"Overhead: {overhead_percentage:.1f}% of total cost")
        
        return ". ".join(analysis_parts) if analysis_parts else "Cost breakdown provided but not detailed."
    
    def _assess_manufacturer_capability(
        self,
        order_details: Dict[str, Any],
        manufacturer_info: Dict[str, Any]
    ) -> float:
        """Assess manufacturer capability match"""
        
        # This would integrate with the PRISM matching engine
        # For now, provide a simplified assessment
        
        capability_factors = []
        
        # Experience factor
        orders_completed = manufacturer_info.get('total_orders_completed', 0)
        if orders_completed >= 100:
            capability_factors.append(90)
        elif orders_completed >= 50:
            capability_factors.append(80)
        elif orders_completed >= 20:
            capability_factors.append(70)
        else:
            capability_factors.append(50)
        
        # Rating factor
        overall_rating = manufacturer_info.get('overall_rating', 3.0)
        capability_factors.append((overall_rating / 5.0) * 100)
        
        # Certification factor
        certifications = manufacturer_info.get('certifications', [])
        cert_score = min(len(certifications) * 20, 100)
        capability_factors.append(cert_score)
        
        return sum(capability_factors) / len(capability_factors)
    
    def _update_market_benchmarks(self, market_data: Dict[str, Any]):
        """Update market benchmarks with provided data"""
        
        if 'avg_price_per_kg' in market_data:
            self.market_benchmarks['avg_price_per_kg'] = market_data['avg_price_per_kg']
        
        if 'avg_delivery_days' in market_data:
            self.market_benchmarks['avg_delivery_days'] = market_data['avg_delivery_days']
        
        if 'quality_standard' in market_data:
            self.market_benchmarks['quality_standard'] = market_data['quality_standard']
    
    def _generate_market_insights(
        self,
        order_details: Dict[str, Any],
        quotes_array: List[Dict[str, Any]],
        analyses: List[QuoteAnalysisResult]
    ) -> MarketInsights:
        """Generate market intelligence insights"""
        
        if not quotes_array:
            return MarketInsights(
                price_range_analysis="No quotes to analyze",
                quality_trends="Insufficient data",
                delivery_time_analysis="No delivery data available",
                market_conditions="Unable to assess market conditions"
            )
        
        # Price analysis
        prices = [float(q.get('total_price', 0)) for q in quotes_array if q.get('total_price')]
        if prices:
            min_price = min(prices)
            max_price = max(prices)
            avg_price = sum(prices) / len(prices)
            price_analysis = f"Price range: {min_price:,.0f} - {max_price:,.0f} PLN (avg: {avg_price:,.0f} PLN). "
            
            price_variance = (max_price - min_price) / avg_price
            if price_variance > 0.5:
                price_analysis += "High price variance indicates diverse market positioning."
            else:
                price_analysis += "Moderate price variance suggests competitive market."
        else:
            price_analysis = "Price analysis not available."
        
        # Quality trends
        quality_scores = [a.technical_compliance.score for a in analyses]
        if quality_scores:
            avg_quality = sum(quality_scores) / len(quality_scores)
            if avg_quality >= 80:
                quality_trends = "High overall technical compliance across quotes."
            elif avg_quality >= 60:
                quality_trends = "Moderate technical compliance with some gaps."
            else:
                quality_trends = "Technical compliance challenges noted across quotes."
        else:
            quality_trends = "Quality trend analysis not available."
        
        # Delivery analysis
        delivery_times = [q.get('delivery_days', 0) for q in quotes_array if q.get('delivery_days')]
        if delivery_times:
            avg_delivery = sum(delivery_times) / len(delivery_times)
            min_delivery = min(delivery_times)
            max_delivery = max(delivery_times)
            
            delivery_analysis = f"Delivery range: {min_delivery}-{max_delivery} days (avg: {avg_delivery:.0f} days). "
            
            required_delivery = order_details.get('required_delivery_days', 45)
            feasible_count = len([d for d in delivery_times if d <= required_delivery])
            
            if feasible_count == len(delivery_times):
                delivery_analysis += "All quotes meet delivery requirements."
            elif feasible_count > 0:
                delivery_analysis += f"{feasible_count}/{len(delivery_times)} quotes meet delivery requirements."
            else:
                delivery_analysis += "No quotes meet required delivery timeline."
        else:
            delivery_analysis = "Delivery time analysis not available."
        
        # Market conditions
        high_scores = len([a for a in analyses if a.overall_score >= 80])
        total_quotes = len(analyses)
        
        if high_scores / total_quotes >= 0.5:
            market_conditions = "Strong competitive market with high-quality options available."
        elif high_scores / total_quotes >= 0.25:
            market_conditions = "Moderate market conditions with some quality options."
        else:
            market_conditions = "Challenging market conditions - consider expanding search criteria."
        
        return MarketInsights(
            price_range_analysis=price_analysis,
            quality_trends=quality_trends,
            delivery_time_analysis=delivery_analysis,
            market_conditions=market_conditions
        )
    
    def _generate_decision_guidance(
        self,
        analyses: List[QuoteAnalysisResult],
        order_details: Dict[str, Any]
    ) -> DecisionGuidance:
        """Generate decision guidance and recommendations"""
        
        if not analyses:
            return DecisionGuidance(
                top_recommendation="No quotes available for analysis",
                alternative_options=[],
                negotiation_points=[],
                red_flags=["No quotes submitted"]
            )
        
        # Top recommendation
        top_quote = analyses[0]
        top_recommendation = f"Recommend {top_quote.manufacturer_name} (Score: {top_quote.overall_score}/100) - {top_quote.reasoning}"
        
        # Alternative options
        alternatives = []
        for analysis in analyses[1:3]:  # Next 2 best options
            alternatives.append(
                f"{analysis.manufacturer_name} (Score: {analysis.overall_score}/100) - "
                f"{analysis.recommendation}"
            )
        
        # Negotiation points
        negotiation_points = []
        
        # Price negotiation opportunities
        high_price_quotes = [a for a in analyses if a.cost_analysis.market_variance > 0.15]
        if high_price_quotes:
            negotiation_points.append("Price reduction opportunities with above-market quotes")
        
        # Delivery negotiation
        slow_delivery_quotes = [a for a in analyses if 'delivery' in ' '.join(a.risk_assessment.risk_factors)]
        if slow_delivery_quotes:
            negotiation_points.append("Delivery timeline acceleration")
        
        # Technical improvements
        compliance_gaps = [a for a in analyses if a.technical_compliance.gaps_identified]
        if compliance_gaps:
            negotiation_points.append("Technical specification clarifications and improvements")
        
        # Additional services
        negotiation_points.append("Value-added services (inspection, packaging, logistics)")
        negotiation_points.append("Payment terms and milestone structure")
        
        # Red flags
        red_flags = []
        
        for analysis in analyses:
            if analysis.risk_assessment.overall_risk == "HIGH":
                red_flags.append(f"{analysis.manufacturer_name}: High risk profile")
            
            if analysis.cost_analysis.market_variance < -0.30:
                red_flags.append(f"{analysis.manufacturer_name}: Price significantly below market")
            
            if analysis.technical_compliance.compliance_rate < 0.70:
                red_flags.append(f"{analysis.manufacturer_name}: Poor technical compliance")
            
            if "Unrealistic delivery" in ' '.join(analysis.risk_assessment.risk_factors):
                red_flags.append(f"{analysis.manufacturer_name}: Unrealistic delivery promises")
        
        return DecisionGuidance(
            top_recommendation=top_recommendation,
            alternative_options=alternatives,
            negotiation_points=negotiation_points[:5],  # Limit to top 5
            red_flags=red_flags
        )
    
    def _format_analysis_response(
        self,
        analyses: List[QuoteAnalysisResult],
        market_insights: MarketInsights,
        decision_guidance: DecisionGuidance
    ) -> Dict[str, Any]:
        """Format the final analysis response"""
        
        formatted_analyses = []
        
        for analysis in analyses:
            formatted_analysis = {
                "quote_id": analysis.quote_id,
                "manufacturer_name": analysis.manufacturer_name,
                "overall_score": analysis.overall_score,
                "ranking": analysis.ranking,
                "analysis": {
                    "cost_competitiveness": {
                        "score": analysis.cost_analysis.score,
                        "market_comparison": analysis.cost_analysis.market_comparison,
                        "cost_breakdown_analysis": analysis.cost_analysis.cost_breakdown_analysis
                    },
                    "technical_compliance": {
                        "score": analysis.technical_compliance.score,
                        "compliance_rate": analysis.technical_compliance.compliance_rate,
                        "gaps_identified": analysis.technical_compliance.gaps_identified
                    },
                    "risk_assessment": {
                        "overall_risk": analysis.risk_assessment.overall_risk,
                        "risk_factors": analysis.risk_assessment.risk_factors,
                        "mitigation_suggestions": analysis.risk_assessment.mitigation_suggestions
                    },
                    "value_proposition": {
                        "score": analysis.value_proposition.score,
                        "key_advantages": analysis.value_proposition.key_advantages,
                        "differentiators": analysis.value_proposition.differentiators
                    }
                },
                "recommendation": analysis.recommendation,
                "reasoning": analysis.reasoning,
                "questions_to_ask": analysis.questions_to_ask
            }
            formatted_analyses.append(formatted_analysis)
        
        return {
            "quote_analysis": formatted_analyses,
            "market_insights": {
                "price_range_analysis": market_insights.price_range_analysis,
                "quality_trends": market_insights.quality_trends,
                "delivery_time_analysis": market_insights.delivery_time_analysis,
                "market_conditions": market_insights.market_conditions
            },
            "decision_guidance": {
                "top_recommendation": decision_guidance.top_recommendation,
                "alternative_options": decision_guidance.alternative_options,
                "negotiation_points": decision_guidance.negotiation_points,
                "red_flags": decision_guidance.red_flags
            },
            "analysis_metadata": {
                "algorithm_version": "PRISM_Quote_Analyzer_v1.0",
                "generated_at": datetime.now().isoformat(),
                "quotes_analyzed": len(analyses),
                "processing_status": "success"
            }
        }
    
    def _format_error_response(self, error_message: str) -> Dict[str, Any]:
        """Format error response"""
        
        return {
            "quote_analysis": [],
            "market_insights": {
                "price_range_analysis": f"Analysis failed: {error_message}",
                "quality_trends": "Unable to analyze",
                "delivery_time_analysis": "Unable to analyze",
                "market_conditions": "Unable to assess"
            },
            "decision_guidance": {
                "top_recommendation": "Analysis failed - unable to provide recommendation",
                "alternative_options": [],
                "negotiation_points": [],
                "red_flags": [f"Analysis error: {error_message}"]
            },
            "analysis_metadata": {
                "algorithm_version": "PRISM_Quote_Analyzer_v1.0",
                "generated_at": datetime.now().isoformat(),
                "quotes_analyzed": 0,
                "processing_status": "error",
                "error": error_message
            }
        }


# Global instance
prism_quote_analyzer = PrismQuoteAnalyzer() 