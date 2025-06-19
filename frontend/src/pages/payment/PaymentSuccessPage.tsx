import React, { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Download, MessageCircle, Calendar, ArrowRight } from 'lucide-react';
import { ordersApi, transactionsApi } from '../../lib/api';
import { measureApiCall } from '../../lib/performance';
import { formatCurrency, formatDate } from '../../lib/utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order_id');
  const transactionId = searchParams.get('transaction_id');
  const paymentIntentId = searchParams.get('payment_intent');

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => measureApiCall('orders.getById', () => ordersApi.getById(Number(orderId!))),
    enabled: !!orderId,
  });

  const { data: transaction, isLoading: transactionLoading } = useQuery({
    queryKey: ['transactions', transactionId],
    queryFn: () => measureApiCall('transactions.getById', () => transactionsApi.getById(transactionId!)),
    enabled: !!transactionId,
  });

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard');
    }
  }, [orderId, navigate]);

  if (orderLoading || transactionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading payment details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="max-w-4xl mx-auto py-12 px-4">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            
            <p className="text-lg text-gray-600">
              Your order has been confirmed and is now in production.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{order.title}</h3>
                      <p className="text-sm text-gray-600">Order #{order.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(order.totalAmount || 0, order.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qty: {order.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Order Date:</span>
                        <p className="font-medium">{formatDate(order.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Expected Delivery:</span>
                        <p className="font-medium">{formatDate(order.deliveryDate)}</p>
                      </div>
                    </div>
                  </div>

                  {order.manufacturer && (
                    <div className="border-t border-gray-200 pt-4">
                      <span className="text-gray-600 text-sm">Manufacturer:</span>
                      <p className="font-medium">{order.manufacturer.companyName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              {transaction && transaction.id && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium">{transaction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">
                        {transaction.paymentMethod?.card ? 
                          `**** **** **** ${transaction.paymentMethod.card.last4}` : 
                          'Card'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium">
                        {formatCurrency(transaction.amount || 0, transaction.currency || 'USD')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {transaction.status || 'Completed'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* What Happens Next */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">What Happens Next?</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Production Starts</h3>
                      <p className="text-sm text-gray-600">
                        The manufacturer will begin production of your order within 24 hours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Regular Updates</h3>
                      <p className="text-sm text-gray-600">
                        You'll receive progress updates and can message the manufacturer directly.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Quality Check & Shipping</h3>
                      <p className="text-sm text-gray-600">
                        Final quality check will be performed before shipping to your address.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Panel */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <Link
                    to={`/orders/${order.id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View Order Details
                  </Link>

                  <button
                    onClick={() => window.print()}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </button>

                  <Link
                    to={`/orders/${order.id}?tab=messages`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Manufacturer
                  </Link>

                  <Link
                    to="/orders/create"
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Place Another Order
                  </Link>
                </div>
              </div>

              {/* Support */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Our support team is here to help with any questions about your order.
                </p>
                <Link
                  to="/support"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Contact Support →
                </Link>
              </div>

              {/* Email Confirmation */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Email Confirmation</h3>
                <p className="text-sm text-gray-600">
                  A confirmation email with order details and tracking information has been sent to your email address.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PaymentSuccessPage; 