import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseIcon,
  EyeIcon,
  PlusIcon,
  StarIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  PhotoIcon,
  PlayIcon,
  ShareIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  TrophyIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

// Import real API
import { portfolioApi, PortfolioProject, PortfolioStats } from '../lib/api/portfolioApi';

const PortfolioPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const queryClient = useQueryClient();

  // Fetch data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['portfolio-projects', searchTerm, selectedCategory, selectedComplexity],
    queryFn: () => portfolioApi.fetchProjects({
      search: searchTerm || undefined,
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      complexity: selectedComplexity === 'ALL' ? undefined : selectedComplexity,
      sortBy: 'completed_at',
      sortOrder: 'desc'
    }),
    refetchInterval: 60000
  });

  const { data: stats } = useQuery({
    queryKey: ['portfolio-stats'],
    queryFn: portfolioApi.fetchStats,
    refetchInterval: 300000
  });

  // Mutations
  const likeMutation = useMutation({
    mutationFn: portfolioApi.likeProject,
    onSuccess: (result, projectId) => {
      queryClient.setQueryData(['portfolio-projects'], (old: PortfolioProject[] | undefined) => {
        if (!old) return old;
        return old.map(project => 
          project.id === projectId 
            ? { ...project, isLiked: result.isLiked, likes: result.totalLikes }
            : project
        );
      });
    }
  });

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = !searchTerm || 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'ALL' || project.category === selectedCategory;
      const matchesComplexity = selectedComplexity === 'ALL' || project.complexity === selectedComplexity;
      
      return matchesSearch && matchesCategory && matchesComplexity;
    });
  }, [projects, searchTerm, selectedCategory, selectedComplexity]);

  // Get unique categories
  const categories = useMemo(() => {
    const unique = Array.from(new Set(projects.map(p => p.category)));
    return ['ALL', ...unique];
  }, [projects]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FEATURED': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleLikeProject = (projectId: string) => {
    likeMutation.mutate(projectId);
  };

  const handleViewProject = (project: PortfolioProject) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  if (projectsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BriefcaseIcon className="w-8 h-8 mr-3 text-indigo-600" />
              Manufacturing Portfolio
            </h1>
            <p className="text-gray-600 mt-2">Showcase of precision manufacturing excellence and innovation</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Project</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <BriefcaseIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalProjects || 0}</p>
              <p className="text-xs text-indigo-600">{stats?.completionRate || 0}% success rate</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <StarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.averageRating || 0}</p>
              <div className="flex mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIconSolid 
                    key={star} 
                    className={`w-3 h-3 ${star <= (stats?.averageRating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <EyeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{((stats?.totalViews || 0) / 1000).toFixed(1)}K</p>
              <p className="text-xs text-blue-600">High engagement</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrophyIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Client Retention</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.clientRetention || 0}%</p>
              <p className="text-xs text-green-600">Excellent reputation</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects by title, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'ALL' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All Complexity</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Projects Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewProject(project)}
            >
              {/* Project Image */}
              <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-indigo-200">
                {project.status === 'FEATURED' && (
                  <div className="absolute top-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <TrophyIcon className="w-3 h-3 mr-1" />
                    Featured
                  </div>
                )}
                <div className="absolute top-3 right-3 flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikeProject(project.id);
                    }}
                    className="p-2 bg-white rounded-full shadow-sm"
                  >
                    {project.isLiked ? (
                      <HeartIconSolid className="w-4 h-4 text-red-500" />
                    ) : (
                      <HeartIcon className="w-4 h-4 text-gray-600" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-full shadow-sm"
                  >
                    <ShareIcon className="w-4 h-4 text-gray-600" />
                  </motion.button>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {project.videoUrl ? (
                    <PlayIcon className="w-12 h-12 text-indigo-600" />
                  ) : (
                    <PhotoIcon className="w-12 h-12 text-indigo-600" />
                  )}
                </div>
              </div>

              {/* Project Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {project.category}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getComplexityColor(project.complexity)}`}>
                    {project.complexity}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{project.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

                {/* Project Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(project.budget)}</div>
                    <div className="text-xs text-gray-500">Budget</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{project.duration} days</div>
                    <div className="text-xs text-gray-500">Duration</div>
                  </div>
                </div>

                {/* Rating and Engagement */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    <StarIconSolid className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-900">{project.rating}</span>
                    <span className="text-sm text-gray-500">({project.reviewCount})</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <div className="flex items-center">
                      <EyeIcon className="w-4 h-4 mr-1" />
                      {project.views}
                    </div>
                    <div className="flex items-center">
                      <HeartIcon className="w-4 h-4 mr-1" />
                      {project.likes}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{project.tags.length - 3}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Completed {formatDate(project.completedAt)}
                  </div>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <BriefcaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No projects found</p>
          <p className="text-gray-400">Adjust your search criteria or add your first project</p>
        </div>
      )}

      {/* Project Details Modal */}
      <AnimatePresence>
        {showProjectDetails && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getComplexityColor(selectedProject.complexity)}`}>
                      {selectedProject.complexity} Complexity
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProjectDetails(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Project Overview */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{selectedProject.title}</h2>
                    <p className="text-gray-600 mb-6">{selectedProject.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <CurrencyDollarIcon className="w-6 h-6 text-green-600 mb-2" />
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(selectedProject.budget)}</div>
                        <div className="text-sm text-gray-500">Project Budget</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ClockIcon className="w-6 h-6 text-blue-600 mb-2" />
                        <div className="text-lg font-bold text-gray-900">{selectedProject.duration} days</div>
                        <div className="text-sm text-gray-500">Duration</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <StarIcon className="w-6 h-6 text-yellow-600 mb-2" />
                        <div className="text-lg font-bold text-gray-900">{selectedProject.rating}/5.0</div>
                        <div className="text-sm text-gray-500">{selectedProject.reviewCount} reviews</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <EyeIcon className="w-6 h-6 text-purple-600 mb-2" />
                        <div className="text-lg font-bold text-gray-900">{selectedProject.views}</div>
                        <div className="text-sm text-gray-500">Views</div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Technologies Used</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Features</h3>
                      <ul className="space-y-2">
                        {selectedProject.keyFeatures.map((feature, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Success Metrics & Achievements */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Metrics</h3>
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">On-Time Delivery</span>
                        {selectedProject.successMetrics.onTimeDelivery ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Budget Compliance</span>
                        {selectedProject.successMetrics.budgetCompliance ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700">Quality Score</span>
                          <span className="font-bold text-gray-900">{selectedProject.successMetrics.qualityScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${selectedProject.successMetrics.qualityScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700">Client Satisfaction</span>
                          <span className="font-bold text-gray-900">{selectedProject.successMetrics.clientSatisfaction}/5.0</span>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <StarIconSolid 
                              key={star} 
                              className={`w-4 h-4 ${star <= selectedProject.successMetrics.clientSatisfaction ? 'text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
                    <div className="space-y-2 mb-6">
                      {selectedProject.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                          <TrophyIcon className="w-5 h-5 text-green-600 mr-3" />
                          <span className="text-green-800 font-medium">{achievement}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">Client Information</h4>
                      <p className="text-indigo-800">{selectedProject.clientName}</p>
                      <p className="text-indigo-600 text-sm">{selectedProject.industry} Industry</p>
                      <p className="text-indigo-600 text-sm">Completed on {formatDate(selectedProject.completedAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowProjectDetails(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700">
                    Contact for Similar Project
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortfolioPage; 