import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, TrendingUp } from 'lucide-react';

import QuoteTemplateLibrary from '../../components/quotes/QuoteTemplateLibrary';
import Button from '../../components/ui/Button';

const QuoteTemplatesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Quote Templates
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage reusable quote templates to speed up your quoting process
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Templates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">85%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">2.3x</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Faster Quotes</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Benefits Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-8 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Boost Your Quoting Efficiency
              </h2>
              <p className="text-blue-100 mb-4">
                Save time and ensure consistency with pre-built quote templates. 
                Manufacturers using templates create quotes 60% faster on average.
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  <span className="text-sm">Faster quote creation</span>
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  <span className="text-sm">Consistent pricing</span>
                </div>
                <div className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="text-sm">Reusable components</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <FileText className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Template Library */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <QuoteTemplateLibrary />
        </motion.div>
      </div>
    </div>
  );
};

export default QuoteTemplatesPage; 