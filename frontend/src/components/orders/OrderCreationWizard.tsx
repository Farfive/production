import React, { useState, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  Upload,
  FileText,
  X,
  CheckCircle,
  Calendar,
  MapPin,
  Package,
  DollarSign
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { ordersApi, uploadFile } from '../../lib/api';
import { CreateOrderForm, CapabilityCategory, UrgencyLevel } from '../../types';
import Button from '../ui/Button';
import Input, { Textarea } from '../ui/Input';
import Select from '../ui/Select';
import { formatFileSize } from '../../lib/utils';

const categories = [
  { value: CapabilityCategory.CNC_MACHINING, label: 'CNC Machining' },
  { value: CapabilityCategory.ADDITIVE_MANUFACTURING, label: '3D Printing' },
  { value: CapabilityCategory.INJECTION_MOLDING, label: 'Injection Molding' },
  { value: CapabilityCategory.SHEET_METAL, label: 'Sheet Metal' },
  { value: CapabilityCategory.CASTING, label: 'Casting' },
  { value: CapabilityCategory.WELDING, label: 'Welding' },
  { value: CapabilityCategory.ASSEMBLY, label: 'Assembly' },
  { value: CapabilityCategory.FINISHING, label: 'Finishing' },
];

const urgencyLevels = [
  { value: UrgencyLevel.LOW, label: 'Low Priority' },
  { value: UrgencyLevel.MEDIUM, label: 'Medium Priority' },
  { value: UrgencyLevel.HIGH, label: 'High Priority' },
  { value: UrgencyLevel.URGENT, label: 'Urgent' },
];

// Dynamic fields based on category
const getCategoryFields = (category: CapabilityCategory) => {
  const baseFields = [
    { name: 'material', label: 'Material', type: 'select', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'tolerance', label: 'Tolerance', type: 'text', required: false },
  ];

  switch (category) {
    case CapabilityCategory.CNC_MACHINING:
      return [
        ...baseFields,
        { name: 'dimensions', label: 'Dimensions (LxWxH)', type: 'text', required: true },
        { name: 'surfaceFinish', label: 'Surface Finish', type: 'select', required: false },
        { name: 'toolingRequired', label: 'Special Tooling Required', type: 'boolean', required: false },
      ];
    case CapabilityCategory.ADDITIVE_MANUFACTURING:
      return [
        ...baseFields,
        { name: 'layerHeight', label: 'Layer Height (mm)', type: 'number', required: false },
        { name: 'infillDensity', label: 'Infill Density (%)', type: 'number', required: false },
        { name: 'supportMaterial', label: 'Support Material Required', type: 'boolean', required: false },
      ];
    case CapabilityCategory.INJECTION_MOLDING:
      return [
        ...baseFields,
        { name: 'cavityCount', label: 'Number of Cavities', type: 'number', required: true },
        { name: 'moldingPressure', label: 'Molding Pressure (MPa)', type: 'number', required: false },
        { name: 'cycleTime', label: 'Expected Cycle Time (s)', type: 'number', required: false },
      ];
    default:
      return baseFields;
  }
};

// Create a unified schema for the full form that matches CreateOrderForm
const createOrderSchema: yup.ObjectSchema<CreateOrderForm> = yup.object({
  title: yup.string().required('Order title is required').min(3, 'Title must be at least 3 characters'),
  description: yup.string().required('Description is required').min(10, 'Description must be at least 10 characters'),
  category: yup.mixed<CapabilityCategory>().required('Category is required'),
  urgency: yup.mixed<UrgencyLevel>().required('Urgency level is required'),
  specifications: yup.array().of(
    yup.object({
      name: yup.string().required('Specification name is required'),
      value: yup.string().required('Specification value is required'),
      unit: yup.string().optional(),
      tolerance: yup.string().optional(),
      isRequired: yup.boolean().default(true),
      description: yup.string().optional(),
    })
  ).required().min(1, 'At least one specification is required'),
  files: yup.array().of(yup.mixed<File>().required()).required().default([]),
  targetPrice: yup.number().optional().min(0, 'Price must be positive'),
  targetPriceMax: yup.number().optional().min(0, 'Maximum price must be positive'),
  currency: yup.string().required('Currency is required'),
  quantity: yup.number().required('Quantity is required').min(1, 'Quantity must be at least 1'),
  deliveryDate: yup.string().required('Delivery date is required'),
  deliveryAddress: yup.object({
    street: yup.string().required('Street address is required'),
    city: yup.string().required('City is required'),
    state: yup.string().required('State is required'),
    postalCode: yup.string().required('Postal code is required'),
    country: yup.string().required('Country is required'),
    latitude: yup.number().optional(),
    longitude: yup.number().optional(),
  }).required(),
  isPublic: yup.boolean().required(),
});

interface OrderCreationWizardProps {
  onComplete: (order: any) => void;
  onCancel: () => void;
  initialData?: Partial<CreateOrderForm>;
}

const OrderCreationWizard: React.FC<OrderCreationWizardProps> = ({
  onComplete,
  onCancel,
  initialData
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDraft, setIsDraft] = useState(false);
  const queryClient = useQueryClient();

  const totalSteps = 5;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    control,
    setValue,
    getValues,
    trigger,
  } = useForm<CreateOrderForm>({
    resolver: yupResolver(createOrderSchema),
    mode: 'onChange',
    defaultValues: {
      ...initialData,
      specifications: initialData?.specifications || [],
      deliveryAddress: initialData?.deliveryAddress || {},
      currency: initialData?.currency || 'USD',
      isPublic: initialData?.isPublic ?? true,
    },
  });

  const watchedCategory = useWatch({ control, name: 'category' });
  const dynamicFields = watchedCategory ? getCategoryFields(watchedCategory as CapabilityCategory) : [];

  // File upload with drag and drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    
    // Upload files
    for (const file of acceptedFiles) {
      try {
        const uploadResult = await uploadFile(file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });
        
        toast.success(`${file.name} uploaded successfully`);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        setUploadedFiles(prev => prev.filter(f => f.name !== file.name));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  // Save as draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: (data: Partial<CreateOrderForm>) => ordersApi.createOrder({ ...data, status: 'draft' } as CreateOrderForm),
    onSuccess: () => {
      toast.success('Order saved as draft');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => {
      toast.error('Failed to save draft');
    },
  });

  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: ordersApi.createOrder,
    onSuccess: (order) => {
      toast.success('Order created successfully!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onComplete(order);
    },
    onError: () => {
      toast.error('Failed to create order');
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateOrderForm)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'description', 'category', 'urgency'];
        break;
      case 2:
        fieldsToValidate = ['specifications'];
        break;
      case 3:
        fieldsToValidate = ['quantity', 'deliveryDate'];
        break;
      case 4:
        fieldsToValidate = ['deliveryAddress'];
        break;
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveDraft = () => {
    const formData = getValues();
    setIsDraft(true);
    saveDraftMutation.mutate({
      ...formData,
      files: uploadedFiles,
    });
  };

  const handleFinalSubmit = handleSubmit((data) => {
    const formData: CreateOrderForm = {
      title: data.title,
      description: data.description,
      category: data.category as CapabilityCategory,
      urgency: data.urgency as UrgencyLevel,
      specifications: data.specifications || [],
      files: uploadedFiles,
      targetPrice: data.targetPrice,
      targetPriceMax: data.targetPriceMax,
      currency: data.currency,
      quantity: data.quantity,
      deliveryDate: data.deliveryDate,
      deliveryAddress: data.deliveryAddress,
      isPublic: !isDraft,
    };
    
    submitOrderMutation.mutate(formData);
  });

  const renderProgressIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <motion.div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step < currentStep
                  ? 'bg-success-500 text-white'
                  : step === currentStep
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
              whileHover={{ scale: 1.1 }}
            >
              {step < currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step
              )}
            </motion.div>
            {step < totalSteps && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <Package className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Order Details
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tell us about your project requirements
              </p>
            </div>

            <Input
              {...register('title')}
              label="Order Title"
              placeholder="e.g., Custom aluminum brackets for aerospace application"
              errorText={errors.title?.message}
              isRequired
            />

            <Textarea
              {...register('description')}
              label="Project Description"
              placeholder="Provide detailed information about your project, including intended use, special requirements, and any other relevant details..."
              rows={4}
              errorText={errors.description?.message}
              isRequired
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                {...register('category')}
                label="Manufacturing Category"
                placeholder="Select category"
                options={categories}
                errorText={errors.category?.message}
                isRequired
              />

              <Select
                {...register('urgency')}
                label="Urgency Level"
                placeholder="Select urgency"
                options={urgencyLevels}
                errorText={errors.urgency?.message}
                isRequired
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Technical Specifications
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Define the technical requirements for your order
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dynamicFields.map((field) => (
                <div key={field.name}>
                  {field.type === 'select' ? (
                    <Select
                      {...register(`specifications.${field.name}` as any)}
                      label={field.label}
                      placeholder={`Select ${field.label.toLowerCase()}`}
                      options={[]} // You would populate this based on the field
                      isRequired={field.required}
                    />
                  ) : field.type === 'boolean' ? (
                    <div className="flex items-center space-x-2">
                      <input
                        {...register(`specifications.${field.name}` as any)}
                        type="checkbox"
                        className="form-checkbox"
                      />
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label}
                      </label>
                    </div>
                  ) : (
                    <Input
                      {...register(`specifications.${field.name}` as any)}
                      type={field.type}
                      label={field.label}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      isRequired={field.required}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* File Upload Section */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-lg text-primary-600 dark:text-primary-400">
                      Drop the files here...
                    </p>
                  ) : (
                    <div>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                        Drag & drop files here, or click to select
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Supported: PDF, Images, CAD files, Spreadsheets (Max 10MB each)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploaded Files ({uploadedFiles.length})
                  </h4>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadProgress[file.name] && uploadProgress[file.name] < 100 ? (
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        ) : (
                          <CheckCircle className="w-5 h-5 text-success-500" />
                        )}
                        <button
                          onClick={() => removeFile(file.name)}
                          className="text-gray-400 hover:text-error-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quantity & Pricing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Specify quantities and budget expectations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('quantity')}
                type="number"
                label="Quantity"
                placeholder="Enter quantity needed"
                errorText={errors.quantity?.message}
                isRequired
              />

              <Select
                {...register('currency')}
                label="Currency"
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ]}
                defaultValue="USD"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('targetPrice')}
                type="number"
                label="Target Price (Optional)"
                placeholder="Your ideal price per unit"
                helperText="This helps manufacturers provide competitive quotes"
              />

              <Input
                {...register('targetPriceMax')}
                type="number"
                label="Maximum Budget (Optional)"
                placeholder="Your maximum budget per unit"
                helperText="Quotes above this amount will be flagged"
              />
            </div>

            <Input
              {...register('deliveryDate')}
              type="date"
              label="Required Delivery Date"
              errorText={errors.deliveryDate?.message}
              isRequired
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Delivery Information
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Where should we deliver your order?
              </p>
            </div>

            <Input
              {...register('deliveryAddress.street')}
              label="Street Address"
              placeholder="Enter street address"
              errorText={errors.deliveryAddress?.street?.message}
              isRequired
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                {...register('deliveryAddress.city')}
                label="City"
                placeholder="Enter city"
                errorText={errors.deliveryAddress?.city?.message}
                isRequired
              />

              <Input
                {...register('deliveryAddress.state')}
                label="State/Province"
                placeholder="Enter state"
                errorText={errors.deliveryAddress?.state?.message}
                isRequired
              />

              <Input
                {...register('deliveryAddress.postalCode')}
                label="Postal Code"
                placeholder="Enter postal code"
                errorText={errors.deliveryAddress?.postalCode?.message}
                isRequired
              />
            </div>

            <Select
              {...register('deliveryAddress.country')}
              label="Country"
              placeholder="Select country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'DE', label: 'Germany' },
                { value: 'FR', label: 'France' },
                // Add more countries as needed
              ]}
              errorText={errors.deliveryAddress?.country?.message}
              isRequired
            />
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Review & Submit
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Review your order details before submission
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Title:</span>
                  <span className="font-medium">{getValues('title')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="font-medium">
                    {categories.find(c => c.value === getValues('category'))?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <span className="font-medium">{getValues('quantity')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Delivery Date:</span>
                  <span className="font-medium">{getValues('deliveryDate')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Files:</span>
                  <span className="font-medium">{uploadedFiles.length} files</span>
                </div>
              </div>
            </div>

            {/* Visibility Options */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <input
                  {...register('isPublic')}
                  type="checkbox"
                  className="form-checkbox"
                  defaultChecked={true}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Make this order public
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Public orders receive more quotes from verified manufacturers
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {renderProgressIndicator()}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              leftIcon={<Save className="w-4 h-4" />}
              loading={saveDraftMutation.isPending}
            >
              Save Draft
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                disabled={!isValid}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmit}
                leftIcon={<Send className="w-4 h-4" />}
                loading={submitOrderMutation.isPending}
              >
                Submit Order
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCreationWizard; 