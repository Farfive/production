# Celery Background Task System

## Overview

This document describes the comprehensive background task system implemented for the Manufacturing Platform using Celery. The system provides robust, scalable, and monitored background processing for various operational tasks.

## Architecture

### Task Categories

1. **Email Tasks** (`app.tasks.email_tasks`)
   - Email sending and delivery tracking
   - Bulk email campaigns
   - Email bounce processing
   - Urgent email notifications

2. **Payment Tasks** (`app.tasks.payment_tasks`)
   - Payment processing with retry logic
   - Payment reconciliation
   - Invoice generation
   - Failed payment handling

3. **Order Tasks** (`app.tasks.order_tasks`)
   - Intelligent order matching
   - Order status notifications
   - Order processing workflows
   - Reminder systems

4. **Data Sync Tasks** (`app.tasks.sync_tasks`)
   - External API synchronization
   - Data cleanup and archiving
   - Backup operations
   - Cache synchronization

5. **Analytics Tasks** (`app.tasks.analytics_tasks`)
   - Report generation
   - Real-time metrics updates
   - User behavior analytics
   - KPI calculations

6. **Monitoring Tasks** (`app.tasks.monitoring_tasks`)
   - System health checks
   - Performance metrics collection
   - Alert generation
   - Task cleanup

### Queue Management

#### Priority-Based Queues

```
Critical Priority (Priority 10):
- payment.critical
- order.critical
- monitoring.critical

High Priority (Priority 7-9):
- email.urgent
- analytics.realtime

Normal Priority (Priority 5-6):
- email.normal
- order.normal
- payment.normal
- sync.normal
- monitoring.normal

Low Priority (Priority 1-4):
- email.bulk
- analytics.batch
- payment.batch
- sync.maintenance
- sync.backup
```

#### Queue Configuration

- **Exponential backoff** for failed tasks
- **Dead letter queue** for permanently failed tasks
- **Task batching** for efficiency
- **Auto-scaling** based on queue length
- **Connection pooling** for database and Redis

## Setup and Installation

### Prerequisites

```bash
# Install required packages
pip install celery[redis] flower

# Or use requirements.txt
pip install -r requirements.txt
```

### Redis Configuration

```bash
# Start Redis server
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Environment Variables

```bash
export REDIS_URL="redis://localhost:6379/0"
export DATABASE_URL="postgresql://user:password@localhost:5432/manufacturing_platform"
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/0"
```

## Running the System

### Method 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f docker-compose.celery.yml up -d

# View logs
docker-compose -f docker-compose.celery.yml logs -f

# Stop services
docker-compose -f docker-compose.celery.yml down
```

### Method 2: Manual Startup

```bash
# Start workers using the management script
python scripts/start_workers.py start --worker-type all

# Start Beat scheduler
python scripts/start_workers.py beat

# Start Flower monitoring
python scripts/start_workers.py flower
```

### Method 3: Individual Components

```bash
# Critical priority worker
celery -A app.core.celery_config worker \
  --queues=payment.critical,order.critical,monitoring.critical \
  --concurrency=4 \
  --hostname=critical_worker@%h

# Normal priority worker
celery -A app.core.celery_config worker \
  --queues=email.normal,order.normal,payment.normal \
  --concurrency=8 \
  --hostname=normal_worker@%h

# Beat scheduler
celery -A app.core.celery_config beat

# Flower monitoring
celery -A app.core.celery_config flower --port=5555
```

## Task Management

### Using the Management Script

```bash
# Start specific worker type
python scripts/start_workers.py start --worker-type critical

# Monitor workers with auto-restart
python scripts/start_workers.py monitor --worker-type all

# Check worker status
python scripts/start_workers.py status

# Stop all workers
python scripts/start_workers.py stop
```

### Programmatic Task Management

```python
from app.utils.task_management import task_manager, task_scheduler

# Get task status
status = task_manager.get_task_status("task-id-here")

# Schedule a task
result = task_scheduler.schedule_task(
    task_name="app.tasks.email_tasks.send_email_task",
    args=[email_data],
    countdown=300  # 5 minutes delay
)

# Get queue status
queues = task_manager.get_queue_status()

# Cancel a task
task_manager.cancel_task("task-id-here")
```

## Monitoring and Observability

### Flower Dashboard

Access Flower at: `http://localhost:5555`
- Username: `admin`
- Password: `manufacturing2024`

Features:
- Real-time task monitoring
- Worker status and statistics
- Queue lengths and throughput
- Task history and details

### API Monitoring Endpoints

```python
# Get system health
GET /monitoring/health

# Get real-time metrics
GET /monitoring/metrics/realtime

# Get task overview
GET /monitoring/tasks/status

# Get failed tasks
GET /monitoring/tasks/failed

# Get slow tasks
GET /monitoring/tasks/slow
```

### Grafana Dashboards

Access Grafana at: `http://localhost:3000`
- Username: `admin`
- Password: `manufacturing2024`

Pre-configured dashboards:
- System Performance
- Task Statistics
- Queue Metrics
- Error Rates

## Task Examples

### Sending Emails

