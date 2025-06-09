import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Award, Settings, Camera, Plus, X, Check } from 'lucide-react';
import { manufacturersApi } from '../../lib/api';
import { measureApiCall } from '../../lib/performance';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ManufacturingCapability, CapabilityCategory, BusinessType, Certification } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

interface ManufacturerProfileForm {
  businessName: string;
  businessType: BusinessType;
  description: string;
  website?: string;
  logoFile?: File;
  coverImageFile?: File;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  contactEmail: string;
  contactPhone: string;
  foundedYear?: number;
  employeeCount: string;
  certifications: string[];
  capabilities: {
    category: CapabilityCategory;
    materials: string[];
    processes: string[];
    minQuantity: number;
    maxQuantity: number;
    leadTimeMin: number;
    leadTimeMax: number;
  }[];
  acceptsRushOrders: boolean;
  minOrderValue?: number;
  maxOrderValue?: number;
}

const ManufacturerProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<ManufacturerProfileForm>({
    businessName: '',
    businessType: BusinessType.LLC,
    description: '',
    website: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    contactEmail: user?.email || '',
    contactPhone: '',
    foundedYear: new Date().getFullYear(),
    employeeCount: '1-10',
    certifications: [],
    capabilities: [],
    acceptsRushOrders: false,
    minOrderValue: 100,
    maxOrderValue: 100000
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: ManufacturerProfileForm) => {
      return measureApiCall('manufacturers.createProfile', () => manufacturersApi.createProfile(data));
    },
    onSuccess: () => {
      toast.success('Profile created successfully');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create profile');
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: { ...prev.location, [field]: value }
    }));
  };

  const handleImageUpload = (file: File, type: 'logo' | 'cover') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'logo') {
        setLogoPreview(preview);
        setFormData(prev => ({ ...prev, logoFile: file }));
      } else {
        setCoverImagePreview(preview);
        setFormData(prev => ({ ...prev, coverImageFile: file }));
      }
    };
    reader.readAsDataURL(file);
  };

  const addCapability = () => {
    setFormData(prev => ({
      ...prev,
      capabilities: [...prev.capabilities, {
        category: CapabilityCategory.CNC_MACHINING,
        materials: [],
        processes: [],
        minQuantity: 1,
        maxQuantity: 1000,
        leadTimeMin: 1,
        leadTimeMax: 30
      }]
    }));
  };

  const removeCapability = (index: number) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter((_, i) => i !== index)
    }));
  };

  const updateCapability = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.map((cap, i) => 
        i === index ? { ...cap, [field]: value } : cap
      )
    }));
  };

  const addCertification = (cert: string) => {
    if (cert.trim() && !formData.certifications.includes(cert)) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, cert.trim()]
      }));
    }
  };

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProfileMutation.mutate(formData);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.description;
      case 2:
        return formData.location.address && formData.location.city && formData.location.country;
      case 3:
        return formData.capabilities.length > 0;
      default:
        return true;
    }
  };

  const steps = [
    { id: 1, title: 'Business Info', icon: Building2 },
    { id: 2, title: 'Location & Contact', icon: MapPin },
    { id: 3, title: 'Capabilities', icon: Settings },
    { id: 4, title: 'Review & Submit', icon: Check }
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Manufacturer Profile
            </h1>
            <p className="text-gray-600">
              Set up your manufacturing business profile to start receiving orders
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                  }
                `}>
                  <step.icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    w-16 h-0.5 mx-2 
                    ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            ))}
          </div>

          {/* Form Steps */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Business Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>
                  
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Camera className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                      <select
                        value={formData.businessType}
                        onChange={(e) => handleInputChange('businessType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={BusinessType.SOLE_PROPRIETORSHIP}>Sole Proprietorship</option>
                        <option value={BusinessType.PARTNERSHIP}>Partnership</option>
                        <option value={BusinessType.CORPORATION}>Corporation</option>
                        <option value={BusinessType.LLC}>LLC</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your manufacturing business, specialties, and experience..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Founded Year</label>
                      <input
                        type="number"
                        value={formData.foundedYear}
                        onChange={(e) => handleInputChange('foundedYear', Number(e.target.value))}
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location & Contact */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Location & Contact Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                    <input
                      type="text"
                      value={formData.location.address}
                      onChange={(e) => handleLocationChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        value={formData.location.city}
                        onChange={(e) => handleLocationChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                      <input
                        type="text"
                        value={formData.location.state}
                        onChange={(e) => handleLocationChange('state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                      <input
                        type="text"
                        value={formData.location.zipCode}
                        onChange={(e) => handleLocationChange('zipCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <input
                      type="text"
                      value={formData.location.country}
                      onChange={(e) => handleLocationChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee Count</label>
                    <select
                      value={formData.employeeCount}
                      onChange={(e) => handleInputChange('employeeCount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Capabilities */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Manufacturing Capabilities</h2>
                    <button
                      type="button"
                      onClick={addCapability}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Capability
                    </button>
                  </div>

                  {formData.capabilities.map((capability, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Capability {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => removeCapability(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                          <select
                            value={capability.category}
                            onChange={(e) => updateCapability(index, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value={CapabilityCategory.CNC_MACHINING}>CNC Machining</option>
                            <option value={CapabilityCategory.ADDITIVE_MANUFACTURING}>3D Printing</option>
                            <option value={CapabilityCategory.INJECTION_MOLDING}>Injection Molding</option>
                            <option value={CapabilityCategory.SHEET_METAL}>Sheet Metal</option>
                            <option value={CapabilityCategory.CASTING}>Casting</option>
                            <option value={CapabilityCategory.WELDING}>Welding</option>
                            <option value={CapabilityCategory.ASSEMBLY}>Assembly</option>
                            <option value={CapabilityCategory.FINISHING}>Finishing</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Quantity</label>
                            <input
                              type="number"
                              value={capability.minQuantity}
                              onChange={(e) => updateCapability(index, 'minQuantity', Number(e.target.value))}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Quantity</label>
                            <input
                              type="number"
                              value={capability.maxQuantity}
                              onChange={(e) => updateCapability(index, 'maxQuantity', Number(e.target.value))}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.capabilities.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No capabilities added yet. Click "Add Capability" to get started.
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Submit</h2>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Profile Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Business:</span> {formData.businessName}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {formData.location.city}, {formData.location.country}
                      </div>
                      <div>
                        <span className="font-medium">Capabilities:</span> {formData.capabilities.length} listed
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="text-sm text-gray-500">
                  Step {currentStep} of {steps.length}
                </div>

                {currentStep < steps.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!canProceedToNext()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={createProfileMutation.isPending}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createProfileMutation.isPending ? 'Creating...' : 'Create Profile'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ManufacturerProfilePage; 