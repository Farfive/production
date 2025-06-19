import { apiClient } from '../api-client';

// Document Types
export interface AIAnalysis {
  summary: string;
  extractedText: string;
  keyTerms: string[];
  documentType: string;
  confidence: number;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  updatedAt: string;
  folderId: string | null;
  folderName: string | null;
  uploadedBy: string;
  tags: string[];
  isShared: boolean;
  downloadCount: number;
  version: number;
  url: string;
  thumbnailUrl?: string;
  aiAnalysis?: AIAnalysis;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  documentsCount: number;
  createdAt: string;
  color: string;
}

export interface DocumentStats {
  totalDocuments: number;
  totalFolders: number;
  totalSize: number;
  sharedDocuments: number;
  recentUploads: number;
  storageUsed: number;
  storageLimit: number;
}

// Documents API
export const documentsApi = {
  // Get all documents with optional filtering
  fetchDocuments: async (filters?: {
    search?: string;
    folderId?: string;
    documentType?: string;
    sharedOnly?: boolean;
  }): Promise<Document[]> => {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.folderId) params.append('folder_id', filters.folderId);
    if (filters?.documentType) params.append('document_type', filters.documentType);
    if (filters?.sharedOnly !== undefined) params.append('shared_only', filters.sharedOnly.toString());
    
    const queryString = params.toString();
    const url = `/documents/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<Document[]>(url);
    return response;
  },

  // Get document by ID
  getDocument: async (documentId: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${documentId}`);
    return response;
  },

  // Upload a new document
  uploadDocument: async (file: File, options?: {
    folderId?: string;
    tags?: string[];
    isShared?: boolean;
  }): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.folderId) formData.append('folder_id', options.folderId);
    if (options?.tags) formData.append('tags', options.tags.join(','));
    if (options?.isShared !== undefined) formData.append('is_shared', options.isShared.toString());
    
    const response = await apiClient.post<Document>('/documents/upload', formData);
    return response;
  },

  // Update document metadata
  updateDocument: async (documentId: string, updates: {
    name?: string;
    folderId?: string;
    tags?: string[];
    isShared?: boolean;
  }): Promise<Document> => {
    const response = await apiClient.put<Document>(`/documents/${documentId}`, updates);
    return response;
  },

  // Delete document
  deleteDocument: async (documentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/documents/${documentId}`);
    return response;
  },

  // Analyze document with AI
  analyzeDocument: async (documentId: string): Promise<AIAnalysis> => {
    const response = await apiClient.post<AIAnalysis>(`/documents/${documentId}/analyze`);
    return response;
  },

  // Download document
  downloadDocument: async (documentId: string): Promise<Blob> => {
    const response = await fetch(`${apiClient.defaults.baseURL}/documents/${documentId}/download`, {
      headers: {
        'Authorization': apiClient.defaults.headers.common?.['Authorization'] as string || ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return response.blob();
  },

  // Get folders
  fetchFolders: async (): Promise<Folder[]> => {
    const response = await apiClient.get<Folder[]>('/documents/folders/');
    return response;
  },

  // Get document statistics
  fetchStats: async (): Promise<DocumentStats> => {
    const response = await apiClient.get<DocumentStats>('/documents/stats/');
    return response;
  }
}; 