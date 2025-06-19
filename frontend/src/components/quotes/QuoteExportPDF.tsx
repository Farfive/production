import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Download, FileText, Printer, Mail, Share2,
  Settings, CheckSquare, Square, Image, Calculator
} from 'lucide-react';

import { quotesApi } from '../../lib/api';
import { Quote, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

interface QuoteExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeBreakdown: boolean;
  includeNotes: boolean;
  includeAttachments: boolean;
  includeCompanyLogo: boolean;
  includeSignatures: boolean;
  includeTerms: boolean;
  template: 'standard' | 'detailed' | 'minimal' | 'invoice';
  orientation: 'portrait' | 'landscape';
  fontSize: 'small' | 'medium' | 'large';
  currency: string;
  language: 'en' | 'pl';
}

interface QuoteExportProps {
  quotes: Quote[];
  selectedQuotes?: string[];
  onExportComplete?: (downloadUrl: string) => void;
}

const QuoteExportPDF: React.FC<QuoteExportProps> = ({
  quotes,
  selectedQuotes = [],
  onExportComplete
}) => {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<QuoteExportOptions>({
    format: 'pdf',
    includeBreakdown: true,
    includeNotes: true,
    includeAttachments: false,
    includeCompanyLogo: true,
    includeSignatures: user?.role === UserRole.MANUFACTURER,
    includeTerms: true,
    template: 'standard',
    orientation: 'portrait',
    fontSize: 'medium',
    currency: 'USD',
    language: 'en'
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: QuoteExportOptions & { quoteIds: number[] }) => {
      setIsExporting(true);
      try {
        const response = await quotesApi.exportQuotes(options);
        return response;
      } finally {
        setIsExporting(false);
      }
    },
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = variables.format === 'pdf' ? 'pdf' : 
                      variables.format === 'excel' ? 'xlsx' : 'csv';
      const filename = `quotes_export_${timestamp}.${extension}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Quotes exported successfully as ${variables.format.toUpperCase()}`);
      
      if (onExportComplete) {
        onExportComplete(url);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Export failed');
      setIsExporting(false);
    }
  });

  // Email export mutation
  const emailExportMutation = useMutation({
    mutationFn: async (data: {
      quoteIds: number[];
      recipients: string[];
      subject: string;
      message: string;
      options: QuoteExportOptions;
    }) => {
      return quotesApi.bulkEmailQuotes({
        quote_ids: data.quoteIds,
        template: data.options.template,
        recipients: data.recipients,
        subject: data.subject,
        message: data.message
      });
    },
    onSuccess: () => {
      toast.success('Quotes emailed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Email failed');
    }
  });

  // Handle export
  const handleExport = () => {
    const quotesToExport = selectedQuotes.length > 0 
      ? quotes.filter(q => selectedQuotes.includes(q.id))
      : quotes;

    if (quotesToExport.length === 0) {
      toast.error('No quotes selected for export');
      return;
    }

    const quoteIds = quotesToExport.map(q => parseInt(q.id));
    exportMutation.mutate({ ...exportOptions, quoteIds });
  };

  // Handle email export
  const handleEmailExport = () => {
    const recipients = prompt('Enter recipient email addresses (comma separated):');
    if (!recipients) return;

    const quotesToExport = selectedQuotes.length > 0 
      ? quotes.filter(q => selectedQuotes.includes(q.id))
      : quotes;

    const quoteIds = quotesToExport.map(q => parseInt(q.id));
    const subject = `Quote Export - ${quotesToExport.length} quote${quotesToExport.length !== 1 ? 's' : ''}`;
    const message = `Please find the attached quote${quotesToExport.length !== 1 ? 's' : ''} for your review.`;

    emailExportMutation.mutate({
      quoteIds,
      recipients: recipients.split(',').map(email => email.trim()),
      subject,
      message,
      options: exportOptions
    });
  };

  // Preview options for selected template
  const getTemplatePreview = () => {
    switch (exportOptions.template) {
      case 'standard':
        return 'Professional layout with company headers, detailed breakdown, and terms';
      case 'detailed':
        return 'Comprehensive format with full cost analysis, timeline, and specifications';
      case 'minimal':
        return 'Clean, simple layout with essential information only';
      case 'invoice':
        return 'Invoice-style format suitable for billing and accounting';
      default:
        return '';
    }
  };

  const quotesToExport = selectedQuotes.length > 0 
    ? quotes.filter(q => selectedQuotes.includes(q.id))
    : quotes;

  return (
    <div className="space-y-4">
      {/* Export Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export Quotes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export {quotesToExport.length} quote{quotesToExport.length !== 1 ? 's' : ''} 
              {' '}in various formats
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowOptions(!showOptions)}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Export Options
            </Button>
            
            <Button
              onClick={handleExport}
              disabled={isExporting || quotesToExport.length === 0}
              leftIcon={isExporting ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleEmailExport}
              disabled={emailExportMutation.isPending || quotesToExport.length === 0}
              leftIcon={emailExportMutation.isPending ? <LoadingSpinner size="sm" /> : <Mail className="w-4 h-4" />}
            >
              Email
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Options Panel */}
      {showOptions && (
        <Card className="p-6">
          <div className="space-y-6">
            <h4 className="text-lg font-semibold">Export Configuration</h4>
            
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">Export Format</label>
              <div className="grid grid-cols-3 gap-3">
                {(['pdf', 'excel', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      exportOptions.format === format
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {format === 'pdf' && <FileText className="w-6 h-6" />}
                      {format === 'excel' && <Calculator className="w-6 h-6" />}
                      {format === 'csv' && <FileText className="w-6 h-6" />}
                      <span className="text-sm font-medium uppercase">{format}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection (PDF only) */}
            {exportOptions.format === 'pdf' && (
              <div>
                <label className="block text-sm font-medium mb-3">PDF Template</label>
                <div className="space-y-2">
                  {(['standard', 'detailed', 'minimal', 'invoice'] as const).map((template) => (
                    <label key={template} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        type="radio"
                        name="template"
                        checked={exportOptions.template === template}
                        onChange={() => setExportOptions(prev => ({ ...prev, template }))}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium capitalize">{template}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {getTemplatePreview()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Content Options */}
            <div>
              <label className="block text-sm font-medium mb-3">Include Content</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'includeBreakdown', label: 'Cost Breakdown' },
                  { key: 'includeNotes', label: 'Notes & Comments' },
                  { key: 'includeAttachments', label: 'Attachments' },
                  { key: 'includeCompanyLogo', label: 'Company Logo' },
                  { key: 'includeSignatures', label: 'Digital Signatures' },
                  { key: 'includeTerms', label: 'Terms & Conditions' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions[key as keyof QuoteExportOptions] as boolean}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* PDF Specific Options */}
            {exportOptions.format === 'pdf' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Orientation</label>
                  <select
                    value={exportOptions.orientation}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      orientation: e.target.value as 'portrait' | 'landscape'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Font Size</label>
                  <select
                    value={exportOptions.fontSize}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      fontSize: e.target.value as 'small' | 'medium' | 'large'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={exportOptions.language}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      language: e.target.value as 'en' | 'pl'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="pl">Polski</option>
                  </select>
                </div>
              </div>
            )}

            {/* Currency Option */}
            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select
                value={exportOptions.currency}
                onChange={(e) => setExportOptions(prev => ({ ...prev, currency: e.target.value }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="PLN">PLN (zł)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Export Preview */}
      {quotesToExport.length > 0 && (
        <Card className="p-4">
          <h4 className="text-lg font-semibold mb-4">Export Preview</h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Format:</span>
                <span className="ml-2 font-medium uppercase">{exportOptions.format}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Template:</span>
                <span className="ml-2 font-medium capitalize">{exportOptions.template}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Quotes:</span>
                <span className="ml-2 font-medium">{quotesToExport.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                <span className="ml-2 font-medium">
                  {quotesToExport.reduce((sum, quote) => sum + quote.totalAmount, 0).toLocaleString()} {exportOptions.currency}
                </span>
              </div>
            </div>
            
            {/* Quote List */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h5 className="text-sm font-medium mb-2">Quotes to Export:</h5>
              <div className="space-y-1">
                {quotesToExport.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between text-sm">
                    <span>Quote #{quote.id} - Order #{quote.orderId}</span>
                    <span className="font-medium">
                      {quote.totalAmount} {quote.currency}
                    </span>
                  </div>
                ))}
                {quotesToExport.length > 5 && (
                  <div className="text-sm text-gray-500">
                    ... and {quotesToExport.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setExportOptions(prev => ({ ...prev, format: 'pdf', template: 'standard' }));
            handleExport();
          }}
          disabled={isExporting || quotesToExport.length === 0}
          leftIcon={<FileText className="w-4 h-4" />}
        >
          Quick PDF Export
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            setExportOptions(prev => ({ ...prev, format: 'excel' }));
            handleExport();
          }}
          disabled={isExporting || quotesToExport.length === 0}
          leftIcon={<Calculator className="w-4 h-4" />}
        >
          Excel Spreadsheet
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Quotes Export - ${quotesToExport.length} quotes`,
                text: 'Manufacturing quotes for review',
                url: window.location.href
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copied to clipboard');
            }
          }}
          leftIcon={<Share2 className="w-4 h-4" />}
        >
          Share Link
        </Button>
      </div>
    </div>
  );
};

export default QuoteExportPDF; 