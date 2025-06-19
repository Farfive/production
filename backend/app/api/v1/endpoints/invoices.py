from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from io import BytesIO
import csv

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, UserRole
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus
from app.models.quote import Quote
from app.models.order import Order
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, 
    InvoiceListResponse, InvoiceSendRequest
)
from app.services.invoice_service import InvoiceService
from app.services.email_notification_service import EmailNotificationService
from loguru import logger

router = APIRouter()


def map_invoice_to_response(invoice: Invoice) -> InvoiceResponse:
    """Helper function to map Invoice model to InvoiceResponse"""
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        quote_id=invoice.quote_id,
        order_id=invoice.order_id,
        client_id=invoice.client_id,
        items=[{
            "id": item.id,
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "discount_percent": item.discount_percent,
            "total_amount": item.total_amount
        } for item in invoice.items],
        subtotal=invoice.subtotal,
        discount_amount=invoice.discount_amount,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        due_date=invoice.due_date,
        notes=invoice.notes,
        status=InvoiceStatus(invoice.status),
        payment_terms=invoice.payment_terms,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        sent_at=invoice.sent_at,
        paid_at=invoice.paid_at
    )


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new invoice (admins and manufacturers only)"""
    # Check permissions
    if current_user.role not in [UserRole.ADMIN, UserRole.MANUFACTURER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and manufacturers can create invoices"
        )
    
    try:
        # Validate quote/order exists
        if invoice_data.quote_id:
            quote = db.query(Quote).filter(Quote.id == invoice_data.quote_id).first()
            if not quote:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Quote not found"
                )
        
        if invoice_data.order_id:
            order = db.query(Order).filter(Order.id == invoice_data.order_id).first()
            if not order:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found"
                )
        
        # Create invoice
        invoice = Invoice(
            quote_id=invoice_data.quote_id,
            order_id=invoice_data.order_id,
            client_id=invoice_data.client_id,
            due_date=invoice_data.due_date or (datetime.now(timezone.utc) + timedelta(days=30)),
            notes=invoice_data.notes,
            tax_rate=invoice_data.tax_rate,
            discount_percent=invoice_data.discount_percent,
            payment_terms=invoice_data.payment_terms,
            status=InvoiceStatus.DRAFT.value
        )
        
        db.add(invoice)
        db.flush()  # Get invoice ID
        
        # Create invoice items
        for item_data in invoice_data.items:
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_percent=item_data.discount_percent
            )
            item.calculate_total()
            db.add(item)
        
        # Calculate invoice totals
        db.flush()
        db.refresh(invoice)
        invoice.calculate_totals()
        
        db.commit()
        db.refresh(invoice)
        
        logger.info(f"Invoice {invoice.invoice_number} created by user {current_user.id}")
        return map_invoice_to_response(invoice)
        
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating invoice"
        )


@router.get("/", response_model=InvoiceListResponse)
async def get_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[InvoiceStatus] = Query(None),
    client_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get invoices (filtered by user role)"""
    try:
        query = db.query(Invoice)
        
        # Filter by user role
        if current_user.role == UserRole.CLIENT:
            query = query.filter(Invoice.client_id == current_user.id)
        elif current_user.role == UserRole.MANUFACTURER:
            # For manufacturers, show invoices for their quotes/orders
            # This would need more complex logic based on manufacturer relationships
            pass
        # Admin can see all invoices
        
        # Apply filters
        if status_filter:
            query = query.filter(Invoice.status == status_filter.value)
        if client_id and current_user.role == UserRole.ADMIN:
            query = query.filter(Invoice.client_id == client_id)
        
        # Count total
        total = query.count()
        
        # Apply pagination
        invoices = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        
        return InvoiceListResponse(
            invoices=[map_invoice_to_response(invoice) for invoice in invoices],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        logger.error(f"Error in get_invoices: {str(e)}")
        return InvoiceListResponse(
            invoices=[],
            total=0,
            page=page,
            per_page=per_page,
            total_pages=0
        )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific invoice by ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check authorization
    if current_user.role == UserRole.CLIENT and invoice.client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this invoice"
        )
    
    return map_invoice_to_response(invoice)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_update: InvoiceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update invoice (only drafts can be updated)"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.MANUFACTURER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update invoices"
        )
    
    # Only allow updates to draft invoices
    if invoice.status != InvoiceStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft invoices can be updated"
        )
    
    try:
        # Update invoice fields
        update_data = invoice_update.dict(exclude_unset=True, exclude={'items'})
        for field, value in update_data.items():
            if hasattr(invoice, field):
                setattr(invoice, field, value)
        
        # Update items if provided
        if invoice_update.items is not None:
            # Delete existing items
            db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
            
            # Create new items
            for item_data in invoice_update.items:
                item = InvoiceItem(
                    invoice_id=invoice.id,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit_price=item_data.unit_price,
                    discount_percent=item_data.discount_percent
                )
                item.calculate_total()
                db.add(item)
        
        # Recalculate totals
        db.flush()
        db.refresh(invoice)
        invoice.calculate_totals()
        
        db.commit()
        db.refresh(invoice)
        
        return map_invoice_to_response(invoice)
        
    except Exception as e:
        logger.error(f"Error updating invoice: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating invoice"
        )


@router.post("/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    send_request: InvoiceSendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send invoice to client via email"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.MANUFACTURER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send invoices"
        )
    
    try:
        # Mark invoice as sent
        invoice.mark_as_sent()
        db.commit()
        
        # Send email in background
        email_service = EmailNotificationService()
        background_tasks.add_task(
            email_service.send_invoice_email,
            invoice,
            send_request.email_subject,
            send_request.email_message,
            send_request.send_copy_to_self
        )
        
        return {"message": f"Invoice {invoice.invoice_number} sent successfully"}
        
    except Exception as e:
        logger.error(f"Error sending invoice: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error sending invoice"
        )


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download invoice as PDF"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check authorization
    if (current_user.role == UserRole.CLIENT and invoice.client_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to download this invoice"
        )
    
    try:
        # Generate PDF (placeholder implementation)
        # In a real implementation, you would use a PDF generation library
        from fastapi.responses import StreamingResponse
        
        # For now, return a simple text response
        # TODO: Implement actual PDF generation
        pdf_content = f"Invoice {invoice.invoice_number}\nTotal: ${invoice.total_amount}\n"
        pdf_bytes = BytesIO(pdf_content.encode())
        
        return StreamingResponse(
            pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice_{invoice.invoice_number}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Error generating invoice PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating PDF"
        )


@router.get("/export/csv")
async def export_invoices_csv(
    status_filter: Optional[InvoiceStatus] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export invoices as CSV"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANUFACTURER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to export invoices"
        )
    
    try:
        query = db.query(Invoice)
        
        # Apply filters
        if status_filter:
            query = query.filter(Invoice.status == status_filter.value)
        
        invoices = query.all()
        
        # Create CSV
        output = BytesIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Invoice Number', 'Client ID', 'Status', 'Total Amount', 
            'Due Date', 'Created At', 'Sent At', 'Paid At'
        ])
        
        # Write data
        for invoice in invoices:
            writer.writerow([
                invoice.invoice_number,
                invoice.client_id,
                invoice.status,
                str(invoice.total_amount),
                invoice.due_date.isoformat() if invoice.due_date else '',
                invoice.created_at.isoformat(),
                invoice.sent_at.isoformat() if invoice.sent_at else '',
                invoice.paid_at.isoformat() if invoice.paid_at else ''
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            BytesIO(output.getvalue()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=invoices_export.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting invoices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting invoices"
        ) 