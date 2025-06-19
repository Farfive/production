# B2B Manufacturing Marketplace Database Schema

## Overview

This document describes the comprehensive PostgreSQL database schema for a B2B manufacturing marketplace platform. The schema is designed to handle complex manufacturing requirements, smart matching algorithms, detailed pricing, and robust transaction management.

## Core Entities

### 1. Users Table

**Purpose**: Central user management with role-based access control and GDPR compliance.

**Key Features**:
- Multi-role support (Client, Manufacturer, Admin)
- GDPR compliance fields
- Email verification workflow
- Company information integration
- NIP (Polish tax ID) support

**Critical Fields**:
```sql
-- Authentication & Identity
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
email_verified BOOLEAN DEFAULT FALSE

-- Company Information
company_name VARCHAR(255)
nip VARCHAR(20)  -- Polish tax identification number
company_address TEXT
phone VARCHAR(20)

-- GDPR Compliance
consent_date TIMESTAMP WITH TIME ZONE
data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE
marketing_consent BOOLEAN DEFAULT FALSE
gdpr_data_export_requested TIMESTAMP WITH TIME ZONE
gdpr_data_deletion_requested TIMESTAMP WITH TIME ZONE

-- Role & Status
role ENUM('CLIENT', 'MANUFACTURER', 'ADMIN') NOT NULL
registration_status ENUM('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'PROFILE_INCOMPLETE', 'SUSPENDED')
```

**Indexes**:
- Unique index on email
- Index on role for role-based queries
- Index on registration_status and is_active for user management
- Index on nip for tax identification lookups

### 2. Manufacturers Table

**Purpose**: Detailed manufacturer profiles with capabilities matrix and business metrics.

**Key Features**:
- Flexible capabilities storage (JSON)
- Geographic data for proximity matching
- Production capacity tracking
- Quality certifications
- Business performance metrics
- Stripe Connect integration

**Critical Fields**:
```sql
-- Geographic Information (for proximity matching)
country VARCHAR(2) DEFAULT 'PL'
state_province VARCHAR(100)
city VARCHAR(100) NOT NULL
latitude NUMERIC(10,8)  -- For distance calculations
longitude NUMERIC(11,8)

-- Capabilities Matrix (JSON)
capabilities JSON NOT NULL DEFAULT '{}'
-- Example: {
--   "manufacturing_processes": ["CNC Machining", "3D Printing"],
--   "materials": ["Steel", "Aluminum", "Plastic"],
--   "certifications": ["ISO 9001", "AS9100"],
--   "industries_served": ["Aerospace", "Automotive"]
-- }

-- Production Capacity
production_capacity_monthly INTEGER
capacity_utilization_pct FLOAT
min_order_quantity INTEGER DEFAULT 1
max_order_quantity INTEGER
min_order_value_pln NUMERIC(12,2)
max_order_value_pln NUMERIC(12,2)

-- Lead Times
standard_lead_time_days INTEGER
rush_order_available BOOLEAN DEFAULT FALSE
rush_order_lead_time_days INTEGER
rush_order_surcharge_pct FLOAT DEFAULT 0.0

-- Business Metrics
overall_rating NUMERIC(3,2) DEFAULT 0.0  -- 0.00 to 5.00
quality_rating NUMERIC(3,2) DEFAULT 0.0
delivery_rating NUMERIC(3,2) DEFAULT 0.0
communication_rating NUMERIC(3,2) DEFAULT 0.0
total_orders_completed INTEGER DEFAULT 0
on_time_delivery_rate FLOAT DEFAULT 0.0
```

**Indexes**:
- Composite index on (country, city) for location queries
- Index on overall_rating for ranking
- Index on (is_active, is_verified) for active manufacturer queries
- Index on total_orders_completed for experience sorting

### 3. Orders Table

**Purpose**: Comprehensive order management with flexible technical requirements.

**Key Features**:
- Flexible technical requirements (JSON)
- Budget range or fixed pricing
- Geographic preferences
- File attachment support
- Status tracking throughout lifecycle

**Critical Fields**:
```sql
-- Order Identification
order_number VARCHAR(50) UNIQUE
title VARCHAR(255) NOT NULL
description TEXT NOT NULL

-- Technical Requirements (JSON for flexibility)
technical_requirements JSON NOT NULL DEFAULT '{}'
-- Example: {
--   "manufacturing_process": "CNC Machining",
--   "material": "Aluminum 6061",
--   "tolerances": "±0.1mm",
--   "surface_roughness": "Ra 3.2",
--   "dimensions": {"length": 100, "width": 50, "height": 25, "unit": "mm"},
--   "special_requirements": ["Food grade", "Corrosion resistant"]
-- }

-- Quantity & Production
quantity INTEGER NOT NULL
quantity_unit VARCHAR(20) DEFAULT 'pieces'
prototype_required BOOLEAN DEFAULT FALSE

-- Budget Information
budget_type ENUM('FIXED', 'RANGE', 'NEGOTIABLE') DEFAULT 'RANGE'
budget_min_pln NUMERIC(12,2)
budget_max_pln NUMERIC(12,2)
budget_fixed_pln NUMERIC(12,2)
budget_per_unit BOOLEAN DEFAULT FALSE

-- Timeline
delivery_deadline TIMESTAMP WITH TIME ZONE NOT NULL
delivery_flexibility_days INTEGER DEFAULT 0
rush_order BOOLEAN DEFAULT FALSE

-- Geographic Preferences
preferred_country VARCHAR(2)
preferred_city VARCHAR(100)
max_distance_km INTEGER
international_shipping_ok BOOLEAN DEFAULT TRUE

-- Status Tracking
status ENUM('DRAFT', 'ACTIVE', 'QUOTED', 'ACCEPTED', 'IN_PRODUCTION', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED')
```

