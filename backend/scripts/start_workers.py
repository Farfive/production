#!/usr/bin/env python3
"""
Celery worker management script for the manufacturing platform
Supports different worker configurations and auto-scaling
"""
import os
import sys
import argparse
import subprocess
import signal
import time
from pathlib import Path
from typing import Dict, List

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.celery_config import celery_app


class CeleryWorkerManager:
    """Manage Celery workers with different configurations"""
    
    def __init__(self):
        self.workers = {}
        self.base_cmd = [
            'celery', '-A', 'app.core.celery_config', 'worker'
        ]
        
    def get_worker_configs(self) -> Dict[str, Dict]:
        """Get predefined worker configurations"""
        return {
            'critical': {
                'queues': ['payment.critical', 'order.critical', 'monitoring.critical'],
                'concurrency': 4,
                'prefetch_multiplier': 1,
                'max_tasks_per_child': 50,
                'description': 'Critical tasks (payments, urgent orders, monitoring)'
            },
            'normal': {
                'queues': ['email.normal', 'order.normal', 'payment.normal', 'sync.normal'],
                'concurrency': 8,
                'prefetch_multiplier': 2,
                'max_tasks_per_child': 100,
                'description': 'Normal priority tasks'
            },
            'bulk': {
                'queues': ['email.bulk', 'analytics.batch', 'payment.batch'],
                'concurrency': 4,
                'prefetch_multiplier': 4,
                'max_tasks_per_child': 200,
                'description': 'Bulk processing tasks'
            },
            'maintenance': {
                'queues': ['sync.maintenance', 'sync.backup'],
                'concurrency': 2,
                'prefetch_multiplier': 1,
                'max_tasks_per_child': 10,
                'description': 'Maintenance and cleanup tasks'
            },
            'analytics': {
                'queues': ['analytics.realtime', 'analytics.normal'],
                'concurrency': 6,
                'prefetch_multiplier': 2,
                'max_tasks_per_child': 150,
                'description': 'Analytics and reporting tasks'
            }
        }
    
    def start_worker(self, worker_type: str, worker_name: str = None) -> subprocess.Popen:
        """Start a worker with specific configuration"""
        configs = self.get_worker_configs()
        
        if worker_type not in configs:
            raise ValueError(f"Unknown worker type: {worker_type}")
        
        config = configs[worker_type]
        
        if not worker_name:
            worker_name = f"{worker_type}_worker_{int(time.time())}"
        
        cmd = self.base_cmd + [
            '--queues', ','.join(config['queues']),
            '--concurrency', str(config['concurrency']),
            '--prefetch-multiplier', str(config['prefetch_multiplier']),
            '--max-tasks-per-child', str(config['max_tasks_per_child']),
            '--hostname', f"{worker_name}@%h",
            '--loglevel', 'INFO',
            '--time-limit', '1800',  # 30 minutes hard limit
            '--soft-time-limit', '1200',  # 20 minutes soft limit
        ]
        
        # Add optimization flags
        cmd.extend([
            '--optimization', 'fair',
            '--pool', 'prefork',
            '--without-gossip',
            '--without-mingle',
        ])
        
        print(f"Starting {worker_type} worker: {worker_name}")
        print(f"Queues: {', '.join(config['queues'])}")
        print(f"Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        self.workers[worker_name] = {
            'process': process,
            'type': worker_type,
            'config': config,
            'started_at': time.time()
        }
        
        return process
    
    def start_beat_scheduler(self) -> subprocess.Popen:
        """Start Celery Beat scheduler"""
        cmd = [
            'celery', '-A', 'app.core.celery_config', 'beat',
            '--loglevel', 'INFO',
            '--schedule-filename', '/tmp/celerybeat-schedule',
            '--pidfile', '/tmp/celerybeat.pid'
        ]
        
        print("Starting Celery Beat scheduler")
        print(f"Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        self.workers['beat_scheduler'] = {
            'process': process,
            'type': 'beat',
            'started_at': time.time()
        }
        
        return process
    
    def start_flower_monitor(self, port: int = 5555) -> subprocess.Popen:
        """Start Flower monitoring dashboard"""
        cmd = [
            'celery', '-A', 'app.core.celery_config', 'flower',
            '--port', str(port),
            '--basic_auth', 'admin:manufacturing2024',
            '--url_prefix', 'flower'
        ]
        
        print(f"Starting Flower monitoring on port {port}")
        print(f"Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        self.workers['flower_monitor'] = {
            'process': process,
            'type': 'flower',
            'started_at': time.time()
        }
        
        return process
    
    def stop_worker(self, worker_name: str, graceful: bool = True):
        """Stop a specific worker"""
        if worker_name not in self.workers:
            print(f"Worker {worker_name} not found")
            return
        
        worker = self.workers[worker_name]
        process = worker['process']
        
        if graceful:
            print(f"Gracefully stopping worker: {worker_name}")
            process.send_signal(signal.SIGTERM)
            
            # Wait up to 30 seconds for graceful shutdown
            try:
                process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                print(f"Worker {worker_name} did not stop gracefully, forcing...")
                process.kill()
        else:
            print(f"Force stopping worker: {worker_name}")
            process.kill()
        
        del self.workers[worker_name]
    
    def stop_all_workers(self, graceful: bool = True):
        """Stop all workers"""
        worker_names = list(self.workers.keys())
        for worker_name in worker_names:
            self.stop_worker(worker_name, graceful)
    
    def restart_worker(self, worker_name: str):
        """Restart a specific worker"""
        if worker_name not in self.workers:
            print(f"Worker {worker_name} not found")
            return
        
        worker = self.workers[worker_name]
        worker_type = worker['type']
        
        self.stop_worker(worker_name)
        time.sleep(2)  # Brief pause
        
        if worker_type == 'beat':
            self.start_beat_scheduler()
        elif worker_type == 'flower':
            self.start_flower_monitor()
        else:
            self.start_worker(worker_type, worker_name)
    
    def get_worker_status(self) -> Dict:
        """Get status of all managed workers"""
        status = {}
        
        for worker_name, worker_info in self.workers.items():
            process = worker_info['process']
            
            if process.poll() is None:
                status[worker_name] = {
                    'status': 'running',
                    'pid': process.pid,
                    'type': worker_info['type'],
                    'uptime': time.time() - worker_info['started_at']
                }
            else:
                status[worker_name] = {
                    'status': 'stopped',
                    'exit_code': process.returncode,
                    'type': worker_info['type']
                }
        
        return status
    
    def monitor_workers(self, check_interval: int = 30):
        """Monitor workers and restart if needed"""
        print(f"Starting worker monitoring (check interval: {check_interval}s)")
        
        try:
            while True:
                status = self.get_worker_status()
                
                for worker_name, worker_status in status.items():
                    if worker_status['status'] == 'stopped':
                        print(f"Worker {worker_name} stopped unexpectedly, restarting...")
                        self.restart_worker(worker_name)
                
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            print("\nMonitoring interrupted, stopping all workers...")
            self.stop_all_workers()


