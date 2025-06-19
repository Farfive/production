import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  MapPin,
  Phone,
  Mail,
  Globe,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  Truck,
  Calendar,
  Settings,
  Download,
  RefreshCw,
  Building,
  Target,
  Zap
} from 'lucide-react';
import { supplyChainApi } from '../../lib/api';

interface Vendor {
  id: number;
  vendorCode: string;
  companyName: string;
  legalName: string;
  status: string;
  tier: string;
  businessType: string;
  industrySectors: string[];
  overallRating: number;
  qualityRating: number;
  deliveryRating: number;
  serviceRating: number;
  costCompetitiveness: number;
  totalOrders: number;
  totalSpend: number;
  onTimeDeliveryRate: number;
  qualityRejectionRate: number;
  riskScore: number;
  sustainabilityRating: number;
  contact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  capabilities: string[];
  certifications: string[];
  paymentTerms: string;
  currency: string;
  creditLimit: number;
  lastOrderDate: string;
  approvedAt: string;
  createdAt: string;
}

interface VendorPerformance {
  period: string;
  totalOrders: number;
  totalValue: number;
  onTimeDeliveryRate: number;
  qualityPassRate: number;
  averageOrderValue: number;
  ordersByStatus: { [key: string]: number };
}

const VendorManagement: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      // Load vendors from supply chain API
      const response = await supplyChainApi.getSuppliers();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Failed to load vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorPerformance = async (_vendorId: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockPerformance: VendorPerformance = {
        period: 'Last 90 days',
        totalOrders: 25,
        totalValue: 125000,
        onTimeDeliveryRate: 96.5,
        qualityPassRate: 98.8,
        averageOrderValue: 5000,
        ordersByStatus: {
          'Completed': 20,
          'In Progress': 3,
          'Delivered': 2
        }
      };

      setVendorPerformance(mockPerformance);
    } catch (error) {
      console.error('Error loading vendor performance:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending approval':
        return 'text-yellow-600 bg-yellow-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'tier 1':
        return 'text-purple-600 bg-purple-100';
      case 'tier 2':
        return 'text-blue-600 bg-blue-100';
      case 'tier 3':
        return 'text-green-600 bg-green-100';
      case 'tier 4':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 20) return 'text-green-600';
    if (riskScore <= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
      </div>
    );
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.vendorCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || vendor.tier.toLowerCase().includes(filterTier);
    const matchesStatus = filterStatus === 'all' || vendor.status.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  const renderVendorDetails = () => {
    if (!selectedVendor) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.companyName}</h2>
              <p className="text-gray-600">{selectedVendor.vendorCode}</p>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="flex border-b">
            {[
              { id: 'overview', name: 'Overview', icon: Building },
              { id: 'performance', name: 'Performance', icon: BarChart3 },
              { id: 'orders', name: 'Orders', icon: FileText },
              { id: 'compliance', name: 'Compliance', icon: Shield },
              { id: 'contact', name: 'Contact', icon: Phone }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveDetailTab(tab.id);
                  if (tab.id === 'performance') {
                    loadVendorPerformance(selectedVendor.id);
                  }
                }}
                className={`flex items-center px-6 py-3 text-sm font-medium ${
                  activeDetailTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeDetailTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Overall Rating</h4>
                    {renderStarRating(selectedVendor.overallRating)}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Total Spend</h4>
                    <div className="text-2xl font-bold text-gray-900">
                      ${selectedVendor.totalSpend.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedVendor.totalOrders} orders
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Risk Score</h4>
                    <div className={`text-2xl font-bold ${getRiskColor(selectedVendor.riskScore)}`}>
                      {selectedVendor.riskScore.toFixed(1)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedVendor.riskScore <= 20 ? 'Low Risk' : 
                       selectedVendor.riskScore <= 40 ? 'Medium Risk' : 'High Risk'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Legal Name:</span>
                        <span className="font-medium">{selectedVendor.legalName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedVendor.status)}`}>
                          {selectedVendor.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tier:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTierColor(selectedVendor.tier)}`}>
                          {selectedVendor.tier}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Business Type:</span>
                        <span className="font-medium">{selectedVendor.businessType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Terms:</span>
                        <span className="font-medium">{selectedVendor.paymentTerms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credit Limit:</span>
                        <span className="font-medium">${selectedVendor.creditLimit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quality Rating:</span>
                        <div>{renderStarRating(selectedVendor.qualityRating)}</div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery Rating:</span>
                        <div>{renderStarRating(selectedVendor.deliveryRating)}</div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Rating:</span>
                        <div>{renderStarRating(selectedVendor.serviceRating)}</div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">On-Time Delivery:</span>
                        <span className="font-medium">{selectedVendor.onTimeDeliveryRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quality Rejection:</span>
                        <span className="font-medium">{selectedVendor.qualityRejectionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sustainability:</span>
                        <div>{renderStarRating(selectedVendor.sustainabilityRating)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Industry Sectors</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.industrySectors.map((sector, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'performance' && (
              <div className="space-y-6">
                {vendorPerformance ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-600 mb-1">Total Orders</h4>
                        <div className="text-2xl font-bold text-blue-900">
                          {vendorPerformance.totalOrders}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-600 mb-1">Total Value</h4>
                        <div className="text-2xl font-bold text-green-900">
                          ${vendorPerformance.totalValue.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-purple-600 mb-1">On-Time Delivery</h4>
                        <div className="text-2xl font-bold text-purple-900">
                          {vendorPerformance.onTimeDeliveryRate}%
                        </div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-600 mb-1">Quality Pass Rate</h4>
                        <div className="text-2xl font-bold text-yellow-900">
                          {vendorPerformance.qualityPassRate}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(vendorPerformance.ordersByStatus).map(([status, count]) => (
                          <div key={status} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-lg font-semibold text-gray-900">{count}</div>
                            <div className="text-sm text-gray-600">{status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading performance data...</p>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'orders' && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Order History</h3>
                <p className="text-gray-600">Detailed order history and tracking will be displayed here.</p>
              </div>
            )}

            {activeDetailTab === 'compliance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVendor.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                        <Award className="w-5 h-5 text-green-500 mr-3" />
                        <span className="font-medium text-green-800">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Compliance Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm">Tax Compliance</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm">Insurance Current</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-sm">Legal Documentation</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'contact' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">{selectedVendor.contact.name}</div>
                          <div className="text-sm text-gray-500">{selectedVendor.contact.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={`mailto:${selectedVendor.contact.email}`} className="text-blue-600 hover:underline">
                          {selectedVendor.contact.email}
                        </a>
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                        <a href={`tel:${selectedVendor.contact.phone}`} className="text-blue-600 hover:underline">
                          {selectedVendor.contact.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Address</h4>
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                      <div className="text-sm text-gray-600">
                        <div>{selectedVendor.address.street}</div>
                        <div>{selectedVendor.address.city}, {selectedVendor.address.state}</div>
                        <div>{selectedVendor.address.postalCode}</div>
                        <div>{selectedVendor.address.country}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Important Dates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Created:</span>
                      <div className="font-medium">{new Date(selectedVendor.createdAt).toLocaleDateString()}</div>
                    </div>
                    {selectedVendor.approvedAt && (
                      <div>
                        <span className="text-sm text-gray-600">Approved:</span>
                        <div className="font-medium">{new Date(selectedVendor.approvedAt).toLocaleDateString()}</div>
                      </div>
                    )}
                    {selectedVendor.lastOrderDate && (
                      <div>
                        <span className="text-sm text-gray-600">Last Order:</span>
                        <div className="font-medium">{new Date(selectedVendor.lastOrderDate).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Management</h2>
        <p className="text-gray-600">Comprehensive vendor relationship and performance management</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
        >
          <option value="all">All Tiers</option>
          <option value="tier 1">Tier 1</option>
          <option value="tier 2">Tier 2</option>
          <option value="tier 3">Tier 3</option>
          <option value="tier 4">Tier 4</option>
        </select>

        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending approval">Pending Approval</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedVendor(vendor);
              setShowDetails(true);
              setActiveDetailTab('overview');
            }}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {vendor.companyName}
                  </h3>
                  <p className="text-sm text-gray-500">{vendor.vendorCode}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.status)}`}>
                    {vendor.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(vendor.tier)}`}>
                    {vendor.tier}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Rating:</span>
                  {renderStarRating(vendor.overallRating)}
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Spend:</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${vendor.totalSpend.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Orders:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {vendor.totalOrders}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">On-Time Delivery:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {vendor.onTimeDeliveryRate}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Risk Score:</span>
                  <span className={`text-sm font-bold ${getRiskColor(vendor.riskScore)}`}>
                    {vendor.riskScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {vendor.businessType}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVendor(vendor);
                        setShowDetails(true);
                        setActiveDetailTab('overview');
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVendor(vendor);
                        setShowDetails(true);
                        setActiveDetailTab('performance');
                      }}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or add a new vendor.</p>
        </div>
      )}

      {/* Vendor Details Modal */}
      {showDetails && renderVendorDetails()}
    </div>
  );
};

export default VendorManagement; 