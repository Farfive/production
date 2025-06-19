import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Upload, AlertCircle } from 'lucide-react';
import { ordersApi } from '../../lib/api';
import { Order, CapabilityCategory, UrgencyLevel } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { toast } from 'react-hot-toast';

interface EditOrderForm {
  title: string;
  description: string;
  category: CapabilityCategory;
  quantity: number;
  targetPrice?: number;
  targetPriceMax?: number;
  currency: string;
  deliveryDate: string;
  urgency: UrgencyLevel;
  isPublic: boolean;
  material?: string;
  budgetPln?: number;
  preferredLocation?: string;
}

const EditOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EditOrderForm>({
    title: '',
    description: '',
    category: CapabilityCategory.CNC_MACHINING,
    quantity: 1,
    currency: 'USD',
    deliveryDate: '',
    urgency: UrgencyLevel.MEDIUM,
    isPublic: true,
  });

  // Fetch existing order data
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(Number(id!)),
    enabled: !!id,
  });

  // Update form data when order is loaded
  useEffect(() => {
    if (order) {
      setFormData({
        title: order.title,
        description: order.description,
        category: order.category,
        quantity: order.quantity,
        targetPrice: order.targetPrice,
        targetPriceMax: order.targetPriceMax,
        currency: order.currency,
        deliveryDate: order.deliveryDate.split('T')[0], // Convert to date input format
        urgency: order.urgency,
        isPublic: order.isPublic,
        material: order.material,
        budgetPln: order.budgetPln,
        preferredLocation: order.preferredLocation,
      });
    }
  }, [order]);

  // Update mutation
  const updateOrderMutation = useMutation({
    mutationFn: (data: Partial<EditOrderForm>) => {
      return ordersApi.updateOrder(Number(id!), data);
    },
    onSuccess: () => {
      toast.success('Order updated successfully');
      navigate(`/orders/${id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }
    
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    
    if (!formData.deliveryDate) {
      toast.error('Delivery date is required');
      return;
    }

    updateOrderMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof EditOrderForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBack = () => {
    navigate(`/orders/${id}`);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading order..." />;
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Failed to load order</h3>
          <p className="text-sm text-gray-600">Order not found or access denied.</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  // Check if order can be edited
  const canEdit = ['draft', 'pending', 'published'].includes(order.status);
  
  if (!canEdit) {
    return (
      <div className="p-6 text-center">
        <div className="text-yellow-600 mb-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Order cannot be edited</h3>
          <p className="text-sm text-gray-600">
            This order is in '{order.status}' status and cannot be modified.
          </p>
        </div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Order
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Order
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Order</h1>
          <p className="text-gray-600">Update order details and requirements</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief title for your manufacturing order"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Detailed description of what you need manufactured..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value as CapabilityCategory)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {Object.values(CapabilityCategory).map((category) => (
                          <option key={category} value={category}>
                            {category.replace(/_/g, ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Material
                      </label>
                      <input
                        type="text"
                        value={formData.material || ''}
                        onChange={(e) => handleInputChange('material', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Aluminum 6061, Steel 316L"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.targetPrice || ''}
                        onChange={(e) => handleInputChange('targetPrice', parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ideal price"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.targetPriceMax || ''}
                        onChange={(e) => handleInputChange('targetPriceMax', parseFloat(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Maximum budget"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline and Priority */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline & Priority</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency Level
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => handleInputChange('urgency', e.target.value as UrgencyLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.values(UrgencyLevel).map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Location
                    </label>
                    <input
                      type="text"
                      value={formData.preferredLocation || ''}
                      onChange={(e) => handleInputChange('preferredLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Europe, North America"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget (PLN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budgetPln || ''}
                      onChange={(e) => handleInputChange('budgetPln', parseFloat(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Budget in PLN"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                      Make this order public (visible to all manufacturers)
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Public orders get more visibility but private orders offer more control over who can quote.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={updateOrderMutation.isPending}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateOrderMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Updating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ErrorBoundary>
  );
};

export default EditOrderPage; 