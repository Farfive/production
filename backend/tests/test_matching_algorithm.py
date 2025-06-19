import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.services.intelligent_matching import IntelligentMatchingService, MatchingWeights, MatchResult
from app.models.producer import Manufacturer
from app.models.order import Order
from app.models.user import User


class TestIntelligentMatchingService:
    """Test suite for the intelligent matching algorithm"""
    
    @pytest.fixture
    def matching_service(self):
        """Create a matching service instance for testing"""
        weights = MatchingWeights(
            capability_weight=0.80,
            geographic_weight=0.15,
            performance_weight=0.05
        )
        return IntelligentMatchingService(weights)
    
    @pytest.fixture
    def sample_manufacturer(self):
        """Create a sample manufacturer for testing"""
        manufacturer = Mock(spec=Manufacturer)
        manufacturer.id = 1
        manufacturer.business_name = "Test Manufacturing Co"
        manufacturer.is_active = True
        manufacturer.is_verified = True
        manufacturer.stripe_onboarding_completed = True
        manufacturer.country = "PL"
        manufacturer.city = "Warsaw"
        manufacturer.latitude = 52.2297
        manufacturer.longitude = 21.0122
        manufacturer.overall_rating = 4.5
        manufacturer.total_orders_completed = 25
        manufacturer.on_time_delivery_rate = 95.0
        manufacturer.communication_rating = 4.8
        manufacturer.capacity_utilization_pct = 60.0
        manufacturer.standard_lead_time_days = 14
        manufacturer.rush_order_available = True
        manufacturer.rush_order_lead_time_days = 7
        manufacturer.min_order_quantity = 10
        manufacturer.max_order_quantity = 1000
        manufacturer.min_order_value_pln = 5000
        manufacturer.last_activity_date = datetime.now() - timedelta(days=2)
        manufacturer.quality_certifications = ["ISO 9001", "ISO 14001"]
        manufacturer.capabilities = {
            "manufacturing_processes": ["CNC Machining", "3D Printing"],
            "materials": ["Aluminum", "Steel", "Plastic"],
            "industries_served": ["Automotive", "Aerospace"],
            "certifications": ["ISO 9001", "AS9100"],
            "special_capabilities": ["Precision Machining", "Rapid Prototyping"]
        }
        return manufacturer
    
    @pytest.fixture
    def sample_order(self):
        """Create a sample order for testing"""
        order = Mock(spec=Order)
        order.id = 1
        order.title = "Test Order"
        order.client_id = 1
        order.quantity = 100
        order.delivery_deadline = datetime.now() + timedelta(days=30)
        order.preferred_country = "PL"
        order.max_distance_km = 200
        order.budget_max_pln = 50000
        order.industry_category = "Automotive"
        order.rush_order = False
        order.technical_requirements = {
            "manufacturing_process": "CNC Machining",
            "material": "Aluminum 6061",
            "industry_standards": ["ISO 9001"],
            "special_requirements": ["Precision Machining"]
        }
        return order
    
    def test_matching_weights_validation(self):
        """Test that matching weights are properly validated"""
        # Valid weights
        weights = MatchingWeights(0.7, 0.2, 0.1)
        weights.validate()
        
        # Invalid weights (don't sum to 1.0)
        invalid_weights = MatchingWeights(0.5, 0.3, 0.1)
        with pytest.raises(ValueError):
            invalid_weights.validate()
    
    def test_fuzzy_match_list(self, matching_service):
        """Test fuzzy string matching functionality"""
        candidates = ["CNC Machining", "3D Printing", "Injection Molding"]
        
        # Exact match
        score = matching_service._fuzzy_match_list("CNC Machining", candidates)
        assert score == 1.0
        
        # Partial match
        score = matching_service._fuzzy_match_list("CNC", candidates)
        assert score > 0.7
        
        # No match
        score = matching_service._fuzzy_match_list("Woodworking", candidates)
        assert score == 0.0
        
        # Empty candidates
        score = matching_service._fuzzy_match_list("CNC Machining", [])
        assert score == 0.0
    
    def test_capability_score_calculation(self, matching_service, sample_manufacturer, sample_order):
        """Test capability scoring algorithm"""
        score = matching_service._calculate_capability_score(sample_manufacturer, sample_order)
        
        assert 0.0 <= score <= 1.0
        assert score > 0.5  # Should be high due to good matches
    
    def test_geographic_score_calculation(self, matching_service, sample_manufacturer, sample_order):
        """Test geographic proximity scoring"""
        score = matching_service._calculate_geographic_score(sample_manufacturer, sample_order)
        
        assert 0.0 <= score <= 1.0
        assert score > 0.8  # Should be high for same country
    
    def test_performance_score_calculation(self, matching_service, sample_manufacturer, sample_order):
        """Test performance scoring based on historical data"""
        score = matching_service._calculate_performance_score(sample_manufacturer, sample_order)
        
        assert 0.0 <= score <= 1.0
        assert score > 0.8  # Should be high due to good ratings
    
    def test_haversine_distance_calculation(self, matching_service):
        """Test distance calculation using haversine formula"""
        # Distance between Warsaw and Krakow (approximately 290 km)
        warsaw_lat, warsaw_lng = 52.2297, 21.0122
        krakow_lat, krakow_lng = 50.0647, 19.9450
        
        distance = matching_service._haversine_distance(
            warsaw_lat, warsaw_lng, krakow_lat, krakow_lng
        )
        
        assert 280 <= distance <= 300  # Approximate distance
    
    def test_comprehensive_score_calculation(self, matching_service, sample_manufacturer, sample_order):
        """Test comprehensive scoring algorithm"""
        match_result = matching_service._calculate_comprehensive_score(sample_manufacturer, sample_order)
        
        assert isinstance(match_result, MatchResult)
        assert match_result.manufacturer == sample_manufacturer
        assert 0.0 <= match_result.total_score <= 1.0
        assert 0.0 <= match_result.capability_score <= 1.0
        assert 0.0 <= match_result.geographic_score <= 1.0
        assert 0.0 <= match_result.performance_score <= 1.0
        assert len(match_result.match_reasons) > 0
        assert match_result.availability_status in ["available", "limited_capacity", "at_capacity", "inactive", "status_unknown"]
    
    def test_availability_assessment(self, matching_service, sample_manufacturer, sample_order):
        """Test manufacturer availability assessment"""
        # Available capacity
        sample_manufacturer.capacity_utilization_pct = 60.0
        status = matching_service._assess_availability(sample_manufacturer, sample_order)
        assert status == "available"
        
        # Limited capacity
        sample_manufacturer.capacity_utilization_pct = 85.0
        status = matching_service._assess_availability(sample_manufacturer, sample_order)
        assert status == "limited_capacity"
        
        # At capacity
        sample_manufacturer.capacity_utilization_pct = 96.0
        status = matching_service._assess_availability(sample_manufacturer, sample_order)
        assert status == "at_capacity"
        
        # Inactive
        sample_manufacturer.is_active = False
        status = matching_service._assess_availability(sample_manufacturer, sample_order)
        assert status == "inactive"
    
    def test_lead_time_estimation(self, matching_service, sample_manufacturer, sample_order):
        """Test lead time estimation logic"""
        # Standard lead time
        lead_time = matching_service._estimate_lead_time(sample_manufacturer, sample_order)
        assert lead_time == 14
        
        # Rush order
        sample_order.rush_order = True
        lead_time = matching_service._estimate_lead_time(sample_manufacturer, sample_order)
        assert lead_time == 7
        
        # High capacity utilization adjustment
        sample_order.rush_order = False
        sample_manufacturer.capacity_utilization_pct = 92.0
        lead_time = matching_service._estimate_lead_time(sample_manufacturer, sample_order)
        assert lead_time > 14  # Should be adjusted upward
    
    def test_risk_factor_assessment(self, matching_service, sample_manufacturer, sample_order):
        """Test risk factor identification"""
        # Low risk manufacturer
        risks = matching_service._assess_risk_factors(sample_manufacturer, sample_order)
        assert len(risks) == 0
        
        # New manufacturer
        sample_manufacturer.total_orders_completed = 2
        risks = matching_service._assess_risk_factors(sample_manufacturer, sample_order)
        assert "New manufacturer" in " ".join(risks)
        
        # High capacity utilization
        sample_manufacturer.total_orders_completed = 25
        sample_manufacturer.capacity_utilization_pct = 95.0
        risks = matching_service._assess_risk_factors(sample_manufacturer, sample_order)
        assert "High capacity utilization" in " ".join(risks)
        
        # Low rating
        sample_manufacturer.capacity_utilization_pct = 60.0
        sample_manufacturer.overall_rating = 3.0
        risks = matching_service._assess_risk_factors(sample_manufacturer, sample_order)
        assert "Below average rating" in " ".join(risks)
    
    def test_match_result_to_dict(self, matching_service, sample_manufacturer, sample_order):
        """Test MatchResult serialization to dictionary"""
        match_result = matching_service._calculate_comprehensive_score(sample_manufacturer, sample_order)
        result_dict = match_result.to_dict()
        
        assert isinstance(result_dict, dict)
        assert 'manufacturer_id' in result_dict
        assert 'total_score' in result_dict
        assert 'capability_score' in result_dict
        assert 'geographic_score' in result_dict
        assert 'performance_score' in result_dict
        assert 'match_reasons' in result_dict
        assert 'availability_status' in result_dict
        assert 'estimated_lead_time' in result_dict
        assert 'risk_factors' in result_dict


class TestMatchingWeights:
    """Test matching weights configuration"""
    
    def test_default_weights(self):
        """Test default weight values"""
        weights = MatchingWeights()
        assert weights.capability_weight == 0.80
        assert weights.geographic_weight == 0.15
        assert weights.performance_weight == 0.05
    
    def test_custom_weights(self):
        """Test custom weight configuration"""
        weights = MatchingWeights(0.6, 0.3, 0.1)
        assert weights.capability_weight == 0.6
        assert weights.geographic_weight == 0.3
        assert weights.performance_weight == 0.1
    
    def test_weight_validation(self):
        """Test weight sum validation"""
        # Valid weights
        MatchingWeights(0.5, 0.3, 0.2).validate()
        
        # Invalid weights
        with pytest.raises(ValueError):
            MatchingWeights(0.5, 0.3, 0.1).validate()


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 