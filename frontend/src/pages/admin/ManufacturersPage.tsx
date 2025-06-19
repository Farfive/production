import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building,
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MapPin,
  Calendar,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Manufacturer, VerificationStatus } from '../../types';

interface ManufacturersPageProps {}

const ManufacturersPage: React.FC<ManufacturersPageProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock manufacturers data - replace with real API call
  const { data: manufacturers, isLoading } = useQuery({
    queryKey: ['admin-manufacturers', searchTerm, selectedStatus],
    queryFn: async (): Promise<Manufacturer[]> => {
      // Mock data
      return [
        {
          id: '1',
          userId: '2',
          companyName: 'TechParts Inc',
          businessName: 'TechParts Manufacturing',
          description: 'Leading CNC machining and precision manufacturing company',
          website: 'https://techparts.com',
          logoUrl: 'https://via.placeholder.com/150',
          location: {
            address: '123 Manufacturing St',
            city: 'Detroit',
            state: 'MI',
            country: 'US',
            zipCode: '48201',
          },
          contactEmail: 'contact@techparts.com',
          contactPhone: '+1-555-0123',
          rating: 4.8,
          reviewCount: 245,
          completedProjects: 1200,
          verified: true,
          isActive: true,
          memberSince: '2023-01-15',
          createdAt: '2023-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          userId: '3',
          companyName: 'Precision Works LLC',
          businessName: 'Precision Manufacturing Works',
          description: 'High-precision components and aerospace parts manufacturing',
          website: 'https://precisionworks.com',
          logoUrl: 'https://via.placeholder.com/150',
          location: {
            address: '456 Industrial Blvd',
            city: 'Los Angeles',
            state: 'CA',
            country: 'US',
            zipCode: '90210',
          },
          contactEmail: 'info@precisionworks.com',
          contactPhone: '+1-555-0124',
          rating: 4.6,
          reviewCount: 189,
          completedProjects: 890,
          verified: false,
          isActive: true,
          memberSince: '2023-06-20',
          createdAt: '2023-06-20T14:00:00Z',
          updatedAt: '2024-01-10T12:00:00Z',
        },
        {
          id: '3',
          userId: '4',
          companyName: 'MetalCraft Solutions',
          businessName: 'MetalCraft Manufacturing Solutions',
          description: 'Custom metal fabrication and welding services',
          website: 'https://metalcraft.com',
          logoUrl: 'https://via.placeholder.com/150',
          location: {
            address: '789 Factory Ave',
            city: 'Chicago',
            state: 'IL',
            country: 'US',
            zipCode: '60601',
          },
          contactEmail: 'hello@metalcraft.com',
          contactPhone: '+1-555-0125',
          rating: 4.9,
          reviewCount: 310,
          completedProjects: 1450,
          verified: true,
          isActive: false,
          memberSince: '2022-08-10',
          createdAt: '2022-08-10T09:00:00Z',
          updatedAt: '2024-01-05T16:00:00Z',
        },
      ];
    },
  });

  const getVerificationBadge = (verified: boolean) => {
    if (verified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Inactive
        </span>
      );
    }
  };

  const filteredManufacturers = manufacturers?.filter(manufacturer => {
    const matchesSearch = manufacturer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manufacturer.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         manufacturer.location?.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'verified' && manufacturer.verified) ||
                         (selectedStatus === 'pending' && !manufacturer.verified) ||
                         (selectedStatus === 'active' && manufacturer.isActive) ||
                         (selectedStatus === 'inactive' && !manufacturer.isActive);
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building className="h-8 w-8 text-green-600 mr-3" />
            Manufacturer Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Review and approve manufacturer applications
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Bulk Approve
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Manufacturers</dt>
                  <dd className="text-lg font-medium text-gray-900">{manufacturers?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {manufacturers?.filter(m => !m.verified).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {manufacturers?.filter(m => m.verified).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Rating</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {(() => {
                      if (!manufacturers || manufacturers.length === 0) return '0.0';
                      const avgRating = manufacturers.reduce((acc, m) => acc + (m.rating || 0), 0) / manufacturers.length;
                      return avgRating.toFixed(1);
                    })()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search manufacturers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Approval</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Quick Actions */}
          <div className="flex space-x-2">
            <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors">
              Approve All
            </button>
            <button className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors">
              Reject All
            </button>
          </div>
        </div>
      </div>

      {/* Manufacturers Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {filteredManufacturers?.map((manufacturer) => (
          <div key={manufacturer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{manufacturer.companyName}</h3>
                    <p className="text-sm text-gray-500">{manufacturer.businessName}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {getVerificationBadge(manufacturer.verified ?? false)}
                  {getStatusBadge(manufacturer.isActive ?? false)}
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                {manufacturer.description}
              </p>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{manufacturer.rating?.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 flex items-center justify-center">
                    <Star className="h-3 w-3 text-yellow-400 mr-1" />
                    Rating
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{manufacturer.completedProjects}</div>
                  <div className="text-xs text-gray-500">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{manufacturer.reviewCount}</div>
                  <div className="text-xs text-gray-500">Reviews</div>
                </div>
              </div>

              {/* Location */}
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                {manufacturer.location?.city}, {manufacturer.location?.state}
              </div>

              {/* Member Since */}
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                Member since {new Date(manufacturer.memberSince || '').getFullYear()}
              </div>

              {/* Actions */}
              <div className="mt-6 flex space-x-2">
                {!manufacturer.verified ? (
                  <>
                    <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors flex items-center justify-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </button>
                  </>
                ) : (
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                )}
                <button className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredManufacturers?.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No manufacturers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default ManufacturersPage;