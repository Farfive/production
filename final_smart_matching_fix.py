#!/usr/bin/env python3
"""
Final Smart Matching System Fix
Addresses remaining issues with fuzzy matching and scoring discrimination
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import asyncio
import re

class FinalSmartMatchingFix:
    """Final implementation with all issues resolved"""
    
    def __init__(self):
        self.results = {'passed': 0, 'failed': 0, 'total': 0}
        
        # Penalty weights
        self.penalty_weights = {
            'industry_mismatch': 0.25,
            'certification_gap': 0.20,
            'capacity_mismatch': 0.15,
            'material_incompatibility': 0.20,
            'process_mismatch': 0.20
        }
        
        # Technical similarity thresholds
        self.similarity_thresholds = {
            'exact_match': 1.0,
            'high_similarity': 0.8,
            'moderate_similarity': 0.6,
            'low_similarity': 0.3,
            'no_match': 0.0
        }
    
    def final_enhanced_fuzzy_match(self, required: str, available: List[str]) -> float:
        """
        FINAL FIX: Properly discriminating fuzzy matching algorithm
        """
        if not available or not required:
            return 0.0
        
        required_clean = required.lower().strip()
        best_match = 0.0
        
        for item in available:
            item_clean = item.lower().strip()
            
            # 1. EXACT MATCH - Perfect score
            if required_clean == item_clean:
                return 1.0
            
            # 2. EXACT SUBSTRING MATCH - High score
            if required_clean in item_clean or item_clean in required_clean:
                # Calculate how much of the strings overlap
                overlap_ratio = min(len(required_clean), len(item_clean)) / max(len(required_clean), len(item_clean))
                
                # Only give high scores for substantial overlaps
                if overlap_ratio >= 0.8:
                    best_match = max(best_match, 0.9)
                elif overlap_ratio >= 0.6:
                    best_match = max(best_match, 0.7)
                else:
                    best_match = max(best_match, 0.5)
                continue
            
            # 3. WORD-LEVEL MATCHING - Moderate scores
            req_words = set(required_clean.split())
            item_words = set(item_clean.split())
            
            if req_words and item_words:
                # Calculate Jaccard similarity
                intersection = len(req_words.intersection(item_words))
                union = len(req_words.union(item_words))
                
                if union > 0:
                    jaccard_sim = intersection / union
                    
                    # Apply stricter thresholds
                    if jaccard_sim >= 0.8:
                        best_match = max(best_match, 0.8)
                    elif jaccard_sim >= 0.6:
                        best_match = max(best_match, 0.6)
                    elif jaccard_sim >= 0.4:
                        best_match = max(best_match, 0.4)
                    elif jaccard_sim >= 0.2:
                        best_match = max(best_match, 0.2)
            
            # 4. TECHNICAL SIMILARITY - Domain-specific matching
            tech_similarity = self.calculate_strict_technical_similarity(required_clean, item_clean)
            if tech_similarity > 0:
                best_match = max(best_match, tech_similarity)
        
        # 5. APPLY FINAL DISCRIMINATION RULES
        # If no good match found, ensure score is very low
        if best_match < 0.3:
            best_match *= 0.3  # Further reduce poor matches
        
        # Cap moderate matches to prevent over-scoring
        if 0.3 <= best_match < 0.7:
            best_match = min(best_match, 0.6)
        
        return min(best_match, 1.0)
    
    def calculate_strict_technical_similarity(self, required: str, available: str) -> float:
        """
        FINAL FIX: Strict technical similarity with proper discrimination
        """
        
        # Define technical term hierarchies with similarity scores
        technical_hierarchies = {
            'machining': {
                'exact': ['cnc machining', 'cnc manufacturing'],
                'high': ['cnc', 'milling', 'turning', 'precision machining'],
                'moderate': ['machining', 'drilling', 'lathe'],
                'low': ['cutting', 'fabrication']
            },
            'additive': {
                'exact': ['3d printing', 'additive manufacturing'],
                'high': ['sls', 'fdm', 'sla', 'stereolithography'],
                'moderate': ['printing', 'rapid prototyping'],
                'low': ['prototyping']
            },
            'forming': {
                'exact': ['sheet metal stamping', 'metal stamping'],
                'high': ['stamping', 'deep drawing', 'forming'],
                'moderate': ['bending', 'pressing'],
                'low': ['shaping']
            },
            'casting': {
                'exact': ['injection molding', 'die casting'],
                'high': ['molding', 'casting'],
                'moderate': ['sand casting', 'investment casting'],
                'low': ['pouring']
            }
        }
        
        material_hierarchies = {
            'aluminum': {
                'exact': ['aluminum 6061', 'aluminum 7075'],
                'high': ['aluminum', 'aluminium', 'al 6061', 'al 7075'],
                'moderate': ['al', 'aluminum alloy', 'aluminium alloy'],
                'low': ['light metal', 'non-ferrous']
            },
            'steel': {
                'exact': ['high strength steel', 'carbon steel'],
                'high': ['steel', 'alloy steel', 'mild steel'],
                'moderate': ['carbon', 'iron'],
                'low': ['metal', 'ferrous']
            },
            'stainless': {
                'exact': ['stainless steel 316', 'stainless steel 304'],
                'high': ['stainless steel', 'stainless', 'ss 316', 'ss 304'],
                'moderate': ['ss', 'corrosion resistant'],
                'low': ['steel']
            },
            'titanium': {
                'exact': ['titanium grade 5', 'titanium grade 2'],
                'high': ['titanium', 'ti grade 5', 'ti grade 2'],
                'moderate': ['ti', 'titanium alloy'],
                'low': ['aerospace metal', 'high strength']
            },
            'plastic': {
                'exact': ['peek', 'pei', 'abs plastic'],
                'high': ['plastic', 'polymer', 'abs', 'pla'],
                'moderate': ['thermoplastic', 'resin'],
                'low': ['synthetic']
            }
        }
        
        all_hierarchies = {**technical_hierarchies, **material_hierarchies}
        
        # Find the best match across all hierarchies
        best_similarity = 0.0
        
        for category, hierarchy in all_hierarchies.items():
            req_level = self._find_term_level(required, hierarchy)
            avail_level = self._find_term_level(available, hierarchy)
            
            if req_level and avail_level:
                # Calculate similarity based on hierarchy levels
                if req_level == avail_level:
                    if req_level == 'exact':
                        similarity = 1.0
                    elif req_level == 'high':
                        similarity = 0.8
                    elif req_level == 'moderate':
                        similarity = 0.6
                    else:  # low
                        similarity = 0.4
                else:
                    # Different levels in same category
                    level_scores = {'exact': 4, 'high': 3, 'moderate': 2, 'low': 1}
                    req_score = level_scores.get(req_level, 0)
                    avail_score = level_scores.get(avail_level, 0)
                    
                    # Calculate cross-level similarity
                    max_score = max(req_score, avail_score)
                    min_score = min(req_score, avail_score)
                    
                    if max_score > 0:
                        cross_similarity = (min_score / max_score) * 0.6  # Reduced for cross-level
                        similarity = cross_similarity
                    else:
                        similarity = 0.0
                
                best_similarity = max(best_similarity, similarity)
        
        return best_similarity
    
    def _find_term_level(self, term: str, hierarchy: Dict[str, List[str]]) -> str:
        """Find which level a term belongs to in the hierarchy"""
        term_lower = term.lower()
        
        for level, terms in hierarchy.items():
            for hier_term in terms:
                if hier_term in term_lower or term_lower in hier_term:
                    return level
        
        return None
    
    def calculate_final_capability_score(self, manufacturer_capabilities: Dict, order_requirements: Dict) -> float:
        """
        FINAL FIX: Capability scoring with proper discrimination
        """
        if not manufacturer_capabilities or not order_requirements:
            return 0.05  # Very low default
        
        total_score = 0.0
        weight_sum = 0.0
        
        # Manufacturing process matching (45%)
        if 'manufacturing_process' in order_requirements:
            required = order_requirements['manufacturing_process']
            available = manufacturer_capabilities.get('manufacturing_processes', [])
            
            if available:
                process_match = self.final_enhanced_fuzzy_match(required, available)
                total_score += process_match * 0.45
                weight_sum += 0.45
        
        # Material expertise (35%)
        if 'material' in order_requirements:
            required = order_requirements['material']
            available = manufacturer_capabilities.get('materials', [])
            
            if available:
                material_match = self.final_enhanced_fuzzy_match(required, available)
                total_score += material_match * 0.35
                weight_sum += 0.35
        
        # Industry experience (15%)
        if 'industry_category' in order_requirements:
            required = order_requirements['industry_category']
            available = manufacturer_capabilities.get('industries_served', [])
            
            if available:
                industry_match = self.final_enhanced_fuzzy_match(required, available)
                total_score += industry_match * 0.15
                weight_sum += 0.15
        
        # Certifications (5%)
        if 'certifications' in order_requirements:
            required_certs = order_requirements['certifications']
            available_certs = manufacturer_capabilities.get('certifications', [])
            
            if required_certs and available_certs:
                cert_matches = []
                for cert in required_certs:
                    cert_match = self.final_enhanced_fuzzy_match(cert, available_certs)
                    cert_matches.append(cert_match)
                
                avg_cert_match = sum(cert_matches) / len(cert_matches)
                total_score += avg_cert_match * 0.05
                weight_sum += 0.05
        
        final_score = total_score / weight_sum if weight_sum > 0 else 0.05
        
        # FINAL DISCRIMINATION: Apply stricter penalties
        if final_score < 0.4:
            final_score *= 0.4  # Heavily penalize poor matches
        elif final_score < 0.7:
            final_score *= 0.8  # Moderately penalize average matches
        
        return min(final_score, 1.0)
    
    def test_final_fixes(self):
        """Test the final fixes"""
        print("🔧 FINAL SMART MATCHING FIXES - COMPREHENSIVE TEST")
        print("=" * 60)
        
        # Test 1: Final Fuzzy Matching
        print("\n🧪 Test 1: FINAL Fuzzy Matching Discrimination")
        
        fuzzy_tests = [
            {
                'name': 'Exact Match',
                'required': 'CNC Machining',
                'available': ['CNC Machining', '3D Printing'],
                'expected': (0.95, 1.0),
                'description': 'Perfect match should score very high'
            },
            {
                'name': 'Close Technical',
                'required': 'CNC Machining',
                'available': ['CNC Manufacturing', 'Precision Machining'],
                'expected': (0.7, 0.85),
                'description': 'Close technical terms should score high but not perfect'
            },
            {
                'name': 'Related Process',
                'required': 'CNC Machining',
                'available': ['Milling', 'Turning'],
                'expected': (0.4, 0.65),
                'description': 'Related processes should score moderately'
            },
            {
                'name': 'Different Process',
                'required': 'CNC Machining',
                'available': ['Injection Molding', 'Casting'],
                'expected': (0.0, 0.25),
                'description': 'Unrelated processes should score low'
            },
            {
                'name': 'Material Exact',
                'required': 'Aluminum 6061',
                'available': ['Aluminum 6061', 'Steel'],
                'expected': (0.95, 1.0),
                'description': 'Exact material match should be perfect'
            },
            {
                'name': 'Material Family',
                'required': 'Aluminum 6061',
                'available': ['Aluminum 7075', 'Aluminum Alloy'],
                'expected': (0.6, 0.8),
                'description': 'Same material family should score moderately high'
            },
            {
                'name': 'Different Material',
                'required': 'Aluminum 6061',
                'available': ['Steel', 'Titanium'],
                'expected': (0.0, 0.3),
                'description': 'Different materials should score low'
            }
        ]
        
        fuzzy_results = []
        for test in fuzzy_tests:
            score = self.final_enhanced_fuzzy_match(test['required'], test['available'])
            min_exp, max_exp = test['expected']
            passed = min_exp <= score <= max_exp
            fuzzy_results.append(passed)
            
            status = "✅" if passed else "❌"
            print(f"   {test['name']:18}: {score:.3f} {status} (expected {min_exp:.1f}-{max_exp:.1f})")
            if not passed:
                print(f"      → {test['description']}")
        
        fuzzy_passed = all(fuzzy_results)
        print(f"\n   Fuzzy Matching: {'✅ PASSED' if fuzzy_passed else '❌ FAILED'}")
        
        # Test 2: Final Capability Scoring
        print("\n🧪 Test 2: FINAL Capability Scoring Discrimination")
        
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
                'description': 'Perfect capability match'
            },
            {
                'name': 'Good Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['CNC Machining', '3D Printing'],
                    'materials': ['Aluminum', 'Steel'],
                    'industries_served': ['Aerospace', 'Automotive'],
                    'certifications': ['ISO 9001']
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.6, 0.8),
                'description': 'Good but not perfect match'
            },
            {
                'name': 'Moderate Match',
                'manufacturer_caps': {
                    'manufacturing_processes': ['CNC Machining'],
                    'materials': ['Steel', 'Stainless Steel'],
                    'industries_served': ['Automotive'],
                    'certifications': []
                },
                'order_reqs': {
                    'manufacturing_process': 'CNC Machining',
                    'material': 'Aluminum 6061',
                    'industry_category': 'Aerospace',
                    'certifications': ['ISO 9001']
                },
                'expected': (0.3, 0.55),
                'description': 'Some capability overlap'
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
                'expected': (0.0, 0.25),
                'description': 'No meaningful capability overlap'
            }
        ]
        
        capability_results = []
        for test in capability_tests:
            score = self.calculate_final_capability_score(test['manufacturer_caps'], test['order_reqs'])
            min_exp, max_exp = test['expected']
            passed = min_exp <= score <= max_exp
            capability_results.append(passed)
            
            status = "✅" if passed else "❌"
            print(f"   {test['name']:15}: {score:.3f} {status} (expected {min_exp:.1f}-{max_exp:.1f})")
            if not passed:
                print(f"      → {test['description']}")
        
        capability_passed = all(capability_results)
        print(f"\n   Capability Scoring: {'✅ PASSED' if capability_passed else '❌ FAILED'}")
        
        # Final Results
        print("\n" + "=" * 60)
        print("📊 FINAL FIX VALIDATION RESULTS")
        print("=" * 60)
        
        total_tests = len(fuzzy_results) + len(capability_results)
        passed_tests = sum(fuzzy_results) + sum(capability_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"🎯 SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {total_tests - passed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\n🔧 COMPONENT STATUS:")
        print(f"   Fuzzy Matching: {'✅ FIXED' if fuzzy_passed else '❌ NEEDS MORE WORK'}")
        print(f"   Capability Scoring: {'✅ FIXED' if capability_passed else '❌ NEEDS MORE WORK'}")
        
        if fuzzy_passed and capability_passed:
            print(f"\n🎉 ALL CRITICAL FIXES SUCCESSFUL!")
            print("   ✅ Fuzzy matching now properly discriminates")
            print("   ✅ Capability scoring has appropriate ranges")
            print("   ✅ Poor matches receive low scores")
            print("   ✅ Good matches receive appropriate scores")
            print("   ✅ Perfect matches receive high scores")
            
            print(f"\n🚀 FINAL STATUS: ✅ READY FOR PRODUCTION")
            print("   The Smart Matching AI system is now properly calibrated")
            print("   and ready for real-world deployment!")
            
        else:
            print(f"\n⚠️  SOME ISSUES REMAIN")
            print("   Additional fine-tuning may be needed")
            print(f"\n🔧 STATUS: ⚠️  NEEDS FINAL ADJUSTMENTS")
        
        print("=" * 60)

async def main():
    """Run the final fix validation"""
    fixer = FinalSmartMatchingFix()
    fixer.test_final_fixes()

if __name__ == "__main__":
    asyncio.run(main()) 