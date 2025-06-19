from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.quote_templates import QuoteTemplate
from app.schemas.quote_templates import (
    QuoteTemplateCreate,
    QuoteTemplateUpdate,
    QuoteTemplateResponse,
    QuoteTemplateSearchParams
)
from app.services.quote_template_service import QuoteTemplateService

router = APIRouter(prefix="/quote-templates", tags=["quote-templates"])

@router.get("/", response_model=List[QuoteTemplateResponse])
async def list_quote_templates(
    public_only: bool = False,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List quote templates with filtering options."""
    service = QuoteTemplateService(db)
    
    # Build query filters
    filters = []
    
    if public_only:
        filters.append(QuoteTemplate.is_public == True)
    else:
        # Show public templates + user's own templates
        filters.append(
            or_(
                QuoteTemplate.is_public == True,
                QuoteTemplate.created_by == current_user.id
            )
        )
    
    if category:
        filters.append(QuoteTemplate.category == category)
    
    templates = service.list_templates(
        filters=filters,
        limit=limit,
        offset=offset
    )
    
    return templates

@router.get("/{template_id}", response_model=QuoteTemplateResponse)
async def get_quote_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific quote template."""
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Check if user can access this template
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )
    
    return template

@router.post("/", response_model=QuoteTemplateResponse)
async def create_quote_template(
    template_data: QuoteTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quote template."""
    if current_user.role != "manufacturer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can create quote templates"
        )
    
    service = QuoteTemplateService(db)
    template = service.create_template(template_data, current_user.id)
    
    return template

@router.put("/{template_id}", response_model=QuoteTemplateResponse)
async def update_quote_template(
    template_id: int,
    template_data: QuoteTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quote template."""
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Only owner can update template
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own templates"
        )
    
    updated_template = service.update_template(template_id, template_data)
    return updated_template

@router.delete("/{template_id}")
async def delete_quote_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a quote template."""
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Only owner can delete template
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own templates"
        )
    
    service.delete_template(template_id)
    return {"message": "Template deleted successfully"}

@router.post("/{template_id}/clone", response_model=QuoteTemplateResponse)
async def clone_quote_template(
    template_id: int,
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clone an existing quote template."""
    if current_user.role != "manufacturer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manufacturers can clone templates"
        )
    
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Check if user can access this template
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this template"
        )
    
    cloned_template = service.clone_template(template_id, current_user.id, name)
    return cloned_template

@router.post("/{template_id}/rate")
async def rate_quote_template(
    template_id: int,
    rating: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rate a quote template (1-5 stars)."""
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Can't rate your own template
    if template.created_by == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot rate your own template"
        )
    
    service.rate_template(template_id, current_user.id, rating)
    return {"message": "Template rated successfully"}

@router.get("/search", response_model=List[QuoteTemplateResponse])
async def search_quote_templates(
    q: str,
    category: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search quote templates by name, description, or keywords."""
    service = QuoteTemplateService(db)
    
    templates = service.search_templates(
        query=q,
        category=category,
        user_id=current_user.id,
        limit=limit
    )
    
    return templates

@router.get("/{template_id}/analytics")
async def get_template_analytics(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage analytics for a quote template."""
    service = QuoteTemplateService(db)
    template = service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote template not found"
        )
    
    # Only owner can view analytics
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view analytics for your own templates"
        )
    
    analytics = service.get_template_analytics(template_id)
    return analytics

@router.get("/category/{category}", response_model=List[QuoteTemplateResponse])
async def get_templates_by_category(
    category: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quote templates by category."""
    service = QuoteTemplateService(db)
    
    templates = service.get_templates_by_category(
        category=category,
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )
    
    return templates 