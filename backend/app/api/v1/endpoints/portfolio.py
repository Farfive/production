from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from loguru import logger

router = APIRouter()

# Portfolio Models
class SuccessMetrics(BaseModel):
    on_time_delivery: bool
    budget_compliance: bool
    quality_score: float
    client_satisfaction: float

class PortfolioProjectBase(BaseModel):
    title: str
    description: str
    category: str
    industry: str
    duration: int  # in days
    budget: float
    currency: str = "USD"
    client_name: str
    complexity: str  # LOW, MEDIUM, HIGH, CRITICAL
    technologies: List[str] = []
    achievements: List[str] = []
    key_features: List[str] = []

class PortfolioProjectCreate(PortfolioProjectBase):
    images: List[str] = []
    video_url: Optional[str] = None
    tags: List[str] = []

class PortfolioProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    images: Optional[List[str]] = None
    video_url: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # COMPLETED, IN_PROGRESS, FEATURED

class PortfolioProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    industry: str
    images: List[str]
    video_url: Optional[str] = None
    completed_at: datetime
    duration: int
    budget: float
    currency: str
    rating: float
    review_count: int
    views: int
    likes: int
    is_liked: bool
    tags: List[str]
    technologies: List[str]
    client_name: str
    status: str
    complexity: str
    success_metrics: SuccessMetrics
    achievements: List[str]
    key_features: List[str]

class PortfolioStats(BaseModel):
    total_projects: int
    average_rating: float
    total_views: int
    total_likes: int
    categories: int
    completion_rate: float
    average_duration: float
    client_retention: float

# In-memory storage for demo (replace with real database models)
projects_storage: Dict[str, Dict] = {
    "1": {
        "id": "1",
        "title": "Precision Aerospace Components Manufacturing",
        "description": "High-precision aluminum components for commercial aircraft landing gear systems with stringent aerospace standards compliance.",
        "category": "Aerospace",
        "industry": "Aviation",
        "images": ["/api/portfolio/1/image1.jpg", "/api/portfolio/1/image2.jpg", "/api/portfolio/1/image3.jpg"],
        "video_url": "/api/portfolio/1/demo.mp4",
        "completed_at": datetime.now() - timedelta(days=30),
        "duration": 45,
        "budget": 185000.0,
        "currency": "USD",
        "rating": 4.9,
        "review_count": 12,
        "views": 2456,
        "likes": 189,
        "tags": ["aerospace", "precision", "aluminum", "landing-gear"],
        "technologies": ["CNC Machining", "5-Axis Milling", "CMM Inspection", "Anodizing"],
        "client_name": "AeroTech Solutions",
        "status": "FEATURED",
        "complexity": "CRITICAL",
        "success_metrics": {
            "on_time_delivery": True,
            "budget_compliance": True,
            "quality_score": 98.5,
            "client_satisfaction": 4.9
        },
        "achievements": ["Zero defects", "AS9100 certified", "15% under budget", "Client repeat order"],
        "key_features": ["±0.001\" tolerance", "FAI documentation", "Material traceability", "NDT testing"],
        "manufacturer_id": None,
        "liked_by": set()
    },
    "2": {
        "id": "2",
        "title": "Automotive Engine Block Production",
        "description": "Mass production of aluminum engine blocks for electric vehicle applications with integrated cooling channels.",
        "category": "Automotive",
        "industry": "Electric Vehicles",
        "images": ["/api/portfolio/2/image1.jpg", "/api/portfolio/2/image2.jpg"],
        "video_url": None,
        "completed_at": datetime.now() - timedelta(days=60),
        "duration": 90,
        "budget": 450000.0,
        "currency": "USD",
        "rating": 4.7,
        "review_count": 8,
        "views": 1834,
        "likes": 156,
        "tags": ["automotive", "engine-block", "electric-vehicle", "aluminum"],
        "technologies": ["Die Casting", "CNC Machining", "Pressure Testing", "Heat Treatment"],
        "client_name": "EV Motors Inc.",
        "status": "COMPLETED",
        "complexity": "HIGH",
        "success_metrics": {
            "on_time_delivery": True,
            "budget_compliance": False,
            "quality_score": 96.2,
            "client_satisfaction": 4.7
        },
        "achievements": ["100K units produced", "IATF 16949 certified", "Lean manufacturing", "Zero recalls"],
        "key_features": ["Integrated cooling", "30% weight reduction", "Corrosion resistant", "Recyclable materials"],
        "manufacturer_id": None,
        "liked_by": set()
    },
    "3": {
        "id": "3",
        "title": "Medical Device Housing Manufacturing",
        "description": "Biocompatible titanium housings for implantable medical devices with FDA compliance and sterile packaging.",
        "category": "Medical",
        "industry": "Healthcare",
        "images": ["/api/portfolio/3/image1.jpg"],
        "video_url": None,
        "completed_at": datetime.now() - timedelta(days=120),
        "duration": 180,
        "budget": 320000.0,
        "currency": "USD",
        "rating": 5.0,
        "review_count": 6,
        "views": 987,
        "likes": 98,
        "tags": ["medical", "titanium", "biocompatible", "fda-approved"],
        "technologies": ["Titanium Machining", "Laser Marking", "Clean Room Assembly", "Sterilization"],
        "client_name": "MedTech Innovations",
        "status": "COMPLETED",
        "complexity": "CRITICAL",
        "success_metrics": {
            "on_time_delivery": True,
            "budget_compliance": True,
            "quality_score": 99.8,
            "client_satisfaction": 5.0
        },
        "achievements": ["FDA approved", "Class III device", "Zero contamination", "Patent pending"],
        "key_features": ["Biocompatible Grade 23", "Mirror finish", "Hermetic sealing", "X-ray markers"],
        "manufacturer_id": None,
        "liked_by": set()
    }
}

