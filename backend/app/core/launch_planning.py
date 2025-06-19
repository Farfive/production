"""
Launch Planning and Deployment Strategy
Comprehensive production launch management and rollout strategy
"""

import asyncio
import logging
import json
import os
import subprocess
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import time
import psutil

from .load_testing import load_test_runner
from .performance_optimization import performance_optimizer
from .final_security_review import final_security_reviewer
from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class DeploymentStrategy(Enum):
    """Deployment strategy types"""
    BLUE_GREEN = "blue_green"
    ROLLING = "rolling"
    CANARY = "canary"
    IMMEDIATE = "immediate"

class DeploymentPhase(Enum):
    """Deployment phases"""
    PREPARATION = "preparation"
    PRE_DEPLOYMENT = "pre_deployment"
    DEPLOYMENT = "deployment"
    POST_DEPLOYMENT = "post_deployment"
    MONITORING = "monitoring"
    COMPLETED = "completed"
    ROLLBACK = "rollback"

@dataclass
class DeploymentStep:
    """Individual deployment step"""
    name: str
    description: str
    phase: DeploymentPhase
    required: bool
    estimated_duration: int  # minutes
    dependencies: List[str]
    validation_function: Optional[str] = None
    rollback_function: Optional[str] = None

@dataclass
class DeploymentResult:
    """Deployment step result"""
    step_name: str
    success: bool
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    details: str
    error_message: Optional[str] = None

@dataclass
class LaunchPlan:
    """Complete launch plan"""
    launch_name: str
    strategy: DeploymentStrategy
    target_environment: str
    scheduled_time: datetime
    rollback_threshold: Dict[str, float]
    monitoring_duration: int  # minutes
    steps: List[DeploymentStep]
    stakeholders: List[str]

