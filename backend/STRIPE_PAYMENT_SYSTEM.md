# Comprehensive Multinational Stripe Payment System

## Overview

This document describes the comprehensive multinational Stripe payment integration implemented for the manufacturing platform. The system supports global payments, marketplace functionality, subscriptions, invoicing, and advanced features like fraud detection and compliance.

## Architecture

### Multi-Region Setup

The payment system supports multiple Stripe accounts for different regions:

- **US Region**: Handles USD, CAD payments
- **EU Region**: Handles EUR, GBP, PLN, CHF, SEK, NOK, DKK payments  
- **UK Region**: Handles GBP, EUR, USD payments

Each region has its own:
- Stripe secret/publishable keys
- Webhook endpoints
- Connect account configurations
- Tax and compliance rules

### Core Components

1. **MultiRegionStripeService**: Main service handling all payment operations
2. **SubscriptionService**: Manages enterprise subscriptions
3. **InvoiceService**: Handles B2B invoicing with NET terms
4. **Webhook handlers**: Process Stripe events across all regions

## Features

### ✅ Multi-Country Stripe Setup
- [x] Multi-entity Stripe accounts (US, EU, UK)
- [x] Regional payment method support (Cards, SEPA, ACH, iDEAL, etc.)
- [x] Local currency processing with automatic conversion
- [x] Country-specific tax calculation
- [x] Regional pricing optimization

### ✅ Advanced Payment Flows
- [x] Marketplace payment splitting with configurable commission (5-15%)
- [x] Escrow functionality with delayed capture
- [x] Multi-party payments for complex orders
- [x] Subscription billing for enterprise clients
- [x] Invoice-based payments with NET 30/60 terms
- [x] Automatic retry logic for failed payments

### ✅ Stripe Connect Implementation
- [x] Express accounts for quick manufacturer onboarding
- [x] Custom accounts for enterprise manufacturers
- [x] Standard accounts for full-featured manufacturers
- [x] Identity verification with country-specific requirements
- [x] Payout scheduling optimization
- [x] Real-time balance and earnings tracking

### ✅ Financial Compliance & Security
- [x] SCA (Strong Customer Authentication) compliance
- [x] PCI DSS compliance through Stripe
- [x] Anti-fraud detection with Stripe Radar
- [x] 3D Secure authentication for high-value transactions
- [x] Webhook signature verification
- [x] Idempotency keys for all operations

### ✅ Multi-Currency & International
- [x] Dynamic currency conversion with transparent rates
- [x] Multi-currency payouts to manufacturers
- [x] Foreign exchange rate tracking
- [x] Cross-border fee optimization
- [x] Country-specific tax collection (VAT, GST, sales tax)

### ✅ Advanced Stripe Features
- [x] Stripe Terminal for in-person payments (ready)
- [x] Stripe Billing for subscription management
- [x] Advanced reporting and analytics
- [x] Custom financial reporting
- [x] Stripe Climate support (optional)

### ✅ Error Handling & Monitoring
- [x] Comprehensive webhook processing
- [x] Payment failure analysis and retry strategies
- [x] Chargeback and dispute management
- [x] Real-time payment monitoring
- [x] Financial reconciliation automation

## Database Schema

