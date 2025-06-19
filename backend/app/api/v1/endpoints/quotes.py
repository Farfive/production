from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime, timezone
from decimal import Decimal
import logging
import os
import uuid
from pathlib import Path
from io import BytesIO
import csv

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.quote import Quote, QuoteStatus, QuoteAttachment, QuoteNegotiation, QuoteNotification, NegotiationStatus
from app.models.producer import Manufacturer
from app.schemas.quote import (
    QuoteCreate, QuoteResponse, QuoteUpdate, QuoteNegotiation as QuoteNegotiationSchema,
    QuoteNegotiationResponse, QuoteComparisonData, QuoteRevision, QuoteFilterCriteria,
    QuoteBulkAction, QuoteAnalyticsOverview
)
# QuoteFilterCriteria is properly imported above
from app.services.quote_service import QuoteService
from app.services.notification_service import NotificationService
from app.services.file_service import FileService
from app.services.quote_comparison_service import QuoteComparisonService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
quote_comparison_service = QuoteComparisonService()


@router.post("/", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    quote: QuoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new quote for an order."""
    quote_service = QuoteService(db)
    return quote_service.create_quote(quote, current_user)


@router.get("/", response_model=List[QuoteResponse])
def get_quotes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    order_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quotes for the current user."""
    query = db.query(Quote)
    
    if current_user.role == UserRole.CLIENT:
        # Clients can see quotes for their orders
        order_ids = db.query(Order.id).filter(Order.client_id == current_user.id).subquery()
        query = query.filter(Quote.order_id.in_(order_ids))
    elif current_user.role == UserRole.MANUFACTURER:
        # Manufacturers can see their own quotes
        manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
        if manufacturer:
            query = query.filter(Quote.manufacturer_id == manufacturer.id)
    
    if status:
        query = query.filter(Quote.status == status)
    if order_id:
        query = query.filter(Quote.order_id == order_id)
    
    quotes = query.offset(skip).limit(limit).all()
    return quotes


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific quote."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check authorization
    if current_user.role == UserRole.CLIENT:
        order = db.query(Order).filter(Order.id == quote.order_id).first()
        if not order or order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this quote")
    elif current_user.role == UserRole.MANUFACTURER:
        manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
        if not manufacturer or quote.manufacturer_id != manufacturer.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this quote")
    
    # Mark as viewed if client is viewing
    if current_user.role == UserRole.CLIENT and quote.status == QuoteStatus.SENT:
        quote.mark_as_viewed()
        db.commit()
    
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
    if not order or current_user.role != UserRole.CLIENT or order.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the client who owns the order can accept a quote."
        )

    if order.status not in [OrderStatus.QUOTED, OrderStatus.ACTIVE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept a quote for an order with status '{order.status.value}'. Must be 'quoted' or 'active'."
        )

    if quote.status != QuoteStatus.SENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept a quote with status '{quote.status.value}'. Must be '{QuoteStatus.SENT.value}'."
        )
    
    # Update quote status
    quote.status = QuoteStatus.ACCEPTED
    quote.accepted_at = datetime.now(timezone.utc)
    
    # Update order status
    order.selected_quote_id = quote.id
    order.status = OrderStatus.IN_PRODUCTION
    order.updated_at = datetime.now(timezone.utc)
    
    # Reject all other quotes for this order
    (
        db.query(Quote)
        .filter(Quote.order_id == order.id, Quote.id != quote_id)
        .update({"status": QuoteStatus.REJECTED, "updated_at": datetime.now(timezone.utc)})
    )
    
    # Create notification for manufacturer
    notification_service = NotificationService(db)
    notification_service.create_quote_notification(
        quote=quote,
        notification_type="quote_accepted",
        title="Quote Accepted!",
        message=f"Your quote for order #{order.id} has been accepted.",
        user_id=quote.manufacturer.user_id
    )
    
    db.commit()
    
    # TODO: Notify manufacturer of acceptance via email/notification

    return {"message": f"Quote {quote.id} accepted successfully. Order {order.id} is now in production."}


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
        raise HTTPException(status_code=404, detail="Quote not found")

    # Authorization check
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if not order or order.client_id != current_user.id or current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to reject this quote"
        )

    if quote.status != QuoteStatus.SENT:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject a quote with status '{quote.status.value}'. Must be '{QuoteStatus.SENT.value}'"
        )

    quote.status = QuoteStatus.REJECTED
    quote.client_response = reason or "No reason provided"
    quote.updated_at = datetime.now(timezone.utc)
    
    # Create notification for manufacturer
    notification_service = NotificationService(db)
    notification_service.create_quote_notification(
        quote=quote,
        notification_type="quote_rejected",
        title="Quote Rejected",
        message=f"Your quote for order #{order.id} has been rejected. Reason: {reason or 'No reason provided'}",
        user_id=quote.manufacturer.user_id
    )
    
    db.commit()

    return {"message": f"Quote {quote.id} has been rejected."}