**Indexes**:
- Index on client_id and status for client order management
- Index on status and created_at for order processing
- Index on delivery_deadline for timeline management
- Index on industry_category for categorization

### 4. Quotes Table

**Purpose**: Detailed quotations with comprehensive pricing breakdown.

**Key Features**:
- Detailed cost breakdown (materials, labor, overhead)
- Delivery timeline breakdown
- Alternative options and volume discounts
- Terms and conditions
- Status tracking

**Critical Fields**:
```sql
-- Quote Identification
quote_number VARCHAR(50) UNIQUE

-- Detailed Pricing Breakdown (JSON)
pricing_breakdown JSON NOT NULL DEFAULT '{}'
-- Example: {
--   "material_costs": {
--     "aluminum_6061": {"quantity": 5, "unit": "kg", "unit_price": 12.50, "total": 62.50}
--   },
--   "labor_costs": {
--     "machining": {"hours": 8, "rate": 75.00, "total": 600.00}
--   },
--   "overhead_costs": {"facility": 50.00, "utilities": 25.00}
-- }

-- Pricing Summary
material_cost_pln NUMERIC(12,2) NOT NULL DEFAULT 0
labor_cost_pln NUMERIC(12,2) NOT NULL DEFAULT 0
overhead_cost_pln NUMERIC(12,2) NOT NULL DEFAULT 0
tooling_cost_pln NUMERIC(12,2) NOT NULL DEFAULT 0
shipping_cost_pln NUMERIC(12,2) NOT NULL DEFAULT 0
subtotal_pln NUMERIC(12,2) NOT NULL
tax_rate_pct NUMERIC(5,2) DEFAULT 23.00  -- Polish VAT
total_price_pln NUMERIC(12,2) NOT NULL

-- Delivery Timeline (JSON)
delivery_timeline JSON DEFAULT '{}'
-- Example: {
--   "design_review": {"days": 2, "description": "Technical review"},
--   "material_procurement": {"days": 5, "description": "Source materials"},
--   "production": {"days": 10, "description": "Manufacturing"}
-- }

-- Terms & Conditions
payment_terms TEXT
warranty_period_days INTEGER
warranty_description TEXT

-- Alternatives & Options
volume_discounts JSON DEFAULT '{}'
-- Example: {"100": {"discount_pct": 5, "price_per_unit": 95.00}}
```

**Indexes**:
- Index on order_id and status for order quote management
- Index on manufacturer_id for manufacturer quote tracking
- Index on valid_until for expiration management

### 5. Transactions Table

**Purpose**: Comprehensive transaction and payment management with escrow functionality.

**Key Features**:
- Multiple transaction types (payments, commissions, payouts, refunds)
- Stripe Connect integration
- Escrow functionality
- Commission calculation and tracking
- Detailed payment method information

**Critical Fields**:
```sql
-- Transaction Identification
transaction_number VARCHAR(50) UNIQUE
external_transaction_id VARCHAR(255)  -- Stripe Payment Intent ID

-- Transaction Details
transaction_type ENUM('ORDER_PAYMENT', 'COMMISSION', 'PAYOUT', 'REFUND', 'DISPUTE_RESOLUTION', 'CHARGEBACK', 'ADJUSTMENT')
status ENUM('PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED', 'CHARGEBACK')

-- Payment Method
payment_method_type ENUM('CREDIT_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CRYPTOCURRENCY', 'OTHER')
payment_method_details JSON DEFAULT '{}'
-- Example: {"card_last4": "4242", "card_brand": "visa", "card_country": "US"}

-- Amount Breakdown
gross_amount_pln NUMERIC(15,2) NOT NULL
platform_commission_rate_pct NUMERIC(5,2) DEFAULT 15.00
platform_commission_pln NUMERIC(12,2) NOT NULL
tax_rate_pct NUMERIC(5,2) DEFAULT 23.00
tax_amount_pln NUMERIC(12,2) NOT NULL DEFAULT 0
net_amount_to_manufacturer_pln NUMERIC(15,2) NOT NULL

-- Escrow Functionality
funds_held_in_escrow_pln NUMERIC(15,2) DEFAULT 0.00
escrow_release_date TIMESTAMP WITH TIME ZONE
escrow_released_pln NUMERIC(15,2) DEFAULT 0.00

-- Commission Breakdown (JSON)
commission_breakdown JSON DEFAULT '{}'
-- Example: {
--   "platform_fee": 150.00,
--   "payment_processing": 15.50,
--   "dispute_protection": 5.00
-- }
```

