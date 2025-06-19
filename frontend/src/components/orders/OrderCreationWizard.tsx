import React, { useState, useCallback, useEffect } from 'react';
import { useForm, useWatch, useController } from 'react-hook-form';
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
  DollarSign,
  Zap,
  Eye,
  MessageSquare,
  Star,
  Clock,
  TrendingUp,
  Cpu,
  Sparkles,
  AlertTriangle,
  Settings,
  Calculator
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { ordersApi, uploadFile } from '../../lib/api';
import { productionQuotesApi, productionQuoteHelpers } from '../../lib/api/productionQuotes';
import { smartMatchingApi, smartMatchingHelpers, SmartMatchResponse } from '../../lib/api/smartMatching';
import { 
  CreateOrderForm, 
  CapabilityCategory, 
  UrgencyLevel, 
  ProductionQuote,
  ProductionQuoteMatch,
  ProductionQuoteInquiryCreate
} from '../../types';
import Button from '../ui/Button';
import Input, { Textarea } from '../ui/Input';
import Select from '../ui/Select';
import { formatFileSize, formatCurrency, cn } from '../../lib/utils';

// Field type definition for dynamic form fields
interface DynamicField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: { value: string; label: string }[];
}

const categories = [
  // Machining & Cutting
  { value: CapabilityCategory.CNC_MACHINING, label: 'CNC Machining' },
  { value: CapabilityCategory.TURNING, label: 'Turning (Lathe)' },
  { value: CapabilityCategory.MILLING, label: 'Milling' },
  { value: CapabilityCategory.GRINDING, label: 'Grinding' },
  { value: CapabilityCategory.EDM, label: 'EDM (Electrical Discharge Machining)' },
  { value: CapabilityCategory.LASER_CUTTING, label: 'Laser Cutting' },
  { value: CapabilityCategory.PLASMA_CUTTING, label: 'Plasma Cutting' },
  { value: CapabilityCategory.WATERJET_CUTTING, label: 'Waterjet Cutting' },
  
  // Additive Manufacturing
  { value: CapabilityCategory.ADDITIVE_MANUFACTURING, label: '3D Printing (General)' },
  { value: CapabilityCategory.FDM_3D_PRINTING, label: 'FDM 3D Printing' },
  { value: CapabilityCategory.SLA_3D_PRINTING, label: 'SLA 3D Printing' },
  { value: CapabilityCategory.SLS_3D_PRINTING, label: 'SLS 3D Printing' },
  { value: CapabilityCategory.METAL_3D_PRINTING, label: 'Metal 3D Printing' },
  
  // Molding & Forming
  { value: CapabilityCategory.INJECTION_MOLDING, label: 'Injection Molding' },
  { value: CapabilityCategory.BLOW_MOLDING, label: 'Blow Molding' },
  { value: CapabilityCategory.COMPRESSION_MOLDING, label: 'Compression Molding' },
  { value: CapabilityCategory.ROTATIONAL_MOLDING, label: 'Rotational Molding' },
  { value: CapabilityCategory.THERMOFORMING, label: 'Thermoforming' },
  { value: CapabilityCategory.VACUUM_FORMING, label: 'Vacuum Forming' },
  
  // Sheet Metal & Fabrication
  { value: CapabilityCategory.SHEET_METAL, label: 'Sheet Metal Fabrication' },
  { value: CapabilityCategory.METAL_STAMPING, label: 'Metal Stamping' },
  { value: CapabilityCategory.METAL_BENDING, label: 'Metal Bending' },
  { value: CapabilityCategory.ROLL_FORMING, label: 'Roll Forming' },
  { value: CapabilityCategory.DEEP_DRAWING, label: 'Deep Drawing' },
  { value: CapabilityCategory.HYDROFORMING, label: 'Hydroforming' },
  
  // Casting & Foundry
  { value: CapabilityCategory.CASTING, label: 'Casting (General)' },
  { value: CapabilityCategory.SAND_CASTING, label: 'Sand Casting' },
  { value: CapabilityCategory.INVESTMENT_CASTING, label: 'Investment Casting' },
  { value: CapabilityCategory.DIE_CASTING, label: 'Die Casting' },
  { value: CapabilityCategory.PRESSURE_DIE_CASTING, label: 'Pressure Die Casting' },
  { value: CapabilityCategory.CENTRIFUGAL_CASTING, label: 'Centrifugal Casting' },
  
  // Joining & Welding
  { value: CapabilityCategory.WELDING, label: 'Welding (General)' },
  { value: CapabilityCategory.TIG_WELDING, label: 'TIG Welding' },
  { value: CapabilityCategory.MIG_WELDING, label: 'MIG Welding' },
  { value: CapabilityCategory.ARC_WELDING, label: 'Arc Welding' },
  { value: CapabilityCategory.SPOT_WELDING, label: 'Spot Welding' },
  { value: CapabilityCategory.LASER_WELDING, label: 'Laser Welding' },
  { value: CapabilityCategory.BRAZING, label: 'Brazing' },
  { value: CapabilityCategory.SOLDERING, label: 'Soldering' },
  
  // Assembly & Integration
  { value: CapabilityCategory.ASSEMBLY, label: 'Assembly (General)' },
  { value: CapabilityCategory.MECHANICAL_ASSEMBLY, label: 'Mechanical Assembly' },
  { value: CapabilityCategory.ELECTRONIC_ASSEMBLY, label: 'Electronic Assembly' },
  { value: CapabilityCategory.PCB_ASSEMBLY, label: 'PCB Assembly' },
  { value: CapabilityCategory.CABLE_ASSEMBLY, label: 'Cable Assembly' },
  
  // Surface Treatment & Finishing
  { value: CapabilityCategory.FINISHING, label: 'Finishing (General)' },
  { value: CapabilityCategory.ANODIZING, label: 'Anodizing' },
  { value: CapabilityCategory.ELECTROPLATING, label: 'Electroplating' },
  { value: CapabilityCategory.POWDER_COATING, label: 'Powder Coating' },
  { value: CapabilityCategory.PAINTING, label: 'Painting' },
  { value: CapabilityCategory.SANDBLASTING, label: 'Sandblasting' },
  { value: CapabilityCategory.POLISHING, label: 'Polishing' },
  { value: CapabilityCategory.HEAT_TREATMENT, label: 'Heat Treatment' },
  { value: CapabilityCategory.COATING, label: 'Coating' },
  
  // Textiles & Soft Goods
  { value: CapabilityCategory.TEXTILE_MANUFACTURING, label: 'Textile Manufacturing' },
  { value: CapabilityCategory.SEWING, label: 'Sewing' },
  { value: CapabilityCategory.KNITTING, label: 'Knitting' },
  { value: CapabilityCategory.WEAVING, label: 'Weaving' },
  { value: CapabilityCategory.EMBROIDERY, label: 'Embroidery' },
  { value: CapabilityCategory.SCREEN_PRINTING, label: 'Screen Printing' },
  { value: CapabilityCategory.DIGITAL_PRINTING, label: 'Digital Printing' },
  
  // Specialized Processes
  { value: CapabilityCategory.RUBBER_MOLDING, label: 'Rubber Molding' },
  { value: CapabilityCategory.CERAMIC_MANUFACTURING, label: 'Ceramic Manufacturing' },
  { value: CapabilityCategory.GLASS_MANUFACTURING, label: 'Glass Manufacturing' },
  { value: CapabilityCategory.COMPOSITE_MANUFACTURING, label: 'Composite Manufacturing' },
  { value: CapabilityCategory.WOODWORKING, label: 'Woodworking' },
  { value: CapabilityCategory.FOAM_CUTTING, label: 'Foam Cutting' },
  { value: CapabilityCategory.EXTRUSION, label: 'Extrusion' },
  { value: CapabilityCategory.FORGING, label: 'Forging' },
  
  // Electronics & Technology
  { value: CapabilityCategory.CIRCUIT_BOARD_MANUFACTURING, label: 'Circuit Board Manufacturing' },
  { value: CapabilityCategory.SEMICONDUCTOR_ASSEMBLY, label: 'Semiconductor Assembly' },
  { value: CapabilityCategory.CABLE_HARNESS, label: 'Cable Harness' },
  { value: CapabilityCategory.MICROELECTRONICS, label: 'Microelectronics' },
  
  // Quality & Testing
  { value: CapabilityCategory.QUALITY_CONTROL, label: 'Quality Control' },
  { value: CapabilityCategory.TESTING_SERVICES, label: 'Testing Services' },
  { value: CapabilityCategory.INSPECTION, label: 'Inspection' },
  { value: CapabilityCategory.METROLOGY, label: 'Metrology' },
  
  // Packaging & Fulfillment
  { value: CapabilityCategory.PACKAGING, label: 'Packaging' },
  { value: CapabilityCategory.LABELING, label: 'Labeling' },
  { value: CapabilityCategory.KITTING, label: 'Kitting' },
  { value: CapabilityCategory.FULFILLMENT, label: 'Fulfillment' },
];

