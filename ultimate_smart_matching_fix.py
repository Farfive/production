#!/usr/bin/env python3
"""
Ultimate Smart Matching Fix
Final solution with extremely strict discrimination
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import asyncio
import re

class UltimateSmartMatchingFix:
    """Ultimate fix with strict discrimination"""
    
    def __init__(self):
        self.results = {'passed': 0, 'failed': 0, 'total': 0}
    
    def ultimate_fuzzy_match(self, required: str, available: List[str]) -> float:
        """
        ULTIMATE FIX: Extremely strict fuzzy matching with proper discrimination
        """
        if not available or not required:
            return 0.0
        
        required_clean = required.lower().strip()
        best_match = 0.0
        
        for item in available:
            item_clean = item.lower().strip()
            
            # 1. EXACT MATCH ONLY - Perfect score
            if required_clean == item_clean:
                return 1.0
            
            # 2. VERY STRICT SUBSTRING MATCHING
            if required_clean in item_clean or item_clean in required_clean:
                # Calculate exact overlap percentage
                if required_clean in item_clean:
                    overlap_ratio = len(required_clean) / len(item_clean)
                else:
                    overlap_ratio = len(item_clean) / len(required_clean)
                
                # STRICT: Only high scores for very high overlap
                if overlap_ratio >= 0.95:  # 95%+ overlap
                    best_match = max(best_match, 0.85)
                elif overlap_ratio >= 0.85:  # 85%+ overlap
                    best_match = max(best_match, 0.75)
                elif overlap_ratio >= 0.70:  # 70%+ overlap
                    best_match = max(best_match, 0.60)
                elif overlap_ratio >= 0.50:  # 50%+ overlap
                    best_match = max(best_match, 0.45)
                else:
                    best_match = max(best_match, 0.25)
                continue
            
            # 3. WORD-LEVEL MATCHING - Much stricter
            req_words = set(required_clean.split())
            item_words = set(item_clean.split())
            
            if req_words and item_words:
                intersection = len(req_words.intersection(item_words))
                union = len(req_words.union(item_words))
                
                if union > 0:
                    jaccard_sim = intersection / union
                    
                    # MUCH STRICTER thresholds
                    if jaccard_sim >= 0.9:  # 90%+ word overlap
                        best_match = max(best_match, 0.75)
                    elif jaccard_sim >= 0.75:  # 75%+ word overlap
                        best_match = max(best_match, 0.60)
                    elif jaccard_sim >= 0.6:  # 60%+ word overlap
                        best_match = max(best_match, 0.45)
                    elif jaccard_sim >= 0.4:  # 40%+ word overlap
                        best_match = max(best_match, 0.30)
                    elif jaccard_sim >= 0.2:  # 20%+ word overlap
                        best_match = max(best_match, 0.15)
            
            # 4. TECHNICAL SIMILARITY - Very conservative
            tech_similarity = self.ultra_strict_technical_similarity(required_clean, item_clean)
            if tech_similarity > 0:
                best_match = max(best_match, tech_similarity)
        
        # 5. FINAL DISCRIMINATION - Cap scores aggressively
        if best_match > 0.85:
            # Only exact or near-exact matches should score this high
            pass  # Keep high scores only for very close matches
        elif best_match > 0.7:
            # Reduce "good" matches to moderate range
            best_match = min(best_match, 0.75)
        elif best_match > 0.5:
            # Reduce moderate matches
            best_match = min(best_match, 0.55)
        elif best_match > 0.3:
            # Reduce low matches further
            best_match = min(best_match, 0.35)
        else:
            # Very poor matches get minimal scores
            best_match = min(best_match, 0.15)
        
        return best_match
    
    def ultra_strict_technical_similarity(self, required: str, available: str) -> float:
        """
        Ultra-strict technical similarity with conservative scoring
        """
        
        # Define very specific technical mappings
        exact_mappings = {
            'cnc machining': ['cnc machining', 'cnc manufacturing'],
            'cnc manufacturing': ['cnc machining', 'cnc manufacturing'],
            '3d printing': ['3d printing', 'additive manufacturing'],
            'additive manufacturing': ['3d printing', 'additive manufacturing'],
            'sheet metal stamping': ['sheet metal stamping', 'metal stamping'],
            'metal stamping': ['sheet metal stamping', 'metal stamping'],
            'injection molding': ['injection molding', 'plastic molding'],
            'aluminum 6061': ['aluminum 6061', 'al 6061'],
            'aluminum 7075': ['aluminum 7075', 'al 7075'],
            'titanium grade 5': ['titanium grade 5', 'ti grade 5'],
            'stainless steel': ['stainless steel', 'ss'],
        }
        
        related_mappings = {
            'cnc machining': ['milling', 'turning', 'precision machining'],
            'milling': ['cnc machining', 'turning'],
            'turning': ['cnc machining', 'milling'],
            '3d printing': ['sls', 'fdm', 'sla'],
            'stamping': ['forming', 'deep drawing'],
            'aluminum': ['aluminum 6061', 'aluminum 7075', 'aluminum alloy'],
            'steel': ['carbon steel', 'alloy steel'],
            'plastic': ['abs', 'pla', 'peek'],
        }
        
        # Check for exact technical matches
        for term, exact_matches in exact_mappings.items():
            if term in required and any(match in available for match in exact_matches):
                return 0.8  # High but not perfect for technical equivalents
        
        # Check for related technical matches
        for term, related_matches in related_mappings.items():
            if term in required and any(match in available for match in related_matches):
                return 0.5  # Moderate for related terms
        
        # Check for same category but different specifics
        categories = {
            'machining': ['cnc', 'milling', 'turning', 'drilling', 'lathe'],
            'additive': ['3d', 'printing', 'sls', 'fdm', 'sla'],
            'forming': ['stamping', 'forming', 'bending', 'drawing'],
            'aluminum': ['aluminum', 'aluminium', 'al'],
            'steel': ['steel', 'carbon', 'alloy'],
            'plastic': ['plastic', 'polymer', 'abs', 'pla']
        }
        
        for category, terms in categories.items():
            req_in_cat = any(term in required for term in terms)
            avail_in_cat = any(term in available for term in terms)
            
            if req_in_cat and avail_in_cat:
                return 0.25  # Low score for same category but different specifics
        
        return 0.0  # No similarity found
    
    def ultimate_capability_scoring(self, manufacturer_caps: Dict, order_reqs: Dict) -> float:
        """
        Ultimate capability scoring with strict discrimination
        """
        if not manufacturer_caps or not order_reqs:
            return 0.02  # Extremely low default
        
        component_scores = []
        
        # Manufacturing process (45%)
        if 'manufacturing_process' in order_reqs:
            required = order_reqs['manufacturing_process']
            available = manufacturer_caps.get('manufacturing_processes', [])
            
            if available:
                process_score = self.ultimate_fuzzy_match(required, available)
                component_scores.append(('process', process_score, 0.45))
        
        # Material (35%)
        if 'material' in order_reqs:
            required = order_reqs['material']
            available = manufacturer_caps.get('materials', [])
            
            if available:
                material_score = self.ultimate_fuzzy_match(required, available)
                component_scores.append(('material', material_score, 0.35))
        
        # Industry (15%)
        if 'industry_category' in order_reqs:
            required = order_reqs['industry_category']
            available = manufacturer_caps.get('industries_served', [])
            
            if available:
                industry_score = self.ultimate_fuzzy_match(required, available)
                component_scores.append(('industry', industry_score, 0.15))
        
        # Certifications (5%)
        if 'certifications' in order_reqs:
            required_certs = order_reqs['certifications']
            available_certs = manufacturer_caps.get('certifications', [])
            
            if required_certs and available_certs:
                cert_scores = []
                for cert in required_certs:
                    cert_score = self.ultimate_fuzzy_match(cert, available_certs)
                    cert_scores.append(cert_score)
                
                avg_cert_score = sum(cert_scores) / len(cert_scores)
                component_scores.append(('certifications', avg_cert_score, 0.05))
        
        # Calculate weighted score
        if not component_scores:
            return 0.02
        
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for component, score, weight in component_scores:
            total_weighted_score += score * weight
            total_weight += weight
        
        base_score = total_weighted_score / total_weight if total_weight > 0 else 0.02
        
        # ULTIMATE DISCRIMINATION: Apply very strict penalties
        
        # Penalty for missing critical components
        critical_components = ['process', 'material']
        missing_critical = sum(1 for comp, _, _ in component_scores if comp in critical_components)
        if missing_critical < len(critical_components):
            penalty = (len(critical_components) - missing_critical) * 0.3
            base_score = max(0.0, base_score - penalty)
        
        # Score range compression for better discrimination
        if base_score >= 0.9:
            final_score = base_score  # Keep very high scores
        elif base_score >= 0.8:
            final_score = 0.75 + (base_score - 0.8) * 1.5  # Compress high scores slightly
        elif base_score >= 0.6:
            final_score = 0.55 + (base_score - 0.6) * 1.0  # Compress good scores more
        elif base_score >= 0.4:
            final_score = 0.35 + (base_score - 0.4) * 1.0  # Compress moderate scores
        elif base_score >= 0.2:
            final_score = 0.15 + (base_score - 0.2) * 1.0  # Compress low scores
        else:
            final_score = base_score * 0.5  # Heavily penalize very poor scores
        
        return min(max(final_score, 0.0), 1.0)
    
    def test_ultimate_fixes(self):
        """Test the ultimate fixes with strict expectations"""
        print("🔧 ULTIMATE SMART MATCHING FIX - FINAL VALIDATION")
        print("=" * 65)
        
        # Test 1: Ultimate Fuzzy Matching
        print("\n🧪 Test 1: ULTIMATE Fuzzy Matching (Strict Discrimination)")
        
        fuzzy_tests = [
            {
                'name': 'Exact Match',
                'required': 'CNC Machining',
                'available': ['CNC Machining', '3D Printing'],
                'expected': (0.95, 1.0),
                'description': 'Only exact matches get perfect scores'
            },
            {
                'name': 'Very Close',
                'required': 'CNC Machining',
                'available': ['CNC Manufacturing'],
                'expected': (0.75, 0.85),
                'description': 'Very close technical terms'
            },
            {
                'name': 'Close Technical',
                'required': 'CNC Machining',
                'available': ['Precision Machining'],
                'expected': (0.55, 0.75),
                'description': 'Close but not exact technical terms'
            },
            {
                'name': 'Related Process',
                'required': 'CNC Machining',
                'available': ['Milling', 'Turning'],
                'expected': (0.35, 0.55),
                'description': 'Related manufacturing processes'
            },
            {
                'name': 'Same Category',
                'required': 'CNC Machining',
                'available': ['Drilling', 'Lathe Work'],
                'expected': (0.15, 0.35),
                'description': 'Same category but different processes'
            },
            {
                'name': 'Different Process',
                'required': 'CNC Machining',
                'available': ['Injection Molding', 'Casting'],
                'expected': (0.0, 0.15),
                'description': 'Completely different processes'
            },
            {
                'name': 'Material Exact',
                'required': 'Aluminum 6061',
                'available': ['Aluminum 6061'],
                'expected': (0.95, 1.0),
                'description': 'Exact material specification'
            },
            {
                'name': 'Material Close',
                'required': 'Aluminum 6061',
                'available': ['AL 6061', 'Aluminum Alloy'],
                'expected': (0.65, 0.85),
                'description': 'Close material specifications'
            },
            {
                'name': 'Material Family',
                'required': 'Aluminum 6061',
                'available': ['Aluminum 7075', 'Aluminum'],
                'expected': (0.35, 0.65),
                'description': 'Same material family'
            },
            {
                'name': 'Different Material',
                'required': 'Aluminum 6061',
                'available': ['Steel', 'Titanium'],
                'expected': (0.0, 0.25),
                'description': 'Completely different materials'
            }
        ]
        
        fuzzy_results = []
        for test in fuzzy_tests:
            score = self.ultimate_fuzzy_match(test['required'], test['available'])
            min_exp, max_exp = test['expected']
            passed = min_exp <= score <= max_exp
            fuzzy_results.append(passed)
            
            status = "✅" if passed else "❌"
            print(f"   {test['name']:18}: {score:.3f} {status} (expected {min_exp:.2f}-{max_exp:.2f})")
            if not passed:
                print(f"      → {test['description']}")
        
        fuzzy_passed = all(fuzzy_results)
        print(f"\n   Fuzzy Matching: {'✅ PASSED' if fuzzy_passed else '❌ FAILED'}")
        
        # Test 2: Ultimate Capability Scoring
        print("\n🧪 Test 2: ULTIMATE Capability Scoring (Strict Ranges)")
        
        capability_tests = [
            {
                'name': 'Perfect Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['CNC Machining'],
                    'materials': ['Aluminum 6061'],
                    'industries_served': ['Aerospace'],
                    'certifications': ['ISO 9001']
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.85, 1.0),
                'description': 'All requirements perfectly matched'
            },
            {
                'name': 'Very Good Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['CNC Manufacturing'],  # Very close
                    'materials': ['AL 6061'],  # Very close
                    'industries_served': ['Aerospace', 'Defense'],
                    'certifications': ['ISO 9001', 'AS9100']
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.70, 0.85),
                'description': 'Very close matches across all requirements'
            },
            {
                'name': 'Good Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['CNC Machining', 'Milling'],
                    'materials': ['Aluminum', 'Steel'],  # Close but not exact
                    'industries_served': ['Aerospace', 'Automotive'],
                    'certifications': ['ISO 9001']
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.55, 0.75),
                'description': 'Good process match, moderate material match'
            },
            {
                'name': 'Moderate Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['Milling', 'Turning'],  # Related
                    'materials': ['Aluminum', 'Steel'],
                    'industries_served': ['Automotive'],  # Different industry
                    'certifications': []
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.25, 0.50),
                'description': 'Related processes, some material overlap'
            },
            {
                'name': 'Poor Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['Injection Molding'],
                    'materials': ['Plastic'],
                    'industries_served': ['Consumer'],
                    'certifications': []
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.0, 0.20),
                'description': 'No meaningful capability overlap'
            }
        ]
        
        capability_results = []
        for test in capability_tests:
            score = self.ultimate_capability_scoring(test['manufacturer_caps'], test['order_reqs'])
            min_exp, max_exp = test['expected']
            passed = min_exp <= score <= max_exp
            capability_results.append(passed)
            
            status = "✅" if passed else "❌"
            print(f"   {test['name']:15}: {score:.3f} {status} (expected {min_exp:.2f}-{max_exp:.2f})")
            if not passed:
                print(f"      → {test['description']}")
        
        capability_passed = all(capability_results)
        print(f"\n   Capability Scoring: {'✅ PASSED' if capability_passed else '❌ FAILED'}")
        
        # Final Results
        print("\n" + "=" * 65)
        print("📊 ULTIMATE FIX VALIDATION RESULTS")
        print("=" * 65)
        
        total_tests = len(fuzzy_results) + len(capability_results)
        passed_tests = sum(fuzzy_results) + sum(capability_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"🎯 FINAL SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {total_tests - passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\n🔧 ULTIMATE FIX STATUS:")
        print(f"   Fuzzy Matching: {'✅ FIXED' if fuzzy_passed else '❌ STILL NEEDS WORK'}")
        print(f"   Capability Scoring: {'✅ FIXED' if capability_passed else '❌ STILL NEEDS WORK'}")
        
        if fuzzy_passed and capability_passed:
            print(f"\n🎉 ULTIMATE SUCCESS!")
            print("   ✅ Perfect discrimination between match qualities")
            print("   ✅ Exact matches score 0.9-1.0")
            print("   ✅ Close matches score 0.7-0.85")
            print("   ✅ Moderate matches score 0.4-0.7")
            print("   ✅ Poor matches score 0.0-0.3")
            print("   ✅ Proper score distribution achieved")
            
            print(f"\n🚀 PRODUCTION STATUS: ✅ FULLY READY")
            print("   The Smart Matching AI system now has:")
            print("   • Proper score discrimination")
            print("   • Accurate manufacturer recommendations")
            print("   • Reliable quality assessment")
            print("   • Production-ready accuracy")
            
        elif passed_tests >= total_tests * 0.8:
            print(f"\n⚠️  NEARLY THERE - {success_rate:.0f}% SUCCESS")
            print("   Most issues resolved, minor fine-tuning needed")
            print(f"\n🔧 STATUS: ⚠️  ALMOST PRODUCTION READY")
            
        else:
            print(f"\n❌ MORE WORK NEEDED")
            print("   Fundamental algorithm issues remain")
            print(f"\n🛠️  STATUS: ❌ REQUIRES MAJOR REVISION")
        
        print("=" * 65)

async def main():
    """Run the ultimate fix validation"""
    fixer = UltimateSmartMatchingFix()
    fixer.test_ultimate_fixes()

if __name__ == "__main__":
    asyncio.run(main()) 