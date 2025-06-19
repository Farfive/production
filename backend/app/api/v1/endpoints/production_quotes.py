from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from typing import List, Optional
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.user import User, UserRole
from app.models.producer import Manufacturer
from app.models.quote import ProductionQuote, ProductionQuoteInquiry, ProductionQuoteType
from app.schemas.production_quote import (
    ProductionQuoteCreate, ProductionQuoteUpdate, ProductionQuoteResponse,
    ProductionQuoteInquiryCreate, ProductionQuoteInquiryResponse, ProductionQuoteInquiryUpdate,
    ProductionQuoteFilterCriteria, ProductionQuoteMatch, ProductionQuoteAnalytics
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ProductionQuoteResponse, status_code=status.HTTP_201_CREATED)
def create_production_quote(
    production_quote: ProductionQuoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new production quote (manufacturers only)"""
    # Verify user is a manufacturer
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can create production quotes"
        )
    
    # Get manufacturer profile
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    # Create production quote - use manufacturer.id as manufacturer_id
    db_production_quote = ProductionQuote(
        manufacturer_id=manufacturer.id,
        **production_quote.dict()
    )
    
    db.add(db_production_quote)
    db.commit()
    db.refresh(db_production_quote)
    
    return db_production_quote


@router.get("/", response_model=List[ProductionQuoteResponse])
def list_production_quotes(
    # Filtering parameters
    production_quote_type: Optional[ProductionQuoteType] = None,
    manufacturing_processes: Optional[str] = Query(None, description="Comma-separated list"),
    materials: Optional[str] = Query(None, description="Comma-separated list"),
    certifications: Optional[str] = Query(None, description="Comma-separated list"),
    countries: Optional[str] = Query(None, description="Comma-separated country codes"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    pricing_model: Optional[str] = None,
    available_from: Optional[datetime] = None,
    max_lead_time_days: Optional[int] = None,
    required_quantity: Optional[int] = None,
    is_active: bool = True,
    is_public: bool = True,
    search_query: Optional[str] = None,
    
    # Sorting and pagination
    sort_by: str = Query(default="created_at", pattern="^(created_at|updated_at|priority_level|view_count|base_price)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """List production quotes with filtering and pagination"""
    
    # Base query - filter by status instead of is_active/is_public
    query = db.query(ProductionQuote)
    
    if is_active is not None:
        query = query.filter(ProductionQuote.is_active == is_active)
    
    if is_public is not None:
        query = query.filter(ProductionQuote.is_public == is_public)
    
    # Apply filters
    if production_quote_type:
        query = query.filter(ProductionQuote.production_quote_type == production_quote_type)
    
    if manufacturing_processes:
        processes = [p.strip() for p in manufacturing_processes.split(",")]
        # Use JSON containment for processes stored in JSON field
        for process in processes:
            query = query.filter(ProductionQuote.manufacturing_processes.like(f'%"{process}"%'))
    
    if materials:
        material_list = [m.strip() for m in materials.split(",")]
        # Use JSON containment for materials stored in JSON field
        for material in material_list:
            query = query.filter(ProductionQuote.materials.like(f'%"{material}"%'))
    
    if certifications:
        cert_list = [c.strip() for c in certifications.split(",")]
        # Use JSON containment for certifications stored in JSON field  
        for cert in cert_list:
            query = query.filter(ProductionQuote.certifications.like(f'%"{cert}"%'))
    
    if countries:
        country_list = [c.strip() for c in countries.split(",")]
        # Store countries in preferred_countries JSON
        for country in country_list:
            query = query.filter(ProductionQuote.preferred_countries.like(f'%"{country}"%'))
    
    if min_price is not None:
        query = query.filter(ProductionQuote.base_price >= min_price)
    
    if max_price is not None:
        query = query.filter(ProductionQuote.base_price <= max_price)
    
    if pricing_model:
        query = query.filter(ProductionQuote.pricing_model == pricing_model)
    
    if available_from:
        query = query.filter(
            or_(
                ProductionQuote.available_from.is_(None),
                ProductionQuote.available_from <= available_from
            )
        )
    
    if max_lead_time_days:
        query = query.filter(
            or_(
                ProductionQuote.lead_time_days.is_(None),
                ProductionQuote.lead_time_days <= max_lead_time_days
            )
        )
    
    if required_quantity:
        query = query.filter(
            and_(
                or_(
                    ProductionQuote.minimum_quantity.is_(None),
                    ProductionQuote.minimum_quantity <= required_quantity
                ),
                or_(
                    ProductionQuote.maximum_quantity.is_(None),
                    ProductionQuote.maximum_quantity >= required_quantity
                )
            )
        )
    
    if search_query:
        search_filter = or_(
            ProductionQuote.title.ilike(f"%{search_query}%"),
            ProductionQuote.description.ilike(f"%{search_query}%")
        )
        query = query.filter(search_filter)
    
    # Apply sorting
    sort_column = getattr(ProductionQuote, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Apply pagination
    offset = (page - 1) * page_size
    production_quotes = query.offset(offset).limit(page_size).all()
    
    return production_quotes


@router.get("/my-quotes", response_model=List[ProductionQuoteResponse])
def get_my_production_quotes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current manufacturer's production quotes"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can access this endpoint"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    production_quotes = db.query(ProductionQuote).filter(
        ProductionQuote.manufacturer_id == manufacturer.id
    ).order_by(desc(ProductionQuote.created_at)).all()
    
    return production_quotes


@router.get("/{production_quote_id}", response_model=ProductionQuoteResponse)
def get_production_quote(
    production_quote_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get a specific production quote by ID"""
    production_quote = db.query(ProductionQuote).filter(
        ProductionQuote.id == production_quote_id
    ).first()
    
    if not production_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production quote not found"
        )
    
    # Check visibility - assume all production quotes are public for now
    # TODO: Add is_public field to ProductionQuote model if needed
    
    # Increment view count (if not the owner viewing)
    if current_user:
        manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
        if not manufacturer or manufacturer.id != production_quote.manufacturer_id:
            production_quote.view_count = (production_quote.view_count or 0) + 1
            db.commit()
    else:
        production_quote.view_count = (production_quote.view_count or 0) + 1
        db.commit()
    
    return production_quote


