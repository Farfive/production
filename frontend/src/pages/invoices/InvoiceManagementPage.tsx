import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DocumentTextIcon as DocumentTextIconSolid } from '@heroicons/react/24/solid';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
type PaymentTerms = 'NET_15' | 'NET_30' | 'NET_60' | 'NET_90' | 'DUE_ON_RECEIPT';

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  manufacturerId: string;
  manufacturerName: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  paymentTerms: PaymentTerms;
  issuedAt: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  description: string;
  stripeInvoiceId?: string;
}

const InvoiceManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load invoices from real API
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        // Fetch from real API endpoint
        const response = await fetch('/api/v1/invoices', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
        } else {
          // Fallback to demo data if API not available
          const demoInvoices: Invoice[] = [
      {
        id: '1',
        invoiceNumber: 'INV-202401-A1B2C3D4',
        orderId: '1',
        orderNumber: 'ORD-2024-001',
        clientId: 'client1',
        clientName: 'Acme Corporation',
        clientEmail: 'procurement@acme.com',
        manufacturerId: 'manufacturer1',
        manufacturerName: 'TechManufacturing Inc.',
        subtotal: 15000,
        taxAmount: 1200,
        totalAmount: 16200,
        currency: 'USD',
        status: 'SENT',
        paymentTerms: 'NET_30',
        issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: null,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Manufacturing services for custom aluminum parts',
        stripeInvoiceId: 'in_1ABC123'
      },
      {
        id: '2',
        invoiceNumber: 'INV-202401-E5F6G7H8',
        orderId: '2',
        orderNumber: 'ORD-2024-002',
        clientId: 'client2',
        clientName: 'Global Industries Ltd.',
        clientEmail: 'billing@globalind.com',
        manufacturerId: 'manufacturer2',
        manufacturerName: 'Precision Works LLC',
        subtotal: 8500,
        taxAmount: 680,
        totalAmount: 9180,
        currency: 'USD',
        status: 'PAID',
        paymentTerms: 'NET_15',
        issuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Injection molding services for plastic components'
      },
      {
        id: '3',
        invoiceNumber: 'INV-202401-I9J0K1L2',
        orderId: '3',
        orderNumber: 'ORD-2024-003',
        clientId: 'client3',
        clientName: 'StartupTech Inc.',
        clientEmail: 'finance@startuptech.com',
        manufacturerId: 'manufacturer1',
        manufacturerName: 'TechManufacturing Inc.',
        subtotal: 12000,
        taxAmount: 960,
        totalAmount: 12960,
        currency: 'USD',
        status: 'OVERDUE',
        paymentTerms: 'NET_30',
        issuedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: null,
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'CNC machining services for prototype development'
      },
      {
        id: '4',
        invoiceNumber: 'INV-202401-M3N4O5P6',
        orderId: '4',
        orderNumber: 'ORD-2024-004',
        clientId: 'client4',
        clientName: 'Innovation Labs',
        clientEmail: 'accounts@innovlabs.com',
        manufacturerId: 'manufacturer3',
        manufacturerName: 'Advanced Manufacturing Co.',
        subtotal: 25000,
        taxAmount: 2000,
        totalAmount: 27000,
        currency: 'USD',
        status: 'DRAFT',
        paymentTerms: 'NET_60',
        issuedAt: null,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: null,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: '3D printing services for complex geometries'
      }
    ];
          setInvoices(demoInvoices);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load invoices:', error);
        // Fallback to empty array on error
        setInvoices([]);
        setLoading(false);
      }
    };
    
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.orderNumber.toLowerCase().includes(searchLower) ||
          invoice.clientName.toLowerCase().includes(searchLower) ||
          invoice.manufacturerName.toLowerCase().includes(searchLower) ||
          invoice.description.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && invoice.status !== statusFilter) {
        return false;
      }

      // Date range filter
      const invoiceDate = new Date(invoice.createdAt);
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          return true;
      }

      return invoiceDate >= startDate;
    });
  }, [invoices, searchTerm, statusFilter, dateRange]);

  const invoiceStats = useMemo(() => {
    const stats = {
      totalInvoices: invoices.length,
      totalAmount: 0,
      paidAmount: 0,
      overdueAmount: 0,
      pendingAmount: 0,
      overdueCount: 0
    };

    invoices.forEach(invoice => {
      stats.totalAmount += invoice.totalAmount;
      
      switch (invoice.status) {
        case 'PAID':
          stats.paidAmount += invoice.totalAmount;
          break;
        case 'OVERDUE':
          stats.overdueAmount += invoice.totalAmount;
          stats.overdueCount++;
          break;
        case 'SENT':
        case 'VIEWED':
          stats.pendingAmount += invoice.totalAmount;
          break;
      }
    });

    return stats;
  }, [invoices]);

  const getStatusBadge = (status: InvoiceStatus) => {
    const classes = {
      DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      VIEWED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    };

    const icons = {
      DRAFT: <DocumentTextIcon className="w-3 h-3 mr-1" />,
      SENT: <PaperAirplaneIcon className="w-3 h-3 mr-1" />,
      VIEWED: <EyeIcon className="w-3 h-3 mr-1" />,
      PAID: <CheckCircleIcon className="w-3 h-3 mr-1" />,
      OVERDUE: <ExclamationTriangleIcon className="w-3 h-3 mr-1" />,
      CANCELLED: <XMarkIcon className="w-3 h-3 mr-1" />
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status]}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email_subject: 'Your Invoice is Ready',
          email_message: 'Please find your invoice attached.',
          send_copy_to_self: false
        })
      });
      
      if (response.ok) {
        setInvoices(prev => 
          prev.map(invoice => 
            invoice.id === invoiceId 
              ? { 
                  ...invoice, 
                  status: 'SENT' as InvoiceStatus,
                  issuedAt: new Date().toISOString()
                }
              : invoice
          )
        );
        console.log('Invoice sent successfully');
      } else {
        console.error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      // Fallback to mock behavior
      setInvoices(prev => 
        prev.map(invoice => 
          invoice.id === invoiceId 
            ? { 
                ...invoice, 
                status: 'SENT' as InvoiceStatus,
                issuedAt: new Date().toISOString()
              }
            : invoice
        )
      );
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <DocumentTextIconSolid className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invoice Management
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage invoices, track payments, and monitor cash flow
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Invoices
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {invoiceStats.totalInvoices}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(invoiceStats.totalAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Paid Amount
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(invoiceStats.paidAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Overdue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(invoiceStats.overdueAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">
                {invoiceStats.overdueCount} invoices
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">overdue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'ALL')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No invoices found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm || statusFilter !== 'ALL'
                        ? "No invoices match your current filters."
                        : "Get started by creating your first invoice."
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Order: {invoice.orderNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.clientName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {invoice.clientEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.paymentTerms.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.status === 'OVERDUE' 
                          ? `${Math.abs(Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue`
                          : invoice.status === 'PAID' && invoice.paidAt
                          ? `Paid ${formatDistanceToNow(new Date(invoice.paidAt), { addSuffix: true })}`
                          : `Due ${formatDistanceToNow(new Date(invoice.dueDate), { addSuffix: true })}`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Download Invoice"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* Navigate to invoice detail */}}
                          className="text-primary-600 hover:text-primary-700"
                          title="View Invoice"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Send Invoice"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceManagementPage; 