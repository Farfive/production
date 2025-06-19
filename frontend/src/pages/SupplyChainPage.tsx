import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Users, 
  Warehouse, 
  ShoppingCart, 
  BarChart3,
  Truck,
  Factory,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  Clock,
  Zap,
  Target,
  MapPin,
  Star,
  Activity
} from 'lucide-react';
import SupplyChainDashboard from '../components/supply-chain/SupplyChainDashboard';
import SupplierManagement from '../components/supply-chain/SupplierManagement';
import MaterialSourcing from '../components/supply-chain/MaterialSourcing';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supplyChainApi } from '../lib/api';

// Enhanced interfaces for supply chain data
interface Supplier {
  id: number;
  name: string;
  category: string;
  location: string;
  rating: number;
  reliability: number;
  qualityScore: number;
  deliveryPerformance: number;
  totalSpend: number;
  activeContracts: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  certifications: string[];
  lastAudit: string;
  paymentTerms: string;
  leadTime: number;
  capacity: number;
  utilization: number;
}

interface InventoryItem {
  id: number;
  materialCode: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unitPrice: number;
  totalValue: number;
  location: string;
  supplier: string;
  lastReplenishment: string;
  turnoverRate: number;
  safetyStock: number;
  leadTime: number;
  status: 'optimal' | 'low' | 'critical' | 'overstock';
  demand30d: number;
  demand90d: number;
}

interface SupplyChainMetrics {
  totalSuppliers: number;
  activeContracts: number;
  totalSpend: number;
  avgDeliveryTime: number;
  supplierReliability: number;
  inventoryTurnover: number;
  stockoutRisk: number;
  costSavings: number;
  qualityScore: number;
  sustainabilityScore: number;
}

// Mock data generators for real-time simulation
const generateMockSuppliers = (): Supplier[] => {
  const supplierNames = ['Acme Materials', 'Global Steel Corp', 'Precision Parts Ltd', 'Quality Components', 'Tech Solutions Inc', 'Reliable Supplies', 'Prime Materials', 'Advanced Manufacturing'];
  const categories = ['Raw Materials', 'Components', 'Electronics', 'Packaging', 'Tools', 'Consumables'];
  const locations = ['North America', 'Europe', 'Asia', 'South America'];

  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: supplierNames[i % supplierNames.length],
    category: categories[Math.floor(Math.random() * categories.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    rating: 3 + Math.random() * 2,
    reliability: 70 + Math.random() * 30,
    qualityScore: 75 + Math.random() * 25,
    deliveryPerformance: 80 + Math.random() * 20,
    totalSpend: 50000 + Math.random() * 500000,
    activeContracts: 1 + Math.floor(Math.random() * 5),
    riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
    certifications: ['ISO 9001', 'ISO 14001', 'OHSAS 18001'].filter(() => Math.random() > 0.5),
    lastAudit: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    paymentTerms: ['Net 30', 'Net 60', '2/10 Net 30'][Math.floor(Math.random() * 3)],
    leadTime: 5 + Math.floor(Math.random() * 20),
    capacity: 1000 + Math.random() * 9000,
    utilization: 60 + Math.random() * 40
  }));
};

const generateMockInventory = (): InventoryItem[] => {
  const materials = ['Steel Sheets', 'Aluminum Bars', 'Copper Wire', 'Plastic Pellets', 'Electronic Components', 'Fasteners', 'Bearings', 'Seals'];
  const categories = ['Raw Materials', 'Components', 'Hardware', 'Electronics'];

  return Array.from({ length: 20 }, (_, i) => {
    const currentStock = Math.floor(Math.random() * 1000);
    const minimumStock = Math.floor(currentStock * 0.2);
    const unitPrice = 5 + Math.random() * 95;
    
    return {
      id: i + 1,
      materialCode: `MAT-${String(i + 1).padStart(3, '0')}`,
      name: materials[i % materials.length],
      category: categories[Math.floor(Math.random() * categories.length)],
      currentStock,
      minimumStock,
      maximumStock: Math.floor(currentStock * 2.5),
      unitPrice,
      totalValue: currentStock * unitPrice,
      location: `Warehouse ${String.fromCharCode(65 + Math.floor(i / 5))}`,
      supplier: `Supplier ${Math.floor(Math.random() * 5) + 1}`,
      lastReplenishment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      turnoverRate: 4 + Math.random() * 8,
      safetyStock: Math.floor(minimumStock * 1.5),
      leadTime: 7 + Math.floor(Math.random() * 14),
      status: currentStock < minimumStock ? 'low' : currentStock < minimumStock * 0.5 ? 'critical' : currentStock > minimumStock * 3 ? 'overstock' : 'optimal',
      demand30d: Math.floor(Math.random() * 200),
      demand90d: Math.floor(Math.random() * 600)
    };
  });
};

const generateMockMetrics = (): SupplyChainMetrics => ({
  totalSuppliers: 12,
  activeContracts: 28,
  totalSpend: 2500000,
  avgDeliveryTime: 12.5,
  supplierReliability: 89.2,
  inventoryTurnover: 6.8,
  stockoutRisk: 15.3,
  costSavings: 125000,
  qualityScore: 92.1,
  sustainabilityScore: 78.5
});

const SupplyChainPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const queryClient = useQueryClient();

  // Real-time data fetching with fallback to mock data
  const { data: suppliers, isLoading: suppliersLoading, refetch: refetchSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await supplyChainApi.getSuppliers();
      return response.data || [];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await supplyChainApi.getInventory();
      return response.data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['supply-chain-metrics'],
    queryFn: async () => {
      const response = await supplyChainApi.getMetrics();
      return response.data || {};
    },
    refetchInterval: 120000 // Refresh every 2 minutes
  });

  // Real-time alerts and notifications
  const { data: alerts } = useQuery({
    queryKey: ['supply-chain-alerts'],
    queryFn: async () => {
      const response = await supplyChainApi.getAlerts();
      return response.data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const tabs = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'Supply chain overview and real-time metrics'
    },
    {
      id: 'suppliers',
      name: 'Supplier Management',
      icon: Users,
      description: 'Manage supplier relationships and performance tracking'
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      icon: Warehouse,
      description: 'Real-time inventory tracking and optimization'
    },
    {
      id: 'procurement',
      name: 'Material Sourcing',
      icon: ShoppingCart,
      description: 'Smart procurement and sourcing operations'
    },
    {
      id: 'analytics',
      name: 'Advanced Analytics',
      icon: TrendingUp,
      description: 'Predictive analytics and optimization insights'
    },
    {
      id: 'logistics',
      name: 'Logistics',
      icon: Truck,
      description: 'Transportation and logistics management'
    }
  ];

  const renderSupplierManagement = () => (
    <div className="space-y-6">
      {/* Supplier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
              <p className="text-2xl font-bold">{metrics?.totalSuppliers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Reliability</p>
              <p className="text-2xl font-bold">{metrics?.supplierReliability.toFixed(1)}%</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spend</p>
              <p className="text-2xl font-bold">${metrics?.totalSpend.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quality Score</p>
              <p className="text-2xl font-bold">{metrics?.qualityScore.toFixed(1)}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Supplier Performance</h3>
          <Button variant="outline" onClick={() => refetchSuppliers()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Supplier</th>
                <th className="text-left py-3">Category</th>
                <th className="text-left py-3">Rating</th>
                <th className="text-left py-3">Reliability</th>
                <th className="text-left py-3">Risk Level</th>
                <th className="text-left py-3">Total Spend</th>
                <th className="text-left py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers?.map((supplier) => (
                <tr key={supplier.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3">
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-gray-500 text-xs">{supplier.location}</div>
                    </div>
                  </td>
                  <td className="py-3">{supplier.category}</td>
                  <td className="py-3">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      {supplier.rating.toFixed(1)}
                    </div>
                  </td>
                  <td className="py-3">{supplier.reliability.toFixed(1)}%</td>
                  <td className="py-3">
                    <Badge color={
                      supplier.riskLevel === 'low' ? 'green' :
                      supplier.riskLevel === 'medium' ? 'yellow' :
                      supplier.riskLevel === 'high' ? 'orange' : 'red'
                    }>
                      {supplier.riskLevel}
                    </Badge>
                  </td>
                  <td className="py-3">${supplier.totalSpend.toLocaleString()}</td>
                  <td className="py-3">
                    <Button size="sm" variant="outline">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderInventoryManagement = () => (
    <div className="space-y-6">
      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold">{inventory?.length || 0}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold">
                ${inventory?.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString() || 0}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</p>
              <p className="text-2xl font-bold text-orange-500">
                {inventory?.filter(item => item.status === 'low').length || 0}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Turnover Rate</p>
              <p className="text-2xl font-bold">{metrics?.inventoryTurnover.toFixed(1)}x</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Inventory Status Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory Status Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Optimal', value: inventory?.filter(i => i.status === 'optimal').length || 0, fill: '#10B981' },
                  { name: 'Low Stock', value: inventory?.filter(i => i.status === 'low').length || 0, fill: '#F59E0B' },
                  { name: 'Critical', value: inventory?.filter(i => i.status === 'critical').length || 0, fill: '#EF4444' },
                  { name: 'Overstock', value: inventory?.filter(i => i.status === 'overstock').length || 0, fill: '#8B5CF6' }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Inventory Items Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Material</th>
                <th className="text-left py-3">Current Stock</th>
                <th className="text-left py-3">Status</th>
                <th className="text-left py-3">Value</th>
                <th className="text-left py-3">Turnover</th>
                <th className="text-left py-3">Location</th>
                <th className="text-left py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory?.slice(0, 10).map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-gray-500 text-xs">{item.materialCode}</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div>
                      <div>{item.currentStock} units</div>
                      <div className="text-xs text-gray-500">Min: {item.minimumStock}</div>
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge color={
                      item.status === 'optimal' ? 'green' :
                      item.status === 'low' ? 'yellow' :
                      item.status === 'critical' ? 'red' : 'purple'
                    }>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3">${item.totalValue.toFixed(2)}</td>
                  <td className="py-3">{item.turnoverRate.toFixed(1)}x</td>
                  <td className="py-3">{item.location}</td>
                  <td className="py-3">
                    <Button size="sm" variant="outline">Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SupplyChainDashboard />;
      case 'suppliers':
        return renderSupplierManagement();
      case 'inventory':
        return renderInventoryManagement();
      case 'procurement':
        return <MaterialSourcing />;
      case 'analytics':
        return (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Advanced Analytics</h3>
            <p className="text-gray-600 mb-4">
              Predictive analytics and optimization insights
            </p>
            <p className="text-sm text-gray-500">
              Features: Demand forecasting, price optimization, risk analytics, sustainability metrics
            </p>
          </div>
        );
      case 'logistics':
        return (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Logistics Management</h3>
            <p className="text-gray-600 mb-4">
              Transportation and logistics coordination
            </p>
            <p className="text-sm text-gray-500">
              Features: Shipment tracking, carrier management, route optimization, delivery scheduling
            </p>
          </div>
        );
      default:
        return <SupplyChainDashboard />;
    }
  };

  if (suppliersLoading || inventoryLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header with Real-time Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Supply Chain Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time supply chain operations and optimization platform
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Real-time alerts */}
              {alerts && alerts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-orange-600">{alerts.length} alerts</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Live Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SupplyChainPage;