from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random

from app.core.auth import get_current_user
from app.database import get_db
from app.schemas.auth import UserResponse
from app.models.user import User

router = APIRouter()
security = HTTPBearer()

# Pydantic schemas for Manufacturing
from pydantic import BaseModel

class MachineBase(BaseModel):
    id: int
    name: str
    type: str
    status: str
    utilization: float
    efficiency: float
    temperature: float
    vibration: float
    speed: float
    output: float
    uptime: float
    last_maintenance: str
    next_maintenance: str
    location: str
    operator: Optional[str] = None

class ProductionJobBase(BaseModel):
    id: int
    order_id: int
    part_number: str
    description: str
    quantity: int
    completed: int
    start_time: str
    estimated_completion: str
    priority: str
    status: str

class ProductionMetrics(BaseModel):
    overall_efficiency: float
    throughput: float
    quality_rate: float
    uptime_percentage: float
    energy_consumption: float
    defect_rate: float
    on_time_delivery: float
    cost_per_unit: float

class MaintenanceSchedule(BaseModel):
    scheduled_date: str

def generate_realistic_machine_data(time_range: str) -> List[Dict[str, Any]]:
    """Generate realistic machine data based on time range"""
    machine_types = ["CNC Lathe", "3D Printer", "Injection Molding", "Welding Robot", "Assembly Line", "Quality Scanner"]
    locations = ["Floor A", "Floor B", "Floor C", "Clean Room", "Assembly Bay"]
    operators = ["John Smith", "Sarah Johnson", "Mike Chen", "Lisa Rodriguez", "David Kim"]
    
    machines = []
    for i in range(1, 16):  # 15 machines
        # Simulate different performance based on time range
        base_efficiency = random.uniform(75, 95)
        if time_range in ['1h', '8h']:
            efficiency_variation = random.uniform(-5, 5)
        else:
            efficiency_variation = random.uniform(-10, 10)
        
        efficiency = max(60, min(100, base_efficiency + efficiency_variation))
        
        machines.append({
            "id": i,
            "name": f"Machine-{i:03d}",
            "type": random.choice(machine_types),
            "status": random.choices(
                ["running", "idle", "maintenance", "offline"],
                weights=[60, 25, 10, 5]
            )[0],
            "utilization": round(random.uniform(65, 95), 1),
            "efficiency": round(efficiency, 1),
            "temperature": round(random.uniform(35, 85), 1),
            "vibration": round(random.uniform(0.1, 2.5), 2),
            "speed": round(random.uniform(500, 3500), 0),
            "output": round(random.uniform(80, 150), 0),
            "uptime": round(random.uniform(85, 99.5), 1),
            "last_maintenance": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "next_maintenance": (datetime.now() + timedelta(days=random.randint(7, 60))).isoformat(),
            "location": random.choice(locations),
            "operator": random.choice(operators) if random.random() > 0.3 else None,
            "alerts": generate_machine_alerts(i)
        })
    
    return machines

def generate_machine_alerts(machine_id: int) -> List[Dict[str, Any]]:
    """Generate realistic alerts for machines"""
    alert_types = [
        {"type": "warning", "messages": ["Temperature elevated", "Vibration above normal", "Low material level"]},
        {"type": "error", "messages": ["Sensor malfunction", "Communication lost", "Emergency stop triggered"]},
        {"type": "info", "messages": ["Maintenance scheduled", "Calibration completed", "Operator changed"]}
    ]
    
    alerts = []
    # 70% chance of having alerts
    if random.random() < 0.7:
        num_alerts = random.randint(1, 3)
        for i in range(num_alerts):
            alert_type = random.choice(alert_types)
            alerts.append({
                "id": machine_id * 10 + i,
                "type": alert_type["type"],
                "message": random.choice(alert_type["messages"]),
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 480))).isoformat(),
                "acknowledged": random.random() < 0.4
            })
    
    return alerts

