import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, Settings, Eye, Users } from 'lucide-react';

import QuoteComparison from '../components/quotes/QuoteComparison';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const QuoteComparisonPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Order
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No order ID provided for quote comparison.
          </p>
          <Button onClick={() => navigate('/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  const handleQuoteSelect = (quote: any) => {
    setSelectedQuote(quote);
    // Navigate to quote detail or trigger selection process
    console.log('Selected quote:', quote);
  };

  const handleExportComparison = async () => {
    try {
      // Implementation for exporting comparison
      console.log('Exporting quote comparison...');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleShareComparison = async () => {
    try {
      // Implementation for sharing comparison
      console.log('Sharing quote comparison...');
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/orders')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Orders
              </Button>
              
              <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Quote Comparison
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Order #{orderId}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportComparison}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareComparison}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share
              </Button>

              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/orders/${orderId}/settings`)}
                  leftIcon={<Settings className="w-4 h-4" />}
                >
                  Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Status Bar */}
          {selectedQuote && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      Quote Selected
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Quote from {selectedQuote.manufacturer?.companyName} has been selected for review.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuote(null)}
                >
                  Clear Selection
                </Button>
              </div>
            </motion.div>
          )}

          {/* Quote Comparison Component */}
          <QuoteComparison
            orderId={orderId}
            onQuoteSelect={handleQuoteSelect}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm"
          />

          {/* Collaboration Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        Collaborative evaluation session started
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        2 hours ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        New quote received from TechCorp Manufacturing
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        4 hours ago
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                        <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        Decision criteria updated
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        1 day ago
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Comparison Report
                  </Button>
                  
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Invite Team Members
                  </Button>
                  
                  <Button className="w-full justify-start" variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with Stakeholders
                  </Button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Evaluation Progress
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Team Evaluations</span>
                      <span className="font-medium text-gray-900 dark:text-white">3/5</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Risk Assessment</span>
                      <span className="font-medium text-green-600 dark:text-green-400">Complete</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Compliance Check</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">In Progress</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QuoteComparisonPage; 