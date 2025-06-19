from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base

class QuoteTemplate(Base):
    """Reusable quote template that manufacturers can apply when creating quotes"""
    __tablename__ = "quote_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.id"), nullable=False, index=True)
    template_data = Column(JSON, nullable=False, default=dict)  # stores pricing_breakdown and other fields
    is_public = Column(Boolean, default=False, index=True)  # admin-curated or shared template
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    manufacturer = relationship("Manufacturer", back_populates="quote_templates")

    def __repr__(self):
        return f"<QuoteTemplate(id={self.id}, name={self.name})>" 