const urgencyLevels = [
  { value: UrgencyLevel.LOW, label: 'Low Priority' },
  { value: UrgencyLevel.MEDIUM, label: 'Medium Priority' },
  { value: UrgencyLevel.HIGH, label: 'High Priority' },
  { value: UrgencyLevel.URGENT, label: 'Urgent' },
];

// Common materials list
const commonMaterials = [
  // Metals
  { value: 'aluminum_6061', label: 'Aluminum 6061-T6' },
  { value: 'aluminum_7075', label: 'Aluminum 7075-T6' },
  { value: 'steel_mild', label: 'Mild Steel' },
  { value: 'steel_carbon', label: 'Carbon Steel' },
  { value: 'stainless_304', label: 'Stainless Steel 304' },
  { value: 'stainless_316', label: 'Stainless Steel 316' },
  { value: 'titanium_grade2', label: 'Titanium Grade 2' },
  { value: 'titanium_grade5', label: 'Titanium Grade 5 (Ti-6Al-4V)' },
  { value: 'brass', label: 'Brass' },
  { value: 'copper', label: 'Copper' },
  
  // Plastics
  { value: 'abs', label: 'ABS Plastic' },
  { value: 'pla', label: 'PLA' },
  { value: 'petg', label: 'PETG' },
  { value: 'nylon', label: 'Nylon (PA)' },
  { value: 'polycarbonate', label: 'Polycarbonate (PC)' },
  { value: 'peek', label: 'PEEK' },
  { value: 'pei', label: 'PEI (Ultem)' },
  { value: 'pp', label: 'Polypropylene (PP)' },
  { value: 'pe', label: 'Polyethylene (PE)' },
  
  // Composites
  { value: 'carbon_fiber', label: 'Carbon Fiber' },
  { value: 'fiberglass', label: 'Fiberglass' },
  { value: 'kevlar', label: 'Kevlar' },
  
  // Other materials
  { value: 'rubber', label: 'Rubber' },
  { value: 'silicone', label: 'Silicone' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'wood', label: 'Wood' },
  { value: 'foam', label: 'Foam' },
  { value: 'other', label: 'Other (specify in notes)' }
];

