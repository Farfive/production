import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Filter,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Award,
  FileText,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Calendar,
  Target,
  Zap,
  Building2,
  CreditCard,
  Package
} from 'lucide-react';

interface Supplier {
  id: number;
  supplierCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  status: 'Active' | 'Inactive' | 'Under Review' | 'Suspended';
  overallRating: number;
  qualityRating: number;
  deliveryRating: number;
  serviceRating: number;
  totalSpend: number;
  onTimeDelivery: number;
  qualityScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  certifications: string[];
  categories: string[];
  paymentTerms: string;
  leadTime: number;
  minimumOrder: number;
  lastAuditDate: string;
  nextAuditDate: string;
  contractExpiry: string;
  createdAt: string;
  updatedAt: string;
}

interface SupplierMetrics {
  totalSuppliers: number;
  activeSuppliers: number;
  tier1Suppliers: number;
  averageRating: number;
  totalSpend: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [metrics, setMetrics] = useState<SupplierMetrics>({
    totalSuppliers: 0,
    activeSuppliers: 0,
    tier1Suppliers: 0,
    averageRating: 0,
    totalSpend: 0,
    onTimeDeliveryRate: 0,
    qualityScore: 0,
    riskDistribution: { low: 0, medium: 0, high: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockSuppliers: Supplier[] = [
        {
          id: 1,
          supplierCode: 'SUP001',
          companyName: 'Premium Steel Suppliers Inc.',
          contactPerson: 'John Smith',
          email: 'john.smith@premiumsteel.com',
          phone: '+1-555-0123',
          address: '123 Industrial Blvd',
          city: 'Pittsburgh',
          country: 'USA',
          website: 'www.premiumsteel.com',
          tier: 'Tier 1',
          status: 'Active',
          overallRating: 4.8,
          qualityRating: 4.9,
          deliveryRating: 4.7,
          serviceRating: 4.8,
          totalSpend: 450000,
          onTimeDelivery: 96.5,
          qualityScore: 98.2,
          riskLevel: 'Low',
          certifications: ['ISO 9001', 'ISO 14001', 'OHSAS 18001'],
          categories: ['Raw Materials', 'Steel Products'],
          paymentTerms: 'Net 30',
          leadTime: 7,
          minimumOrder: 1000,
          lastAuditDate: '2023-12-15',
          nextAuditDate: '2024-12-15',
          contractExpiry: '2025-06-30',
          createdAt: '2022-01-15',
          updatedAt: '2024-01-15'
        },
        {
          id: 2,
          supplierCode: 'SUP002',
          companyName: 'Industrial Components Ltd.',
          contactPerson: 'Sarah Johnson',
          email: 'sarah.j@indcomp.com',
          phone: '+1-555-0456',
          address: '456 Manufacturing Ave',
          city: 'Detroit',
          country: 'USA',
          website: 'www.indcomp.com',
          tier: 'Tier 2',
          status: 'Active',
          overallRating: 4.2,
          qualityRating: 4.3,
          deliveryRating: 4.0,
          serviceRating: 4.3,
          totalSpend: 280000,
          onTimeDelivery: 92.1,
          qualityScore: 94.5,
          riskLevel: 'Medium',
          certifications: ['ISO 9001'],
          categories: ['Components', 'Assemblies'],
          paymentTerms: 'Net 45',
          leadTime: 14,
          minimumOrder: 500,
          lastAuditDate: '2023-10-20',
          nextAuditDate: '2024-10-20',
          contractExpiry: '2024-12-31',
          createdAt: '2022-03-20',
          updatedAt: '2024-01-10'
        }
      ];

      setSuppliers(mockSuppliers);
      setMetrics({
        totalSuppliers: mockSuppliers.length,
        activeSuppliers: mockSuppliers.filter(s => s.status === 'Active').length,
        tier1Suppliers: mockSuppliers.filter(s => s.tier === 'Tier 1').length,
        averageRating: mockSuppliers.reduce((acc, s) => acc + s.overallRating, 0) / mockSuppliers.length,
        totalSpend: mockSuppliers.reduce((acc, s) => acc + s.totalSpend, 0),
        onTimeDeliveryRate: mockSuppliers.reduce((acc, s) => acc + s.onTimeDelivery, 0) / mockSuppliers.length,
        qualityScore: mockSuppliers.reduce((acc, s) => acc + s.qualityScore, 0) / mockSuppliers.length,
        riskDistribution: {
          low: mockSuppliers.filter(s => s.riskLevel === 'Low').length,
          medium: mockSuppliers.filter(s => s.riskLevel === 'Medium').length,
          high: mockSuppliers.filter(s => s.riskLevel === 'High').length
        }
      });
    } catch (error) {
      console.error('Error loading supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Tier 1': return 'bg-blue-100 text-blue-800';
      case 'Tier 2': return 'bg-purple-100 text-purple-800';
      case 'Tier 3': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      </div>
    );
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || supplier.tier === filterTier;
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    const matchesRisk = filterRisk === 'all' || supplier.riskLevel === filterRisk;
    
    return matchesSearch && matchesTier && matchesStatus && matchesRisk;
  });

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalSuppliers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.activeSuppliers} active
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageRating.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderStarRating(Math.round(metrics.averageRating))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spend</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalSpend.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              YTD spending
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On-Time Delivery</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.onTimeDeliveryRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Above target (90%)
            </div>
          </div>
        </motion.div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.riskDistribution.low}</div>
            <div className="text-sm text-gray-600">Low Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{metrics.riskDistribution.medium}</div>
            <div className="text-sm text-gray-600">Medium Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.riskDistribution.high}</div>
            <div className="text-sm text-gray-600">High Risk</div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Suppliers</h3>
        <div className="space-y-4">
          {suppliers
            .sort((a, b) => b.overallRating - a.overallRating)
            .slice(0, 3)
            .map((supplier, index) => (
              <div key={supplier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{supplier.companyName}</p>
                    <p className="text-sm text-gray-500">{supplier.categories.join(', ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {renderStarRating(Math.round(supplier.overallRating))}
                    <span className="text-sm font-medium">{supplier.overallRating}</span>
                  </div>
                  <p className="text-sm text-gray-500">OTD: {supplier.onTimeDelivery}%</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderSuppliersTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tiers</option>
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
            <option value="Tier 3">Tier 3</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Review">Under Review</option>
            <option value="Suspended">Suspended</option>
          </select>
          
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowSupplierModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tier/Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map((supplier) => (
                <motion.tr
                  key={supplier.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{supplier.companyName}</div>
                        <div className="text-sm text-gray-500">{supplier.supplierCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(supplier.tier)}`}>
                        {supplier.tier}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supplier.status)}`}>
                        {supplier.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {renderStarRating(Math.round(supplier.overallRating))}
                      <span className="text-sm text-gray-600">{supplier.overallRating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>OTD: {supplier.onTimeDelivery}%</div>
                      <div className="text-gray-500">Quality: {supplier.qualityScore}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(supplier.riskLevel)}`}>
                      {supplier.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${supplier.totalSpend.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedSupplier(supplier)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-purple-600 hover:text-purple-900">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive supplier relationship management and performance tracking
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'suppliers', name: 'Suppliers', icon: Users },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'risk', name: 'Risk Assessment', icon: Shield },
            { id: 'onboarding', name: 'Onboarding', icon: Plus }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'suppliers' && renderSuppliersTab()}
        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">Detailed supplier performance analytics coming soon.</p>
          </div>
        )}
        {activeTab === 'risk' && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Risk Assessment</h3>
            <p className="text-gray-600">Comprehensive risk assessment tools coming soon.</p>
          </div>
        )}
        {activeTab === 'onboarding' && (
          <div className="text-center py-12">
            <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier Onboarding</h3>
            <p className="text-gray-600">Streamlined supplier onboarding process coming soon.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierManagement; 