from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import statistics
import numpy as np
from loguru import logger

from app.models.quote import Quote
from app.models.order import Order
from app.models.producer import Manufacturer
from app.schemas.quote import (
    QuoteAnalytics, QuoteComparison, DecisionMatrix, QuoteComparisonReport,
    QuoteFilterCriteria, QuoteBenchmark
)


class QuoteComparisonService:
    """Enhanced quote comparison service with advanced analytics"""
    
    def __init__(self):
        self.default_criteria_weights = {
            "price": 0.30,
            "delivery": 0.20,
            "quality": 0.25,
            "reliability": 0.15,
            "compliance": 0.10
        }
    
    def calculate_quote_analytics(
        self,
        quote: Quote,
        all_quotes: List[Quote],
        criteria_weights: Optional[Dict[str, float]] = None
    ) -> QuoteAnalytics:
        """Calculate comprehensive analytics for a quote"""
        
        weights = criteria_weights or self.default_criteria_weights
        
        # Calculate individual scores
        price_score = self._calculate_price_score(quote, all_quotes)
        delivery_score = self._calculate_delivery_score(quote, all_quotes)
        quality_score = self._calculate_quality_score(quote)
        reliability_score = self._calculate_reliability_score(quote)
        compliance_score = self._calculate_compliance_score(quote)
        
        # Calculate weighted total score
        total_score = (
            price_score * weights.get("price", 0.3) +
            delivery_score * weights.get("delivery", 0.2) +
            quality_score * weights.get("quality", 0.25) +
            reliability_score * weights.get("reliability", 0.15) +
            compliance_score * weights.get("compliance", 0.1)
        )
        
        # Calculate TCO
        tco = self._calculate_total_cost_of_ownership(quote)
        
        # Risk assessment
        risk_assessment = self._assess_quote_risk(quote)
        
        # Market position
        market_position = self._determine_market_position(quote, all_quotes)
        
        # Savings vs average
        avg_price = statistics.mean([q.price_total for q in all_quotes])
        savings_vs_average = avg_price - quote.price_total
        
        # Delivery competitiveness
        avg_delivery = statistics.mean([q.delivery_time for q in all_quotes])
        delivery_competitiveness = (avg_delivery - quote.delivery_time) / avg_delivery * 100
        
        # Rank among all quotes
        sorted_quotes = sorted(all_quotes, key=lambda q: self._calculate_simple_score(q), reverse=True)
        rank = next(i for i, q in enumerate(sorted_quotes, 1) if q.id == quote.id)
        
        return QuoteAnalytics(
            quote_id=str(quote.id),
            score=round(total_score, 2),
            rank=rank,
            total_cost_of_ownership=tco,
            risk_assessment=risk_assessment,
            market_position=market_position,
            savings_vs_average=savings_vs_average,
            delivery_competitiveness=round(delivery_competitiveness, 2),
            quality_score=round(quality_score, 2),
            compliance_score=round(compliance_score, 2),
            sustainability_score=self._calculate_sustainability_score(quote)
        )
    
    def generate_comparison_report(
        self,
        db: Session,
        order_id: int,
        criteria_weights: Optional[Dict[str, float]] = None,
        filters: Optional[QuoteFilterCriteria] = None
    ) -> QuoteComparisonReport:
        """Generate comprehensive quote comparison report"""
        
        # Fetch quotes
        quotes = db.query(Quote).filter(Quote.order_id == order_id).all()
        
        if not quotes:
            raise ValueError("No quotes found for this order")
        
        # Apply filters if provided
        if filters:
            quotes = self._apply_filters(quotes, filters)
        
        # Generate analytics for each quote
        quote_comparisons = []
        for quote in quotes:
            analytics = self.calculate_quote_analytics(quote, quotes, criteria_weights)
            
            comparison = QuoteComparison(
                quote_id=str(quote.id),
                manufacturer_name=quote.manufacturer.business_name if quote.manufacturer else "Unknown",
                price=float(quote.price_total),
                delivery_days=quote.delivery_time,
                score=analytics.score,
                analytics=analytics,
                strengths=self._identify_strengths(quote, quotes),
                weaknesses=self._identify_weaknesses(quote, quotes),
                risk_factors=self._identify_risk_factors(quote)
            )
            quote_comparisons.append(comparison)
        
        # Sort by score
        quote_comparisons.sort(key=lambda x: x.score, reverse=True)
        
        # Create decision matrix
        decision_matrix = DecisionMatrix(
            criteria=criteria_weights or self.default_criteria_weights,
            quotes=quote_comparisons,
            recommendation=quote_comparisons[0] if quote_comparisons else None,
            alternatives=quote_comparisons[1:3] if len(quote_comparisons) > 1 else [],
            decision_rationale=self._generate_decision_rationale(quote_comparisons)
        )
        
        # Generate analyses
        market_analysis = self._generate_market_analysis(quotes)
        cost_breakdown = self._generate_cost_breakdown(quotes)
        timeline_analysis = self._generate_timeline_analysis(quotes)
        risk_analysis = self._generate_risk_analysis(quotes)
        recommendations = self._generate_recommendations(quote_comparisons)
        
        return QuoteComparisonReport(
            order_id=order_id,
            generated_at=datetime.now(),
            total_quotes=len(quotes),
            decision_matrix=decision_matrix,
            market_analysis=market_analysis,
            cost_breakdown=cost_breakdown,
            timeline_analysis=timeline_analysis,
            risk_analysis=risk_analysis,
            recommendations=recommendations
        )
    
    def get_quote_benchmark(
        self,
        db: Session,
        quote: Quote,
        industry_category: Optional[str] = None
    ) -> QuoteBenchmark:
        """Get benchmarking data for a quote"""
        
        # Get industry averages (simplified - in production, use historical data)
        industry_avg_price = self._get_industry_average_price(db, industry_category)
        industry_avg_delivery = self._get_industry_average_delivery(db, industry_category)
        
        # Calculate percentile
        similar_quotes = self._get_similar_quotes(db, quote, industry_category)
        percentile = self._calculate_percentile(quote, similar_quotes)
        
        return QuoteBenchmark(
            industry_average_price=industry_avg_price,
            industry_average_delivery=industry_avg_delivery,
            market_percentile=percentile,
            competitive_advantage=self._identify_competitive_advantages(quote),
            improvement_suggestions=self._suggest_improvements(quote)
        )
    
    # Private helper methods
    
    def _calculate_price_score(self, quote: Quote, all_quotes: List[Quote]) -> float:
        """Calculate price competitiveness score (0-100)"""
        prices = [q.price_total for q in all_quotes]
        min_price = min(prices)
        max_price = max(prices)
        
        if max_price == min_price:
            return 100.0
        
        # Invert score so lower price = higher score
        normalized = (max_price - quote.price_total) / (max_price - min_price)
        return normalized * 100
    
    def _calculate_delivery_score(self, quote: Quote, all_quotes: List[Quote]) -> float:
        """Calculate delivery time competitiveness score (0-100)"""
        delivery_times = [q.delivery_time for q in all_quotes]
        min_delivery = min(delivery_times)
        max_delivery = max(delivery_times)
        
        if max_delivery == min_delivery:
            return 100.0
        
        # Invert score so shorter delivery = higher score
        normalized = (max_delivery - quote.delivery_time) / (max_delivery - min_delivery)
        return normalized * 100
    
    def _calculate_quality_score(self, quote: Quote) -> float:
        """Calculate quality score based on manufacturer rating"""
        if not quote.manufacturer or not quote.manufacturer.overall_rating:
            return 60.0  # Default score
        
        # Convert 5-star rating to 100-point scale
        return (quote.manufacturer.overall_rating / 5.0) * 100
    
    def _calculate_reliability_score(self, quote: Quote) -> float:
        """Calculate reliability score based on manufacturer history"""
        if not quote.manufacturer:
            return 60.0
        
        # Factors: completion rate, on-time delivery, review count
        completion_rate = getattr(quote.manufacturer, 'completion_rate', 0.85) * 100
        on_time_rate = getattr(quote.manufacturer, 'on_time_delivery_rate', 0.80) * 100
        review_count = getattr(quote.manufacturer, 'total_reviews', 0)
        
        # Review count factor (more reviews = more reliable)
        review_factor = min(review_count / 50, 1.0) * 20  # Max 20 points
        
        return (completion_rate * 0.4 + on_time_rate * 0.4 + review_factor * 0.2)
    
    def _calculate_compliance_score(self, quote: Quote) -> float:
        """Calculate compliance score based on certifications"""
        if not quote.manufacturer:
            return 50.0
        
        # Count relevant certifications
        certifications = getattr(quote.manufacturer, 'certifications', [])
        cert_count = len(certifications) if certifications else 0
        
        # Base score + certification bonus
        base_score = 60.0
        cert_bonus = min(cert_count * 10, 40)  # Max 40 points for certifications
        
        return base_score + cert_bonus
    
    def _calculate_sustainability_score(self, quote: Quote) -> Optional[float]:
        """Calculate sustainability score"""
        if not quote.manufacturer:
            return None
        
        # Check for sustainability certifications
        sustainability_certs = ['ISO 14001', 'LEED', 'Carbon Neutral']
        manufacturer_certs = getattr(quote.manufacturer, 'certifications', [])
        
        if not manufacturer_certs:
            return 50.0
        
        cert_names = [cert.get('name', '') if isinstance(cert, dict) else str(cert) for cert in manufacturer_certs]
        sustainability_count = sum(1 for cert in cert_names if any(s_cert in cert for s_cert in sustainability_certs))
        
        return min(50 + sustainability_count * 25, 100)
    
    def _calculate_total_cost_of_ownership(self, quote: Quote) -> float:
        """Calculate TCO including hidden costs"""
        base_cost = float(quote.price_total)
        
        # Add estimated additional costs
        shipping_cost = base_cost * 0.05  # 5% shipping estimate
        handling_cost = base_cost * 0.02  # 2% handling
        risk_premium = base_cost * 0.01   # 1% risk premium
        
        # Quality-based adjustments
        if quote.manufacturer and quote.manufacturer.overall_rating:
            quality_factor = quote.manufacturer.overall_rating / 5.0
            quality_adjustment = base_cost * (1 - quality_factor) * 0.1
        else:
            quality_adjustment = base_cost * 0.05
        
        return base_cost + shipping_cost + handling_cost + risk_premium + quality_adjustment
    
    def _assess_quote_risk(self, quote: Quote) -> Dict[str, Any]:
        """Assess various risk factors for a quote"""
        risks = {
            "overall_level": "medium",
            "factors": [],
            "score": 50  # 0-100, lower is better
        }
        
        risk_score = 50
        
        # Manufacturer reliability risk
        if not quote.manufacturer:
            risks["factors"].append("Unknown manufacturer")
            risk_score += 20
        elif quote.manufacturer.overall_rating and quote.manufacturer.overall_rating < 3.0:
            risks["factors"].append("Low manufacturer rating")
            risk_score += 15
        
        # Delivery risk
        if quote.delivery_time > 30:
            risks["factors"].append("Long delivery time")
            risk_score += 10
        
        # Price risk
        # This would need comparison with market rates
        
        # Determine overall level
        if risk_score <= 30:
            risks["overall_level"] = "low"
        elif risk_score <= 70:
            risks["overall_level"] = "medium"
        else:
            risks["overall_level"] = "high"
        
        risks["score"] = min(risk_score, 100)
        return risks
    
    def _determine_market_position(self, quote: Quote, all_quotes: List[Quote]) -> str:
        """Determine quote's market position"""
        prices = [q.price_total for q in all_quotes]
        quote_price = quote.price_total
        
        min_price = min(prices)
        max_price = max(prices)
        avg_price = statistics.mean(prices)
        
        if quote_price == min_price:
            return "lowest"
        elif quote_price <= avg_price * 0.9:
            return "competitive"
        elif quote_price <= avg_price * 1.1:
            return "market_rate"
        else:
            return "premium"
    
    def _calculate_simple_score(self, quote: Quote) -> float:
        """Simple scoring for ranking"""
        price_factor = 1000 / max(float(quote.price_total), 1)
        delivery_factor = 30 / max(quote.delivery_time, 1)
        quality_factor = quote.manufacturer.overall_rating if quote.manufacturer and quote.manufacturer.overall_rating else 3.0
        
        return price_factor + delivery_factor + quality_factor
    
    def _apply_filters(self, quotes: List[Quote], filters: QuoteFilterCriteria) -> List[Quote]:
        """Apply filtering criteria to quotes"""
        filtered = quotes
        
        if filters.max_price:
            filtered = [q for q in filtered if q.price_total <= filters.max_price]
        
        if filters.max_delivery_days:
            filtered = [q for q in filtered if q.delivery_time <= filters.max_delivery_days]
        
        if filters.min_rating and filtered:
            filtered = [q for q in filtered if q.manufacturer and q.manufacturer.overall_rating and q.manufacturer.overall_rating >= filters.min_rating]
        
        return filtered
    
    def _identify_strengths(self, quote: Quote, all_quotes: List[Quote]) -> List[str]:
        """Identify quote strengths"""
        strengths = []
        
        prices = [q.price_total for q in all_quotes]
        deliveries = [q.delivery_time for q in all_quotes]
        
        if quote.price_total == min(prices):
            strengths.append("Lowest price")
        elif quote.price_total <= statistics.mean(prices) * 0.9:
            strengths.append("Competitive pricing")
        
        if quote.delivery_time == min(deliveries):
            strengths.append("Fastest delivery")
        elif quote.delivery_time <= statistics.mean(deliveries) * 0.9:
            strengths.append("Quick delivery")
        
        if quote.manufacturer and quote.manufacturer.overall_rating and quote.manufacturer.overall_rating >= 4.5:
            strengths.append("Highly rated manufacturer")
        
        return strengths
    
    def _identify_weaknesses(self, quote: Quote, all_quotes: List[Quote]) -> List[str]:
        """Identify quote weaknesses"""
        weaknesses = []
        
        prices = [q.price_total for q in all_quotes]
        deliveries = [q.delivery_time for q in all_quotes]
        
        if quote.price_total == max(prices):
            weaknesses.append("Highest price")
        elif quote.price_total >= statistics.mean(prices) * 1.2:
            weaknesses.append("Above market price")
        
        if quote.delivery_time == max(deliveries):
            weaknesses.append("Longest delivery time")
        elif quote.delivery_time >= statistics.mean(deliveries) * 1.2:
            weaknesses.append("Slow delivery")
        
        if not quote.manufacturer:
            weaknesses.append("Unknown manufacturer")
        elif quote.manufacturer.overall_rating and quote.manufacturer.overall_rating < 3.0:
            weaknesses.append("Low manufacturer rating")
        
        return weaknesses
    
    def _identify_risk_factors(self, quote: Quote) -> List[str]:
        """Identify specific risk factors"""
        risks = []
        
        if not quote.manufacturer:
            risks.append("Unverified manufacturer")
        
        if quote.delivery_time > 45:
            risks.append("Extended delivery timeline")
        
        if quote.manufacturer and quote.manufacturer.overall_rating and quote.manufacturer.overall_rating < 3.5:
            risks.append("Below average manufacturer rating")
        
        return risks
    
    def _generate_decision_rationale(self, quote_comparisons: List[QuoteComparison]) -> str:
        """Generate AI-powered decision rationale"""
        if not quote_comparisons:
            return "No quotes available for comparison"
        
        best_quote = quote_comparisons[0]
        
        rationale_parts = [
            f"Recommended quote from {best_quote.manufacturer_name} with score {best_quote.score}/100."
        ]
        
        if best_quote.strengths:
            rationale_parts.append(f"Key strengths: {', '.join(best_quote.strengths[:3])}.")
        
        if len(quote_comparisons) > 1:
            price_diff = best_quote.price - quote_comparisons[1].price
            if price_diff > 0:
                rationale_parts.append(f"While ${price_diff:.2f} higher than the second option, the quality and reliability benefits justify the premium.")
            else:
                rationale_parts.append("Offers the best value proposition among all options.")
        
        return " ".join(rationale_parts)
    
    def _generate_market_analysis(self, quotes: List[Quote]) -> Dict[str, Any]:
        """Generate market analysis"""
        prices = [float(q.price_total) for q in quotes]
        deliveries = [q.delivery_time for q in quotes]
        
        return {
            "total_quotes": len(quotes),
            "price_range": {"min": min(prices), "max": max(prices), "avg": statistics.mean(prices)},
            "delivery_range": {"min": min(deliveries), "max": max(deliveries), "avg": statistics.mean(deliveries)},
            "price_variance": statistics.variance(prices) if len(prices) > 1 else 0,
            "market_competitiveness": "high" if len(quotes) >= 5 else "moderate" if len(quotes) >= 3 else "low"
        }
    
    def _generate_cost_breakdown(self, quotes: List[Quote]) -> Dict[str, Any]:
        """Generate cost breakdown analysis"""
        prices = [float(q.price_total) for q in quotes]
        
        return {
            "lowest_quote": min(prices),
            "highest_quote": max(prices),
            "average_quote": statistics.mean(prices),
            "median_quote": statistics.median(prices),
            "potential_savings": max(prices) - min(prices),
            "cost_distribution": {
                "budget_friendly": len([p for p in prices if p <= statistics.mean(prices) * 0.8]),
                "market_rate": len([p for p in prices if statistics.mean(prices) * 0.8 < p <= statistics.mean(prices) * 1.2]),
                "premium": len([p for p in prices if p > statistics.mean(prices) * 1.2])
            }
        }
    
    def _generate_timeline_analysis(self, quotes: List[Quote]) -> Dict[str, Any]:
        """Generate timeline analysis"""
        deliveries = [q.delivery_time for q in quotes]
        
        return {
            "fastest_delivery": min(deliveries),
            "slowest_delivery": max(deliveries),
            "average_delivery": statistics.mean(deliveries),
            "delivery_variance": statistics.variance(deliveries) if len(deliveries) > 1 else 0,
            "rush_options": len([d for d in deliveries if d <= 7]),
            "standard_options": len([d for d in deliveries if 7 < d <= 30]),
            "extended_options": len([d for d in deliveries if d > 30])
        }
    
    def _generate_risk_analysis(self, quotes: List[Quote]) -> Dict[str, Any]:
        """Generate risk analysis"""
        risk_levels = []
        for quote in quotes:
            risk_assessment = self._assess_quote_risk(quote)
            risk_levels.append(risk_assessment["overall_level"])
        
        return {
            "low_risk_quotes": risk_levels.count("low"),
            "medium_risk_quotes": risk_levels.count("medium"),
            "high_risk_quotes": risk_levels.count("high"),
            "overall_risk_profile": statistics.mode(risk_levels) if risk_levels else "medium",
            "risk_mitigation_needed": risk_levels.count("high") > 0
        }
    
    def _generate_recommendations(self, quote_comparisons: List[QuoteComparison]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if not quote_comparisons:
            return ["No quotes available for analysis"]
        
        best_quote = quote_comparisons[0]
        
        # Primary recommendation
        recommendations.append(f"Select quote from {best_quote.manufacturer_name} for optimal value")
        
        # Risk-based recommendations
        if any("high" in str(qc.analytics.risk_assessment.get("overall_level", "")) for qc in quote_comparisons):
            recommendations.append("Consider additional due diligence for high-risk manufacturers")
        
        # Price-based recommendations
        prices = [qc.price for qc in quote_comparisons]
        if max(prices) - min(prices) > min(prices) * 0.5:
            recommendations.append("Significant price variance detected - negotiate with preferred manufacturers")
        
        # Timeline recommendations
        deliveries = [qc.delivery_days for qc in quote_comparisons]
        if max(deliveries) - min(deliveries) > 14:
            recommendations.append("Consider delivery timeline requirements when making final selection")
        
        return recommendations
    
    # Simplified implementations for benchmarking (would use real data in production)
    
    def _get_industry_average_price(self, db: Session, category: Optional[str]) -> float:
        """Get industry average price (simplified)"""
        return 1000.0  # Placeholder
    
    def _get_industry_average_delivery(self, db: Session, category: Optional[str]) -> int:
        """Get industry average delivery time (simplified)"""
        return 21  # Placeholder
    
    def _get_similar_quotes(self, db: Session, quote: Quote, category: Optional[str]) -> List[Quote]:
        """Get similar quotes for benchmarking (simplified)"""
        return []  # Placeholder
    
    def _calculate_percentile(self, quote: Quote, similar_quotes: List[Quote]) -> int:
        """Calculate market percentile (simplified)"""
        return 50  # Placeholder
    
    def _identify_competitive_advantages(self, quote: Quote) -> List[str]:
        """Identify competitive advantages (simplified)"""
        advantages = []
        
        if quote.manufacturer and quote.manufacturer.overall_rating and quote.manufacturer.overall_rating >= 4.0:
            advantages.append("High manufacturer rating")
        
        if quote.delivery_time <= 14:
            advantages.append("Fast delivery capability")
        
        return advantages
    
    def _suggest_improvements(self, quote: Quote) -> List[str]:
        """Suggest improvements (simplified)"""
        suggestions = []
        
        if quote.delivery_time > 30:
            suggestions.append("Negotiate shorter delivery timeline")
        
        if not quote.manufacturer or not quote.manufacturer.overall_rating or quote.manufacturer.overall_rating < 4.0:
            suggestions.append("Request additional quality assurance measures")
        
        return suggestions 