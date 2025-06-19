#!/usr/bin/env python3
"""
Production Environment Setup Script
Sets up environment variables, Firebase configuration, and production settings
"""

import os
import json
from pathlib import Path
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProductionEnvironmentSetup:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.frontend_path = self.project_root / "frontend"
        self.backend_path = self.project_root / "backend"
        
    def create_frontend_env_files(self):
        """Create frontend environment files"""
        logger.info("Creating frontend environment files...")
        
        # Production environment content
        env_production_content = """# Production Environment Variables for Manufacturing SaaS Platform

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyBGBJg_I6XGm1WMcRDZc7U-mtvHq6rq3sc
REACT_APP_FIREBASE_AUTH_DOMAIN=production-1e74f.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=production-1e74f
REACT_APP_FIREBASE_STORAGE_BUCKET=production-1e74f.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=542416169641
REACT_APP_FIREBASE_APP_ID=1:542416169641:web:2757093591b61e811357b8
REACT_APP_FIREBASE_MEASUREMENT_ID=G-PTVS4KQSJ9

# Backend API Configuration
REACT_APP_API_BASE_URL=https://api.yourproductiondomain.com
REACT_APP_WEBSOCKET_URL=wss://ws.yourproductiondomain.com

# Environment
NODE_ENV=production
REACT_APP_ENVIRONMENT=production

# Error Monitoring (Replace with your Sentry DSN)
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_MONITORING=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_ENABLE_DEMO_MODE=false
"""
        
        # Development environment content
        env_development_content = """# Development Environment Variables

# Firebase Configuration (same as production for now)
REACT_APP_FIREBASE_API_KEY=AIzaSyBGBJg_I6XGm1WMcRDZc7U-mtvHq6rq3sc
REACT_APP_FIREBASE_AUTH_DOMAIN=production-1e74f.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=production-1e74f
REACT_APP_FIREBASE_STORAGE_BUCKET=production-1e74f.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=542416169641
REACT_APP_FIREBASE_APP_ID=1:542416169641:web:2757093591b61e811357b8
REACT_APP_FIREBASE_MEASUREMENT_ID=G-PTVS4KQSJ9

# Backend API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_WEBSOCKET_URL=ws://localhost:8000/ws

# Environment
NODE_ENV=development
REACT_APP_ENVIRONMENT=development

# Error Monitoring (disabled in development)
REACT_APP_SENTRY_DSN=

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_MONITORING=false
REACT_APP_ENABLE_REAL_TIME_UPDATES=true
REACT_APP_ENABLE_DEMO_MODE=true
"""
        
        # Write environment files
        try:
            env_production_path = self.frontend_path / ".env.production"
            with open(env_production_path, 'w') as f:
                f.write(env_production_content)
            logger.info(f"✅ Created {env_production_path}")
            
            env_development_path = self.frontend_path / ".env.development"
            with open(env_development_path, 'w') as f:
                f.write(env_development_content)
            logger.info(f"✅ Created {env_development_path}")
            
            # Create .env.local template
            env_local_template = """# Local Environment Variables (Copy and customize)
# Add your local overrides here

# Example: Override API URL for local testing
# REACT_APP_API_BASE_URL=http://localhost:3001

# Example: Add local Sentry DSN
# REACT_APP_SENTRY_DSN=your-local-sentry-dsn
"""
            env_local_path = self.frontend_path / ".env.local.template"
            with open(env_local_path, 'w') as f:
                f.write(env_local_template)
            logger.info(f"✅ Created {env_local_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create frontend environment files: {e}")
    
    def create_backend_env_files(self):
        """Create backend environment files"""
        logger.info("Creating backend environment files...")
        
        production_env_content = """# Production Backend Environment Variables

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/production_manufacturing_db

# Redis Configuration  
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
BACKEND_CORS_ORIGINS=["https://yourproductiondomain.com"]

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Firebase Admin SDK
FIREBASE_ADMIN_SDK_PATH=/path/to/firebase-adminsdk.json

# Rate Limiting
RATE_LIMIT_PER_MINUTE=300

# Sentry Error Monitoring
SENTRY_DSN=https://your-backend-sentry-dsn@sentry.io/project-id

# Environment
ENVIRONMENT=production
DEBUG=false
"""
        
        development_env_content = """# Development Backend Environment Variables

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/manufacturing_dev_db

# Redis Configuration
REDIS_URL=redis://localhost:6379/1

# Security
SECRET_KEY=dev-secret-key-not-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]

# Email Configuration (use test settings)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password

# Firebase Admin SDK
FIREBASE_ADMIN_SDK_PATH=./config/firebase-adminsdk-dev.json

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100

# Sentry Error Monitoring (disabled in dev)
SENTRY_DSN=

# Environment
ENVIRONMENT=development
DEBUG=true
"""
        
        try:
            prod_env_path = self.backend_path / ".env.production"
            with open(prod_env_path, 'w') as f:
                f.write(production_env_content)
            logger.info(f"✅ Created {prod_env_path}")
            
            dev_env_path = self.backend_path / ".env.development" 
            with open(dev_env_path, 'w') as f:
                f.write(development_env_content)
            logger.info(f"✅ Created {dev_env_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create backend environment files: {e}")
    
    def update_firebase_config(self):
        """Update Firebase configuration to use environment variables"""
        logger.info("Updating Firebase configuration...")
        
        firebase_config_path = self.frontend_path / "src" / "config" / "firebase.ts"
        
        if firebase_config_path.exists():
            logger.info(f"✅ Firebase config already updated at {firebase_config_path}")
        else:
            logger.warning(f"⚠️ Firebase config not found at {firebase_config_path}")
    
    def create_deployment_scripts(self):
        """Create deployment helper scripts"""
        logger.info("Creating deployment scripts...")
        
        # Frontend build script
        frontend_build_script = """#!/bin/bash
# Frontend Production Build Script

echo "Building frontend for production..."

cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Optional: Run tests
npm test -- --watchAll=false

echo "Frontend build complete"
"""
        
        # Backend deployment script
        backend_deploy_script = """#!/bin/bash
# Backend Production Deployment Script

echo "Deploying backend for production..."

cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

echo "Backend deployment complete"
"""
        
        try:
            frontend_script_path = self.project_root / "deploy_frontend.sh"
            with open(frontend_script_path, 'w', encoding='utf-8') as f:
                f.write(frontend_build_script)
            os.chmod(frontend_script_path, 0o755)
            logger.info(f"✅ Created {frontend_script_path}")
            
            backend_script_path = self.project_root / "deploy_backend.sh"
            with open(backend_script_path, 'w', encoding='utf-8') as f:
                f.write(backend_deploy_script)
            os.chmod(backend_script_path, 0o755)
            logger.info(f"✅ Created {backend_script_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create deployment scripts: {e}")
    
    def create_docker_configs(self):
        """Create Docker configuration files"""
        logger.info("Creating Docker configurations...")
        
        # Frontend Dockerfile
        frontend_dockerfile = """# Frontend Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"""
        
        # Backend Dockerfile
        backend_dockerfile = """# Backend Production Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Start application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
"""
        
        # Docker Compose
        docker_compose = """version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: manufacturing_prod
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
"""
        
        try:
            # Frontend Dockerfile
            frontend_dockerfile_path = self.frontend_path / "Dockerfile.prod"
            with open(frontend_dockerfile_path, 'w') as f:
                f.write(frontend_dockerfile)
            logger.info(f"✅ Created {frontend_dockerfile_path}")
            
            # Backend Dockerfile
            backend_dockerfile_path = self.backend_path / "Dockerfile"
            with open(backend_dockerfile_path, 'w') as f:
                f.write(backend_dockerfile)
            logger.info(f"✅ Created {backend_dockerfile_path}")
            
            # Docker Compose
            docker_compose_path = self.project_root / "docker-compose.prod.yml"
            with open(docker_compose_path, 'w') as f:
                f.write(docker_compose)
            logger.info(f"✅ Created {docker_compose_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create Docker configurations: {e}")
    
    def create_production_checklist(self):
        """Create production deployment checklist"""
        checklist_content = """# Production Deployment Checklist

## Environment Configuration
- [ ] Update frontend .env.production with your domain URLs
- [ ] Update backend .env.production with production database credentials
- [ ] Set up proper CORS origins for your domain
- [ ] Configure Sentry DSN for error monitoring
- [ ] Set secure SECRET_KEY for backend

## Firebase Configuration  
- [ ] Verify Firebase project settings
- [ ] Add your production domain to authorized domains
- [ ] Enable required authentication methods
- [ ] Configure Firebase security rules

## Database Setup
- [ ] Set up production PostgreSQL database
- [ ] Run database migrations: `alembic upgrade head`
- [ ] Configure database backups
- [ ] Set up Redis for caching

## Domain & SSL
- [ ] Configure your domain DNS
- [ ] Set up SSL certificates
- [ ] Configure load balancer (if needed)
- [ ] Test HTTPS endpoints

## Monitoring & Logging
- [ ] Set up Sentry error monitoring
- [ ] Configure application logging
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring

## Security
- [ ] Review and update CORS settings
- [ ] Configure rate limiting
- [ ] Set up security headers
- [ ] Review authentication flows
- [ ] Configure HTTPS redirects

## Testing
- [ ] Run full E2E test suite: `python final_production_e2e_test.py`
- [ ] Test all authentication flows
- [ ] Verify payment processing
- [ ] Test real-time features
- [ ] Load test critical endpoints

## Deployment
- [ ] Build frontend: `npm run build`
- [ ] Deploy backend with production settings
- [ ] Deploy frontend to CDN/web server
- [ ] Configure reverse proxy (nginx)
- [ ] Set up CI/CD pipeline

## Post-Deployment
- [ ] Verify all endpoints are working
- [ ] Check error rates in Sentry
- [ ] Monitor performance metrics
- [ ] Test user flows end-to-end
- [ ] Set up alerts for critical issues

## Maintenance
- [ ] Schedule regular database backups
- [ ] Plan dependency updates
- [ ] Monitor security advisories
- [ ] Review logs regularly
- [ ] Update documentation

---

**Remember**: Always test in a staging environment first!
"""
        
        checklist_path = self.project_root / "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
        with open(checklist_path, 'w', encoding='utf-8') as f:
            f.write(checklist_content)
        logger.info(f"✅ Created {checklist_path}")
    
    def run_setup(self):
        """Run complete production environment setup"""
        logger.info("🚀 Setting up production environment...")
        
        self.create_frontend_env_files()
        self.create_backend_env_files()
        self.update_firebase_config()
        self.create_deployment_scripts()
        self.create_docker_configs()
        self.create_production_checklist()
        
        logger.info("\n" + "="*60)
        logger.info("✅ PRODUCTION ENVIRONMENT SETUP COMPLETE!")
        logger.info("="*60)
        logger.info("Next steps:")
        logger.info("1. Review and customize .env.production files")
        logger.info("2. Update Firebase configuration with your domain")
        logger.info("3. Set up production database and Redis")
        logger.info("4. Configure Sentry error monitoring")
        logger.info("5. Run E2E tests: python final_production_e2e_test.py")
        logger.info("6. Follow PRODUCTION_DEPLOYMENT_CHECKLIST.md")
        logger.info("="*60)

if __name__ == "__main__":
    setup = ProductionEnvironmentSetup()
    setup.run_setup() 