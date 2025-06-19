import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Target,
  BarChart3,
  Eye,
  Edit,
  Download,
  Upload,
  Send,
  Award,
  Zap,
  Building2,
  Calculator,
  Globe
} from 'lucide-react';

interface RFQ {
  id: number;
  rfqNumber: string;
  title: string;
  description: string;
  category: string;
  status: 'Draft' | 'Published' | 'Bidding' | 'Evaluation' | 'Awarded' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  publishDate: string;
  closingDate: string;
  estimatedValue: number;
  currency: string;
  requiredQuantity: number;
  unit: string;
  deliveryLocation: string;
  requiredDeliveryDate: string;
  bidsReceived: number;
  evaluationCriteria: {
    price: number;
    quality: number;
    delivery: number;
    service: number;
  };
  attachments: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Bid {
  id: number;
  rfqId: number;
  supplierName: string;
  supplierCode: string;
  bidAmount: number;
  currency: string;
  deliveryTime: number;
  validityPeriod: number;
  paymentTerms: string;
  technicalScore: number;
  commercialScore: number;
  overallScore: number;
  status: 'Submitted' | 'Under Review' | 'Shortlisted' | 'Rejected' | 'Awarded';
  submittedAt: string;
  notes: string;
}

interface SourcingMetrics {
  totalRFQs: number;
  activeRFQs: number;
  totalBids: number;
  averageBidsPerRFQ: number;
  totalSavings: number;
  averageProcessingTime: number;
  supplierParticipation: number;
  awardedContracts: number;
}

const MaterialSourcing: React.FC = () => {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [metrics, setMetrics] = useState<SourcingMetrics>({
    totalRFQs: 0,
    activeRFQs: 0,
    totalBids: 0,
    averageBidsPerRFQ: 0,
    totalSavings: 0,
    averageProcessingTime: 0,
    supplierParticipation: 0,
    awardedContracts: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [showRFQModal, setShowRFQModal] = useState(false);

  useEffect(() => {
    loadSourcingData();
  }, []);

  const loadSourcingData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockRFQs: RFQ[] = [
        {
          id: 1,
          rfqNumber: 'RFQ-2024-001',
          title: 'Steel Raw Materials Procurement',
          description: 'Procurement of high-grade steel materials for Q2 production',
          category: 'Raw Materials',
          status: 'Bidding',
          priority: 'High',
          publishDate: '2024-01-15',
          closingDate: '2024-01-30',
          estimatedValue: 250000,
          currency: 'USD',
          requiredQuantity: 1000,
          unit: 'MT',
          deliveryLocation: 'Pittsburgh, PA',
          requiredDeliveryDate: '2024-02-15',
          bidsReceived: 5,
          evaluationCriteria: {
            price: 40,
            quality: 30,
            delivery: 20,
            service: 10
          },
          attachments: ['specifications.pdf', 'technical_requirements.pdf'],
          createdBy: 'John Smith',
          createdAt: '2024-01-10',
          updatedAt: '2024-01-15'
        },
        {
          id: 2,
          rfqNumber: 'RFQ-2024-002',
          title: 'Industrial Components Supply',
          description: 'Supply of precision machined components for manufacturing line',
          category: 'Components',
          status: 'Evaluation',
          priority: 'Medium',
          publishDate: '2024-01-08',
          closingDate: '2024-01-22',
          estimatedValue: 150000,
          currency: 'USD',
          requiredQuantity: 500,
          unit: 'Units',
          deliveryLocation: 'Detroit, MI',
          requiredDeliveryDate: '2024-02-10',
          bidsReceived: 8,
          evaluationCriteria: {
            price: 35,
            quality: 35,
            delivery: 20,
            service: 10
          },
          attachments: ['component_specs.pdf'],
          createdBy: 'Sarah Johnson',
          createdAt: '2024-01-05',
          updatedAt: '2024-01-22'
        }
      ];

      const mockBids: Bid[] = [
        {
          id: 1,
          rfqId: 1,
          supplierName: 'Premium Steel Suppliers Inc.',
          supplierCode: 'SUP001',
          bidAmount: 245000,
          currency: 'USD',
          deliveryTime: 25,
          validityPeriod: 30,
          paymentTerms: 'Net 30',
          technicalScore: 92,
          commercialScore: 88,
          overallScore: 90,
          status: 'Shortlisted',
          submittedAt: '2024-01-18',
          notes: 'Excellent technical specifications and competitive pricing'
        },
        {
          id: 2,
          rfqId: 1,
          supplierName: 'Industrial Steel Corp.',
          supplierCode: 'SUP003',
          bidAmount: 252000,
          currency: 'USD',
          deliveryTime: 20,
          validityPeriod: 45,
          paymentTerms: 'Net 45',
          technicalScore: 85,
          commercialScore: 82,
          overallScore: 84,
          status: 'Under Review',
          submittedAt: '2024-01-19',
          notes: 'Good quality but higher pricing'
        }
      ];

      setRfqs(mockRFQs);
      setBids(mockBids);
      setMetrics({
        totalRFQs: mockRFQs.length,
        activeRFQs: mockRFQs.filter(rfq => ['Published', 'Bidding', 'Evaluation'].includes(rfq.status)).length,
        totalBids: mockBids.length,
        averageBidsPerRFQ: mockBids.length / mockRFQs.length,
        totalSavings: 125000,
        averageProcessingTime: 18,
        supplierParticipation: 85,
        awardedContracts: 12
      });
    } catch (error) {
      console.error('Error loading sourcing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Published': return 'bg-blue-100 text-blue-800';
      case 'Bidding': return 'bg-yellow-100 text-yellow-800';
      case 'Evaluation': return 'bg-purple-100 text-purple-800';
      case 'Awarded': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Shortlisted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Awarded': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRFQs = rfqs.filter(rfq => {
    const matchesSearch = rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rfq.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || rfq.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || rfq.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
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
              <p className="text-sm font-medium text-gray-600">Total RFQs</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalRFQs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.activeRFQs} active
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
              <p className="text-sm font-medium text-gray-600">Total Savings</p>
              <p className="text-2xl font-bold text-gray-900">${metrics.totalSavings.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              +15.2% vs target
            </div>
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
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageProcessingTime} days</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              -3 days vs last quarter
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
              <p className="text-sm font-medium text-gray-600">Supplier Participation</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.supplierParticipation}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Above target (80%)
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent RFQs</h3>
          <div className="space-y-4">
            {rfqs.slice(0, 3).map((rfq) => (
              <div key={rfq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{rfq.title}</p>
                  <p className="text-sm text-gray-500">{rfq.rfqNumber} • {rfq.bidsReceived} bids</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rfq.status)}`}>
                    {rfq.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">${rfq.estimatedValue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Optimization Insights</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <h5 className="text-sm font-medium text-blue-900">Bulk Purchasing</h5>
              </div>
              <p className="text-sm text-blue-800">
                Consolidating steel orders could save 12% on material costs
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Award className="w-5 h-5 text-green-600 mr-2" />
                <h5 className="text-sm font-medium text-green-900">Supplier Performance</h5>
              </div>
              <p className="text-sm text-green-800">
                Top 3 suppliers consistently deliver 15% below market rates
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <h5 className="text-sm font-medium text-yellow-900">Market Alert</h5>
              </div>
              <p className="text-sm text-yellow-800">
                Steel prices expected to rise 8% next quarter - consider forward contracts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRFQsTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search RFQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Bidding">Bidding</option>
            <option value="Evaluation">Evaluation</option>
            <option value="Awarded">Awarded</option>
            <option value="Closed">Closed</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowRFQModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create RFQ
        </button>
      </div>

      {/* RFQs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFQ Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status/Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bids
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closing Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRFQs.map((rfq) => (
                <motion.tr
                  key={rfq.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rfq.title}</div>
                      <div className="text-sm text-gray-500">{rfq.rfqNumber}</div>
                      <div className="text-xs text-gray-400">{rfq.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rfq.status)}`}>
                        {rfq.status}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(rfq.priority)}`}>
                        {rfq.priority}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">${rfq.estimatedValue.toLocaleString()}</div>
                      <div className="text-gray-500">{rfq.requiredQuantity} {rfq.unit}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg font-bold text-blue-600">{rfq.bidsReceived}</span>
                      <span className="text-sm text-gray-500 ml-1">bids</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rfq.closingDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedRFQ(rfq)}
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
        <h1 className="text-3xl font-bold text-gray-900">Material Sourcing</h1>
        <p className="text-gray-600 mt-2">
          Strategic procurement and supplier bidding management
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'rfqs', name: 'RFQs', icon: FileText },
            { id: 'bids', name: 'Bid Evaluation', icon: Award },
            { id: 'contracts', name: 'Contracts', icon: FileText },
            { id: 'analytics', name: 'Cost Analytics', icon: Calculator }
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
        {activeTab === 'rfqs' && renderRFQsTab()}
        {activeTab === 'bids' && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bid Evaluation</h3>
            <p className="text-gray-600">Comprehensive bid evaluation and comparison tools coming soon.</p>
          </div>
        )}
        {activeTab === 'contracts' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Management</h3>
            <p className="text-gray-600">Contract lifecycle management and negotiation tools coming soon.</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Cost Analytics</h3>
            <p className="text-gray-600">Advanced cost analysis and optimization insights coming soon.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaterialSourcing; 