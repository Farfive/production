from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime, timedelta
import random

from app.core.auth import get_current_user
from app.database import get_db
from app.schemas.auth import UserResponse

router = APIRouter()

@router.get("/suppliers")
async def get_suppliers_simple(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get suppliers for frontend dashboard"""
    try:
        # Generate realistic supplier data
        suppliers = []
        supplier_names = ['Acme Materials', 'Global Steel Corp', 'Precision Parts Ltd', 'Quality Components', 'Tech Solutions Inc', 'Reliable Supplies', 'Prime Materials', 'Advanced Manufacturing']
        categories = ['Raw Materials', 'Components', 'Electronics', 'Packaging', 'Tools', 'Consumables']
        locations = ['North America', 'Europe', 'Asia', 'South America']
        
        for i in range(12):
            suppliers.append({
                "id": i + 1,
                "name": supplier_names[i % len(supplier_names)],
                "category": categories[i % len(categories)],
                "location": locations[i % len(locations)],
                "rating": round(3 + random.random() * 2, 1),
                "reliability": round(70 + random.random() * 30, 1),
                "qualityScore": round(75 + random.random() * 25, 1),
                "deliveryPerformance": round(80 + random.random() * 20, 1),
                "totalSpend": int(50000 + random.random() * 500000),
                "activeContracts": 1 + int(random.random() * 5),
                "riskLevel": random.choice(['low', 'medium', 'high', 'critical']),
                "certifications": random.choices(['ISO 9001', 'ISO 14001', 'OHSAS 18001'], k=random.randint(1, 3)),
                "lastAudit": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
                "paymentTerms": random.choice(['Net 30', 'Net 60', '2/10 Net 30']),
                "leadTime": 5 + random.randint(0, 20),
                "capacity": int(1000 + random.random() * 9000),
                "utilization": round(60 + random.random() * 40, 1)
            })
        
        return {
            "status": "success",
            "data": suppliers
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch suppliers: {str(e)}"
        )

@router.get("/inventory")
async def get_inventory_simple(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get inventory for frontend dashboard"""
    try:
        # Generate realistic inventory data
        inventory = []
        materials = ['Steel Sheets', 'Aluminum Bars', 'Copper Wire', 'Plastic Pellets', 'Electronic Components', 'Fasteners', 'Bearings', 'Seals']
        categories = ['Raw Materials', 'Components', 'Hardware', 'Electronics']
        
        for i in range(20):
            current_stock = random.randint(50, 1000)
            minimum_stock = int(current_stock * 0.2)
            unit_price = round(5 + random.random() * 95, 2)
            
            status = 'optimal'
            if current_stock < minimum_stock:
                status = 'low'
            elif current_stock < minimum_stock * 0.5:
                status = 'critical'
            elif current_stock > minimum_stock * 3:
                status = 'overstock'
            
            inventory.append({
                "id": i + 1,
                "materialCode": f"MAT-{str(i + 1).zfill(3)}",
                "name": materials[i % len(materials)],
                "category": categories[i % len(categories)],
                "currentStock": current_stock,
                "minimumStock": minimum_stock,
                "maximumStock": int(current_stock * 2.5),
                "unitPrice": unit_price,
                "totalValue": round(current_stock * unit_price, 2),
                "location": f"Warehouse {chr(65 + i // 5)}",
                "supplier": f"Supplier {random.randint(1, 5)}",
                "lastReplenishment": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "turnoverRate": round(4 + random.random() * 8, 1),
                "safetyStock": int(minimum_stock * 1.5),
                "leadTime": 7 + random.randint(0, 14),
                "status": status,
                "demand30d": random.randint(50, 200),
                "demand90d": random.randint(150, 600)
            })
        
        return {
            "status": "success",
            "data": inventory
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch inventory: {str(e)}"
        )

@router.get("/metrics")
async def get_metrics_simple(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supply chain metrics for frontend dashboard"""
    try:
        metrics = {
            "totalSuppliers": 12,
            "activeContracts": 28,
            "totalSpend": 2500000,
            "avgDeliveryTime": round(12.5 + (random.random() - 0.5) * 2, 1),
            "supplierReliability": round(89.2 + (random.random() - 0.5) * 5, 1),
            "inventoryTurnover": round(6.8 + (random.random() - 0.5) * 1, 1),
            "stockoutRisk": round(15.3 + (random.random() - 0.5) * 3, 1),
            "costSavings": 125000 + random.randint(-10000, 10000),
            "qualityScore": round(92.1 + (random.random() - 0.5) * 2, 1),
            "sustainabilityScore": round(78.5 + (random.random() - 0.5) * 3, 1)
        }
        
        return {
            "status": "success",
            "data": metrics
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch metrics: {str(e)}"
        )

@router.get("/alerts")
async def get_alerts_simple(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supply chain alerts for frontend dashboard"""
    try:
        alerts = []
        
        # Generate some realistic alerts
        alert_types = [
            {"type": "critical", "message": "3 items critically low on stock"},
            {"type": "warning", "message": "2 suppliers flagged as high risk"},
            {"type": "info", "message": "New shipment arriving tomorrow"},
            {"type": "warning", "message": "Quality issue reported with Supplier ABC"},
            {"type": "critical", "message": "Steel inventory below safety stock"}
        ]
        
        # Randomly select some alerts
        num_alerts = random.randint(2, 4)
        selected_alerts = random.sample(alert_types, num_alerts)
        
        for i, alert in enumerate(selected_alerts):
            alerts.append({
                "id": i + 1,
                "type": alert["type"],
                "message": alert["message"],
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 480))).isoformat(),
                "acknowledged": random.random() < 0.3
            })
        
        return {
            "status": "success",
            "data": alerts
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch alerts: {str(e)}"
        ) 