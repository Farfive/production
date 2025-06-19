from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import os
import uuid
import mimetypes
from pathlib import Path

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from loguru import logger

router = APIRouter()

# Document Models
class DocumentBase(BaseModel):
    name: str
    type: str
    size: int
    mime_type: str
    folder_id: Optional[str] = None
    tags: List[str] = []
    is_shared: bool = False

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None
    is_shared: Optional[bool] = None

class AIAnalysis(BaseModel):
    summary: str
    extracted_text: str
    key_terms: List[str]
    document_type: str
    confidence: float

class DocumentResponse(BaseModel):
    id: str
    name: str
    type: str
    size: int
    mime_type: str
    uploaded_at: datetime
    updated_at: datetime
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    uploaded_by: str
    tags: List[str] = []
    is_shared: bool = False
    download_count: int = 0
    version: int = 1
    url: str
    thumbnail_url: Optional[str] = None
    ai_analysis: Optional[AIAnalysis] = None

class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    documents_count: int
    created_at: datetime
    color: str = "blue"

class DocumentStats(BaseModel):
    total_documents: int
    total_folders: int
    total_size: int
    shared_documents: int
    recent_uploads: int
    storage_used: int
    storage_limit: int

# In-memory storage for demo (replace with real database models)
documents_storage: Dict[str, Dict] = {}
folders_storage: Dict[str, Dict] = {
    "folder-1": {"id": "folder-1", "name": "Technical Specifications", "parent_id": None, "documents_count": 0, "created_at": datetime.now(), "color": "blue"},
    "folder-2": {"id": "folder-2", "name": "Quality Reports", "parent_id": None, "documents_count": 0, "created_at": datetime.now(), "color": "green"},
    "folder-3": {"id": "folder-3", "name": "Design Files", "parent_id": None, "documents_count": 0, "created_at": datetime.now(), "color": "purple"}
}

