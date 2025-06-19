from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from io import BytesIO
import csv

from app.core.database import get_db
from app.core.security import get_current_active_user, get_current_user_optional
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.services.matching import MatchingService
from app.schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
    OrderStatusUpdate,
    OrderFeedback,
    OrderSearch
)
from loguru import logger

router = APIRouter()


def map_order_to_response(order):
    """Helper function to map Order model to OrderResponse"""
    return OrderResponse(
        id=order.id,
        title=order.title,
        description=order.description,
        technology=order.technical_requirements.get("technology", "") if order.technical_requirements else "",
        material=order.technical_requirements.get("material", "") if order.technical_requirements else "",
        quantity=order.quantity,
        budget_pln=order.budget_fixed_pln or 0,
        delivery_deadline=order.delivery_deadline,
        priority=order.priority,
        preferred_location=order.preferred_country or "",
        specifications=order.technical_requirements.get("specifications", {}) if order.technical_requirements else {},
        attachments=order.attachments or [],
        status=order.status,
        # Required fields with defaults
        matched_at=getattr(order, 'matched_at', None),
        selected_quote_id=getattr(order, 'selected_quote_id', None),
        production_started_at=getattr(order, 'production_started_at', None),
        estimated_completion=getattr(order, 'estimated_completion', None),
        actual_completion=getattr(order, 'actual_completion', None),
        client_rating=getattr(order, 'client_rating', None),
        client_feedback=getattr(order, 'client_feedback', None),
        client_id=order.client_id,
        created_at=order.created_at,
        updated_at=order.updated_at,
        # Computed properties
        is_active=order.status == OrderStatus.ACTIVE,
        is_completed=order.status == OrderStatus.COMPLETED,
        is_overdue=bool(order.delivery_deadline and order.delivery_deadline < datetime.now()),
        days_until_deadline=(order.delivery_deadline - datetime.now()).days if order.delivery_deadline and order.delivery_deadline > datetime.now() else None
    )


