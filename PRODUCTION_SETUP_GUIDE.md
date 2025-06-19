# 🚀 PRODUCTION SETUP GUIDE

## CRITICAL INFRASTRUCTURE SETUP

### 1. Create Production Environment File
Create `backend/.env.production` with these settings:

```bash
# Environment
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://manufacturing_user:your_password@localhost:5432/manufacturing_production

# Security (CHANGE THESE!)
SECRET_KEY=your_32_character_production_secret_key
JWT_SECRET_KEY=your_32_character_jwt_secret_key

# Email Service
SENDGRID_API_KEY=SG.your_production_api_key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# Stripe Production
STRIPE_SECRET_KEY=sk_live_your_production_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Features - ENABLED for production
ENABLE_EMAIL_VERIFICATION=true
ENABLE_AI_MATCHING=true
ENABLE_PAYMENT_ESCROW=true
```

### 2. Database Setup Commands
```bash
# Install PostgreSQL
# Create production database
createdb manufacturing_production
createuser manufacturing_user --encrypted --pwprompt

# Run migrations
cd backend
alembic upgrade head
```

### 3. Start Production Server
```bash
cd backend
python main.py --env=production
``` 