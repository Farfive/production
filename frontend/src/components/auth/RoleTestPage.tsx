import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

const RoleTestPage: React.FC = () => {
  const { user } = useAuth();

  const testRoutes = [
    { path: '/dashboard/client', roles: [UserRole.CLIENT], name: 'Client Dashboard' },
    { path: '/dashboard/manufacturer', roles: [UserRole.MANUFACTURER], name: 'Manufacturer Dashboard' },
    { path: '/dashboard/admin', roles: [UserRole.ADMIN], name: 'Admin Dashboard' },
    { path: '/dashboard/manufacturing', roles: [UserRole.MANUFACTURER, UserRole.ADMIN], name: 'Manufacturing' },
    { path: '/dashboard/portfolio', roles: [UserRole.MANUFACTURER, UserRole.ADMIN], name: 'Portfolio' },
    { path: '/dashboard/production-quotes', roles: [UserRole.CLIENT, UserRole.ADMIN], name: 'Production Quotes' },
    { path: '/admin/users', roles: [UserRole.ADMIN], name: 'User Management' },
  ];

  const hasAccess = (allowedRoles: UserRole[]) => {
    return user && allowedRoles.includes(user.role);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Role-Based Access Control Test</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Current User</h2>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> <span className="font-mono bg-gray-200 px-2 py-1 rounded">{user?.role}</span></p>
          <p><strong>Name:</strong> {user?.fullName}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Route Access Test</h2>
          {testRoutes.map((route) => {
            const canAccess = hasAccess(route.roles);
            return (
              <div key={route.path} className={`p-4 rounded-lg border ${canAccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{route.name}</h3>
                    <p className="text-sm text-gray-600">{route.path}</p>
                    <p className="text-xs text-gray-500">Required: {route.roles.join(', ')}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${canAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {canAccess ? '✅ Allowed' : '❌ Denied'}
                  </div>
                </div>
                {canAccess && (
                  <a 
                    href={route.path} 
                    className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Test Access →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Test Different Roles</h3>
          <p className="text-sm text-yellow-700 mb-3">
            To test different roles, log in with these email patterns:
          </p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li><strong>Client:</strong> client@demo.com (or any email without 'admin' or 'manufacturer')</li>
            <li><strong>Manufacturer:</strong> manufacturer@demo.com (or any email containing 'manufacturer' or 'mfg')</li>
            <li><strong>Admin:</strong> admin@demo.com (or any email containing 'admin')</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoleTestPage; 