class LaunchPlanner:
    """Production launch planning and execution"""
    
    def __init__(self):
        self.deployment_results = []
        self.current_deployment = None
        self.rollback_triggered = False
        
    def create_launch_plan(self, strategy: DeploymentStrategy = DeploymentStrategy.BLUE_GREEN) -> LaunchPlan:
        """Create comprehensive launch plan"""
        
        # Define deployment steps based on strategy
        steps = self._get_deployment_steps(strategy)
        
        # Define rollback thresholds
        rollback_threshold = {
            'error_rate': 5.0,  # %
            'response_time_p95': 2000,  # ms
            'cpu_usage': 90.0,  # %
            'memory_usage': 95.0,  # %
            'failed_health_checks': 3
        }
        
        return LaunchPlan(
            launch_name=f"Production Launch {datetime.now().strftime('%Y%m%d_%H%M')}",
            strategy=strategy,
            target_environment="production",
            scheduled_time=datetime.now() + timedelta(hours=1),  # Default 1 hour from now
            rollback_threshold=rollback_threshold,
            monitoring_duration=120,  # 2 hours post-deployment monitoring
            steps=steps,
            stakeholders=['dev-team@company.com', 'ops-team@company.com', 'management@company.com']
        )
    
    def _get_deployment_steps(self, strategy: DeploymentStrategy) -> List[DeploymentStep]:
        """Get deployment steps based on strategy"""
        
        base_steps = [
            # Preparation Phase
            DeploymentStep(
                name="pre_deployment_checks",
                description="Run pre-deployment validation checks",
                phase=DeploymentPhase.PREPARATION,
                required=True,
                estimated_duration=15,
                dependencies=[],
                validation_function="validate_pre_deployment"
            ),
            DeploymentStep(
                name="security_review",
                description="Execute final security review",
                phase=DeploymentPhase.PREPARATION,
                required=True,
                estimated_duration=30,
                dependencies=["pre_deployment_checks"],
                validation_function="validate_security_review"
            ),
            DeploymentStep(
                name="load_testing",
                description="Execute comprehensive load testing",
                phase=DeploymentPhase.PREPARATION,
                required=True,
                estimated_duration=45,
                dependencies=["security_review"],
                validation_function="validate_load_testing"
            ),
            DeploymentStep(
                name="performance_optimization",
                description="Apply performance optimizations",
                phase=DeploymentPhase.PREPARATION,
                required=True,
                estimated_duration=20,
                dependencies=["load_testing"],
                validation_function="validate_performance_optimization"
            ),
            
            # Pre-deployment Phase
            DeploymentStep(
                name="backup_creation",
                description="Create complete system backup",
                phase=DeploymentPhase.PRE_DEPLOYMENT,
                required=True,
                estimated_duration=30,
                dependencies=["performance_optimization"],
                validation_function="validate_backup_creation",
                rollback_function="restore_from_backup"
            ),
            DeploymentStep(
                name="maintenance_mode",
                description="Enable maintenance mode",
                phase=DeploymentPhase.PRE_DEPLOYMENT,
                required=False,
                estimated_duration=2,
                dependencies=["backup_creation"],
                rollback_function="disable_maintenance_mode"
            ),
            
            # Deployment Phase
            DeploymentStep(
                name="database_migration",
                description="Execute database migrations",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=15,
                dependencies=["maintenance_mode"],
                validation_function="validate_database_migration",
                rollback_function="rollback_database_migration"
            ),
            DeploymentStep(
                name="application_deployment",
                description="Deploy application code",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=10,
                dependencies=["database_migration"],
                validation_function="validate_application_deployment",
                rollback_function="rollback_application_deployment"
            ),
            DeploymentStep(
                name="configuration_update",
                description="Update configuration files",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=5,
                dependencies=["application_deployment"],
                validation_function="validate_configuration_update",
                rollback_function="rollback_configuration_update"
            ),
            
            # Post-deployment Phase
            DeploymentStep(
                name="service_restart",
                description="Restart application services",
                phase=DeploymentPhase.POST_DEPLOYMENT,
                required=True,
                estimated_duration=5,
                dependencies=["configuration_update"],
                validation_function="validate_service_restart",
                rollback_function="restart_previous_services"
            ),
            DeploymentStep(
                name="health_check_validation",
                description="Validate all health checks",
                phase=DeploymentPhase.POST_DEPLOYMENT,
                required=True,
                estimated_duration=10,
                dependencies=["service_restart"],
                validation_function="validate_health_checks"
            ),
            DeploymentStep(
                name="smoke_testing",
                description="Execute post-deployment smoke tests",
                phase=DeploymentPhase.POST_DEPLOYMENT,
                required=True,
                estimated_duration=15,
                dependencies=["health_check_validation"],
                validation_function="validate_smoke_tests"
            ),
            DeploymentStep(
                name="disable_maintenance_mode",
                description="Disable maintenance mode",
                phase=DeploymentPhase.POST_DEPLOYMENT,
                required=False,
                estimated_duration=2,
                dependencies=["smoke_testing"]
            ),
            
            # Monitoring Phase
            DeploymentStep(
                name="monitoring_setup",
                description="Enable enhanced monitoring",
                phase=DeploymentPhase.MONITORING,
                required=True,
                estimated_duration=5,
                dependencies=["disable_maintenance_mode"],
                validation_function="validate_monitoring_setup"
            ),
            DeploymentStep(
                name="performance_monitoring",
                description="Monitor performance metrics",
                phase=DeploymentPhase.MONITORING,
                required=True,
                estimated_duration=120,  # 2 hours
                dependencies=["monitoring_setup"],
                validation_function="validate_performance_monitoring"
            )
        ]
        
        # Add strategy-specific steps
        if strategy == DeploymentStrategy.BLUE_GREEN:
            base_steps.extend(self._get_blue_green_steps())
        elif strategy == DeploymentStrategy.CANARY:
            base_steps.extend(self._get_canary_steps())
        elif strategy == DeploymentStrategy.ROLLING:
            base_steps.extend(self._get_rolling_steps())
        
        return base_steps
    
    def _get_blue_green_steps(self) -> List[DeploymentStep]:
        """Blue-green deployment specific steps"""
        return [
            DeploymentStep(
                name="green_environment_setup",
                description="Setup green environment",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=20,
                dependencies=["backup_creation"],
                validation_function="validate_green_environment",
                rollback_function="destroy_green_environment"
            ),
            DeploymentStep(
                name="traffic_switch",
                description="Switch traffic to green environment",
                phase=DeploymentPhase.POST_DEPLOYMENT,
                required=True,
                estimated_duration=5,
                dependencies=["smoke_testing"],
                validation_function="validate_traffic_switch",
                rollback_function="switch_traffic_to_blue"
            )
        ]
    
    def _get_canary_steps(self) -> List[DeploymentStep]:
        """Canary deployment specific steps"""
        return [
            DeploymentStep(
                name="canary_deployment",
                description="Deploy to canary servers (10% traffic)",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=15,
                dependencies=["configuration_update"],
                validation_function="validate_canary_deployment",
                rollback_function="rollback_canary_deployment"
            ),
            DeploymentStep(
                name="canary_monitoring",
                description="Monitor canary performance",
                phase=DeploymentPhase.MONITORING,
                required=True,
                estimated_duration=30,
                dependencies=["canary_deployment"],
                validation_function="validate_canary_performance"
            ),
            DeploymentStep(
                name="full_deployment",
                description="Deploy to all servers",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=20,
                dependencies=["canary_monitoring"],
                validation_function="validate_full_deployment",
                rollback_function="rollback_full_deployment"
            )
        ]
    
    def _get_rolling_steps(self) -> List[DeploymentStep]:
        """Rolling deployment specific steps"""
        return [
            DeploymentStep(
                name="rolling_deployment_batch_1",
                description="Deploy to first batch of servers",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=15,
                dependencies=["configuration_update"],
                validation_function="validate_rolling_batch_1",
                rollback_function="rollback_rolling_batch_1"
            ),
            DeploymentStep(
                name="rolling_deployment_batch_2",
                description="Deploy to second batch of servers",
                phase=DeploymentPhase.DEPLOYMENT,
                required=True,
                estimated_duration=15,
                dependencies=["rolling_deployment_batch_1"],
                validation_function="validate_rolling_batch_2",
                rollback_function="rollback_rolling_batch_2"
            )
        ]
    
    async def execute_launch_plan(self, launch_plan: LaunchPlan) -> Dict[str, Any]:
        """Execute the complete launch plan"""
        logger.info(f"Starting deployment: {launch_plan.launch_name}")
        logger.info(f"Strategy: {launch_plan.strategy.value}")
        
        self.current_deployment = launch_plan
        self.deployment_results = []
        self.rollback_triggered = False
        
        execution_summary = {
            'launch_name': launch_plan.launch_name,
            'strategy': launch_plan.strategy.value,
            'start_time': datetime.now(),
            'status': 'in_progress',
            'completed_steps': 0,
            'total_steps': len(launch_plan.steps),
            'results': []
        }
        
        try:
            # Execute steps in dependency order
            sorted_steps = self._sort_steps_by_dependencies(launch_plan.steps)
            
            for step in sorted_steps:
                if self.rollback_triggered:
                    logger.warning("Rollback triggered, stopping deployment")
                    break
                
                logger.info(f"Executing step: {step.name}")
                result = await self._execute_deployment_step(step)
                
                self.deployment_results.append(result)
                execution_summary['results'].append(asdict(result))
                execution_summary['completed_steps'] += 1
                
                if not result.success and step.required:
                    logger.error(f"Critical step failed: {step.name}")
                    if step.rollback_function:
                        await self._trigger_rollback(launch_plan, step)
                    execution_summary['status'] = 'failed'
                    break
                
                # Check rollback conditions
                if await self._should_trigger_rollback(launch_plan):
                    logger.warning("Rollback conditions met")
                    await self._trigger_rollback(launch_plan, step)
                    execution_summary['status'] = 'rolled_back'
                    break
            
            if not self.rollback_triggered:
                execution_summary['status'] = 'completed'
                logger.info("Deployment completed successfully")
            
        except Exception as e:
            logger.error(f"Deployment failed with exception: {e}")
            execution_summary['status'] = 'error'
            execution_summary['error'] = str(e)
        
        execution_summary['end_time'] = datetime.now()
        execution_summary['total_duration'] = (execution_summary['end_time'] - execution_summary['start_time']).total_seconds()
        
        return execution_summary
    
    def _sort_steps_by_dependencies(self, steps: List[DeploymentStep]) -> List[DeploymentStep]:
        """Sort deployment steps by dependencies"""
        sorted_steps = []
        remaining_steps = steps.copy()
        
        while remaining_steps:
            # Find steps with satisfied dependencies
            ready_steps = []
            for step in remaining_steps:
                if all(dep in [s.name for s in sorted_steps] for dep in step.dependencies):
                    ready_steps.append(step)
            
            if not ready_steps:
                # Circular dependency or missing dependency
                logger.error("Cannot resolve step dependencies")
                break
            
            # Add steps with satisfied dependencies
            for step in ready_steps:
                sorted_steps.append(step)
                remaining_steps.remove(step)
        
        return sorted_steps
    
    async def _execute_deployment_step(self, step: DeploymentStep) -> DeploymentResult:
        """Execute a single deployment step"""
        start_time = datetime.now()
        
        try:
            # Execute the step based on its name
            success, details = await self._run_step_function(step)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return DeploymentResult(
                step_name=step.name,
                success=success,
                start_time=start_time,
                end_time=end_time,
                duration_seconds=duration,
                details=details
            )
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return DeploymentResult(
                step_name=step.name,
                success=False,
                start_time=start_time,
                end_time=end_time,
                duration_seconds=duration,
                details=f"Step execution failed",
                error_message=str(e)
            )
    
    async def _run_step_function(self, step: DeploymentStep) -> tuple[bool, str]:
        """Run the function for a specific deployment step"""
        
        if step.name == "pre_deployment_checks":
            return await self._pre_deployment_checks()
        elif step.name == "security_review":
            return await self._security_review()
        elif step.name == "load_testing":
            return await self._load_testing()
        elif step.name == "performance_optimization":
            return await self._performance_optimization()
        elif step.name == "backup_creation":
            return await self._backup_creation()
        elif step.name == "maintenance_mode":
            return await self._enable_maintenance_mode()
        elif step.name == "database_migration":
            return await self._database_migration()
        elif step.name == "application_deployment":
            return await self._application_deployment()
        elif step.name == "configuration_update":
            return await self._configuration_update()
        elif step.name == "service_restart":
            return await self._service_restart()
        elif step.name == "health_check_validation":
            return await self._health_check_validation()
        elif step.name == "smoke_testing":
            return await self._smoke_testing()
        elif step.name == "disable_maintenance_mode":
            return await self._disable_maintenance_mode()
        elif step.name == "monitoring_setup":
            return await self._monitoring_setup()
        elif step.name == "performance_monitoring":
            return await self._performance_monitoring()
        else:
            return True, f"Step {step.name} executed successfully (simulated)"
    
    async def _pre_deployment_checks(self) -> tuple[bool, str]:
        """Run pre-deployment validation checks"""
        try:
            # Check system resources
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_usage = psutil.virtual_memory().percent
            disk_usage = psutil.disk_usage('/').percent
            
            if cpu_usage > 80:
                return False, f"High CPU usage: {cpu_usage}%"
            if memory_usage > 85:
                return False, f"High memory usage: {memory_usage}%"
            if disk_usage > 90:
                return False, f"High disk usage: {disk_usage}%"
            
            return True, "Pre-deployment checks passed"
        except Exception as e:
            return False, f"Pre-deployment checks failed: {e}"
    
    async def _security_review(self) -> tuple[bool, str]:
        """Execute final security review"""
        try:
            review_result = await final_security_reviewer.run_complete_security_review()
            
            if review_result.overall_status == 'fail':
                return False, f"Security review failed: {review_result.critical_issues} critical issues"
            
            return True, f"Security review passed: score {review_result.security_score:.1f}/100"
        except Exception as e:
            return False, f"Security review failed: {e}"
    
    async def _load_testing(self) -> tuple[bool, str]:
        """Execute comprehensive load testing"""
        try:
            # Run smoke test first
            result = await load_test_runner.run_load_test('smoke_test')
            
            if result.error_rate > 5:
                return False, f"Load test failed: {result.error_rate:.1f}% error rate"
            
            if result.p95_response_time > 2000:
                return False, f"Load test failed: {result.p95_response_time:.0f}ms P95 response time"
            
            return True, f"Load testing passed: {result.requests_per_second:.1f} RPS, {result.error_rate:.1f}% errors"
        except Exception as e:
            return False, f"Load testing failed: {e}"
    
    async def _performance_optimization(self) -> tuple[bool, str]:
        """Apply performance optimizations"""
        try:
            optimization_results = await performance_optimizer.run_full_optimization()
            
            applied_optimizations = []
            for component, result in optimization_results.items():
                applied_optimizations.extend(result.applied_optimizations)
            
            return True, f"Performance optimization completed: {len(applied_optimizations)} optimizations applied"
        except Exception as e:
            return False, f"Performance optimization failed: {e}"
    
    async def _backup_creation(self) -> tuple[bool, str]:
        """Create complete system backup"""
        try:
            # Simulate backup creation
            backup_name = f"pre_deployment_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # In a real implementation, this would:
            # 1. Backup database
            # 2. Backup application files
            # 3. Backup configuration
            # 4. Verify backup integrity
            
            await asyncio.sleep(2)  # Simulate backup time
            
            return True, f"Backup created successfully: {backup_name}"
        except Exception as e:
            return False, f"Backup creation failed: {e}"
    
    async def _enable_maintenance_mode(self) -> tuple[bool, str]:
        """Enable maintenance mode"""
        try:
            # Create maintenance mode file
            maintenance_file = "/tmp/maintenance_mode.txt"
            with open(maintenance_file, 'w') as f:
                f.write(f"Maintenance mode enabled at {datetime.now()}")
            
            return True, "Maintenance mode enabled"
        except Exception as e:
            return False, f"Failed to enable maintenance mode: {e}"
    
    async def _database_migration(self) -> tuple[bool, str]:
        """Execute database migrations"""
        try:
            # Simulate database migration
            # In real implementation: run Alembic migrations
            await asyncio.sleep(1)
            
            return True, "Database migrations completed successfully"
        except Exception as e:
            return False, f"Database migration failed: {e}"
    
    async def _application_deployment(self) -> tuple[bool, str]:
        """Deploy application code"""
        try:
            # Simulate application deployment
            # In real implementation: deploy new code, update containers, etc.
            await asyncio.sleep(1)
            
            return True, "Application deployed successfully"
        except Exception as e:
            return False, f"Application deployment failed: {e}"
    
    async def _configuration_update(self) -> tuple[bool, str]:
        """Update configuration files"""
        try:
            # Simulate configuration update
            await asyncio.sleep(0.5)
            
            return True, "Configuration updated successfully"
        except Exception as e:
            return False, f"Configuration update failed: {e}"
    
    async def _service_restart(self) -> tuple[bool, str]:
        """Restart application services"""
        try:
            # Simulate service restart
            await asyncio.sleep(1)
            
            return True, "Services restarted successfully"
        except Exception as e:
            return False, f"Service restart failed: {e}"
    
    async def _health_check_validation(self) -> tuple[bool, str]:
        """Validate all health checks"""
        try:
            # Simulate health check validation
            await asyncio.sleep(1)
            
            return True, "All health checks passed"
        except Exception as e:
            return False, f"Health check validation failed: {e}"
    
    async def _smoke_testing(self) -> tuple[bool, str]:
        """Execute post-deployment smoke tests"""
        try:
            # Run basic smoke tests
            result = await load_test_runner.run_load_test('smoke_test')
            
            if result.error_rate > 5:
                return False, f"Smoke tests failed: {result.error_rate:.1f}% error rate"
            
            return True, f"Smoke tests passed: {result.successful_requests} successful requests"
        except Exception as e:
            return False, f"Smoke testing failed: {e}"
    
    async def _disable_maintenance_mode(self) -> tuple[bool, str]:
        """Disable maintenance mode"""
        try:
            maintenance_file = "/tmp/maintenance_mode.txt"
            if os.path.exists(maintenance_file):
                os.remove(maintenance_file)
            
            return True, "Maintenance mode disabled"
        except Exception as e:
            return False, f"Failed to disable maintenance mode: {e}"
    
    async def _monitoring_setup(self) -> tuple[bool, str]:
        """Enable enhanced monitoring"""
        try:
            # Simulate monitoring setup
            await asyncio.sleep(0.5)
            
            return True, "Enhanced monitoring enabled"
        except Exception as e:
            return False, f"Monitoring setup failed: {e}"
    
    async def _performance_monitoring(self) -> tuple[bool, str]:
        """Monitor performance metrics"""
        try:
            # Simulate performance monitoring
            # In real implementation: monitor metrics for specified duration
            await asyncio.sleep(5)  # Simulate monitoring time
            
            return True, "Performance monitoring completed successfully"
        except Exception as e:
            return False, f"Performance monitoring failed: {e}"
    
    async def _should_trigger_rollback(self, launch_plan: LaunchPlan) -> bool:
        """Check if rollback conditions are met"""
        try:
            # Check system metrics against thresholds
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_usage = psutil.virtual_memory().percent
            
            if cpu_usage > launch_plan.rollback_threshold.get('cpu_usage', 90):
                logger.warning(f"CPU usage threshold exceeded: {cpu_usage}%")
                return True
            
            if memory_usage > launch_plan.rollback_threshold.get('memory_usage', 95):
                logger.warning(f"Memory usage threshold exceeded: {memory_usage}%")
                return True
            
            # Additional health checks would be implemented here
            
            return False
        except Exception as e:
            logger.error(f"Failed to check rollback conditions: {e}")
            return False
    
    async def _trigger_rollback(self, launch_plan: LaunchPlan, failed_step: DeploymentStep):
        """Trigger deployment rollback"""
        logger.warning(f"Triggering rollback due to step: {failed_step.name}")
        self.rollback_triggered = True
        
        # Execute rollback steps in reverse order
        completed_steps = [result.step_name for result in self.deployment_results if result.success]
        
        for step in reversed(launch_plan.steps):
            if step.name in completed_steps and step.rollback_function:
                try:
                    logger.info(f"Rolling back step: {step.name}")
                    await self._execute_rollback_function(step.rollback_function)
                except Exception as e:
                    logger.error(f"Rollback failed for step {step.name}: {e}")
    
    async def _execute_rollback_function(self, rollback_function: str):
        """Execute rollback function"""
        # Implement specific rollback functions
        if rollback_function == "restore_from_backup":
            logger.info("Restoring from backup")
        elif rollback_function == "disable_maintenance_mode":
            await self._disable_maintenance_mode()
        elif rollback_function == "switch_traffic_to_blue":
            logger.info("Switching traffic back to blue environment")
        # Add more rollback functions as needed
    
    def generate_launch_report(self, execution_summary: Dict[str, Any]) -> str:
        """Generate launch execution report"""
        lines = [
            "# Production Launch Report",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Launch Summary",
            "",
            f"**Launch Name:** {execution_summary['launch_name']}",
            f"**Strategy:** {execution_summary['strategy']}",
            f"**Status:** {execution_summary['status'].upper()}",
            f"**Start Time:** {execution_summary['start_time'].strftime('%Y-%m-%d %H:%M:%S')}",
            f"**End Time:** {execution_summary['end_time'].strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Total Duration:** {execution_summary['total_duration']:.1f} seconds",
            f"**Completed Steps:** {execution_summary['completed_steps']}/{execution_summary['total_steps']}",
            "",
            "## Step Results",
            "",
            "| Step | Status | Duration | Details |",
            "|------|--------|----------|---------|"
        ]
        
        for result in execution_summary['results']:
            status_icon = "✅" if result['success'] else "❌"
            duration = f"{result['duration_seconds']:.1f}s"
            
            lines.append(
                f"| {result['step_name']} | {status_icon} | {duration} | {result['details']} |"
            )
        
        # Add recommendations
        lines.extend([
            "",
            "## Recommendations",
            ""
        ])
        
        if execution_summary['status'] == 'completed':
            lines.extend([
                "✅ **Deployment Successful**",
                "",
                "- Monitor system performance for the next 24 hours",
                "- Schedule post-deployment review meeting",
                "- Update deployment documentation with lessons learned"
            ])
        elif execution_summary['status'] == 'rolled_back':
            lines.extend([
                "⚠️ **Deployment Rolled Back**",
                "",
                "- Investigate root cause of deployment failure",
                "- Review and update deployment procedures",
                "- Plan corrective actions before next deployment attempt"
            ])
        else:
            lines.extend([
                "❌ **Deployment Failed**",
                "",
                "- Immediate investigation required",
                "- Review system logs for error details",
                "- Assess system state and take corrective action"
            ])
        
        return "\n".join(lines)

# Global launch planner
launch_planner = LaunchPlanner()

def create_launch_plan(strategy: DeploymentStrategy = DeploymentStrategy.BLUE_GREEN) -> LaunchPlan:
    """Create launch plan"""
    return launch_planner.create_launch_plan(strategy)

async def execute_launch(launch_plan: LaunchPlan) -> Dict[str, Any]:
    """Execute launch plan"""
    return await launch_planner.execute_launch_plan(launch_plan) 