@router.post("/{quote_id}/negotiate", response_model=QuoteNegotiationResponse)
def request_negotiation(
    quote_id: int,
    negotiation: QuoteNegotiationSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request negotiation on a quote (client only)"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Authorization check
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if not order or order.client_id != current_user.id or current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to negotiate this quote"
        )

    if quote.status not in [QuoteStatus.SENT, QuoteStatus.VIEWED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot negotiate a quote with status '{quote.status.value}'"
        )

    # Create negotiation record
    db_negotiation = QuoteNegotiation(
        quote_id=quote_id,
        message=negotiation.message,
        requested_price=negotiation.requested_price,
        requested_delivery_days=negotiation.requested_delivery_days,
        changes_requested=negotiation.changes_requested,
        created_by=current_user.id,
        status=NegotiationStatus.PENDING
    )
    
    # Update quote status
    quote.status = QuoteStatus.NEGOTIATING
    quote.updated_at = datetime.now(timezone.utc)
    
    db.add(db_negotiation)
    
    # Create notification for manufacturer
    notification_service = NotificationService(db)
    notification_service.create_quote_notification(
        quote=quote,
        notification_type="negotiation_request",
        title="Negotiation Request",
        message=f"Client has requested negotiation for your quote on order #{order.id}",
        user_id=quote.manufacturer.user_id
    )
    
    db.commit()
    db.refresh(db_negotiation)

    return db_negotiation


