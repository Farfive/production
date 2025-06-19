import React from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart3, Shield, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive: boolean;
  badge?: string;
  badgeColor?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  href, 
  isActive, 
  badge, 
  badgeColor 
}) => {
  return (
    <a
      href={href}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
      {badge && (
        <span className={`ml-auto px-2 py-1 text-xs rounded-full text-white ${badgeColor}`}>
          {badge}
        </span>
      )}
    </a>
  );
};

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-4 py-4 space-y-2">
        {user?.role === UserRole.ADMIN && (
          <>
            <SidebarItem
              icon={BarChart3}
              label="Analytics"
              href="/admin/analytics"
              isActive={location.pathname === '/admin/analytics'}
            />
            <SidebarItem
              icon={Shield}
              label="Escrow System"
              href="/admin/escrow"
              isActive={location.pathname === '/admin/escrow'}
              badge="SECURE"
              badgeColor="bg-green-500"
            />
            <SidebarItem
              icon={Users}
              label="User Management"
              href="/admin/users"
              isActive={location.pathname === '/admin/users'}
            />
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar; 