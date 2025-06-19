"""
Advanced task management utilities for Celery background tasks
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from celery import current_app
from celery.result import AsyncResult
from loguru import logger
import redis

from app.core.celery_config import celery_app
from app.core.config import settings


class TaskManager:
    """Comprehensive task management and monitoring"""
    
    def __init__(self):
        self.celery_app = celery_app
        self.redis_client = redis.from_url(getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'))
        
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get detailed status of a specific task"""
        try:
            result = AsyncResult(task_id, app=self.celery_app)
            
            status_info = {
                'task_id': task_id,
                'status': result.status,
                'result': result.result if result.ready() else None,
                'traceback': result.traceback,
                'date_done': result.date_done.isoformat() if result.date_done else None,
                'successful': result.successful() if result.ready() else None,
                'failed': result.failed() if result.ready() else None
            }
            
            # Get additional info from Redis if available
            redis_key = f"task_info:{task_id}"
            redis_info = self.redis_client.hgetall(redis_key)
            if redis_info:
                status_info.update({
                    'queue': redis_info.get(b'queue', b'').decode(),
                    'priority': redis_info.get(b'priority', b'').decode(),
                    'started_at': redis_info.get(b'started_at', b'').decode(),
                    'worker': redis_info.get(b'worker', b'').decode()
                })
            
            return status_info
            
        except Exception as e:
            logger.error(f"Error getting task status for {task_id}: {str(e)}")
            return {'task_id': task_id, 'status': 'ERROR', 'error': str(e)}
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get status of all queues"""
        try:
            inspect = self.celery_app.control.inspect()
            
            # Get queue lengths
            active_queues = inspect.active_queues()
            reserved = inspect.reserved()
            scheduled = inspect.scheduled()
            
            queue_status = {}
            
            # Calculate queue lengths
            for worker, queues in (active_queues or {}).items():
                for queue_info in queues:
                    queue_name = queue_info['name']
                    if queue_name not in queue_status:
                        queue_status[queue_name] = {
                            'name': queue_name,
                            'length': 0,
                            'reserved': 0,
                            'scheduled': 0,
                            'workers': []
                        }
                    
                    queue_status[queue_name]['workers'].append(worker)
            
            # Add reserved tasks
            for worker, tasks in (reserved or {}).items():
                for task in tasks:
                    queue_name = task.get('delivery_info', {}).get('routing_key', 'default')
                    if queue_name in queue_status:
                        queue_status[queue_name]['reserved'] += 1
            
            # Add scheduled tasks  
            for worker, tasks in (scheduled or {}).items():
                for task in tasks:
                    queue_name = task.get('delivery_info', {}).get('routing_key', 'default')
                    if queue_name in queue_status:
                        queue_status[queue_name]['scheduled'] += 1
            
            # Get actual queue lengths from Redis
            for queue_name in queue_status.keys():
                try:
                    length = self.redis_client.llen(queue_name)
                    queue_status[queue_name]['length'] = length
                except:
                    pass
            
            return {
                'status': 'success',
                'queues': queue_status,
                'total_queues': len(queue_status),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting queue status: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def get_worker_status(self) -> Dict[str, Any]:
        """Get status of all workers"""
        try:
            inspect = self.celery_app.control.inspect()
            
            stats = inspect.stats()
            active = inspect.active()
            registered = inspect.registered()
            
            worker_status = {}
            
            for worker_name in (stats or {}).keys():
                worker_info = stats[worker_name]
                worker_status[worker_name] = {
                    'name': worker_name,
                    'status': 'online',
                    'active_tasks': len(active.get(worker_name, [])),
                    'processed_tasks': worker_info.get('total', {}),
                    'pool': worker_info.get('pool', {}),
                    'registered_tasks': len(registered.get(worker_name, [])),
                    'rusage': worker_info.get('rusage', {}),
                    'clock': worker_info.get('clock', 0)
                }
            
            return {
                'status': 'success',
                'workers': worker_status,
                'total_workers': len(worker_status),
                'online_workers': len([w for w in worker_status.values() if w['status'] == 'online']),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting worker status: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def get_task_history(self, hours: int = 24, task_name: str = None) -> Dict[str, Any]:
        """Get task execution history"""
        try:
            # Get task results from Redis (last N hours)
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)
            
            # Scan for task result keys
            pattern = "celery-task-meta-*"
            task_keys = self.redis_client.keys(pattern)
            
            task_history = []
            
            for key in task_keys:
                try:
                    task_data = self.redis_client.get(key)
                    if task_data:
                        task_info = json.loads(task_data)
                        
                        # Filter by task name if specified
                        if task_name and task_info.get('task') != task_name:
                            continue
                        
                        # Check if within time range
                        if 'date_done' in task_info:
                            task_time = datetime.fromisoformat(task_info['date_done'].replace('Z', '+00:00'))
                            if start_time <= task_time <= end_time:
                                task_history.append({
                                    'task_id': key.decode().replace('celery-task-meta-', ''),
                                    'task_name': task_info.get('task'),
                                    'status': task_info.get('status'),
                                    'result': task_info.get('result'),
                                    'date_done': task_info.get('date_done'),
                                    'traceback': task_info.get('traceback')
                                })
                except Exception as e:
                    logger.debug(f"Error parsing task data for {key}: {str(e)}")
                    continue
            
            # Sort by date_done
            task_history.sort(key=lambda x: x.get('date_done', ''), reverse=True)
            
            # Calculate statistics
            total_tasks = len(task_history)
            successful_tasks = len([t for t in task_history if t['status'] == 'SUCCESS'])
            failed_tasks = len([t for t in task_history if t['status'] == 'FAILURE'])
            
            return {
                'status': 'success',
                'period_hours': hours,
                'task_name_filter': task_name,
                'total_tasks': total_tasks,
                'successful_tasks': successful_tasks,
                'failed_tasks': failed_tasks,
                'success_rate': (successful_tasks / total_tasks * 100) if total_tasks > 0 else 0,
                'tasks': task_history
            }
            
        except Exception as e:
            logger.error(f"Error getting task history: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def cancel_task(self, task_id: str, terminate: bool = False) -> Dict[str, Any]:
        """Cancel or terminate a running task"""
        try:
            if terminate:
                self.celery_app.control.revoke(task_id, terminate=True)
                action = 'terminated'
            else:
                self.celery_app.control.revoke(task_id)
                action = 'cancelled'
            
            logger.info(f"Task {task_id} {action}")
            
            return {
                'status': 'success',
                'task_id': task_id,
                'action': action
            }
            
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {str(e)}")
            return {'status': 'error', 'task_id': task_id, 'error': str(e)}
    
    def retry_failed_task(self, task_id: str) -> Dict[str, Any]:
        """Retry a failed task"""
        try:
            result = AsyncResult(task_id, app=self.celery_app)
            
            if not result.failed():
                return {
                    'status': 'error',
                    'task_id': task_id,
                    'error': 'Task is not in failed state'
                }
            
            # Get original task info
            task_info = result.result
            
            # Create new task with same parameters
            # Note: This is simplified - in practice you'd need to store original task params
            new_result = result.retry()
            
            return {
                'status': 'success',
                'original_task_id': task_id,
                'new_task_id': new_result.id,
                'action': 'retried'
            }
            
        except Exception as e:
            logger.error(f"Error retrying task {task_id}: {str(e)}")
            return {'status': 'error', 'task_id': task_id, 'error': str(e)}
    
    def purge_queue(self, queue_name: str) -> Dict[str, Any]:
        """Purge all tasks from a specific queue"""
        try:
            self.celery_app.control.purge()
            
            logger.warning(f"Purged queue: {queue_name}")
            
            return {
                'status': 'success',
                'queue_name': queue_name,
                'action': 'purged'
            }
            
        except Exception as e:
            logger.error(f"Error purging queue {queue_name}: {str(e)}")
            return {'status': 'error', 'queue_name': queue_name, 'error': str(e)}
    
    def get_failed_tasks(self, hours: int = 24) -> Dict[str, Any]:
        """Get list of failed tasks"""
        history = self.get_task_history(hours=hours)
        
        if history['status'] == 'error':
            return history
        
        failed_tasks = [task for task in history['tasks'] if task['status'] == 'FAILURE']
        
        return {
            'status': 'success',
            'period_hours': hours,
            'total_failed': len(failed_tasks),
            'failed_tasks': failed_tasks
        }
    
    def get_slow_tasks(self, threshold_seconds: int = 300) -> Dict[str, Any]:
        """Get tasks that are running longer than threshold"""
        try:
            inspect = self.celery_app.control.inspect()
            active_tasks = inspect.active()
            
            slow_tasks = []
            current_time = datetime.now()
            
            for worker, tasks in (active_tasks or {}).items():
                for task in tasks:
                    task_start_time = datetime.fromtimestamp(task['time_start'])
                    runtime = (current_time - task_start_time).total_seconds()
                    
                    if runtime > threshold_seconds:
                        slow_tasks.append({
                            'task_id': task['id'],
                            'task_name': task['name'],
                            'worker': worker,
                            'runtime_seconds': runtime,
                            'args': task['args'],
                            'kwargs': task['kwargs']
                        })
            
            return {
                'status': 'success',
                'threshold_seconds': threshold_seconds,
                'slow_tasks_count': len(slow_tasks),
                'slow_tasks': slow_tasks
            }
            
        except Exception as e:
            logger.error(f"Error getting slow tasks: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def get_task_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get comprehensive task statistics"""
        try:
            # Get task history
            history = self.get_task_history(hours=hours)
            
            if history['status'] == 'error':
                return history
            
            tasks = history['tasks']
            
            # Group by task name
            task_stats = {}
            for task in tasks:
                task_name = task['task_name']
                if task_name not in task_stats:
                    task_stats[task_name] = {
                        'total': 0,
                        'successful': 0,
                        'failed': 0,
                        'success_rate': 0
                    }
                
                task_stats[task_name]['total'] += 1
                if task['status'] == 'SUCCESS':
                    task_stats[task_name]['successful'] += 1
                elif task['status'] == 'FAILURE':
                    task_stats[task_name]['failed'] += 1
            
            # Calculate success rates
            for stats in task_stats.values():
                if stats['total'] > 0:
                    stats['success_rate'] = (stats['successful'] / stats['total']) * 100
            
            # Get queue and worker info
            queue_status = self.get_queue_status()
            worker_status = self.get_worker_status()
            
            return {
                'status': 'success',
                'period_hours': hours,
                'overall_stats': {
                    'total_tasks': history['total_tasks'],
                    'successful_tasks': history['successful_tasks'],
                    'failed_tasks': history['failed_tasks'],
                    'success_rate': history['success_rate']
                },
                'task_breakdown': task_stats,
                'queue_info': queue_status,
                'worker_info': worker_status,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting task statistics: {str(e)}")
            return {'status': 'error', 'error': str(e)}


class TaskScheduler:
    """Advanced task scheduling utilities"""
    
    def __init__(self):
        self.celery_app = celery_app
        self.redis_client = redis.from_url(getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0'))
    
    def schedule_task(self, task_name: str, args: List = None, kwargs: Dict = None, 
                     eta: datetime = None, countdown: int = None, priority: int = 5) -> Dict[str, Any]:
        """Schedule a task for future execution"""
        try:
            task = self.celery_app.send_task(
                task_name,
                args=args or [],
                kwargs=kwargs or {},
                eta=eta,
                countdown=countdown,
                priority=priority
            )
            
            # Store task info in Redis for tracking
            task_info = {
                'task_name': task_name,
                'args': args,
                'kwargs': kwargs,
                'eta': eta.isoformat() if eta else None,
                'countdown': countdown,
                'priority': priority,
                'scheduled_at': datetime.now().isoformat()
            }
            
            self.redis_client.hset(f"scheduled_task:{task.id}", mapping=task_info)
            self.redis_client.expire(f"scheduled_task:{task.id}", 86400)  # 24 hours
            
            logger.info(f"Scheduled task {task_name} with ID {task.id}")
            
            return {
                'status': 'success',
                'task_id': task.id,
                'task_name': task_name,
                'eta': eta.isoformat() if eta else None,
                'countdown': countdown
            }
            
        except Exception as e:
            logger.error(f"Error scheduling task {task_name}: {str(e)}")
            return {'status': 'error', 'task_name': task_name, 'error': str(e)}
    
    def schedule_batch_tasks(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Schedule multiple tasks in batch"""
        results = []
        
        for task_config in tasks:
            result = self.schedule_task(**task_config)
            results.append(result)
        
        successful = len([r for r in results if r['status'] == 'success'])
        
        return {
            'status': 'completed',
            'total_tasks': len(tasks),
            'successful': successful,
            'failed': len(tasks) - successful,
            'results': results
        }


# Global instances
task_manager = TaskManager()
task_scheduler = TaskScheduler() 