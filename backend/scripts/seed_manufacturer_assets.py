"""Seed manufacturer asset tables with sample data for development/testing."""
import os
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from app.core.database import Base
from app.models.producer import Manufacturer
from app.models.manufacturer_assets import (
    ManufacturerCapability,
    ManufacturerEquipment,
    ManufacturerCertification,
)

DATABASE_URL = os.getenv("DATABASE_URL") or \
    "postgresql://manufacturing_user:manufacturing_pass@localhost:5432/manufacturing_db"

engine = create_engine(DATABASE_URL)
SessionLocal = Session(bind=engine)

def main():
    db = SessionLocal
    try:
        # Pick first manufacturer or create dummy
        mfg = db.query(Manufacturer).first()
        if not mfg:
            mfg = Manufacturer(
                user_id=1,
                business_name="Sample Manufacturing Co",
                country="US",
                city="Detroit",
            )
            db.add(mfg)
            db.commit()
            db.refresh(mfg)

        # Seed capability
        cap = ManufacturerCapability(
            manufacturer_id=mfg.id,
            category="CNC_MACHINING",
            processes=["MILLING", "TURNING"],
            materials=["Aluminum", "Steel"],
            tolerance="±0.01 mm",
        )
        db.add(cap)

        # Seed equipment
        equip = ManufacturerEquipment(
            manufacturer_id=mfg.id,
            name="HAAS VF-2SS",
            type="CNC Mill",
            manufacturer="HAAS",
            year=2021,
            specifications={"spindle_speed_rpm": 12000},
            capabilities=["Milling"],
            status="operational",
            utilization_rate=65.0,
        )
        db.add(equip)

        # Seed certification
        cert = ManufacturerCertification(
            manufacturer_id=mfg.id,
            name="ISO 9001",
            issuing_body="ISO",
            issue_date="2023-01-01",
            expiry_date="2026-01-01",
            certificate_number="ISO9001-12345",
            scope="Quality Management",
        )
        db.add(cert)

        db.commit()
        print("Seed data inserted successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    main() 