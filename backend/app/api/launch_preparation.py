"""
Launch Preparation API Endpoints
API for load testing, performance optimization, security review, and launch planning
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

from ..core.load_testing import load_test_runner, run_load_test
from ..core.performance_optimization import performance_optimizer, analyze_performance, optimize_performance
from ..core.final_security_review import final_security_reviewer, run_final_security_review
from ..core.launch_planning import launch_planner, create_launch_plan, execute_launch, DeploymentStrategy
from ..core.auth import get_current_admin_user
from ..models.user import User

router = APIRouter()
security = HTTPBearer()

# Load Testing Endpoints

@router.get("/load-testing/scenarios")
async def get_load_test_scenarios(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available load test scenarios"""
    try:
        scenarios = {}
        for scenario_name, config in load_test_runner.test_configs.items():
            scenarios[scenario_name] = {
                'name': config.name,
                'duration_seconds': config.duration_seconds,
                'concurrent_users': config.concurrent_users,
                'ramp_up_seconds': config.ramp_up_seconds,
                'endpoints_count': len(config.endpoints)
            }
        
        return {
            'status': 'success',
            'scenarios': scenarios
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get load test scenarios: {e}")

@router.post("/load-testing/run/{scenario_name}")
async def run_load_test_scenario(
    scenario_name: str,
    background_tasks: BackgroundTasks,
    target_url: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Run a specific load test scenario"""
    try:
        if scenario_name not in load_test_runner.test_configs:
            raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario_name}")
        
        # Run load test in background
        background_tasks.add_task(run_load_test, scenario_name, target_url)
        
        return {
            'status': 'started',
            'message': f'Load test {scenario_name} started',
            'scenario': scenario_name,
            'target_url': target_url or 'default'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start load test: {e}")

@router.get("/load-testing/results")
async def get_load_test_results(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get load test results"""
    try:
        results = []
        for result in load_test_runner.results:
            results.append({
                'test_name': result.test_name,
                'start_time': result.start_time.isoformat(),
                'end_time': result.end_time.isoformat(),
                'total_requests': result.total_requests,
                'successful_requests': result.successful_requests,
                'failed_requests': result.failed_requests,
                'avg_response_time': result.avg_response_time,
                'p95_response_time': result.p95_response_time,
                'requests_per_second': result.requests_per_second,
                'error_rate': result.error_rate,
                'errors_count': len(result.errors)
            })
        
        return {
            'status': 'success',
            'results': results,
            'total_tests': len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get load test results: {e}")

@router.post("/load-testing/report")
async def generate_load_test_report(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Generate load test report"""
    try:
        results_dict = {}
        for result in load_test_runner.results:
            results_dict[result.test_name] = result
        
        report = load_test_runner.generate_report(results_dict)
        
        return {
            'status': 'success',
            'report': report,
            'generated_at': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {e}")

# Performance Optimization Endpoints

@router.get("/performance/analyze")
async def analyze_system_performance(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Analyze system performance metrics"""
    try:
        metrics = await analyze_performance()
        
        # Convert metrics to serializable format
        serialized_metrics = {}
        for name, metric in metrics.items():
            serialized_metrics[name] = {
                'name': metric.name,
                'value': metric.value,
                'unit': metric.unit,
                'threshold': metric.threshold,
                'status': metric.status,
                'timestamp': metric.timestamp.isoformat(),
                'recommendations': metric.recommendations
            }
        
        return {
            'status': 'success',
            'metrics': serialized_metrics,
            'analyzed_at': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Performance analysis failed: {e}")

@router.post("/performance/optimize")
async def optimize_system_performance(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Run performance optimization"""
    try:
        # Run optimization in background
        background_tasks.add_task(optimize_performance)
        
        return {
            'status': 'started',
            'message': 'Performance optimization started',
            'started_at': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Performance optimization failed: {e}")

@router.get("/performance/optimization-history")
async def get_optimization_history(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get performance optimization history"""
    try:
        history = []
        for result in performance_optimizer.optimization_history:
            history.append({
                'timestamp': result.get('timestamp', datetime.now()).isoformat(),
                'applied_optimizations': result.get('applied_optimizations', [])
            })
        
        return {
            'status': 'success',
            'history': history,
            'total_optimizations': len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get optimization history: {e}")

# Security Review Endpoints

@router.post("/security/final-review")
async def run_final_security_review_endpoint(
    background_tasks: BackgroundTasks,
    target_url: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Run final security review"""
    try:
        # Run security review in background
        background_tasks.add_task(run_final_security_review, target_url)
        
        return {
            'status': 'started',
            'message': 'Final security review started',
            'target_url': target_url or 'default',
            'started_at': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Security review failed: {e}")

@router.get("/security/review-results")
async def get_security_review_results(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get security review results"""
    try:
        results = []
        for result in final_security_reviewer.review_results:
            # Convert security review result to serializable format
            serialized_checks = []
            for check in result.checks:
                serialized_checks.append({
                    'check_name': check.check_name,
                    'passed': check.passed,
                    'severity': check.severity,
                    'details': check.details,
                    'recommendations': check.recommendations,
                    'timestamp': check.timestamp.isoformat()
                })
            
            results.append({
                'overall_status': result.overall_status,
                'total_checks': result.total_checks,
                'passed_checks': result.passed_checks,
                'failed_checks': result.failed_checks,
                'critical_issues': result.critical_issues,
                'security_score': result.security_score,
                'checks': serialized_checks,
                'recommendations': result.recommendations,
                'timestamp': result.timestamp.isoformat()
            })
        
        return {
            'status': 'success',
            'results': results,
            'total_reviews': len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get security review results: {e}")

@router.get("/security/compliance-status")
async def get_compliance_status(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get security compliance status"""
    try:
        # Get latest security review result
        if not final_security_reviewer.review_results:
            return {
                'status': 'no_data',
                'message': 'No security reviews have been run yet'
            }
        
        latest_result = final_security_reviewer.review_results[-1]
        
        # Calculate compliance metrics
        compliance_score = latest_result.security_score
        launch_ready = latest_result.overall_status in ['pass', 'warning']
        
        return {
            'status': 'success',
            'compliance_score': compliance_score,
            'launch_ready': launch_ready,
            'overall_status': latest_result.overall_status,
            'critical_issues': latest_result.critical_issues,
            'last_review': latest_result.timestamp.isoformat(),
            'recommendations': latest_result.recommendations[:5]  # Top 5 recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance status: {e}")

# Launch Planning Endpoints

@router.post("/launch/create-plan")
async def create_launch_plan_endpoint(
    strategy: str = "blue_green",
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Create a launch plan"""
    try:
        # Convert string to enum
        strategy_enum = DeploymentStrategy(strategy)
        
        # Create launch plan
        plan = create_launch_plan(strategy_enum)
        
        # Convert to serializable format
        serialized_steps = []
        for step in plan.steps:
            serialized_steps.append({
                'name': step.name,
                'description': step.description,
                'phase': step.phase.value,
                'required': step.required,
                'estimated_duration': step.estimated_duration,
                'dependencies': step.dependencies
            })
        
        return {
            'status': 'success',
            'plan': {
                'launch_name': plan.launch_name,
                'strategy': plan.strategy.value,
                'target_environment': plan.target_environment,
                'scheduled_time': plan.scheduled_time.isoformat(),
                'rollback_threshold': plan.rollback_threshold,
                'monitoring_duration': plan.monitoring_duration,
                'steps': serialized_steps,
                'stakeholders': plan.stakeholders,
                'total_steps': len(plan.steps),
                'estimated_total_duration': sum(step['estimated_duration'] for step in serialized_steps)
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {strategy}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create launch plan: {e}")

@router.post("/launch/execute")
async def execute_launch_plan_endpoint(
    plan_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Execute a launch plan"""
    try:
        # For simplicity, create a default plan and execute it
        strategy = DeploymentStrategy(plan_data.get('strategy', 'blue_green'))
        plan = create_launch_plan(strategy)
        
        # Execute launch in background
        background_tasks.add_task(execute_launch, plan)
        
        return {
            'status': 'started',
            'message': f'Launch execution started: {plan.launch_name}',
            'launch_name': plan.launch_name,
            'strategy': plan.strategy.value,
            'started_at': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute launch plan: {e}")

@router.get("/launch/deployment-status")
async def get_deployment_status(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get current deployment status"""
    try:
        if not launch_planner.deployment_results:
            return {
                'status': 'no_deployments',
                'message': 'No deployments have been executed yet'
            }
        
        # Get latest deployment results
        latest_results = []
        for result in launch_planner.deployment_results[-10:]:  # Last 10 results
            latest_results.append({
                'step_name': result.step_name,
                'success': result.success,
                'start_time': result.start_time.isoformat(),
                'end_time': result.end_time.isoformat(),
                'duration_seconds': result.duration_seconds,
                'details': result.details,
                'error_message': result.error_message
            })
        
        # Calculate overall status
        successful_steps = sum(1 for result in latest_results if result['success'])
        total_steps = len(latest_results)
        success_rate = (successful_steps / total_steps * 100) if total_steps > 0 else 0
        
        return {
            'status': 'success',
            'deployment_results': latest_results,
            'success_rate': success_rate,
            'total_steps': total_steps,
            'successful_steps': successful_steps,
            'current_deployment': launch_planner.current_deployment.launch_name if launch_planner.current_deployment else None,
            'rollback_triggered': launch_planner.rollback_triggered
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deployment status: {e}")

@router.get("/launch/readiness-check")
async def launch_readiness_check(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Check launch readiness status"""
    try:
        readiness_checks = {
            'load_testing': False,
            'performance_optimization': False,
            'security_review': False,
            'system_resources': False
        }
        
        readiness_details = {}
        
        # Check load testing status
        if load_test_runner.results:
            latest_load_test = load_test_runner.results[-1]
            readiness_checks['load_testing'] = latest_load_test.error_rate < 5 and latest_load_test.p95_response_time < 2000
            readiness_details['load_testing'] = {
                'last_test': latest_load_test.test_name,
                'error_rate': latest_load_test.error_rate,
                'p95_response_time': latest_load_test.p95_response_time
            }
        
        # Check performance optimization
        if performance_optimizer.optimization_history:
            readiness_checks['performance_optimization'] = True
            readiness_details['performance_optimization'] = {
                'last_optimization': performance_optimizer.optimization_history[-1].get('timestamp', datetime.now()).isoformat(),
                'optimizations_applied': len(performance_optimizer.optimization_history)
            }
        
        # Check security review
        if final_security_reviewer.review_results:
            latest_security = final_security_reviewer.review_results[-1]
            readiness_checks['security_review'] = latest_security.overall_status != 'fail'
            readiness_details['security_review'] = {
                'overall_status': latest_security.overall_status,
                'security_score': latest_security.security_score,
                'critical_issues': latest_security.critical_issues
            }
        
        # Check system resources
        try:
            import psutil
            cpu_usage = psutil.cpu_percent(interval=1)
            memory_usage = psutil.virtual_memory().percent
            disk_usage = psutil.disk_usage('/').percent
            
            readiness_checks['system_resources'] = cpu_usage < 80 and memory_usage < 85 and disk_usage < 90
            readiness_details['system_resources'] = {
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'disk_usage': disk_usage
            }
        except Exception:
            readiness_checks['system_resources'] = False
        
        # Calculate overall readiness
        readiness_score = sum(readiness_checks.values()) / len(readiness_checks) * 100
        launch_ready = all(readiness_checks.values())
        
        return {
            'status': 'success',
            'launch_ready': launch_ready,
            'readiness_score': readiness_score,
            'checks': readiness_checks,
            'details': readiness_details,
            'recommendations': [
                'Complete load testing' if not readiness_checks['load_testing'] else None,
                'Run performance optimization' if not readiness_checks['performance_optimization'] else None,
                'Complete security review' if not readiness_checks['security_review'] else None,
                'Ensure adequate system resources' if not readiness_checks['system_resources'] else None
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check launch readiness: {e}")

@router.get("/launch/strategies")
async def get_deployment_strategies(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """Get available deployment strategies"""
    try:
        strategies = {}
        for strategy in DeploymentStrategy:
            strategies[strategy.value] = {
                'name': strategy.value.replace('_', ' ').title(),
                'description': f'{strategy.value.replace("_", " ").title()} deployment strategy'
            }
        
        return {
            'status': 'success',
            'strategies': strategies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get deployment strategies: {e}") 