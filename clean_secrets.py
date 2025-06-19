#!/usr/bin/env python3
"""
Script to clean Stripe API key patterns from files
This will be used with git filter-branch to clean commit history
"""

import re
import sys
import os

def clean_stripe_patterns(content):
    """Remove Stripe API key patterns from content"""
    
    # Replace sk_test_ patterns
    content = re.sub(r'sk_test_[A-Za-z0-9]{24,}', 'your_stripe_secret_key_here', content)
    content = re.sub(r'sk_test_[A-Za-z0-9_]{20,}', 'your_stripe_secret_key_here', content)
    content = re.sub(r'STRIPE_SECRET_KEY=sk_test_[A-Za-z0-9]{20,}', 'STRIPE_SECRET_KEY=your_stripe_secret_key_here', content)
    
    # Replace pk_test_ patterns  
    content = re.sub(r'pk_test_[A-Za-z0-9]{24,}', 'your_stripe_publishable_key_here', content)
    content = re.sub(r'pk_test_[A-Za-z0-9_]{20,}', 'your_stripe_publishable_key_here', content)
    content = re.sub(r'STRIPE_PUBLISHABLE_KEY=pk_test_[A-Za-z0-9]{20,}', 'STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here', content)
    
    # Replace any remaining sk_test_ or pk_test_ patterns with X's
    content = re.sub(r'sk_test_X{20,}', 'your_stripe_secret_key_here', content)
    content = re.sub(r'pk_test_X{20,}', 'your_stripe_publishable_key_here', content)
    
    return content

def main():
    if len(sys.argv) != 2:
        print("Usage: python clean_secrets.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        cleaned_content = clean_stripe_patterns(content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        print(f"Cleaned: {file_path}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 