# User likes tracking
user_likes: Dict[int, set] = {}

@router.get("/projects", response_model=List[PortfolioProjectResponse])
async def get_portfolio_projects(
    search: Optional[str] = Query(None, description="Search projects by title, description, or tags"),
    category: Optional[str] = Query(None, description="Filter by category"),
    complexity: Optional[str] = Query(None, description="Filter by complexity level"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: str = Query("completed_at", description="Sort by field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio projects with filtering and pagination"""
    try:
        projects_list = []
        user_liked_projects = user_likes.get(current_user.id, set())
        
        for project_data in projects_storage.values():
            # Apply filters
            if search:
                search_text = f"{project_data['title']} {project_data['description']} {' '.join(project_data.get('tags', []))}"
                if search.lower() not in search_text.lower():
                    continue
            
            if category and project_data["category"] != category:
                continue
            if complexity and project_data["complexity"] != complexity:
                continue
            if industry and project_data["industry"] != industry:
                continue
            if status and project_data["status"] != status:
                continue
            
            project = PortfolioProjectResponse(
                id=project_data["id"],
                title=project_data["title"],
                description=project_data["description"],
                category=project_data["category"],
                industry=project_data["industry"],
                images=project_data["images"],
                video_url=project_data.get("video_url"),
                completed_at=project_data["completed_at"],
                duration=project_data["duration"],
                budget=project_data["budget"],
                currency=project_data["currency"],
                rating=project_data["rating"],
                review_count=project_data["review_count"],
                views=project_data["views"],
                likes=project_data["likes"],
                is_liked=project_data["id"] in user_liked_projects,
                tags=project_data["tags"],
                technologies=project_data["technologies"],
                client_name=project_data["client_name"],
                status=project_data["status"],
                complexity=project_data["complexity"],
                success_metrics=SuccessMetrics(**project_data["success_metrics"]),
                achievements=project_data["achievements"],
                key_features=project_data["key_features"]
            )
            projects_list.append(project)
        
        # Sort projects
        reverse = sort_order.lower() == "desc"
        if sort_by == "completed_at":
            projects_list.sort(key=lambda x: x.completed_at, reverse=reverse)
        elif sort_by == "views":
            projects_list.sort(key=lambda x: x.views, reverse=reverse)
        elif sort_by == "likes":
            projects_list.sort(key=lambda x: x.likes, reverse=reverse)
        elif sort_by == "rating":
            projects_list.sort(key=lambda x: x.rating, reverse=reverse)
        elif sort_by == "budget":
            projects_list.sort(key=lambda x: x.budget, reverse=reverse)
        
        # Apply pagination
        return projects_list[offset:offset + limit]
        
    except Exception as e:
        logger.error(f"Error fetching portfolio projects: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching portfolio projects")

@router.get("/projects/{project_id}", response_model=PortfolioProjectResponse)
async def get_portfolio_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific portfolio project by ID"""
    try:
        if project_id not in projects_storage:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_data = projects_storage[project_id]
        user_liked_projects = user_likes.get(current_user.id, set())
        
        # Increment view count
        project_data["views"] += 1
        
        return PortfolioProjectResponse(
            id=project_data["id"],
            title=project_data["title"],
            description=project_data["description"],
            category=project_data["category"],
            industry=project_data["industry"],
            images=project_data["images"],
            video_url=project_data.get("video_url"),
            completed_at=project_data["completed_at"],
            duration=project_data["duration"],
            budget=project_data["budget"],
            currency=project_data["currency"],
            rating=project_data["rating"],
            review_count=project_data["review_count"],
            views=project_data["views"],
            likes=project_data["likes"],
            is_liked=project_id in user_liked_projects,
            tags=project_data["tags"],
            technologies=project_data["technologies"],
            client_name=project_data["client_name"],
            status=project_data["status"],
            complexity=project_data["complexity"],
            success_metrics=SuccessMetrics(**project_data["success_metrics"]),
            achievements=project_data["achievements"],
            key_features=project_data["key_features"]
        )
        
    except Exception as e:
        logger.error(f"Error fetching portfolio project: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error fetching portfolio project")

@router.post("/projects", response_model=PortfolioProjectResponse)
async def create_portfolio_project(
    project_data: PortfolioProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new portfolio project (for manufacturers)"""
    try:
        # Check if user is a manufacturer
        if current_user.role != UserRole.MANUFACTURER:
            raise HTTPException(status_code=403, detail="Only manufacturers can create portfolio projects")
        
        project_id = str(uuid.uuid4())
        now = datetime.now()
        
        new_project = {
            "id": project_id,
            "title": project_data.title,
            "description": project_data.description,
            "category": project_data.category,
            "industry": project_data.industry,
            "images": project_data.images,
            "video_url": project_data.video_url,
            "completed_at": now,
            "duration": project_data.duration,
            "budget": project_data.budget,
            "currency": project_data.currency,
            "rating": 0.0,
            "review_count": 0,
            "views": 0,
            "likes": 0,
            "tags": project_data.tags,
            "technologies": project_data.technologies,
            "client_name": project_data.client_name,
            "status": "COMPLETED",
            "complexity": project_data.complexity,
            "success_metrics": {
                "on_time_delivery": True,
                "budget_compliance": True,
                "quality_score": 95.0,
                "client_satisfaction": 4.5
            },
            "achievements": project_data.achievements,
            "key_features": project_data.key_features,
            "manufacturer_id": current_user.id,
            "liked_by": set()
        }
        
        projects_storage[project_id] = new_project
        
        return PortfolioProjectResponse(
            id=project_id,
            title=new_project["title"],
            description=new_project["description"],
            category=new_project["category"],
            industry=new_project["industry"],
            images=new_project["images"],
            video_url=new_project.get("video_url"),
            completed_at=new_project["completed_at"],
            duration=new_project["duration"],
            budget=new_project["budget"],
            currency=new_project["currency"],
            rating=new_project["rating"],
            review_count=new_project["review_count"],
            views=new_project["views"],
            likes=new_project["likes"],
            is_liked=False,
            tags=new_project["tags"],
            technologies=new_project["technologies"],
            client_name=new_project["client_name"],
            status=new_project["status"],
            complexity=new_project["complexity"],
            success_metrics=SuccessMetrics(**new_project["success_metrics"]),
            achievements=new_project["achievements"],
            key_features=new_project["key_features"]
        )
        
    except Exception as e:
        logger.error(f"Error creating portfolio project: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error creating portfolio project")

@router.post("/projects/{project_id}/like")
async def like_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like or unlike a portfolio project"""
    try:
        if project_id not in projects_storage:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_data = projects_storage[project_id]
        user_id = current_user.id
        
        # Initialize user likes if not exists
        if user_id not in user_likes:
            user_likes[user_id] = set()
        
        # Toggle like status
        if project_id in user_likes[user_id]:
            # Unlike
            user_likes[user_id].remove(project_id)
            project_data["likes"] = max(0, project_data["likes"] - 1)
            is_liked = False
        else:
            # Like
            user_likes[user_id].add(project_id)
            project_data["likes"] += 1
            is_liked = True
        
        return {
            "message": "Like status updated successfully",
            "is_liked": is_liked,
            "total_likes": project_data["likes"]
        }
        
    except Exception as e:
        logger.error(f"Error updating like status: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error updating like status")

@router.get("/stats", response_model=PortfolioStats)
async def get_portfolio_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get portfolio statistics"""
    try:
        total_projects = len(projects_storage)
        total_views = sum(project["views"] for project in projects_storage.values())
        total_likes = sum(project["likes"] for project in projects_storage.values())
        
        # Calculate average rating
        ratings = [project["rating"] for project in projects_storage.values() if project["rating"] > 0]
        average_rating = sum(ratings) / len(ratings) if ratings else 0.0
        
        # Get unique categories
        categories = len(set(project["category"] for project in projects_storage.values()))
        
        # Calculate completion rate (mock - in real app, this would be based on project status)
        completed_projects = sum(1 for project in projects_storage.values() if project["status"] in ["COMPLETED", "FEATURED"])
        completion_rate = (completed_projects / total_projects * 100) if total_projects > 0 else 100.0
        
        # Calculate average duration
        durations = [project["duration"] for project in projects_storage.values()]
        average_duration = sum(durations) / len(durations) if durations else 0.0
        
        return PortfolioStats(
            total_projects=total_projects,
            average_rating=round(average_rating, 1),
            total_views=total_views,
            total_likes=total_likes,
            categories=categories,
            completion_rate=round(completion_rate, 1),
            average_duration=round(average_duration, 1),
            client_retention=87.5  # Mock value
        )
        
    except Exception as e:
        logger.error(f"Error fetching portfolio stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching portfolio stats")

@router.get("/categories")
async def get_portfolio_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all unique portfolio categories"""
    try:
        categories = list(set(project["category"] for project in projects_storage.values()))
        return {"categories": sorted(categories)}
        
    except Exception as e:
        logger.error(f"Error fetching portfolio categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching portfolio categories")

@router.post("/projects/{project_id}/share")
async def share_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a shareable link for a portfolio project"""
    try:
        if project_id not in projects_storage:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Generate shareable URL
        share_url = f"https://platform.com/portfolio/{project_id}"
        
        return {
            "message": "Share link generated successfully",
            "share_url": share_url
        }
        
    except Exception as e:
        logger.error(f"Error generating share link: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error generating share link") 