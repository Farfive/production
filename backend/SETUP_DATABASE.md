# Database Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://manufacturing_user:manufacturing_pass@localhost:5432/manufacturing_db

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid Configuration
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@yourcompany.com

# Application Settings
DEBUG=True
ENVIRONMENT=development
```

### 3. Initialize Database

Run the initialization script:

```bash
cd backend
python scripts/init_db.py
```

This script will:
- Create the database if it doesn't exist
- Run all Alembic migrations
- Create an initial admin user
- Validate the setup

### 4. Start the Application

```bash
uvicorn app.main:app --reload
```

### 5. Access the API

- **API Documentation**: http://localhost:8000/docs
- **Admin Login**: admin@manufacturing.com / admin123

## Manual Setup

### 1. Database Creation

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE manufacturing_db;
CREATE USER manufacturing_user WITH PASSWORD 'manufacturing_pass';
GRANT ALL PRIVILEGES ON DATABASE manufacturing_db TO manufacturing_user;
```

### 2. Run Migrations

```bash
# Initialize Alembic (only if starting fresh)
alembic init migrations

# Run migrations
alembic upgrade head
```

### 3. Verify Setup

```bash
# Check tables
psql -U manufacturing_user -d manufacturing_db -c "\dt"

# Check table structures
psql -U manufacturing_user -d manufacturing_db -c "\d+ users"
psql -U manufacturing_user -d manufacturing_db -c "\d+ manufacturers"
psql -U manufacturing_user -d manufacturing_db -c "\d+ orders"
psql -U manufacturing_user -d manufacturing_db -c "\d+ quotes"
psql -U manufacturing_user -d manufacturing_db -c "\d+ transactions"
```

## Database Schema Overview

### Core Tables

1. **users** - User accounts with role-based access (Client, Manufacturer, Admin)
2. **manufacturers** - Manufacturer profiles with capabilities matrix
3. **orders** - Order requests with technical requirements
4. **quotes** - Detailed quotations with pricing breakdown
5. **transactions** - Payment processing with escrow functionality

### Key Features

- **GDPR Compliance**: Consent tracking and data export/deletion capabilities
- **Flexible Requirements**: JSON fields for complex technical specifications
- **Smart Matching**: Geographic and capability-based matching
- **Comprehensive Pricing**: Detailed cost breakdown and commission tracking
- **Escrow Payments**: Secure payment handling with dispute protection

### Indexes for Performance

- Geographic queries (country, city)
- Role-based filtering (user roles, manufacturer status)
- Order lifecycle (status, timeline)
- Payment processing (transaction status, amounts)

## Common Operations

### Creating Migration

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file
# Edit if necessary, then run:
alembic upgrade head
```

### Sample Data Insertion

```sql
-- Create a test client
INSERT INTO users (email, password_hash, first_name, last_name, role, registration_status, is_active, email_verified, data_processing_consent)
VALUES ('client@test.com', '$2b$12$...', 'Test', 'Client', 'CLIENT', 'ACTIVE', true, true, true);

-- Create a test manufacturer
INSERT INTO users (email, password_hash, first_name, last_name, company_name, role, registration_status, is_active, email_verified, data_processing_consent)
VALUES ('manufacturer@test.com', '$2b$12$...', 'Test', 'Manufacturer', 'Test Manufacturing Co.', 'MANUFACTURER', 'ACTIVE', true, true, true);

-- Create manufacturer profile
INSERT INTO manufacturers (user_id, business_name, city, country, capabilities, is_active, is_verified)
VALUES (2, 'Test Manufacturing Co.', 'Warsaw', 'PL', '{"manufacturing_processes": ["CNC Machining", "3D Printing"], "materials": ["Steel", "Aluminum"]}', true, true);
```

### Backup and Restore

```bash
# Backup
pg_dump -U manufacturing_user manufacturing_db > backup.sql

# Restore
psql -U manufacturing_user manufacturing_db < backup.sql
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL is running
   - Check connection parameters in DATABASE_URL

2. **Permission Denied**
   - Verify database user permissions
   - Check if user can connect to the specific database

3. **Migration Errors**
   - Review migration files for conflicts
   - Check if database is in expected state
   - Use `alembic downgrade` to revert if needed

4. **Import Errors**
   - Ensure all dependencies are installed
   - Check Python path and virtual environment

### Reset Database

If you need to completely reset:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS manufacturing_db;"
psql -U postgres -c "CREATE DATABASE manufacturing_db;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE manufacturing_db TO manufacturing_user;"

# Run initialization script
python scripts/init_db.py
```

## Production Considerations

### Security

- Use strong passwords and rotate regularly
- Enable SSL connections
- Implement connection pooling
- Set up monitoring and alerting

### Performance

- Regular VACUUM and ANALYZE operations
- Monitor slow queries
- Consider read replicas for reporting
- Implement proper backup strategy

### Scaling

- Horizontal scaling with read replicas
- Connection pooling (PgBouncer)
- Database partitioning for large datasets
- Consider sharding for very large scale 