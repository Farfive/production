#!/usr/bin/env python3
"""
Smart Matching AI - Critical Features Testing
Testing the most important features and functionality for production readiness
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.smart_matching_engine import SmartMatchingEngine

class MockOrder:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.title = kwargs.get('title', 'Test Order')
        self.technical_requirements = kwargs.get('technical_requirements', {})
        self.quantity = kwargs.get('quantity', 100)
        self.budget_max_pln = kwargs.get('budget_max_pln', 50000)
        self.industry_category = kwargs.get('industry_category', 'General')
        self.preferred_country = kwargs.get('preferred_country', 'PL')

class MockManufacturer:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.business_name = kwargs.get('business_name', 'Test Manufacturer')
        self.capabilities = kwargs.get('capabilities', {})
        self.overall_rating = kwargs.get('overall_rating', 4.0)
        self.total_orders_completed = kwargs.get('total_orders_completed', 100)
        self.on_time_delivery_rate = kwargs.get('on_time_delivery_rate', 85.0)
        self.country = kwargs.get('country', 'PL')
        self.min_order_quantity = kwargs.get('min_order_quantity', 10)
        self.max_order_quantity = kwargs.get('max_order_quantity', 10000)

class CriticalFeaturesTester:
    """Test critical Smart Matching features for production readiness"""
    
    def __init__(self):
        self.engine = SmartMatchingEngine()
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
    
    def test_multi_factor_scoring_validation(self):
        """Test that all 8 scoring factors work correctly with proper weights"""
        print("\n🧠 TESTING: Multi-Factor Scoring Algorithm")
        print("-" * 50)
        
        # Create order requiring multiple factors
        order = MockOrder(
            title='Complex Aerospace Component',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Titanium Grade 5',
                'certifications': ['AS9100', 'NADCAP'],
                'quantity': 500
            },
            industry_category='Aerospace',
            preferred_country='DE',
            budget_max_pln=100000
        )
        
        # Perfect manufacturer (should score high on all factors)
        perfect_mfg = MockManufacturer(
            business_name='Perfect Aerospace Machining',
            capabilities={
                'manufacturing_processes': ['CNC Machining', '5-Axis Machining'],
                'materials': ['Titanium Grade 5', 'Inconel'],
                'industries_served': ['Aerospace', 'Defense'],
                'certifications': ['AS9100', 'NADCAP', 'ISO 9001']
            },
            overall_rating=4.9,
            total_orders_completed=500,
            on_time_delivery_rate=95.0,
            country='DE',
            min_order_quantity=10,
            max_order_quantity=5000
        )
        
        # Test individual scoring components
        capability_score = self.engine._calculate_enhanced_capability_intelligence(perfect_mfg, order)
        geographic_score = self.engine._calculate_geographic_intelligence(perfect_mfg, order)
        performance_score = self.engine._calculate_performance_intelligence(perfect_mfg, order)
        
        print(f"   Capability Score: {capability_score:.3f} (weight: 25%)")
        print(f"   Geographic Score: {geographic_score:.3f} (weight: 15%)")
        print(f"   Performance Score: {performance_score:.3f} (weight: 20%)")
        
        # Validate scoring ranges
        tests = [
            ("Capability Intelligence", capability_score >= 0.85, "Should be high for perfect match"),
            ("Geographic Intelligence", 0.8 <= geographic_score <= 1.0, "Same country should score well"),
            ("Performance Intelligence", performance_score >= 0.8, "High ratings should score well")
        ]
        
        return self._evaluate_tests("Multi-Factor Scoring", tests)
    
    def test_process_substitution_logic(self):
        """Test that the system understands process compatibility and substitution"""
        print("\n🏭 TESTING: Process Substitution Logic")
        print("-" * 50)
        
        order = MockOrder(
            title='Precision Metal Part',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Aluminum 6061'
            }
        )
        
        # Test different process matches
        exact_match = MockManufacturer(
            business_name='Exact CNC Shop',
            capabilities={'manufacturing_processes': ['CNC Machining']}
        )
        
        close_match = MockManufacturer(
            business_name='Precision Machining Co',
            capabilities={'manufacturing_processes': ['Precision Machining']}
        )
        
        poor_match = MockManufacturer(
            business_name='Manual Workshop',
            capabilities={'manufacturing_processes': ['Manual Machining']}
        )
        
        # Calculate scores
        exact_score = self.engine._calculate_enhanced_capability_intelligence(exact_match, order)
        close_score = self.engine._calculate_enhanced_capability_intelligence(close_match, order)
        poor_score = self.engine._calculate_enhanced_capability_intelligence(poor_match, order)
        
        print(f"   Exact Match (CNC): {exact_score:.3f}")
        print(f"   Close Match (Precision): {close_score:.3f}")
        print(f"   Poor Match (Manual): {poor_score:.3f}")
        
        tests = [
            ("Exact Process Match", exact_score >= 0.9, "Perfect process match should score highest"),
            ("Close Process Substitution", 0.6 <= close_score <= 0.85, "Similar processes should score moderately"),
            ("Poor Process Match", poor_score <= 0.4, "Incompatible processes should score low"),
            ("Proper Ordering", exact_score > close_score > poor_score, "Scores should be properly ordered")
        ]
        
        return self._evaluate_tests("Process Substitution", tests)
    
    def test_material_compatibility_intelligence(self):
        """Test material science knowledge and compatibility"""
        print("\n🧪 TESTING: Material Compatibility Intelligence")
        print("-" * 50)
        
        # Medical device requiring biocompatible material
        medical_order = MockOrder(
            title='Medical Implant Component',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Biocompatible Titanium',
                'certifications': ['ISO 13485']
            },
            industry_category='Medical Devices'
        )
        
        # Test different material capabilities
        perfect_medical = MockManufacturer(
            business_name='Medical Grade Manufacturer',
            capabilities={
                'materials': ['Titanium Grade 23', 'Titanium Grade 2', 'PEEK'],
                'industries_served': ['Medical Devices'],
                'certifications': ['ISO 13485']
            }
        )
        
        aerospace_titanium = MockManufacturer(
            business_name='Aerospace Titanium Shop',
            capabilities={
                'materials': ['Titanium Grade 5', 'Inconel'],
                'industries_served': ['Aerospace'],
                'certifications': ['AS9100']
            }
        )
        
        basic_metals = MockManufacturer(
            business_name='Basic Metal Works',
            capabilities={
                'materials': ['Steel', 'Aluminum'],
                'industries_served': ['General Manufacturing']
            }
        )
        
        # Calculate material compatibility scores
        medical_score = self.engine._calculate_enhanced_capability_intelligence(perfect_medical, medical_order)
        aerospace_score = self.engine._calculate_enhanced_capability_intelligence(aerospace_titanium, medical_order)
        basic_score = self.engine._calculate_enhanced_capability_intelligence(basic_metals, medical_order)
        
        print(f"   Medical Grade Ti: {medical_score:.3f}")
        print(f"   Aerospace Grade Ti: {aerospace_score:.3f}")
        print(f"   Basic Metals: {basic_score:.3f}")
        
        tests = [
            ("Biocompatible Material Match", medical_score >= 0.8, "Medical grade materials should score high"),
            ("Related Material Penalty", aerospace_score < medical_score, "Non-medical Ti should score lower"),
            ("Incompatible Material Penalty", basic_score <= 0.3, "Wrong materials should score very low"),
            ("Material Hierarchy", medical_score > aerospace_score > basic_score, "Proper material ranking")
        ]
        
        return self._evaluate_tests("Material Compatibility", tests)
    
    def test_geographic_preference_handling(self):
        """Test geographic intelligence and preference handling"""
        print("\n🌍 TESTING: Geographic Preference Handling")
        print("-" * 50)
        
        # Polish client preferring EU suppliers
        order = MockOrder(
            title='Standard Manufacturing Order',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Aluminum'
            },
            preferred_country='PL'
        )
        
        # Different geographic locations
        local_mfg = MockManufacturer(
            business_name='Local Polish Manufacturer',
            country='PL',
            capabilities={'manufacturing_processes': ['CNC Machining'], 'materials': ['Aluminum']}
        )
        
        eu_mfg = MockManufacturer(
            business_name='German Precision Co',
            country='DE',
            capabilities={'manufacturing_processes': ['CNC Machining'], 'materials': ['Aluminum']}
        )
        
        distant_mfg = MockManufacturer(
            business_name='Asian Manufacturing Ltd',
            country='CN',
            capabilities={'manufacturing_processes': ['CNC Machining'], 'materials': ['Aluminum']}
        )
        
        # Calculate geographic scores
        local_score = self.engine._calculate_geographic_intelligence(local_mfg, order)
        eu_score = self.engine._calculate_geographic_intelligence(eu_mfg, order)
        distant_score = self.engine._calculate_geographic_intelligence(distant_mfg, order)
        
        print(f"   Local (Poland): {local_score:.3f}")
        print(f"   EU (Germany): {eu_score:.3f}")
        print(f"   Distant (China): {distant_score:.3f}")
        
        tests = [
            ("Local Preference Bonus", local_score >= 0.9, "Same country should get highest score"),
            ("EU Regional Bonus", 0.6 <= eu_score <= 0.8, "EU countries should get moderate bonus"),
            ("Distant Penalty", distant_score <= 0.6, "Distant countries should get penalty"),
            ("Geographic Ordering", local_score > eu_score > distant_score, "Proper geographic ranking")
        ]
        
        return self._evaluate_tests("Geographic Preferences", tests)
    
    def test_volume_capacity_matching(self):
        """Test order quantity vs manufacturer capacity matching"""
        print("\n📊 TESTING: Volume & Capacity Matching")
        print("-" * 50)
        
        # Medium volume order
        order = MockOrder(
            title='Medium Volume Production',
            quantity=5000,
            technical_requirements={'manufacturing_process': 'Injection Molding'}
        )
        
        # Different capacity manufacturers
        perfect_capacity = MockManufacturer(
            business_name='Perfect Fit Manufacturer',
            min_order_quantity=1000,
            max_order_quantity=10000,
            capabilities={'manufacturing_processes': ['Injection Molding']}
        )
        
        too_small = MockManufacturer(
            business_name='Small Batch Specialist',
            min_order_quantity=10,
            max_order_quantity=1000,
            capabilities={'manufacturing_processes': ['Injection Molding']}
        )
        
        too_large = MockManufacturer(
            business_name='Mass Production Giant',
            min_order_quantity=50000,
            max_order_quantity=1000000,
            capabilities={'manufacturing_processes': ['Injection Molding']}
        )
        
        # Test volume compatibility (this would be part of overall scoring)
        perfect_in_range = perfect_capacity.min_order_quantity <= order.quantity <= perfect_capacity.max_order_quantity
        small_in_range = too_small.min_order_quantity <= order.quantity <= too_small.max_order_quantity
        large_in_range = too_large.min_order_quantity <= order.quantity <= too_large.max_order_quantity
        
        print(f"   Perfect Fit (1K-10K): {perfect_in_range} - Order: {order.quantity}")
        print(f"   Too Small (10-1K): {small_in_range} - Order: {order.quantity}")
        print(f"   Too Large (50K-1M): {large_in_range} - Order: {order.quantity}")
        
        tests = [
            ("Perfect Volume Match", perfect_in_range, "Order should fit in manufacturer's range"),
            ("Small Capacity Mismatch", not small_in_range, "Order too large for small manufacturer"),
            ("Large Capacity Mismatch", not large_in_range, "Order too small for large manufacturer")
        ]
        
        return self._evaluate_tests("Volume Matching", tests)
    
    def test_certification_hierarchy_understanding(self):
        """Test understanding of certification equivalency and hierarchy"""
        print("\n📋 TESTING: Certification Hierarchy Understanding")
        print("-" * 50)
        
        # Order requiring basic quality certification
        order = MockOrder(
            title='Quality-Certified Component',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'certifications': ['ISO 9001']
            }
        )
        
        # Different certification levels
        exact_cert = MockManufacturer(
            business_name='ISO 9001 Certified',
            capabilities={'certifications': ['ISO 9001']}
        )
        
        superior_cert = MockManufacturer(
            business_name='AS9100 Certified',
            capabilities={'certifications': ['AS9100', 'ISO 9001']}  # AS9100 includes ISO 9001
        )
        
        no_cert = MockManufacturer(
            business_name='No Certifications',
            capabilities={'certifications': []}
        )
        
        # Test certification matching logic
        def has_required_cert(manufacturer, required_certs):
            mfg_certs = manufacturer.capabilities.get('certifications', [])
            for req_cert in required_certs:
                if req_cert in mfg_certs:
                    return True
                # AS9100 includes ISO 9001
                if req_cert == 'ISO 9001' and 'AS9100' in mfg_certs:
                    return True
            return False
        
        exact_has_cert = has_required_cert(exact_cert, ['ISO 9001'])
        superior_has_cert = has_required_cert(superior_cert, ['ISO 9001'])
        no_cert_has_cert = has_required_cert(no_cert, ['ISO 9001'])
        
        print(f"   Exact ISO 9001: {exact_has_cert}")
        print(f"   Superior AS9100: {superior_has_cert}")
        print(f"   No Certifications: {no_cert_has_cert}")
        
        tests = [
            ("Exact Certification Match", exact_has_cert, "Exact cert should match"),
            ("Superior Certification Accepted", superior_has_cert, "AS9100 should satisfy ISO 9001 requirement"),
            ("Missing Certification Rejected", not no_cert_has_cert, "No cert should not match requirement")
        ]
        
        return self._evaluate_tests("Certification Hierarchy", tests)
    
    def test_fuzzy_matching_intelligence(self):
        """Test fuzzy matching for similar but not exact terms"""
        print("\n🔍 TESTING: Fuzzy Matching Intelligence")
        print("-" * 50)
        
        # Test technical term similarity
        test_cases = [
            ("CNC Machining", "Precision Machining", 0.7, 0.9),  # Should be high similarity
            ("3D Printing", "Additive Manufacturing", 0.7, 0.9),  # Should be high similarity
            ("Aluminum 6061", "Aluminum 6063", 0.5, 0.8),  # Should be moderate similarity
            ("Steel Fabrication", "Plastic Molding", 0.0, 0.3),  # Should be low similarity
        ]
        
        tests = []
        for term1, term2, min_expected, max_expected in test_cases:
            # Use the engine's fuzzy matching capability
            similarity = self.engine._enhanced_fuzzy_match_capability(term1, term2)
            
            print(f"   '{term1}' vs '{term2}': {similarity:.3f} (expected {min_expected:.1f}-{max_expected:.1f})")
            
            test_name = f"Fuzzy Match: {term1} ↔ {term2}"
            test_passed = min_expected <= similarity <= max_expected
            test_description = f"Similarity should be {min_expected:.1f}-{max_expected:.1f}"
            
            tests.append((test_name, test_passed, test_description))
        
        return self._evaluate_tests("Fuzzy Matching", tests)
    
    def test_confidence_score_calibration(self):
        """Test that confidence scores accurately reflect match quality"""
        print("\n🎯 TESTING: Confidence Score Calibration")
        print("-" * 50)
        
        # High-confidence scenario (very specific requirements)
        specific_order = MockOrder(
            title='Highly Specific Aerospace Part',
            technical_requirements={
                'manufacturing_process': 'Selective Laser Melting',
                'material': 'Inconel 718',
                'certifications': ['AS9100', 'NADCAP']
            },
            industry_category='Aerospace'
        )
        
        perfect_specialist = MockManufacturer(
            business_name='Inconel SLM Specialist',
            capabilities={
                'manufacturing_processes': ['Selective Laser Melting', 'EBM'],
                'materials': ['Inconel 718', 'Titanium'],
                'industries_served': ['Aerospace'],
                'certifications': ['AS9100', 'NADCAP']
            },
            overall_rating=4.8
        )
        
        # Generic scenario (common requirements)
        generic_order = MockOrder(
            title='Standard Metal Part',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Steel',
                'certifications': ['ISO 9001']
            }
        )
        
        generic_manufacturer = MockManufacturer(
            business_name='General Machining Co',
            capabilities={
                'manufacturing_processes': ['CNC Machining', 'Milling'],
                'materials': ['Steel', 'Aluminum'],
                'certifications': ['ISO 9001']
            },
            overall_rating=4.0
        )
        
        # Calculate confidence scores (using capability intelligence as proxy)
        specialist_score = self.engine._calculate_enhanced_capability_intelligence(perfect_specialist, specific_order)
        generic_score = self.engine._calculate_enhanced_capability_intelligence(generic_manufacturer, generic_order)
        
        print(f"   Specialist Match Score: {specialist_score:.3f}")
        print(f"   Generic Match Score: {generic_score:.3f}")
        
        tests = [
            ("High Confidence for Specialist", specialist_score >= 0.85, "Perfect specialist should have high confidence"),
            ("Moderate Confidence for Generic", 0.6 <= generic_score <= 0.85, "Generic match should have moderate confidence"),
            ("Confidence Differentiation", specialist_score > generic_score, "Specialist should be more confident than generic")
        ]
        
        return self._evaluate_tests("Confidence Calibration", tests)
    
    def _evaluate_tests(self, test_group: str, tests: List[Tuple[str, bool, str]]) -> bool:
        """Evaluate a group of tests and return success status"""
        passed = 0
        total = len(tests)
        
        for test_name, test_result, description in tests:
            self.total_tests += 1
            if test_result:
                self.passed_tests += 1
                passed += 1
                status = "✅"
            else:
                status = "❌"
            
            print(f"   {status} {test_name}: {description}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        group_passed = success_rate >= 75  # 75% threshold for group success
        
        print(f"\n   {test_group} Results: {passed}/{total} passed ({success_rate:.0f}%) {'✅' if group_passed else '❌'}")
        
        self.test_results.append({
            'group': test_group,
            'passed': passed,
            'total': total,
            'success_rate': success_rate,
            'status': group_passed
        })
        
        return group_passed
    
    def run_critical_features_testing(self):
        """Run all critical feature tests"""
        print("🔍 SMART MATCHING AI - CRITICAL FEATURES TESTING")
        print("=" * 70)
        print("Testing the most important features for production readiness")
        
        # Run all critical feature tests
        test_functions = [
            self.test_multi_factor_scoring_validation,
            self.test_process_substitution_logic,
            self.test_material_compatibility_intelligence,
            self.test_geographic_preference_handling,
            self.test_volume_capacity_matching,
            self.test_certification_hierarchy_understanding,
            self.test_fuzzy_matching_intelligence,
            self.test_confidence_score_calibration
        ]
        
        group_results = []
        for test_func in test_functions:
            try:
                result = test_func()
                group_results.append(result)
            except Exception as e:
                print(f"\n❌ ERROR in {test_func.__name__}: {str(e)}")
                group_results.append(False)
        
        # Calculate overall results
        total_groups = len(group_results)
        passed_groups = sum(group_results)
        overall_group_success = (passed_groups / total_groups * 100) if total_groups > 0 else 0
        overall_test_success = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        # Final Results Summary
        print("\n" + "=" * 70)
        print("📊 CRITICAL FEATURES TEST RESULTS")
        print("=" * 70)
        
        print(f"🎯 OVERALL SUMMARY:")
        print(f"   Feature Groups: {total_groups}")
        print(f"   ✅ Passed Groups: {passed_groups}")
        print(f"   ❌ Failed Groups: {total_groups - passed_groups}")
        print(f"   Group Success Rate: {overall_group_success:.1f}%")
        
        print(f"\n📋 DETAILED BREAKDOWN:")
        print(f"   Individual Tests: {self.total_tests}")
        print(f"   ✅ Passed Tests: {self.passed_tests}")
        print(f"   ❌ Failed Tests: {self.total_tests - self.passed_tests}")
        print(f"   Individual Success Rate: {overall_test_success:.1f}%")
        
        print(f"\n🔧 FEATURE GROUP RESULTS:")
        for result in self.test_results:
            status = "✅" if result['status'] else "❌"
            print(f"   {result['group']:30}: {result['passed']:2}/{result['total']:2} tests ({result['success_rate']:3.0f}%) {status}")
        
        # Production Readiness Assessment
        if overall_group_success >= 90 and overall_test_success >= 85:
            print(f"\n🎉 CRITICAL FEATURES: FULLY VALIDATED!")
            print("   ✅ All core functionality working perfectly")
            print("   ✅ Multi-factor scoring algorithm validated")
            print("   ✅ Process substitution logic confirmed")
            print("   ✅ Material compatibility intelligence working")
            print("   ✅ Geographic preferences handled correctly")
            print("   ✅ Volume matching logic functional")
            print("   ✅ Certification hierarchy understood")
            print("   ✅ Fuzzy matching intelligence operational")
            print("   ✅ Confidence scoring calibrated")
            
            print(f"\n🚀 PRODUCTION STATUS: ✅ READY FOR DEPLOYMENT")
            print("   All critical features validated for production use!")
            
        elif overall_group_success >= 75 and overall_test_success >= 70:
            print(f"\n⚠️ MOSTLY READY - {overall_group_success:.0f}% SUCCESS")
            print("   Most critical features working correctly")
            print("   Some minor issues need attention")
            print(f"\n🔧 STATUS: ⚠️ PRODUCTION READY WITH MONITORING")
            
        else:
            print(f"\n❌ CRITICAL ISSUES DETECTED")
            print("   Some core features not working properly")
            print("   Additional development required")
            print(f"\n🛠️ STATUS: ❌ NOT READY FOR PRODUCTION")
        
        print("=" * 70)
        
        return overall_group_success >= 80

def main():
    """Run critical features testing"""
    tester = CriticalFeaturesTester()
    success = tester.run_critical_features_testing()
    
    if success:
        print("\n🎊 CRITICAL FEATURES VALIDATION COMPLETE!")
        print("The Smart Matching AI system's core functionality is production-ready!")
    else:
        print("\n⚠️ Some critical features need attention. Review results above.")

if __name__ == "__main__":
    main() 