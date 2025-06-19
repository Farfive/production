from fastapi import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, orders, intelligent_matching, emails, performance, users, quotes, dashboard, notifications, manufacturers, payments, quote_templates, debug, invoices, production_quotes, smart_matching, mandatory_escrow, production, quality, documents, portfolio, manufacturing, supply_chain_simple  # , firebase_auth

# Import Firebase auth conditionally
try:
    from app.api.v1.endpoints import firebase_auth
    FIREBASE_ENDPOINTS_AVAILABLE = True
except ImportError:
    firebase_auth = None
    FIREBASE_ENDPOINTS_AVAILABLE = False

api_router = APIRouter()

# Core endpoints (always available)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(production_quotes.router, prefix="/production-quotes", tags=["production-quotes"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(intelligent_matching.router, prefix="/matching", tags=["intelligent-matching"])
api_router.include_router(smart_matching.router, prefix="/smart-matching", tags=["smart-matching"])
api_router.include_router(mandatory_escrow.router, prefix="/mandatory-escrow", tags=["mandatory-escrow"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(performance.router, prefix="/performance", tags=["performance"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(manufacturers.router, prefix="/manufacturers", tags=["manufacturers"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(quote_templates.router, prefix="/quote-templates", tags=["quote-templates"])
api_router.include_router(production.router, prefix="/production", tags=["production"])
api_router.include_router(quality.router, prefix="/quality", tags=["quality"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(manufacturing.router, prefix="/manufacturing", tags=["manufacturing"])
api_router.include_router(supply_chain_simple.router, prefix="/supply-chain", tags=["supply-chain"])
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])

# Firebase endpoints (only if Firebase is available)
if FIREBASE_ENDPOINTS_AVAILABLE:
    api_router.include_router(firebase_auth.router, prefix="/auth", tags=["firebase-auth"])
    print("Firebase authentication endpoints enabled")
else:
    print("⚠️ Firebase authentication endpoints disabled (package not installed)") 