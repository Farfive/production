import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import OrderCreationWizard from '../../components/orders/OrderCreationWizard';
import { CreateOrderForm } from '../../types';
import { toast } from 'react-hot-toast';

const CreateOrderPage: React.FC = () => {
  const navigate = useNavigate();

  const handleOrderSubmit = async (_orderData: CreateOrderForm) => {
    try {
      // This will be handled by the OrderCreationWizard's mutation
      toast.success('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to create order. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/orders"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
              <div className="h-4 border-l border-gray-300 dark:border-gray-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Order
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Order Creation Wizard */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <OrderCreationWizard 
                  onComplete={handleOrderSubmit}
                  onCancel={() => navigate('/orders')}
                />
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Progress Steps */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Order Creation Steps
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">1</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Basic Information
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Title, description, category
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">2</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Technical Specifications
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Detailed requirements
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">3</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Files & Documentation
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Upload supporting files
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">4</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Budget & Timeline
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pricing and delivery
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">5</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Review & Submit
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Final review before posting
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Tips for Better Quotes
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Be specific about your requirements</li>
                      <li>• Include technical drawings when possible</li>
                      <li>• Set realistic timelines</li>
                      <li>• Provide material preferences</li>
                      <li>• Mention quality standards needed</li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Platform Statistics
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Active Manufacturers
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      1,247
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Avg Response Time
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      4.2 hours
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Success Rate
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      94%
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Support */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
              >
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Need Help?
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Our support team is here to help you create the perfect order.
                </p>
                <button className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Contact Support
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderPage; 