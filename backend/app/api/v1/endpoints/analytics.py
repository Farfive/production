from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
import io
import pandas as pd

from app.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.quotes import Quote
from app.models.orders import Order
from app.services.analytics_service import AnalyticsService
from app.services.export_service import ExportService

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/quotes")
async def get_quote_analytics(
    timeRange: str = "30d",
    category: Optional[str] = None,
    userId: Optional[int] = None,
    manufacturerId: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive quote analytics."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Build filters
    filters = {
        "start_date": start_date,
        "category": category,
        "user_id": userId or current_user.id,
        "manufacturer_id": manufacturerId
    }
    
    # Check permissions
    if userId and userId != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to other users' analytics"
        )
    
    analytics = service.get_quote_analytics(filters)
    return analytics

@router.get("/performance")
async def get_performance_metrics(
    timeRange: str = "30d",
    userId: Optional[int] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get performance metrics and KPIs."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "user_id": userId or current_user.id,
        "role": role or current_user.role
    }
    
    # Check permissions
    if userId and userId != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to other users' performance data"
        )
    
    metrics = service.get_performance_metrics(filters)
    return metrics

@router.get("/revenue")
async def get_revenue_analytics(
    timeRange: str = "30d",
    breakdown: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get revenue analytics and forecasts."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "breakdown": breakdown,
        "user_id": current_user.id if current_user.role != "admin" else None
    }
    
    revenue_data = service.get_revenue_analytics(filters)
    return revenue_data

@router.get("/customers")
async def get_customer_analytics(
    timeRange: str = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer analytics and retention metrics."""
    if current_user.role not in ["manufacturer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to customer analytics"
        )
    
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "manufacturer_id": current_user.id if current_user.role == "manufacturer" else None
    }
    
    customer_data = service.get_customer_analytics(filters)
    return customer_data

@router.get("/competitive")
async def get_competitive_analysis(
    timeRange: str = "30d",
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get competitive analysis and market positioning."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "category": category,
        "user_id": current_user.id
    }
    
    competitive_data = service.get_competitive_analysis(filters)
    return competitive_data

@router.get("/realtime")
async def get_realtime_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get real-time dashboard data."""
    service = AnalyticsService(db)
    
    realtime_data = service.get_realtime_dashboard(current_user.id, current_user.role)
    return realtime_data

@router.get("/export")
async def export_analytics(
    timeRange: str = "30d",
    category: Optional[str] = None,
    format: str = "excel",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export analytics data in various formats."""
    service = AnalyticsService(db)
    export_service = ExportService()
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "category": category,
        "user_id": current_user.id
    }
    
    # Get analytics data
    analytics_data = service.get_quote_analytics(filters)
    
    # Export data
    if format == "excel":
        excel_buffer = export_service.export_analytics_to_excel(analytics_data)
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.getvalue()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=analytics_{timeRange}.xlsx"}
        )
    
    elif format == "csv":
        csv_data = export_service.export_analytics_to_csv(analytics_data)
        
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analytics_{timeRange}.csv"}
        )
    
    elif format == "pdf":
        pdf_buffer = export_service.export_analytics_to_pdf(analytics_data)
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer.getvalue()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analytics_{timeRange}.pdf"}
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported export format"
        )

@router.get("/forecast")
async def get_forecast_data(
    timeRange: str = "30d",
    metric: str = "revenue",
    periods: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get forecast data for various metrics."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "metric": metric,
        "periods": periods,
        "user_id": current_user.id
    }
    
    forecast_data = service.get_forecast_data(filters)
    return forecast_data

@router.get("/funnel")
async def get_conversion_funnel(
    timeRange: str = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get conversion funnel analysis."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "user_id": current_user.id
    }
    
    funnel_data = service.get_conversion_funnel(filters)
    return funnel_data

@router.get("/heatmap")
async def get_heatmap_data(
    timeRange: str = "30d",
    metric: str = "activity",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get heatmap data for activity patterns."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "metric": metric,
        "user_id": current_user.id
    }
    
    heatmap_data = service.get_heatmap_data(filters)
    return heatmap_data

@router.get("/benchmarks")
async def get_industry_benchmarks(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get industry benchmarks and comparisons."""
    service = AnalyticsService(db)
    
    filters = {
        "category": category,
        "user_id": current_user.id,
        "role": current_user.role
    }
    
    benchmarks = service.get_industry_benchmarks(filters)
    return benchmarks

@router.get("/trends")
async def get_market_trends(
    timeRange: str = "90d",
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get market trends and predictions."""
    service = AnalyticsService(db)
    
    # Parse time range
    days_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = days_map.get(timeRange, 90)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    filters = {
        "start_date": start_date,
        "category": category
    }
    
    trends = service.get_market_trends(filters)
    return trends 