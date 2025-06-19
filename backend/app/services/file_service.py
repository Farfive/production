import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import mimetypes
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class FileService:
    def __init__(self):
        self.upload_base_path = Path(settings.UPLOAD_DIRECTORY)
        self.allowed_extensions = {
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg',
            'txt', 'csv', 'json', 'xml',
            'zip', 'rar', '7z',
            'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl'
        }
        self.max_file_size = 50 * 1024 * 1024  # 50MB

    async def save_quote_attachment(
        self,
        file: UploadFile,
        quote_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Save a quote attachment file"""
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_extension = Path(file.filename).suffix.lower().lstrip('.')
        if file_extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_extension}' not allowed. Allowed types: {', '.join(self.allowed_extensions)}"
            )

        # Read file content to check size
        content = await file.read()
        if len(content) > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {self.max_file_size / (1024*1024):.1f}MB"
            )

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        
        # Create directory structure
        quote_dir = self.upload_base_path / "quotes" / str(quote_id)
        quote_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = quote_dir / unique_filename
        
        # Save file
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
        except Exception as e:
            logger.error(f"Failed to save file {file.filename}: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file")

        # Get mime type
        mime_type, _ = mimetypes.guess_type(file.filename)
        
        return {
            "name": unique_filename,
            "original_name": file.filename,
            "path": str(file_path),
            "size": len(content),
            "type": file_extension,
            "mime_type": mime_type,
            "url": f"/api/v1/quotes/{quote_id}/attachments/download/{unique_filename}"
        }

    async def save_order_attachment(
        self,
        file: UploadFile,
        order_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Save an order attachment file"""
        
        # Similar validation as quote attachments
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_extension = Path(file.filename).suffix.lower().lstrip('.')
        if file_extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_extension}' not allowed"
            )

        content = await file.read()
        if len(content) > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail="File too large"
            )

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        
        # Create directory structure
        order_dir = self.upload_base_path / "orders" / str(order_id)
        order_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = order_dir / unique_filename
        
        # Save file
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
        except Exception as e:
            logger.error(f"Failed to save order file {file.filename}: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file")

        mime_type, _ = mimetypes.guess_type(file.filename)
        
        return {
            "name": unique_filename,
            "original_name": file.filename,
            "path": str(file_path),
            "size": len(content),
            "type": file_extension,
            "mime_type": mime_type,
            "url": f"/api/v1/orders/{order_id}/attachments/download/{unique_filename}"
        }

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
        
        return False

    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get information about a file"""
        try:
            path = Path(file_path)
            if not path.exists():
                return None
            
            stat = path.stat()
            mime_type, _ = mimetypes.guess_type(str(path))
            
            return {
                "path": str(path),
                "name": path.name,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "mime_type": mime_type,
                "extension": path.suffix.lower().lstrip('.')
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_path}: {e}")
            return None

    def validate_file_access(
        self,
        file_path: str,
        user_id: int,
        resource_type: str,
        resource_id: int
    ) -> bool:
        """Validate if user has access to a file"""
        # Basic path validation
        path = Path(file_path)
        
        # Ensure file is within upload directory
        try:
            path.resolve().relative_to(self.upload_base_path.resolve())
        except ValueError:
            return False
        
        # Check if file exists
        if not path.exists():
            return False
        
        # Additional access control logic would go here
        # For now, basic path validation
        expected_pattern = self.upload_base_path / resource_type / str(resource_id)
        
        return str(path).startswith(str(expected_pattern))

    def cleanup_temp_files(self, max_age_hours: int = 24):
        """Clean up temporary files older than max_age_hours"""
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        temp_dir = self.upload_base_path / "temp"
        if not temp_dir.exists():
            return
        
        deleted_count = 0
        for file_path in temp_dir.rglob("*"):
            if file_path.is_file():
                try:
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        file_path.unlink()
                        deleted_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete temp file {file_path}: {e}")
        
        logger.info(f"Cleaned up {deleted_count} temporary files")

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage usage statistics"""
        stats = {
            "total_files": 0,
            "total_size": 0,
            "by_type": {}
        }
        
        try:
            for file_path in self.upload_base_path.rglob("*"):
                if file_path.is_file():
                    stats["total_files"] += 1
                    size = file_path.stat().st_size
                    stats["total_size"] += size
                    
                    # Track by parent directory type
                    parent = file_path.parent.name
                    if parent not in stats["by_type"]:
                        stats["by_type"][parent] = {"files": 0, "size": 0}
                    
                    stats["by_type"][parent]["files"] += 1
                    stats["by_type"][parent]["size"] += size
                    
        except Exception as e:
            logger.error(f"Failed to get storage stats: {e}")
        
        return stats 