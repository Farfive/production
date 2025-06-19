# Monitoring & Observability Implementation

## Overview

Comprehensive monitoring and observability system for the Production Outsourcing Platform including structured logging, error tracking, performance monitoring, and uptime monitoring.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │   External      │
│   Components    │───▶│   Middleware    │───▶│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │   Dashboard     │
                    │   Frontend      │
                    └─────────────────┘
```

## Core Components

### 1. Structured Logging (`backend/app/core/logging.py`)
- Multiple log types: Security, Performance, Business, Audit
- JSON-formatted logs with GDPR compliance
- Configurable levels and PII masking

### 2. Error Tracking (`backend/app/core/sentry.py`)
- Sentry integration with custom filters
- Sensitive data sanitization
- Business error categorization

### 3. Performance Monitoring (`backend/app/core/performance.py`)
- Prometheus metrics integration
- HTTP and database performance tracking
- System resource monitoring

### 4. Uptime Monitoring (`backend/app/core/uptime.py`)
- Health checks for database and system
- Service status reporting
- Performance threshold monitoring

### 5. Monitoring API (`backend/app/api/monitoring.py`)
- `/api/monitoring/health` - Health status
- `/api/monitoring/metrics` - Prometheus metrics
- `/api/monitoring/status` - System status

### 6. Frontend Dashboard (`frontend/src/components/monitoring/MonitoringDashboard.tsx`)
- Real-time health visualization
- Service status cards
- Auto-refresh capabilities

## Setup Instructions

1. **Environment Variables:**
```bash
SENTRY_DSN=your_sentry_dsn_here
APP_VERSION=1.0.0
LOG_LEVEL=INFO
LOG_FORMAT=detailed
ENABLE_STRUCTURED_LOGGING=true
```

2. **Dependencies** (already in requirements.txt):
- sentry-sdk[fastapi]==1.40.6
- prometheus-client==0.19.0
- psutil==5.9.6
- structlog==23.1.0

3. **Integration** (automatically configured in main.py):
- Logging and Sentry initialization
- Health checker setup
- Monitoring endpoints registration

## Usage Examples

### Logging
```python
from app.core.logging import log_security_event, log_business_event

log_security_event("login_success", user_id="123", ip="192.168.1.1")
log_business_event("quote_created", user_id="123", amount=1000)
```

### Performance Tracking
```python
from app.core.performance import track_performance

@track_performance("user_creation")
def create_user(user_data):
    # Implementation
    pass
```

### Health Monitoring
```bash
# Check health status
curl http://localhost:8000/api/monitoring/health

# Get Prometheus metrics
curl http://localhost:8000/api/monitoring/metrics
```

## Log Structure

### Security Log Example:
```json
{
  "timestamp": "2024-12-26T10:30:00Z",
  "level": "INFO",
  "logger": "security",
  "event_type": "login_success",
  "user_id": "user_123",
  "ip_address": "192.168.1.1"
}
```

### Performance Log Example:
```json
{
  "timestamp": "2024-12-26T10:30:00Z",
  "level": "INFO",
  "logger": "performance",
  "operation": "api_request",
  "endpoint": "/api/v1/quotes",
  "duration": 0.245,
  "status_code": 201
}
```

## Performance Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response Time | > 1s | > 2s |
| Database Query Time | > 500ms | > 1s |
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |

## Security Features

- PII masking in all logs
- Sensitive data sanitization in Sentry
- GDPR-compliant audit trails
- Secure monitoring endpoints

## Integration with External Services

### Prometheus/Grafana
```yaml
scrape_configs:
  - job_name: 'production-outsourcing'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/api/monitoring/metrics'
```

### ELK Stack
```yaml
filebeat.inputs:
- type: log
  paths:
    - /app/logs/*.log
  json.keys_under_root: true
```

## Troubleshooting

1. **Health Check Failures**: Check database connectivity and system resources
2. **Missing Metrics**: Verify Prometheus endpoint and configuration
3. **Log Issues**: Check file permissions and disk space

## Future Enhancements

- Distributed tracing with OpenTelemetry
- Advanced alerting integration
- ML-based anomaly detection
- Real User Monitoring (RUM)

## Support

For issues or questions regarding the monitoring system:
- Check the troubleshooting section above
- Review application logs in `/logs/` directory
- Contact the development team with specific error messages and context 