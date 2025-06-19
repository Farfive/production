import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Mail,
  Calendar,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter,
  Clock,
  CheckCircle,
  X,
  Plus,
  Eye
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { TextArea } from '../ui/TextArea';
import { Switch } from '../ui/Switch';
import { quotesApi } from '../../lib/api';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  extension: string;
  supports: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'summary' | 'detailed' | 'analytics' | 'custom';
  fields: string[];
  charts: string[];
}

interface QuoteExportReportingProps {
  selectedQuotes?: number[];
  filters?: any;
  onClose?: () => void;
  className?: string;
}

const QuoteExportReporting: React.FC<QuoteExportReportingProps> = ({
  selectedQuotes = [],
  filters = {},
  onClose,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'report'>('export');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('summary');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [scheduleExport, setScheduleExport] = useState(false);
  const [exportFrequency, setExportFrequency] = useState('weekly');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  const exportFormats: ExportFormat[] = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional formatted document',
      icon: FileText,
      extension: 'pdf',
      supports: ['text', 'charts', 'images', 'tables']
    },
    {
      id: 'excel',
      name: 'Excel Spreadsheet',
      description: 'Data analysis and manipulation',
      icon: FileSpreadsheet,
      extension: 'xlsx',
      supports: ['data', 'charts', 'formulas']
    },
    {
      id: 'csv',
      name: 'CSV Data',
      description: 'Raw data for import/analysis',
      icon: FileSpreadsheet,
      extension: 'csv',
      supports: ['data']
    },
    {
      id: 'png',
      name: 'PNG Image',
      description: 'Charts and visualizations',
      icon: FileImage,
      extension: 'png',
      supports: ['charts', 'images']
    }
  ];

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'summary',
      name: 'Executive Summary',
      description: 'High-level overview with key metrics',
      type: 'summary',
      fields: ['total_quotes', 'win_rate', 'average_value', 'top_manufacturers'],
      charts: ['status_distribution', 'monthly_trends']
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive quote breakdown',
      type: 'detailed',
      fields: ['all_quote_data', 'pricing_breakdown', 'delivery_analysis'],
      charts: ['price_distribution', 'delivery_trends', 'manufacturer_comparison']
    },
    {
      id: 'analytics',
      name: 'Performance Analytics',
      description: 'Advanced metrics and insights',
      type: 'analytics',
      fields: ['performance_metrics', 'trend_analysis', 'forecasting'],
      charts: ['performance_radar', 'trend_lines', 'predictive_charts']
    },
    {
      id: 'custom',
      name: 'Custom Report',
      description: 'Build your own report',
      type: 'custom',
      fields: [],
      charts: []
    }
  ];

  const availableFields = [
    { id: 'quote_id', name: 'Quote ID', category: 'basic' },
    { id: 'status', name: 'Status', category: 'basic' },
    { id: 'price', name: 'Price', category: 'pricing' },
    { id: 'currency', name: 'Currency', category: 'pricing' },
    { id: 'delivery_days', name: 'Delivery Days', category: 'delivery' },
    { id: 'manufacturer', name: 'Manufacturer', category: 'basic' },
    { id: 'material', name: 'Material', category: 'technical' },
    { id: 'process', name: 'Process', category: 'technical' },
    { id: 'finish', name: 'Finish', category: 'technical' },
    { id: 'created_at', name: 'Created Date', category: 'dates' },
    { id: 'updated_at', name: 'Updated Date', category: 'dates' },
    { id: 'notes', name: 'Notes', category: 'details' },
    { id: 'breakdown_materials', name: 'Materials Cost', category: 'pricing' },
    { id: 'breakdown_labor', name: 'Labor Cost', category: 'pricing' },
    { id: 'breakdown_overhead', name: 'Overhead Cost', category: 'pricing' },
    { id: 'breakdown_shipping', name: 'Shipping Cost', category: 'pricing' },
    { id: 'breakdown_taxes', name: 'Taxes', category: 'pricing' }
  ];

  const availableCharts = [
    { id: 'status_pie', name: 'Status Distribution (Pie)', type: 'pie' },
    { id: 'price_histogram', name: 'Price Distribution (Histogram)', type: 'histogram' },
    { id: 'monthly_trends', name: 'Monthly Trends (Line)', type: 'line' },
    { id: 'manufacturer_bar', name: 'Quotes by Manufacturer (Bar)', type: 'bar' },
    { id: 'delivery_scatter', name: 'Price vs Delivery (Scatter)', type: 'scatter' },
    { id: 'win_rate_trend', name: 'Win Rate Trend (Line)', type: 'line' }
  ];

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: (data: any) => quotesApi.exportQuotes(data),
    onSuccess: (response) => {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', response.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    },
    onError: () => {
      toast.error('Export failed');
    }
  });

  // Generate report mutation
  const reportMutation = useMutation({
    mutationFn: (data: any) => quotesApi.generateReport(data),
    onSuccess: (_response) => {
      toast.success('Report generated successfully');
      // Handle report viewing/download
    },
    onError: () => {
      toast.error('Report generation failed');
    }
  });

  const handleExport = () => {
    const exportData = {
      format: selectedFormat,
      quote_ids: selectedQuotes,
      filters: filters,
      fields: customFields,
      include_charts: includeCharts,
      email_recipients: emailRecipients ? emailRecipients.split(',').map(e => e.trim()) : [],
      schedule: scheduleExport ? {
        frequency: exportFrequency,
        enabled: true
      } : null
    };

    exportMutation.mutate(exportData);
  };

  const handleGenerateReport = () => {
    const reportData = {
      template: selectedTemplate,
      title: reportTitle || `Quote Report - ${format(new Date(), 'MMM dd, yyyy')}`,
      description: reportDescription,
      quote_ids: selectedQuotes,
      filters: filters,
      fields: selectedTemplate === 'custom' ? customFields : reportTemplates.find(t => t.id === selectedTemplate)?.fields,
      charts: includeCharts ? (selectedTemplate === 'custom' ? [] : reportTemplates.find(t => t.id === selectedTemplate)?.charts) : [],
      format: selectedFormat
    };

    reportMutation.mutate(reportData);
  };

  const toggleCustomField = (fieldId: string) => {
    setCustomFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const getFieldsByCategory = (category: string) => {
    return availableFields.filter(field => field.category === category);
  };

  const categories = [...new Set(availableFields.map(field => field.category))];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Export & Reporting
        </h2>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'export'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Download className="h-4 w-4 inline mr-2" />
          Quick Export
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'report'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Generate Report
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <AnimatePresence mode="wait">
          {activeTab === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Export Format Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Choose Export Format
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exportFormats.map(format => (
                    <div
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFormat === format.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <format.icon className="h-8 w-8 text-primary-600" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {format.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {format.supports.map(support => (
                              <span
                                key={support}
                                className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded"
                              >
                                {support}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Export Options
                </h3>

                {/* Include Charts */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-gray-900 dark:text-white">
                      Include Charts
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add visual charts and graphs to the export
                    </p>
                  </div>
                  <Switch
                    checked={includeCharts}
                    onCheckedChange={setIncludeCharts}
                  />
                </div>

                {/* Email Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Recipients (optional)
                  </label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                </div>

                {/* Schedule Export */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-white">
                        Schedule Regular Exports
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically generate exports on a schedule
                      </p>
                    </div>
                    <Switch
                      checked={scheduleExport}
                      onCheckedChange={setScheduleExport}
                    />
                  </div>

                  {scheduleExport && (
                    <Select
                      value={exportFrequency}
                      onChange={(e) => setExportFrequency(e.target.value)}
                      options={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'quarterly', label: 'Quarterly' }
                      ]}
                    />
                  )}
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Export Summary
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Format: {exportFormats.find(f => f.id === selectedFormat)?.name}</p>
                  <p>Quotes: {selectedQuotes.length > 0 ? `${selectedQuotes.length} selected` : 'All filtered quotes'}</p>
                  <p>Charts: {includeCharts ? 'Included' : 'Not included'}</p>
                  {emailRecipients && <p>Email to: {emailRecipients}</p>}
                  {scheduleExport && <p>Schedule: {exportFrequency}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Report Template Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Choose Report Template
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          template.type === 'summary' ? 'bg-blue-100 text-blue-800' :
                          template.type === 'detailed' ? 'bg-green-100 text-green-800' :
                          template.type === 'analytics' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {template.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Report Details
                </h3>

                <Input
                  label="Report Title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title..."
                />

                <TextArea
                  label="Description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Brief description of the report..."
                  rows={3}
                />
              </div>

              {/* Custom Fields (for custom template) */}
              {selectedTemplate === 'custom' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select Fields to Include
                  </h3>
                  <div className="space-y-4">
                    {categories.map(category => (
                      <div key={category}>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                          {category.replace('_', ' ')}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {getFieldsByCategory(category).map(field => (
                            <label key={field.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={customFields.includes(field.id)}
                                onChange={() => toggleCustomField(field.id)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                {field.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedQuotes.length > 0 
            ? `${selectedQuotes.length} quotes selected`
            : 'All filtered quotes will be included'
          }
        </div>
        
        <div className="flex space-x-3">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={activeTab === 'export' ? handleExport : handleGenerateReport}
            loading={exportMutation.isPending || reportMutation.isPending}
          >
            {activeTab === 'export' ? (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuoteExportReporting; 