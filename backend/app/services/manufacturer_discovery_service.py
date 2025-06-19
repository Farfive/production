from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from datetime import datetime, timedelta
import math
import json
from loguru import logger
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.producer import Manufacturer
from app.models.order import Order
from app.models.quote import Quote
from app.models.user import User, UserRole
from app.core.config import settings


class ManufacturerDiscoveryService:
    """Advanced manufacturer discovery and matching service"""
    
    def __init__(self):
        self.geolocator = Nominatim(user_agent="manufacturing_platform")
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def discover_manufacturers(
        self,
        db: Session,
        search_criteria: Dict[str, Any],
        user_location: Optional[Dict[str, float]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Discover manufacturers based on comprehensive search criteria
        
        Args:
            search_criteria: Dict containing search parameters
            user_location: Optional user location for proximity scoring
            limit: Maximum number of results to return
        """
        
        # Build base query
        query = db.query(Manufacturer).filter(
            Manufacturer.is_active == True,
            Manufacturer.is_verified == True
        )
        
        # Apply filters
        query = self._apply_search_filters(query, search_criteria)
        
        # Get all matching manufacturers
        manufacturers = query.all()
        
        if not manufacturers:
            return []
        
        # Score and rank manufacturers
        scored_manufacturers = []
        for manufacturer in manufacturers:
            score_data = self._calculate_manufacturer_score(
                manufacturer, search_criteria, user_location
            )
            
            manufacturer_data = {
                "id": manufacturer.id,
                "business_name": manufacturer.business_name,
                "description": manufacturer.business_description,
                "location": {
                    "city": manufacturer.city,
                    "state": manufacturer.state_province,
                    "country": manufacturer.country
                },
                "rating": manufacturer.overall_rating,
                "review_count": manufacturer.total_reviews,
                "capabilities": manufacturer.capabilities,
                "certifications": self._extract_certifications(manufacturer),
                "performance_metrics": self._get_performance_metrics(manufacturer),
                "score": score_data["total_score"],
                "score_breakdown": score_data["breakdown"],
                "match_reasons": score_data["match_reasons"],
                "distance_km": score_data.get("distance_km"),
                "response_time_hours": manufacturer.average_response_time_hours,
                "completion_rate": manufacturer.completion_rate,
                "on_time_rate": manufacturer.on_time_delivery_rate,
                "verified": manufacturer.is_verified,
                "premium": getattr(manufacturer, 'is_premium', False)
            }
            
            scored_manufacturers.append(manufacturer_data)
        
        # Sort by score and return top results
        scored_manufacturers.sort(key=lambda x: x["score"], reverse=True)
        return scored_manufacturers[:limit]
    
    def find_similar_manufacturers(
        self,
        db: Session,
        manufacturer_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Find manufacturers similar to a given manufacturer"""
        
        target_manufacturer = db.query(Manufacturer).filter(
            Manufacturer.id == manufacturer_id
        ).first()
        
        if not target_manufacturer:
            return []
        
        # Get all other active manufacturers
        other_manufacturers = db.query(Manufacturer).filter(
            and_(
                Manufacturer.id != manufacturer_id,
                Manufacturer.is_active == True,
                Manufacturer.is_verified == True
            )
        ).all()
        
        # Calculate similarity scores
        similar_manufacturers = []
        for manufacturer in other_manufacturers:
            similarity_score = self._calculate_similarity_score(
                target_manufacturer, manufacturer
            )
            
            if similarity_score > 0.3:  # Minimum similarity threshold
                similar_manufacturers.append({
                    "manufacturer": manufacturer,
                    "similarity_score": similarity_score
                })
        
        # Sort by similarity and format results
        similar_manufacturers.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        results = []
        for item in similar_manufacturers[:limit]:
            manufacturer = item["manufacturer"]
            results.append({
                "id": manufacturer.id,
                "business_name": manufacturer.business_name,
                "description": manufacturer.business_description,
                "location": {
                    "city": manufacturer.city,
                    "country": manufacturer.country
                },
                "rating": manufacturer.overall_rating,
                "capabilities": manufacturer.capabilities,
                "similarity_score": round(item["similarity_score"], 3),
                "match_reasons": self._generate_similarity_reasons(
                    target_manufacturer, manufacturer
                )
            })
        
        return results
    
    def get_manufacturer_recommendations(
        self,
        db: Session,
        order: Order,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get AI-powered manufacturer recommendations for an order"""
        
        # Extract order requirements
        order_requirements = self._extract_order_requirements(order)
        
        # Build search criteria from order
        search_criteria = {
            "capabilities": order_requirements.get("required_capabilities", []),
            "materials": order_requirements.get("materials", []),
            "processes": order_requirements.get("processes", []),
            "quantity_range": order_requirements.get("quantity_range"),
            "delivery_deadline": order.delivery_deadline,
            "budget_range": order_requirements.get("budget_range"),
            "quality_requirements": order_requirements.get("quality_requirements", [])
        }
        
        # Add user preferences
        if user_preferences:
            search_criteria.update(user_preferences)
        
        # Get client location for proximity scoring
        client = db.query(User).filter(User.id == order.client_id).first()
        user_location = self._get_user_location(client) if client else None
        
        # Discover manufacturers
        manufacturers = self.discover_manufacturers(
            db=db,
            search_criteria=search_criteria,
            user_location=user_location,
            limit=15
        )
        
        # Add order-specific scoring
        for manufacturer in manufacturers:
            order_fit_score = self._calculate_order_fit_score(
                manufacturer, order, order_requirements
            )
            manufacturer["order_fit_score"] = order_fit_score
            manufacturer["total_score"] = (
                manufacturer["score"] * 0.7 + order_fit_score * 0.3
            )
        
        # Re-sort by total score
        manufacturers.sort(key=lambda x: x["total_score"], reverse=True)
        
        return manufacturers
    
    def search_manufacturers_by_text(
        self,
        db: Session,
        search_text: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search manufacturers using text-based search with AI similarity"""
        
        # Get all active manufacturers
        query = db.query(Manufacturer).filter(
            Manufacturer.is_active == True,
            Manufacturer.is_verified == True
        )
        
        # Apply additional filters
        if filters:
            query = self._apply_search_filters(query, filters)
        
        manufacturers = query.all()
        
        if not manufacturers:
            return []
        
        # Prepare text data for similarity analysis
        manufacturer_texts = []
        for manufacturer in manufacturers:
            text_data = self._prepare_manufacturer_text(manufacturer)
            manufacturer_texts.append(text_data)
        
        # Calculate text similarity
        if manufacturer_texts:
            # Add search text to the corpus
            all_texts = manufacturer_texts + [search_text]
            
            try:
                # Fit TF-IDF vectorizer
                tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)
                
                # Calculate similarity with search text (last item)
                search_vector = tfidf_matrix[-1]
                manufacturer_vectors = tfidf_matrix[:-1]
                
                similarities = cosine_similarity(search_vector, manufacturer_vectors).flatten()
                
                # Create results with similarity scores
                results = []
                for i, manufacturer in enumerate(manufacturers):
                    if similarities[i] > 0.1:  # Minimum similarity threshold
                        results.append({
                            "id": manufacturer.id,
                            "business_name": manufacturer.business_name,
                            "description": manufacturer.business_description,
                            "location": {
                                "city": manufacturer.city,
                                "country": manufacturer.country
                            },
                            "rating": manufacturer.overall_rating,
                            "capabilities": manufacturer.capabilities,
                            "similarity_score": round(similarities[i], 3),
                            "match_highlights": self._generate_match_highlights(
                                manufacturer, search_text
                            )
                        })
                
                # Sort by similarity score
                results.sort(key=lambda x: x["similarity_score"], reverse=True)
                return results[:limit]
                
            except Exception as e:
                logger.error(f"Error in text similarity calculation: {str(e)}")
                # Fallback to basic text search
                return self._fallback_text_search(manufacturers, search_text, limit)
        
        return []
    
    def get_manufacturer_analytics(
        self,
        db: Session,
        manufacturer_id: int
    ) -> Dict[str, Any]:
        """Get comprehensive analytics for a manufacturer"""
        
        manufacturer = db.query(Manufacturer).filter(
            Manufacturer.id == manufacturer_id
        ).first()
        
        if not manufacturer:
            return {}
        
        # Get quotes and orders data
        quotes = db.query(Quote).filter(Quote.manufacturer_id == manufacturer_id).all()
        
        # Calculate analytics
        analytics = {
            "basic_info": {
                "id": manufacturer.id,
                "business_name": manufacturer.business_name,
                "member_since": manufacturer.created_at.isoformat() if manufacturer.created_at else None,
                "verified": manufacturer.is_verified,
                "active": manufacturer.is_active
            },
            "performance_metrics": {
                "overall_rating": manufacturer.overall_rating,
                "total_reviews": manufacturer.total_reviews,
                "completion_rate": manufacturer.completion_rate,
                "on_time_delivery_rate": manufacturer.on_time_delivery_rate,
                "average_response_time_hours": manufacturer.average_response_time_hours,
                "total_orders_completed": manufacturer.total_orders_completed
            },
            "quote_analytics": self._calculate_quote_analytics(quotes),
            "capability_analysis": self._analyze_capabilities(manufacturer),
            "market_position": self._calculate_market_position(db, manufacturer),
            "growth_trends": self._calculate_growth_trends(db, manufacturer),
            "competitive_analysis": self._get_competitive_analysis(db, manufacturer)
        }
        
        return analytics
    
    # Private helper methods
    
    def _apply_search_filters(self, query, search_criteria: Dict[str, Any]):
        """Apply search filters to the manufacturer query"""
        
        # Location filters
        if search_criteria.get("country"):
            query = query.filter(Manufacturer.country == search_criteria["country"])
        
        if search_criteria.get("state"):
            query = query.filter(Manufacturer.state_province == search_criteria["state"])
        
        if search_criteria.get("city"):
            query = query.filter(Manufacturer.city.ilike(f"%{search_criteria['city']}%"))
        
        # Rating filter
        if search_criteria.get("min_rating"):
            query = query.filter(Manufacturer.overall_rating >= search_criteria["min_rating"])
        
        # Capability filters (JSON search)
        if search_criteria.get("capabilities"):
            for capability in search_criteria["capabilities"]:
                query = query.filter(
                    func.json_extract(Manufacturer.capabilities, '$.manufacturing_processes').like(f'%{capability}%')
                )
        
        if search_criteria.get("materials"):
            for material in search_criteria["materials"]:
                query = query.filter(
                    func.json_extract(Manufacturer.capabilities, '$.materials').like(f'%{material}%')
                )
        
        # Certification filters
        if search_criteria.get("certifications"):
            for cert in search_criteria["certifications"]:
                query = query.filter(
                    func.json_extract(Manufacturer.capabilities, '$.certifications').like(f'%{cert}%')
                )
        
        return query
    
    def _calculate_manufacturer_score(
        self,
        manufacturer: Manufacturer,
        search_criteria: Dict[str, Any],
        user_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive score for a manufacturer"""
        
        scores = {}
        match_reasons = []
        
        # Performance score (0-100)
        performance_score = self._calculate_performance_score(manufacturer)
        scores["performance"] = performance_score
        
        if performance_score > 80:
            match_reasons.append("Excellent performance history")
        elif performance_score > 60:
            match_reasons.append("Good performance record")
        
        # Capability match score (0-100)
        capability_score = self._calculate_capability_match_score(
            manufacturer, search_criteria
        )
        scores["capability_match"] = capability_score
        
        if capability_score > 80:
            match_reasons.append("Strong capability match")
        
        # Quality score (0-100)
        quality_score = self._calculate_quality_score(manufacturer)
        scores["quality"] = quality_score
        
        if quality_score > 85:
            match_reasons.append("High quality rating")
        
        # Proximity score (0-100)
        proximity_score = 50  # Default if no location
        distance_km = None
        
        if user_location and manufacturer.latitude and manufacturer.longitude:
            distance_km = self._calculate_distance(
                user_location, 
                {"lat": float(manufacturer.latitude), "lng": float(manufacturer.longitude)}
            )
            proximity_score = self._distance_to_score(distance_km)
            
            if distance_km < 100:
                match_reasons.append("Local manufacturer")
            elif distance_km < 500:
                match_reasons.append("Regional manufacturer")
        
        scores["proximity"] = proximity_score
        
        # Reliability score (0-100)
        reliability_score = self._calculate_reliability_score(manufacturer)
        scores["reliability"] = reliability_score
        
        if reliability_score > 80:
            match_reasons.append("Highly reliable")
        
        # Calculate weighted total score
        weights = {
            "performance": 0.25,
            "capability_match": 0.30,
            "quality": 0.20,
            "proximity": 0.15,
            "reliability": 0.10
        }
        
        total_score = sum(scores[key] * weights[key] for key in scores)
        
        return {
            "total_score": round(total_score, 2),
            "breakdown": scores,
            "match_reasons": match_reasons,
            "distance_km": distance_km
        }
    
    def _calculate_performance_score(self, manufacturer: Manufacturer) -> float:
        """Calculate performance score based on historical data"""
        
        # Base score from completion rate
        completion_score = (manufacturer.completion_rate or 0.8) * 50
        
        # On-time delivery score
        on_time_score = (manufacturer.on_time_delivery_rate or 0.8) * 30
        
        # Response time score (faster = better)
        response_time_hours = manufacturer.average_response_time_hours or 24
        response_score = max(0, 20 - (response_time_hours / 24) * 20)
        
        return min(100, completion_score + on_time_score + response_score)
    
    def _calculate_capability_match_score(
        self,
        manufacturer: Manufacturer,
        search_criteria: Dict[str, Any]
    ) -> float:
        """Calculate how well manufacturer capabilities match search criteria"""
        
        if not manufacturer.capabilities:
            return 30  # Default score for manufacturers without detailed capabilities
        
        capabilities = manufacturer.capabilities
        score = 0
        max_score = 0
        
        # Check manufacturing processes
        if search_criteria.get("capabilities"):
            required_processes = search_criteria["capabilities"]
            available_processes = capabilities.get("manufacturing_processes", [])
            
            for process in required_processes:
                max_score += 20
                if any(process.lower() in str(available).lower() for available in available_processes):
                    score += 20
        
        # Check materials
        if search_criteria.get("materials"):
            required_materials = search_criteria["materials"]
            available_materials = capabilities.get("materials", [])
            
            for material in required_materials:
                max_score += 15
                if any(material.lower() in str(available).lower() for available in available_materials):
                    score += 15
        
        # Check certifications
        if search_criteria.get("certifications"):
            required_certs = search_criteria["certifications"]
            available_certs = capabilities.get("certifications", [])
            
            for cert in required_certs:
                max_score += 10
                if any(cert.lower() in str(available).lower() for available in available_certs):
                    score += 10
        
        # If no specific requirements, give a base score
        if max_score == 0:
            return 70
        
        return min(100, (score / max_score) * 100)
    
    def _calculate_quality_score(self, manufacturer: Manufacturer) -> float:
        """Calculate quality score based on ratings and reviews"""
        
        rating = manufacturer.overall_rating or 3.0
        review_count = manufacturer.total_reviews or 0
        
        # Base score from rating (0-5 scale to 0-100)
        rating_score = (rating / 5.0) * 80
        
        # Bonus for having many reviews (credibility)
        review_bonus = min(20, (review_count / 50) * 20)
        
        return min(100, rating_score + review_bonus)
    
    def _calculate_distance(
        self,
        location1: Dict[str, float],
        location2: Dict[str, float]
    ) -> float:
        """Calculate distance between two locations in kilometers"""
        
        try:
            point1 = (location1["lat"], location1["lng"])
            point2 = (location2["lat"], location2["lng"])
            return geodesic(point1, point2).kilometers
        except Exception:
            return 1000  # Default large distance if calculation fails
    
    def _distance_to_score(self, distance_km: float) -> float:
        """Convert distance to proximity score (0-100)"""
        
        if distance_km <= 50:
            return 100
        elif distance_km <= 200:
            return 80
        elif distance_km <= 500:
            return 60
        elif distance_km <= 1000:
            return 40
        elif distance_km <= 2000:
            return 20
        else:
            return 10
    
    def _calculate_reliability_score(self, manufacturer: Manufacturer) -> float:
        """Calculate reliability score"""
        
        # Factors: verification status, time in business, order history
        score = 0
        
        # Verification bonus
        if manufacturer.is_verified:
            score += 30
        
        # Time in business (based on created_at)
        if manufacturer.created_at:
            days_active = (datetime.now() - manufacturer.created_at).days
            time_bonus = min(30, (days_active / 365) * 10)  # Max 30 points for 3+ years
            score += time_bonus
        
        # Order completion history
        total_orders = manufacturer.total_orders_completed or 0
        order_bonus = min(40, (total_orders / 100) * 40)  # Max 40 points for 100+ orders
        score += order_bonus
        
        return min(100, score)
    
    def _calculate_similarity_score(
        self,
        manufacturer1: Manufacturer,
        manufacturer2: Manufacturer
    ) -> float:
        """Calculate similarity score between two manufacturers"""
        
        similarity = 0
        factors = 0
        
        # Location similarity
        if (manufacturer1.country == manufacturer2.country):
            similarity += 0.2
            if manufacturer1.state_province == manufacturer2.state_province:
                similarity += 0.1
        factors += 1
        
        # Capability similarity
        if manufacturer1.capabilities and manufacturer2.capabilities:
            cap_similarity = self._calculate_capability_similarity(
                manufacturer1.capabilities, manufacturer2.capabilities
            )
            similarity += cap_similarity * 0.4
        factors += 1
        
        # Rating similarity
        if manufacturer1.overall_rating and manufacturer2.overall_rating:
            rating_diff = abs(manufacturer1.overall_rating - manufacturer2.overall_rating)
            rating_similarity = max(0, 1 - (rating_diff / 5))
            similarity += rating_similarity * 0.2
        factors += 1
        
        # Size similarity (based on order volume)
        orders1 = manufacturer1.total_orders_completed or 0
        orders2 = manufacturer2.total_orders_completed or 0
        
        if orders1 > 0 and orders2 > 0:
            size_ratio = min(orders1, orders2) / max(orders1, orders2)
            similarity += size_ratio * 0.1
        factors += 1
        
        return similarity / factors if factors > 0 else 0
    
    def _calculate_capability_similarity(
        self,
        capabilities1: Dict[str, Any],
        capabilities2: Dict[str, Any]
    ) -> float:
        """Calculate similarity between capability sets"""
        
        similarity = 0
        comparisons = 0
        
        # Compare manufacturing processes
        processes1 = set(capabilities1.get("manufacturing_processes", []))
        processes2 = set(capabilities2.get("manufacturing_processes", []))
        
        if processes1 or processes2:
            intersection = len(processes1.intersection(processes2))
            union = len(processes1.union(processes2))
            if union > 0:
                similarity += intersection / union
            comparisons += 1
        
        # Compare materials
        materials1 = set(capabilities1.get("materials", []))
        materials2 = set(capabilities2.get("materials", []))
        
        if materials1 or materials2:
            intersection = len(materials1.intersection(materials2))
            union = len(materials1.union(materials2))
            if union > 0:
                similarity += intersection / union
            comparisons += 1
        
        # Compare certifications
        certs1 = set(capabilities1.get("certifications", []))
        certs2 = set(capabilities2.get("certifications", []))
        
        if certs1 or certs2:
            intersection = len(certs1.intersection(certs2))
            union = len(certs1.union(certs2))
            if union > 0:
                similarity += intersection / union
            comparisons += 1
        
        return similarity / comparisons if comparisons > 0 else 0
    
    def _extract_certifications(self, manufacturer: Manufacturer) -> List[str]:
        """Extract certifications from manufacturer capabilities"""
        
        if not manufacturer.capabilities:
            return []
        
        return manufacturer.capabilities.get("certifications", [])
    
    def _get_performance_metrics(self, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Get performance metrics for a manufacturer"""
        
        return {
            "completion_rate": manufacturer.completion_rate,
            "on_time_delivery_rate": manufacturer.on_time_delivery_rate,
            "average_response_time_hours": manufacturer.average_response_time_hours,
            "total_orders_completed": manufacturer.total_orders_completed,
            "capacity_utilization": getattr(manufacturer, 'capacity_utilization_pct', None)
        }
    
    def _extract_order_requirements(self, order: Order) -> Dict[str, Any]:
        """Extract requirements from an order"""
        
        # This would parse order description, specifications, etc.
        # For now, return basic structure
        return {
            "required_capabilities": [],
            "materials": [],
            "processes": [],
            "quantity_range": getattr(order, 'quantity', None),
            "budget_range": None,
            "quality_requirements": []
        }
    
    def _get_user_location(self, user: User) -> Optional[Dict[str, float]]:
        """Get user location coordinates"""
        
        # This would get location from user profile
        # For now, return None
        return None
    
    def _calculate_order_fit_score(
        self,
        manufacturer: Dict[str, Any],
        order: Order,
        order_requirements: Dict[str, Any]
    ) -> float:
        """Calculate how well a manufacturer fits a specific order"""
        
        # This would analyze order-specific fit
        # For now, return a base score
        return 75.0
    
    def _prepare_manufacturer_text(self, manufacturer: Manufacturer) -> str:
        """Prepare manufacturer text data for similarity analysis"""
        
        text_parts = []
        
        if manufacturer.business_name:
            text_parts.append(manufacturer.business_name)
        
        if manufacturer.business_description:
            text_parts.append(manufacturer.business_description)
        
        if manufacturer.capabilities:
            # Add capabilities as text
            for key, value in manufacturer.capabilities.items():
                if isinstance(value, list):
                    text_parts.extend(value)
                elif isinstance(value, str):
                    text_parts.append(value)
        
        return " ".join(text_parts)
    
    def _generate_match_highlights(
        self,
        manufacturer: Manufacturer,
        search_text: str
    ) -> List[str]:
        """Generate match highlights for search results"""
        
        highlights = []
        search_terms = search_text.lower().split()
        
        # Check business name
        if any(term in manufacturer.business_name.lower() for term in search_terms):
            highlights.append(f"Business name matches: {manufacturer.business_name}")
        
        # Check description
        if manufacturer.business_description:
            if any(term in manufacturer.business_description.lower() for term in search_terms):
                highlights.append("Description contains matching terms")
        
        # Check capabilities
        if manufacturer.capabilities:
            for key, value in manufacturer.capabilities.items():
                if isinstance(value, list):
                    for item in value:
                        if any(term in str(item).lower() for term in search_terms):
                            highlights.append(f"Capability match: {item}")
                            break
        
        return highlights[:3]  # Limit to top 3 highlights
    
    def _fallback_text_search(
        self,
        manufacturers: List[Manufacturer],
        search_text: str,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fallback text search when TF-IDF fails"""
        
        search_terms = search_text.lower().split()
        results = []
        
        for manufacturer in manufacturers:
            score = 0
            
            # Check business name
            if any(term in manufacturer.business_name.lower() for term in search_terms):
                score += 0.5
            
            # Check description
            if manufacturer.business_description:
                if any(term in manufacturer.business_description.lower() for term in search_terms):
                    score += 0.3
            
            # Check capabilities
            if manufacturer.capabilities:
                capability_text = json.dumps(manufacturer.capabilities).lower()
                if any(term in capability_text for term in search_terms):
                    score += 0.2
            
            if score > 0:
                results.append({
                    "id": manufacturer.id,
                    "business_name": manufacturer.business_name,
                    "description": manufacturer.business_description,
                    "location": {
                        "city": manufacturer.city,
                        "country": manufacturer.country
                    },
                    "rating": manufacturer.overall_rating,
                    "capabilities": manufacturer.capabilities,
                    "similarity_score": round(score, 3),
                    "match_highlights": self._generate_match_highlights(manufacturer, search_text)
                })
        
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:limit]
    
    def _generate_similarity_reasons(
        self,
        manufacturer1: Manufacturer,
        manufacturer2: Manufacturer
    ) -> List[str]:
        """Generate reasons why two manufacturers are similar"""
        
        reasons = []
        
        # Location similarity
        if manufacturer1.country == manufacturer2.country:
            reasons.append(f"Both located in {manufacturer1.country}")
        
        # Capability similarity
        if manufacturer1.capabilities and manufacturer2.capabilities:
            common_processes = set(manufacturer1.capabilities.get("manufacturing_processes", [])).intersection(
                set(manufacturer2.capabilities.get("manufacturing_processes", []))
            )
            if common_processes:
                reasons.append(f"Shared capabilities: {', '.join(list(common_processes)[:2])}")
        
        # Rating similarity
        if manufacturer1.overall_rating and manufacturer2.overall_rating:
            if abs(manufacturer1.overall_rating - manufacturer2.overall_rating) < 0.5:
                reasons.append("Similar quality ratings")
        
        return reasons[:3]
    
    def _calculate_quote_analytics(self, quotes: List[Quote]) -> Dict[str, Any]:
        """Calculate analytics from quote history"""
        
        if not quotes:
            return {
                "total_quotes": 0,
                "average_quote_value": 0,
                "quote_acceptance_rate": 0,
                "average_response_time": 0
            }
        
        total_value = sum(float(quote.price_total) for quote in quotes)
        accepted_quotes = [q for q in quotes if q.status.value == "accepted"]
        
        return {
            "total_quotes": len(quotes),
            "average_quote_value": total_value / len(quotes),
            "quote_acceptance_rate": len(accepted_quotes) / len(quotes) * 100,
            "average_response_time": 24  # Placeholder
        }
    
    def _analyze_capabilities(self, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Analyze manufacturer capabilities"""
        
        if not manufacturer.capabilities:
            return {"analysis": "No detailed capabilities available"}
        
        capabilities = manufacturer.capabilities
        
        return {
            "manufacturing_processes": len(capabilities.get("manufacturing_processes", [])),
            "materials_supported": len(capabilities.get("materials", [])),
            "certifications_count": len(capabilities.get("certifications", [])),
            "specializations": capabilities.get("special_capabilities", [])
        }
    
    def _calculate_market_position(self, db: Session, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Calculate manufacturer's market position"""
        
        # Get industry averages
        avg_rating = db.query(func.avg(Manufacturer.overall_rating)).scalar() or 3.0
        avg_orders = db.query(func.avg(Manufacturer.total_orders_completed)).scalar() or 10
        
        return {
            "rating_percentile": self._calculate_percentile(
                manufacturer.overall_rating or 3.0, avg_rating
            ),
            "volume_percentile": self._calculate_percentile(
                manufacturer.total_orders_completed or 0, avg_orders
            ),
            "market_segment": self._determine_market_segment(manufacturer)
        }
    
    def _calculate_percentile(self, value: float, average: float) -> int:
        """Calculate percentile position (simplified)"""
        
        if value >= average * 1.5:
            return 90
        elif value >= average * 1.2:
            return 75
        elif value >= average:
            return 60
        elif value >= average * 0.8:
            return 40
        else:
            return 25
    
    def _determine_market_segment(self, manufacturer: Manufacturer) -> str:
        """Determine manufacturer's market segment"""
        
        orders = manufacturer.total_orders_completed or 0
        rating = manufacturer.overall_rating or 3.0
        
        if orders > 100 and rating > 4.5:
            return "Premium"
        elif orders > 50 and rating > 4.0:
            return "Established"
        elif orders > 10:
            return "Growing"
        else:
            return "Emerging"
    
    def _calculate_growth_trends(self, db: Session, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Calculate growth trends (simplified)"""
        
        # This would analyze historical data
        return {
            "order_growth": "stable",
            "rating_trend": "improving",
            "capacity_trend": "expanding"
        }
    
    def _get_competitive_analysis(self, db: Session, manufacturer: Manufacturer) -> Dict[str, Any]:
        """Get competitive analysis"""
        
        # Find similar manufacturers for comparison
        similar_manufacturers = db.query(Manufacturer).filter(
            and_(
                Manufacturer.id != manufacturer.id,
                Manufacturer.country == manufacturer.country,
                Manufacturer.is_active == True
            )
        ).limit(5).all()
        
        if not similar_manufacturers:
            return {"analysis": "No comparable manufacturers found"}
        
        avg_rating = sum(m.overall_rating or 3.0 for m in similar_manufacturers) / len(similar_manufacturers)
        avg_orders = sum(m.total_orders_completed or 0 for m in similar_manufacturers) / len(similar_manufacturers)
        
        return {
            "competitive_position": {
                "rating_vs_competitors": "above_average" if (manufacturer.overall_rating or 3.0) > avg_rating else "below_average",
                "volume_vs_competitors": "above_average" if (manufacturer.total_orders_completed or 0) > avg_orders else "below_average"
            },
            "key_differentiators": self._identify_differentiators(manufacturer, similar_manufacturers)
        }
    
    def _identify_differentiators(
        self,
        manufacturer: Manufacturer,
        competitors: List[Manufacturer]
    ) -> List[str]:
        """Identify key differentiators"""
        
        differentiators = []
        
        # Rating advantage
        if manufacturer.overall_rating:
            avg_competitor_rating = sum(c.overall_rating or 3.0 for c in competitors) / len(competitors)
            if manufacturer.overall_rating > avg_competitor_rating + 0.5:
                differentiators.append("Superior quality rating")
        
        # Unique capabilities
        if manufacturer.capabilities:
            manufacturer_processes = set(manufacturer.capabilities.get("manufacturing_processes", []))
            competitor_processes = set()
            for competitor in competitors:
                if competitor.capabilities:
                    competitor_processes.update(competitor.capabilities.get("manufacturing_processes", []))
            
            unique_processes = manufacturer_processes - competitor_processes
            if unique_processes:
                differentiators.append(f"Unique capabilities: {', '.join(list(unique_processes)[:2])}")
        
        return differentiators[:3] 