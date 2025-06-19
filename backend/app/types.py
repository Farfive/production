"""
Manufacturing Platform Type Definitions
Common types, enums, and constants used across the platform.
"""

import enum
from typing import List, Dict, Any, Optional, Union
from decimal import Decimal


class UrgencyLevel(enum.Enum):
    """Order urgency level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class CapabilityCategory(enum.Enum):
    """Manufacturing capability categories."""
    
    # Machining & Cutting
    CNC_MACHINING = "cnc_machining"
    MILL_TURN = "mill_turn"
    PRECISION_MACHINING = "precision_machining"
    SWISS_MACHINING = "swiss_machining"
    MULTI_AXIS_MACHINING = "multi_axis_machining"
    LASER_CUTTING = "laser_cutting"
    PLASMA_CUTTING = "plasma_cutting"
    WATERJET_CUTTING = "waterjet_cutting"
    
    # Additive Manufacturing
    FDM_3D_PRINTING = "fdm_3d_printing"
    SLA_3D_PRINTING = "sla_3d_printing"
    SLS_3D_PRINTING = "sls_3d_printing"
    METAL_3D_PRINTING = "metal_3d_printing"
    MULTI_MATERIAL_PRINTING = "multi_material_printing"
    
    # Molding & Forming
    INJECTION_MOLDING = "injection_molding"
    BLOW_MOLDING = "blow_molding"
    COMPRESSION_MOLDING = "compression_molding"
    THERMOFORMING = "thermoforming"
    ROTATIONAL_MOLDING = "rotational_molding"
    VACUUM_FORMING = "vacuum_forming"
    
    # Sheet Metal & Fabrication
    SHEET_METAL_FABRICATION = "sheet_metal_fabrication"
    METAL_STAMPING = "metal_stamping"
    METAL_FORMING = "metal_forming"
    TUBE_BENDING = "tube_bending"
    ROLL_FORMING = "roll_forming"
    SPINNING = "spinning"
    
    # Casting & Foundry
    SAND_CASTING = "sand_casting"
    INVESTMENT_CASTING = "investment_casting"
    DIE_CASTING = "die_casting"
    CENTRIFUGAL_CASTING = "centrifugal_casting"
    CONTINUOUS_CASTING = "continuous_casting"
    LOST_FOAM_CASTING = "lost_foam_casting"
    
    # Joining & Welding
    MIG_WELDING = "mig_welding"
    TIG_WELDING = "tig_welding"
    SPOT_WELDING = "spot_welding"
    LASER_WELDING = "laser_welding"
    FRICTION_WELDING = "friction_welding"
    BRAZING = "brazing"
    SOLDERING = "soldering"
    ADHESIVE_BONDING = "adhesive_bonding"
    
    # Assembly & Integration
    MECHANICAL_ASSEMBLY = "mechanical_assembly"
    ELECTRICAL_ASSEMBLY = "electrical_assembly"
    TESTING_INTEGRATION = "testing_integration"
    QUALITY_INSPECTION = "quality_inspection"
    PACKAGING = "packaging"
    
    # Surface Treatment & Finishing
    ANODIZING = "anodizing"
    POWDER_COATING = "powder_coating"
    ELECTROPLATING = "electroplating"
    PAINTING = "painting"
    SANDBLASTING = "sandblasting"
    POLISHING = "polishing"
    HEAT_TREATMENT = "heat_treatment"
    PASSIVATION = "passivation"
    CHEMICAL_ETCHING = "chemical_etching"
    
    # Textiles & Soft Goods
    FABRIC_CUTTING = "fabric_cutting"
    SEWING = "sewing"
    EMBROIDERY = "embroidery"
    SCREEN_PRINTING = "screen_printing"
    DIGITAL_PRINTING = "digital_printing"
    HEAT_TRANSFER = "heat_transfer"
    LAMINATION = "lamination"
    
    # Specialized Processes
    MICROMANUFACTURING = "micromanufacturing"
    CLEANROOM_ASSEMBLY = "cleanroom_assembly"
    AEROSPACE_CERTIFIED = "aerospace_certified"
    MEDICAL_DEVICE_MANUFACTURING = "medical_device_manufacturing"
    AUTOMOTIVE_PARTS = "automotive_parts"
    FOOD_GRADE_MANUFACTURING = "food_grade_manufacturing"
    ELECTRONICS_MANUFACTURING = "electronics_manufacturing"
    RAPID_PROTOTYPING = "rapid_prototyping"


class OrderStatus(enum.Enum):
    """Order status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    QUOTED = "quoted"
    APPROVED = "approved"
    IN_PRODUCTION = "in_production"
    QUALITY_CHECK = "quality_check"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"


