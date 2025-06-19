import { apiClient } from '../api-client';

export interface SupplyChainMetrics {
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

export interface Material {
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

export interface Vendor {
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

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  status: string;
  orderDate: string;
  totalAmount: number;
  requiredDate: string;
  itemCount: number;
}

export interface ChartData {
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

export interface SupplyChainFilters {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
}

class SupplyChainAPI {
  // Metrics
  async getMetrics(): Promise<SupplyChainMetrics> {
    try {
      const response = await apiClient.get('/supply-chain/metrics');
      return response.data;
    } catch (error) {
      console.warn('API unavailable, using demo data');
      return {
        materials: { total: 1247, active: 1189, lowStock: 23, expired: 8 },
        vendors: { total: 156, active: 142, tier1: 12, avgRating: 4.2 },
        inventory: { totalValue: 2450000, turnoverRatio: 6.8, daysOfSupply: 45, accuracy: 98.5 },
        procurement: { totalPOs: 89, pendingApproval: 12, totalValue: 890000, onTimeDelivery: 94.2 }
      };
    }
  }

  // Materials
  async getMaterials(filters?: SupplyChainFilters): Promise<Material[]> {
    try {
      const response = await apiClient.get('/supply-chain/materials', { params: filters });
      return response.data;
    } catch (error) {
      console.warn('API unavailable, using demo data');
      return [
        {
          id: 1,
          materialCode: 'RM000001',
          name: 'Steel Rod 10mm',
          category: 'Raw Material',
          status: 'Active',
          onHandQty: 150,
          safetyStock: 200,
          unitCost: 25.50,
          lastUpdated: '2024-01-15'
        },
        {
          id: 2,
          materialCode: 'CP000045',
          name: 'Bearing Assembly',
          category: 'Component',
          status: 'Active',
          onHandQty: 45,
          safetyStock: 50,
          unitCost: 125.00,
          lastUpdated: '2024-01-14'
        }
      ];
    }
  }

  async createMaterial(material: Omit<Material, 'id'>): Promise<Material> {
    try {
      const response = await apiClient.post('/supply-chain/materials', material);
      return response.data;
    } catch (error) {
      console.error('Failed to create material:', error);
      throw error;
    }
  }

  async updateMaterial(id: number, material: Partial<Material>): Promise<Material> {
    try {
      const response = await apiClient.put(`/supply-chain/materials/${id}`, material);
      return response.data;
    } catch (error) {
      console.error('Failed to update material:', error);
      throw error;
    }
  }

  async deleteMaterial(id: number): Promise<void> {
    try {
      await apiClient.delete(`/supply-chain/materials/${id}`);
    } catch (error) {
      console.error('Failed to delete material:', error);
      throw error;
    }
  }

  // Vendors
  async getVendors(filters?: SupplyChainFilters): Promise<Vendor[]> {
    try {
      const response = await apiClient.get('/supply-chain/vendors', { params: filters });
      return response.data;
    } catch (error) {
      console.warn('API unavailable, using demo data');
      return [
        {
          id: 1,
          vendorCode: 'V000001',
          companyName: 'Premium Steel Suppliers',
          tier: 'Tier 1',
          status: 'Active',
          overallRating: 4.8,
          totalSpend: 450000,
          onTimeDelivery: 96.5,
          qualityRating: 4.9
        },
        {
          id: 2,
          vendorCode: 'V000002',
          companyName: 'Industrial Components Ltd',
          tier: 'Tier 2',
          status: 'Active',
          overallRating: 4.2,
          totalSpend: 280000,
          onTimeDelivery: 92.1,
          qualityRating: 4.3
        }
      ];
    }
  }

  async createVendor(vendor: Omit<Vendor, 'id'>): Promise<Vendor> {
    try {
      const response = await apiClient.post('/supply-chain/vendors', vendor);
      return response.data;
    } catch (error) {
      console.error('Failed to create vendor:', error);
      throw error;
    }
  }

