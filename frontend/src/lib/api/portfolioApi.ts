import { apiClient } from '../api-client';

// Portfolio Types
export interface SuccessMetrics {
  onTimeDelivery: boolean;
  budgetCompliance: boolean;
  qualityScore: number;
  clientSatisfaction: number;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  industry: string;
  images: string[];
  videoUrl?: string;
  completedAt: string;
  duration: number;
  budget: number;
  currency: string;
  rating: number;
  reviewCount: number;
  views: number;
  likes: number;
  isLiked: boolean;
  tags: string[];
  technologies: string[];
  clientName: string;
  status: string;
  complexity: string;
  successMetrics: SuccessMetrics;
  achievements: string[];
  keyFeatures: string[];
}

export interface PortfolioStats {
  totalProjects: number;
  averageRating: number;
  totalViews: number;
  totalLikes: number;
  categories: number;
  completionRate: number;
  averageDuration: number;
  clientRetention: number;
}

export interface PortfolioProjectCreate {
  title: string;
  description: string;
  category: string;
  industry: string;
  duration: number;
  budget: number;
  currency?: string;
  clientName: string;
  complexity: string;
  images?: string[];
  videoUrl?: string;
  tags?: string[];
  technologies?: string[];
  achievements?: string[];
  keyFeatures?: string[];
}

// Portfolio API
export const portfolioApi = {
  // Get all portfolio projects with filtering
  fetchProjects: async (filters?: {
    search?: string;
    category?: string;
    complexity?: string;
    industry?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<PortfolioProject[]> => {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.complexity) params.append('complexity', filters.complexity);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sortBy) params.append('sort_by', filters.sortBy);
    if (filters?.sortOrder) params.append('sort_order', filters.sortOrder);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const url = `/portfolio/projects${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<PortfolioProject[]>(url);
    return response;
  },

  // Get project by ID
  getProject: async (projectId: string): Promise<PortfolioProject> => {
    const response = await apiClient.get<PortfolioProject>(`/portfolio/projects/${projectId}`);
    return response;
  },

  // Create a new portfolio project (for manufacturers)
  createProject: async (projectData: PortfolioProjectCreate): Promise<PortfolioProject> => {
    const response = await apiClient.post<PortfolioProject>('/portfolio/projects', projectData);
    return response;
  },

  // Like/unlike a project
  likeProject: async (projectId: string): Promise<{
    message: string;
    isLiked: boolean;
    totalLikes: number;
  }> => {
    const response = await apiClient.post<{
      message: string;
      isLiked: boolean;
      totalLikes: number;
    }>(`/portfolio/projects/${projectId}/like`);
    return response;
  },

  // Share a project
  shareProject: async (projectId: string): Promise<{
    message: string;
    shareUrl: string;
  }> => {
    const response = await apiClient.post<{
      message: string;
      shareUrl: string;
    }>(`/portfolio/projects/${projectId}/share`);
    return response;
  },

  // Get portfolio statistics
  fetchStats: async (): Promise<PortfolioStats> => {
    const response = await apiClient.get<PortfolioStats>('/portfolio/stats');
    return response;
  },

  // Get all categories
  getCategories: async (): Promise<{ categories: string[] }> => {
    const response = await apiClient.get<{ categories: string[] }>('/portfolio/categories');
    return response;
  }
}; 