@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new order (clients and admins only)"""
    # Check if user has permission to create orders (handle enum or raw string)
    user_role_str = str(current_user.role).lower().replace('userrole.', '')  # Handle enum prefix
    logger.info(f"User {current_user.id} attempting to create order with role: {current_user.role} (processed as: {user_role_str})")
    
    if user_role_str not in ["client", "admin"]:
        logger.warning(f"User {current_user.id} denied order creation - role {user_role_str} not in allowed roles")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients and admins can create orders"
        )
    
    try:
        # Create order - map schema fields to model fields
        # For admin users, use the first client user as client_id (or create a system client)
        client_id = current_user.id
        if user_role_str == "admin":
            # For admin-created orders, we need a client_id. 
            # Let's use the admin's ID but mark it as admin-created
            client_id = current_user.id
        
        order = Order(
            client_id=client_id,
            title=order_data.title,
            description=order_data.description,
            # Map schema fields to actual model fields
            technical_requirements={
                "technology": order_data.technology,
                "material": order_data.material,
                "specifications": order_data.specifications or {}
            },
            quantity=order_data.quantity,
            budget_fixed_pln=order_data.budget_pln,  # Map budget_pln to budget_fixed_pln
            delivery_deadline=order_data.delivery_deadline,
            priority=order_data.priority,
            preferred_country=order_data.preferred_location[:2] if order_data.preferred_location else None,
            attachments=order_data.attachments or [],
            status=OrderStatus.ACTIVE,  # Use ACTIVE instead of PENDING_MATCHING
            admin_notes=f"Created by admin: {current_user.email}" if user_role_str == "admin" else None
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Trigger matching process asynchronously
        try:
            await MatchingService.trigger_matching_process(db, order)
        except Exception as e:
            logger.error(f"Error in matching process for order {order.id}: {str(e)}")
        
        logger.info(f"Order {order.id} created by user {current_user.id} (role: {current_user.role})")
        
        return map_order_to_response(order)
        
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating order"
        )


@router.get("/", response_model=OrderListResponse)
async def get_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[OrderStatus] = Query(None),
    technology: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get orders (filtered by user role)"""
    try:
        query = db.query(Order)
        
        # Filter by user role - if no user, show public orders only
        if current_user:
            if current_user.role == UserRole.CLIENT:
                query = query.filter(Order.client_id == current_user.id)
            elif current_user.role == UserRole.MANUFACTURER:
                # For manufacturers, show orders they can bid on or have bid on
                query = query.filter(
                    Order.status.in_([
                        OrderStatus.PENDING_MATCHING,
                        OrderStatus.OFFERS_SENT
                    ])
                )
            # Admin can see all orders
        else:
            # For unauthenticated users, show only active orders (for testing)
            query = query.filter(Order.status == OrderStatus.ACTIVE)
        
        # Apply filters
        if status_filter:
            query = query.filter(Order.status == status_filter)
        if technology:
            # For now, skip technology filtering to avoid JSON query issues
            # TODO: Implement proper JSON field search
            pass
        
        # Count total
        total = query.count()
        
        # Apply pagination
        orders = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        
        return OrderListResponse(
            orders=[map_order_to_response(order) for order in orders],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error in get_orders: {str(e)}")
        # Return empty result on error
        return OrderListResponse(
            orders=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=0
        )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific order by ID"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return map_order_to_response(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update order (client or admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )
    elif current_user.role not in [UserRole.CLIENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update orders"
        )
    
    # Check if order can be updated
    if order.status not in [OrderStatus.PENDING_MATCHING, OrderStatus.OFFERS_SENT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be updated in current status"
        )
    
    # Update fields
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    order.updated_at = datetime.now()
    db.commit()
    db.refresh(order)
    
    logger.info(f"Order {order.id} updated by user {current_user.id}")
    
    return map_order_to_response(order)


@router.post("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update order status (admin or producer with accepted quote)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.ADMIN:
        # Admin can update any status
        pass
    elif current_user.role == UserRole.MANUFACTURER:
        # Manufacturer can only update if they have the accepted quote
        if not order.selected_quote or order.selected_quote.producer.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this order status"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update order status"
        )
    
    # Update status
    old_status = order.status
    order.status = status_update.status
    
    # Set timestamps based on status
    if status_update.status == OrderStatus.IN_PRODUCTION:
        order.production_started_at = datetime.now()
        if status_update.estimated_completion:
            order.estimated_completion = status_update.estimated_completion
    elif status_update.status == OrderStatus.COMPLETED:
        order.actual_completion = datetime.now()
    
    # Add admin notes if provided
    if status_update.notes and current_user.role == UserRole.ADMIN:
        order.admin_notes = status_update.notes
    
    db.commit()
    db.refresh(order)
    
    # Send status update notifications
    try:
        from app.services.email import send_order_status_update_email
        await send_order_status_update_email(
            email=order.client.email,
            name=order.client.full_name,
            order_data={
                'id': order.id,
                'title': order.title,
                'status': order.status.value
            },
            old_status=old_status.value,
            new_status=order.status.value
        )
    except Exception as e:
        logger.error(f"Error sending status update email: {str(e)}")
    
    logger.info(f"Order {order.id} status updated from {old_status} to {order.status}")
    
    return map_order_to_response(order)


@router.post("/{order_id}/feedback", response_model=OrderResponse)
async def submit_order_feedback(
    order_id: int,
    feedback: OrderFeedback,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit feedback for completed order (client only)"""
    # Check if user is a client
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can provide order feedback"
        )
    
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check permissions
    if order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to provide feedback for this order"
        )
    
    # Check if order is completed
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only provide feedback for completed orders"
        )
    
    # Update feedback
    order.client_rating = feedback.rating
    order.client_feedback = feedback.feedback
    
    # Update producer rating
    if order.selected_quote and order.selected_quote.producer:
        producer = order.selected_quote.producer
        # Simple rating calculation - in production, you might want a more sophisticated system
        total_orders = producer.total_orders_completed
        current_rating = producer.rating
        
        # Calculate new average rating
        new_rating = ((current_rating * total_orders) + feedback.rating) / (total_orders + 1)
        producer.rating = new_rating
    
    db.commit()
    db.refresh(order)
    
    logger.info(f"Feedback submitted for order {order.id} by user {current_user.id}")
    
    return map_order_to_response(order)


@router.delete("/{order_id}")
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel order (client or admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this order"
        )
    elif current_user.role not in [UserRole.CLIENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel orders"
        )
    
    # Check if order can be cancelled
    if order.status in [OrderStatus.COMPLETED, OrderStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled in current status"
        )
    
    # Handle payment refund if payment was made
    if order.status in [OrderStatus.PAYMENT_COMPLETED, OrderStatus.IN_PRODUCTION]:
        try:
            from app.services.payment import PaymentService
            payment = db.query(Payment).filter(Payment.order_id == order.id).first()
            if payment and payment.can_be_refunded():
                PaymentService.refund_payment(db, payment, reason="order_cancelled")
        except Exception as e:
            logger.error(f"Error processing refund for cancelled order {order.id}: {str(e)}")
    
    # Update order status
    order.status = OrderStatus.CANCELLED
    db.commit()
    
    logger.info(f"Order {order.id} cancelled by user {current_user.id}")
    
    return {"message": "Order cancelled successfully"}


@router.get("/export/csv")
async def export_orders_csv(
    status_filter: Optional[OrderStatus] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export orders as CSV"""
    try:
        query = db.query(Order)
        
        # Filter by user role
        if current_user.role == UserRole.CLIENT:
            query = query.filter(Order.client_id == current_user.id)
        elif current_user.role == UserRole.MANUFACTURER:
            # For manufacturers, show orders they can bid on or have bid on
            query = query.filter(
                Order.status.in_([
                    OrderStatus.PENDING_MATCHING,
                    OrderStatus.OFFERS_SENT
                ])
            )
        # Admin can see all orders
        
        # Apply filters
        if status_filter:
            query = query.filter(Order.status == status_filter)
        
        orders = query.all()
        
        # Create CSV
        output = BytesIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Title', 'Description', 'Technology', 'Material', 'Quantity',
            'Budget (PLN)', 'Status', 'Priority', 'Delivery Deadline', 'Created At'
        ])
        
        # Write data
        for order in orders:
            tech_req = order.technical_requirements or {}
            writer.writerow([
                order.id,
                order.title,
                order.description,
                tech_req.get('technology', ''),
                tech_req.get('material', ''),
                order.quantity,
                str(order.budget_fixed_pln or 0),
                order.status.value if hasattr(order.status, 'value') else str(order.status),
                order.priority,
                order.delivery_deadline.isoformat() if order.delivery_deadline else '',
                order.created_at.isoformat()
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            BytesIO(output.getvalue()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=orders_export.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting orders"
        )