@router.get("/", response_model=List[DocumentResponse])
async def get_documents(
    search: Optional[str] = Query(None, description="Search documents by name or tags"),
    folder_id: Optional[str] = Query(None, description="Filter by folder ID"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    shared_only: Optional[bool] = Query(None, description="Show only shared documents"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for the current user with optional filtering"""
    try:
        user_documents = []
        
        for doc_id, doc_data in documents_storage.items():
            if doc_data["uploaded_by_id"] != current_user.id:
                continue
                
            # Apply filters
            if search and search.lower() not in doc_data["name"].lower() and not any(search.lower() in tag.lower() for tag in doc_data.get("tags", [])):
                continue
            if folder_id and doc_data.get("folder_id") != folder_id:
                continue
            if document_type and doc_data["type"] != document_type:
                continue
            if shared_only is not None and doc_data.get("is_shared", False) != shared_only:
                continue
                
            # Get folder name if exists
            folder_name = None
            if doc_data.get("folder_id") and doc_data["folder_id"] in folders_storage:
                folder_name = folders_storage[doc_data["folder_id"]]["name"]
                
            document = DocumentResponse(
                id=doc_data["id"],
                name=doc_data["name"],
                type=doc_data["type"],
                size=doc_data["size"],
                mime_type=doc_data["mime_type"],
                uploaded_at=doc_data["uploaded_at"],
                updated_at=doc_data["updated_at"],
                folder_id=doc_data.get("folder_id"),
                folder_name=folder_name,
                uploaded_by=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email,
                tags=doc_data.get("tags", []),
                is_shared=doc_data.get("is_shared", False),
                download_count=doc_data.get("download_count", 0),
                version=doc_data.get("version", 1),
                url=f"/api/v1/documents/{doc_data['id']}/download",
                thumbnail_url=f"/api/v1/documents/{doc_data['id']}/thumbnail" if doc_data["type"].lower() in ["pdf", "image"] else None,
                ai_analysis=doc_data.get("ai_analysis")
            )
            user_documents.append(document)
            
        # Sort by upload date (newest first)
        user_documents.sort(key=lambda x: x.uploaded_at, reverse=True)
        return user_documents
        
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching documents")

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_shared: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new document"""
    try:
        # Generate unique document ID
        doc_id = str(uuid.uuid4())
        
        # Get file info
        file_size = 0
        file_content = await file.read()
        file_size = len(file_content)
        
        # Determine file type
        file_extension = Path(file.filename or "").suffix.lower()
        mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
        
        doc_type = "Unknown"
        if mime_type.startswith("image/"):
            doc_type = "Image"
        elif mime_type == "application/pdf":
            doc_type = "PDF"
        elif mime_type in ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
            doc_type = "Excel"
        elif mime_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            doc_type = "Word"
        elif file_extension in [".dwg", ".dxf", ".step", ".stp"]:
            doc_type = "CAD"
            
        # Parse tags
        parsed_tags = []
        if tags:
            parsed_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
            
        # Create document record
        now = datetime.now()
        document_data = {
            "id": doc_id,
            "name": file.filename or f"document_{doc_id}",
            "type": doc_type,
            "size": file_size,
            "mime_type": mime_type,
            "uploaded_at": now,
            "updated_at": now,
            "folder_id": folder_id,
            "uploaded_by_id": current_user.id,
            "tags": parsed_tags,
            "is_shared": is_shared,
            "download_count": 0,
            "version": 1,
            "file_content": file_content  # In production, save to cloud storage
        }
        
        documents_storage[doc_id] = document_data
        
        # Update folder document count
        if folder_id and folder_id in folders_storage:
            folders_storage[folder_id]["documents_count"] += 1
            
        # Get folder name
        folder_name = None
        if folder_id and folder_id in folders_storage:
            folder_name = folders_storage[folder_id]["name"]
            
        return DocumentResponse(
            id=doc_id,
            name=document_data["name"],
            type=document_data["type"],
            size=document_data["size"],
            mime_type=document_data["mime_type"],
            uploaded_at=document_data["uploaded_at"],
            updated_at=document_data["updated_at"],
            folder_id=document_data.get("folder_id"),
            folder_name=folder_name,
            uploaded_by=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email,
            tags=document_data["tags"],
            is_shared=document_data["is_shared"],
            download_count=document_data["download_count"],
            version=document_data["version"],
            url=f"/api/v1/documents/{doc_id}/download",
            thumbnail_url=f"/api/v1/documents/{doc_id}/thumbnail" if doc_type.lower() in ["pdf", "image"] else None
        )
        
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading document")

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific document by ID"""
    try:
        if document_id not in documents_storage:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc_data = documents_storage[document_id]
        
        # Check access permission
        if doc_data["uploaded_by_id"] != current_user.id and not doc_data.get("is_shared", False):
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Get folder name
        folder_name = None
        if doc_data.get("folder_id") and doc_data["folder_id"] in folders_storage:
            folder_name = folders_storage[doc_data["folder_id"]]["name"]
            
        return DocumentResponse(
            id=doc_data["id"],
            name=doc_data["name"],
            type=doc_data["type"],
            size=doc_data["size"],
            mime_type=doc_data["mime_type"],
            uploaded_at=doc_data["uploaded_at"],
            updated_at=doc_data["updated_at"],
            folder_id=doc_data.get("folder_id"),
            folder_name=folder_name,
            uploaded_by=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email,
            tags=doc_data.get("tags", []),
            is_shared=doc_data.get("is_shared", False),
            download_count=doc_data.get("download_count", 0),
            version=doc_data.get("version", 1),
            url=f"/api/v1/documents/{document_id}/download",
            thumbnail_url=f"/api/v1/documents/{document_id}/thumbnail" if doc_data["type"].lower() in ["pdf", "image"] else None,
            ai_analysis=doc_data.get("ai_analysis")
        )
        
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error fetching document")

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update document metadata"""
    try:
        if document_id not in documents_storage:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc_data = documents_storage[document_id]
        
        # Check permission
        if doc_data["uploaded_by_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Update fields
        if update_data.name is not None:
            doc_data["name"] = update_data.name
        if update_data.folder_id is not None:
            # Update old folder count
            if doc_data.get("folder_id") and doc_data["folder_id"] in folders_storage:
                folders_storage[doc_data["folder_id"]]["documents_count"] -= 1
            # Update new folder count
            if update_data.folder_id in folders_storage:
                folders_storage[update_data.folder_id]["documents_count"] += 1
            doc_data["folder_id"] = update_data.folder_id
        if update_data.tags is not None:
            doc_data["tags"] = update_data.tags
        if update_data.is_shared is not None:
            doc_data["is_shared"] = update_data.is_shared
            
        doc_data["updated_at"] = datetime.now()
        
        # Get folder name
        folder_name = None
        if doc_data.get("folder_id") and doc_data["folder_id"] in folders_storage:
            folder_name = folders_storage[doc_data["folder_id"]]["name"]
            
        return DocumentResponse(
            id=doc_data["id"],
            name=doc_data["name"],
            type=doc_data["type"],
            size=doc_data["size"],
            mime_type=doc_data["mime_type"],
            uploaded_at=doc_data["uploaded_at"],
            updated_at=doc_data["updated_at"],
            folder_id=doc_data.get("folder_id"),
            folder_name=folder_name,
            uploaded_by=f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email,
            tags=doc_data["tags"],
            is_shared=doc_data["is_shared"],
            download_count=doc_data["download_count"],
            version=doc_data["version"],
            url=f"/api/v1/documents/{document_id}/download",
            thumbnail_url=f"/api/v1/documents/{document_id}/thumbnail" if doc_data["type"].lower() in ["pdf", "image"] else None,
            ai_analysis=doc_data.get("ai_analysis")
        )
        
    except Exception as e:
        logger.error(f"Error updating document: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error updating document")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document"""
    try:
        if document_id not in documents_storage:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc_data = documents_storage[document_id]
        
        # Check permission
        if doc_data["uploaded_by_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Update folder count
        if doc_data.get("folder_id") and doc_data["folder_id"] in folders_storage:
            folders_storage[doc_data["folder_id"]]["documents_count"] -= 1
            
        # Delete document
        del documents_storage[document_id]
        
        return {"message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error deleting document")

@router.post("/{document_id}/analyze", response_model=AIAnalysis)
async def analyze_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze document with AI"""
    try:
        if document_id not in documents_storage:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc_data = documents_storage[document_id]
        
        # Check permission
        if doc_data["uploaded_by_id"] != current_user.id and not doc_data.get("is_shared", False):
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Simulate AI analysis (replace with real AI service)
        analysis = AIAnalysis(
            summary=f"AI-generated analysis of {doc_data['name']}. This document contains important information related to manufacturing processes and technical specifications.",
            extracted_text=f"Full text content extracted from {doc_data['name']}...",
            key_terms=["manufacturing", "specifications", "quality", "technical", "process"],
            document_type=doc_data["type"],
            confidence=0.92
        )
        
        # Store analysis
        doc_data["ai_analysis"] = analysis.dict()
        doc_data["updated_at"] = datetime.now()
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing document: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error analyzing document")

@router.get("/folders/", response_model=List[FolderResponse])
async def get_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all folders for the current user"""
    try:
        folder_list = []
        for folder_data in folders_storage.values():
            folder_list.append(FolderResponse(
                id=folder_data["id"],
                name=folder_data["name"],
                parent_id=folder_data["parent_id"],
                documents_count=folder_data["documents_count"],
                created_at=folder_data["created_at"],
                color=folder_data["color"]
            ))
        
        return folder_list
        
    except Exception as e:
        logger.error(f"Error fetching folders: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching folders")

@router.get("/stats/", response_model=DocumentStats)
async def get_document_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document statistics for the current user"""
    try:
        user_documents = [doc for doc in documents_storage.values() if doc["uploaded_by_id"] == current_user.id]
        
        total_size = sum(doc["size"] for doc in user_documents)
        shared_documents = sum(1 for doc in user_documents if doc.get("is_shared", False))
        recent_uploads = sum(1 for doc in user_documents if doc["uploaded_at"] > datetime.now() - timedelta(days=7))
        
        return DocumentStats(
            total_documents=len(user_documents),
            total_folders=len(folders_storage),
            total_size=total_size,
            shared_documents=shared_documents,
            recent_uploads=recent_uploads,
            storage_used=total_size,
            storage_limit=10 * 1024 * 1024 * 1024  # 10GB limit
        )
        
    except Exception as e:
        logger.error(f"Error fetching document stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching document stats")

@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a document"""
    try:
        if document_id not in documents_storage:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc_data = documents_storage[document_id]
        
        # Check permission
        if doc_data["uploaded_by_id"] != current_user.id and not doc_data.get("is_shared", False):
            raise HTTPException(status_code=403, detail="Access denied")
            
        # Increment download count
        doc_data["download_count"] = doc_data.get("download_count", 0) + 1
        
        # In production, return file from cloud storage
        from fastapi.responses import Response
        return Response(
            content=doc_data.get("file_content", b"Mock file content"),
            media_type=doc_data["mime_type"],
            headers={"Content-Disposition": f"attachment; filename={doc_data['name']}"}
        )
        
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Error downloading document") 