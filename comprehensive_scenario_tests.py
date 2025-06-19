#!/usr/bin/env python3
"""
Comprehensive Smart Matching Tests - Different Manufacturing Scenarios
Testing the fixed Smart Matching system across diverse real-world contexts
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

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

class ComprehensiveScenarioTester:
    """Test Smart Matching across different manufacturing scenarios"""
    
    def __init__(self):
        self.engine = SmartMatchingEngine()
        self.results = {'passed': 0, 'failed': 0, 'total': 0}
        self.scenario_results = []
    
    def test_aerospace_scenarios(self):
        """Test various aerospace manufacturing scenarios"""
        print("\n🚁 AEROSPACE MANUFACTURING SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'Titanium Turbine Blades',
                'order': MockOrder(
                    title='Titanium Turbine Blades for Jet Engine',
                    technical_requirements={
                        'manufacturing_process': '5-Axis CNC Machining',
                        'material': 'Titanium Grade 5',
                        'certifications': ['AS9100', 'NADCAP'],
                        'quantity': 50,
                        'tolerances': '±0.001mm'
                    },
                    industry_category='Aerospace'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='AeroTech Precision Sp. z o.o.',
                    capabilities={
                        'manufacturing_processes': ['5-Axis CNC Machining', 'Precision Machining'],
                        'materials': ['Titanium Grade 5', 'Inconel', 'Aluminum 7075'],
                        'industries_served': ['Aerospace', 'Defense'],
                        'certifications': ['AS9100', 'NADCAP', 'ISO 9001']
                    },
                    overall_rating=4.9,
                    country='PL'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='General Metal Works',
                    capabilities={
                        'manufacturing_processes': ['Manual Machining'],
                        'materials': ['Steel', 'Aluminum'],
                        'industries_served': ['General Manufacturing'],
                        'certifications': ['ISO 9001']
                    },
                    overall_rating=3.5,
                    country='CN'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_poor_range': (0.0, 0.3)
            },
            {
                'name': 'Carbon Fiber Components',
                'order': MockOrder(
                    title='Carbon Fiber Wing Components',
                    technical_requirements={
                        'manufacturing_process': 'Autoclave Molding',
                        'material': 'Carbon Fiber Prepreg',
                        'certifications': ['AS9100'],
                        'quantity': 25
                    },
                    industry_category='Aerospace'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='Composite Aerospace Solutions',
                    capabilities={
                        'manufacturing_processes': ['Autoclave Molding', 'Composite Manufacturing'],
                        'materials': ['Carbon Fiber Prepreg', 'Fiberglass', 'Kevlar'],
                        'industries_served': ['Aerospace', 'Racing'],
                        'certifications': ['AS9100', 'ISO 9001']
                    },
                    overall_rating=4.7,
                    country='DE'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Basic Plastics Co.',
                    capabilities={
                        'manufacturing_processes': ['Injection Molding'],
                        'materials': ['ABS', 'PLA'],
                        'industries_served': ['Consumer Products'],
                        'certifications': []
                    },
                    overall_rating=3.2,
                    country='CN'
                ),
                'expected_perfect_range': (0.80, 0.95),
                'expected_poor_range': (0.0, 0.2)
            }
        ]
        
        return self._test_scenario_group('Aerospace', scenarios)
    
    def test_medical_device_scenarios(self):
        """Test medical device manufacturing scenarios"""
        print("\n🏥 MEDICAL DEVICE MANUFACTURING SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'Surgical Instruments',
                'order': MockOrder(
                    title='Precision Surgical Scissors',
                    technical_requirements={
                        'manufacturing_process': 'Precision Machining',
                        'material': 'Stainless Steel 316L',
                        'certifications': ['ISO 13485', 'FDA 510k'],
                        'quantity': 200,
                        'surface_finish': 'Mirror Polish'
                    },
                    industry_category='Medical Devices'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='MedPrecision Instruments',
                    capabilities={
                        'manufacturing_processes': ['Precision Machining', 'CNC Machining'],
                        'materials': ['Stainless Steel 316L', 'Titanium Grade 2'],
                        'industries_served': ['Medical Devices', 'Surgical Instruments'],
                        'certifications': ['ISO 13485', 'FDA 510k', 'ISO 9001']
                    },
                    overall_rating=4.8,
                    country='DE'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='General Tool Maker',
                    capabilities={
                        'manufacturing_processes': ['Basic Machining'],
                        'materials': ['Regular Steel', 'Aluminum'],
                        'industries_served': ['Tools', 'Hardware'],
                        'certifications': []
                    },
                    overall_rating=3.3,
                    country='PL'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_poor_range': (0.0, 0.25)
            },
            {
                'name': 'Biocompatible Implants',
                'order': MockOrder(
                    title='3D Printed Hip Implant Prototypes',
                    technical_requirements={
                        'manufacturing_process': 'Metal 3D Printing',
                        'material': 'Titanium Grade 23',
                        'certifications': ['ISO 13485', 'FDA'],
                        'quantity': 10
                    },
                    industry_category='Medical Devices'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='BioAdditive Manufacturing',
                    capabilities={
                        'manufacturing_processes': ['Metal 3D Printing', 'SLM', 'EBM'],
                        'materials': ['Titanium Grade 23', 'Cobalt Chrome', 'PEEK'],
                        'industries_served': ['Medical Devices', 'Implants'],
                        'certifications': ['ISO 13485', 'FDA', 'CE Mark']
                    },
                    overall_rating=4.9,
                    country='US'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Hobby 3D Printing',
                    capabilities={
                        'manufacturing_processes': ['FDM 3D Printing'],
                        'materials': ['PLA', 'ABS'],
                        'industries_served': ['Prototyping', 'Hobby'],
                        'certifications': []
                    },
                    overall_rating=2.8,
                    country='CN'
                ),
                'expected_perfect_range': (0.80, 0.95),
                'expected_poor_range': (0.0, 0.2)
            }
        ]
        
        return self._test_scenario_group('Medical Devices', scenarios)
    
    def test_automotive_scenarios(self):
        """Test automotive manufacturing scenarios"""
        print("\n🚗 AUTOMOTIVE MANUFACTURING SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'Engine Block Machining',
                'order': MockOrder(
                    title='Aluminum Engine Block Machining',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Aluminum A356',
                        'certifications': ['IATF 16949'],
                        'quantity': 1000,
                        'tolerances': '±0.05mm'
                    },
                    industry_category='Automotive'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='AutoPrecision Machining',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining', 'Multi-Axis Machining'],
                        'materials': ['Aluminum A356', 'Cast Iron', 'Steel'],
                        'industries_served': ['Automotive', 'Heavy Machinery'],
                        'certifications': ['IATF 16949', 'ISO 9001']
                    },
                    overall_rating=4.6,
                    country='DE'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Simple Fabrication',
                    capabilities={
                        'manufacturing_processes': ['Manual Cutting'],
                        'materials': ['Basic Steel'],
                        'industries_served': ['Construction'],
                        'certifications': []
                    },
                    overall_rating=3.0,
                    country='PL'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_poor_range': (0.0, 0.25)
            },
            {
                'name': 'Electric Vehicle Battery Housing',
                'order': MockOrder(
                    title='EV Battery Enclosure Stamping',
                    technical_requirements={
                        'manufacturing_process': 'Progressive Die Stamping',
                        'material': 'High Strength Steel',
                        'certifications': ['IATF 16949'],
                        'quantity': 5000
                    },
                    industry_category='Automotive'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='EVStamping Solutions',
                    capabilities={
                        'manufacturing_processes': ['Progressive Die Stamping', 'Deep Drawing'],
                        'materials': ['High Strength Steel', 'AHSS', 'Aluminum'],
                        'industries_served': ['Automotive', 'Electric Vehicles'],
                        'certifications': ['IATF 16949', 'ISO 14001']
                    },
                    overall_rating=4.7,
                    country='PL'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Basic Sheet Metal',
                    capabilities={
                        'manufacturing_processes': ['Manual Bending'],
                        'materials': ['Mild Steel'],
                        'industries_served': ['HVAC', 'Construction'],
                        'certifications': ['ISO 9001']
                    },
                    overall_rating=3.4,
                    country='PL'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_poor_range': (0.0, 0.3)
            }
        ]
        
        return self._test_scenario_group('Automotive', scenarios)
    
    def test_electronics_scenarios(self):
        """Test electronics manufacturing scenarios"""
        print("\n📱 ELECTRONICS MANUFACTURING SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'PCB Assembly',
                'order': MockOrder(
                    title='High-Frequency PCB Assembly',
                    technical_requirements={
                        'manufacturing_process': 'SMT Assembly',
                        'material': 'FR4 High-Tg',
                        'certifications': ['IPC-A-610', 'ISO 9001'],
                        'quantity': 10000
                    },
                    industry_category='Electronics'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='ElectroAssembly Pro',
                    capabilities={
                        'manufacturing_processes': ['SMT Assembly', 'PCB Manufacturing'],
                        'materials': ['FR4 High-Tg', 'Rogers', 'Polyimide'],
                        'industries_served': ['Electronics', 'Telecommunications'],
                        'certifications': ['IPC-A-610', 'ISO 9001', 'UL']
                    },
                    overall_rating=4.5,
                    country='CN'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Basic Electronics',
                    capabilities={
                        'manufacturing_processes': ['Through-Hole Assembly'],
                        'materials': ['Standard FR4'],
                        'industries_served': ['Hobby Electronics'],
                        'certifications': []
                    },
                    overall_rating=3.1,
                    country='CN'
                ),
                'expected_perfect_range': (0.80, 0.95),
                'expected_poor_range': (0.0, 0.3)
            },
            {
                'name': 'Precision Enclosures',
                'order': MockOrder(
                    title='Aluminum Electronic Enclosures',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Aluminum 6061',
                        'certifications': ['RoHS', 'CE'],
                        'quantity': 500,
                        'surface_treatment': 'Anodizing'
                    },
                    industry_category='Electronics'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='PrecisionEnclosures Ltd',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining', 'Anodizing'],
                        'materials': ['Aluminum 6061', 'Aluminum 7075'],
                        'industries_served': ['Electronics', 'Telecommunications'],
                        'certifications': ['RoHS', 'CE', 'ISO 9001']
                    },
                    overall_rating=4.4,
                    country='DE'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Generic Metal Shop',
                    capabilities={
                        'manufacturing_processes': ['Basic Cutting'],
                        'materials': ['Steel'],
                        'industries_served': ['General'],
                        'certifications': []
                    },
                    overall_rating=2.9,
                    country='PL'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_poor_range': (0.0, 0.25)
            }
        ]
        
        return self._test_scenario_group('Electronics', scenarios)
    
    def test_additive_manufacturing_scenarios(self):
        """Test additive manufacturing scenarios"""
        print("\n🖨️ ADDITIVE MANUFACTURING SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'Functional Prototypes',
                'order': MockOrder(
                    title='PEEK Functional Prototypes',
                    technical_requirements={
                        'manufacturing_process': 'FDM 3D Printing',
                        'material': 'PEEK',
                        'certifications': [],
                        'quantity': 20,
                        'layer_height': '0.1mm'
                    },
                    industry_category='Prototyping'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='Advanced3D Solutions',
                    capabilities={
                        'manufacturing_processes': ['FDM 3D Printing', 'SLA', 'SLS'],
                        'materials': ['PEEK', 'PEI', 'Carbon Fiber'],
                        'industries_served': ['Prototyping', 'Aerospace'],
                        'certifications': ['ISO 9001']
                    },
                    overall_rating=4.3,
                    country='US'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Basic Print Shop',
                    capabilities={
                        'manufacturing_processes': ['Basic FDM'],
                        'materials': ['PLA', 'ABS'],
                        'industries_served': ['Hobby'],
                        'certifications': []
                    },
                    overall_rating=2.7,
                    country='CN'
                ),
                'expected_perfect_range': (0.75, 0.90),
                'expected_poor_range': (0.0, 0.3)
            },
            {
                'name': 'Metal Additive Parts',
                'order': MockOrder(
                    title='Inconel Turbine Components',
                    technical_requirements={
                        'manufacturing_process': 'Selective Laser Melting',
                        'material': 'Inconel 718',
                        'certifications': ['AS9100'],
                        'quantity': 100
                    },
                    industry_category='Aerospace'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='MetalAM Specialists',
                    capabilities={
                        'manufacturing_processes': ['Selective Laser Melting', 'EBM', 'DMLS'],
                        'materials': ['Inconel 718', 'Titanium', 'Stainless Steel'],
                        'industries_served': ['Aerospace', 'Energy'],
                        'certifications': ['AS9100', 'ISO 9001']
                    },
                    overall_rating=4.8,
                    country='DE'
                ),
                'poor_manufacturer': MockManufacturer(
                    business_name='Traditional Foundry',
                    capabilities={
                        'manufacturing_processes': ['Sand Casting'],
                        'materials': ['Cast Iron', 'Bronze'],
                        'industries_served': ['Heavy Industry'],
                        'certifications': []
                    },
                    overall_rating=3.2,
                    country='PL'
                ),
                'expected_perfect_range': (0.80, 0.95),
                'expected_poor_range': (0.0, 0.2)
            }
        ]
        
        return self._test_scenario_group('Additive Manufacturing', scenarios)
    
    def test_cross_industry_scenarios(self):
        """Test scenarios that span multiple industries"""
        print("\n🔄 CROSS-INDUSTRY SCENARIOS")
        print("-" * 50)
        
        scenarios = [
            {
                'name': 'Multi-Industry Capabilities',
                'order': MockOrder(
                    title='Precision Aluminum Components',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Aluminum 6061',
                        'certifications': ['ISO 9001'],
                        'quantity': 500
                    },
                    industry_category='General Manufacturing'
                ),
                'perfect_manufacturer': MockManufacturer(
                    business_name='VersatileMachining Co.',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining', 'Milling', 'Turning'],
                        'materials': ['Aluminum 6061', 'Steel', 'Stainless Steel'],
                        'industries_served': ['Aerospace', 'Automotive', 'Electronics'],
                        'certifications': ['ISO 9001', 'AS9100', 'IATF 16949']
                    },
                    overall_rating=4.5,
                    country='PL'
                ),
                'moderate_manufacturer': MockManufacturer(
                    business_name='SingleFocus Machining',
                    capabilities={
                        'manufacturing_processes': ['Milling', 'Turning'],
                        'materials': ['Aluminum', 'Steel'],
                        'industries_served': ['General Manufacturing'],
                        'certifications': ['ISO 9001']
                    },
                    overall_rating=4.0,
                    country='PL'
                ),
                'expected_perfect_range': (0.85, 1.0),
                'expected_moderate_range': (0.55, 0.75)
            }
        ]
        
        # Special handling for cross-industry test
        passed_tests = 0
        total_tests = 0
        
        for scenario in scenarios:
            print(f"\n   📋 Scenario: {scenario['name']}")
            
            # Test perfect manufacturer
            perfect_score = self.engine._calculate_enhanced_capability_intelligence(
                scenario['perfect_manufacturer'], scenario['order']
            )
            min_exp, max_exp = scenario['expected_perfect_range']
            perfect_passed = min_exp <= perfect_score <= max_exp
            total_tests += 1
            if perfect_passed:
                passed_tests += 1
            
            print(f"      Perfect Match: {perfect_score:.3f} {'✅' if perfect_passed else '❌'} (expected {min_exp:.2f}-{max_exp:.2f})")
            
            # Test moderate manufacturer
            if 'moderate_manufacturer' in scenario:
                moderate_score = self.engine._calculate_enhanced_capability_intelligence(
                    scenario['moderate_manufacturer'], scenario['order']
                )
                min_exp, max_exp = scenario['expected_moderate_range']
                moderate_passed = min_exp <= moderate_score <= max_exp
                total_tests += 1
                if moderate_passed:
                    passed_tests += 1
                
                print(f"      Moderate Match: {moderate_score:.3f} {'✅' if moderate_passed else '❌'} (expected {min_exp:.2f}-{max_exp:.2f})")
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"\n   Cross-Industry Results: {passed_tests}/{total_tests} passed ({success_rate:.0f}%)")
        
        return success_rate >= 80
    
    def _test_scenario_group(self, group_name: str, scenarios: List[Dict]) -> bool:
        """Test a group of scenarios"""
        passed_tests = 0
        total_tests = 0
        
        for scenario in scenarios:
            print(f"\n   📋 Scenario: {scenario['name']}")
            
            # Test perfect manufacturer
            perfect_score = self.engine._calculate_enhanced_capability_intelligence(
                scenario['perfect_manufacturer'], scenario['order']
            )
            min_exp, max_exp = scenario['expected_perfect_range']
            perfect_passed = min_exp <= perfect_score <= max_exp
            total_tests += 1
            if perfect_passed:
                passed_tests += 1
            
            print(f"      Perfect Match: {perfect_score:.3f} {'✅' if perfect_passed else '❌'} (expected {min_exp:.2f}-{max_exp:.2f})")
            
            # Test poor manufacturer
            poor_score = self.engine._calculate_enhanced_capability_intelligence(
                scenario['poor_manufacturer'], scenario['order']
            )
            min_exp, max_exp = scenario['expected_poor_range']
            poor_passed = min_exp <= poor_score <= max_exp
            total_tests += 1
            if poor_passed:
                passed_tests += 1
            
            print(f"      Poor Match: {poor_score:.3f} {'✅' if poor_passed else '❌'} (expected {min_exp:.2f}-{max_exp:.2f})")
            
            # Test score separation
            score_diff = perfect_score - poor_score
            separation_passed = score_diff >= 0.5
            total_tests += 1
            if separation_passed:
                passed_tests += 1
            
            print(f"      Score Separation: {score_diff:.3f} {'✅' if separation_passed else '❌'} (should be ≥0.5)")
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print(f"\n   {group_name} Results: {passed_tests}/{total_tests} passed ({success_rate:.0f}%)")
        
        self.scenario_results.append({
            'group': group_name,
            'passed': passed_tests,
            'total': total_tests,
            'success_rate': success_rate
        })
        
        return success_rate >= 80
    
    def run_comprehensive_tests(self):
        """Run all comprehensive scenario tests"""
        print("🔍 SMART MATCHING - COMPREHENSIVE SCENARIO TESTING")
        print("=" * 70)
        print("Testing the fixed Smart Matching system across diverse manufacturing scenarios")
        
        # Run all scenario groups
        test_results = [
            self.test_aerospace_scenarios(),
            self.test_medical_device_scenarios(), 
            self.test_automotive_scenarios(),
            self.test_electronics_scenarios(),
            self.test_additive_manufacturing_scenarios(),
            self.test_cross_industry_scenarios()
        ]
        
        # Calculate overall results
        total_groups = len(test_results)
        passed_groups = sum(test_results)
        overall_success_rate = (passed_groups / total_groups * 100) if total_groups > 0 else 0
        
        # Detailed results
        total_individual_tests = sum(result['total'] for result in self.scenario_results)
        total_individual_passed = sum(result['passed'] for result in self.scenario_results)
        individual_success_rate = (total_individual_passed / total_individual_tests * 100) if total_individual_tests > 0 else 0
        
        # Final Results
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE SCENARIO TEST RESULTS")
        print("=" * 70)
        
        print(f"🎯 OVERALL SUMMARY:")
        print(f"   Test Groups: {total_groups}")
        print(f"   ✅ Passed Groups: {passed_groups}")
        print(f"   ❌ Failed Groups: {total_groups - passed_groups}")
        print(f"   Group Success Rate: {overall_success_rate:.1f}%")
        
        print(f"\n📋 DETAILED BREAKDOWN:")
        print(f"   Individual Tests: {total_individual_tests}")
        print(f"   ✅ Passed Tests: {total_individual_passed}")
        print(f"   ❌ Failed Tests: {total_individual_tests - total_individual_passed}")
        print(f"   Individual Success Rate: {individual_success_rate:.1f}%")
        
        print(f"\n🏭 INDUSTRY RESULTS:")
        for result in self.scenario_results:
            status = "✅" if result['success_rate'] >= 80 else "❌"
            print(f"   {result['group']:20}: {result['passed']:2}/{result['total']:2} tests ({result['success_rate']:3.0f}%) {status}")
        
        # Final assessment
        if overall_success_rate >= 90 and individual_success_rate >= 85:
            print(f"\n🎉 OUTSTANDING SUCCESS!")
            print("   ✅ Excellent performance across all manufacturing sectors")
            print("   ✅ Proper discrimination in aerospace scenarios")
            print("   ✅ Accurate medical device matching")
            print("   ✅ Reliable automotive component scoring")
            print("   ✅ Precise electronics manufacturing assessment")
            print("   ✅ Advanced additive manufacturing capabilities")
            print("   ✅ Cross-industry versatility confirmed")
            
            print(f"\n🚀 PRODUCTION STATUS: ✅ FULLY VALIDATED")
            print("   The Smart Matching AI system excels across:")
            print("   • Multiple manufacturing processes")
            print("   • Diverse material requirements")
            print("   • Various industry certifications")
            print("   • Different quality levels")
            print("   • Geographic considerations")
            
        elif overall_success_rate >= 75 and individual_success_rate >= 70:
            print(f"\n⚠️  GOOD PERFORMANCE - {overall_success_rate:.0f}% SUCCESS")
            print("   Most scenarios working correctly")
            print("   Minor adjustments may be beneficial")
            print(f"\n🔧 STATUS: ⚠️  PRODUCTION READY WITH MONITORING")
            
        else:
            print(f"\n❌ NEEDS IMPROVEMENT")
            print("   Some industry scenarios not performing optimally")
            print(f"\n🛠️  STATUS: ❌ REQUIRES ADDITIONAL TUNING")
        
        print("=" * 70)
        
        return overall_success_rate >= 80

def main():
    """Run comprehensive scenario testing"""
    tester = ComprehensiveScenarioTester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n🎊 COMPREHENSIVE VALIDATION COMPLETE!")
        print("The Smart Matching AI system performs excellently across diverse manufacturing scenarios!")
    else:
        print("\n⚠️  Some scenarios need attention. Review results above for details.")

if __name__ == "__main__":
    main() 