from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import math
from dataclasses import dataclass
from enum import Enum

from ..models import Order, ProductionQuote, Manufacturer, Quote
from ..models.production_quote import ProductionQuoteType, PricingModel
from ..types import CapabilityCategory, UrgencyLevel


class MatchType(Enum):
    ORDER_TO_PRODUCTION_QUOTE = "order_to_production_quote"
    PRODUCTION_QUOTE_TO_ORDER = "production_quote_to_order"


@dataclass
class MatchScore:
    total_score: float
    category_match: float
    price_compatibility: float
    timeline_compatibility: float
    geographic_proximity: float
    capacity_availability: float
    manufacturer_rating: float
    urgency_alignment: float
    specification_match: float
    confidence_level: str
    match_reasons: List[str]
    potential_issues: List[str]


@dataclass
class SmartMatch:
    match_id: str
    match_type: MatchType
    order_id: Optional[int]
    production_quote_id: Optional[int]
    score: MatchScore
    estimated_price: Optional[float]
    estimated_delivery_days: Optional[int]
    manufacturer_info: Dict[str, Any]
    created_at: datetime
    expires_at: Optional[datetime]


class SmartMatchingService:
    """
    Advanced smart matching service for connecting orders with production quotes
    using multiple scoring algorithms and machine learning insights.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    # Core Matching Methods
    
    def find_matches_for_order(
        self, 
        order_id: int, 
        limit: int = 10,
        min_score: float = 0.6
    ) -> List[SmartMatch]:
        """Find the best production quote matches for a given order."""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return []
            
        # Get active production quotes that could match
        production_quotes = self._get_candidate_production_quotes(order)
        
        matches = []
        for pq in production_quotes:
            score = self._calculate_match_score(order, pq)
            if score.total_score >= min_score:
                match = SmartMatch(
                    match_id=f"order_{order_id}_pq_{pq.id}_{int(datetime.now().timestamp())}",
                    match_type=MatchType.ORDER_TO_PRODUCTION_QUOTE,
                    order_id=order_id,
                    production_quote_id=pq.id,
                    score=score,
                    estimated_price=self._estimate_price(order, pq),
                    estimated_delivery_days=self._estimate_delivery_time(order, pq),
                    manufacturer_info=self._get_manufacturer_info(pq.manufacturer),
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(days=7)
                )
                matches.append(match)
        
        # Sort by score and return top matches
        matches.sort(key=lambda x: x.score.total_score, reverse=True)
        return matches[:limit]
    
    def find_matches_for_production_quote(
        self, 
        production_quote_id: int, 
        limit: int = 10,
        min_score: float = 0.6
    ) -> List[SmartMatch]:
        """Find the best order matches for a given production quote."""
        pq = self.db.query(ProductionQuote).filter(ProductionQuote.id == production_quote_id).first()
        if not pq:
            return []
            
        # Get active orders that could match
        orders = self._get_candidate_orders(pq)
        
        matches = []
        for order in orders:
            score = self._calculate_match_score(order, pq)
            if score.total_score >= min_score:
                match = SmartMatch(
                    match_id=f"pq_{production_quote_id}_order_{order.id}_{int(datetime.now().timestamp())}",
                    match_type=MatchType.PRODUCTION_QUOTE_TO_ORDER,
                    order_id=order.id,
                    production_quote_id=production_quote_id,
                    score=score,
                    estimated_price=self._estimate_price(order, pq),
                    estimated_delivery_days=self._estimate_delivery_time(order, pq),
                    manufacturer_info=self._get_manufacturer_info(pq.manufacturer),
                    created_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(days=7)
                )
                matches.append(match)
        
        # Sort by score and return top matches
        matches.sort(key=lambda x: x.score.total_score, reverse=True)
        return matches[:limit]
    
    # Candidate Selection Methods
    
    def _get_candidate_production_quotes(self, order: Order) -> List[ProductionQuote]:
        """Get production quotes that could potentially match the order."""
        query = self.db.query(ProductionQuote).filter(
            ProductionQuote.is_active == True,
            ProductionQuote.is_public == True,
            ProductionQuote.availability_start <= datetime.now(),
            or_(
                ProductionQuote.availability_end.is_(None),
                ProductionQuote.availability_end >= datetime.now()
            )
        )
        
        # Filter by manufacturing processes if order has category
        if order.category:
            query = query.filter(
                ProductionQuote.manufacturing_processes.contains([order.category.value])
            )
        
        # Filter by quantity constraints
        if order.quantity:
            query = query.filter(
                or_(
                    ProductionQuote.minimum_quantity.is_(None),
                    ProductionQuote.minimum_quantity <= order.quantity
                ),
                or_(
                    ProductionQuote.maximum_quantity.is_(None),
                    ProductionQuote.maximum_quantity >= order.quantity
                )
            )
        
        # Filter by delivery timeline
        if order.delivery_date:
            required_delivery = datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00'))
            min_start_date = required_delivery - timedelta(days=90)  # Allow up to 90 days lead time
            query = query.filter(
                ProductionQuote.availability_start <= min_start_date
            )
        
        return query.limit(50).all()  # Limit to prevent performance issues
    
    def _get_candidate_orders(self, production_quote: ProductionQuote) -> List[Order]:
        """Get orders that could potentially match the production quote."""
        query = self.db.query(Order).filter(
            Order.status.in_(['PENDING', 'QUOTED', 'NEGOTIATING']),
            Order.is_public == True
        )
        
        # Filter by manufacturing processes
        if production_quote.manufacturing_processes:
            categories = [CapabilityCategory(proc) for proc in production_quote.manufacturing_processes 
                         if proc in [cat.value for cat in CapabilityCategory]]
            if categories:
                query = query.filter(Order.category.in_(categories))
        
        # Filter by quantity constraints
        if production_quote.minimum_quantity or production_quote.maximum_quantity:
            if production_quote.minimum_quantity:
                query = query.filter(Order.quantity >= production_quote.minimum_quantity)
            if production_quote.maximum_quantity:
                query = query.filter(Order.quantity <= production_quote.maximum_quantity)
        
        # Filter by timeline compatibility
        if production_quote.lead_time_days:
            min_delivery_date = datetime.now() + timedelta(days=production_quote.lead_time_days)
            query = query.filter(
                or_(
                    Order.delivery_date.is_(None),
                    func.date(Order.delivery_date) >= min_delivery_date.date()
                )
            )
        
        return query.limit(50).all()
    
    # Scoring Algorithm
    
    def _calculate_match_score(self, order: Order, production_quote: ProductionQuote) -> MatchScore:
        """Calculate comprehensive match score between order and production quote."""
        
        # Individual scoring components
        category_score = self._score_category_match(order, production_quote)
        price_score = self._score_price_compatibility(order, production_quote)
        timeline_score = self._score_timeline_compatibility(order, production_quote)
        geographic_score = self._score_geographic_proximity(order, production_quote)
        capacity_score = self._score_capacity_availability(order, production_quote)
        manufacturer_score = self._score_manufacturer_rating(production_quote.manufacturer)
        urgency_score = self._score_urgency_alignment(order, production_quote)
        specification_score = self._score_specification_match(order, production_quote)
        
        # Weighted total score
        weights = {
            'category': 0.25,
            'price': 0.20,
            'timeline': 0.15,
            'geographic': 0.10,
            'capacity': 0.10,
            'manufacturer': 0.10,
            'urgency': 0.05,
            'specification': 0.05
        }
        
        total_score = (
            category_score * weights['category'] +
            price_score * weights['price'] +
            timeline_score * weights['timeline'] +
            geographic_score * weights['geographic'] +
            capacity_score * weights['capacity'] +
            manufacturer_score * weights['manufacturer'] +
            urgency_score * weights['urgency'] +
            specification_score * weights['specification']
        )
        
        # Determine confidence level
        confidence_level = self._determine_confidence_level(total_score)
        
        # Generate match reasons and potential issues
        match_reasons = self._generate_match_reasons(order, production_quote, {
            'category': category_score,
            'price': price_score,
            'timeline': timeline_score,
            'geographic': geographic_score,
            'capacity': capacity_score,
            'manufacturer': manufacturer_score,
            'urgency': urgency_score,
            'specification': specification_score
        })
        
        potential_issues = self._identify_potential_issues(order, production_quote, {
            'category': category_score,
            'price': price_score,
            'timeline': timeline_score,
            'geographic': geographic_score,
            'capacity': capacity_score,
            'manufacturer': manufacturer_score,
            'urgency': urgency_score,
            'specification': specification_score
        })
        
        return MatchScore(
            total_score=total_score,
            category_match=category_score,
            price_compatibility=price_score,
            timeline_compatibility=timeline_score,
            geographic_proximity=geographic_score,
            capacity_availability=capacity_score,
            manufacturer_rating=manufacturer_score,
            urgency_alignment=urgency_score,
            specification_match=specification_score,
            confidence_level=confidence_level,
            match_reasons=match_reasons,
            potential_issues=potential_issues
        )
    
    # Individual Scoring Methods
    
    def _score_category_match(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score how well the manufacturing categories match."""
        if not order.category or not production_quote.manufacturing_processes:
            return 0.5  # Neutral score if no category info
        
        order_category = order.category.value
        if order_category in production_quote.manufacturing_processes:
            return 1.0  # Perfect match
        
        # Check for related categories
        related_categories = self._get_related_categories(order.category)
        for related in related_categories:
            if related.value in production_quote.manufacturing_processes:
                return 0.8  # Good match for related category
        
        return 0.2  # Poor match
    
    def _score_price_compatibility(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score price compatibility between order budget and production quote pricing."""
        if not order.target_price or not production_quote.base_price:
            return 0.7  # Neutral score if no pricing info
        
        estimated_pq_price = self._estimate_price(order, production_quote)
        if not estimated_pq_price:
            return 0.7
        
        price_ratio = order.target_price / estimated_pq_price
        
        if 0.9 <= price_ratio <= 1.1:
            return 1.0  # Perfect price match
        elif 0.8 <= price_ratio <= 1.2:
            return 0.8  # Good price match
        elif 0.7 <= price_ratio <= 1.3:
            return 0.6  # Acceptable price match
        elif 0.5 <= price_ratio <= 1.5:
            return 0.4  # Poor price match
        else:
            return 0.1  # Very poor price match
    
    def _score_timeline_compatibility(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score timeline compatibility."""
        if not order.delivery_date or not production_quote.lead_time_days:
            return 0.7  # Neutral score if no timeline info
        
        required_delivery = datetime.fromisoformat(order.delivery_date.replace('Z', '+00:00'))
        earliest_delivery = datetime.now() + timedelta(days=production_quote.lead_time_days)
        
        if earliest_delivery <= required_delivery:
            days_buffer = (required_delivery - earliest_delivery).days
            if days_buffer >= 14:
                return 1.0  # Plenty of buffer time
            elif days_buffer >= 7:
                return 0.9  # Good buffer time
            elif days_buffer >= 3:
                return 0.8  # Adequate buffer time
            else:
                return 0.7  # Tight but feasible
        else:
            days_overdue = (earliest_delivery - required_delivery).days
            if days_overdue <= 3:
                return 0.5  # Slightly late
            elif days_overdue <= 7:
                return 0.3  # Moderately late
            else:
                return 0.1  # Too late
    
    def _score_geographic_proximity(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score geographic proximity for shipping efficiency."""
        # Simplified geographic scoring - in real implementation, use actual coordinates
        if not order.delivery_address or not production_quote.geographic_preferences:
            return 0.7  # Neutral score
        
        order_country = order.delivery_address.get('country', '')
        pq_countries = production_quote.geographic_preferences.get('preferred_countries', [])
        
        if order_country in pq_countries:
            return 1.0  # Same country/region
        
        # Check for regional proximity (simplified)
        if self._are_countries_in_same_region(order_country, pq_countries):
            return 0.8
        
        return 0.5  # Different regions
    
    def _score_capacity_availability(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score current capacity availability."""
        if not production_quote.current_capacity_utilization:
            return 0.8  # Assume good availability if not specified
        
        utilization = production_quote.current_capacity_utilization
        if utilization <= 0.6:
            return 1.0  # High availability
        elif utilization <= 0.8:
            return 0.8  # Good availability
        elif utilization <= 0.9:
            return 0.6  # Limited availability
        else:
            return 0.3  # Very limited availability
    
    def _score_manufacturer_rating(self, manufacturer: Manufacturer) -> float:
        """Score manufacturer quality and reliability."""
        if not manufacturer:
            return 0.5
        
        # Use manufacturer rating if available
        if hasattr(manufacturer, 'rating') and manufacturer.rating:
            return min(manufacturer.rating / 5.0, 1.0)
        
        # Use verification status and other factors
        score = 0.5  # Base score
        
        if hasattr(manufacturer, 'is_verified') and manufacturer.is_verified:
            score += 0.2
        
        if hasattr(manufacturer, 'completed_orders_count'):
            if manufacturer.completed_orders_count >= 100:
                score += 0.2
            elif manufacturer.completed_orders_count >= 50:
                score += 0.15
            elif manufacturer.completed_orders_count >= 10:
                score += 0.1
        
        return min(score, 1.0)
    
    def _score_urgency_alignment(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score how well urgency levels align."""
        if not order.urgency:
            return 0.7
        
        # Map urgency to priority expectations
        urgency_priority_map = {
            UrgencyLevel.LOW: 1,
            UrgencyLevel.MEDIUM: 2,
            UrgencyLevel.HIGH: 3,
            UrgencyLevel.URGENT: 4
        }
        
        order_priority = urgency_priority_map.get(order.urgency, 2)
        pq_priority = production_quote.priority_level or 2
        
        priority_diff = abs(order_priority - pq_priority)
        
        if priority_diff == 0:
            return 1.0
        elif priority_diff == 1:
            return 0.8
        elif priority_diff == 2:
            return 0.6
        else:
            return 0.4
    
    def _score_specification_match(self, order: Order, production_quote: ProductionQuote) -> float:
        """Score how well specifications match."""
        if not order.specifications or not production_quote.materials:
            return 0.7  # Neutral if no spec info
        
        # Check material compatibility
        order_materials = []
        for spec in order.specifications:
            if 'material' in spec.get('name', '').lower():
                order_materials.append(spec.get('value', '').lower())
        
        if not order_materials:
            return 0.7
        
        pq_materials = [mat.lower() for mat in production_quote.materials]
        
        matches = sum(1 for mat in order_materials if any(pq_mat in mat or mat in pq_mat for pq_mat in pq_materials))
        
        if matches == len(order_materials):
            return 1.0  # All materials match
        elif matches > 0:
            return 0.8  # Some materials match
        else:
            return 0.3  # No material matches
    
    # Helper Methods
    
    def _estimate_price(self, order: Order, production_quote: ProductionQuote) -> Optional[float]:
        """Estimate price for the order based on production quote pricing model."""
        if not production_quote.base_price or not order.quantity:
            return None
        
        if production_quote.pricing_model == PricingModel.FIXED:
            return production_quote.base_price
        elif production_quote.pricing_model == PricingModel.PER_UNIT:
            return production_quote.base_price * order.quantity
        elif production_quote.pricing_model == PricingModel.HOURLY:
            # Estimate hours based on complexity and quantity
            estimated_hours = self._estimate_hours(order, production_quote)
            return production_quote.base_price * estimated_hours if estimated_hours else None
        elif production_quote.pricing_model == PricingModel.TIERED:
            # Use tiered pricing logic
            return self._calculate_tiered_price(order.quantity, production_quote)
        
        return production_quote.base_price
    
    def _estimate_delivery_time(self, order: Order, production_quote: ProductionQuote) -> Optional[int]:
        """Estimate delivery time in days."""
        base_lead_time = production_quote.lead_time_days or 14
        
        # Adjust based on quantity
        if order.quantity and order.quantity > 100:
            base_lead_time += math.ceil(order.quantity / 100) * 2
        
        # Adjust based on urgency
        if order.urgency == UrgencyLevel.URGENT:
            base_lead_time = max(base_lead_time - 5, 1)
        elif order.urgency == UrgencyLevel.HIGH:
            base_lead_time = max(base_lead_time - 2, 1)
        
        return base_lead_time
    
    def _estimate_hours(self, order: Order, production_quote: ProductionQuote) -> Optional[float]:
        """Estimate hours required for the order."""
        # Simplified estimation - in real implementation, use ML models
        base_hours = 8  # Base hours per unit
        
        if order.quantity:
            total_hours = base_hours * order.quantity
            # Apply efficiency scaling for larger quantities
            if order.quantity > 10:
                efficiency_factor = 0.9 ** math.log10(order.quantity)
                total_hours *= efficiency_factor
            return total_hours
        
        return None
    
    def _calculate_tiered_price(self, quantity: int, production_quote: ProductionQuote) -> float:
        """Calculate price using tiered pricing model."""
        # Simplified tiered pricing - in real implementation, use actual tier data
        base_price = production_quote.base_price
        
        if quantity <= 10:
            return base_price * quantity
        elif quantity <= 50:
            return base_price * quantity * 0.9  # 10% discount
        elif quantity <= 100:
            return base_price * quantity * 0.8  # 20% discount
        else:
            return base_price * quantity * 0.7  # 30% discount
    
    def _get_manufacturer_info(self, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Get manufacturer information for the match."""
        return {
            'id': manufacturer.id,
            'name': manufacturer.business_name or manufacturer.company_name,
            'location': getattr(manufacturer, 'location', 'Unknown'),
            'rating': getattr(manufacturer, 'rating', None),
            'verified': getattr(manufacturer, 'is_verified', False),
            'completed_orders': getattr(manufacturer, 'completed_orders_count', 0)
        }
    
    def _get_related_categories(self, category: CapabilityCategory) -> List[CapabilityCategory]:
        """Get related manufacturing categories."""
        related_map = {
            CapabilityCategory.CNC_MACHINING: [CapabilityCategory.SHEET_METAL],
            CapabilityCategory.SHEET_METAL: [CapabilityCategory.CNC_MACHINING, CapabilityCategory.WELDING],
            CapabilityCategory.WELDING: [CapabilityCategory.SHEET_METAL, CapabilityCategory.ASSEMBLY],
            CapabilityCategory.ASSEMBLY: [CapabilityCategory.WELDING],
            CapabilityCategory.CASTING: [CapabilityCategory.CNC_MACHINING, CapabilityCategory.FINISHING],
            CapabilityCategory.FINISHING: [CapabilityCategory.CASTING, CapabilityCategory.CNC_MACHINING]
        }
        return related_map.get(category, [])
    
    def _are_countries_in_same_region(self, country1: str, countries2: List[str]) -> bool:
        """Check if countries are in the same geographic region."""
        # Simplified regional grouping
        regions = {
            'north_america': ['US', 'CA', 'MX'],
            'europe': ['DE', 'FR', 'UK', 'IT', 'ES', 'NL', 'BE'],
            'asia_pacific': ['CN', 'JP', 'KR', 'IN', 'AU', 'SG'],
        }
        
        for region, countries in regions.items():
            if country1 in countries and any(c in countries for c in countries2):
                return True
        
        return False
    
    def _determine_confidence_level(self, score: float) -> str:
        """Determine confidence level based on total score."""
        if score >= 0.9:
            return "EXCELLENT"
        elif score >= 0.8:
            return "VERY_GOOD"
        elif score >= 0.7:
            return "GOOD"
        elif score >= 0.6:
            return "FAIR"
        else:
            return "POOR"
    
    def _generate_match_reasons(self, order: Order, production_quote: ProductionQuote, scores: Dict[str, float]) -> List[str]:
        """Generate human-readable reasons for the match."""
        reasons = []
        
        if scores['category'] >= 0.9:
            reasons.append("Perfect manufacturing category match")
        elif scores['category'] >= 0.7:
            reasons.append("Good manufacturing capability alignment")
        
        if scores['price'] >= 0.8:
            reasons.append("Competitive pricing within budget")
        
        if scores['timeline'] >= 0.8:
            reasons.append("Can meet delivery timeline with buffer")
        
        if scores['manufacturer'] >= 0.8:
            reasons.append("Highly rated and verified manufacturer")
        
        if scores['capacity'] >= 0.8:
            reasons.append("Good production capacity availability")
        
        if scores['geographic'] >= 0.8:
            reasons.append("Favorable geographic location for shipping")
        
        return reasons
    
    def _identify_potential_issues(self, order: Order, production_quote: ProductionQuote, scores: Dict[str, float]) -> List[str]:
        """Identify potential issues with the match."""
        issues = []
        
        if scores['price'] < 0.5:
            issues.append("Pricing may exceed budget expectations")
        
        if scores['timeline'] < 0.5:
            issues.append("May not meet required delivery timeline")
        
        if scores['capacity'] < 0.5:
            issues.append("Limited production capacity availability")
        
        if scores['manufacturer'] < 0.5:
            issues.append("Manufacturer has limited track record")
        
        if scores['geographic'] < 0.5:
            issues.append("Long shipping distance may increase costs and delays")
        
        return issues


# Batch Processing and Caching
class MatchingCache:
    """Cache for storing and retrieving match results."""
    
    def __init__(self):
        self._cache = {}
        self._cache_expiry = {}
    
    def get_matches(self, key: str) -> Optional[List[SmartMatch]]:
        """Get cached matches if still valid."""
        if key in self._cache and key in self._cache_expiry:
            if datetime.now() < self._cache_expiry[key]:
                return self._cache[key]
            else:
                # Clean up expired cache
                del self._cache[key]
                del self._cache_expiry[key]
        return None
    
    def set_matches(self, key: str, matches: List[SmartMatch], ttl_minutes: int = 30):
        """Cache matches with TTL."""
        self._cache[key] = matches
        self._cache_expiry[key] = datetime.now() + timedelta(minutes=ttl_minutes)
    
    def clear_cache(self):
        """Clear all cached matches."""
        self._cache.clear()
        self._cache_expiry.clear()


# Global cache instance
matching_cache = MatchingCache() 