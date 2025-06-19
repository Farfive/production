# This file is deprecated - Invoice model moved to financial.py
# Keeping this file for backward compatibility but removing duplicate class definitions

from app.models.financial import Invoice, InvoiceItem, InvoiceStatus

# Re-export for backward compatibility
__all__ = ['Invoice', 'InvoiceItem', 'InvoiceStatus'] 