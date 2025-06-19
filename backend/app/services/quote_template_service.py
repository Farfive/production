from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
import logging

from app.models.quote_template import QuoteTemplate
from app.models.user import User, UserRole
from app.models.producer import Manufacturer
from app.schemas.quote_template import QuoteTemplateCreate, QuoteTemplateUpdate

logger = logging.getLogger(__name__)

class QuoteTemplateService:
    def __init__(self, db: Session):
        self.db = db

    def _get_manufacturer(self, user: User) -> Manufacturer:
        manufacturer = self.db.query(Manufacturer).filter(Manufacturer.user_id == user.id).first()
        if not manufacturer:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manufacturer profile not found")
        return manufacturer

    def create_template(self, template: QuoteTemplateCreate, current_user: User) -> QuoteTemplate:
        manufacturer = self._get_manufacturer(current_user)
        db_obj = QuoteTemplate(
            name=template.name,
            description=template.description,
            manufacturer_id=manufacturer.id,
            template_data=template.template_data,
            is_public=template.is_public if current_user.role == UserRole.ADMIN else False,
        )
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def get_templates(self, current_user: User, only_public: bool = False) -> List[QuoteTemplate]:
        query = self.db.query(QuoteTemplate)
        if only_public:
            query = query.filter(QuoteTemplate.is_public == True)
        else:
            if current_user.role == UserRole.MANUFACTURER:
                manufacturer = self._get_manufacturer(current_user)
                query = query.filter((QuoteTemplate.manufacturer_id == manufacturer.id) | (QuoteTemplate.is_public == True))
            elif current_user.role != UserRole.ADMIN:
                query = query.filter(QuoteTemplate.is_public == True)
        return query.order_by(QuoteTemplate.created_at.desc()).all()

    def get_template(self, template_id: int, current_user: User) -> QuoteTemplate:
        template = self.db.query(QuoteTemplate).filter(QuoteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        if not template.is_public and current_user.role != UserRole.ADMIN:
            # Ensure manufacturer owns the template
            manufacturer = self._get_manufacturer(current_user)
            if template.manufacturer_id != manufacturer.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this template")
        return template

    def update_template(self, template_id: int, updates: QuoteTemplateUpdate, current_user: User) -> QuoteTemplate:
        template = self.get_template(template_id, current_user)
        if current_user.role != UserRole.ADMIN:
            manufacturer = self._get_manufacturer(current_user)
            if template.manufacturer_id != manufacturer.id:
                raise HTTPException(status_code=403, detail="Not authorized to modify this template")
        for field, value in updates.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id: int, current_user: User):
        template = self.get_template(template_id, current_user)
        if current_user.role != UserRole.ADMIN:
            manufacturer = self._get_manufacturer(current_user)
            if template.manufacturer_id != manufacturer.id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this template")
        self.db.delete(template)
        self.db.commit()
        return 