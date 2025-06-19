import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Quote, UserRole, QuoteStatus } from '../../types';
import { toast } from 'react-hot-toast';
import MandatoryPaymentEnforcement from './MandatoryPaymentEnforcement';

interface QuoteDetailsViewProps {
  quote: Quote;
}

const QuoteDetailsView: React.FC<QuoteDetailsViewProps> = ({ quote }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return (
    <div>
      {/* Mandatory Payment Enforcement - Shows when quote is ACCEPTED */}
      {quote.status === QuoteStatus.ACCEPTED && user?.role === UserRole.CLIENT && (
        <div className="mb-6">
          <MandatoryPaymentEnforcement
            quoteId={Number(quote.id)}
            onPaymentComplete={() => {
              // Refresh quote data after payment
              queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
              toast.success('Payment secured! Production can now begin.');
            }}
            onQuoteExpired={() => {
              // Handle quote expiration
              queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
              toast.error('Quote expired due to non-payment.');
            }}
          />
        </div>
      )}

      {/* Existing quote details content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quote Details</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-semibold">{quote.totalAmount} {quote.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Time:</span>
            <span className="font-semibold">{quote.deliveryTime} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-semibold">{quote.status}</span>
          </div>
          {quote.notes && (
            <div>
              <span className="text-gray-600">Notes:</span>
              <p className="mt-1 text-gray-800">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailsView; 