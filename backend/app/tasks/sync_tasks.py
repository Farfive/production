"""
Data synchronization, cleanup, and backup tasks
"""
import asyncio
import json
import gzip
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from celery import current_app
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from loguru import logger

from app.core.celery_config import celery_app
from app.core.database import get_db
from app.services.external_api import ExternalAPIService
from app.services.backup import BackupService
from app.services.cleanup import CleanupService
from app.models.sync_log import SyncLog


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def sync_external_data(self, api_name: str, sync_type: str = 'incremental') -> Dict[str, Any]:
    """
    Synchronize data with external APIs
    Priority: NORMAL
    """
    try:
        api_service = ExternalAPIService()
        
        logger.info(f"Starting {sync_type} sync for {api_name}")
        
        # Get last sync timestamp for incremental sync
        last_sync = None
        if sync_type == 'incremental':
            last_sync = asyncio.run(api_service.get_last_sync_timestamp(api_name))
        
        # Sync data based on API type
        if api_name == 'stripe_payments':
            result = asyncio.run(api_service.sync_stripe_payments(last_sync))
        elif api_name == 'currency_rates':
            result = asyncio.run(api_service.sync_currency_rates())
        elif api_name == 'tax_rates':
            result = asyncio.run(api_service.sync_tax_rates())
        elif api_name == 'postal_codes':
            result = asyncio.run(api_service.sync_postal_codes(last_sync))
        elif api_name == 'company_registry':
            result = asyncio.run(api_service.sync_company_registry(last_sync))
        else:
            raise ValueError(f"Unknown API: {api_name}")
        
        # Log sync result
        asyncio.run(api_service.log_sync_result(
            api_name=api_name,
            sync_type=sync_type,
            result=result
        ))
        
        logger.info(f"Sync completed for {api_name}: {result['records_processed']} records processed")
        
        return {
            'status': 'success',
            'api_name': api_name,
            'sync_type': sync_type,
            'records_processed': result['records_processed'],
            'records_updated': result['records_updated'],
            'records_created': result['records_created'],
            'errors': result.get('errors', [])
        }
        
    except Exception as exc:
        logger.error(f"External API sync failed for {api_name}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            countdown = 300 * (2 ** self.request.retries)  # Exponential backoff
            raise self.retry(countdown=countdown, exc=exc)
        else:
            # Log failure
            api_service = ExternalAPIService()
            asyncio.run(api_service.log_sync_failure(api_name, str(exc)))
            return {
                'status': 'failed',
                'api_name': api_name,
                'error': str(exc)
            }


@celery_app.task(bind=True, max_retries=2)
def cleanup_old_data(self, cleanup_type: str, days_old: int = 30) -> Dict[str, Any]:
    """
    Clean up old data from various tables
    Priority: MAINTENANCE
    """
    try:
        cleanup_service = CleanupService()
        
        logger.info(f"Starting cleanup for {cleanup_type}, removing data older than {days_old} days")
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        if cleanup_type == 'logs':
            result = asyncio.run(cleanup_service.cleanup_old_logs(cutoff_date))
        elif cleanup_type == 'sessions':
            result = asyncio.run(cleanup_service.cleanup_expired_sessions(cutoff_date))
        elif cleanup_type == 'temp_files':
            result = asyncio.run(cleanup_service.cleanup_temp_files(cutoff_date))
        elif cleanup_type == 'email_tracking':
            result = asyncio.run(cleanup_service.cleanup_email_tracking(cutoff_date))
        elif cleanup_type == 'failed_tasks':
            result = asyncio.run(cleanup_service.cleanup_failed_tasks(cutoff_date))
        else:
            raise ValueError(f"Unknown cleanup type: {cleanup_type}")
        
        logger.info(f"Cleanup completed for {cleanup_type}: {result['records_deleted']} records deleted")
        
        return {
            'status': 'success',
            'cleanup_type': cleanup_type,
            'cutoff_date': cutoff_date.isoformat(),
            'records_deleted': result['records_deleted'],
            'space_freed_mb': result.get('space_freed_mb', 0)
        }
        
    except Exception as exc:
        logger.error(f"Cleanup failed for {cleanup_type}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=600, exc=exc)  # Retry in 10 minutes
        raise


@celery_app.task(bind=True, max_retries=2)
def backup_data(self, backup_type: str, tables: List[str] = None) -> Dict[str, Any]:
    """
    Backup critical data
    Priority: BACKUP
    """
    try:
        backup_service = BackupService()
        
        logger.info(f"Starting {backup_type} backup")
        
        if backup_type == 'full':
            result = asyncio.run(backup_service.create_full_backup())
        elif backup_type == 'incremental':
            result = asyncio.run(backup_service.create_incremental_backup())
        elif backup_type == 'selective' and tables:
            result = asyncio.run(backup_service.create_selective_backup(tables))
        else:
            raise ValueError(f"Invalid backup type or missing tables: {backup_type}")
        
        # Compress backup if large
        if result['size_mb'] > 100:
            compressed_result = asyncio.run(backup_service.compress_backup(result['backup_path']))
            result.update(compressed_result)
        
        # Upload to cloud storage
        if backup_type in ['full', 'incremental']:
            upload_result = asyncio.run(backup_service.upload_to_cloud(result['backup_path']))
            result.update(upload_result)
        
        logger.info(f"Backup completed: {result['backup_path']}")
        
        return {
            'status': 'success',
            'backup_type': backup_type,
            'backup_path': result['backup_path'],
            'size_mb': result['size_mb'],
            'compressed': result.get('compressed', False),
            'uploaded': result.get('uploaded', False)
        }
        
    except Exception as exc:
        logger.error(f"Backup failed for {backup_type}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=1800, exc=exc)  # Retry in 30 minutes
        raise


@celery_app.task
def sync_all_external_apis() -> Dict[str, Any]:
    """
    Sync all external APIs
    Scheduled task - runs every 2 hours
    """
    try:
        apis_to_sync = [
            'stripe_payments',
            'currency_rates',
            'tax_rates',
            'postal_codes',
            'company_registry'
        ]
        
        results = []
        for api_name in apis_to_sync:
            try:
                # Use delay() to run synchronously within this task
                task_result = sync_external_data.delay(api_name, 'incremental')
                result = task_result.get(timeout=300)  # 5 minute timeout per API
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to sync {api_name}: {str(e)}")
                results.append({
                    'status': 'failed',
                    'api_name': api_name,
                    'error': str(e)
                })
        
        successful = len([r for r in results if r['status'] == 'success'])
        
        logger.info(f"Bulk API sync completed: {successful}/{len(apis_to_sync)} successful")
        
        return {
            'status': 'completed',
            'total_apis': len(apis_to_sync),
            'successful': successful,
            'failed': len(apis_to_sync) - successful,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Bulk API sync failed: {str(exc)}")
        raise


@celery_app.task
def cleanup_old_logs() -> Dict[str, Any]:
    """
    Clean up old log files and database logs
    Scheduled task - runs daily
    """
    try:
        cleanup_types = [
            ('logs', 30),
            ('sessions', 7),
            ('temp_files', 1),
            ('email_tracking', 90),
            ('failed_tasks', 7)
        ]
        
        results = []
        total_deleted = 0
        total_space_freed = 0
        
        for cleanup_type, days_old in cleanup_types:
            try:
                result = cleanup_old_data.delay(cleanup_type, days_old).get(timeout=300)
                results.append(result)
                total_deleted += result['records_deleted']
                total_space_freed += result.get('space_freed_mb', 0)
            except Exception as e:
                logger.error(f"Failed to cleanup {cleanup_type}: {str(e)}")
                results.append({
                    'status': 'failed',
                    'cleanup_type': cleanup_type,
                    'error': str(e)
                })
        
        logger.info(f"Cleanup completed: {total_deleted} records deleted, {total_space_freed} MB freed")
        
        return {
            'status': 'completed',
            'total_records_deleted': total_deleted,
            'total_space_freed_mb': total_space_freed,
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Cleanup task failed: {str(exc)}")
        raise


@celery_app.task
def backup_critical_data() -> Dict[str, Any]:
    """
    Backup critical data tables
    Scheduled task - runs every 6 hours
    """
    try:
        critical_tables = [
            'users',
            'manufacturers',
            'orders',
            'transactions',
            'quotes'
        ]
        
        # Create selective backup of critical tables
        result = backup_data.delay('selective', critical_tables).get(timeout=1800)  # 30 minute timeout
        
        logger.info(f"Critical data backup completed: {result['backup_path']}")
        
        return result
        
    except Exception as exc:
        logger.error(f"Critical data backup failed: {str(exc)}")
        raise


@celery_app.task(bind=True, max_retries=3)
def sync_user_preferences(self, user_id: int) -> Dict[str, Any]:
    """
    Sync user preferences across services
    """
    try:
        api_service = ExternalAPIService()
        
        # Get user preferences from database
        preferences = asyncio.run(api_service.get_user_preferences(user_id))
        
        # Sync with external services
        sync_results = {}
        
        # Sync with email service
        if preferences.get('email_preferences'):
            email_result = asyncio.run(api_service.sync_email_preferences(
                user_id, preferences['email_preferences']
            ))
            sync_results['email'] = email_result
        
        # Sync with notification service
        if preferences.get('notification_preferences'):
            notification_result = asyncio.run(api_service.sync_notification_preferences(
                user_id, preferences['notification_preferences']
            ))
            sync_results['notifications'] = notification_result
        
        # Sync with analytics service
        if preferences.get('analytics_preferences'):
            analytics_result = asyncio.run(api_service.sync_analytics_preferences(
                user_id, preferences['analytics_preferences']
            ))
            sync_results['analytics'] = analytics_result
        
        logger.info(f"User preferences synced for user {user_id}")
        
        return {
            'status': 'success',
            'user_id': user_id,
            'sync_results': sync_results
        }
        
    except Exception as exc:
        logger.error(f"User preference sync failed for user {user_id}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=180, exc=exc)  # Retry in 3 minutes
        raise


@celery_app.task
def validate_data_integrity() -> Dict[str, Any]:
    """
    Validate data integrity across related tables
    """
    try:
        cleanup_service = CleanupService()
        
        # Check for orphaned records
        integrity_checks = asyncio.run(cleanup_service.run_integrity_checks())
        
        issues_found = sum(len(issues) for issues in integrity_checks.values())
        
        if issues_found > 0:
            logger.warning(f"Data integrity issues found: {issues_found}")
            
            # Auto-fix minor issues
            auto_fix_results = asyncio.run(cleanup_service.auto_fix_integrity_issues(integrity_checks))
            
            # Report remaining issues
            if auto_fix_results['unfixed_issues']:
                # Send alert to admin
                from app.services.notification import NotificationService
                notification_service = NotificationService()
                asyncio.run(notification_service.send_admin_notification(
                    type='data_integrity_issues',
                    message=f"Data integrity issues require manual attention",
                    data=auto_fix_results['unfixed_issues']
                ))
        
        return {
            'status': 'completed',
            'issues_found': issues_found,
            'auto_fixed': auto_fix_results.get('fixed_issues', 0),
            'requires_attention': len(auto_fix_results.get('unfixed_issues', []))
        }
        
    except Exception as exc:
        logger.error(f"Data integrity validation failed: {str(exc)}")
        raise


@celery_app.task
def optimize_database() -> Dict[str, Any]:
    """
    Optimize database performance
    """
    try:
        cleanup_service = CleanupService()
        
        # Run database optimization
        optimization_results = asyncio.run(cleanup_service.optimize_database())
        
        logger.info(f"Database optimization completed: {optimization_results}")
        
        return {
            'status': 'completed',
            'optimizations': optimization_results
        }
        
    except Exception as exc:
        logger.error(f"Database optimization failed: {str(exc)}")
        raise


@celery_app.task(bind=True, max_retries=2)
def archive_old_data(self, table_name: str, archive_criteria: Dict[str, Any]) -> Dict[str, Any]:
    """
    Archive old data to separate storage
    """
    try:
        cleanup_service = CleanupService()
        
        logger.info(f"Archiving old data from {table_name}")
        
        # Archive data based on criteria
        result = asyncio.run(cleanup_service.archive_data(table_name, archive_criteria))
        
        logger.info(f"Archived {result['records_archived']} records from {table_name}")
        
        return {
            'status': 'success',
            'table_name': table_name,
            'records_archived': result['records_archived'],
            'archive_path': result['archive_path']
        }
        
    except Exception as exc:
        logger.error(f"Data archiving failed for {table_name}: {str(exc)}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=900, exc=exc)  # Retry in 15 minutes
        raise


@celery_app.task
def sync_cache_data() -> Dict[str, Any]:
    """
    Synchronize cache data with database
    """
    try:
        api_service = ExternalAPIService()
        
        # Sync various cache types
        cache_types = ['user_sessions', 'order_cache', 'manufacturer_cache', 'analytics_cache']
        
        results = {}
        for cache_type in cache_types:
            try:
                result = asyncio.run(api_service.sync_cache_data(cache_type))
                results[cache_type] = result
            except Exception as e:
                logger.error(f"Failed to sync {cache_type}: {str(e)}")
                results[cache_type] = {'status': 'failed', 'error': str(e)}
        
        successful = len([r for r in results.values() if r.get('status') == 'success'])
        
        logger.info(f"Cache sync completed: {successful}/{len(cache_types)} successful")
        
        return {
            'status': 'completed',
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Cache sync failed: {str(exc)}")
        raise 