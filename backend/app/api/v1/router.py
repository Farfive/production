from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, orders, producers, quotes, payments, dashboard, intelligent_matching, emails

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(producers.router, prefix="/producers", tags=["producers"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(intelligent_matching.router, prefix="/matching", tags=["intelligent-matching"])
api_router.include_router(emails.router, prefix="/emails", tags=["email-automation"]) 