import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus, Filter, Search, BarChart3, Download,
  Settings, Bell, FileText, Grid, List
} from 'lucide-react';

import { quotesApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Import new components
import QuoteTemplateManager from '../../components/quotes/QuoteTemplateManager';
import BulkQuoteOperations from '../../components/quotes/BulkQuoteOperations';
import QuoteAnalyticsDashboard from '../../components/analytics/QuoteAnalyticsDashboard';
import QuoteNotificationCenter from '../../components/notifications/QuoteNotificationCenter';
import QuoteExportPDF from '../../components/quotes/QuoteExportPDF';

const AdvancedQuotesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'quotes' | 'templates' | 'analytics' | 'notifications' | 'export'>('quotes');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    dateRange: 'all'
  });

  // Fetch quotes with advanced search
  const { data: quotes, isLoading, refetch } = useQuery({
    queryKey: ['quotes-advanced', searchQuery, filters],
    queryFn: () => quotesApi.getQuotes({
      query: searchQuery || undefined,
      status: filters.status !== 'all' ? [filters.status] : undefined,
      categories: filters.category !== 'all' ? [filters.category] : undefined,
      limit: 50
    })
  });

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Tab configuration
  const tabs = [
    {
      id: 'quotes' as const,
      label: 'Quote Management',
      icon: FileText,
      description: 'Manage quotes with bulk operations'
    },
    {
      id: 'templates' as const,
      label: 'Templates',
      icon: Settings,
      description: 'Create and manage quote templates'
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      description: 'View performance metrics and insights'
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      icon: Bell,
      description: 'Real-time quote notifications'
    },
    {
      id: 'export' as const,
      label: 'Export & Reports',
      icon: Download,
      description: 'Export quotes and generate reports'
    }
  ];

  // Filter available tabs based on user role
  const availableTabs = tabs.filter(tab => {
    if (tab.id === 'templates' && user?.role !== UserRole.MANUFACTURER) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Advanced Quote Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive quote management with advanced features
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {user?.role === UserRole.MANUFACTURER && (
                <Link to="/dashboard/quotes/create">
                  <Button leftIcon={<Plus className="w-4 h-4" />}>
                    Create Quote
                  </Button>
                </Link>
              )}
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Description */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            {availableTabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        {activeTab === 'quotes' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search quotes..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="cnc_machining">CNC Machining</option>
                    <option value="3d_printing">3D Printing</option>
                    <option value="injection_molding">Injection Molding</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    leftIcon={viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                  >
                    {viewMode === 'grid' ? 'List' : 'Grid'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Bulk Operations */}
            {quotes && quotes.length > 0 && (
              <BulkQuoteOperations
                quotes={quotes}
                selectedQuotes={selectedQuotes}
                onSelectionChange={setSelectedQuotes}
                onRefresh={handleRefresh}
              />
            )}

            {/* Loading State */}
            {isLoading && (
              <LoadingSpinner center text="Loading quotes..." />
            )}

            {/* Empty State */}
            {!isLoading && (!quotes || quotes.length === 0) && (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Quotes Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? 'No quotes match your search criteria.' : 'Start by creating your first quote.'}
                </p>
                {user?.role === UserRole.MANUFACTURER && (
                  <Link to="/dashboard/quotes/create">
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                      Create First Quote
                    </Button>
                  </Link>
                )}
              </Card>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <QuoteTemplateManager />
        )}

        {activeTab === 'analytics' && (
          <QuoteAnalyticsDashboard />
        )}

        {activeTab === 'notifications' && (
          <QuoteNotificationCenter />
        )}

        {activeTab === 'export' && (
          <QuoteExportPDF
            quotes={quotes || []}
            selectedQuotes={selectedQuotes}
            onExportComplete={(url) => {
              console.log('Export completed:', url);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AdvancedQuotesPage; 