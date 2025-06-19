import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Truck,
  Shield,
  Zap,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Tag,
  Layers,
  Activity
} from 'lucide-react';

interface Material {
  id: number;
  materialCode: string;
  name: string;
  description: string;
  category: string;
  status: string;
  unitOfMeasure: string;
  standardCost: number;
  lastCost: number;
  averageCost: number;
  onHandQty: number;
  allocatedQty: number;
  availableQty: number;
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  abcClassification: string;
  lastUpdated: string;
  locations: MaterialLocation[];
  transactions: InventoryTransaction[];
  qualityStatus: string;
  expiryDate?: string;
  lotNumbers: string[];
}

interface MaterialLocation {
  locationCode: string;
  locationName: string;
  onHandQty: number;
  availableQty: number;
  lastCounted: string;
}

interface InventoryTransaction {
  id: number;
  transactionType: string;
  quantity: number;
  unitCost: number;
  transactionDate: string;
  reference: string;
  notes: string;
}

interface QualityRecord {
  id: number;
  inspectionDate: string;
  inspectionType: string;
  status: string;
  inspector: string;
  notes: string;
  testResults: any;
}

const MaterialTracker: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMaterials: Material[] = [
        {
          id: 1,
          materialCode: 'RM000001',
          name: 'Steel Rod 10mm',
          description: 'High-grade steel rod for manufacturing',
          category: 'Raw Material',
          status: 'Active',
          unitOfMeasure: 'kg',
          standardCost: 25.50,
          lastCost: 26.00,
          averageCost: 25.75,
          onHandQty: 150,
          allocatedQty: 50,
          availableQty: 100,
          safetyStock: 200,
          reorderPoint: 180,
          leadTimeDays: 14,
          abcClassification: 'A',
          lastUpdated: '2024-01-15T10:30:00Z',
          qualityStatus: 'Approved',
          lotNumbers: ['LOT2024001', 'LOT2024002'],
          locations: [
            {
              locationCode: 'WH001',
              locationName: 'Main Warehouse',
              onHandQty: 120,
              availableQty: 80,
              lastCounted: '2024-01-10'
            },
            {
              locationCode: 'WH002',
              locationName: 'Production Floor',
              onHandQty: 30,
              availableQty: 20,
              lastCounted: '2024-01-12'
            }
          ],
          transactions: [
            {
              id: 1,
              transactionType: 'Receipt',
              quantity: 100,
              unitCost: 26.00,
              transactionDate: '2024-01-15T08:00:00Z',
              reference: 'PO202401001',
              notes: 'Regular delivery from Premium Steel'
            },
            {
              id: 2,
              transactionType: 'Issue',
              quantity: -25,
              unitCost: 25.50,
              transactionDate: '2024-01-14T14:30:00Z',
              reference: 'WO202401005',
              notes: 'Production order requirement'
            }
          ]
        },
        {
          id: 2,
          materialCode: 'CP000045',
          name: 'Bearing Assembly',
          description: 'Precision bearing assembly for machinery',
          category: 'Component',
          status: 'Active',
          unitOfMeasure: 'pcs',
          standardCost: 125.00,
          lastCost: 128.50,
          averageCost: 126.25,
          onHandQty: 45,
          allocatedQty: 20,
          availableQty: 25,
          safetyStock: 50,
          reorderPoint: 40,
          leadTimeDays: 21,
          abcClassification: 'B',
          lastUpdated: '2024-01-14T16:45:00Z',
          qualityStatus: 'Pending Inspection',
          expiryDate: '2025-01-14',
          lotNumbers: ['LOT2024010'],
          locations: [
            {
              locationCode: 'WH001',
              locationName: 'Main Warehouse',
              onHandQty: 45,
              availableQty: 25,
              lastCounted: '2024-01-08'
            }
          ],
          transactions: [
            {
              id: 3,
              transactionType: 'Receipt',
              quantity: 50,
              unitCost: 128.50,
              transactionDate: '2024-01-14T10:15:00Z',
              reference: 'PO202401002',
              notes: 'Quality inspection required'
            }
          ]
        }
      ];

      setMaterials(mockMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'pending inspection':
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'quarantined':
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'discontinued':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getStockStatus = (material: Material) => {
    if (material.availableQty <= 0) {
      return { status: 'Out of Stock', color: 'text-red-600', icon: AlertTriangle };
    } else if (material.availableQty <= material.safetyStock) {
      return { status: 'Low Stock', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'In Stock', color: 'text-green-600', icon: CheckCircle };
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || material.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || material.status.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderMaterialDetails = () => {
    if (!selectedMaterial) return null;

    const stockStatus = getStockStatus(selectedMaterial);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedMaterial.name}</h2>
              <p className="text-gray-600">{selectedMaterial.materialCode}</p>
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
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'inventory', name: 'Inventory', icon: Package },
              { id: 'transactions', name: 'Transactions', icon: FileText },
              { id: 'quality', name: 'Quality', icon: Shield },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id)}
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
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Current Stock</h4>
                    <div className="flex items-center">
                      <stockStatus.icon className={`w-5 h-5 mr-2 ${stockStatus.color}`} />
                      <span className="text-2xl font-bold text-gray-900">
                        {selectedMaterial.availableQty}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {selectedMaterial.unitOfMeasure}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${stockStatus.color}`}>
                      {stockStatus.status}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Average Cost</h4>
                    <div className="text-2xl font-bold text-gray-900">
                      ${selectedMaterial.averageCost.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      per {selectedMaterial.unitOfMeasure}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">ABC Classification</h4>
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedMaterial.abcClassification}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Lead Time: {selectedMaterial.leadTimeDays} days
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Material Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{selectedMaterial.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedMaterial.status)}`}>
                          {selectedMaterial.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit of Measure:</span>
                        <span className="font-medium">{selectedMaterial.unitOfMeasure}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Safety Stock:</span>
                        <span className="font-medium">{selectedMaterial.safetyStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reorder Point:</span>
                        <span className="font-medium">{selectedMaterial.reorderPoint}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Standard Cost:</span>
                        <span className="font-medium">${selectedMaterial.standardCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Cost:</span>
                        <span className="font-medium">${selectedMaterial.lastCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Cost:</span>
                        <span className="font-medium">${selectedMaterial.averageCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">
                          ${(selectedMaterial.onHandQty * selectedMaterial.averageCost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-600 mb-1">On Hand</h4>
                    <div className="text-2xl font-bold text-blue-900">
                      {selectedMaterial.onHandQty}
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-600 mb-1">Allocated</h4>
                    <div className="text-2xl font-bold text-yellow-900">
                      {selectedMaterial.allocatedQty}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-600 mb-1">Available</h4>
                    <div className="text-2xl font-bold text-green-900">
                      {selectedMaterial.availableQty}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-600 mb-1">On Order</h4>
                    <div className="text-2xl font-bold text-purple-900">0</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Location Breakdown</h4>
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            On Hand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Available
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Last Counted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedMaterial.locations.map((location, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {location.locationName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {location.locationCode}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {location.onHandQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {location.availableQty}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {location.lastCounted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedMaterial.lotNumbers.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Lot Numbers</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMaterial.lotNumbers.map((lot, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
                        >
                          {lot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'transactions' && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Unit Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedMaterial.transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.transactionType === 'Receipt' 
                                ? 'text-green-600 bg-green-100'
                                : 'text-red-600 bg-red-100'
                            }`}>
                              {transaction.transactionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${transaction.unitCost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeDetailTab === 'quality' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Quality Status</h4>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedMaterial.qualityStatus)}`}>
                      {selectedMaterial.qualityStatus}
                    </span>
                    {selectedMaterial.expiryDate && (
                      <span className="ml-4 text-sm text-gray-600">
                        Expires: {new Date(selectedMaterial.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Quality Records</h3>
                  <p className="text-gray-600">Detailed quality inspection records will be displayed here.</p>
                </div>
              </div>
            )}

            {activeDetailTab === 'analytics' && (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Material Analytics</h3>
                <p className="text-gray-600">Usage trends, cost analysis, and forecasting coming soon.</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Material Tracker</h2>
        <p className="text-gray-600">Real-time material inventory tracking and management</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="Raw Material">Raw Material</option>
          <option value="Component">Component</option>
          <option value="Assembly">Assembly</option>
          <option value="Consumable">Consumable</option>
        </select>

        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="low stock">Low Stock</option>
          <option value="out of stock">Out of Stock</option>
        </select>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </button>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => {
          const stockStatus = getStockStatus(material);
          
          return (
            <div
              key={material.id}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedMaterial(material);
                setShowDetails(true);
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {material.name}
                    </h3>
                    <p className="text-sm text-gray-500">{material.materialCode}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(material.category)}`}>
                    {material.category}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stock Status:</span>
                    <div className="flex items-center">
                      <stockStatus.icon className={`w-4 h-4 mr-1 ${stockStatus.color}`} />
                      <span className={`text-sm font-medium ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Available:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {material.availableQty} {material.unitOfMeasure}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Safety Stock:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {material.safetyStock} {material.unitOfMeasure}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Cost:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${material.averageCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">ABC Class:</span>
                    <span className={`text-sm font-bold ${
                      material.abcClassification === 'A' ? 'text-red-600' :
                      material.abcClassification === 'B' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {material.abcClassification}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Updated: {new Date(material.lastUpdated).toLocaleDateString()}
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
                          setSelectedMaterial(material);
                          setShowDetails(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or add a new material.</p>
        </div>
      )}

      {/* Material Details Modal */}
      {showDetails && renderMaterialDetails()}
    </div>
  );
};

export default MaterialTracker; 