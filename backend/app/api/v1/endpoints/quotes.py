from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.quote import Quote
from app.schemas.quote import QuoteCreate, QuoteResponse, QuoteUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    quote: QuoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new quote for an order (manufacturer only)"""
    # Debug logging
    logger.info(f"Create quote attempt by user: {current_user.email}")
    logger.info(f"User role: {current_user.role}")
    logger.info(f"User role type: {type(current_user.role)}")
    logger.info(f"User role value: {current_user.role.value if hasattr(current_user.role, 'value') else 'No value attr'}")
    logger.info(f"UserRole.MANUFACTURER: {UserRole.MANUFACTURER}")
    logger.info(f"Role comparison: {current_user.role == UserRole.MANUFACTURER}")
    
    if current_user.role != UserRole.MANUFACTURER:
        logger.warning(f"Access denied for non-manufacturer user: {current_user.email} with role {current_user.role}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can create quotes"
        )
    
    # Check if order exists and is open for quotes
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status not in ["published", "open"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not accepting quotes"
        )
    
    # Check if manufacturer already quoted on this order
    existing_quote = db.query(Quote).filter(
        Quote.order_id == quote.order_id,
        Quote.manufacturer_id == current_user.id
    ).first()
    
    if existing_quote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted a quote for this order"
        )
    
    # Create quote
    db_quote = Quote(
        **quote.dict(),
        manufacturer_id=current_user.id,
        status="pending"
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    return db_quote


@router.get("/", response_model=List[QuoteResponse])
def list_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    order_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List quotes (filtered by user role)"""
    query = db.query(Quote)
    
    # Filter based on user role
    if current_user.role == UserRole.CLIENT:
        # Clients see quotes for their orders
        query = query.join(Order).filter(Order.client_id == current_user.id)
    elif current_user.role == UserRole.MANUFACTURER:
        # Manufacturers see their own quotes
        query = query.filter(Quote.manufacturer_id == current_user.id)
    
    # Apply filters
    if order_id:
        query = query.filter(Quote.order_id == order_id)
    if status:
        query = query.filter(Quote.status == status)
    
    quotes = query.offset(skip).limit(limit).all()
    return quotes


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quote details"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check authorization
    if current_user.role == UserRole.CLIENT:
        order = db.query(Order).filter(Order.id == quote.order_id).first()
        if order.client_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this quote"
            )
    elif current_user.role == UserRole.MANUFACTURER:
        if quote.manufacturer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this quote"
            )
    
    return quote


@router.patch("/{quote_id}", response_model=QuoteResponse)
def update_quote(
    quote_id: int,
    quote_update: QuoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update quote (manufacturer only, before acceptance)"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Only manufacturer can update their own quote
    if current_user.role != UserRole.MANUFACTURER or quote.manufacturer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this quote"
        )
    
    # Can only update pending quotes
    if quote.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending quotes"
        )
    
    # Update quote
    update_data = quote_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quote, field, value)
    
    quote.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(quote)
    
    return quote


@router.post("/{quote_id}/accept")
def accept_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a quote (client only)"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check authorization
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if current_user.role != UserRole.CLIENT or order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the order owner can accept quotes"
        )
    
    # Update quote status
    quote.status = "accepted"
    quote.accepted_at = datetime.utcnow()
    
    # Update order status
    order.status = "in_progress"
    order.accepted_quote_id = quote.id
    
    # Reject other quotes for this order
    db.query(Quote).filter(
        Quote.order_id == order.id,
        Quote.id != quote_id,
        Quote.status == "pending"
    ).update({"status": "rejected"})
    
    db.commit()
    
    return {"message": "Quote accepted successfully", "quote_id": quote_id}


@router.post("/{quote_id}/reject")
def reject_quote(
    quote_id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a quote (client only)"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Check authorization
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if current_user.role != UserRole.CLIENT or order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the order owner can reject quotes"
        )
    
    # Update quote status
    quote.status = "rejected"
    if reason:
        quote.rejection_reason = reason
    
    db.commit()
    
    return {"message": "Quote rejected", "quote_id": quote_id} 