class QuoteStatus(enum.Enum):
    """Quote status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"
    SUPERSEDED = "superseded"


class MaterialType(enum.Enum):
    """Material type enumeration."""
    
    # Metals
    ALUMINUM = "aluminum"
    STEEL = "steel"
    STAINLESS_STEEL = "stainless_steel"
    CARBON_STEEL = "carbon_steel"
    TITANIUM = "titanium"
    COPPER = "copper"
    BRASS = "brass"
    BRONZE = "bronze"
    NICKEL = "nickel"
    
    # Plastics
    ABS = "abs"
    PLA = "pla"
    PETG = "petg"
    NYLON = "nylon"
    POLYCARBONATE = "polycarbonate"
    ACRYLIC = "acrylic"
    POLYPROPYLENE = "polypropylene"
    POLYETHYLENE = "polyethylene"
    
    # Composites
    CARBON_FIBER = "carbon_fiber"
    FIBERGLASS = "fiberglass"
    KEVLAR = "kevlar"
    
    # Others
    CERAMIC = "ceramic"
    GLASS = "glass"
    WOOD = "wood"
    RUBBER = "rubber"
    FOAM = "foam"


class QualityStandard(enum.Enum):
    """Quality standard certifications."""
    ISO_9001 = "iso_9001"
    ISO_14001 = "iso_14001"
    AS9100 = "as9100"  # Aerospace
    ISO_13485 = "iso_13485"  # Medical devices
    IATF_16949 = "iatf_16949"  # Automotive
    FDA_REGISTERED = "fda_registered"
    CE_MARKED = "ce_marked"
    UL_LISTED = "ul_listed"
    RoHS_COMPLIANT = "rohs_compliant"
    REACH_COMPLIANT = "reach_compliant"


class DeliveryMethod(enum.Enum):
    """Delivery method options."""
    STANDARD_SHIPPING = "standard_shipping"
    EXPRESS_SHIPPING = "express_shipping"
    OVERNIGHT_SHIPPING = "overnight_shipping"
    PICKUP = "pickup"
    WHITE_GLOVE = "white_glove"
    FREIGHT = "freight"
    CUSTOM_LOGISTICS = "custom_logistics"


class PaymentTerm(enum.Enum):
    """Payment term options."""
    NET_30 = "net_30"
    NET_60 = "net_60"
    PAYMENT_ON_DELIVERY = "payment_on_delivery"
    ADVANCE_PAYMENT = "advance_payment"
    MILESTONE_PAYMENTS = "milestone_payments"
    ESCROW = "escrow"
    LETTER_OF_CREDIT = "letter_of_credit"


# Type aliases for common data structures
ManufacturingCapabilities = List[CapabilityCategory]
MaterialList = List[MaterialType]
QualityStandards = List[QualityStandard]
PricingTiers = Dict[str, Decimal]
SpecificationDict = Dict[str, Any]
LocationCoordinates = tuple[float, float]  # (latitude, longitude)

# Constants
DEFAULT_CURRENCY = "PLN"
MAX_ORDER_QUANTITY = 1000000
MIN_ORDER_QUANTITY = 1
DEFAULT_LEAD_TIME_DAYS = 30
MAX_LEAD_TIME_DAYS = 365

# Common data structures
class ManufacturerProfile:
    """Data structure for manufacturer profile information."""
    
    def __init__(
        self,
        capabilities: ManufacturingCapabilities,
        materials: MaterialList,
        quality_standards: QualityStandards,
        min_order_quantity: int = MIN_ORDER_QUANTITY,
        max_order_quantity: int = MAX_ORDER_QUANTITY,
        lead_time_days: int = DEFAULT_LEAD_TIME_DAYS,
        location: Optional[LocationCoordinates] = None,
        certifications: Optional[List[str]] = None
    ):
        self.capabilities = capabilities
        self.materials = materials
        self.quality_standards = quality_standards
        self.min_order_quantity = min_order_quantity
        self.max_order_quantity = max_order_quantity
        self.lead_time_days = lead_time_days
        self.location = location
        self.certifications = certifications or []


class OrderRequirements:
    """Data structure for order requirements."""
    
    def __init__(
        self,
        capabilities_needed: ManufacturingCapabilities,
        materials_needed: MaterialList,
        quantity: int,
        urgency: UrgencyLevel = UrgencyLevel.MEDIUM,
        quality_requirements: Optional[QualityStandards] = None,
        delivery_method: DeliveryMethod = DeliveryMethod.STANDARD_SHIPPING,
        budget_range: Optional[tuple[Decimal, Decimal]] = None,
        specifications: Optional[SpecificationDict] = None
    ):
        self.capabilities_needed = capabilities_needed
        self.materials_needed = materials_needed
        self.quantity = quantity
        self.urgency = urgency
        self.quality_requirements = quality_requirements or []
        self.delivery_method = delivery_method
        self.budget_range = budget_range
        self.specifications = specifications or {} 