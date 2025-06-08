import os
import math
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from fuzzywuzzy import fuzz, process
import json
from enum import Enum

from app.models.producer import Manufacturer
from app.models.order import Order
from app.core.config import settings


# Configure logging for algorithm tuning and A/B testing
logger = logging.getLogger("matching_algorithm")
logger.setLevel(logging.INFO)

# Create file handler for matching logs
if not logger.handlers:
    handler = logging.FileHandler('logs/matching_algorithm.log')
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class FallbackStrategy(Enum):
    """Fallback strategies when no matches found"""
    BROADCAST_ALL = "broadcast_all"
    RELAX_CRITERIA = "relax_criteria"
    GEOGRAPHIC_EXPANSION = "geographic_expansion"
    CAPABILITY_EXPANSION = "capability_expansion"


@dataclass
class MatchingWeights:
    """Configurable scoring weights"""
    capability_weight: float = float(os.getenv('MATCHING_CAPABILITY_WEIGHT', 0.80))
    geographic_weight: float = float(os.getenv('MATCHING_GEOGRAPHIC_WEIGHT', 0.15))
    performance_weight: float = float(os.getenv('MATCHING_PERFORMANCE_WEIGHT', 0.05))
    
    def validate(self):
        """Ensure weights sum to 1.0"""
        total = self.capability_weight + self.geographic_weight + self.performance_weight
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"Matching weights must sum to 1.0, got {total}")


@dataclass
class MatchResult:
    """Enhanced match result with comprehensive data"""
    manufacturer: Manufacturer
    total_score: float
    capability_score: float
    geographic_score: float
    performance_score: float
    distance_km: Optional[float]
    match_reasons: List[str]
    capability_matches: Dict[str, float]
    availability_status: str
    estimated_lead_time: Optional[int]
    capacity_utilization: float
    risk_factors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            'manufacturer_id': self.manufacturer.id,
            'business_name': self.manufacturer.business_name,
            'total_score': round(self.total_score, 3),
            'capability_score': round(self.capability_score, 3),
            'geographic_score': round(self.geographic_score, 3),
            'performance_score': round(self.performance_score, 3),
            'distance_km': self.distance_km,
            'match_reasons': self.match_reasons,
            'capability_matches': {k: round(v, 3) for k, v in self.capability_matches.items()},
            'availability_status': self.availability_status,
            'estimated_lead_time': self.estimated_lead_time,
            'capacity_utilization': round(self.capacity_utilization, 2),
            'risk_factors': self.risk_factors,
            'overall_rating': float(self.manufacturer.overall_rating or 0),
            'total_orders_completed': self.manufacturer.total_orders_completed,
            'city': self.manufacturer.city,
            'country': self.manufacturer.country
        }


