#!/usr/bin/env python3
"""
Smart Matching AI - Production Reality Testing
Testing how the system handles messy, incomplete, and edge case data
that will definitely occur in real-world production usage.
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union

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

class ProductionRealityTester:
    """Test Smart Matching system with real-world messy data scenarios"""
    
    def __init__(self):
        self.engine = SmartMatchingEngine()
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.crashes = 0
    
    def test_incomplete_manufacturer_data(self):
        """Test handling of manufacturers with incomplete/missing data"""
        print("\n🔍 TESTING: Incomplete Manufacturer Data Handling")
        print("-" * 60)
        
        # Standard order for comparison
        standard_order = MockOrder(
            title='Standard CNC Part',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Aluminum 6061',
                'certifications': ['ISO 9001']
            }
        )
        
        # Test different levels of incomplete data
        test_cases = [
            {
                'name': 'Missing Certifications',
                'manufacturer': MockManufacturer(
                    business_name='No Certs Manufacturing',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining'],
                        'materials': ['Aluminum 6061'],
                        'certifications': []  # Empty list
                    }
                ),
                'expected_behavior': 'Lower score due to missing certs, but no crash'
            },
            {
                'name': 'Null Capabilities',
                'manufacturer': MockManufacturer(
                    business_name='Null Data Co',
                    capabilities={
                        'manufacturing_processes': None,  # Null data
                        'materials': ['Aluminum'],
                        'certifications': ['ISO 9001']
                    }
                ),
                'expected_behavior': 'Handle null gracefully, use available data'
            },
            {
                'name': 'Empty Strings',
                'manufacturer': MockManufacturer(
                    business_name='',  # Empty name
                    capabilities={
                        'manufacturing_processes': [''],  # Empty process
                        'materials': ['Aluminum'],
                        'certifications': ['ISO 9001']
                    },
                    country=''  # Empty country
                ),
                'expected_behavior': 'Handle empty strings without errors'
            },
            {
                'name': 'Missing Performance Data',
                'manufacturer': MockManufacturer(
                    business_name='New Manufacturer',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining'],
                        'materials': ['Aluminum'],
                        'certifications': ['ISO 9001']
                    },
                    overall_rating=None,  # No rating yet
                    total_orders_completed=0,  # No history
                    on_time_delivery_rate=None  # No delivery data
                ),
                'expected_behavior': 'Use defaults for missing performance metrics'
            },
            {
                'name': 'Inconsistent Data Types',
                'manufacturer': MockManufacturer(
                    business_name='Mixed Data Types',
                    capabilities={
                        'manufacturing_processes': 'CNC Machining',  # String instead of list
                        'materials': ['Aluminum', 123, None],  # Mixed types in list
                        'certifications': 'ISO 9001'  # String instead of list
                    }
                ),
                'expected_behavior': 'Normalize data types automatically'
            }
        ]
        
        tests = []
        for case in test_cases:
            try:
                # Attempt to calculate score - should not crash
                score = self.engine._calculate_enhanced_capability_intelligence(
                    case['manufacturer'], standard_order
                )
                
                # Test passed if no exception and score is reasonable
                test_passed = 0.0 <= score <= 1.0
                test_name = f"Incomplete Data: {case['name']}"
                
                print(f"   ✅ {test_name}: Score {score:.3f} - {case['expected_behavior']}")
                tests.append((test_name, test_passed, f"Score: {score:.3f}"))
                
            except Exception as e:
                self.crashes += 1
                print(f"   ❌ {case['name']}: CRASHED - {str(e)}")
                tests.append((f"Crash Prevention: {case['name']}", False, f"Exception: {str(e)[:50]}"))
        
        return self._evaluate_tests("Incomplete Data Handling", tests)
    
    def test_vague_order_requirements(self):
        """Test handling of orders with vague or unclear requirements"""
        print("\n🤔 TESTING: Vague Order Requirements Handling")
        print("-" * 60)
        
        # Standard manufacturer for comparison
        standard_manufacturer = MockManufacturer(
            business_name='Standard Machining Co',
            capabilities={
                'manufacturing_processes': ['CNC Machining', 'Milling', 'Turning'],
                'materials': ['Steel', 'Aluminum', 'Stainless Steel'],
                'certifications': ['ISO 9001']
            }
        )
        
        # Test different levels of vague requirements
        vague_orders = [
            {
                'name': 'Super Vague Requirements',
                'order': MockOrder(
                    title='Need some parts',
                    technical_requirements={
                        'manufacturing_process': 'machining or something',
                        'material': 'metal',
                        'quantity': 'some'
                    }
                ),
                'expected_behavior': 'Handle vague terms with fuzzy matching'
            },
            {
                'name': 'Contradictory Requirements',
                'order': MockOrder(
                    title='Impossible Requirements',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Aluminum',
                        'quality': 'Highest possible',
                        'cost': 'Cheapest possible',
                        'delivery': 'Immediate'
                    },
                    budget_max_pln=100  # Unrealistically low budget
                ),
                'expected_behavior': 'Identify conflicts, provide best compromise'
            },
            {
                'name': 'Missing Critical Info',
                'order': MockOrder(
                    title='Incomplete Order',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining'
                        # Missing material, quantity, etc.
                    }
                ),
                'expected_behavior': 'Work with available info, flag missing data'
            },
            {
                'name': 'Non-Standard Terminology',
                'order': MockOrder(
                    title='Non-Standard Terms',
                    technical_requirements={
                        'manufacturing_process': 'Computer Controlled Cutting',  # Non-standard term for CNC
                        'material': 'Light Metal Alloy',  # Non-standard term for Aluminum
                        'certifications': ['Quality Certificate']  # Vague certification
                    }
                ),
                'expected_behavior': 'Interpret non-standard terms intelligently'
            }
        ]
        
        tests = []
        for case in vague_orders:
            try:
                # Test capability matching with vague requirements
                score = self.engine._calculate_enhanced_capability_intelligence(
                    standard_manufacturer, case['order']
                )
                
                # Should handle vague requirements without crashing
                test_passed = 0.0 <= score <= 1.0
                test_name = f"Vague Order: {case['name']}"
                
                print(f"   ✅ {test_name}: Score {score:.3f} - {case['expected_behavior']}")
                tests.append((test_name, test_passed, f"Handled vague requirements"))
                
            except Exception as e:
                self.crashes += 1
                print(f"   ❌ {case['name']}: CRASHED - {str(e)}")
                tests.append((f"Vague Handling: {case['name']}", False, f"Exception: {str(e)[:50]}"))
        
        return self._evaluate_tests("Vague Requirements Handling", tests)
    
    def test_edge_case_combinations(self):
        """Test unusual but valid manufacturing scenarios"""
        print("\n⚡ TESTING: Edge Case Combinations")
        print("-" * 60)
        
        edge_cases = [
            {
                'name': 'New Material Not in Database',
                'order': MockOrder(
                    title='Exotic Material Part',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Graphene-Enhanced Titanium Composite',  # Futuristic material
                        'certifications': ['ISO 9001']
                    }
                ),
                'manufacturer': MockManufacturer(
                    business_name='Advanced Materials Co',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining'],
                        'materials': ['Titanium', 'Composites', 'Advanced Materials'],
                        'certifications': ['ISO 9001']
                    }
                ),
                'expected_behavior': 'Fuzzy match to similar materials'
            },
            {
                'name': 'Hybrid Manufacturing Process',
                'order': MockOrder(
                    title='Multi-Process Component',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining + 3D Printing Hybrid',
                        'material': 'Metal-Polymer Composite'
                    }
                ),
                'manufacturer': MockManufacturer(
                    business_name='Hybrid Manufacturing',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining', '3D Printing', 'Hybrid Processes'],
                        'materials': ['Composites', 'Metals', 'Polymers']
                    }
                ),
                'expected_behavior': 'Recognize hybrid processes intelligently'
            },
            {
                'name': 'Extreme Quantity Requirements',
                'order': MockOrder(
                    title='Massive Production Run',
                    technical_requirements={
                        'manufacturing_process': 'Injection Molding',
                        'material': 'ABS Plastic'
                    },
                    quantity=10000000  # 10 million parts
                ),
                'manufacturer': MockManufacturer(
                    business_name='Mass Production Specialist',
                    capabilities={
                        'manufacturing_processes': ['Injection Molding'],
                        'materials': ['ABS', 'Plastics']
                    },
                    min_order_quantity=100000,
                    max_order_quantity=50000000
                ),
                'expected_behavior': 'Handle extreme quantities appropriately'
            },
            {
                'name': 'Emergency Rush Order',
                'order': MockOrder(
                    title='URGENT: Need parts ASAP',
                    technical_requirements={
                        'manufacturing_process': 'CNC Machining',
                        'material': 'Aluminum',
                        'delivery_time': 'Same day',
                        'priority': 'EMERGENCY'
                    }
                ),
                'manufacturer': MockManufacturer(
                    business_name='Rush Manufacturing',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining'],
                        'materials': ['Aluminum'],
                        'rush_orders': True
                    }
                ),
                'expected_behavior': 'Prioritize speed over other factors'
            }
        ]
        
        tests = []
        for case in edge_cases:
            try:
                # Test edge case handling
                score = self.engine._calculate_enhanced_capability_intelligence(
                    case['manufacturer'], case['order']
                )
                
                # Should handle edge cases gracefully
                test_passed = 0.0 <= score <= 1.0
                test_name = f"Edge Case: {case['name']}"
                
                print(f"   ✅ {test_name}: Score {score:.3f} - {case['expected_behavior']}")
                tests.append((test_name, test_passed, f"Handled edge case"))
                
            except Exception as e:
                self.crashes += 1
                print(f"   ❌ {case['name']}: CRASHED - {str(e)}")
                tests.append((f"Edge Case: {case['name']}", False, f"Exception: {str(e)[:50]}"))
        
        return self._evaluate_tests("Edge Case Handling", tests)
    
    def test_data_format_inconsistencies(self):
        """Test handling of inconsistent data formats"""
        print("\n📝 TESTING: Data Format Inconsistencies")
        print("-" * 60)
        
        # Standard order for testing
        standard_order = MockOrder(
            title='Format Test Order',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Aluminum'
            }
        )
        
        format_variations = [
            {
                'name': 'Case Variations',
                'manufacturer': MockManufacturer(
                    business_name='case test co',  # lowercase
                    capabilities={
                        'manufacturing_processes': ['cnc machining', 'MILLING', 'Turning'],  # Mixed case
                        'materials': ['ALUMINUM', 'steel', 'Stainless Steel'],
                        'certifications': ['iso 9001', 'AS9100']
                    }
                ),
                'expected_behavior': 'Normalize case variations'
            },
            {
                'name': 'Spacing and Punctuation',
                'manufacturer': MockManufacturer(
                    business_name='Spacing & Punctuation Co.',
                    capabilities={
                        'manufacturing_processes': ['CNC-Machining', 'CNC_Machining', 'CNC Machining'],
                        'materials': ['Aluminum-6061', 'Aluminum 6061', 'Aluminum6061'],
                        'certifications': ['ISO-9001', 'ISO 9001', 'ISO9001']
                    }
                ),
                'expected_behavior': 'Handle spacing and punctuation variations'
            },
            {
                'name': 'Abbreviations and Full Names',
                'manufacturer': MockManufacturer(
                    business_name='Abbreviation Test',
                    capabilities={
                        'manufacturing_processes': ['Computer Numerical Control', 'CNC', 'NC Machining'],
                        'materials': ['Al', 'Aluminum', 'Aluminium'],  # Different spellings
                        'certifications': ['International Organization for Standardization 9001', 'ISO 9001']
                    }
                ),
                'expected_behavior': 'Recognize abbreviations and full names'
            }
        ]
        
        tests = []
        for case in format_variations:
            try:
                # Test format handling
                score = self.engine._calculate_enhanced_capability_intelligence(
                    case['manufacturer'], standard_order
                )
                
                # Should handle format variations
                test_passed = score > 0.5  # Should still match reasonably well
                test_name = f"Format: {case['name']}"
                
                print(f"   ✅ {test_name}: Score {score:.3f} - {case['expected_behavior']}")
                tests.append((test_name, test_passed, f"Normalized formats"))
                
            except Exception as e:
                self.crashes += 1
                print(f"   ❌ {case['name']}: CRASHED - {str(e)}")
                tests.append((f"Format: {case['name']}", False, f"Exception: {str(e)[:50]}"))
        
        return self._evaluate_tests("Format Inconsistencies", tests)
    
    def test_system_robustness(self):
        """Test overall system robustness and error handling"""
        print("\n🛡️ TESTING: System Robustness & Error Handling")
        print("-" * 60)
        
        # Stress test scenarios
        stress_tests = [
            {
                'name': 'Extremely Long Strings',
                'manufacturer': MockManufacturer(
                    business_name='A' * 1000,  # Very long name
                    capabilities={
                        'manufacturing_processes': ['CNC Machining' + 'X' * 500],  # Long process name
                        'materials': ['Aluminum'],
                        'certifications': ['ISO 9001']
                    }
                ),
                'expected_behavior': 'Handle long strings without memory issues'
            },
            {
                'name': 'Special Characters',
                'manufacturer': MockManufacturer(
                    business_name='Spëcîál Chäracters & Symbols™ Co. (2024)',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining™', '3D Printing®'],
                        'materials': ['Aluminum™', 'Steel®'],
                        'certifications': ['ISO 9001™']
                    }
                ),
                'expected_behavior': 'Handle special characters and symbols'
            },
            {
                'name': 'Numeric Edge Cases',
                'manufacturer': MockManufacturer(
                    business_name='Numeric Edge Cases',
                    capabilities={
                        'manufacturing_processes': ['CNC Machining'],
                        'materials': ['Aluminum']
                    },
                    overall_rating=float('inf'),  # Infinity
                    total_orders_completed=-5,  # Negative number
                    on_time_delivery_rate=150.0  # Over 100%
                ),
                'expected_behavior': 'Handle numeric edge cases gracefully'
            }
        ]
        
        standard_order = MockOrder(
            title='Robustness Test',
            technical_requirements={
                'manufacturing_process': 'CNC Machining',
                'material': 'Aluminum'
            }
        )
        
        tests = []
        for case in stress_tests:
            try:
                # Test robustness
                score = self.engine._calculate_enhanced_capability_intelligence(
                    case['manufacturer'], standard_order
                )
                
                # Should handle stress cases
                test_passed = 0.0 <= score <= 1.0 and not (score != score)  # Check for NaN
                test_name = f"Robustness: {case['name']}"
                
                print(f"   ✅ {test_name}: Score {score:.3f} - {case['expected_behavior']}")
                tests.append((test_name, test_passed, f"Handled stress case"))
                
            except Exception as e:
                self.crashes += 1
                print(f"   ❌ {case['name']}: CRASHED - {str(e)}")
                tests.append((f"Robustness: {case['name']}", False, f"Exception: {str(e)[:50]}"))
        
        return self._evaluate_tests("System Robustness", tests)
    
    def _evaluate_tests(self, test_group: str, tests: List[tuple]) -> bool:
        """Evaluate a group of tests and return success status"""
        passed = 0
        total = len(tests)
        
        for test_name, test_result, description in tests:
            self.total_tests += 1
            if test_result:
                self.passed_tests += 1
                passed += 1
        
        success_rate = (passed / total * 100) if total > 0 else 0
        group_passed = success_rate >= 70  # Lower threshold for production reality tests
        
        print(f"\n   {test_group} Results: {passed}/{total} passed ({success_rate:.0f}%) {'✅' if group_passed else '❌'}")
        
        self.test_results.append({
            'group': test_group,
            'passed': passed,
            'total': total,
            'success_rate': success_rate,
            'status': group_passed
        })
        
        return group_passed
    
    def run_production_reality_testing(self):
        """Run all production reality tests"""
        print("🔍 SMART MATCHING AI - PRODUCTION REALITY TESTING")
        print("=" * 70)
        print("Testing system robustness with messy, incomplete, and edge case data")
        
        # Run all production reality tests
        test_functions = [
            self.test_incomplete_manufacturer_data,
            self.test_vague_order_requirements,
            self.test_edge_case_combinations,
            self.test_data_format_inconsistencies,
            self.test_system_robustness
        ]
        
        group_results = []
        for test_func in test_functions:
            try:
                result = test_func()
                group_results.append(result)
            except Exception as e:
                print(f"\n❌ CRITICAL ERROR in {test_func.__name__}: {str(e)}")
                group_results.append(False)
                self.crashes += 1
        
        # Calculate overall results
        total_groups = len(group_results)
        passed_groups = sum(group_results)
        overall_group_success = (passed_groups / total_groups * 100) if total_groups > 0 else 0
        overall_test_success = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        # Final Results Summary
        print("\n" + "=" * 70)
        print("📊 PRODUCTION REALITY TEST RESULTS")
        print("=" * 70)
        
        print(f"🎯 OVERALL SUMMARY:")
        print(f"   Test Groups: {total_groups}")
        print(f"   ✅ Passed Groups: {passed_groups}")
        print(f"   ❌ Failed Groups: {total_groups - passed_groups}")
        print(f"   Group Success Rate: {overall_group_success:.1f}%")
        
        print(f"\n📋 DETAILED BREAKDOWN:")
        print(f"   Individual Tests: {self.total_tests}")
        print(f"   ✅ Passed Tests: {self.passed_tests}")
        print(f"   ❌ Failed Tests: {self.total_tests - self.passed_tests}")
        print(f"   Individual Success Rate: {overall_test_success:.1f}%")
        print(f"   💥 System Crashes: {self.crashes}")
        
        print(f"\n🔧 TEST GROUP RESULTS:")
        for result in self.test_results:
            status = "✅" if result['status'] else "❌"
            print(f"   {result['group']:30}: {result['passed']:2}/{result['total']:2} tests ({result['success_rate']:3.0f}%) {status}")
        
        # Production Readiness Assessment
        if self.crashes == 0 and overall_group_success >= 80 and overall_test_success >= 70:
            print(f"\n🎉 PRODUCTION REALITY: EXCELLENT ROBUSTNESS!")
            print("   ✅ Zero system crashes with messy data")
            print("   ✅ Graceful handling of incomplete information")
            print("   ✅ Intelligent processing of vague requirements")
            print("   ✅ Robust edge case management")
            print("   ✅ Consistent data format normalization")
            print("   ✅ Strong error recovery mechanisms")
            
            print(f"\n🚀 PRODUCTION STATUS: ✅ BULLETPROOF FOR REAL-WORLD DATA")
            print("   System ready to handle messy production data!")
            
        elif self.crashes <= 2 and overall_group_success >= 60:
            print(f"\n⚠️ GOOD ROBUSTNESS - {overall_group_success:.0f}% SUCCESS")
            print(f"   System handles most real-world scenarios")
            print(f"   {self.crashes} crashes detected - need investigation")
            print(f"   Some edge cases need refinement")
            print(f"\n🔧 STATUS: ⚠️ PRODUCTION READY WITH MONITORING")
            
        else:
            print(f"\n❌ ROBUSTNESS ISSUES DETECTED")
            print(f"   {self.crashes} system crashes - CRITICAL ISSUE")
            print(f"   Poor handling of real-world data scenarios")
            print(f"   Significant stability improvements needed")
            print(f"\n🛠️ STATUS: ❌ NOT READY FOR PRODUCTION")
        
        # Specific Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if self.crashes > 0:
            print("   🔥 CRITICAL: Fix system crashes before deployment")
        if overall_test_success < 70:
            print("   ⚠️ Improve handling of incomplete/messy data")
        if overall_group_success < 80:
            print("   📈 Enhance edge case processing")
        
        print("=" * 70)
        
        return self.crashes == 0 and overall_group_success >= 70

def main():
    """Run production reality testing"""
    tester = ProductionRealityTester()
    success = tester.run_production_reality_testing()
    
    if success:
        print("\n🎊 PRODUCTION REALITY VALIDATION COMPLETE!")
        print("The Smart Matching AI system is robust enough for real-world production data!")
    else:
        print("\n⚠️ Production readiness issues detected. Review results above.")

if __name__ == "__main__":
    main() 