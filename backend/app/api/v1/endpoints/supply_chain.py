"""
Supply Chain Management API Endpoints

RESTful API endpoints for comprehensive supply chain operations including
material management, vendor management, inventory control, and procurement.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.supply_chain_service import supply_chain_service
from app.schemas.supply_chain import (
    MaterialCreate, MaterialResponse, MaterialUpdate, MaterialSearch,
    VendorCreate, VendorResponse, VendorUpdate, VendorSearch,
    MaterialVendorCreate, MaterialVendorResponse,
    InventoryItemResponse, InventoryTransactionCreate, InventoryTransactionResponse,
    PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderUpdate,
    MaterialReceiptCreate, MaterialReceiptResponse,
    QualityRecordCreate, QualityRecordResponse,
    InventorySummaryResponse, VendorPerformanceResponse,
    InventoryTurnoverResponse
)

router = APIRouter()


# Material Management Endpoints
@router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new material"""
    try:
        created_material = supply_chain_service.create_material(
            db=db,
            material_data=material.dict(),
            created_by_id=current_user.id
        )
        return created_material
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/materials/{material_code}", response_model=MaterialResponse)
async def get_material(
    material_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get material by code"""
    material = supply_chain_service.get_material_by_code(db, material_code)
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    return material


@router.post("/materials/search", response_model=List[MaterialResponse])
async def search_materials(
    search_criteria: MaterialSearch,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search materials with various criteria"""
    materials = supply_chain_service.search_materials(
        db=db,
        search_criteria=search_criteria.dict(exclude_unset=True),
        limit=limit
    )
    return materials


@router.put("/materials/{material_id}/cost", response_model=MaterialResponse)
async def update_material_cost(
    material_id: int,
    new_cost: float,
    cost_type: str = Query("standard", pattern="^(standard|last)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update material cost"""
    try:
        material = supply_chain_service.update_material_cost(
            db=db,
            material_id=material_id,
            new_cost=Decimal(str(new_cost)),
            cost_type=cost_type
        )
        return material
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Vendor Management Endpoints
@router.post("/vendors", response_model=VendorResponse)
async def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new vendor"""
    try:
        created_vendor = supply_chain_service.create_vendor(
            db=db,
            vendor_data=vendor.dict()
        )
        return created_vendor
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/vendors/search", response_model=List[VendorResponse])
async def search_vendors(
    search_criteria: VendorSearch,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search vendors with various criteria"""
    vendors = supply_chain_service.search_vendors(
        db=db,
        search_criteria=search_criteria.dict(exclude_unset=True),
        limit=limit
    )
    return vendors


@router.put("/vendors/{vendor_id}/approve", response_model=VendorResponse)
async def approve_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a vendor for business"""
    try:
        vendor = supply_chain_service.approve_vendor(
            db=db,
            vendor_id=vendor_id,
            approved_by_id=current_user.id
        )
        return vendor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/vendors/{vendor_id}/performance", response_model=VendorResponse)
async def update_vendor_performance(
    vendor_id: int,
    performance_data: Dict[str, float],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update vendor performance metrics"""
    try:
        vendor = supply_chain_service.update_vendor_performance(
            db=db,
            vendor_id=vendor_id,
            performance_data=performance_data
        )
        return vendor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/vendors/{vendor_id}/performance-analytics", response_model=VendorPerformanceResponse)
async def get_vendor_performance_analytics(
    vendor_id: int,
    period_days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive vendor performance analytics"""
    analytics = supply_chain_service.get_vendor_performance_analytics(
        db=db,
        vendor_id=vendor_id,
        period_days=period_days
    )
    return analytics


# Material-Vendor Relationship Endpoints
@router.post("/materials/{material_id}/vendors", response_model=MaterialVendorResponse)
async def add_material_vendor(
    material_id: int,
    vendor_data: MaterialVendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add vendor as supplier for a material"""
    try:
        material_vendor = supply_chain_service.add_material_vendor(
            db=db,
            material_id=material_id,
            vendor_id=vendor_data.vendor_id,
            vendor_data=vendor_data.dict(exclude={'vendor_id'})
        )
        return material_vendor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/materials/{material_id}/vendors", response_model=List[MaterialVendorResponse])
async def get_material_vendors(
    material_id: int,
    preferred_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendors for a material"""
    vendors = supply_chain_service.get_material_vendors(
        db=db,
        material_id=material_id,
        preferred_only=preferred_only
    )
    return vendors


@router.get("/materials/{material_id}/best-vendor", response_model=Optional[MaterialVendorResponse])
async def get_best_vendor_for_material(
    material_id: int,
    quantity: float,
    required_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find best vendor for material based on price, lead time, and performance"""
    best_vendor = supply_chain_service.get_best_vendor_for_material(
        db=db,
        material_id=material_id,
        quantity=Decimal(str(quantity)),
        required_date=required_date
    )
    return best_vendor


# Inventory Management Endpoints
@router.get("/inventory/summary", response_model=InventorySummaryResponse)
async def get_inventory_summary(
    location_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get inventory summary by location"""
    summary = supply_chain_service.get_inventory_summary(
        db=db,
        location_id=location_id
    )
    return summary


@router.post("/inventory/transactions", response_model=InventoryTransactionResponse)
async def record_inventory_transaction(
    transaction: InventoryTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record an inventory transaction"""
    try:
        recorded_transaction = supply_chain_service.record_inventory_transaction(
            db=db,
            transaction_data=transaction.dict(),
            created_by_id=current_user.id
        )
        return recorded_transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/inventory/allocate")
async def allocate_inventory(
    material_id: int,
    quantity: float,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allocate inventory for an order"""
    success = supply_chain_service.allocate_inventory(
        db=db,
        material_id=material_id,
        quantity=Decimal(str(quantity)),
        order_id=order_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient inventory available"
        )
    
    return {"message": "Inventory allocated successfully"}


@router.get("/inventory/turnover-analysis", response_model=InventoryTurnoverResponse)
async def get_inventory_turnover_analysis(
    material_id: Optional[int] = Query(None),
    period_days: int = Query(365, ge=30, le=730),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate inventory turnover analysis"""
    analysis = supply_chain_service.get_inventory_turnover_analysis(
        db=db,
        material_id=material_id,
        period_days=period_days
    )
    return analysis


# Purchase Order Management Endpoints
@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    po_data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a purchase order with items"""
    try:
        purchase_order = supply_chain_service.create_purchase_order(
            db=db,
            po_data=po_data.dict(exclude={'items'}),
            items=[item.dict() for item in po_data.items],
            created_by_id=current_user.id
        )
        return purchase_order
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/purchase-orders/{po_id}/approve", response_model=PurchaseOrderResponse)
async def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a purchase order"""
    try:
        po = supply_chain_service.approve_purchase_order(
            db=db,
            po_id=po_id,
            approved_by_id=current_user.id
        )
        return po
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Material Receipt Endpoints
@router.post("/material-receipts", response_model=MaterialReceiptResponse)
async def receive_material(
    receipt_data: MaterialReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record material receipt"""
    try:
        receipt = supply_chain_service.receive_material(
            db=db,
            receipt_data=receipt_data.dict(exclude={'items'}),
            items=[item.dict() for item in receipt_data.items],
            received_by_id=current_user.id
        )
        return receipt
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Quality Management Endpoints
@router.post("/quality-records", response_model=QualityRecordResponse)
async def record_quality_inspection(
    inspection: QualityRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record quality inspection results"""
    try:
        quality_record = supply_chain_service.record_quality_inspection(
            db=db,
            inspection_data=inspection.dict(),
            inspector_id=current_user.id
        )
        return quality_record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Advanced Analytics Endpoints
@router.get("/analytics/supply-chain-kpis")
async def get_supply_chain_kpis(
    period_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive supply chain KPIs"""
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=period_days)
    
    # This would be implemented with complex queries
    # For now, returning a structure
    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date,
            "days": period_days
        },
        "procurement_kpis": {
            "total_purchase_orders": 0,
            "total_procurement_value": 0.0,
            "average_po_cycle_time": 0.0,
            "supplier_performance_score": 0.0,
            "cost_savings_achieved": 0.0
        },
        "inventory_kpis": {
            "inventory_turnover": 0.0,
            "days_of_supply": 0.0,
            "stockout_incidents": 0,
            "excess_inventory_value": 0.0,
            "inventory_accuracy": 0.0
        },
        "quality_kpis": {
            "incoming_quality_rate": 0.0,
            "supplier_quality_score": 0.0,
            "quality_cost": 0.0,
            "defect_rate": 0.0
        },
        "delivery_kpis": {
            "on_time_delivery_rate": 0.0,
            "lead_time_variance": 0.0,
            "delivery_performance_score": 0.0
        }
    }


@router.get("/analytics/abc-analysis")
async def get_abc_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ABC analysis of materials based on usage value"""
    
    # This would implement ABC analysis logic
    return {
        "analysis_date": datetime.now(),
        "total_materials": 0,
        "categories": {
            "A": {
                "count": 0,
                "percentage": 0.0,
                "value_percentage": 0.0,
                "materials": []
            },
            "B": {
                "count": 0,
                "percentage": 0.0,
                "value_percentage": 0.0,
                "materials": []
            },
            "C": {
                "count": 0,
                "percentage": 0.0,
                "value_percentage": 0.0,
                "materials": []
            }
        }
    }


@router.get("/analytics/vendor-spend-analysis")
async def get_vendor_spend_analysis(
    period_days: int = Query(365, ge=30, le=730),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vendor spend analysis"""
    
    return {
        "period_days": period_days,
        "total_spend": 0.0,
        "vendor_count": 0,
        "top_vendors": [],
        "spend_by_category": {},
        "spend_trend": [],
        "concentration_risk": {
            "top_5_percentage": 0.0,
            "top_10_percentage": 0.0,
            "risk_level": "low"
        }
    }


@router.get("/reports/material-shortage-forecast")
async def get_material_shortage_forecast(
    forecast_days: int = Query(90, ge=30, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Forecast potential material shortages"""
    
    return {
        "forecast_period_days": forecast_days,
        "analysis_date": datetime.now(),
        "potential_shortages": [],
        "recommendations": [],
        "risk_summary": {
            "high_risk_materials": 0,
            "medium_risk_materials": 0,
            "low_risk_materials": 0
        }
    }


@router.get("/reports/supplier-risk-assessment")
async def get_supplier_risk_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive supplier risk assessment"""
    
    return {
        "assessment_date": datetime.now(),
        "total_suppliers": 0,
        "risk_distribution": {
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0
        },
        "risk_factors": {
            "financial_risk": [],
            "operational_risk": [],
            "geographic_risk": [],
            "compliance_risk": []
        },
        "mitigation_recommendations": []
    } 