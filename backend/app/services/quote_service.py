from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from app.models.quote import Quote, QuoteStatus
from app.models.producer import Manufacturer
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.schemas.quote import QuoteCreate
from decimal import Decimal
from sqlalchemy import func

logger = logging.getLogger(__name__)

class QuoteService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_quote(self, quote_data: QuoteCreate, current_user: User) -> Quote:
        """Create a new quote with comprehensive validation"""
        try:
            # 1. Validate user is a manufacturer
            role_val = getattr(current_user.role, 'value', str(current_user.role))
            if not role_val or role_val.lower() != 'manufacturer':
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only manufacturers can create quotes")

            # 2. Get manufacturer profile
            manufacturer = self.db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if not manufacturer or not getattr(manufacturer, 'is_active', True):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manufacturer profile not found or inactive")

            # 3. Validate order
            order = self.db.query(Order).filter(Order.id == quote_data.order_id).first()
            if not order:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
            order_status_val = getattr(order.status, 'value', str(order.status)).lower()
            if order_status_val not in ['active', 'quoted']:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Order is not accepting quotes (status: {order_status_val})")

            # 4. Check for existing quotes
            if self.db.query(Quote).filter(Quote.order_id == quote_data.order_id, Quote.manufacturer_id == manufacturer.id).first():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already submitted a quote for this order")

            # 5. Create and commit the new quote
            tax_rate = Decimal("0.23")
            subtotal = quote_data.price
            tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))
            total_price = subtotal + tax_amount

            db_quote = Quote(
                order_id=quote_data.order_id,
                manufacturer_id=manufacturer.id,
                subtotal_pln=subtotal,
                tax_rate_pct=tax_rate * 100,
                tax_amount_pln=tax_amount,
                total_price_pln=total_price,
                pricing_breakdown={"total": float(quote_data.price)},
                lead_time_days=quote_data.delivery_days,
                client_message=quote_data.description,
                status=QuoteStatus.SENT,
                valid_until=quote_data.valid_until,
            )
            self.db.add(db_quote)
            
            if order_status_val == 'active':
                order.status = OrderStatus.QUOTED
            
            self.db.commit()
            self.db.refresh(db_quote)
            
            return db_quote

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating quote: {e}", exc_info=True)
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.") 

    def search_quotes(self, filters: dict, current_user: User) -> list[Quote]:
        """Advanced search with multiple filter criteria"""
        query = self.db.query(Quote)

        # Apply role-based visibility
        if current_user.role == 'client' or getattr(current_user.role, 'value', '') == 'client':
            order_ids = self.db.query(Order.id).filter(Order.client_id == current_user.id).subquery()
            query = query.filter(Quote.order_id.in_(order_ids))
        elif current_user.role == 'manufacturer' or getattr(current_user.role, 'value', '') == 'manufacturer':
            manufacturer = self.db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                query = query.filter(Quote.manufacturer_id == manufacturer.id)

        # Dynamic filters
        if (status := filters.get('status')):
            if isinstance(status, list):
                query = query.filter(Quote.status.in_(status))
            else:
                query = query.filter(Quote.status == status)
        if (order_id := filters.get('order_id')):
            query = query.filter(Quote.order_id == order_id)
        if (manufacturer_id := filters.get('manufacturer_id')):
            query = query.filter(Quote.manufacturer_id == manufacturer_id)
        if (min_price := filters.get('min_price')) is not None:
            query = query.filter(Quote.total_price_pln >= min_price)
        if (max_price := filters.get('max_price')) is not None:
            query = query.filter(Quote.total_price_pln <= max_price)
        if (created_from := filters.get('created_from')):
            query = query.filter(Quote.created_at >= created_from)
        if (created_to := filters.get('created_to')):
            query = query.filter(Quote.created_at <= created_to)
        if (search := filters.get('search')):
            like_pattern = f"%{search}%"
            query = query.filter(Quote.client_message.ilike(like_pattern))

        # Sorting
        sort_by = filters.get('sort_by', 'created_at')
        sort_order = filters.get('sort_order', 'desc')
        sort_column = getattr(Quote, sort_by, Quote.created_at)
        if sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        limit = filters.get('limit', 100)
        offset = filters.get('skip', 0)
        return query.offset(offset).limit(limit).all()

    def bulk_update_status(self, action: str, quote_ids: list[int], current_user: User) -> int:
        """Perform bulk operations on quotes (accept, reject, withdraw, delete)"""
        valid_actions = {'accept': QuoteStatus.ACCEPTED, 'reject': QuoteStatus.REJECTED, 'withdraw': QuoteStatus.WITHDRAWN}
        if action not in valid_actions and action != 'delete':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bulk action")

        # Ensure user has permission over all quotes
        query = self.db.query(Quote).filter(Quote.id.in_(quote_ids))
        if current_user.role == 'client':
            order_ids = self.db.query(Order.id).filter(Order.client_id == current_user.id).subquery()
            query = query.filter(Quote.order_id.in_(order_ids))
        elif current_user.role == 'manufacturer':
            manufacturer = self.db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                query = query.filter(Quote.manufacturer_id == manufacturer.id)

        quotes = query.all()
        if len(quotes) != len(quote_ids):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Some quotes are not accessible")

        if action == 'delete':
            deleted = query.delete(synchronize_session=False)
            self.db.commit()
            return deleted
        else:
            new_status = valid_actions[action]
            updated = query.update({Quote.status: new_status}, synchronize_session=False)
            self.db.commit()
            return updated

    def analytics_overview(self, current_user: User) -> dict:
        """Return aggregated analytics across quotes for dashboards"""
        query = self.db.query(Quote)
        if current_user.role == 'client':
            order_ids = self.db.query(Order.id).filter(Order.client_id == current_user.id).subquery()
            query = query.filter(Quote.order_id.in_(order_ids))
        elif current_user.role == 'manufacturer':
            manufacturer = self.db.query(Manufacturer).filter(Manufacturer.user_id == current_user.id).first()
            if manufacturer:
                query = query.filter(Quote.manufacturer_id == manufacturer.id)

        total_quotes = query.count()
        accepted = query.filter(Quote.status == QuoteStatus.ACCEPTED).count()
        rejected = query.filter(Quote.status == QuoteStatus.REJECTED).count()
        withdrawn = query.filter(Quote.status == QuoteStatus.WITHDRAWN).count()
        sent = query.filter(Quote.status == QuoteStatus.SENT).count()
        avg_value = (query.with_entities(func.avg(Quote.total_price_pln)).scalar() or 0)

        win_rate = round((accepted / total_quotes) * 100, 2) if total_quotes else 0

        return {
            "total_quotes": total_quotes,
            "accepted": accepted,
            "rejected": rejected,
            "withdrawn": withdrawn,
            "sent": sent,
            "win_rate": win_rate,
            "average_value": float(avg_value),
        } 