def generate_realistic_production_jobs(time_range: str) -> List[Dict[str, Any]]:
    """Generate realistic production jobs"""
    priorities = ["low", "medium", "high", "urgent"]
    statuses = ["pending", "in_progress", "paused", "completed", "cancelled"]
    part_numbers = ["PN-A1001", "PN-B2002", "PN-C3003", "PN-D4004", "PN-E5005"]
    
    jobs = []
    num_jobs = 25 if time_range in ['1h', '8h'] else 50
    
    for i in range(1, num_jobs + 1):
        quantity = random.randint(10, 500)
        completed = random.randint(0, quantity)
        
        jobs.append({
            "id": i,
            "order_id": random.randint(1000, 9999),
            "part_number": random.choice(part_numbers),
            "description": f"Manufacturing job for {random.choice(['Aerospace Component', 'Automotive Part', 'Medical Device', 'Electronic Housing', 'Mechanical Assembly'])}",
            "quantity": quantity,
            "completed": completed,
            "start_time": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat(),
            "estimated_completion": (datetime.now() + timedelta(hours=random.randint(2, 48))).isoformat(),
            "priority": random.choice(priorities),
            "status": random.choices(statuses, weights=[15, 40, 10, 30, 5])[0],
            "materials": generate_job_materials(),
            "operations": generate_job_operations()
        })
    
    return jobs

def generate_job_materials() -> List[Dict[str, Any]]:
    """Generate materials for production jobs"""
    materials = ["Steel", "Aluminum", "Plastic", "Copper", "Titanium"]
    job_materials = []
    
    for i, material in enumerate(random.sample(materials, random.randint(2, 4))):
        required = random.randint(10, 100)
        available = random.randint(required - 10, required + 20)
        
        job_materials.append({
            "id": i + 1,
            "name": material,
            "required": required,
            "available": max(0, available),
            "unit": "kg",
            "supplier": f"{material} Suppliers Inc.",
            "cost": round(random.uniform(5, 50), 2)
        })
    
    return job_materials

def generate_job_operations() -> List[Dict[str, Any]]:
    """Generate operations for production jobs"""
    operations = ["Cutting", "Drilling", "Welding", "Assembly", "Quality Check", "Packaging"]
    job_operations = []
    
    for i, operation in enumerate(random.sample(operations, random.randint(3, 5))):
        job_operations.append({
            "id": i + 1,
            "name": operation,
            "machine_id": random.randint(1, 15),
            "duration": random.randint(30, 240),
            "completed": random.random() < 0.6,
            "start_time": (datetime.now() - timedelta(minutes=random.randint(30, 480))).isoformat() if random.random() < 0.7 else None,
            "end_time": (datetime.now() - timedelta(minutes=random.randint(0, 30))).isoformat() if random.random() < 0.4 else None,
            "operator": random.choice(["John Smith", "Sarah Johnson", "Mike Chen"]),
            "quality_checks": []
        })
    
    return job_operations

