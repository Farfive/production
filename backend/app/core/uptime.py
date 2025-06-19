"""
Uptime Monitoring System
Health monitoring for production outsourcing platform
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any
from enum import Enum

import psutil
from sqlalchemy import text

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

class HealthChecker:
    def __init__(self):
        self.logger = logging.getLogger('uptime')
    
    async def check_database(self, db_session) -> Dict[str, Any]:
        """Check database health"""
        try:
            start_time = datetime.now()
            result = await db_session.execute(text("SELECT 1"))
            result.fetchone()
            response_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'status': HealthStatus.HEALTHY.value,
                'response_time': response_time,
                'message': 'Database is healthy'
            }
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY.value,
                'response_time': 0.0,
                'message': f'Database error: {str(e)}'
            }
    
    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resource health"""
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            issues = []
            if cpu_percent > 80:
                issues.append(f'High CPU: {cpu_percent:.1f}%')
            if memory.percent > 80:
                issues.append(f'High memory: {memory.percent:.1f}%')
            if (disk.used / disk.total) * 100 > 80:
                issues.append(f'High disk usage')
            
            if issues:
                status = HealthStatus.DEGRADED.value
                message = f'Resource issues: {"; ".join(issues)}'
            else:
                status = HealthStatus.HEALTHY.value
                message = 'System resources healthy'
            
            return {
                'status': status,
                'message': message,
                'details': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'disk_percent': (disk.used / disk.total) * 100
                }
            }
        except Exception as e:
            return {
                'status': HealthStatus.UNHEALTHY.value,
                'message': f'System check failed: {str(e)}'
            }
    
    async def get_health_status(self, db_session=None) -> Dict[str, Any]:
        """Get comprehensive health status"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'services': {}
        }
        
        # Check database if session provided
        if db_session:
            results['services']['database'] = await self.check_database(db_session)
        
        # Check system resources
        results['services']['system'] = self.check_system_resources()
        
        # Determine overall status
        overall_status = HealthStatus.HEALTHY
        for service_health in results['services'].values():
            if service_health['status'] == HealthStatus.UNHEALTHY.value:
                overall_status = HealthStatus.UNHEALTHY
                break
            elif service_health['status'] == HealthStatus.DEGRADED.value:
                overall_status = HealthStatus.DEGRADED
        
        results['overall_status'] = overall_status.value
        return results

# Global health checker
health_checker = HealthChecker() 