import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { 
  getNavigationForRole, 
  getNavigationByCategory, 
  getCategoriesForRole,
  getNavigationStats,
  navigationItems,
  type NavigationItem,
  type NavigationCategory
} from '../../config/navigation';
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const NavigationTestPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || UserRole.CLIENT);
  const [viewMode, setViewMode] = useState<'by-role' | 'by-category' | 'all'>('by-role');

  // Get navigation data for selected role
  const roleNavigation = getNavigationForRole(selectedRole);
  const roleNavigationByCategory = getNavigationByCategory(selectedRole);
  const roleCategories = getCategoriesForRole(selectedRole);
  const roleStats = getNavigationStats(selectedRole);

  const roleIcons = {
    [UserRole.CLIENT]: UserIcon,
    [UserRole.MANUFACTURER]: UserGroupIcon,
    [UserRole.ADMIN]: ShieldCheckIcon
  };

  const roleColors = {
    [UserRole.CLIENT]: 'from-blue-500 to-cyan-600',
    [UserRole.MANUFACTURER]: 'from-green-500 to-emerald-600',
    [UserRole.ADMIN]: 'from-red-500 to-pink-600'
  };

  const isItemAccessible = (item: any, role: UserRole) => {
    return item.allowedRoles.includes(role);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Navigation Filtering Test
          </h1>
          <p className="text-gray-600">
            Test role-based navigation filtering and see which menu items are visible for different user roles.
          </p>
        </div>

        {/* Current User Info */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Current User Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${roleColors[user?.role || UserRole.CLIENT]} text-white`}>
                {user?.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Navigation Items</p>
              <p className="font-medium">{getNavigationStats(user?.role || UserRole.CLIENT).totalItems} accessible</p>
            </div>
          </div>
        </div>

        {/* Role Selector */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Test Different Roles</h2>
          <div className="flex flex-wrap gap-3">
            {Object.values(UserRole).map((role) => {
              const Icon = roleIcons[role];
              const isSelected = selectedRole === role;
              
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isSelected
                      ? `bg-gradient-to-r ${roleColors[role]} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">View Mode:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'by-role', label: 'By Role' },
                { key: 'by-category', label: 'By Category' },
                { key: 'all', label: 'All Items' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Statistics */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{roleStats.totalItems}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-green-600">{roleStats.totalCategories}</p>
              </div>
              <InformationCircleIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Features</p>
                <p className="text-2xl font-bold text-purple-600">{roleStats.aiItems}</p>
              </div>
              <span className="text-2xl">🤖</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Features</p>
                <p className="text-2xl font-bold text-orange-600">{roleStats.newItems}</p>
              </div>
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>

        {/* Navigation Display */}
        <div className="space-y-8">
          {viewMode === 'by-role' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Navigation for {selectedRole}</h2>
              <div className="space-y-3">
                {roleNavigation.map((item: NavigationItem) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${item.gradient}`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.category}</span>
                          {item.isNew && <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">NEW</span>}
                          {item.isAI && <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">AI</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <EyeIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Accessible</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'by-category' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Navigation by Category for {selectedRole}</h2>
              <div className="space-y-6">
                {roleCategories.map((category) => {
                  const categoryItems = roleNavigationByCategory[category.id] || [];
                  
                  return (
                    <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                        <span className="text-xs text-gray-500">{categoryItems.length} items</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryItems.map((item: NavigationItem) => (
                          <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${item.gradient}`}>
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-xs text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'all' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">All Navigation Items - Access Matrix</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Category</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">CLIENT</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">MANUFACTURER</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">ADMIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {navigationItems.map((item: NavigationItem) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-1 rounded bg-gradient-to-r ${item.gradient}`}>
                              <item.icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{item.category}</span>
                        </td>
                        {Object.values(UserRole).map((role) => (
                          <td key={role} className="px-4 py-3 text-center">
                            {isItemAccessible(item, role) ? (
                              <div className="flex items-center justify-center">
                                <EyeIcon className="w-5 h-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <EyeSlashIcon className="w-5 h-5 text-red-600" />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Test Instructions */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Testing Instructions</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>1. Role Testing:</strong> Switch between different roles to see how navigation changes</p>
            <p><strong>2. Sidebar Testing:</strong> Check the sidebar to see filtered navigation items</p>
            <p><strong>3. Access Testing:</strong> Try visiting restricted routes to test access control</p>
            <p><strong>4. Category View:</strong> Use category view to see organized navigation structure</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationTestPage; 