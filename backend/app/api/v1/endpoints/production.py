from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.producer import Manufacturer
from app.models.quote import Quote
from loguru import logger

router = APIRouter()


class ProductionOrder(BaseModel):
    id: int
    order_number: str
    title: str
    status: str
    priority: str
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    progress_percentage: float = 0.0
    assigned_resources: List[Dict[str, Any]] = []
    client_name: str
    total_amount: float
    
    class Config:
        from_attributes = True


class ProductionCapacity(BaseModel):
    date: str
    used_capacity: float
    available_capacity: float
    utilization_rate: float


class ProductionMetrics(BaseModel):
    total_orders: int
    active_orders: int
    completed_orders: int
    on_time_delivery_rate: float
    average_completion_time: float
    capacity_utilization: float
    quality_score: float


class ProductionDashboardData(BaseModel):
    metrics: ProductionMetrics
    orders: List[ProductionOrder]
    capacity: List[ProductionCapacity]
    timeline_data: List[Dict[str, Any]]
    bottlenecks: List[Dict[str, Any]]
    machine_utilization: List[Dict[str, Any]]


@router.get("/dashboard", response_model=ProductionDashboardData)
async def get_production_dashboard(
    date: Optional[str] = Query(None, description="Date for production data (ISO format)"),
    view_mode: Optional[str] = Query("week", description="View mode: day, week, month"),
    manufacturer_id: Optional[str] = Query(None, description="Manufacturer ID filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production dashboard data with real-time metrics and orders"""
    try:
        # Parse date if provided
        if date:
            try:
                target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            except ValueError:
                target_date = datetime.now()
        else:
            target_date = datetime.now()

        # Set date range based on view mode
        if view_mode == "day":
            start_date = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)
        elif view_mode == "month":
            start_date = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month = start_date.replace(month=start_date.month + 1) if start_date.month < 12 else start_date.replace(year=start_date.year + 1, month=1)
            end_date = next_month
        else:  # week
            start_date = target_date - timedelta(days=target_date.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=7)

        # Get manufacturer filter
        manufacturer_filter = None
        if manufacturer_id and current_user.role == UserRole.ADMIN:
            manufacturer_filter = int(manufacturer_id)
        elif current_user.role == UserRole.MANUFACTURER:
            manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                manufacturer_filter = manufacturer.id

        # Build base query
        base_query = db.query(Order).filter(
            Order.created_at >= start_date,
            Order.created_at < end_date
        )

        if manufacturer_filter:
            # Filter by orders that have quotes from this manufacturer
            base_query = base_query.join(Quote).filter(Quote.manufacturer_id == manufacturer_filter)

        orders = base_query.all()

        # Calculate metrics
        total_orders = len(orders)
        active_orders = len([o for o in orders if o.status in [OrderStatus.IN_PRODUCTION, OrderStatus.ACTIVE]])
        completed_orders = len([o for o in orders if o.status == OrderStatus.COMPLETED])
        
        on_time_delivery_rate = 85.7  # Mock calculation
        average_completion_time = 12.5  # Mock calculation in days
        capacity_utilization = 78.3  # Mock calculation
        quality_score = 94.2  # Mock calculation

        metrics = ProductionMetrics(
            total_orders=total_orders,
            active_orders=active_orders,
            completed_orders=completed_orders,
            on_time_delivery_rate=on_time_delivery_rate,
            average_completion_time=average_completion_time,
            capacity_utilization=capacity_utilization,
            quality_score=quality_score
        )

        # Convert orders to production orders
        production_orders = []
        for order in orders[:10]:  # Limit to 10 for performance
            # Get client name
            client_name = "Unknown Client"
            if order.client:
                client_name = f"{order.client.first_name} {order.client.last_name}".strip() or order.client.email

            production_order = ProductionOrder(
                id=order.id,
                order_number=f"ORD-{order.id:06d}",
                title=order.title or "Production Order",
                status=order.status.value if hasattr(order.status, 'value') else str(order.status),
                priority="high" if order.urgency and order.urgency.value == "high" else "medium",
                scheduled_start=order.created_at,
                scheduled_end=order.delivery_date,
                actual_start=order.created_at,
                progress_percentage=50.0 if order.status == OrderStatus.IN_PRODUCTION else 
                                   100.0 if order.status == OrderStatus.COMPLETED else 0.0,
                assigned_resources=[],
                client_name=client_name,
                total_amount=float(order.target_price or 0)
            )
            production_orders.append(production_order)

        # Generate capacity data
        capacity_data = []
        for i in range(7):  # 7 days of capacity data
            date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            capacity = ProductionCapacity(
                date=date_str,
                used_capacity=75.0 + (i * 2.5),  # Mock data
                available_capacity=100.0,
                utilization_rate=(75.0 + (i * 2.5)) / 100.0
            )
            capacity_data.append(capacity)

        # Mock timeline, bottlenecks, and machine utilization data
        timeline_data = [
            {
                "date": (start_date + timedelta(days=i)).isoformat(),
                "scheduled_orders": 5 + i,
                "completed_orders": 3 + i,
                "efficiency": 85.5 + (i * 1.2)
            }
            for i in range(7)
        ]

        bottlenecks = [
            {
                "resource": "CNC Machine #3",
                "utilization": 95.2,
                "queue_length": 8,
                "estimated_delay": "2.5 hours"
            },
            {
                "resource": "Quality Station",
                "utilization": 87.3,
                "queue_length": 5,
                "estimated_delay": "1.2 hours"
            }
        ]

        machine_utilization = [
            {
                "machine_id": "CNC-001",
                "name": "CNC Machine #1",
                "utilization": 78.5,
                "status": "active",
                "current_job": "Order #1234"
            },
            {
                "machine_id": "CNC-002",
                "name": "CNC Machine #2",
                "utilization": 92.1,
                "status": "active",
                "current_job": "Order #1235"
            },
            {
                "machine_id": "3DP-001",
                "name": "3D Printer #1",
                "utilization": 65.3,
                "status": "active",
                "current_job": "Order #1236"
            }
        ]

        return ProductionDashboardData(
            metrics=metrics,
            orders=production_orders,
            capacity=capacity_data,
            timeline_data=timeline_data,
            bottlenecks=bottlenecks,
            machine_utilization=machine_utilization
        )

    except Exception as e:
        logger.error(f"Error loading production dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load production dashboard: {str(e)}"
        )


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update production order status"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check permissions
        if current_user.role not in [UserRole.ADMIN, UserRole.MANUFACTURER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Update status
        if hasattr(OrderStatus, status.upper()):
            order.status = getattr(OrderStatus, status.upper())
            order.updated_at = datetime.now()
            
            db.commit()
            db.refresh(order)
            
            return {"success": True, "message": "Order status updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid status")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/{order_id}/assign-resource")
async def assign_resource(
    order_id: int,
    resource_type: str,
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign resource to production order"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Mock resource assignment - in real implementation, this would update resource tables
        return {
            "success": True,
            "message": f"Resource {resource_id} of type {resource_type} assigned to order {order_id}"
        }
        
    except Exception as e:
        logger.error(f"Error assigning resource: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capacity")
async def get_production_capacity(
    manufacturer_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production capacity data"""
    try:
        # Mock capacity data - in real implementation, this would query capacity tables
        capacity_data = [
            {
                "date": "2024-01-15",
                "total_capacity": 100,
                "used_capacity": 75,
                "available_capacity": 25,
                "efficiency": 92.5
            },
            {
                "date": "2024-01-16",
                "total_capacity": 100,
                "used_capacity": 82,
                "available_capacity": 18,
                "efficiency": 94.2
            }
        ]
        
        return {"success": True, "data": capacity_data}
        
    except Exception as e:
        logger.error(f"Error getting capacity data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/machines/utilization")
async def get_machine_utilization(
    manufacturer_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get machine utilization data"""
    try:
        # Mock machine utilization data
        utilization_data = [
            {
                "machine_id": "CNC-001",
                "name": "CNC Machine #1",
                "type": "CNC",
                "utilization_percentage": 78.5,
                "status": "active",
                "current_job": "Order #1234",
                "next_maintenance": "2024-02-01"
            },
            {
                "machine_id": "CNC-002",
                "name": "CNC Machine #2",
                "type": "CNC",
                "utilization_percentage": 92.1,
                "status": "active",
                "current_job": "Order #1235",
                "next_maintenance": "2024-01-28"
            }
        ]
        
        return {"success": True, "data": utilization_data}
        
    except Exception as e:
        logger.error(f"Error getting machine utilization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/machines/{machine_id}/maintenance")
async def schedule_maintenance(
    machine_id: str,
    scheduled_date: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Schedule machine maintenance"""
    try:
        # Mock maintenance scheduling
        return {
            "success": True,
            "message": f"Maintenance scheduled for machine {machine_id} on {scheduled_date}"
        }
        
    except Exception as e:
        logger.error(f"Error scheduling maintenance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bottlenecks")
async def get_bottleneck_analysis(
    manufacturer_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production bottleneck analysis"""
    try:
        # Mock bottleneck analysis
        bottlenecks = [
            {
                "resource": "CNC Machine #3",
                "type": "machine",
                "utilization": 95.2,
                "queue_length": 8,
                "estimated_delay_hours": 2.5,
                "impact_level": "high",
                "suggested_actions": [
                    "Consider overtime scheduling",
                    "Redistribute workload to other machines",
                    "Prioritize urgent orders"
                ]
            },
            {
                "resource": "Quality Control Station",
                "type": "workstation",
                "utilization": 87.3,
                "queue_length": 5,
                "estimated_delay_hours": 1.2,
                "impact_level": "medium",
                "suggested_actions": [
                    "Add additional quality inspector",
                    "Implement batch processing"
                ]
            }
        ]
        
        return {"success": True, "data": bottlenecks}
        
    except Exception as e:
        logger.error(f"Error getting bottleneck analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 