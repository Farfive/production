from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.quote import Quote

router = APIRouter()


@router.get("/client")
def get_client_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get client dashboard statistics"""
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for clients only"
        )
    
    # Total orders
    total_orders = db.query(func.count(Order.id)).filter(
        Order.client_id == current_user.id
    ).scalar()
    
    # Active orders
    active_orders = db.query(func.count(Order.id)).filter(
        Order.client_id == current_user.id,
        Order.status.in_(["published", "open", "in_progress"])
    ).scalar()
    
    # Completed orders
    completed_orders = db.query(func.count(Order.id)).filter(
        Order.client_id == current_user.id,
        Order.status == "completed"
    ).scalar()
    
    # Total quotes received
    total_quotes = db.query(func.count(Quote.id)).join(Order).filter(
        Order.client_id == current_user.id
    ).scalar()
    
    # Pending quotes
    pending_quotes = db.query(func.count(Quote.id)).join(Order).filter(
        Order.client_id == current_user.id,
        Quote.status == "pending"
    ).scalar()
    
    # Recent orders
    recent_orders = db.query(Order).filter(
        Order.client_id == current_user.id
    ).order_by(Order.created_at.desc()).limit(5).all()
    
    # Recent quotes
    recent_quotes = db.query(Quote).join(Order).filter(
        Order.client_id == current_user.id
    ).order_by(Quote.created_at.desc()).limit(5).all()
    
    return {
        "total_orders": total_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "total_quotes": total_quotes,
        "pending_quotes": pending_quotes,
        "recent_orders": [
            {
                "id": order.id,
                "title": order.title,
                "status": order.status,
                "created_at": order.created_at
            } for order in recent_orders
        ],
        "recent_quotes": [
            {
                "id": quote.id,
                "order_id": quote.order_id,
                "price": quote.price,
                "status": quote.status,
                "created_at": quote.created_at
            } for quote in recent_quotes
        ]
    }


@router.get("/manufacturer")
def get_manufacturer_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get manufacturer dashboard statistics"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for manufacturers only"
        )
    
    # Total quotes submitted
    total_quotes = db.query(func.count(Quote.id)).filter(
        Quote.manufacturer_id == current_user.id
    ).scalar()
    
    # Accepted quotes
    accepted_quotes = db.query(func.count(Quote.id)).filter(
        Quote.manufacturer_id == current_user.id,
        Quote.status == "accepted"
    ).scalar()
    
    # Pending quotes
    pending_quotes = db.query(func.count(Quote.id)).filter(
        Quote.manufacturer_id == current_user.id,
        Quote.status == "pending"
    ).scalar()
    
    # Success rate
    success_rate = (accepted_quotes / total_quotes * 100) if total_quotes > 0 else 0
    
    # Active orders (orders in progress)
    active_orders = db.query(func.count(Order.id)).join(Quote).filter(
        Quote.manufacturer_id == current_user.id,
        Quote.status == "accepted",
        Order.status == "in_progress"
    ).scalar()
    
    # Available orders (open for quotes)
    available_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_(["published", "open"])
    ).scalar()
    
    # Recent quotes
    recent_quotes = db.query(Quote).filter(
        Quote.manufacturer_id == current_user.id
    ).order_by(Quote.created_at.desc()).limit(5).all()
    
    # Recent available orders
    recent_available = db.query(Order).filter(
        Order.status.in_(["published", "open"])
    ).order_by(Order.created_at.desc()).limit(5).all()
    
    return {
        "total_quotes": total_quotes,
        "accepted_quotes": accepted_quotes,
        "pending_quotes": pending_quotes,
        "success_rate": round(success_rate, 2),
        "active_orders": active_orders,
        "available_orders": available_orders,
        "recent_quotes": [
            {
                "id": quote.id,
                "order_id": quote.order_id,
                "price": quote.price,
                "status": quote.status,
                "created_at": quote.created_at
            } for quote in recent_quotes
        ],
        "recent_available_orders": [
            {
                "id": order.id,
                "title": order.title,
                "budget_min": order.budget_min,
                "budget_max": order.budget_max,
                "created_at": order.created_at
            } for order in recent_available
        ]
    }


@router.get("/admin")
def get_admin_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for admins only"
        )
    
    # User statistics
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar()
    clients = db.query(func.count(User.id)).filter(User.role == "client").scalar()
    manufacturers = db.query(func.count(User.id)).filter(User.role == "manufacturer").scalar()
    
    # Order statistics
    total_orders = db.query(func.count(Order.id)).scalar()
    active_orders = db.query(func.count(Order.id)).filter(
        Order.status.in_(["published", "open", "in_progress"])
    ).scalar()
    
    # Quote statistics
    total_quotes = db.query(func.count(Quote.id)).scalar()
    
    # Revenue statistics (if payment model exists)
    # total_revenue = db.query(func.sum(Payment.amount)).scalar() or 0
    
    # Recent activity
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "clients": clients,
            "manufacturers": manufacturers
        },
        "orders": {
            "total": total_orders,
            "active": active_orders
        },
        "quotes": {
            "total": total_quotes
        },
        "recent_users": [
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at
            } for user in recent_users
        ],
        "recent_orders": [
            {
                "id": order.id,
                "title": order.title,
                "status": order.status,
                "created_at": order.created_at
            } for order in recent_orders
        ]
    } 