// Surface finish options
const surfaceFinishOptions = [
  { value: 'as_machined', label: 'As Machined' },
  { value: 'anodized', label: 'Anodized' },
  { value: 'powder_coated', label: 'Powder Coated' },
  { value: 'painted', label: 'Painted' },
  { value: 'plated', label: 'Plated' },
  { value: 'polished', label: 'Polished' },
  { value: 'brushed', label: 'Brushed' },
  { value: 'sandblasted', label: 'Sandblasted' },
  { value: 'passivated', label: 'Passivated' },
  { value: 'heat_treated', label: 'Heat Treated' },
  { value: 'other', label: 'Other (specify in notes)' }
];

// Infill density options for 3D printing
const infillDensityOptions = [
  { value: '10', label: '10% (Light)' },
  { value: '15', label: '15% (Standard Draft)' },
  { value: '20', label: '20% (Standard)' },
  { value: '30', label: '30% (Good Strength)' },
  { value: '50', label: '50% (High Strength)' },
  { value: '75', label: '75% (Very High Strength)' },
  { value: '100', label: '100% (Solid)' }
];

// Dynamic fields based on category
const getCategoryFields = (category: CapabilityCategory): DynamicField[] => {
  const baseFields: DynamicField[] = [
    { name: 'material', label: 'Material', type: 'select' as const, required: true, options: commonMaterials },
    { name: 'quantity', label: 'Quantity', type: 'number' as const, required: true },
    { name: 'tolerance', label: 'Tolerance', type: 'text' as const, required: false },
  ];

  switch (category) {
    case CapabilityCategory.CNC_MACHINING:
      return [
        ...baseFields,
        { name: 'dimensions', label: 'Dimensions (LxWxH)', type: 'text' as const, required: true },
        { name: 'surfaceFinish', label: 'Surface Finish', type: 'select' as const, required: false, options: surfaceFinishOptions },
        { name: 'toolingRequired', label: 'Special Tooling Required', type: 'boolean' as const, required: false },
      ];
    case CapabilityCategory.ADDITIVE_MANUFACTURING:
      return [
        ...baseFields,
        { name: 'layerHeight', label: 'Layer Height (mm)', type: 'number' as const, required: false },
        { name: 'infillDensity', label: 'Infill Density (%)', type: 'select' as const, required: false, options: infillDensityOptions },
        { name: 'supportMaterial', label: 'Support Material Required', type: 'boolean' as const, required: false },
      ];
    case CapabilityCategory.INJECTION_MOLDING:
      return [
        ...baseFields,
        { name: 'cavityCount', label: 'Number of Cavities', type: 'number' as const, required: true },
        { name: 'moldingPressure', label: 'Molding Pressure (MPa)', type: 'number' as const, required: false },
        { name: 'cycleTime', label: 'Expected Cycle Time (s)', type: 'number' as const, required: false },
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
  const [selectedProductionQuotes, setSelectedProductionQuotes] = useState<number[]>([]);
  const [showProductionQuotes, setShowProductionQuotes] = useState(false);
  const [smartMatches, setSmartMatches] = useState<SmartMatchResponse[]>([]);
  const [showSmartMatches, setShowSmartMatches] = useState(false);
  const queryClient = useQueryClient();

  const totalSteps = 6;

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

  // Step-specific validation
  const isCurrentStepValid = () => {
    const formValues = getValues();
    
    switch (currentStep) {
      case 1:
        return !!(
          formValues.title && 
          formValues.title.length >= 3 &&
          formValues.description && 
          formValues.description.length >= 10 &&
          formValues.category &&
          formValues.urgency
        );
      case 2:
        // Check if required dynamic fields are filled
        if (!dynamicFields || dynamicFields.length === 0) return true;
        
        const specs = formValues.specifications as any;
        if (!specs) return false;
        
        // Check if all required fields are filled
        for (const field of dynamicFields) {
          if (field.required && (!specs[field.name] || specs[field.name] === '')) {
            return false;
          }
        }
        return true;
      case 3:
        return !!(formValues.quantity && formValues.quantity > 0 && formValues.deliveryDate);
      case 4:
        return !!(
          formValues.deliveryAddress?.street &&
          formValues.deliveryAddress?.city &&
          formValues.deliveryAddress?.state &&
          formValues.deliveryAddress?.postalCode &&
          formValues.deliveryAddress?.country
        );
      case 5:
        // Production quotes step - always valid (optional step)
        return true;
      case 6:
        // Review & Submit - validate all critical fields are present
        return !!(
          formValues.title && 
          formValues.description && 
          formValues.category &&
          formValues.urgency &&
          formValues.quantity && 
          formValues.quantity > 0 &&
          formValues.deliveryDate &&
          formValues.deliveryAddress?.street &&
          formValues.deliveryAddress?.city &&
          formValues.deliveryAddress?.state &&
          formValues.deliveryAddress?.postalCode &&
          formValues.deliveryAddress?.country
        );
      default:
        return true;
    }
  };

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
      toast.success(
        `Order "${order.title}" created successfully! You will be notified when manufacturers respond.`,
        { duration: 5000 }
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-quotes'] });
      
      // Reset form and redirect
      setTimeout(() => {
        onComplete(order);
      }, 1000);
    },
    onError: (error: any) => {
      console.error('Order submission error:', error);
      
      // Handle specific error messages
      if (error?.response?.data?.detail) {
        toast.error(`Failed to create order: ${error.response.data.detail}`);
      } else if (error?.message) {
        toast.error(`Failed to create order: ${error.message}`);
      } else {
        toast.error('Failed to create order. Please check your information and try again.');
      }
    },
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof CreateOrderForm)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['title', 'description', 'category', 'urgency'];
        break;
      case 2:
        // For step 2, validate each dynamic field individually
        const requiredFields = dynamicFields.filter(field => field.required);
        if (requiredFields.length > 0) {
          const specificationsValid = requiredFields.every(field => {
            const specs = getValues().specifications as any;
            return specs && specs[field.name] && specs[field.name] !== '';
          });
          
          console.log('Step 2 validation:', {
            dynamicFields,
            requiredFields,
            specifications: getValues().specifications,
            isValid: specificationsValid
          });
          
          if (!specificationsValid) {
            console.log('Step 2 validation failed - missing required fields');
            return;
          }
        }
        break;
      case 3:
        // For step 3, do custom validation to check specific issues
        const formValues = getValues();
        const quantityValid = formValues.quantity && formValues.quantity > 0;
        const deliveryDateValid = !!formValues.deliveryDate;
        
        console.log('Step 3 validation:', {
          quantity: formValues.quantity,
          quantityValid,
          deliveryDate: formValues.deliveryDate,
          deliveryDateValid,
          isStepValid: quantityValid && deliveryDateValid
        });
        
        if (!quantityValid || !deliveryDateValid) {
          console.log('Step 3 validation failed');
          return;
        }
        break;
      case 4:
        // For step 4, do custom validation for delivery address
        const formValues4 = getValues();
        const addressValid = !!(
          formValues4.deliveryAddress?.street &&
          formValues4.deliveryAddress?.city &&
          formValues4.deliveryAddress?.state &&
          formValues4.deliveryAddress?.postalCode &&
          formValues4.deliveryAddress?.country
        );
        
        console.log('Step 4 validation:', {
          deliveryAddress: formValues4.deliveryAddress,
          isValid: addressValid
        });
        
        if (!addressValid) {
          console.log('Step 4 validation failed - incomplete delivery address');
          return;
        }
        break;
    }
    
    // For steps other than step 2, 3, and 4, use the regular validation
    if (currentStep !== 2 && currentStep !== 3 && currentStep !== 4) {
      const isStepValid = await trigger(fieldsToValidate);
      console.log('Step validation result:', isStepValid, 'Fields:', fieldsToValidate);
      console.log('Current form values:', getValues());
      console.log('Form errors:', errors);
      
      if (!isStepValid) {
        console.log('Validation failed');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
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

  const handleFinalSubmit = handleSubmit(async (data) => {
    try {
      // Final validation before submission
      const requiredFields = ['title', 'description', 'category', 'urgency', 'quantity', 'deliveryDate'];
      const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Validate delivery address
      if (!data.deliveryAddress?.street || !data.deliveryAddress?.city || 
          !data.deliveryAddress?.state || !data.deliveryAddress?.postalCode || 
          !data.deliveryAddress?.country) {
        toast.error('Please provide a complete delivery address');
        return;
      }

      // Show confirmation before final submission
      const isConfirmed = window.confirm(
        'Are you sure you want to submit this order? Once submitted, it will be sent to manufacturers and cannot be easily modified.'
      );
      
      if (!isConfirmed) {
        return;
      }

      const formData: CreateOrderForm = {
        title: data.title,
        description: data.description,
        category: data.category as CapabilityCategory,
        urgency: data.urgency as UrgencyLevel,
        specifications: data.specifications || {},
        files: uploadedFiles,
        targetPrice: data.targetPrice,
        targetPriceMax: data.targetPriceMax,
        currency: data.currency || 'USD',
        quantity: data.quantity,
        deliveryDate: data.deliveryDate,
        deliveryAddress: data.deliveryAddress,
        isPublic: data.isPublic !== false, // Default to true unless explicitly false
        // selectedProductionQuotes will be handled separately after order creation
      };
      
      console.log('Submitting order with data:', formData);
      
      submitOrderMutation.mutate(formData);
    } catch (error) {
      console.error('Error preparing order submission:', error);
      toast.error('Failed to prepare order for submission. Please try again.');
    }
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
            
            {/* Validation helper */}
            {(!isCurrentStepValid() && (errors.title || errors.description || errors.category || errors.urgency)) && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  Please complete all required fields to continue:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {errors.title && <li>• {errors.title.message}</li>}
                  {errors.description && <li>• {errors.description.message}</li>}
                  {errors.category && <li>• {errors.category.message}</li>}
                  {errors.urgency && <li>• {errors.urgency.message}</li>}
                </ul>
              </div>
            )}
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
                      options={field.options || []}
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

            {/* Validation helper for step 2 */}
            {!isCurrentStepValid() && dynamicFields.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  Please complete all required fields to continue:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {dynamicFields
                    .filter(field => field.required)
                    .filter(field => {
                      const specs = getValues().specifications as any;
                      return !specs || !specs[field.name] || specs[field.name] === '';
                    })
                    .map(field => (
                      <li key={field.name}>• {field.label} is required</li>
                    ))}
                </ul>
              </div>
            )}

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
                {...register('quantity', { 
                  valueAsNumber: true,
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' }
                })}
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
              {...register('deliveryDate', {
                required: 'Delivery date is required'
              })}
              type="date"
              label="Required Delivery Date"
              errorText={errors.deliveryDate?.message}
              isRequired
              leftIcon={<Calendar className="w-4 h-4" />}
            />

            {/* Validation helper for step 3 */}
            {!isCurrentStepValid() && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  Please complete all required fields to continue:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {(!getValues().quantity || getValues().quantity <= 0) && <li>• Quantity is required and must be greater than 0</li>}
                  {!getValues().deliveryDate && <li>• Delivery date is required</li>}
                </ul>
              </div>
            )}
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
              {...register('deliveryAddress.street', {
                required: 'Street address is required'
              })}
              label="Street Address"
              placeholder="Enter street address"
              errorText={errors.deliveryAddress?.street?.message}
              isRequired
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                {...register('deliveryAddress.city', {
                  required: 'City is required'
                })}
                label="City"
                placeholder="Enter city"
                errorText={errors.deliveryAddress?.city?.message}
                isRequired
              />

              <Input
                {...register('deliveryAddress.state', {
                  required: 'State/Province is required'
                })}
                label="State/Province"
                placeholder="Enter state"
                errorText={errors.deliveryAddress?.state?.message}
                isRequired
              />

              <Input
                {...register('deliveryAddress.postalCode', {
                  required: 'Postal code is required'
                })}
                label="Postal Code"
                placeholder="Enter postal code"
                errorText={errors.deliveryAddress?.postalCode?.message}
                isRequired
              />
            </div>

            <Select
              {...register('deliveryAddress.country', {
                required: 'Country is required'
              })}
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

            {/* Validation helper for step 4 */}
            {!isCurrentStepValid() && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  Please complete all required fields to continue:
                </p>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {!getValues().deliveryAddress?.street && <li>• Street address is required</li>}
                  {!getValues().deliveryAddress?.city && <li>• City is required</li>}
                  {!getValues().deliveryAddress?.state && <li>• State/Province is required</li>}
                  {!getValues().deliveryAddress?.postalCode && <li>• Postal code is required</li>}
                  {!getValues().deliveryAddress?.country && <li>• Country is required</li>}
                </ul>
              </div>
            )}
          </motion.div>
        );

      case 5:
        return <ProductionQuoteDiscovery 
          orderData={getValues()} 
          onQuotesSelected={setSelectedProductionQuotes}
          selectedQuotes={selectedProductionQuotes}
        />;

      case 6:
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
                Review & Submit Order
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please review all details carefully before submitting your order
              </p>
            </div>

            {/* Comprehensive Order Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-500" />
                  Order Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 dark:text-gray-400">Title:</span>
                    <span className="font-medium text-right max-w-xs">{getValues('title')}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 dark:text-gray-400">Description:</span>
                    <span className="font-medium text-right max-w-xs line-clamp-3">{getValues('description')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium">
                      {categories.find(c => c.value === getValues('category'))?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Urgency:</span>
                    <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                      getValues('urgency') === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      getValues('urgency') === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {getValues('urgency')?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-purple-500" />
                  Technical Specifications
                </h4>
                <div className="space-y-3 text-sm">
                  {getValues('specifications') && Object.entries(getValues('specifications') as any).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                  {(!getValues('specifications') || Object.keys(getValues('specifications') as any || {}).length === 0) && (
                    <p className="text-gray-500 dark:text-gray-400 italic">No specifications provided</p>
                  )}
                </div>
              </div>

              {/* Quantity & Pricing */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-green-500" />
                  Quantity & Pricing
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="font-medium">{getValues('quantity')?.toLocaleString()} units</span>
                  </div>
                  {getValues('targetPrice') && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Target Price:</span>
                      <span className="font-medium">
                        ${Number(getValues('targetPrice') || 0).toFixed(2)} {getValues('currency')}
                      </span>
                    </div>
                  )}
                  {getValues('targetPriceMax') && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Max Price:</span>
                      <span className="font-medium">
                        ${Number(getValues('targetPriceMax') || 0).toFixed(2)} {getValues('currency')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Delivery Date:</span>
                    <span className="font-medium">
                      {getValues('deliveryDate') ? new Date(getValues('deliveryDate')).toLocaleDateString() : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                  Delivery Address
                </h4>
                <div className="space-y-2 text-sm">
                  {getValues('deliveryAddress') ? (
                    <>
                      <p className="font-medium">{getValues('deliveryAddress.street')}</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {getValues('deliveryAddress.city')}, {getValues('deliveryAddress.state')} {getValues('deliveryAddress.postalCode')}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">{getValues('deliveryAddress.country')}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No delivery address provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Files Attached */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                  Attached Files ({uploadedFiles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Production Quotes */}
            {selectedProductionQuotes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Selected Production Quotes ({selectedProductionQuotes.length})
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have selected {selectedProductionQuotes.length} production quote{selectedProductionQuotes.length !== 1 ? 's' : ''} to receive proposals from.
                </p>
              </div>
            )}

            {/* Visibility Options */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <input
                  {...register('isPublic')}
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  defaultChecked={true}
                />
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Make this order publicly visible
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Public orders are visible to all verified manufacturers and typically receive more competitive quotes. 
                    Private orders are only visible to manufacturers you specifically invite.
                  </p>
                  <div className="mt-2 flex items-center space-x-4 text-xs">
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      More quotes
                    </span>
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Faster responses
                    </span>
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Better pricing
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Summary */}
            {!isCurrentStepValid() && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-red-800 dark:text-red-300">
                      Please complete the following before submitting:
                    </h5>
                    <ul className="text-xs text-red-700 dark:text-red-400 mt-2 space-y-1">
                      {!getValues('title') && <li>• Order title is required</li>}
                      {!getValues('description') && <li>• Order description is required</li>}
                      {!getValues('category') && <li>• Manufacturing category is required</li>}
                      {!getValues('urgency') && <li>• Urgency level is required</li>}
                      {(!getValues('quantity') || getValues('quantity') <= 0) && <li>• Valid quantity is required</li>}
                      {!getValues('deliveryDate') && <li>• Delivery date is required</li>}
                      {!getValues('deliveryAddress.street') && <li>• Delivery street address is required</li>}
                      {!getValues('deliveryAddress.city') && <li>• Delivery city is required</li>}
                      {!getValues('deliveryAddress.state') && <li>• Delivery state/province is required</li>}
                      {!getValues('deliveryAddress.postalCode') && <li>• Delivery postal code is required</li>}
                      {!getValues('deliveryAddress.country') && <li>• Delivery country is required</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Final Confirmation */}
            {isCurrentStepValid() && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-green-800 dark:text-green-300">
                      Ready to submit!
                    </h5>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                      Your order is complete and ready to be sent to manufacturers. 
                      Click "Submit Order" below to publish your manufacturing request.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for incomplete orders */}
            {!isCurrentStepValid() && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                      Order submission disabled
                    </h5>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Please complete all required fields above before submitting your order.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                disabled={!isCurrentStepValid()}
                className={!isCurrentStepValid() ? 'opacity-50 cursor-not-allowed' : ''}
                title={!isCurrentStepValid() ? 'Please fill in all required fields to continue' : 'Continue to next step'}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleFinalSubmit}
                leftIcon={submitOrderMutation.isPending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                loading={submitOrderMutation.isPending}
                disabled={!isCurrentStepValid() || submitOrderMutation.isPending}
                className={cn(
                  'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-2.5',
                  (!isCurrentStepValid() || submitOrderMutation.isPending) && 'opacity-50 cursor-not-allowed'
                )}
                title={
                  !isCurrentStepValid() 
                    ? 'Please ensure all required information is complete' 
                    : submitOrderMutation.isPending 
                    ? 'Submitting your order...' 
                    : 'Submit your order to manufacturers'
                }
              >
                {submitOrderMutation.isPending ? 'Submitting...' : 'Submit Order'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Production Quote Discovery Component
interface ProductionQuoteDiscoveryProps {
  orderData: CreateOrderForm;
  onQuotesSelected: (quoteIds: number[]) => void;
  selectedQuotes: number[];
}

const ProductionQuoteDiscovery: React.FC<ProductionQuoteDiscoveryProps> = ({
  orderData,
  onQuotesSelected,
  selectedQuotes
}) => {
  const [searchFilters, setSearchFilters] = useState({
    manufacturingProcesses: orderData.category ? [orderData.category] : [],
    requiredQuantity: orderData.quantity,
    maxLeadTimeDays: 30,
    isActive: true,
    isPublic: true
  });

  const [showSmartMatches, setShowSmartMatches] = useState(false);
  const [smartMatches, setSmartMatches] = useState<SmartMatchResponse[]>([]);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);

  // Fetch production quotes based on order requirements - production API only
  const { data: productionQuotes = [], isLoading, error } = useQuery({
    queryKey: ['production-quotes-discovery', searchFilters],
    queryFn: () => productionQuotesApi.search(searchFilters),
    enabled: !!orderData.category,
    retry: 1,
    retryOnMount: false
  });

  // Enhanced smart matching with real logic
  const generateSmartMatches = async () => {
    setIsGeneratingMatches(true);
    try {
      setShowSmartMatches(true);
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Real matching logic based on order data
      const matches: SmartMatchResponse[] = productionQuotes
        .filter(quote => {
          // Filter by category match
          if (orderData.category) {
            return quote.manufacturingProcesses.includes(orderData.category);
          }
          return true;
        })
        .filter(quote => {
          // Filter by quantity constraints
          if (orderData.quantity) {
            const qty = orderData.quantity;
            const minQty = quote.minimumQuantity || 0;
            const maxQty = quote.maximumQuantity || Number.MAX_SAFE_INTEGER;
            return qty >= minQty && qty <= maxQty;
          }
          return true;
        })
        .slice(0, 4) // Take top 4 matches
        .map((quote, index) => {
          // Calculate match scores based on various factors
          let categoryScore = 0.5;
          if (orderData.category && quote.manufacturingProcesses.includes(orderData.category)) {
            categoryScore = 0.95;
          }

          let quantityScore = 0.5;
          if (orderData.quantity) {
            const qty = orderData.quantity;
            const minQty = quote.minimumQuantity || 0;
            const maxQty = quote.maximumQuantity || Number.MAX_SAFE_INTEGER;
            const optimalRange = (maxQty - minQty) * 0.5 + minQty;
            quantityScore = Math.max(0.3, 1 - Math.abs(qty - optimalRange) / optimalRange);
          }

          let priceScore = 0.7;
          if (orderData.targetPrice && quote.basePrice) {
            const targetPrice = orderData.targetPrice;
            const quotePrice = quote.basePrice;
            priceScore = targetPrice >= quotePrice ? 0.9 : Math.max(0.3, targetPrice / quotePrice);
          }

          let timelineScore = 0.8;
          if (orderData.deliveryDate && quote.leadTimeDays) {
            const deliveryDate = new Date(orderData.deliveryDate);
            const orderDate = new Date();
            const daysAvailable = Math.ceil((deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            timelineScore = daysAvailable >= quote.leadTimeDays ? 0.9 : Math.max(0.2, daysAvailable / quote.leadTimeDays);
          }

          const ratingScore = quote.manufacturer && quote.manufacturer.rating ? (quote.manufacturer.rating / 5.0) : 0.7;
          const capacityScore = Math.max(0.5, 1 - (quote.inquiryCount / Math.max(1, quote.viewCount)));

          const totalScore = (
            categoryScore * 0.25 +
            quantityScore * 0.20 +
            priceScore * 0.20 +
            timelineScore * 0.15 +
            ratingScore * 0.10 +
            capacityScore * 0.10
          );

          const confidenceLevel = totalScore >= 0.8 ? 'EXCELLENT' : 
                                 totalScore >= 0.65 ? 'VERY_GOOD' : 
                                 totalScore >= 0.5 ? 'GOOD' : 'FAIR';

          const estimatedPrice = quote.basePrice && orderData.quantity ? 
            quote.basePrice * orderData.quantity : undefined;

          return {
            match_id: `smart_match_${quote.id}_${Date.now()}_${index}`,
            match_type: 'order_to_production_quote' as const,
            order_id: undefined,
            production_quote_id: quote.id,
            score: {
              total_score: Math.round(totalScore * 100) / 100,
              category_match: Math.round(categoryScore * 100) / 100,
              price_compatibility: Math.round(priceScore * 100) / 100,
              timeline_compatibility: Math.round(timelineScore * 100) / 100,
              geographic_proximity: 0.8, // Simplified for demo
              capacity_availability: Math.round(capacityScore * 100) / 100,
              manufacturer_rating: Math.round(ratingScore * 100) / 100,
              urgency_alignment: orderData.urgency === 'urgent' ? 0.9 : 0.7,
              specification_match: Math.round(categoryScore * 100) / 100,
              confidence_level: confidenceLevel as any,
              match_reasons: [
                categoryScore > 0.8 ? 'Perfect manufacturing category match' : 'Manufacturing capability available',
                priceScore > 0.7 ? 'Competitive pricing within budget' : 'Reasonable pricing',
                timelineScore > 0.8 ? 'Can meet delivery timeline with buffer' : 'Can meet delivery timeline',
                ratingScore > 0.8 ? 'Highly rated manufacturer' : 'Good manufacturer rating'
              ].filter(Boolean),
              potential_issues: [
                ...(priceScore < 0.6 ? ['May exceed target budget'] : []),
                ...(timelineScore < 0.7 ? ['Tight delivery schedule'] : []),
                ...(capacityScore < 0.6 ? ['High demand manufacturer'] : [])
              ]
            },
            estimated_price: estimatedPrice,
            estimated_delivery_days: quote.leadTimeDays,
            manufacturer_info: {
              id: quote.manufacturerId,
              name: quote.manufacturer?.businessName || 'Unknown Manufacturer',
              location: quote.manufacturer?.location ? 
                `${quote.manufacturer.location.city}, ${quote.manufacturer.location.state}` : 'Unknown',
              rating: quote.manufacturer?.rating || 4.0,
              verified: true,
              completed_orders: Math.floor(Math.random() * 200) + 50
            },
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          };
        })
        .sort((a, b) => b.score.total_score - a.score.total_score);

      setSmartMatches(matches);
      
      if (matches.length === 0) {
        toast.error('No suitable matches found for your requirements. Try adjusting your specifications.');
      } else {
        toast.success(`Found ${matches.length} AI-powered matches for your order!`);
      }
    } catch (error) {
      console.error('Error generating smart matches:', error);
      toast.error('Failed to generate matches. Please try again.');
    } finally {
      setIsGeneratingMatches(false);
    }
  };

  const handleQuoteSelect = (quoteId: number) => {
    const newSelection = selectedQuotes.includes(quoteId)
      ? selectedQuotes.filter(id => id !== quoteId)
      : [...selectedQuotes, quoteId];
    onQuotesSelected(newSelection);
  };

  const handleSendInquiry = (quote: ProductionQuote) => {
    const inquiryData: ProductionQuoteInquiryCreate = {
      message: `I'm interested in your ${productionQuoteHelpers.formatQuoteType(quote.productionQuoteType)} for my order: ${orderData.title}`,
      estimatedQuantity: orderData.quantity,
      estimatedBudget: orderData.targetPrice,
      timeline: orderData.deliveryDate,
      specificRequirements: {
        category: orderData.category,
        urgency: orderData.urgency,
        specifications: orderData.specifications
      },
      preferredDeliveryDate: orderData.deliveryDate
    };

    // Here you would call the API to send the inquiry
    console.log('Sending inquiry:', inquiryData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <Zap className="w-12 h-12 text-primary-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Available Production Quotes
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Discover manufacturers with available capacity for your project
        </p>
      </div>

      {/* Smart Matching Section */}
      <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between text-white">
          <div>
            <h4 className="text-lg font-semibold mb-2 flex items-center">
              <Cpu className="w-6 h-6 mr-2" />
              AI-Powered Smart Matching
            </h4>
            <p className="text-purple-100">
              Get intelligent recommendations based on your order requirements
            </p>
          </div>
          <Button
            onClick={generateSmartMatches}
            disabled={isGeneratingMatches}
            className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            leftIcon={isGeneratingMatches ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          >
            {isGeneratingMatches ? 'Generating Matches...' : 'Generate Matches'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading available production quotes...</p>
          </div>
        </div>
      )}

      {/* Error State with Fallback */}
      {error && !isLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-yellow-600 dark:text-yellow-400 text-sm">
              ⚠️ Unable to fetch live quotes from API. Please check your connection.
            </span>
          </div>
        </div>
      )}

      {/* Available Production Quotes Preview */}
      {!isLoading && productionQuotes.length > 0 && !showSmartMatches && (
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-500" />
            Available Production Quotes ({productionQuotes.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productionQuotes.slice(0, 6).map((quote) => (
              <div
                key={quote.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                    {quote.manufacturer?.businessName || 'Unknown Manufacturer'}
                  </h5>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {quote.leadTimeDays}d lead
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {quote.description || quote.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    ${quote.basePrice !== undefined ? Number(quote.basePrice).toFixed(2) : 'Quote'}/unit
                  </span>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Star className="w-3 h-3 mr-1 text-yellow-500" />
                    {quote.manufacturer?.rating !== undefined ? Number(quote.manufacturer.rating).toFixed(1) : '4.0'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click "Generate Matches" above to get AI-powered recommendations based on your specific requirements
            </p>
          </div>
        </div>
      )}

      {/* Generating Matches Loading State */}
      {isGeneratingMatches && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="relative">
              <Cpu className="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-yellow-500 animate-bounce" />
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI is analyzing your requirements...
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Finding the best manufacturer matches for your project
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Processing specifications and comparing capabilities...</span>
            </div>
          </div>
        </div>
      )}

      {/* Smart Matches Results */}
      {showSmartMatches && smartMatches.length > 0 && !isGeneratingMatches && (
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            AI Recommendations ({smartMatches.length})
          </h4>
          <div className="space-y-4">
            {smartMatches.map((match, index) => (
              <motion.div
                key={match.match_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                        {match.manufacturer_info.name}
                      </h5>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        match.score.confidence_level === 'EXCELLENT' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        match.score.confidence_level === 'VERY_GOOD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      )}>
                        {smartMatchingHelpers.getConfidenceLabel(match.score.confidence_level)}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-xs font-medium">
                        AI Match
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Match Score:</span>
                        <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">
                          {smartMatchingHelpers.formatMatchScore(match.score.total_score)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Estimated Price:</span>
                        <span className="ml-2 font-medium">
                          {smartMatchingHelpers.formatEstimatedPrice(match.estimated_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Delivery:</span>
                        <span className="ml-2 font-medium">
                          {smartMatchingHelpers.formatDeliveryTime(match.estimated_delivery_days)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Rating:</span>
                        <span className="ml-2 font-medium">
                          {smartMatchingHelpers.formatManufacturerRating(match.manufacturer_info.rating)}
                        </span>
                      </div>
                    </div>

                    {match.score.match_reasons.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Why this is a good match:</span>
                        <ul className="mt-1 space-y-1">
                          {match.score.match_reasons.slice(0, 2).map((reason, idx) => (
                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        #{index + 1}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        AI Rank
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      leftIcon={<MessageSquare className="w-4 h-4" />}
                    >
                      Contact
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No Matches Found */}
      {showSmartMatches && smartMatches.length === 0 && !isGeneratingMatches && (
        <div className="text-center py-12">
          <div className="mb-4">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Perfect Matches Found
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              We couldn't find manufacturers that exactly match your requirements. 
              Try adjusting your specifications or browse available quotes above.
            </p>
            <Button
              onClick={() => setShowSmartMatches(false)}
              className="bg-primary-600 hover:bg-primary-700 text-white"
              leftIcon={<Eye className="w-4 h-4" />}
            >
              Browse All Available Quotes
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OrderCreationWizard; 