**Indexes**:
- Index on order_id and transaction_type for order transaction queries
- Index on status for transaction management
- Index on external_transaction_id for Stripe integration

## Database Relationships

### Primary Relationships

1. **Users → Manufacturers**: One-to-One (optional)
   - Users can optionally have a manufacturer profile

2. **Users → Orders**: One-to-Many
   - Clients can create multiple orders

3. **Orders → Quotes**: One-to-Many
   - Each order can receive multiple quotes from different manufacturers

4. **Manufacturers → Quotes**: One-to-Many
   - Manufacturers can submit quotes for multiple orders

5. **Orders → Transactions**: One-to-Many
   - Orders can have multiple transactions (payments, refunds, etc.)

6. **Quotes → Transactions**: One-to-One (optional)
   - Accepted quotes result in payment transactions

### Foreign Key Constraints

```sql
-- Manufacturers
FOREIGN KEY (user_id) REFERENCES users(id)

-- Orders
FOREIGN KEY (client_id) REFERENCES users(id)
FOREIGN KEY (selected_manufacturer_id) REFERENCES manufacturers(id)
FOREIGN KEY (selected_quote_id) REFERENCES quotes(id)

-- Quotes
FOREIGN KEY (order_id) REFERENCES orders(id)
FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)

-- Transactions
FOREIGN KEY (order_id) REFERENCES orders(id)
FOREIGN KEY (quote_id) REFERENCES quotes(id)
FOREIGN KEY (client_id) REFERENCES users(id)
FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
```

## Performance Optimizations

### Composite Indexes

1. **Order Management**:
   ```sql
   INDEX ix_orders_client_status ON orders(client_id, status);
   INDEX ix_orders_status_created_at ON orders(status, created_at);
   ```

2. **Manufacturer Queries**:
   ```sql
   INDEX ix_manufacturers_location ON manufacturers(country, city);
   INDEX ix_manufacturers_active_verified ON manufacturers(is_active, is_verified);
   ```

3. **Quote Management**:
   ```sql
   INDEX ix_quotes_order_status ON quotes(order_id, status);
   ```

4. **Transaction Tracking**:
   ```sql
   INDEX ix_transactions_order_type ON transactions(order_id, transaction_type);
   ```

### Query Optimization Strategies

1. **Manufacturer Matching**: Use geographic indexes and JSON operators for capability matching
2. **Order Filtering**: Composite indexes on status, priority, and timeline fields
3. **Quote Comparison**: Indexes on pricing fields and delivery times
4. **Transaction Reporting**: Time-based partitioning considerations for high-volume data

## Data Types and Constraints

### Monetary Values
- All monetary amounts use `NUMERIC(precision, scale)` for accuracy
- PLN (Polish Złoty) is the base currency
- Precision: 12-15 digits, Scale: 2 decimal places

### Geographic Data
- Latitude: `NUMERIC(10,8)` for precise location
- Longitude: `NUMERIC(11,8)` for precise location
- Country codes: ISO 3166-1 alpha-2 format

### JSON Fields
- Capabilities: Flexible structure for manufacturer abilities
- Technical Requirements: Flexible order specifications
- Pricing Breakdown: Detailed cost analysis
- Delivery Timeline: Step-by-step process breakdown

## GDPR Compliance

### Data Subject Rights

1. **Right to Access**: Export functionality via `gdpr_data_export_requested`
2. **Right to Erasure**: Deletion tracking via `gdpr_data_deletion_requested`
3. **Consent Management**: Explicit consent tracking for data processing and marketing

### Data Retention

- User consent dates tracked
- Audit trail for data processing activities
- Automated cleanup processes for expired data

## Migration Strategy

### Initial Setup

1. Run Alembic initialization: `alembic init migrations`
2. Configure database connection in `alembic.ini`
3. Run initial migration: `alembic upgrade head`

### Future Migrations

- Use Alembic for all schema changes
- Test migrations on staging environment
- Backup database before production migrations
- Monitor performance impact of index changes

## Security Considerations

### Authentication & Authorization

- Password hashing using bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)

### Data Protection

- Sensitive data encryption at rest
- SSL/TLS for data in transit
- Regular security audits

### Financial Data

- PCI DSS compliance for payment processing
- Stripe Connect for secure payment handling
- Escrow functionality for dispute protection

## Monitoring & Maintenance

### Performance Monitoring

- Query performance analysis
- Index usage monitoring
- Storage growth tracking

### Data Quality

- Regular data validation checks
- Orphaned record cleanup
- Referential integrity verification

### Backup Strategy

- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup replication 