#!/usr/bin/env python3
"""
Test password validation fix
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_password_validation():
    """Test that TestPassword123! passes validation"""
    
    from app.core.security import PasswordValidator, get_password_hash
    
    test_password = "TestPassword123!"
    
    print(f"Testing password: {test_password}")
    
    # Test PasswordValidator
    is_valid, errors = PasswordValidator.validate_password_strength(test_password)
    print(f"PasswordValidator result: {is_valid}")
    if not is_valid:
        print(f"Errors: {errors}")
    
    # Test password hashing
    try:
        hash_result = get_password_hash(test_password)
        print(f"✅ Password hashing successful")
        print(f"Hash length: {len(hash_result)}")
    except Exception as e:
        print(f"❌ Password hashing failed: {e}")
    
    # Test other passwords
    test_cases = [
        ("password123", "Should fail - no uppercase, too common"),
        ("PASSWORD123", "Should fail - no lowercase"),
        ("Password", "Should fail - no digits, no special chars"),
        ("Password123", "Should fail - no special chars"),
        ("TestPassword123!", "Should pass - meets all requirements"),
        ("NewPassword456@", "Should pass - meets all requirements")
    ]
    
    print("\n📋 Testing various passwords:")
    for password, expected in test_cases:
        is_valid, errors = PasswordValidator.validate_password_strength(password)
        status = "✅ PASS" if is_valid else "❌ FAIL"
        print(f"{status} {password}: {expected}")
        if not is_valid:
            print(f"    Errors: {errors}")

if __name__ == "__main__":
    test_password_validation() 