### Enhanced Transaction Model

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    
    -- Core references
    order_id INTEGER REFERENCES orders(id),
    quote_id INTEGER REFERENCES quotes(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    manufacturer_id INTEGER REFERENCES manufacturers(id),
    
    -- Transaction identification
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    external_transaction_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    
    -- Transaction details
    transaction_type transaction_type_enum NOT NULL,
    status transaction_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Regional and currency
    region payment_region_enum NOT NULL,
    original_currency CHAR(3) NOT NULL DEFAULT 'USD',
    platform_currency CHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Amounts and fees
    original_amount NUMERIC(15,2) NOT NULL,
    gross_amount NUMERIC(15,2) NOT NULL,
    net_amount NUMERIC(15,2) NOT NULL,
    platform_commission_rate_pct NUMERIC(5,2) DEFAULT 10.00,
    platform_commission_amount NUMERIC(12,2) NOT NULL,
    stripe_fee_amount NUMERIC(8,2) DEFAULT 0.00,
    cross_border_fee_amount NUMERIC(8,2) DEFAULT 0.00,
    currency_conversion_fee_amount NUMERIC(8,2) DEFAULT 0.00,
    
    -- Tax handling
    tax_rate_pct NUMERIC(5,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_included BOOLEAN DEFAULT TRUE,
    tax_jurisdiction VARCHAR(50),
    
    -- Escrow and payouts
    escrow_amount NUMERIC(15,2) DEFAULT 0.00,
    escrow_released_amount NUMERIC(15,2) DEFAULT 0.00,
    manufacturer_payout_amount NUMERIC(15,2) NOT NULL,
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255),
    stripe_transfer_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    stripe_account_id VARCHAR(255),
    
    -- Security and fraud
    three_d_secure_status VARCHAR(50),
    fraud_score INTEGER,
    fraud_outcome VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    -- ... more timestamp fields
);
```

### Other Key Tables

- **stripe_connect_accounts**: Manufacturer Connect account details
- **subscriptions**: Enterprise subscription management
- **invoices**: B2B invoice tracking
- **webhook_events**: Stripe event processing log

## Configuration

### Environment Variables

```bash
# US Stripe Account
STRIPE_US_SECRET_KEY=sk_live_...
STRIPE_US_PUBLISHABLE_KEY=pk_live_...
STRIPE_US_WEBHOOK_SECRET=whsec_...

# EU Stripe Account  
STRIPE_EU_SECRET_KEY=sk_live_...
STRIPE_EU_PUBLISHABLE_KEY=pk_live_...
STRIPE_EU_WEBHOOK_SECRET=whsec_...

# UK Stripe Account
STRIPE_UK_SECRET_KEY=sk_live_...
STRIPE_UK_PUBLISHABLE_KEY=pk_live_...
STRIPE_UK_WEBHOOK_SECRET=whsec_...