@router.put("/{production_quote_id}", response_model=ProductionQuoteResponse)
def update_production_quote(
    production_quote_id: int,
    production_quote_update: ProductionQuoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a production quote (owner only)"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can update production quotes"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    production_quote = db.query(ProductionQuote).filter(
        ProductionQuote.id == production_quote_id,
        ProductionQuote.manufacturer_id == manufacturer.id
    ).first()
    
    if not production_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production quote not found or you don't have permission to update it"
        )
    
    # Update fields
    update_data = production_quote_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(production_quote, field, value)
    
    production_quote.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(production_quote)
    
    return production_quote


@router.delete("/{production_quote_id}")
def delete_production_quote(
    production_quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a production quote (owner only)"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can delete production quotes"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    production_quote = db.query(ProductionQuote).filter(
        ProductionQuote.id == production_quote_id,
        ProductionQuote.manufacturer_id == manufacturer.id
    ).first()
    
    if not production_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production quote not found or you don't have permission to delete it"
        )
    
    db.delete(production_quote)
    db.commit()
    
    return {"message": "Production quote deleted successfully"}


# Production Quote Inquiry Endpoints

@router.post("/{production_quote_id}/inquire", response_model=ProductionQuoteInquiryResponse)
def create_inquiry(
    production_quote_id: int,
    inquiry: ProductionQuoteInquiryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an inquiry about a production quote (clients only)"""
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create inquiries"
        )
    
    production_quote = db.query(ProductionQuote).filter(
        ProductionQuote.id == production_quote_id,
        ProductionQuote.status == "active"
    ).first()
    
    if not production_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production quote not found or not available"
        )
    
    # Create inquiry
    db_inquiry = ProductionQuoteInquiry(
        production_quote_id=production_quote_id,
        client_id=current_user.id,
        **inquiry.dict()
    )
    
    db.add(db_inquiry)
    
    # Increment inquiry count
    production_quote.inquiry_count = (production_quote.inquiry_count or 0) + 1
    
    db.commit()
    db.refresh(db_inquiry)
    
    return db_inquiry


@router.get("/{production_quote_id}/inquiries", response_model=List[ProductionQuoteInquiryResponse])
def get_production_quote_inquiries(
    production_quote_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inquiries for a production quote (manufacturer only)"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can view inquiries"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    production_quote = db.query(ProductionQuote).filter(
        ProductionQuote.id == production_quote_id,
        ProductionQuote.manufacturer_id == manufacturer.id
    ).first()
    
    if not production_quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production quote not found or you don't have permission to view it"
        )
    
    inquiries = db.query(ProductionQuoteInquiry).filter(
        ProductionQuoteInquiry.production_quote_id == production_quote_id
    ).order_by(desc(ProductionQuoteInquiry.created_at)).all()
    
    return inquiries


@router.put("/inquiries/{inquiry_id}", response_model=ProductionQuoteInquiryResponse)
def respond_to_inquiry(
    inquiry_id: int,
    response: ProductionQuoteInquiryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Respond to a production quote inquiry (manufacturer only)"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can respond to inquiries"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    inquiry = db.query(ProductionQuoteInquiry).join(ProductionQuote).filter(
        ProductionQuoteInquiry.id == inquiry_id,
        ProductionQuote.manufacturer_id == manufacturer.id
    ).first()
    
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found or you don't have permission to respond"
        )
    
    # Update inquiry
    inquiry.manufacturer_response = response.manufacturer_response
    if response.status:
        inquiry.status = response.status
    inquiry.responded_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(inquiry)
    
    return inquiry


@router.get("/analytics", response_model=ProductionQuoteAnalytics)
def get_production_quote_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get production quote analytics for current manufacturer"""
    if current_user.role != UserRole.MANUFACTURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can view analytics"
        )
    
    manufacturer = db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
    if not manufacturer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manufacturer profile not found"
        )
    
    # Get basic metrics
    production_quotes = db.query(ProductionQuote).filter(
        ProductionQuote.manufacturer_id == manufacturer.id
    ).all()
    
    total_production_quotes = len(production_quotes)
    active_production_quotes = len([pq for pq in production_quotes if pq.is_active])
    total_views = sum(pq.view_count for pq in production_quotes)
    total_inquiries = sum(pq.inquiry_count for pq in production_quotes)
    total_conversions = sum(pq.conversion_count for pq in production_quotes)
    
    average_conversion_rate = (total_conversions / total_inquiries * 100) if total_inquiries > 0 else 0
    
    # Get top performing quotes
    top_performing_quotes = sorted(
        production_quotes, 
        key=lambda pq: pq.conversion_count, 
        reverse=True
    )[:5]
    
    # Add computed properties to top performing quotes
    for pq in top_performing_quotes:
        pq.is_valid = pq.is_valid
        pq.is_available_now = pq.is_available_now
    
    return ProductionQuoteAnalytics(
        total_production_quotes=total_production_quotes,
        active_production_quotes=active_production_quotes,
        total_views=total_views,
        total_inquiries=total_inquiries,
        total_conversions=total_conversions,
        average_conversion_rate=average_conversion_rate,
        top_performing_quotes=top_performing_quotes,
        views_trend=[],  # TODO: Implement trend analysis
        inquiries_trend=[],  # TODO: Implement trend analysis
        conversions_trend=[]  # TODO: Implement trend analysis
    ) 