def main():
    parser = argparse.ArgumentParser(description='Celery Worker Manager')
    parser.add_argument('command', choices=['start', 'stop', 'restart', 'status', 'monitor', 'flower', 'beat'])
    parser.add_argument('--worker-type', choices=['critical', 'normal', 'bulk', 'maintenance', 'analytics', 'all'])
    parser.add_argument('--worker-name', help='Specific worker name')
    parser.add_argument('--port', type=int, default=5555, help='Port for Flower monitor')
    parser.add_argument('--monitor-interval', type=int, default=30, help='Monitoring check interval in seconds')
    
    args = parser.parse_args()
    
    manager = CeleryWorkerManager()
    
    if args.command == 'start':
        if args.worker_type == 'all':
            # Start all worker types
            for worker_type in manager.get_worker_configs().keys():
                manager.start_worker(worker_type)
        elif args.worker_type:
            manager.start_worker(args.worker_type, args.worker_name)
        else:
            # Default to starting normal workers
            manager.start_worker('normal')
            
        # Keep script running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down workers...")
            manager.stop_all_workers()
    
    elif args.command == 'stop':
        if args.worker_name:
            manager.stop_worker(args.worker_name)
        else:
            manager.stop_all_workers()
    
    elif args.command == 'restart':
        if args.worker_name:
            manager.restart_worker(args.worker_name)
        else:
            print("Please specify --worker-name for restart")
    
    elif args.command == 'status':
        status = manager.get_worker_status()
        
        print("\nWorker Status:")
        print("-" * 60)
        for worker_name, worker_status in status.items():
            uptime = f" (uptime: {worker_status.get('uptime', 0):.1f}s)" if 'uptime' in worker_status else ""
            print(f"{worker_name}: {worker_status['status']}{uptime}")
        
        if not status:
            print("No workers currently managed by this script")
    
    elif args.command == 'monitor':
        if args.worker_type == 'all':
            for worker_type in manager.get_worker_configs().keys():
                manager.start_worker(worker_type)
        elif args.worker_type:
            manager.start_worker(args.worker_type)
        
        manager.monitor_workers(args.monitor_interval)
    
    elif args.command == 'flower':
        manager.start_flower_monitor(args.port)
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down Flower...")
            manager.stop_worker('flower_monitor')
    
    elif args.command == 'beat':
        manager.start_beat_scheduler()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down Beat scheduler...")
            manager.stop_worker('beat_scheduler')


if __name__ == '__main__':
    main() 