import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, ArrowLeft, CreditCard, HelpCircle } from 'lucide-react';

const PaymentFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const orderId = searchParams.get('order_id');
  const errorCode = searchParams.get('error_code');
  const errorMessage = searchParams.get('error_message');

  const getErrorDetails = (code: string | null) => {
    switch (code) {
      case 'card_declined':
        return {
          title: 'Card Declined',
          description: 'Your card was declined by the bank. Please try a different payment method or contact your bank.',
          suggestion: 'Try using a different card or contact your bank to authorize the payment.'
        };
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          description: 'There are insufficient funds available on your card to complete this payment.',
          suggestion: 'Please check your account balance or use a different payment method.'
        };
      case 'expired_card':
        return {
          title: 'Expired Card',
          description: 'The card you used has expired.',
          suggestion: 'Please update your card information with a valid, non-expired card.'
        };
      case 'invalid_cvc':
        return {
          title: 'Invalid Security Code',
          description: 'The CVC/CVV code you entered is incorrect.',
          suggestion: 'Please double-check the 3-digit code on the back of your card.'
        };
      case 'processing_error':
        return {
          title: 'Processing Error',
          description: 'There was an error processing your payment.',
          suggestion: 'This is usually temporary. Please try again in a few minutes.'
        };
      default:
        return {
          title: 'Payment Failed',
          description: errorMessage || 'We were unable to process your payment at this time.',
          suggestion: 'Please try again or use a different payment method.'
        };
    }
  };

  const errorDetails = getErrorDetails(errorCode);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Error Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {errorDetails.title}
          </h1>
          
          <p className="text-lg text-gray-600">
            {errorDetails.description}
          </p>
        </div>

        {/* Error Details Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="space-y-6">
            {/* Error Information */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">What went wrong?</h3>
                  <p className="text-sm text-red-700">{errorDetails.suggestion}</p>
                </div>
              </div>
            </div>

            {/* Order Information */}
            {orderId && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-medium text-gray-900 mb-2">Order Information</h3>
                <p className="text-sm text-gray-600">Order ID: #{orderId}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your order is still saved and waiting for payment completion.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {orderId ? (
                <>
                  <button
                    onClick={() => navigate(`/payments/order/${orderId}`)}
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Try Payment Again
                  </button>
                  
                  <Link
                    to={`/orders/${orderId}`}
                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Return to Order
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Return to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Common Solutions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Common Solutions
            </h3>
            
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Check that your card details are correct
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Ensure your card has sufficient funds
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Contact your bank to authorize international payments
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Try using a different payment method
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-green-600" />
              Need More Help?
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              If you continue to experience issues, our support team is here to help.
            </p>
            
            <div className="space-y-2">
              <Link
                to="/support"
                className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Contact Support
              </Link>
              
              <Link
                to="/help/payments"
                className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Payment Help Center
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            🔒 Your payment information is secure and encrypted. No payment details are stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage; 