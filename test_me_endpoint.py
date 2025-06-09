#!/usr/bin/env python3
import requests
import json

# Get token first
login_data = {'username': 'testuser_20250608_211628@example.com', 'password': 'TestPassword123!'}
response = requests.post('http://localhost:8000/api/v1/auth/login', data=login_data)
if response.status_code == 200:
    token = response.json()['access_token']
    print('Token obtained:', token[:20] + '...')
    
    # Test /auth/me
    headers = {'Authorization': f'Bearer {token}'}
    me_response = requests.get('http://localhost:8000/api/v1/auth/me', headers=headers)
    print('ME Response Status:', me_response.status_code)
    print('ME Response:', me_response.text)
else:
    print('Login failed:', response.status_code, response.text) 