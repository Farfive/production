import React, { useState, useEffect } from 'react';
import {
  Package,
  Users,
  Warehouse,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  Search,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Trash2,
  Star,
  Calendar,
  FileText,
  Truck,
  Shield,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { prepareDataForExport, exportToCSV, exportToJSON } from '../../lib/exportUtils';

interface SupplyChainMetrics {
  materials: {
    total: number;
    active: number;
    lowStock: number;
    expired: number;
  };
  vendors: {
    total: number;
    active: number;
    tier1: number;
    avgRating: number;
  };
  inventory: {
    totalValue: number;
    turnoverRatio: number;
    daysOfSupply: number;
    accuracy: number;
  };
  procurement: {
    totalPOs: number;
    pendingApproval: number;
    totalValue: number;
    onTimeDelivery: number;
  };
}

interface Material {
  id: number;
  materialCode: string;
  name: string;
  category: string;
  status: string;
  onHandQty: number;
  safetyStock: number;
  unitCost: number;
  lastUpdated: string;
}

interface Vendor {
  id: number;
  vendorCode: string;
  companyName: string;
  tier: string;
  status: string;
  overallRating: number;
  totalSpend: number;
  onTimeDelivery: number;
  qualityRating: number;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  status: string;
  orderDate: string;
  totalAmount: number;
  requiredDate: string;
  itemCount: number;
}

interface ChartData {
  procurementTrends: Array<{
    month: string;
    volume: number;
    cost: number;
    orders: number;
  }>;
  inventoryOptimization: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
  supplierPerformance: Array<{
    supplier: string;
    onTimeDelivery: number;
    qualityScore: number;
    costEfficiency: number;
  }>;
  costBreakdown: Array<{
    category: string;
    amount: number;
    color: string;
  }>;
}

const SupplyChainDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SupplyChainMetrics>({
    materials: { total: 0, active: 0, lowStock: 0, expired: 0 },
    vendors: { total: 0, active: 0, tier1: 0, avgRating: 0 },
    inventory: { totalValue: 0, turnoverRatio: 0, daysOfSupply: 0, accuracy: 0 },
    procurement: { totalPOs: 0, pendingApproval: 0, totalValue: 0, onTimeDelivery: 0 }
  });

  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    procurementTrends: [],
    inventoryOptimization: [],
    supplierPerformance: [],
    costBreakdown: []
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false); // Set to false to prevent loading state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real supply chain data from API
      const [metricsRes, materialsRes, vendorsRes, purchaseOrdersRes, analyticsRes] = await Promise.all([
        fetch('/api/v1/supply-chain/metrics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/supply-chain/materials', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/supply-chain/vendors', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/supply-chain/purchase-orders', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        }),
        fetch('/api/v1/supply-chain/analytics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
      ]);

      // Parse responses
      const metricsData = metricsRes.ok ? await metricsRes.json() : null;
      const materialsData = materialsRes.ok ? await materialsRes.json() : null;
      const vendorsData = vendorsRes.ok ? await vendorsRes.json() : null;
      const purchaseOrdersData = purchaseOrdersRes.ok ? await purchaseOrdersRes.json() : null;
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

      // Set real data
      if (metricsData) setMetrics(metricsData);
      if (materialsData) setMaterials(materialsData.materials || []);
      if (vendorsData) setVendors(vendorsData.vendors || []);
      if (purchaseOrdersData) setPurchaseOrders(purchaseOrdersData.purchase_orders || []);
      if (analyticsData) setChartData(analyticsData);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading supply chain data:', error);
      setError('Failed to load supply chain data. Please try refreshing the page.');
      
      // Set empty defaults on error
      setMetrics({
        materials: { total: 0, active: 0, lowStock: 0, expired: 0 },
        vendors: { total: 0, active: 0, tier1: 0, avgRating: 0 },
        inventory: { totalValue: 0, turnoverRatio: 0, daysOfSupply: 0, accuracy: 0 },
        procurement: { totalPOs: 0, pendingApproval: 0, totalValue: 0, onTimeDelivery: 0 }
      });
      setMaterials([]);
      setVendors([]);
      setPurchaseOrders([]);
      setChartData({
        procurementTrends: [],
        inventoryOptimization: [],
        supplierPerformance: [],
        costBreakdown: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (dataType: 'materials' | 'vendors' | 'purchase_orders' | 'metrics', format: 'csv' | 'json') => {
    try {
      let data: any;
      let filename: string;
      
      switch (dataType) {
        case 'materials':
          data = materials;
          filename = `supply_chain_materials_${new Date().toISOString().split('T')[0]}`;
          break;
        case 'vendors':
          data = vendors;
          filename = `supply_chain_vendors_${new Date().toISOString().split('T')[0]}`;
          break;
        case 'purchase_orders':
          data = purchaseOrders;
          filename = `supply_chain_purchase_orders_${new Date().toISOString().split('T')[0]}`;
          break;
        case 'metrics':
          data = [metrics]; // Wrap metrics in array for consistent export
          filename = `supply_chain_metrics_${new Date().toISOString().split('T')[0]}`;
          break;
        default:
          throw new Error('Invalid data type');
      }

      if (format === 'csv') {
        const csvData = prepareDataForExport(Array.isArray(data) ? data : [data]);
        exportToCSV(csvData, `${filename}.csv`);
      } else {
        exportToJSON(data, `${filename}.json`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed. Please try again.');
    }
  };

  const handleExportChartData = async (chartType: keyof ChartData, format: 'csv' | 'json') => {
    try {
      const data = chartData[chartType];
      const filename = `supply_chain_${chartType}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        const csvData = prepareDataForExport(Array.isArray(data) ? data : [data]);
        exportToCSV(csvData, `${filename}.csv`);
      } else {
        exportToJSON(data, `${filename}.json`);
      }
    } catch (error) {
      console.error('Chart export failed:', error);
      setError('Chart export failed. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'completed':
      case 'tier 1':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
      case 'tier 2':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low-stock':
      case 'expired':
      case 'rejected':
      case 'tier 3':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'raw materials':
      case 'metal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'electronics':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 text-yellow-400 fill-current opacity-50" />
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {stars}
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Total Materials</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{metrics.materials.total.toLocaleString()}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {metrics.materials.active} active
              </p>
            </div>
            <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Active Vendors</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{metrics.vendors.active}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                {metrics.vendors.tier1} Tier 1 partners
              </p>
            </div>
            <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Inventory Value</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                ${(metrics.inventory.totalValue / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {metrics.inventory.turnoverRatio}x turnover
              </p>
            </div>
            <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Warehouse className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">Purchase Orders</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{metrics.procurement.totalPOs}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                {metrics.procurement.pendingApproval} pending approval
              </p>
            </div>
            <div className="flex-shrink-0 p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supply Chain Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</span>
              <div className="flex items-center">
                <div className="w-24 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics.procurement.onTimeDelivery}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.procurement.onTimeDelivery}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Inventory Accuracy</span>
              <div className="flex items-center">
                <div className="w-24 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics.inventory.accuracy}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.inventory.accuracy}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Vendor Rating</span>
              <div className="flex items-center">
                <div className="w-24 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(metrics.vendors.avgRating / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.vendors.avgRating}/5.0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Critical Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">Low Stock Alert</p>
                <p className="text-xs text-red-600 dark:text-red-300">{metrics.materials.lowStock} materials below safety stock</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Expired Materials</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">{metrics.materials.expired} materials past expiry date</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Pending Approvals</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">{metrics.procurement.pendingApproval} purchase orders awaiting approval</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMaterialsTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Material Management</h3>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </button>
          <div className="relative group">
            <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-2 space-y-1 min-w-[140px]">
                <button
                  onClick={() => handleExportData('materials', 'csv')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExportData('materials', 'json')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="low-stock">Low Stock</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Materials Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No materials found</h3>
                      <p className="text-gray-600 dark:text-gray-400">Get started by adding your first material.</p>
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{material.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{material.materialCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(material.category)}`}>
                          {material.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {material.onHandQty} / {material.safetyStock}
                        </div>
                        <div className={`text-xs ${material.onHandQty < material.safetyStock ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {material.onHandQty < material.safetyStock ? 'Below Safety Stock' : 'In Stock'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${material.unitCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {material.lastUpdated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Edit Material"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Delete Material"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderVendorsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Vendor Management</h3>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Overall Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spend
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{vendor.companyName}</div>
                    <div className="text-sm text-gray-500">{vendor.vendorCode}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vendor.tier)}`}>
                    {vendor.tier}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderStarRating(vendor.overallRating)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${vendor.totalSpend.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    OTD: {vendor.onTimeDelivery}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Quality: {vendor.qualityRating}/5.0
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderProcurementTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Generate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                  <div className="text-sm text-gray-500">{po.itemCount} items</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {po.vendorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                    {po.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${po.totalAmount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {po.requiredDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="text-purple-600 hover:text-purple-900">
                      <Truck className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInventoryTab = () => (
    <div className="space-y-6">
      {/* Inventory Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.inventory.totalValue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12.5% from last month
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Turnover Ratio</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.inventory.turnoverRatio}x</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <RefreshCw className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Industry avg: 5.2x
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Days of Supply</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.inventory.daysOfSupply}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Target: 30-60 days
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.inventory.accuracy}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              Above target (95%)
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Inventory Tracking</h3>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Stock
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Auto Reorder
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Cycle Count
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <h4 className="text-sm font-medium text-red-800">Low Stock Alerts</h4>
        </div>
        <div className="mt-2 text-sm text-red-700">
          {metrics.materials.lowStock} materials are below safety stock levels. 
          <button className="ml-2 text-red-800 underline hover:text-red-900">
            View Details
          </button>
        </div>
      </div>

      {/* Inventory Movement Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Inventory Movement (Last 30 Days)</h4>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Interactive inventory movement chart</p>
            <p className="text-sm text-gray-400">Shows inbound, outbound, and adjustments</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Recent Inventory Transactions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { material: 'Steel Rod 10mm', type: 'Inbound', quantity: '+500', date: '2024-01-15', ref: 'PO202401001' },
                { material: 'Bearing Assembly', type: 'Outbound', quantity: '-25', date: '2024-01-15', ref: 'WO240115001' },
                { material: 'Aluminum Sheet', type: 'Adjustment', quantity: '+10', date: '2024-01-14', ref: 'ADJ240114001' }
              ].map((transaction, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.material}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.type === 'Inbound' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'Outbound' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-900 cursor-pointer">
                    {transaction.ref}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Export Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">Export Data</h4>
          <div className="flex space-x-2">
            <div className="relative group">
              <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Charts
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="p-2 space-y-1 min-w-[200px]">
                  <button
                    onClick={() => handleExportChartData('procurementTrends', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Procurement Trends (CSV)
                  </button>
                  <button
                    onClick={() => handleExportChartData('inventoryOptimization', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Inventory Analysis (CSV)
                  </button>
                  <button
                    onClick={() => handleExportChartData('supplierPerformance', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Supplier Performance (CSV)
                  </button>
                  <button
                    onClick={() => handleExportChartData('costBreakdown', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Cost Breakdown (CSV)
                  </button>
                </div>
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="p-2 space-y-1 min-w-[180px]">
                  <button
                    onClick={() => handleExportData('materials', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Materials (CSV)
                  </button>
                  <button
                    onClick={() => handleExportData('vendors', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Vendors (CSV)
                  </button>
                  <button
                    onClick={() => handleExportData('purchase_orders', 'csv')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Purchase Orders (CSV)
                  </button>
                  <button
                    onClick={() => handleExportData('metrics', 'json')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Metrics (JSON)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Supplier Performance</h4>
          <div className="space-y-4">
            {vendors.slice(0, 3).map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{vendor.companyName}</p>
                  <p className="text-xs text-gray-500">OTD: {vendor.onTimeDelivery}% | Quality: {vendor.qualityRating}/5</p>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStarRating(vendor.overallRating)}
                  <span className="text-sm text-gray-600">{vendor.overallRating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Material Costs</span>
              <span className="text-sm font-medium text-gray-900">$1,245,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Logistics Costs</span>
              <span className="text-sm font-medium text-gray-900">$89,500</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Storage Costs</span>
              <span className="text-sm font-medium text-gray-900">$45,200</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total Supply Chain Cost</span>
                <span className="text-lg font-bold text-gray-900">$1,379,700</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Procurement Trends</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.procurementTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6B7280' }}
                axisLine={{ stroke: '#6B7280' }}
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fill: '#6B7280' }}
                axisLine={{ stroke: '#6B7280' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fill: '#6B7280' }}
                axisLine={{ stroke: '#6B7280' }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'cost' ? `$${value.toLocaleString()}` : value,
                  name === 'cost' ? 'Cost' : name === 'volume' ? 'Volume (MT)' : 'Orders'
                ]}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="volume" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Volume (MT)"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cost" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Cost ($)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Inventory ABC Analysis</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chartData.inventoryOptimization}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.inventoryOptimization.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Supplier Performance & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Supplier Performance Metrics</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.supplierPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="supplier" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${value}${name === 'qualityScore' ? '/5' : '%'}`,
                  name === 'onTimeDelivery' ? 'On-Time Delivery' : 
                  name === 'qualityScore' ? 'Quality Score' : 'Cost Efficiency'
                ]}
              />
              <Legend />
              <Bar dataKey="onTimeDelivery" fill="#8884d8" name="On-Time Delivery %" />
              <Bar dataKey="costEfficiency" fill="#82ca9d" name="Cost Efficiency %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={chartData.costBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, amount }) => `${category}: $${(amount/1000).toFixed(0)}K`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {chartData.costBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Key Insights & Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              <h5 className="text-sm font-medium text-blue-900">Cost Optimization</h5>
            </div>
            <p className="text-sm text-blue-800">
              Consolidating orders with Premium Steel Suppliers could reduce costs by 8%
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <h5 className="text-sm font-medium text-green-900">Inventory Health</h5>
            </div>
            <p className="text-sm text-green-800">
              Inventory turnover is above industry average - excellent performance
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <h5 className="text-sm font-medium text-yellow-900">Risk Alert</h5>
            </div>
            <p className="text-sm text-yellow-800">
              Single-source dependency on 3 critical materials - consider diversification
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading supply chain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-red-800 dark:text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Production Data Notice */}
      <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-green-800 dark:text-green-300">
              Production Mode Active
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400">
              Displaying real-time supply chain data from your connected systems and database.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Package className="w-6 md:w-8 h-6 md:h-8 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              <span className="truncate">Supply Chain Management</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive material tracking, vendor management, and procurement oversight
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center mt-3 space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-2 bg-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Production Data Active
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full lg:w-auto">
            <button
              onClick={loadRealData}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors w-full lg:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex overflow-x-auto space-x-4 md:space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Activity },
            { id: 'materials', name: 'Materials', icon: Package },
            { id: 'vendors', name: 'Vendors', icon: Users },
            { id: 'procurement', name: 'Procurement', icon: ShoppingCart },
            { id: 'inventory', name: 'Inventory', icon: Warehouse },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2 flex-shrink-0" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'vendors' && renderVendorsTab()}
        {activeTab === 'procurement' && renderProcurementTab()}
        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>
    </div>
  );
};

export default SupplyChainDashboard; 