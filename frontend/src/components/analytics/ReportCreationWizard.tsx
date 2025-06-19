import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  FileText,
  BarChart3,
  Settings,
  Users,
  Calendar,
  Clock,
  Mail,
  Download,
  Plus,
  Minus,
  Target,
  Award,
  Wrench,
  DollarSign,
  Filter,
  Zap,
  Eye,
  Save,
  Send
} from 'lucide-react';

// Interfaces
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'production' | 'quality' | 'maintenance' | 'workforce' | 'financial' | 'custom';
  icon: React.ReactNode;
  fields: string[];
  defaultParameters: Record<string, any>;
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

interface ReportField {
  id: string;
  name: string;
  description: string;
  category: string;
  required: boolean;
  type: 'metric' | 'chart' | 'table' | 'text';
}

interface ScheduleConfig {
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  timezone?: string;
}

interface ReportConfig {
  name: string;
  description: string;
  template: string;
  fields: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  schedule: ScheduleConfig;
  recipients: string[];
  parameters: Record<string, any>;
  filters: Record<string, any>;
}

interface ReportCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: ReportConfig) => void;
  initialTemplate?: string;
}

const ReportCreationWizard: React.FC<ReportCreationWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialTemplate
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    template: initialTemplate || '',
    fields: [],
    format: 'pdf',
    schedule: { frequency: 'manual' },
    recipients: [],
    parameters: {},
    filters: {}
  });

  const totalSteps = 5;

  // Mock data
  const templates: ReportTemplate[] = [
    {
      id: 'production-summary',
      name: 'Production Summary',
      description: 'Comprehensive production metrics and KPIs',
      type: 'production',
      icon: <Target className="w-5 h-5" />,
      fields: ['output', 'efficiency', 'oee', 'downtime', 'quality'],
      defaultParameters: { period: '30d', includeCharts: true },
      estimatedTime: '5-10 min',
      complexity: 'moderate'
    },
    {
      id: 'quality-analysis',
      name: 'Quality Analysis',
      description: 'Quality metrics, defect rates, and compliance status',
      type: 'quality',
      icon: <Award className="w-5 h-5" />,
      fields: ['firstPassYield', 'defectRate', 'customerComplaints', 'certifications'],
      defaultParameters: { period: '7d', includeAudits: true },
      estimatedTime: '3-7 min',
      complexity: 'simple'
    },
    {
      id: 'maintenance-overview',
      name: 'Maintenance Overview',
      description: 'Equipment status, maintenance schedules, and costs',
      type: 'maintenance',
      icon: <Wrench className="w-5 h-5" />,
      fields: ['uptime', 'mtbf', 'mttr', 'workOrders', 'costs'],
      defaultParameters: { period: '30d', includeSchedule: true },
      estimatedTime: '7-12 min',
      complexity: 'moderate'
    },
    {
      id: 'workforce-analytics',
      name: 'Workforce Analytics',
      description: 'Employee performance, attendance, and training metrics',
      type: 'workforce',
      icon: <Users className="w-5 h-5" />,
      fields: ['productivity', 'attendance', 'training', 'safety'],
      defaultParameters: { period: '30d', includeSkills: true },
      estimatedTime: '5-8 min',
      complexity: 'simple'
    },
    {
      id: 'financial-summary',
      name: 'Financial Summary',
      description: 'Cost analysis, revenue, and profitability metrics',
      type: 'financial',
      icon: <DollarSign className="w-5 h-5" />,
      fields: ['revenue', 'costs', 'profit', 'roi', 'budget'],
      defaultParameters: { period: '30d', includeForecasts: true },
      estimatedTime: '8-15 min',
      complexity: 'complex'
    },
    {
      id: 'custom-report',
      name: 'Custom Report',
      description: 'Build your own report with custom fields and metrics',
      type: 'custom',
      icon: <Settings className="w-5 h-5" />,
      fields: [],
      defaultParameters: {},
      estimatedTime: '10-20 min',
      complexity: 'complex'
    }
  ];

  const availableFields: ReportField[] = [
    // Production fields
    { id: 'output', name: 'Production Output', description: 'Total units produced', category: 'Production', required: true, type: 'metric' },
    { id: 'efficiency', name: 'Overall Efficiency', description: 'Production efficiency percentage', category: 'Production', required: false, type: 'chart' },
    { id: 'oee', name: 'OEE Score', description: 'Overall Equipment Effectiveness', category: 'Production', required: false, type: 'metric' },
    { id: 'downtime', name: 'Downtime Analysis', description: 'Equipment downtime breakdown', category: 'Production', required: false, type: 'table' },
    
    // Quality fields
    { id: 'firstPassYield', name: 'First Pass Yield', description: 'Percentage of products passing quality on first attempt', category: 'Quality', required: true, type: 'metric' },
    { id: 'defectRate', name: 'Defect Rate', description: 'Rate of defective products', category: 'Quality', required: false, type: 'chart' },
    { id: 'customerComplaints', name: 'Customer Complaints', description: 'Number and analysis of customer complaints', category: 'Quality', required: false, type: 'table' },
    { id: 'certifications', name: 'Quality Certifications', description: 'Current certification status', category: 'Quality', required: false, type: 'text' },
    
    // Maintenance fields
    { id: 'uptime', name: 'Equipment Uptime', description: 'Percentage of operational time', category: 'Maintenance', required: true, type: 'metric' },
    { id: 'mtbf', name: 'MTBF', description: 'Mean Time Between Failures', category: 'Maintenance', required: false, type: 'metric' },
    { id: 'mttr', name: 'MTTR', description: 'Mean Time To Repair', category: 'Maintenance', required: false, type: 'metric' },
    { id: 'workOrders', name: 'Work Orders', description: 'Maintenance work orders summary', category: 'Maintenance', required: false, type: 'table' },
    { id: 'costs', name: 'Maintenance Costs', description: 'Cost breakdown for maintenance activities', category: 'Maintenance', required: false, type: 'chart' },
    
    // Workforce fields
    { id: 'productivity', name: 'Productivity Metrics', description: 'Employee productivity indicators', category: 'Workforce', required: true, type: 'chart' },
    { id: 'attendance', name: 'Attendance Rate', description: 'Employee attendance statistics', category: 'Workforce', required: false, type: 'metric' },
    { id: 'training', name: 'Training Progress', description: 'Employee training completion status', category: 'Workforce', required: false, type: 'table' },
    { id: 'safety', name: 'Safety Metrics', description: 'Workplace safety indicators', category: 'Workforce', required: false, type: 'chart' },
    
    // Financial fields
    { id: 'revenue', name: 'Revenue Analysis', description: 'Revenue trends and breakdown', category: 'Financial', required: true, type: 'chart' },
    { id: 'profit', name: 'Profit Margins', description: 'Profit margin analysis', category: 'Financial', required: false, type: 'metric' },
    { id: 'roi', name: 'Return on Investment', description: 'ROI calculations and trends', category: 'Financial', required: false, type: 'chart' },
    { id: 'budget', name: 'Budget Variance', description: 'Budget vs actual spending analysis', category: 'Financial', required: false, type: 'table' }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(reportConfig);
    onClose();
  };

  const updateConfig = (updates: Partial<ReportConfig>) => {
    setReportConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleField = (fieldId: string) => {
    const fields = reportConfig.fields.includes(fieldId)
      ? reportConfig.fields.filter(id => id !== fieldId)
      : [...reportConfig.fields, fieldId];
    updateConfig({ fields });
  };

  const addRecipient = (email: string) => {
    if (email && !reportConfig.recipients.includes(email)) {
      updateConfig({ recipients: [...reportConfig.recipients, email] });
    }
  };

  const removeRecipient = (email: string) => {
    updateConfig({ recipients: reportConfig.recipients.filter(r => r !== email) });
  };

  // Step 1: Template Selection
  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Report Template</h2>
        <p className="text-gray-600">Select a template to start with or create a custom report</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${
              reportConfig.template === template.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => updateConfig({ 
              template: template.id,
              fields: template.fields,
              parameters: template.defaultParameters
            })}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                reportConfig.template === template.id ? 'bg-blue-200' : 'bg-gray-100'
              }`}>
                {template.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    template.complexity === 'simple' ? 'bg-green-100 text-green-800' :
                    template.complexity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {template.complexity}
                  </span>
                  <span className="text-xs text-gray-500">{template.estimatedTime}</span>
                </div>
              </div>
              {reportConfig.template === template.id && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Step 2: Basic Configuration
  const renderBasicConfig = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Details</h2>
        <p className="text-gray-600">Configure basic report information</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Name *
          </label>
          <input
            type="text"
            value={reportConfig.name}
            onChange={(e) => updateConfig({ name: e.target.value })}
            placeholder="Enter report name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={reportConfig.description}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="Brief description of the report..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Output Format
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['pdf', 'excel', 'csv', 'json'].map((format) => (
              <button
                key={format}
                onClick={() => updateConfig({ format: format as any })}
                className={`p-3 border rounded-lg text-center transition-all ${
                  reportConfig.format === format
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium uppercase">{format}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Period
          </label>
          <select
            value={reportConfig.parameters?.period || '30d'}
            onChange={(e) => updateConfig({ 
              parameters: { ...reportConfig.parameters, period: e.target.value }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 3 Months</option>
            <option value="365d">Last 12 Months</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Step 3: Field Selection
  const renderFieldSelection = () => {
    const selectedTemplate = templates.find(t => t.id === reportConfig.template);
    const categoryFields = availableFields.filter(field => {
      if (selectedTemplate?.type === 'custom') return true;
      return field.category.toLowerCase() === selectedTemplate?.type;
    });

    const categories = [...new Set(categoryFields.map(field => field.category))];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Data Fields</h2>
          <p className="text-gray-600">Choose which metrics and data to include in your report</p>
        </div>

        {categories.map((category) => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              {category} Fields
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryFields
                .filter(field => field.category === category)
                .map((field) => (
                  <div
                    key={field.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      reportConfig.fields.includes(field.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => toggleField(field.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{field.name}</h4>
                          {field.required && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                        <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                          field.type === 'metric' ? 'bg-blue-100 text-blue-800' :
                          field.type === 'chart' ? 'bg-green-100 text-green-800' :
                          field.type === 'table' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {field.type}
                        </span>
                      </div>
                      {reportConfig.fields.includes(field.id) && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Step 4: Schedule & Recipients
  const renderScheduleConfig = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule & Recipients</h2>
        <p className="text-gray-600">Configure when and to whom the report should be sent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Schedule Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              value={reportConfig.schedule.frequency}
              onChange={(e) => updateConfig({
                schedule: { ...reportConfig.schedule, frequency: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">Manual (Generate on demand)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          {reportConfig.schedule.frequency !== 'manual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={reportConfig.schedule.time || '09:00'}
                onChange={(e) => updateConfig({
                  schedule: { ...reportConfig.schedule, time: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recipients</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Recipients
            </label>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter email address..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addRecipient((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="email"]') as HTMLInputElement;
                  if (input?.value) {
                    addRecipient(input.value);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {reportConfig.recipients.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Current Recipients
              </label>
              {reportConfig.recipients.map((email) => (
                <div key={email} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-sm">{email}</span>
                  <button
                    onClick={() => removeRecipient(email)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Step 5: Review & Confirm
  const renderReviewConfig = () => {
    const selectedTemplate = templates.find(t => t.id === reportConfig.template);
    const selectedFields = availableFields.filter(f => reportConfig.fields.includes(f.id));

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Configuration</h2>
          <p className="text-gray-600">Review your report settings before creating</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {reportConfig.name}</div>
              <div><span className="font-medium">Template:</span> {selectedTemplate?.name}</div>
              <div><span className="font-medium">Format:</span> {reportConfig.format.toUpperCase()}</div>
              <div><span className="font-medium">Period:</span> {reportConfig.parameters?.period || 'Not set'}</div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-gray-900">Schedule & Distribution</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Frequency:</span> {reportConfig.schedule.frequency}</div>
              {reportConfig.schedule.time && (
                <div><span className="font-medium">Time:</span> {reportConfig.schedule.time}</div>
              )}
              <div><span className="font-medium">Recipients:</span> {reportConfig.recipients.length} emails</div>
            </div>
          </div>
        </div>

        {/* Selected Fields */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Selected Fields ({selectedFields.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 text-green-600" />
                <span>{field.name}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  field.type === 'metric' ? 'bg-blue-100 text-blue-800' :
                  field.type === 'chart' ? 'bg-green-100 text-green-800' :
                  field.type === 'table' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {field.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center">
          <Eye className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-4">Report preview will be available after creation</p>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Generate Preview
          </button>
        </div>
      </div>
    );
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return reportConfig.template !== '';
      case 2: return reportConfig.name.trim() !== '';
      case 3: return reportConfig.fields.length > 0;
      case 4: return true; // Optional step
      case 5: return true; // Review step
      default: return false;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Create New Report</h1>
              <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex items-center space-x-4">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i + 1 < currentStep
                      ? 'bg-green-600 text-white'
                      : i + 1 === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {i + 1 < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`h-1 w-12 mx-2 ${
                      i + 1 < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
            {currentStep === 1 && renderTemplateSelection()}
            {currentStep === 2 && renderBasicConfig()}
            {currentStep === 3 && renderFieldSelection()}
            {currentStep === 4 && renderScheduleConfig()}
            {currentStep === 5 && renderReviewConfig()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!isStepValid()}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Report
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportCreationWizard; 