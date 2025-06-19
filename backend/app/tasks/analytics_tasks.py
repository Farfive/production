"""
Analytics and reporting tasks for real-time metrics and batch processing
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from celery import current_app
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from loguru import logger

from app.core.celery_config import celery_app
from app.core.database import get_db
from app.services.analytics import AnalyticsService
from app.services.reporting import ReportingService
from app.services.metrics import MetricsService
from app.models.analytics import AnalyticsEvent


@celery_app.task(bind=True, max_retries=2)
def generate_reports(self, report_type: str, date_range: Dict[str, str], 
                    recipients: List[str] = None) -> Dict[str, Any]:
    """
    Generate various types of reports
    Priority: NORMAL
    """
    try:
        reporting_service = ReportingService()
        
        logger.info(f"Generating {report_type} report for {date_range}")
        
        # Generate report based on type
        if report_type == 'daily_summary':
            report = asyncio.run(reporting_service.generate_daily_summary(
                date_range['start_date'], date_range['end_date']
            ))
        elif report_type == 'order_analytics':
            report = asyncio.run(reporting_service.generate_order_analytics(
                date_range['start_date'], date_range['end_date']
            ))
        elif report_type == 'payment_summary':
            report = asyncio.run(reporting_service.generate_payment_summary(
                date_range['start_date'], date_range['end_date']
            ))
        elif report_type == 'manufacturer_performance':
            report = asyncio.run(reporting_service.generate_manufacturer_performance(
                date_range['start_date'], date_range['end_date']
            ))
        elif report_type == 'user_engagement':
            report = asyncio.run(reporting_service.generate_user_engagement(
                date_range['start_date'], date_range['end_date']
            ))
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Save report to storage
        report_path = asyncio.run(reporting_service.save_report(report, report_type))
        
        # Send report to recipients if specified
        if recipients:
            send_report_email.delay(
                report_path=report_path,
                report_type=report_type,
                recipients=recipients,
                date_range=date_range
            )
        
        logger.info(f"Report generated successfully: {report_path}")
        
        return {
            'status': 'success',
            'report_type': report_type,
            'report_path': report_path,
            'date_range': date_range,
            'recipients_notified': len(recipients) if recipients else 0
        }
        
    except Exception as exc:
        logger.error(f"Report generation failed for {report_type}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=300, exc=exc)  # Retry in 5 minutes
        raise


@celery_app.task
def update_dashboard_metrics(self, metric_types: List[str] = None) -> Dict[str, Any]:
    """
    Update real-time dashboard metrics
    Priority: REALTIME
    """
    try:
        metrics_service = MetricsService()
        
        if not metric_types:
            metric_types = [
                'active_users',
                'pending_orders',
                'daily_revenue',
                'conversion_rates',
                'system_health',
                'response_times'
            ]
        
        updated_metrics = {}
        
        for metric_type in metric_types:
            try:
                if metric_type == 'active_users':
                    value = asyncio.run(metrics_service.get_active_users())
                elif metric_type == 'pending_orders':
                    value = asyncio.run(metrics_service.get_pending_orders_count())
                elif metric_type == 'daily_revenue':
                    value = asyncio.run(metrics_service.get_daily_revenue())
                elif metric_type == 'conversion_rates':
                    value = asyncio.run(metrics_service.get_conversion_rates())
                elif metric_type == 'system_health':
                    value = asyncio.run(metrics_service.get_system_health())
                elif metric_type == 'response_times':
                    value = asyncio.run(metrics_service.get_average_response_times())
                else:
                    continue
                
                # Update metric in cache
                asyncio.run(metrics_service.update_metric(metric_type, value))
                updated_metrics[metric_type] = value
                
            except Exception as e:
                logger.error(f"Failed to update metric {metric_type}: {str(e)}")
                updated_metrics[metric_type] = {'error': str(e)}
        
        logger.debug(f"Updated {len(updated_metrics)} dashboard metrics")
        
        return {
            'status': 'success',
            'updated_metrics': updated_metrics,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Dashboard metrics update failed: {str(exc)}")
        raise


@celery_app.task(bind=True, max_retries=2)
def process_user_analytics(self, analytics_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Process user analytics events in batch
    Priority: BATCH
    """
    try:
        analytics_service = AnalyticsService()
        
        logger.info(f"Processing {len(analytics_batch)} analytics events")
        
        processed = 0
        failed = 0
        
        for event_data in analytics_batch:
            try:
                # Validate event data
                required_fields = ['user_id', 'event_type', 'timestamp']
                for field in required_fields:
                    if field not in event_data:
                        raise ValueError(f"Missing required field: {field}")
                
                # Process the event
                asyncio.run(analytics_service.process_event(
                    user_id=event_data['user_id'],
                    event_type=event_data['event_type'],
                    properties=event_data.get('properties', {}),
                    timestamp=event_data['timestamp']
                ))
                
                processed += 1
                
            except Exception as e:
                logger.error(f"Failed to process analytics event: {str(e)}")
                failed += 1
        
        # Update user segments based on new events
        if processed > 0:
            update_user_segments.delay()
        
        logger.info(f"Analytics batch processing completed: {processed} processed, {failed} failed")
        
        return {
            'status': 'success',
            'total_events': len(analytics_batch),
            'processed': processed,
            'failed': failed
        }
        
    except Exception as exc:
        logger.error(f"User analytics processing failed: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=600, exc=exc)  # Retry in 10 minutes
        raise


@celery_app.task
def update_realtime_metrics() -> Dict[str, Any]:
    """
    Update real-time metrics for dashboard
    Scheduled task - runs every 5 minutes
    """
    try:
        realtime_metrics = [
            'active_users',
            'pending_orders',
            'system_health',
            'response_times'
        ]
        
        result = update_dashboard_metrics.delay(realtime_metrics).get(timeout=120)
        
        return result
        
    except Exception as exc:
        logger.error(f"Real-time metrics update failed: {str(exc)}")
        raise


@celery_app.task
def generate_daily_reports() -> Dict[str, Any]:
    """
    Generate daily reports
    Scheduled task - runs daily
    """
    try:
        yesterday = datetime.now() - timedelta(days=1)
        date_range = {
            'start_date': yesterday.date().isoformat(),
            'end_date': yesterday.date().isoformat()
        }
        
        # List of reports to generate
        reports_to_generate = [
            'daily_summary',
            'order_analytics',
            'payment_summary',
            'user_engagement'
        ]
        
        results = []
        for report_type in reports_to_generate:
            try:
                result = generate_reports.delay(
                    report_type=report_type,
                    date_range=date_range,
                    recipients=['admin@manufacturingplatform.com']
                ).get(timeout=300)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to generate {report_type}: {str(e)}")
                results.append({
                    'status': 'failed',
                    'report_type': report_type,
                    'error': str(e)
                })
        
        successful = len([r for r in results if r['status'] == 'success'])
        
        logger.info(f"Daily reports generation completed: {successful}/{len(reports_to_generate)} successful")
        
        return {
            'status': 'completed',
            'date': yesterday.date().isoformat(),
            'reports_generated': successful,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Daily reports generation failed: {str(exc)}")
        raise


@celery_app.task
def process_user_behavior() -> Dict[str, Any]:
    """
    Process user behavior analytics
    Scheduled task - runs every 6 hours
    """
    try:
        analytics_service = AnalyticsService()
        
        # Get unprocessed analytics events
        unprocessed_events = asyncio.run(analytics_service.get_unprocessed_events())
        
        if not unprocessed_events:
            return {
                'status': 'completed',
                'events_processed': 0
            }
        
        # Process events in batches
        batch_size = 100
        total_batches = (len(unprocessed_events) + batch_size - 1) // batch_size
        
        for i in range(0, len(unprocessed_events), batch_size):
            batch = unprocessed_events[i:i + batch_size]
            process_user_analytics.delay(batch)
        
        logger.info(f"Scheduled {total_batches} batches for {len(unprocessed_events)} analytics events")
        
        return {
            'status': 'scheduled',
            'events_to_process': len(unprocessed_events),
            'batches_scheduled': total_batches
        }
        
    except Exception as exc:
        logger.error(f"User behavior processing failed: {str(exc)}")
        raise


@celery_app.task
def calculate_kpis() -> Dict[str, Any]:
    """
    Calculate key performance indicators
    """
    try:
        analytics_service = AnalyticsService()
        
        # Calculate various KPIs
        kpis = {}
        
        # Customer acquisition cost
        kpis['customer_acquisition_cost'] = asyncio.run(
            analytics_service.calculate_customer_acquisition_cost()
        )
        
        # Customer lifetime value
        kpis['customer_lifetime_value'] = asyncio.run(
            analytics_service.calculate_customer_lifetime_value()
        )
        
        # Order conversion rate
        kpis['order_conversion_rate'] = asyncio.run(
            analytics_service.calculate_order_conversion_rate()
        )
        
        # Average order value
        kpis['average_order_value'] = asyncio.run(
            analytics_service.calculate_average_order_value()
        )
        
        # Monthly recurring revenue
        kpis['monthly_recurring_revenue'] = asyncio.run(
            analytics_service.calculate_monthly_recurring_revenue()
        )
        
        # Churn rate
        kpis['churn_rate'] = asyncio.run(
            analytics_service.calculate_churn_rate()
        )
        
        # Store KPIs
        asyncio.run(analytics_service.store_kpis(kpis))
        
        logger.info(f"KPIs calculated and stored: {list(kpis.keys())}")
        
        return {
            'status': 'success',
            'kpis': kpis,
            'calculated_at': datetime.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"KPI calculation failed: {str(exc)}")
        raise


@celery_app.task
def update_user_segments() -> Dict[str, Any]:
    """
    Update user segmentation based on behavior and activity
    """
    try:
        analytics_service = AnalyticsService()
        
        # Get all users for segmentation
        users = asyncio.run(analytics_service.get_users_for_segmentation())
        
        updated_segments = {}
        
        for user in users:
            try:
                # Calculate user metrics
                user_metrics = asyncio.run(analytics_service.calculate_user_metrics(user['id']))
                
                # Determine segment
                segment = asyncio.run(analytics_service.determine_user_segment(user_metrics))
                
                # Update user segment if changed
                if user.get('segment') != segment:
                    asyncio.run(analytics_service.update_user_segment(user['id'], segment))
                    
                    if segment not in updated_segments:
                        updated_segments[segment] = 0
                    updated_segments[segment] += 1
                    
            except Exception as e:
                logger.error(f"Failed to update segment for user {user['id']}: {str(e)}")
        
        total_updated = sum(updated_segments.values())
        
        logger.info(f"User segmentation updated: {total_updated} users across {len(updated_segments)} segments")
        
        return {
            'status': 'success',
            'users_processed': len(users),
            'users_updated': total_updated,
            'segment_distribution': updated_segments
        }
        
    except Exception as exc:
        logger.error(f"User segmentation update failed: {str(exc)}")
        raise


@celery_app.task
def send_report_email(report_path: str, report_type: str, recipients: List[str], 
                     date_range: Dict[str, str]) -> Dict[str, Any]:
    """
    Send generated report via email
    """
    try:
        from app.tasks.email_tasks import send_email_task
        
        for recipient in recipients:
            email_data = {
                'id': f"report_{report_type}_{datetime.now().strftime('%Y%m%d')}",
                'to_email': recipient,
                'to_name': 'Admin'
            }
            
            context = {
                'report_type': report_type.replace('_', ' ').title(),
                'date_range': f"{date_range['start_date']} to {date_range['end_date']}",
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Read report file for attachment
            with open(report_path, 'rb') as f:
                report_content = f.read()
            
            attachments = [{
                'filename': f"{report_type}_{date_range['start_date']}.pdf",
                'content': report_content,
                'type': 'application/pdf'
            }]
            
            send_email_task.delay(
                email_data=email_data,
                template_name='report_delivery',
                context=context,
                attachments=attachments
            )
        
        logger.info(f"Report emails sent to {len(recipients)} recipients")
        
        return {
            'status': 'success',
            'recipients': len(recipients),
            'report_type': report_type
        }
        
    except Exception as exc:
        logger.error(f"Failed to send report emails: {str(exc)}")
        raise


@celery_app.task
def analyze_order_patterns() -> Dict[str, Any]:
    """
    Analyze order patterns and trends
    """
    try:
        analytics_service = AnalyticsService()
        
        # Analyze various patterns
        patterns = {}
        
        # Seasonal patterns
        patterns['seasonal'] = asyncio.run(analytics_service.analyze_seasonal_patterns())
        
        # Geographic patterns
        patterns['geographic'] = asyncio.run(analytics_service.analyze_geographic_patterns())
        
        # Product category patterns
        patterns['category'] = asyncio.run(analytics_service.analyze_category_patterns())
        
        # Time-based patterns
        patterns['temporal'] = asyncio.run(analytics_service.analyze_temporal_patterns())
        
        # Store insights
        asyncio.run(analytics_service.store_pattern_insights(patterns))
        
        logger.info(f"Order pattern analysis completed: {list(patterns.keys())}")
        
        return {
            'status': 'success',
            'patterns_analyzed': list(patterns.keys()),
            'insights': patterns
        }
        
    except Exception as exc:
        logger.error(f"Order pattern analysis failed: {str(exc)}")
        raise


@celery_app.task
def generate_predictive_analytics() -> Dict[str, Any]:
    """
    Generate predictive analytics and forecasts
    """
    try:
        analytics_service = AnalyticsService()
        
        # Generate various predictions
        predictions = {}
        
        # Demand forecasting
        predictions['demand_forecast'] = asyncio.run(
            analytics_service.generate_demand_forecast(30)  # 30 days
        )
        
        # Revenue forecasting
        predictions['revenue_forecast'] = asyncio.run(
            analytics_service.generate_revenue_forecast(90)  # 90 days
        )
        
        # Churn prediction
        predictions['churn_prediction'] = asyncio.run(
            analytics_service.predict_customer_churn()
        )
        
        # Order success probability
        predictions['order_success'] = asyncio.run(
            analytics_service.predict_order_success()
        )
        
        # Store predictions
        asyncio.run(analytics_service.store_predictions(predictions))
        
        logger.info(f"Predictive analytics generated: {list(predictions.keys())}")
        
        return {
            'status': 'success',
            'predictions_generated': list(predictions.keys()),
            'predictions': predictions
        }
        
    except Exception as exc:
        logger.error(f"Predictive analytics generation failed: {str(exc)}")
        raise 