  async updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor> {
    try {
      const response = await apiClient.put(`/supply-chain/vendors/${id}`, vendor);
      return response.data;
    } catch (error) {
      console.error('Failed to update vendor:', error);
      throw error;
    }
  }

  // Purchase Orders
  async getPurchaseOrders(filters?: SupplyChainFilters): Promise<PurchaseOrder[]> {
    try {
      const response = await apiClient.get('/supply-chain/purchase-orders', { params: filters });
      return response.data;
    } catch (error) {
      console.warn('API unavailable, using demo data');
      return [
        {
          id: 1,
          poNumber: 'PO202401001',
          vendorName: 'Premium Steel Suppliers',
          status: 'Approved',
          orderDate: '2024-01-15',
          totalAmount: 25000,
          requiredDate: '2024-01-25',
          itemCount: 5
        },
        {
          id: 2,
          poNumber: 'PO202401002',
          vendorName: 'Industrial Components Ltd',
          status: 'Pending Approval',
          orderDate: '2024-01-14',
          totalAmount: 18500,
          requiredDate: '2024-01-28',
          itemCount: 3
        }
      ];
    }
  }

  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> {
    try {
      const response = await apiClient.post('/supply-chain/purchase-orders', po);
      return response.data;
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      throw error;
    }
  }

  async updatePurchaseOrder(id: number, po: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    try {
      const response = await apiClient.put(`/supply-chain/purchase-orders/${id}`, po);
      return response.data;
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      throw error;
    }
  }

  // Chart Data
  async getChartData(): Promise<ChartData> {
    try {
      const response = await apiClient.get('/supply-chain/analytics/chart-data');
      return response.data;
    } catch (error) {
      console.warn('API unavailable, using demo data');
      return {
        procurementTrends: [
          { month: 'Jan', volume: 65, cost: 850000, orders: 45 },
          { month: 'Feb', volume: 78, cost: 920000, orders: 52 },
          { month: 'Mar', volume: 82, cost: 1050000, orders: 48 },
          { month: 'Apr', volume: 75, cost: 980000, orders: 56 },
          { month: 'May', volume: 88, cost: 1150000, orders: 61 },
          { month: 'Jun', volume: 92, cost: 1280000, orders: 58 }
        ],
        inventoryOptimization: [
          { category: 'A Items (High Value)', value: 1200000, percentage: 20 },
          { category: 'B Items (Medium Value)', value: 800000, percentage: 30 },
          { category: 'C Items (Low Value)', value: 450000, percentage: 50 }
        ],
        supplierPerformance: [
          { supplier: 'Premium Steel', onTimeDelivery: 96.5, qualityScore: 4.8, costEfficiency: 92 },
          { supplier: 'Industrial Components', onTimeDelivery: 92.1, qualityScore: 4.3, costEfficiency: 88 },
          { supplier: 'Advanced Materials', onTimeDelivery: 89.5, qualityScore: 4.1, costEfficiency: 85 },
          { supplier: 'Global Supplies', onTimeDelivery: 94.2, qualityScore: 4.5, costEfficiency: 90 }
        ],
        costBreakdown: [
          { category: 'Raw Materials', amount: 1245000, color: '#8884d8' },
          { category: 'Components', amount: 890000, color: '#82ca9d' },
          { category: 'Packaging', amount: 125000, color: '#ffc658' },
          { category: 'Transportation', amount: 89500, color: '#ff7300' },
          { category: 'Storage', amount: 45200, color: '#8dd1e1' }
        ]
      };
    }
  }

  // Real-time data subscription
  async subscribeToUpdates(callback: (data: any) => void): Promise<() => void> {
    // This would typically create a WebSocket connection
    // For now, we'll simulate with polling
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        callback({ type: 'metrics_update', data: metrics });
      } catch (error) {
        console.error('Failed to fetch real-time updates:', error);
      }
    }, 30000); // Poll every 30 seconds

    // Return unsubscribe function
    return () => clearInterval(interval);
  }
}

export const supplyChainApi = new SupplyChainAPI(); 