# Platform Settings
PLATFORM_COMMISSION_RATE=10.0
PLATFORM_BASE_CURRENCY=USD
ENABLE_ESCROW=true
ENABLE_RADAR=true
FRAUD_SCORE_THRESHOLD=75
```

### Regional Configuration

Each region is configured with:
- Supported currencies
- Available payment methods
- Default tax rates
- Fraud protection rules

## API Endpoints

### Payment Intents

```http
POST /api/v1/payments/payment-intents
```

Create a payment intent for an order:

```json
{
  "order_id": 123,
  "quote_id": 456,
  "payment_method_types": ["card", "sepa_debit"],
  "customer_country": "DE",
  "save_payment_method": false
}
```

Response includes regional configuration and client secret.

### Transaction Management

```http
GET /api/v1/payments/transactions
GET /api/v1/payments/transactions/{id}
POST /api/v1/payments/transactions/{id}/refund
```

### Stripe Connect

```http
POST /api/v1/payments/connect/accounts
GET /api/v1/payments/connect/accounts/me
POST /api/v1/payments/connect/accounts/{id}/dashboard-link
```

### Analytics

```http
GET /api/v1/payments/analytics/overview?days=30
```

## Webhook Endpoints

### Regional Webhooks

- `POST /webhooks/stripe/us` - US region events
- `POST /webhooks/stripe/eu` - EU region events  
- `POST /webhooks/stripe/uk` - UK region events

### Supported Events

- `payment_intent.*` - Payment processing
- `account.*` - Connect account updates
- `customer.subscription.*` - Subscription changes
- `invoice.*` - Invoice payments
- `transfer.*` - Marketplace transfers
- `radar.*` - Fraud detection
- `charge.dispute.*` - Disputes and chargebacks

## Payment Flows

### 1. Standard Order Payment

1. Client creates payment intent for order
2. System detects region and currency
3. Calculates fees, tax, and commission
4. Creates Stripe PaymentIntent with manual capture
5. Client completes payment on frontend
6. Webhook confirms payment success
7. Funds held in escrow until order completion
8. Manual capture releases funds to manufacturer

### 2. Marketplace Split Payment

1. Payment captured to platform account
2. Automatic transfer to manufacturer's Connect account
3. Platform commission retained
4. Real-time balance tracking

### 3. Subscription Billing

1. Customer subscribes to enterprise plan
2. Stripe handles recurring billing
3. Webhooks update subscription status
4. Usage tracking and overages calculated

### 4. Invoice Payment (NET Terms)

1. System generates invoice for B2B order
2. Invoice sent to customer with payment terms
3. Customer pays via Stripe-hosted invoice
4. Webhook confirms payment
5. Order proceeds with manufacturing

## Security Features

### PCI Compliance
- All card data handled by Stripe (PCI Level 1)
- No sensitive data stored in our database
- Secure webhook signature verification

### Fraud Protection
- Stripe Radar for machine learning fraud detection
- 3D Secure authentication for high-risk transactions
- Real-time fraud scoring and decision rules
- Manual review workflows for suspicious transactions

### 3D Secure (SCA Compliance)
- Automatic SCA compliance for EU payments
- Configurable enforcement thresholds
- Seamless customer authentication flow

## Testing

### Test Mode Configuration

All services support Stripe test mode with:
- Test payment methods
- Webhook testing with Stripe CLI
- Comprehensive test scenarios

### Key Test Scenarios

1. **Multi-currency payments**
   - USD to EUR conversion
   - Cross-border fee calculation
   - Regional tax application

2. **Connect account flows**
   - Account creation and verification
   - Split payment testing
   - Payout schedule verification

3. **Subscription management**
   - Plan creation and updates
   - Billing cycle testing
   - Cancellation flows

4. **Error handling**
   - Failed payment processing
   - Webhook retry logic
   - Dispute management

## Monitoring & Analytics

### Real-time Monitoring

- Payment success/failure rates by region
- Average transaction processing time
- Fraud detection metrics
- Connect account verification status

### Financial Reporting

- Revenue breakdown by region and currency
- Commission tracking and reconciliation
- Tax collection reporting
- Chargeback and dispute analytics

### Alerts

- High-value transaction monitoring
- Failed payment notifications
- Fraud score threshold alerts
- Connect account requirement alerts

## Compliance & Regulatory

### GDPR Compliance
- Customer data handling procedures
- Right to deletion implementation
- Data retention policies

### Tax Compliance
- Automatic tax calculation by jurisdiction
- VAT/GST collection and reporting
- Tax-exempt customer handling

### Financial Regulations
- AML (Anti-Money Laundering) compliance
- Know Your Customer (KYC) procedures
- Sanctions screening integration

## Deployment

### Production Checklist

- [ ] Configure all regional Stripe accounts
- [ ] Set up webhook endpoints with proper secrets
- [ ] Enable fraud protection rules
- [ ] Configure tax calculation services
- [ ] Set up monitoring and alerting
- [ ] Test all payment flows in production
- [ ] Verify Connect account onboarding
- [ ] Test subscription billing cycles

### Scaling Considerations

- Webhook processing queue for high volume
- Database indexing for transaction queries
- Caching for exchange rates and tax rates
- Load balancing for API endpoints

## Support & Troubleshooting

### Common Issues

1. **Payment Failures**
   - Check fraud score and outcome
   - Verify 3D Secure completion
   - Review decline reasons

2. **Connect Account Issues**
   - Verify business information completeness
   - Check verification requirements
   - Review payout method setup

3. **Webhook Processing**
   - Verify signature validation
   - Check event deduplication
   - Review error logs for failed processing

### Debugging Tools

- Stripe Dashboard for transaction details
- Webhook event logs
- Internal transaction tracking
- Real-time payment monitoring

## Future Enhancements

### Planned Features

- [ ] Stripe Issuing for corporate cards
- [ ] Advanced financial reporting dashboard
- [ ] White-label payment solutions
- [ ] Cryptocurrency payment integration
- [ ] International wire transfer support
- [ ] Dynamic pricing optimization
- [ ] Advanced dispute management

### Integration Opportunities

- [ ] Accounting system integration (QuickBooks, Xero)
- [ ] ERP system connectivity
- [ ] Supply chain finance solutions
- [ ] Insurance and surety bond integration

## Conclusion

This comprehensive multinational Stripe payment system provides enterprise-grade payment processing with full global support, advanced security, and seamless user experience. The modular architecture allows for easy expansion and customization while maintaining compliance with international financial regulations. 