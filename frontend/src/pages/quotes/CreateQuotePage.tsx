import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Search, Plus, Package, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { OrderStatus } from '../../types';

import EnhancedQuoteBuilder from '../../components/quotes/EnhancedQuoteBuilder';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ordersApi } from '../../lib/api';

const CreateQuotePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(orderId ? parseInt(orderId) : null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrderSelection, setShowOrderSelection] = useState(!orderId);

  // Fetch available orders for quote creation
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', { search: searchTerm }],
    queryFn: () => ordersApi.getOrders({ 
      search: searchTerm || undefined,
      status: OrderStatus.PUBLISHED,
      limit: 10
    }),
    enabled: showOrderSelection
  });

  const handleOrderSelect = (orderIdToSelect: number) => {
    setSelectedOrderId(orderIdToSelect);
    setShowOrderSelection(false);
  };

  const handleCreateStandaloneQuote = () => {
    // Create a temporary order ID for standalone quotes
    setSelectedOrderId(-1);
    setShowOrderSelection(false);
  };

  if (showOrderSelection) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/quotes')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Quotes
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Quote
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select an existing order to quote for, or create a standalone quote
          </p>
        </div>

        {/* Search Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quote for Existing Order
          </h2>
          
          <div className="mb-4">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {ordersLoading ? (
            <LoadingSpinner center text="Loading orders..." />
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {orders?.data?.length ? (
                orders.data.map((order: any) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleOrderSelect(order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Order #{order.id}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.title || 'No title'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Requested: {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {order.quantity || 1} items
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No orders found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Standalone Quote */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Standalone Quote
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create a quote without linking to an existing order. You can define the project details during quote creation.
          </p>
          <Button
            onClick={handleCreateStandaloneQuote}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Standalone Quote
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedOrderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Order ID Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please select an order to create a quote.</p>
          <Button onClick={() => setShowOrderSelection(true)}>
            Select Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EnhancedQuoteBuilder
      orderId={selectedOrderId === -1 ? undefined : selectedOrderId}
      onSave={(_quote) => {
        toast.success('Quote created successfully');
        navigate(`/dashboard/quotes`);
      }}
      onCancel={() => navigate('/dashboard/quotes')}
    />
  );
};

export default CreateQuotePage; 