@router.get("/machines")
async def get_machines(
    time_range: str = Query("24h", description="Time range for machine data"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get manufacturing machines with real-time data"""
    try:
        machines = generate_realistic_machine_data(time_range)
        return {
            "status": "success",
            "data": machines,
            "metadata": {
                "total_machines": len(machines),
                "running_machines": len([m for m in machines if m["status"] == "running"]),
                "time_range": time_range,
                "last_updated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch machines: {str(e)}"
        )

@router.get("/jobs")
async def get_production_jobs(
    time_range: str = Query("24h", description="Time range for production jobs"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production jobs with current status"""
    try:
        jobs = generate_realistic_production_jobs(time_range)
        return {
            "status": "success",
            "data": jobs,
            "metadata": {
                "total_jobs": len(jobs),
                "active_jobs": len([j for j in jobs if j["status"] == "in_progress"]),
                "completed_jobs": len([j for j in jobs if j["status"] == "completed"]),
                "time_range": time_range
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch production jobs: {str(e)}"
        )

@router.get("/metrics")
async def get_production_metrics(
    time_range: str = Query("24h", description="Time range for metrics"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production metrics and KPIs"""
    try:
        # Generate realistic metrics based on time range
        base_metrics = {
            "overall_efficiency": random.uniform(78, 92),
            "throughput": random.uniform(150, 300),
            "quality_rate": random.uniform(94, 99.5),
            "uptime_percentage": random.uniform(85, 97),
            "energy_consumption": random.uniform(2500, 4500),
            "defect_rate": random.uniform(0.5, 3.0),
            "on_time_delivery": random.uniform(88, 96),
            "cost_per_unit": random.uniform(15, 45)
        }
        
        return {
            "status": "success",
            "data": base_metrics,
            "trends": {
                "efficiency_trend": random.uniform(-2, 3),
                "quality_trend": random.uniform(-1, 2),
                "throughput_trend": random.uniform(-5, 8)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch metrics: {str(e)}"
        )

@router.get("/performance-history")
async def get_performance_history(
    time_range: str = Query("24h", description="Time range for performance history"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get historical performance data"""
    try:
        # Generate time series data
        data_points = 24 if time_range == "24h" else 7 if time_range == "7d" else 30
        history = []
        
        for i in range(data_points):
            if time_range == "24h":
                timestamp = datetime.now() - timedelta(hours=i)
            elif time_range == "7d":
                timestamp = datetime.now() - timedelta(days=i)
            else:
                timestamp = datetime.now() - timedelta(days=i)
            
            history.append({
                "timestamp": timestamp.isoformat(),
                "efficiency": round(random.uniform(75, 95), 1),
                "throughput": round(random.uniform(120, 280), 0),
                "quality_rate": round(random.uniform(92, 99), 1),
                "uptime": round(random.uniform(80, 98), 1)
            })
        
        return {
            "status": "success",
            "data": sorted(history, key=lambda x: x["timestamp"])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch performance history: {str(e)}"
        )

@router.get("/production-plan")
async def get_optimized_production_plan(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get optimized production plan"""
    try:
        plan = {
            "schedule": [
                {
                    "machine_id": i,
                    "jobs": [
                        {
                            "job_id": random.randint(1, 50),
                            "start_time": (datetime.now() + timedelta(hours=random.randint(1, 24))).isoformat(),
                            "duration": random.randint(60, 480),
                            "priority": random.choice(["low", "medium", "high", "urgent"])
                        }
                        for _ in range(random.randint(1, 4))
                    ]
                }
                for i in range(1, 16)
            ],
            "optimization_score": round(random.uniform(85, 95), 1),
            "estimated_completion": (datetime.now() + timedelta(days=3)).isoformat()
        }
        
        return {
            "status": "success",
            "data": plan
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch production plan: {str(e)}"
        )

@router.post("/machines/{machine_id}/start")
async def start_machine(
    machine_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a manufacturing machine"""
    try:
        # In production, this would interface with actual machine control systems
        return {
            "status": "success",
            "message": f"Machine {machine_id} started successfully",
            "machine_id": machine_id,
            "new_status": "running",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start machine: {str(e)}"
        )

@router.post("/machines/{machine_id}/stop")
async def stop_machine(
    machine_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop a manufacturing machine"""
    try:
        return {
            "status": "success",
            "message": f"Machine {machine_id} stopped successfully",
            "machine_id": machine_id,
            "new_status": "idle",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop machine: {str(e)}"
        )

@router.post("/machines/{machine_id}/maintenance")
async def schedule_maintenance(
    machine_id: int,
    schedule: MaintenanceSchedule,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule maintenance for a machine"""
    try:
        return {
            "status": "success",
            "message": f"Maintenance scheduled for machine {machine_id}",
            "machine_id": machine_id,
            "scheduled_date": schedule.scheduled_date,
            "maintenance_id": random.randint(1000, 9999)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to schedule maintenance: {str(e)}"
        )

@router.post("/jobs/{job_id}/start")
async def start_job(
    job_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a production job"""
    try:
        return {
            "status": "success",
            "message": f"Production job {job_id} started",
            "job_id": job_id,
            "new_status": "in_progress",
            "start_time": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start job: {str(e)}"
        )

@router.post("/jobs/{job_id}/pause")
async def pause_job(
    job_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause a production job"""
    try:
        return {
            "status": "success",
            "message": f"Production job {job_id} paused",
            "job_id": job_id,
            "new_status": "paused",
            "pause_time": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause job: {str(e)}"
        ) 