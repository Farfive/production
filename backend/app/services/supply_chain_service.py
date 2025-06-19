"""
Supply Chain Management Service

Comprehensive service for managing supply chain operations including
material tracking, vendor management, inventory control, and procurement.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from decimal import Decimal
import json

from app.models.supply_chain import (
    Material, Vendor, MaterialVendor, InventoryItem, InventoryLocation,
    InventoryTransaction, PurchaseOrder, PurchaseOrderItem, MaterialReceipt,
    QualityRecord, VendorPerformanceReview, BillOfMaterial,
    MaterialCategory, VendorStatus, PurchaseOrderStatus, InventoryTransactionType,
    QualityStatus
)
from app.models.order import Order
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)


class SupplyChainService:
    """Comprehensive supply chain management service"""
    
    def __init__(self):
        self.logger = logger
    
    # Material Management
    def create_material(
        self,
        db: Session,
        material_data: Dict[str, Any],
        created_by_id: int
    ) -> Material:
        """Create a new material with comprehensive data"""
        
        try:
            # Generate material code if not provided
            if not material_data.get('material_code'):
                material_data['material_code'] = self._generate_material_code(
                    db, material_data.get('category')
                )
            
            material = Material(
                **material_data,
                created_by_id=created_by_id
            )
            
            db.add(material)
            db.commit()
            db.refresh(material)
            
            self.logger.info(f"Created material: {material.material_code}")
            return material
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error creating material: {str(e)}")
            raise
    
    def get_material_by_code(self, db: Session, material_code: str) -> Optional[Material]:
        """Get material by code"""
        return db.query(Material).filter(Material.material_code == material_code).first()
    
    def search_materials(
        self,
        db: Session,
        search_criteria: Dict[str, Any],
        limit: int = 50
    ) -> List[Material]:
        """Search materials with various criteria"""
        
        query = db.query(Material)
        
        # Text search
        if search_criteria.get('search_text'):
            search_text = f"%{search_criteria['search_text']}%"
            query = query.filter(
                or_(
                    Material.name.ilike(search_text),
                    Material.material_code.ilike(search_text),
                    Material.description.ilike(search_text)
                )
            )
        
        # Category filter
        if search_criteria.get('category'):
            query = query.filter(Material.category == search_criteria['category'])
        
        # Status filter
        if search_criteria.get('status'):
            query = query.filter(Material.status == search_criteria['status'])
        
        # Material group filter
        if search_criteria.get('material_group'):
            query = query.filter(Material.material_group == search_criteria['material_group'])
        
        return query.limit(limit).all()
    
    def update_material_cost(
        self,
        db: Session,
        material_id: int,
        new_cost: Decimal,
        cost_type: str = "standard"
    ) -> Material:
        """Update material cost information"""
        
        material = db.query(Material).filter(Material.id == material_id).first()
        if not material:
            raise ValueError("Material not found")
        
        if cost_type == "standard":
            material.standard_cost_pln = new_cost
        elif cost_type == "last":
            material.last_cost_pln = new_cost
        
        # Recalculate average cost
        material.average_cost_pln = self._calculate_average_cost(db, material_id)
        material.cost_updated_at = datetime.now()
        
        db.commit()
        return material
    
    # Vendor Management
    def create_vendor(
        self,
        db: Session,
        vendor_data: Dict[str, Any]
    ) -> Vendor:
        """Create a new vendor"""
        
        try:
            # Generate vendor code if not provided
            if not vendor_data.get('vendor_code'):
                vendor_data['vendor_code'] = self._generate_vendor_code(db)
            
            vendor = Vendor(**vendor_data)
            db.add(vendor)
            db.commit()
            db.refresh(vendor)
            
            self.logger.info(f"Created vendor: {vendor.vendor_code}")
            return vendor
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error creating vendor: {str(e)}")
            raise
    
    def approve_vendor(
        self,
        db: Session,
        vendor_id: int,
        approved_by_id: int
    ) -> Vendor:
        """Approve a vendor for business"""
        
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise ValueError("Vendor not found")
        
        vendor.status = VendorStatus.ACTIVE
        vendor.approved_by_id = approved_by_id
        vendor.approved_at = datetime.now()
        
        db.commit()
        
        self.logger.info(f"Approved vendor: {vendor.vendor_code}")
        return vendor
    
    def search_vendors(
        self,
        db: Session,
        search_criteria: Dict[str, Any],
        limit: int = 50
    ) -> List[Vendor]:
        """Search vendors with various criteria"""
        
        query = db.query(Vendor)
        
        # Text search
        if search_criteria.get('search_text'):
            search_text = f"%{search_criteria['search_text']}%"
            query = query.filter(
                or_(
                    Vendor.company_name.ilike(search_text),
                    Vendor.vendor_code.ilike(search_text)
                )
            )
        
        # Status filter
        if search_criteria.get('status'):
            query = query.filter(Vendor.status == search_criteria['status'])
        
        # Tier filter
        if search_criteria.get('tier'):
            query = query.filter(Vendor.tier == search_criteria['tier'])
        
        # Capability filter
        if search_criteria.get('capabilities'):
            for capability in search_criteria['capabilities']:
                query = query.filter(
                    Vendor.capabilities.contains(capability)
                )
        
        return query.order_by(desc(Vendor.overall_rating)).limit(limit).all()
    
    def update_vendor_performance(
        self,
        db: Session,
        vendor_id: int,
        performance_data: Dict[str, Any]
    ) -> Vendor:
        """Update vendor performance metrics"""
        
        vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if not vendor:
            raise ValueError("Vendor not found")
        
        # Update individual ratings
        if 'quality_rating' in performance_data:
            vendor.quality_rating = performance_data['quality_rating']
        if 'delivery_rating' in performance_data:
            vendor.delivery_rating = performance_data['delivery_rating']
        if 'service_rating' in performance_data:
            vendor.service_rating = performance_data['service_rating']
        
        # Recalculate overall rating
        ratings = [
            vendor.quality_rating or 0,
            vendor.delivery_rating or 0,
            vendor.service_rating or 0
        ]
        vendor.overall_rating = sum(ratings) / len([r for r in ratings if r > 0])
        
        db.commit()
        return vendor
    
    # Material-Vendor Relationships
    def add_material_vendor(
        self,
        db: Session,
        material_id: int,
        vendor_id: int,
        vendor_data: Dict[str, Any]
    ) -> MaterialVendor:
        """Add vendor as supplier for a material"""
        
        # Check if relationship already exists
        existing = db.query(MaterialVendor).filter(
            and_(
                MaterialVendor.material_id == material_id,
                MaterialVendor.vendor_id == vendor_id
            )
        ).first()
        
        if existing:
            raise ValueError("Material-vendor relationship already exists")
        
        material_vendor = MaterialVendor(
            material_id=material_id,
            vendor_id=vendor_id,
            **vendor_data
        )
        
        db.add(material_vendor)
        db.commit()
        db.refresh(material_vendor)
        
        return material_vendor
    
    def get_material_vendors(
        self,
        db: Session,
        material_id: int,
        preferred_only: bool = False
    ) -> List[MaterialVendor]:
        """Get vendors for a material"""
        
        query = db.query(MaterialVendor).filter(
            MaterialVendor.material_id == material_id
        )
        
        if preferred_only:
            query = query.filter(MaterialVendor.is_preferred == True)
        
        return query.order_by(
            desc(MaterialVendor.is_preferred),
            MaterialVendor.current_price_pln
        ).all()
    
    def get_best_vendor_for_material(
        self,
        db: Session,
        material_id: int,
        quantity: Decimal,
        required_date: Optional[datetime] = None
    ) -> Optional[MaterialVendor]:
        """Find best vendor for material based on price, lead time, and performance"""
        
        vendors = self.get_material_vendors(db, material_id)
        if not vendors:
            return None
        
        best_vendor = None
        best_score = 0
        
        for vendor in vendors:
            score = self._calculate_vendor_score(vendor, quantity, required_date)
            if score > best_score:
                best_score = score
                best_vendor = vendor
        
        return best_vendor
    
    # Inventory Management
    def get_inventory_summary(
        self,
        db: Session,
        location_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Get inventory summary by location"""
        
        query = db.query(InventoryItem)
        
        if location_id:
            query = query.filter(InventoryItem.location_id == location_id)
        
        items = query.all()
        
        summary = {
            'total_items': len(items),
            'total_value': sum(item.total_value_pln or 0 for item in items),
            'low_stock_items': [],
            'expired_items': [],
            'quarantined_items': []
        }
        
        for item in items:
            # Check low stock
            if (item.available_qty <= item.material.safety_stock_qty):
                summary['low_stock_items'].append({
                    'material_code': item.material.material_code,
                    'available_qty': float(item.available_qty),
                    'safety_stock': float(item.material.safety_stock_qty)
                })
            
            # Check expired items
            if item.expiry_date and item.expiry_date <= datetime.now():
                summary['expired_items'].append({
                    'material_code': item.material.material_code,
                    'expiry_date': item.expiry_date,
                    'quantity': float(item.on_hand_qty)
                })
            
            # Check quarantined items
            if item.quality_status == QualityStatus.QUARANTINED:
                summary['quarantined_items'].append({
                    'material_code': item.material.material_code,
                    'quantity': float(item.on_hand_qty),
                    'reason': item.quarantine_reason
                })
        
        return summary
    
    def record_inventory_transaction(
        self,
        db: Session,
        transaction_data: Dict[str, Any],
        created_by_id: int
    ) -> InventoryTransaction:
        """Record an inventory transaction"""
        
        try:
            # Get inventory item
            inventory_item = db.query(InventoryItem).filter(
                InventoryItem.id == transaction_data['inventory_item_id']
            ).first()
            
            if not inventory_item:
                raise ValueError("Inventory item not found")
            
            # Calculate new balance
            quantity = Decimal(str(transaction_data['quantity']))
            transaction_type = transaction_data['transaction_type']
            
            balance_before = inventory_item.on_hand_qty
            
            if transaction_type in [InventoryTransactionType.RECEIPT, InventoryTransactionType.ADJUSTMENT]:
                balance_after = balance_before + quantity
            elif transaction_type in [InventoryTransactionType.ISSUE, InventoryTransactionType.SCRAP]:
                balance_after = balance_before - quantity
            else:
                balance_after = balance_before
            
            # Create transaction
            transaction = InventoryTransaction(
                inventory_item_id=transaction_data['inventory_item_id'],
                transaction_type=transaction_type,
                transaction_date=transaction_data.get('transaction_date', datetime.now()),
                quantity=quantity,
                balance_before=balance_before,
                balance_after=balance_after,
                created_by_id=created_by_id,
                **{k: v for k, v in transaction_data.items() 
                   if k not in ['inventory_item_id', 'transaction_type', 'quantity']}
            )
            
            # Update inventory item
            inventory_item.on_hand_qty = balance_after
            inventory_item.available_qty = balance_after - inventory_item.allocated_qty
            
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
            
            self.logger.info(f"Recorded inventory transaction: {transaction.id}")
            return transaction
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error recording inventory transaction: {str(e)}")
            raise
    
    def allocate_inventory(
        self,
        db: Session,
        material_id: int,
        quantity: Decimal,
        order_id: Optional[int] = None
    ) -> bool:
        """Allocate inventory for an order"""
        
        # Find available inventory
        inventory_items = db.query(InventoryItem).filter(
            and_(
                InventoryItem.material_id == material_id,
                InventoryItem.available_qty >= quantity,
                InventoryItem.quality_status == QualityStatus.PASSED
            )
        ).order_by(InventoryItem.expiry_date.asc().nullslast()).all()
        
        remaining_qty = quantity
        
        for item in inventory_items:
            if remaining_qty <= 0:
                break
            
            allocate_qty = min(remaining_qty, item.available_qty)
            
            item.allocated_qty += allocate_qty
            item.available_qty -= allocate_qty
            
            remaining_qty -= allocate_qty
        
        if remaining_qty > 0:
            return False  # Insufficient inventory
        
        db.commit()
        return True
    
    # Purchase Order Management
    def create_purchase_order(
        self,
        db: Session,
        po_data: Dict[str, Any],
        items: List[Dict[str, Any]],
        created_by_id: int
    ) -> PurchaseOrder:
        """Create a purchase order with items"""
        
        try:
            # Generate PO number if not provided
            if not po_data.get('po_number'):
                po_data['po_number'] = self._generate_po_number(db)
            
            # Create PO
            purchase_order = PurchaseOrder(
                **po_data,
                created_by_id=created_by_id,
                order_date=datetime.now()
            )
            
            db.add(purchase_order)
            db.flush()  # Get PO ID
            
            # Add items
            total_amount = Decimal('0')
            
            for i, item_data in enumerate(items, 1):
                po_item = PurchaseOrderItem(
                    purchase_order_id=purchase_order.id,
                    line_number=i,
                    **item_data
                )
                
                # Calculate line total
                po_item.line_total = po_item.ordered_qty * po_item.unit_price
                total_amount += po_item.line_total
                
                db.add(po_item)
            
            # Update PO totals
            purchase_order.subtotal = total_amount
            purchase_order.total_amount = total_amount + (purchase_order.tax_amount or 0) + (purchase_order.shipping_cost or 0)
            
            db.commit()
            db.refresh(purchase_order)
            
            self.logger.info(f"Created purchase order: {purchase_order.po_number}")
            return purchase_order
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error creating purchase order: {str(e)}")
            raise
    
    def approve_purchase_order(
        self,
        db: Session,
        po_id: int,
        approved_by_id: int
    ) -> PurchaseOrder:
        """Approve a purchase order"""
        
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise ValueError("Purchase order not found")
        
        po.status = PurchaseOrderStatus.APPROVED
        po.approved_by_id = approved_by_id
        po.approved_at = datetime.now()
        
        db.commit()
        
        self.logger.info(f"Approved purchase order: {po.po_number}")
        return po
    
    def receive_material(
        self,
        db: Session,
        receipt_data: Dict[str, Any],
        items: List[Dict[str, Any]],
        received_by_id: int
    ) -> MaterialReceipt:
        """Record material receipt"""
        
        try:
            # Generate receipt number if not provided
            if not receipt_data.get('receipt_number'):
                receipt_data['receipt_number'] = self._generate_receipt_number(db)
            
            # Create receipt
            receipt = MaterialReceipt(
                **receipt_data,
                received_by_id=received_by_id,
                receipt_date=datetime.now()
            )
            
            db.add(receipt)
            db.flush()
            
            # Process receipt items
            for item_data in items:
                receipt_item = MaterialReceiptItem(
                    receipt_id=receipt.id,
                    **item_data
                )
                
                db.add(receipt_item)
                
                # Update PO item received quantity
                po_item = db.query(PurchaseOrderItem).filter(
                    PurchaseOrderItem.id == item_data['po_item_id']
                ).first()
                
                if po_item:
                    po_item.received_qty += receipt_item.received_qty
                
                # Create/update inventory
                self._update_inventory_from_receipt(db, receipt_item)
            
            db.commit()
            db.refresh(receipt)
            
            self.logger.info(f"Recorded material receipt: {receipt.receipt_number}")
            return receipt
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error recording material receipt: {str(e)}")
            raise
    
    # Quality Management
    def record_quality_inspection(
        self,
        db: Session,
        inspection_data: Dict[str, Any],
        inspector_id: int
    ) -> QualityRecord:
        """Record quality inspection results"""
        
        try:
            quality_record = QualityRecord(
                **inspection_data,
                inspector_id=inspector_id,
                inspection_date=datetime.now()
            )
            
            db.add(quality_record)
            
            # Update inventory item quality status if applicable
            if inspection_data.get('receipt_item_id'):
                receipt_item = db.query(MaterialReceiptItem).filter(
                    MaterialReceiptItem.id == inspection_data['receipt_item_id']
                ).first()
                
                if receipt_item:
                    receipt_item.quality_status = quality_record.quality_status
                    
                    # Update inventory item
                    inventory_item = db.query(InventoryItem).filter(
                        and_(
                            InventoryItem.material_id == quality_record.material_id,
                            InventoryItem.lot_number == receipt_item.lot_number
                        )
                    ).first()
                    
                    if inventory_item:
                        inventory_item.quality_status = quality_record.quality_status
                        if quality_record.quality_status == QualityStatus.QUARANTINED:
                            inventory_item.quarantine_reason = inspection_data.get('notes')
            
            db.commit()
            db.refresh(quality_record)
            
            self.logger.info(f"Recorded quality inspection: {quality_record.id}")
            return quality_record
            
        except Exception as e:
            db.rollback()
            self.logger.error(f"Error recording quality inspection: {str(e)}")
            raise
    
    # Analytics and Reporting
    def get_vendor_performance_analytics(
        self,
        db: Session,
        vendor_id: int,
        period_days: int = 90
    ) -> Dict[str, Any]:
        """Get comprehensive vendor performance analytics"""
        
        start_date = datetime.now() - timedelta(days=period_days)
        
        # Get purchase orders in period
        pos = db.query(PurchaseOrder).filter(
            and_(
                PurchaseOrder.vendor_id == vendor_id,
                PurchaseOrder.order_date >= start_date
            )
        ).all()
        
        if not pos:
            return {'message': 'No data available for the specified period'}
        
        # Calculate metrics
        total_orders = len(pos)
        total_value = sum(po.total_amount for po in pos)
        
        # On-time delivery
        delivered_pos = [po for po in pos if po.status == PurchaseOrderStatus.DELIVERED]
        on_time_deliveries = 0
        
        for po in delivered_pos:
            # Check if delivered on time (simplified logic)
            if po.promised_date and po.updated_at <= po.promised_date:
                on_time_deliveries += 1
        
        on_time_rate = (on_time_deliveries / len(delivered_pos)) * 100 if delivered_pos else 0
        
        # Quality metrics
        quality_records = db.query(QualityRecord).join(MaterialReceiptItem).join(MaterialReceipt).join(PurchaseOrder).filter(
            and_(
                PurchaseOrder.vendor_id == vendor_id,
                QualityRecord.inspection_date >= start_date
            )
        ).all()
        
        total_inspections = len(quality_records)
        passed_inspections = len([qr for qr in quality_records if qr.quality_status == QualityStatus.PASSED])
        quality_rate = (passed_inspections / total_inspections) * 100 if total_inspections else 0
        
        return {
            'period_days': period_days,
            'total_orders': total_orders,
            'total_value': float(total_value),
            'on_time_delivery_rate': round(on_time_rate, 2),
            'quality_pass_rate': round(quality_rate, 2),
            'average_order_value': float(total_value / total_orders) if total_orders else 0,
            'orders_by_status': self._get_orders_by_status(pos)
        }
    
    def get_inventory_turnover_analysis(
        self,
        db: Session,
        material_id: Optional[int] = None,
        period_days: int = 365
    ) -> Dict[str, Any]:
        """Calculate inventory turnover analysis"""
        
        start_date = datetime.now() - timedelta(days=period_days)
        
        query = db.query(InventoryTransaction).filter(
            and_(
                InventoryTransaction.transaction_date >= start_date,
                InventoryTransaction.transaction_type == InventoryTransactionType.ISSUE
            )
        )
        
        if material_id:
            query = query.join(InventoryItem).filter(InventoryItem.material_id == material_id)
        
        transactions = query.all()
        
        # Calculate total usage
        total_usage_value = sum(
            float(t.total_value_pln) for t in transactions if t.total_value_pln
        )
        
        # Get average inventory value
        current_inventory = db.query(InventoryItem)
        if material_id:
            current_inventory = current_inventory.filter(InventoryItem.material_id == material_id)
        
        avg_inventory_value = sum(
            float(item.total_value_pln) for item in current_inventory.all() if item.total_value_pln
        )
        
        # Calculate turnover
        turnover_ratio = total_usage_value / avg_inventory_value if avg_inventory_value > 0 else 0
        
        return {
            'period_days': period_days,
            'total_usage_value': total_usage_value,
            'average_inventory_value': avg_inventory_value,
            'turnover_ratio': round(turnover_ratio, 2),
            'days_of_supply': round(period_days / turnover_ratio, 1) if turnover_ratio > 0 else 0
        }
    
    # Helper Methods
    def _generate_material_code(self, db: Session, category: MaterialCategory) -> str:
        """Generate unique material code"""
        prefix = {
            MaterialCategory.RAW_MATERIAL: 'RM',
            MaterialCategory.COMPONENT: 'CP',
            MaterialCategory.ASSEMBLY: 'AS',
            MaterialCategory.CONSUMABLE: 'CN',
            MaterialCategory.TOOL: 'TL',
            MaterialCategory.PACKAGING: 'PK',
            MaterialCategory.CHEMICAL: 'CH',
            MaterialCategory.ELECTRONIC: 'EL'
        }.get(category, 'MT')
        
        # Get next sequence number
        last_material = db.query(Material).filter(
            Material.material_code.like(f"{prefix}%")
        ).order_by(desc(Material.material_code)).first()
        
        if last_material:
            try:
                last_num = int(last_material.material_code[2:])
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:06d}"
    
    def _generate_vendor_code(self, db: Session) -> str:
        """Generate unique vendor code"""
        last_vendor = db.query(Vendor).order_by(desc(Vendor.vendor_code)).first()
        
        if last_vendor:
            try:
                last_num = int(last_vendor.vendor_code[1:])
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"V{next_num:06d}"
    
    def _generate_po_number(self, db: Session) -> str:
        """Generate unique PO number"""
        today = datetime.now()
        prefix = f"PO{today.year}{today.month:02d}"
        
        last_po = db.query(PurchaseOrder).filter(
            PurchaseOrder.po_number.like(f"{prefix}%")
        ).order_by(desc(PurchaseOrder.po_number)).first()
        
        if last_po:
            try:
                last_num = int(last_po.po_number[8:])
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:04d}"
    
    def _generate_receipt_number(self, db: Session) -> str:
        """Generate unique receipt number"""
        today = datetime.now()
        prefix = f"RCP{today.year}{today.month:02d}"
        
        last_receipt = db.query(MaterialReceipt).filter(
            MaterialReceipt.receipt_number.like(f"{prefix}%")
        ).order_by(desc(MaterialReceipt.receipt_number)).first()
        
        if last_receipt:
            try:
                last_num = int(last_receipt.receipt_number[9:])
                next_num = last_num + 1
            except:
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}{next_num:04d}"
    
    def _calculate_average_cost(self, db: Session, material_id: int) -> Decimal:
        """Calculate weighted average cost for material"""
        
        # Get recent transactions
        transactions = db.query(InventoryTransaction).join(InventoryItem).filter(
            and_(
                InventoryItem.material_id == material_id,
                InventoryTransaction.transaction_type == InventoryTransactionType.RECEIPT,
                InventoryTransaction.unit_cost_pln.isnot(None)
            )
        ).order_by(desc(InventoryTransaction.transaction_date)).limit(10).all()
        
        if not transactions:
            return Decimal('0')
        
        total_value = sum(t.quantity * t.unit_cost_pln for t in transactions)
        total_quantity = sum(t.quantity for t in transactions)
        
        return total_value / total_quantity if total_quantity > 0 else Decimal('0')
    
    def _calculate_vendor_score(
        self,
        vendor: MaterialVendor,
        quantity: Decimal,
        required_date: Optional[datetime]
    ) -> float:
        """Calculate vendor score for material selection"""
        
        score = 0.0
        
        # Price score (40%)
        if vendor.current_price_pln:
            # Simplified: lower price = higher score
            price_score = 1.0 / (1.0 + float(vendor.current_price_pln))
            score += price_score * 0.4
        
        # Quality score (30%)
        if vendor.quality_rating:
            score += float(vendor.quality_rating) / 5.0 * 0.3
        
        # Delivery performance (20%)
        if vendor.delivery_performance:
            score += vendor.delivery_performance * 0.2
        
        # Lead time score (10%)
        if required_date and vendor.lead_time_days:
            days_available = (required_date - datetime.now()).days
            if days_available >= vendor.lead_time_days:
                score += 0.1
        
        # Preferred vendor bonus
        if vendor.is_preferred:
            score += 0.1
        
        return min(score, 1.0)
    
    def _update_inventory_from_receipt(
        self,
        db: Session,
        receipt_item: MaterialReceiptItem
    ):
        """Update inventory from material receipt"""
        
        # Find or create inventory item
        inventory_item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.material_id == receipt_item.po_item.material_id,
                InventoryItem.location_id == receipt_item.location_id,
                InventoryItem.lot_number == receipt_item.lot_number
            )
        ).first()
        
        if not inventory_item:
            inventory_item = InventoryItem(
                material_id=receipt_item.po_item.material_id,
                location_id=receipt_item.location_id,
                lot_number=receipt_item.lot_number,
                batch_number=receipt_item.batch_number,
                expiry_date=receipt_item.expiry_date,
                received_date=datetime.now(),
                quality_status=receipt_item.quality_status,
                unit_cost_pln=receipt_item.po_item.unit_price
            )
            db.add(inventory_item)
        
        # Update quantities
        inventory_item.on_hand_qty += receipt_item.received_qty
        inventory_item.available_qty = inventory_item.on_hand_qty - inventory_item.allocated_qty
        inventory_item.total_value_pln = inventory_item.on_hand_qty * inventory_item.unit_cost_pln
    
    def _get_orders_by_status(self, orders: List[PurchaseOrder]) -> Dict[str, int]:
        """Group orders by status"""
        status_counts = {}
        for order in orders:
            status = order.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts


# Global service instance
supply_chain_service = SupplyChainService() 