class IntelligentMatchingService:
    """Advanced manufacturer matching algorithm with AI-powered scoring"""
    
    def __init__(self, weights: Optional[MatchingWeights] = None):
        self.weights = weights or MatchingWeights()
        self.weights.validate()
        
        # Fuzzy matching thresholds
        self.fuzzy_threshold = int(os.getenv('FUZZY_MATCH_THRESHOLD', 70))
        self.min_match_score = float(os.getenv('MIN_MATCH_SCORE', 0.1))
        
        # Geographic settings
        self.max_distance_km = int(os.getenv('MAX_DISTANCE_KM', 1000))
        self.local_radius_km = int(os.getenv('LOCAL_RADIUS_KM', 50))
        
        # Performance optimization settings
        self.enable_caching = os.getenv('ENABLE_MATCHING_CACHE', 'true').lower() == 'true'
        self.cache_ttl_minutes = int(os.getenv('CACHE_TTL_MINUTES', 30))
    
    def find_best_matches(
        self,
        db: Session,
        order: Order,
        max_results: int = 10,
        enable_fallback: bool = True,
        ab_test_group: Optional[str] = None
    ) -> List[MatchResult]:
        """
        Find best manufacturer matches for an order using intelligent scoring
        
        Args:
            db: Database session
            order: Order to match
            max_results: Maximum number of results to return
            enable_fallback: Whether to enable fallback mechanisms
            ab_test_group: A/B testing group identifier
        """
        start_time = datetime.now()
        
        try:
            # Log matching request
            logger.info(f"Starting match for order {order.id}", extra={
                'order_id': order.id,
                'order_title': order.title,
                'ab_test_group': ab_test_group,
                'max_results': max_results,
                'weights': {
                    'capability': self.weights.capability_weight,
                    'geographic': self.weights.geographic_weight,
                    'performance': self.weights.performance_weight
                }
            })
            
            # Get eligible manufacturers
            manufacturers = self._get_eligible_manufacturers(db, order)
            
            if not manufacturers:
                logger.warning(f"No eligible manufacturers found for order {order.id}")
                if enable_fallback:
                    return self._apply_fallback_strategy(db, order, max_results)
                return []
            
            # Score all manufacturers
            scored_matches = []
            for manufacturer in manufacturers:
                match_result = self._calculate_comprehensive_score(manufacturer, order)
                
                if match_result.total_score >= self.min_match_score:
                    scored_matches.append(match_result)
            
            # Sort by total score descending
            scored_matches.sort(key=lambda x: x.total_score, reverse=True)
            
            # Apply business logic filters
            final_matches = self._apply_business_filters(scored_matches, order)
            
            # Limit results
            final_matches = final_matches[:max_results]
            
            # Log results
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Matching completed for order {order.id}", extra={
                'order_id': order.id,
                'total_manufacturers_evaluated': len(manufacturers),
                'matches_found': len(final_matches),
                'processing_time_seconds': processing_time,
                'top_score': final_matches[0].total_score if final_matches else 0,
                'ab_test_group': ab_test_group
            })
            
            return final_matches
            
        except Exception as e:
            logger.error(f"Error in matching algorithm for order {order.id}: {str(e)}", extra={
                'order_id': order.id,
                'error': str(e),
                'ab_test_group': ab_test_group
            })
            return []
    
    def _get_eligible_manufacturers(self, db: Session, order: Order) -> List[Manufacturer]:
        """Get manufacturers eligible for matching with performance optimization"""
        
        # Base query with essential filters
        query = db.query(Manufacturer).filter(
            and_(
                Manufacturer.is_active == True,
                Manufacturer.is_verified == True,
                Manufacturer.stripe_onboarding_completed == True
            )
        )
        
        # MOQ filtering
        if order.quantity:
            query = query.filter(
                or_(
                    Manufacturer.min_order_quantity <= order.quantity,
                    Manufacturer.min_order_quantity.is_(None)
                )
            )
        
        # Budget filtering
        if order.budget_max_pln:
            query = query.filter(
                or_(
                    Manufacturer.min_order_value_pln <= order.budget_max_pln,
                    Manufacturer.min_order_value_pln.is_(None)
                )
            )
        
        # Lead time filtering
        if order.delivery_deadline:
            days_until_deadline = (order.delivery_deadline - datetime.now()).days
            query = query.filter(
                or_(
                    Manufacturer.standard_lead_time_days <= days_until_deadline,
                    Manufacturer.standard_lead_time_days.is_(None)
                )
            )
        
        # Geographic pre-filtering if specific location required
        if order.preferred_country:
            query = query.filter(Manufacturer.country == order.preferred_country)
        
        # Order by recent activity for better performance
        query = query.order_by(Manufacturer.last_activity_date.desc())
        
        return query.all()
    
    def _calculate_comprehensive_score(self, manufacturer: Manufacturer, order: Order) -> MatchResult:
        """Calculate comprehensive matching score with detailed breakdown"""
        
        # Calculate individual scores
        capability_score = self._calculate_capability_score(manufacturer, order)
        geographic_score = self._calculate_geographic_score(manufacturer, order)
        performance_score = self._calculate_performance_score(manufacturer, order)
        
        # Calculate weighted total score
        total_score = (
            capability_score * self.weights.capability_weight +
            geographic_score * self.weights.geographic_weight +
            performance_score * self.weights.performance_weight
        )
        
        # Calculate additional metrics
        distance_km = self._calculate_distance(manufacturer, order)
        match_reasons = self._generate_match_reasons(manufacturer, order, {
            'capability': capability_score,
            'geographic': geographic_score,
            'performance': performance_score
        })
        
        capability_matches = self._get_detailed_capability_matches(manufacturer, order)
        availability_status = self._assess_availability(manufacturer, order)
        estimated_lead_time = self._estimate_lead_time(manufacturer, order)
        risk_factors = self._assess_risk_factors(manufacturer, order)
        
        return MatchResult(
            manufacturer=manufacturer,
            total_score=total_score,
            capability_score=capability_score,
            geographic_score=geographic_score,
            performance_score=performance_score,
            distance_km=distance_km,
            match_reasons=match_reasons,
            capability_matches=capability_matches,
            availability_status=availability_status,
            estimated_lead_time=estimated_lead_time,
            capacity_utilization=manufacturer.capacity_utilization_pct or 0,
            risk_factors=risk_factors
        )
    
    def _calculate_capability_score(self, manufacturer: Manufacturer, order: Order) -> float:
        """Calculate capability matching score using fuzzy matching"""
        if not manufacturer.capabilities or not order.technical_requirements:
            return 0.1
        
        total_score = 0.0
        weight_sum = 0.0
        
        # Extract requirements from order
        tech_reqs = order.technical_requirements
        manufacturer_caps = manufacturer.capabilities
        
        # Manufacturing process matching (30% of capability score)
        if 'manufacturing_process' in tech_reqs and 'manufacturing_processes' in manufacturer_caps:
            required_process = tech_reqs['manufacturing_process']
            available_processes = manufacturer_caps['manufacturing_processes']
            
            process_score = self._fuzzy_match_list(required_process, available_processes)
            total_score += process_score * 0.30
            weight_sum += 0.30
        
        # Material matching (25% of capability score)
        if 'material' in tech_reqs and 'materials' in manufacturer_caps:
            required_material = tech_reqs['material']
            available_materials = manufacturer_caps['materials']
            
            material_score = self._fuzzy_match_list(required_material, available_materials)
            total_score += material_score * 0.25
            weight_sum += 0.25
        
        # Industry experience (20% of capability score)
        if order.industry_category and 'industries_served' in manufacturer_caps:
            industry_score = self._fuzzy_match_list(order.industry_category, manufacturer_caps['industries_served'])
            total_score += industry_score * 0.20
            weight_sum += 0.20
        
        # Quality certifications (15% of capability score)
        if 'industry_standards' in tech_reqs and 'certifications' in manufacturer_caps:
            required_standards = tech_reqs['industry_standards']
            available_certs = manufacturer_caps['certifications']
            
            if isinstance(required_standards, list):
                cert_scores = []
                for standard in required_standards:
                    cert_score = self._fuzzy_match_list(standard, available_certs)
                    cert_scores.append(cert_score)
                
                avg_cert_score = sum(cert_scores) / len(cert_scores) if cert_scores else 0
                total_score += avg_cert_score * 0.15
                weight_sum += 0.15
        
        # Special capabilities (10% of capability score)
        if 'special_requirements' in tech_reqs and 'special_capabilities' in manufacturer_caps:
            special_reqs = tech_reqs['special_requirements']
            special_caps = manufacturer_caps['special_capabilities']
            
            if isinstance(special_reqs, list):
                special_scores = []
                for req in special_reqs:
                    special_score = self._fuzzy_match_list(req, special_caps)
                    special_scores.append(special_score)
                
                avg_special_score = sum(special_scores) / len(special_scores) if special_scores else 0
                total_score += avg_special_score * 0.10
                weight_sum += 0.10
        
        # Normalize score
        return total_score / weight_sum if weight_sum > 0 else 0.1
    
    def _fuzzy_match_list(self, target: str, candidates: List[str]) -> float:
        """Perform fuzzy matching against a list of candidates"""
        if not candidates or not target:
            return 0.0
        
        # Get best match using fuzzy string matching
        best_match = process.extractOne(target, candidates, scorer=fuzz.token_sort_ratio)
        
        if best_match and best_match[1] >= self.fuzzy_threshold:
            # Convert percentage to 0-1 score
            return best_match[1] / 100.0
        
        return 0.0
    
    def _calculate_geographic_score(self, manufacturer: Manufacturer, order: Order) -> float:
        """Calculate geographic proximity score using coordinates"""
        
        # If no geographic preference, return neutral score
        if not order.preferred_country and not order.max_distance_km:
            return 0.5
        
        score = 0.0
        
        # Country matching (40% of geographic score)
        if order.preferred_country:
            if manufacturer.country == order.preferred_country:
                score += 0.4
            else:
                # Penalty for different country
                score += 0.1
        else:
            score += 0.4  # Neutral if no preference
        
        # Distance-based scoring (60% of geographic score)
        distance_km = self._calculate_distance(manufacturer, order)
        
        if distance_km is not None:
            if distance_km <= self.local_radius_km:
                score += 0.6  # Local manufacturer bonus
            elif distance_km <= 200:
                score += 0.5  # Regional
            elif distance_km <= 500:
                score += 0.3  # National
            elif distance_km <= 1000:
                score += 0.2  # Extended range
            else:
                score += 0.1  # International
        else:
            score += 0.3  # Neutral if coordinates not available
        
        return min(score, 1.0)
    
    def _calculate_distance(self, manufacturer: Manufacturer, order: Order) -> Optional[float]:
        """Calculate distance using haversine formula"""
        
        if not all([manufacturer.latitude, manufacturer.longitude]):
            return None
        
        # For demonstration, we'll calculate distance to Warsaw (Poland's capital)
        # In production, you would get the client's coordinates from the order
        warsaw_lat, warsaw_lng = 52.2297, 21.0122
        
        return self._haversine_distance(
            float(manufacturer.latitude), 
            float(manufacturer.longitude),
            warsaw_lat, 
            warsaw_lng
        )
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance between two points on earth"""
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return c * r
    
    def _calculate_performance_score(self, manufacturer: Manufacturer, order: Order) -> float:
        """Calculate historical performance score"""
        
        if manufacturer.total_orders_completed == 0:
            return 0.3  # Neutral score for new manufacturers
        
        score = 0.0
        
        # Overall rating (40% of performance score)
        if manufacturer.overall_rating:
            rating_score = min(float(manufacturer.overall_rating) / 5.0, 1.0)
            score += rating_score * 0.4
        
        # On-time delivery rate (30% of performance score)
        if manufacturer.on_time_delivery_rate:
            delivery_score = manufacturer.on_time_delivery_rate / 100.0
            score += delivery_score * 0.3
        
        # Order completion experience (20% of performance score)
        completion_score = min(manufacturer.total_orders_completed / 50.0, 1.0)
        score += completion_score * 0.2
        
        # Response time and communication (10% of performance score)
        if manufacturer.communication_rating:
            comm_score = min(float(manufacturer.communication_rating) / 5.0, 1.0)
            score += comm_score * 0.1
        
        return min(score, 1.0)
    
    def _get_detailed_capability_matches(self, manufacturer: Manufacturer, order: Order) -> Dict[str, float]:
        """Get detailed breakdown of capability matches"""
        matches = {}
        
        if not manufacturer.capabilities or not order.technical_requirements:
            return matches
        
        tech_reqs = order.technical_requirements
        manufacturer_caps = manufacturer.capabilities
        
        # Process matching
        if 'manufacturing_process' in tech_reqs and 'manufacturing_processes' in manufacturer_caps:
            matches['manufacturing_process'] = self._fuzzy_match_list(
                tech_reqs['manufacturing_process'],
                manufacturer_caps['manufacturing_processes']
            )
        
        # Material matching
        if 'material' in tech_reqs and 'materials' in manufacturer_caps:
            matches['material'] = self._fuzzy_match_list(
                tech_reqs['material'],
                manufacturer_caps['materials']
            )
        
        # Industry matching
        if order.industry_category and 'industries_served' in manufacturer_caps:
            matches['industry'] = self._fuzzy_match_list(
                order.industry_category,
                manufacturer_caps['industries_served']
            )
        
        return matches
    
    def _generate_match_reasons(self, manufacturer: Manufacturer, order: Order, scores: Dict[str, float]) -> List[str]:
        """Generate human-readable match reasons"""
        reasons = []
        
        # High capability match
        if scores['capability'] > 0.8:
            reasons.append(f"Excellent capability match ({scores['capability']:.1%})")
        elif scores['capability'] > 0.6:
            reasons.append(f"Good capability match ({scores['capability']:.1%})")
        
        # Geographic proximity
        if scores['geographic'] > 0.8:
            reasons.append(f"Local manufacturer in {manufacturer.city}")
        elif scores['geographic'] > 0.6:
            reasons.append(f"Regional manufacturer in {manufacturer.city}")
        
        # High performance
        if scores['performance'] > 0.8:
            reasons.append(f"High-rated manufacturer ({manufacturer.overall_rating}/5.0)")
        
        # Experience
        if manufacturer.total_orders_completed >= 50:
            reasons.append(f"Highly experienced ({manufacturer.total_orders_completed} orders completed)")
        elif manufacturer.total_orders_completed >= 10:
            reasons.append(f"Experienced manufacturer ({manufacturer.total_orders_completed} orders)")
        
        # Certifications
        if manufacturer.quality_certifications:
            reasons.append(f"Quality certified ({', '.join(manufacturer.quality_certifications[:2])})")
        
        # Capacity availability
        if manufacturer.capacity_utilization_pct and manufacturer.capacity_utilization_pct < 70:
            reasons.append("Available capacity")
        
        return reasons
    
    def _assess_availability(self, manufacturer: Manufacturer, order: Order) -> str:
        """Assess manufacturer availability status"""
        
        if not manufacturer.is_active:
            return "inactive"
        
        if manufacturer.capacity_utilization_pct:
            if manufacturer.capacity_utilization_pct >= 95:
                return "at_capacity"
            elif manufacturer.capacity_utilization_pct >= 80:
                return "limited_capacity"
            else:
                return "available"
        
        return "status_unknown"
    
    def _estimate_lead_time(self, manufacturer: Manufacturer, order: Order) -> Optional[int]:
        """Estimate lead time for the order"""
        
        base_lead_time = manufacturer.standard_lead_time_days
        
        if not base_lead_time:
            return None
        
        # Adjust based on capacity utilization
        if manufacturer.capacity_utilization_pct:
            if manufacturer.capacity_utilization_pct >= 90:
                base_lead_time = int(base_lead_time * 1.3)
            elif manufacturer.capacity_utilization_pct >= 75:
                base_lead_time = int(base_lead_time * 1.1)
        
        # Rush order consideration
        if order.rush_order and manufacturer.rush_order_available:
            return manufacturer.rush_order_lead_time_days or base_lead_time
        
        return base_lead_time
    
    def _assess_risk_factors(self, manufacturer: Manufacturer, order: Order) -> List[str]:
        """Assess potential risk factors"""
        risks = []
        
        # New manufacturer
        if manufacturer.total_orders_completed < 5:
            risks.append("New manufacturer (limited track record)")
        
        # High capacity utilization
        if manufacturer.capacity_utilization_pct and manufacturer.capacity_utilization_pct > 90:
            risks.append("High capacity utilization")
        
        # Low rating
        if manufacturer.overall_rating and manufacturer.overall_rating < 3.5:
            risks.append("Below average rating")
        
        # Poor delivery record
        if manufacturer.on_time_delivery_rate and manufacturer.on_time_delivery_rate < 80:
            risks.append("Poor on-time delivery record")
        
        # Inactive recently
        if manufacturer.last_activity_date:
            days_inactive = (datetime.now() - manufacturer.last_activity_date).days
            if days_inactive > 30:
                risks.append("Inactive for over 30 days")
        
        return risks
    
    def _apply_business_filters(self, matches: List[MatchResult], order: Order) -> List[MatchResult]:
        """Apply business logic filters to matches"""
        
        filtered_matches = []
        
        for match in matches:
            # Skip if manufacturer is blacklisted for this client
            # (You would implement blacklist checking here)
            
            # Skip if manufacturer doesn't meet minimum requirements
            if match.total_score < self.min_match_score:
                continue
            
            # Skip if lead time exceeds deadline
            if match.estimated_lead_time and order.delivery_deadline:
                deadline_days = (order.delivery_deadline - datetime.now()).days
                if match.estimated_lead_time > deadline_days:
                    continue
            
            filtered_matches.append(match)
        
        return filtered_matches
    
    def _apply_fallback_strategy(self, db: Session, order: Order, max_results: int) -> List[MatchResult]:
        """Apply fallback strategies when no matches found"""
        
        logger.info(f"Applying fallback strategy for order {order.id}")
        
        # Strategy 1: Relax capability requirements
        relaxed_manufacturers = db.query(Manufacturer).filter(
            and_(
                Manufacturer.is_active == True,
                Manufacturer.is_verified == True
            )
        ).limit(max_results * 2).all()
        
        if relaxed_manufacturers:
            matches = []
            for manufacturer in relaxed_manufacturers:
                match_result = self._calculate_comprehensive_score(manufacturer, order)
                # Lower threshold for fallback
                if match_result.total_score >= 0.05:
                    match_result.match_reasons.append("Fallback match - relaxed criteria")
                    matches.append(match_result)
            
            matches.sort(key=lambda x: x.total_score, reverse=True)
            return matches[:max_results]
        
        return []
    
    def broadcast_to_multiple_manufacturers(
        self,
        db: Session,
        order: Order,
        manufacturer_ids: List[int]
    ) -> Dict[str, Any]:
        """Broadcast order to multiple manufacturers for competitive bidding"""
        
        logger.info(f"Broadcasting order {order.id} to {len(manufacturer_ids)} manufacturers")
        
        # Get manufacturers
        manufacturers = db.query(Manufacturer).filter(
            Manufacturer.id.in_(manufacturer_ids)
        ).all()
        
        broadcast_results = {
            'order_id': order.id,
            'broadcasted_to': [],
            'timestamp': datetime.now().isoformat(),
            'expected_responses': len(manufacturers)
        }
        
        for manufacturer in manufacturers:
            # Calculate basic score for reference
            match_result = self._calculate_comprehensive_score(manufacturer, order)
            
            broadcast_results['broadcasted_to'].append({
                'manufacturer_id': manufacturer.id,
                'business_name': manufacturer.business_name,
                'match_score': round(match_result.total_score, 3),
                'estimated_lead_time': match_result.estimated_lead_time
            })
        
        # Log broadcast event
        logger.info(f"Order {order.id} broadcasted successfully", extra={
            'order_id': order.id,
            'manufacturer_count': len(manufacturers),
            'broadcast_results': broadcast_results
        })
        
        return broadcast_results


# Create singleton instance
intelligent_matching_service = IntelligentMatchingService() 