```python
from app.tasks.email_tasks import send_email_task, send_urgent_email_task

# Normal priority email
send_email_task.delay(
    email_data={
        'id': 'email_123',
        'to_email': 'user@example.com',
        'to_name': 'User Name'
    },
    template_name='welcome',
    context={'user_name': 'User Name'}
)

# Urgent email
send_urgent_email_task.delay(
    email_data={
        'id': 'urgent_email_123',
        'to_email': 'admin@example.com'
    },
    template_name='system_alert',
    context={'alert_type': 'critical_error'}
)
```

### Processing Payments

```python
from app.tasks.payment_tasks import process_payment

# Process payment with retry logic
process_payment.delay({
    'amount': 100.00,
    'currency': 'USD',
    'payment_method_id': 'pm_123',
    'order_id': 456,
    'user_id': 789
})
```

### Order Matching

```python
from app.tasks.order_tasks import match_orders

# Trigger order matching
match_orders.delay(order_id=123)
```

## Scheduled Tasks

The system runs several scheduled tasks:

### Every 2 minutes
- System health check
- Real-time metrics update

### Every 5 minutes
- Performance metrics collection
- Retry failed emails
- Update dashboard metrics

### Every 15 minutes
- Process pending orders

### Every 30 minutes
- Retry failed payments

### Every hour
- Payment reconciliation
- Cleanup dead tasks

### Every 6 hours
- Process email bounces
- Send order reminders
- Backup critical data
- User behavior analytics

### Daily
- Generate daily reports
- Cleanup old data
- System optimization

## Performance Optimization

### Task Batching

```python
# Batch email sending
from app.tasks.email_tasks import send_bulk_email_task

send_bulk_email_task.delay(
    email_list=[...],
    template_name='newsletter',
    common_context={'month': 'December'}
)
```

### Resource Management

- **Connection pooling**: Database and Redis connections are pooled
- **Memory limits**: Workers restart after processing a set number of tasks
- **Time limits**: Tasks have soft and hard time limits
- **Auto-scaling**: Workers can scale based on queue length

### Caching

```python
# Task result caching
from app.core.celery_config import celery_app

@celery_app.task(bind=True)
def cached_task(self):
    # Results are cached automatically
    return expensive_computation()
```

## Error Handling and Alerting

### Retry Logic

Tasks use exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 60 seconds delay
- Attempt 3: 120 seconds delay
- Attempt 4: 240 seconds delay
- Attempt 5: 480 seconds delay

### Dead Letter Queue

Failed tasks are moved to a dead letter queue for manual inspection.

### Alerting

The system sends alerts for:
- Critical task failures
- Queue backups (>1000 tasks)
- Worker failures
- System resource issues
- External service outages

## Security Considerations

### Access Control

- Flower dashboard requires authentication
- Admin API endpoints require admin privileges
- Task payloads are validated

### Data Protection

- Sensitive data is not logged
- Task results have TTL (1 hour)
- Database connections use SSL

## Troubleshooting

### Common Issues

1. **Workers not starting**
   ```bash
   # Check Redis connectivity
   redis-cli ping
   
   # Check database connectivity
   python -c "from app.core.database import engine; print(engine.execute('SELECT 1'))"
   ```

2. **Tasks not being processed**
   ```bash
   # Check queue status
   celery -A app.core.celery_config inspect active_queues
   
   # Check worker status
   celery -A app.core.celery_config inspect stats
   ```

3. **High memory usage**
   - Reduce `worker_max_tasks_per_child`
   - Increase worker restart frequency
   - Check for memory leaks in tasks

4. **Slow task processing**
   - Add more workers
   - Optimize task code
   - Check database performance

### Debugging

```bash
# Enable debug logging
export CELERY_LOG_LEVEL=DEBUG

# Inspect queues
celery -A app.core.celery_config inspect active_queues

# Monitor tasks in real-time
celery -A app.core.celery_config events
```

## Maintenance

### Regular Maintenance Tasks

1. **Monitor queue lengths**
2. **Check failed task rates**
3. **Review worker performance**
4. **Clean up old task results**
5. **Update task configurations**

### Scaling Guidelines

- **CPU-bound tasks**: Increase worker concurrency
- **I/O-bound tasks**: Increase worker count
- **Memory-intensive tasks**: Reduce tasks per worker
- **High-priority tasks**: Dedicated worker pools

## API Reference

See `backend/app/api/monitoring.py` for complete API documentation.

### Key Endpoints

- `GET /monitoring/health` - System health status
- `GET /monitoring/tasks/status` - Task overview
- `GET /monitoring/queues` - Queue status
- `GET /monitoring/workers` - Worker status
- `POST /monitoring/tasks/schedule` - Schedule new task
- `POST /monitoring/tasks/control` - Control task execution

## Contributing

When adding new tasks:

1. Create task in appropriate module
2. Add task routing in `celery_config.py`
3. Add monitoring for critical tasks
4. Update documentation
5. Add tests

## Support

For issues and support:
- Check logs in `/var/log/celery/`
- Use Flower dashboard for monitoring
- Check Redis connectivity
- Review database performance
- Contact the development team 