@router.get("/{quote_id}/negotiations", response_model=List[QuoteNegotiationResponse])
def get_quote_negotiations(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all negotiations for a quote"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Check authorization
    if current_user.role == UserRole.CLIENT:
        order = db.query(Order).filter(Order.id == quote.order_id).first()
        if not order or order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == UserRole.MANUFACTURER:
        manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
        if not manufacturer or quote.manufacturer_id != manufacturer.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    negotiations = db.query(QuoteNegotiation).filter(QuoteNegotiation.quote_id == quote_id).all()
    return negotiations


@router.post("/{quote_id}/revise", response_model=QuoteResponse)
def create_quote_revision(
    quote_id: int,
    revision: QuoteRevision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a revised quote (manufacturer only)"""
    original_quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not original_quote:
        raise HTTPException(status_code=404, detail="Original quote not found")

    # Check authorization
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer or original_quote.manufacturer_id != manufacturer.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if original_quote.status != QuoteStatus.NEGOTIATING:
        raise HTTPException(
            status_code=400,
            detail="Can only revise quotes that are in negotiation"
        )

    # Create new quote as revision
    revised_quote = Quote(
        order_id=original_quote.order_id,
        manufacturer_id=original_quote.manufacturer_id,
        subtotal_pln=revision.price,
        total_price_pln=revision.price,  # Simplified for now
        lead_time_days=revision.delivery_days,
        client_message=revision.description,
        internal_notes=revision.revision_notes,
        status=QuoteStatus.SENT,
        original_quote_id=quote_id,
        revision_count=original_quote.revision_count + 1,
        # Copy breakdown if provided
        material_cost_pln=revision.breakdown.materials if revision.breakdown else 0,
        labor_cost_pln=revision.breakdown.labor if revision.breakdown else 0,
        overhead_cost_pln=revision.breakdown.overhead if revision.breakdown else 0,
        shipping_cost_pln=revision.breakdown.shipping if revision.breakdown else 0,
    )

    # Mark original quote as superseded
    original_quote.status = QuoteStatus.SUPERSEDED

    db.add(revised_quote)
    
    # Create notification for client
    order = db.query(Order).filter(Order.id == original_quote.order_id).first()
    notification_service = NotificationService(db)
    notification_service.create_quote_notification(
        quote=revised_quote,
        notification_type="quote_revised",
        title="Quote Revised",
        message=f"Your requested changes have been incorporated into a new quote for order #{order.id}",
        user_id=order.client_id
    )
    
    db.commit()
    db.refresh(revised_quote)

    return revised_quote


@router.post("/{quote_id}/attachments", response_model=List[dict])
async def upload_quote_attachments(
    quote_id: int,
    files: List[UploadFile] = File(...),
    descriptions: List[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload attachments to a quote"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Check authorization
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer or quote.manufacturer_id != manufacturer.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    file_service = FileService()
    uploaded_attachments = []

    for i, file in enumerate(files):
        if not file.filename:
            continue

        # Validate file
        if file.size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail=f"File {file.filename} is too large (max 50MB)")

        # Save file
        file_info = await file_service.save_quote_attachment(file, quote_id, current_user.id)
        
        # Create database record
        attachment = QuoteAttachment(
            quote_id=quote_id,
            name=file_info["name"],
            original_name=file.filename,
            file_path=file_info["path"],
            file_size=file_info["size"],
            file_type=file_info["type"],
            mime_type=file.content_type,
            description=descriptions[i] if descriptions and i < len(descriptions) else None,
            uploaded_by=current_user.id
        )
        
        db.add(attachment)
        uploaded_attachments.append({
            "name": attachment.name,
            "original_name": attachment.original_name,
            "size": attachment.file_size,
            "type": attachment.file_type,
            "url": file_info["url"]
        })

    db.commit()
    
    return uploaded_attachments


@router.get("/{quote_id}/attachments")
def get_quote_attachments(
    quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all attachments for a quote"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Check authorization
    authorized = False
    if current_user.role == UserRole.CLIENT:
        order = db.query(Order).filter(Order.id == quote.order_id).first()
        authorized = order and order.client_id == current_user.id
    elif current_user.role == UserRole.MANUFACTURER:
        manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
        authorized = manufacturer and quote.manufacturer_id == manufacturer.id

    if not authorized:
        raise HTTPException(status_code=403, detail="Not authorized")

    attachments = db.query(QuoteAttachment).filter(
        QuoteAttachment.quote_id == quote_id,
        QuoteAttachment.is_public == True
    ).all()

    return [
        {
            "id": att.id,
            "name": att.name,
            "original_name": att.original_name,
            "size": att.file_size,
            "type": att.file_type,
            "description": att.description,
            "created_at": att.created_at,
            "url": f"/api/v1/quotes/{quote_id}/attachments/{att.id}/download"
        }
        for att in attachments
    ]


@router.delete("/{quote_id}/attachments/{attachment_id}")
def delete_quote_attachment(
    quote_id: int,
    attachment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a quote attachment"""
    attachment = db.query(QuoteAttachment).filter(
        QuoteAttachment.id == attachment_id,
        QuoteAttachment.quote_id == quote_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Check authorization (only uploader can delete)
    if attachment.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete file from storage
    file_service = FileService()
    file_service.delete_file(attachment.file_path)

    # Delete database record
    db.delete(attachment)
    db.commit()

    return {"message": "Attachment deleted successfully"}


@router.get("/order/{order_id}/comparison", response_model=QuoteComparisonData)
def get_quote_comparison(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quotes comparison data for an order"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check authorization
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    quotes = db.query(Quote).filter(Quote.order_id == order_id).all()
    
    return QuoteComparisonData(
        order_id=order_id,
        quotes=quotes,
        criteria_weights={
            "price": 0.3,
            "delivery": 0.2,
            "quality": 0.25,
            "reliability": 0.15,
            "compliance": 0.1
        }
    )


@router.post("/order/{order_id}/comparison/report")
def generate_comparison_report(
    order_id: int,
    criteria_weights: Optional[Dict[str, float]] = None,
    filters: Optional[QuoteFilterCriteria] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive quote comparison report"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check authorization
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        report = quote_comparison_service.generate_comparison_report(
            db=db,
            order_id=order_id,
            criteria_weights=criteria_weights,
            filters=filters
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating comparison report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate comparison report")


@router.get("/{quote_id}/analytics")
def get_quote_analytics(
    quote_id: int,
    criteria_weights: Optional[Dict[str, float]] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analytics for a specific quote"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Check authorization
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        if current_user.role == UserRole.MANUFACTURER and quote.manufacturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Get all quotes for the same order for comparison
    all_quotes = db.query(Quote).filter(Quote.order_id == quote.order_id).all()
    
    try:
        analytics = quote_comparison_service.calculate_quote_analytics(
            quote=quote,
            all_quotes=all_quotes,
            criteria_weights=criteria_weights
        )
        return analytics
    except Exception as e:
        logger.error(f"Error calculating quote analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate analytics")


@router.get("/{quote_id}/benchmark")
def get_quote_benchmark(
    quote_id: int,
    industry_category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get benchmarking data for a quote"""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Check authorization
    order = db.query(Order).filter(Order.id == quote.order_id).first()
    if current_user.role == UserRole.CLIENT and order.client_id != current_user.id:
        if current_user.role == UserRole.MANUFACTURER and quote.manufacturer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    try:
        benchmark = quote_comparison_service.get_quote_benchmark(
            db=db,
            quote=quote,
            industry_category=industry_category
        )
        return benchmark
    except Exception as e:
        logger.error(f"Error getting quote benchmark: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get benchmark data")


@router.post("/bulk")
def bulk_update_quotes(
    action: str = Query(..., pattern="^(accept|reject|withdraw|delete)$"),
    quote_ids: List[int] = Query(..., description="IDs of quotes to perform bulk action on"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform bulk operations on quotes (accept, reject, withdraw, delete)."""
    service = QuoteService(db)
    updated = service.bulk_update_status(action, quote_ids, current_user)
    return {"message": f"Bulk action '{action}' completed", "affected": updated}


@router.get("/search", response_model=List[QuoteResponse])
def advanced_search_quotes(
    status: Optional[List[str]] = Query(None),
    order_id: Optional[int] = None,
    manufacturer_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = 'created_at',
    sort_order: Optional[str] = 'desc',
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Advanced filtering and search for quotes."""
    filters = {
        "status": status,
        "order_id": order_id,
        "manufacturer_id": manufacturer_id,
        "min_price": min_price,
        "max_price": max_price,
        "created_from": created_from,
        "created_to": created_to,
        "search": search,
        "sort_by": sort_by,
        "sort_order": sort_order,
        "skip": skip,
        "limit": limit,
    }
    service = QuoteService(db)
    results = service.search_quotes(filters, current_user)
    return results


@router.get("/analytics/overview")
def quote_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get aggregated analytics across quotes."""
    service = QuoteService(db)
    data = service.analytics_overview(current_user)
    return data


@router.get("/export/csv")
async def export_quotes_csv(
    status_filter: Optional[QuoteStatus] = Query(None),
    order_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export quotes as CSV"""
    try:
        query = db.query(Quote)
        
        # Filter by user role
        if current_user.role == UserRole.CLIENT:
            # Clients can see quotes for their orders
            order_ids = db.query(Order.id).filter(Order.client_id == current_user.id).subquery()
            query = query.filter(Quote.order_id.in_(order_ids))
        elif current_user.role == UserRole.MANUFACTURER:
            # Manufacturers can see their own quotes
            manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                query = query.filter(Quote.manufacturer_id == manufacturer.id)
        # Admin can see all quotes
        
        # Apply filters
        if status_filter:
            query = query.filter(Quote.status == status_filter)
        if order_id:
            query = query.filter(Quote.order_id == order_id)
        
        quotes = query.all()
        
        # Create CSV
        output = BytesIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Quote ID', 'Order ID', 'Manufacturer', 'Total Price', 'Currency',
            'Delivery Time (days)', 'Status', 'Created At', 'Accepted At'
        ])
        
        # Write data
        for quote in quotes:
            writer.writerow([
                quote.id,
                quote.order_id,
                quote.manufacturer.company_name if quote.manufacturer else '',
                str(quote.total_price_pln),
                'PLN',
                quote.delivery_time_days,
                quote.status.value if hasattr(quote.status, 'value') else str(quote.status),
                quote.created_at.isoformat(),
                quote.accepted_at.isoformat() if quote.accepted_at else ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            BytesIO(output.getvalue()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=quotes_export.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting quotes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting quotes"
        )