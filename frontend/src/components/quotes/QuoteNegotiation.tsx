import React, { useState, useEffect } from 'react';
import { Bell, Send, Upload, FileText, Download, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { quotesApi } from '../../lib/api';
import { Quote, QuoteNegotiation, QuoteNegotiationResponse, QuoteAttachment } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';

interface QuoteNegotiationProps {
  quote: Quote;
  onQuoteUpdated: (quote: Quote) => void;
  onClose: () => void;
}

const QuoteNegotiation: React.FC<QuoteNegotiationProps> = ({
  quote,
  onQuoteUpdated,
  onClose
}) => {
  const { user } = useAuth();
  const [negotiations, setNegotiations] = useState<QuoteNegotiationResponse[]>([]);
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Negotiation form state
  const [message, setMessage] = useState('');
  const [requestedPrice, setRequestedPrice] = useState<number | ''>('');
  const [requestedDeliveryDays, setRequestedDeliveryDays] = useState<number | ''>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Load negotiations and attachments
  useEffect(() => {
    loadData();
  }, [quote.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [negotiationsData, attachmentsData] = await Promise.all([
        quotesApi.getNegotiations(Number(quote.id)),
        quotesApi.getAttachments(Number(quote.id))
      ]);
      setNegotiations(negotiationsData);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load negotiation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setSending(true);
      
      const negotiationData: QuoteNegotiation = {
        quote_id: Number(quote.id),
        message: message.trim(),
        requested_price: requestedPrice ? Number(requestedPrice) : undefined,
        requested_delivery_days: requestedDeliveryDays ? Number(requestedDeliveryDays) : undefined,
        changes_requested: {}
      };

      const newNegotiation = await quotesApi.requestNegotiation(Number(quote.id), negotiationData);
      setNegotiations(prev => [...prev, newNegotiation]);
      
      // Clear form
      setMessage('');
      setRequestedPrice('');
      setRequestedDeliveryDays('');
      
    } catch (error) {
      console.error('Failed to submit negotiation:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      const uploadedFiles = await quotesApi.uploadAttachments(
        Number(quote.id),
        selectedFiles
      );
      setAttachments(prev => [...prev, ...uploadedFiles]);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const downloadAttachment = async (attachment: QuoteAttachment) => {
    try {
      const blob = await quotesApi.downloadAttachment(Number(quote.id), attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.original_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download attachment:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency || 'USD'
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isClient = user?.role === 'client';
  const isManufacturer = user?.role === 'manufacturer';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Quote Negotiation
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quote Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Current Price</span>
            <p className="font-semibold">{formatCurrency(quote.totalAmount)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Delivery Time</span>
            <p className="font-semibold">{quote.deliveryTime} days</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <p className="font-semibold capitalize">{quote.status}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Valid Until</span>
            <p className="font-semibold">
              {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'No expiry'}
            </p>
          </div>
        </div>
      </div>

      {/* Negotiations History */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Negotiation History</h3>
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {negotiations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No negotiations yet</p>
          ) : (
            negotiations.map((negotiation) => (
              <div
                key={negotiation.id}
                className={`p-4 rounded-lg border ${
                  String(negotiation.created_by) === String(user?.id)
                    ? 'bg-blue-50 border-blue-200 ml-8'
                    : 'bg-gray-50 border-gray-200 mr-8'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm text-gray-600">
                    {String(negotiation.created_by) === String(user?.id) ? 'You' : 'Counterparty'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(negotiation.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-800 mb-2">{negotiation.message}</p>
                {(negotiation.requested_price || negotiation.requested_delivery_days) && (
                  <div className="flex space-x-4 text-sm">
                    {negotiation.requested_price && (
                      <span className="text-green-600">
                        Price: {formatCurrency(negotiation.requested_price)}
                      </span>
                    )}
                    {negotiation.requested_delivery_days && (
                      <span className="text-blue-600">
                        Delivery: {negotiation.requested_delivery_days} days
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    negotiation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    negotiation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    negotiation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {negotiation.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.original_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)} • {attachment.type.toUpperCase()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadAttachment(attachment)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* New Negotiation Form (Client only) */}
      {isClient && quote.status !== 'accepted' && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Send Negotiation Request</h3>
          <form onSubmit={handleSubmitNegotiation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your negotiation request..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Price ({quote.currency})
                </label>
                <Input
                  type="number"
                  value={requestedPrice}
                  onChange={(e) => setRequestedPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder={`Current: ${quote.totalAmount}`}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Delivery (days)
                </label>
                <Input
                  type="number"
                  value={requestedDeliveryDays}
                  onChange={(e) => setRequestedDeliveryDays(e.target.value ? Number(e.target.value) : '')}
                  placeholder={`Current: ${quote.deliveryTime}`}
                  min="1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="submit"
                disabled={!message.trim() || sending}
                loading={sending}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* File Upload (Manufacturer only) */}
      {isManufacturer && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Additional Files</h3>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.dwg,.dxf,.step,.stl,.png,.jpg,.jpeg"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelectedFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  loading={uploading}
                  size="sm"
                >
                  Upload Files
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteNegotiation; 