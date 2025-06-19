from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    orders,
    quotes,
    manufacturers,
    matching,
    smart_matching,
    feedback_learning,
    advanced_personalization,
    cross_platform_ecosystem,
    quantum_intelligence_domination,
    predictive_analytics,
    payments,
    dashboard,
    production_quotes,
    notifications
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(manufacturers.router, prefix="/manufacturers", tags=["manufacturers"])
api_router.include_router(matching.router, prefix="/matching", tags=["matching"])
api_router.include_router(smart_matching.router, prefix="/smart-matching", tags=["smart-matching"])
api_router.include_router(feedback_learning.router, prefix="/feedback-learning", tags=["feedback-learning"])
api_router.include_router(advanced_personalization.router, prefix="/advanced-personalization", tags=["advanced-personalization"])
api_router.include_router(cross_platform_ecosystem.router, prefix="/cross-platform-ecosystem", tags=["cross-platform-ecosystem"])
api_router.include_router(quantum_intelligence_domination.router, prefix="/quantum-intelligence-domination", tags=["quantum-intelligence-domination"])
api_router.include_router(predictive_analytics.router, prefix="/predictive-analytics", tags=["predictive-analytics"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(production_quotes.router, prefix="/production-quotes", tags=["production-quotes"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"]) 