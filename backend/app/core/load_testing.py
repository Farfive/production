"""
Load Testing and Performance Validation Framework
"""

import asyncio
import aiohttp
import time
import logging
import statistics
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import psutil

logger = logging.getLogger(__name__)

@dataclass
class LoadTestConfig:
    """Load test configuration"""
    name: str
    base_url: str
    duration_seconds: int
    concurrent_users: int
    ramp_up_seconds: int
    endpoints: List[Dict[str, Any]]
    think_time_seconds: float = 1.0

@dataclass
class LoadTestResult:
    """Load test result metrics"""
    test_name: str
    start_time: datetime
    end_time: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    p95_response_time: float
    requests_per_second: float
    error_rate: float
    errors: List[Dict[str, Any]]

class LoadTestRunner:
    """Load testing framework"""
    
    def __init__(self):
        self.results = []
        self.test_configs = self._define_test_scenarios()
    
    def _define_test_scenarios(self) -> Dict[str, LoadTestConfig]:
        """Define load test scenarios"""
        base_url = '/api/v1'
        
        return {
            'smoke_test': LoadTestConfig(
                name='Smoke Test',
                base_url=base_url,
                duration_seconds=60,
                concurrent_users=5,
                ramp_up_seconds=10,
                endpoints=[
                    {'method': 'GET', 'path': '/health', 'weight': 1.0},
                    {'method': 'GET', 'path': '/manufacturers', 'weight': 0.8}
                ]
            ),
            'normal_load': LoadTestConfig(
                name='Normal Load Test',
                base_url=base_url,
                duration_seconds=300,
                concurrent_users=50,
                ramp_up_seconds=60,
                endpoints=[
                    {'method': 'GET', 'path': '/health', 'weight': 1.0},
                    {'method': 'GET', 'path': '/manufacturers', 'weight': 0.8},
                    {'method': 'GET', 'path': '/quotes', 'weight': 0.6}
                ]
            ),
            'peak_load': LoadTestConfig(
                name='Peak Load Test',
                base_url=base_url,
                duration_seconds=600,
                concurrent_users=200,
                ramp_up_seconds=120,
                endpoints=[
                    {'method': 'GET', 'path': '/health', 'weight': 1.0},
                    {'method': 'GET', 'path': '/manufacturers', 'weight': 0.9},
                    {'method': 'GET', 'path': '/quotes', 'weight': 0.8}
                ]
            )
        }
    
    async def run_load_test(self, test_name: str, target_url: str = None) -> LoadTestResult:
        """Run load test scenario"""
        if test_name not in self.test_configs:
            raise ValueError(f"Unknown test scenario: {test_name}")
        
        config = self.test_configs[test_name]
        if target_url:
            config.base_url = target_url
        
        logger.info(f"Starting load test: {config.name}")
        start_time = datetime.now()
        
        response_times = []
        errors = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(config.concurrent_users):
                delay = i / (config.concurrent_users / config.ramp_up_seconds) if config.ramp_up_seconds > 0 else 0
                task = asyncio.create_task(
                    self._simulate_user(session, config, delay, start_time, response_times, errors)
                )
                tasks.append(task)
            
            await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        successful_requests = len([rt for rt in response_times if rt > 0])
        failed_requests = len(errors)
        total_requests = successful_requests + failed_requests
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
        else:
            avg_response_time = p95_response_time = 0
        
        requests_per_second = total_requests / duration if duration > 0 else 0
        error_rate = (failed_requests / total_requests * 100) if total_requests > 0 else 0
        
        result = LoadTestResult(
            test_name=config.name,
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            requests_per_second=requests_per_second,
            error_rate=error_rate,
            errors=errors
        )
        
        self.results.append(result)
        logger.info(f"Load test completed: {config.name}")
        
        return result
    
    async def _simulate_user(self, session: aiohttp.ClientSession, config: LoadTestConfig, 
                           delay: float, start_time: datetime, response_times: List[float], 
                           errors: List[Dict[str, Any]]):
        """Simulate single user behavior"""
        await asyncio.sleep(delay)
        
        end_time = start_time + timedelta(seconds=config.duration_seconds)
        
        while datetime.now() < end_time:
            endpoint = self._select_endpoint(config.endpoints)
            
            try:
                request_start = time.time()
                
                async with session.request(
                    method=endpoint['method'],
                    url=f"{config.base_url}{endpoint['path']}"
                ) as response:
                    await response.read()
                    request_time = (time.time() - request_start) * 1000
                    response_times.append(request_time)
                    
                    if response.status >= 400:
                        errors.append({
                            'endpoint': endpoint['path'],
                            'status': response.status,
                            'timestamp': datetime.now().isoformat()
                        })
            
            except Exception as e:
                errors.append({
                    'endpoint': endpoint['path'],
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })
            
            if config.think_time_seconds > 0:
                await asyncio.sleep(config.think_time_seconds)
    
    def _select_endpoint(self, endpoints: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Select endpoint based on weight"""
        import random
        return random.choice(endpoints)
    
    def generate_report(self, results: Dict[str, LoadTestResult]) -> str:
        """Generate load test report"""
        lines = [
            "# Load Testing Report",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Summary",
            "",
            "| Test | RPS | Avg Response (ms) | P95 (ms) | Error Rate |",
            "|------|-----|-------------------|----------|------------|"
        ]
        
        for test_name, result in results.items():
            lines.append(
                f"| {result.test_name} | {result.requests_per_second:.1f} | "
                f"{result.avg_response_time:.0f} | {result.p95_response_time:.0f} | "
                f"{result.error_rate:.1f}% |"
            )
        
        return "\n".join(lines)

# Global instance
load_test_runner = LoadTestRunner()

async def run_load_test(test_name: str, target_url: str = None) -> LoadTestResult:
    """Run load test"""
    return await load_test_runner.run_load_test(test_name, target_url) 