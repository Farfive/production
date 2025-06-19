import { UserRole } from '../types';
import {
  HomeIcon,
  ChartBarIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BellIcon,
  CogIcon,
  UserIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  FolderIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  allowedRoles: UserRole[];
  badge?: string;
  description?: string;
  gradient?: string;
  category: 'dashboard' | 'business' | 'manufacturing' | 'financial' | 'tools' | 'admin' | 'settings';
  priority: number; // Lower number = higher priority (appears first)
  isNew?: boolean;
  isAI?: boolean;
  requiresVerification?: boolean;
}

export interface NavigationCategory {
  id: string;
  name: string;
  description?: string;
  allowedRoles: UserRole[];
  priority: number;
}

export const navigationCategories: NavigationCategory[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Overview and analytics',
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 1
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Orders, quotes, and operations',
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 2
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Production and capacity management',
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 3
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Payments, invoices, and billing',
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 4
  },
  {
    id: 'tools',
    name: 'Tools',
    description: 'AI and productivity features',
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 5
  },
  {
    id: 'admin',
    name: 'Administration',
    description: 'Platform management',
    allowedRoles: [UserRole.ADMIN],
    priority: 6
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Account and preferences',
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    priority: 7
  }
];

export const navigationItems: NavigationItem[] = [
  // Dashboard Category
  {
    id: 'dashboard-home',
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Main overview',
    gradient: 'from-blue-500 to-purple-600',
    category: 'dashboard',
    priority: 1
  },
  {
    id: 'analytics',
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Business intelligence',
    gradient: 'from-green-500 to-teal-600',
    category: 'dashboard',
    priority: 2
  },
  {
    id: 'ai-intelligence',
    name: 'AI Intelligence',
    href: '/dashboard/ai',
    icon: CpuChipIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'AI-powered insights',
    gradient: 'from-purple-600 to-blue-600',
    category: 'dashboard',
    priority: 3,
    badge: 'AI',
    isAI: true,
    isNew: true
  },

  // Business Category
  {
    id: 'orders',
    name: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCartIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Order management',
    gradient: 'from-orange-500 to-red-600',
    category: 'business',
    priority: 1
  },
  {
    id: 'quotes',
    name: 'Quotes',
    href: '/dashboard/quotes',
    icon: ClipboardDocumentListIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Quote management',
    gradient: 'from-purple-500 to-pink-600',
    category: 'business',
    priority: 2
  },
  {
    id: 'production-quotes',
    name: 'Production Quotes',
    href: '/dashboard/production-quotes',
    icon: SparklesIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.ADMIN],
    description: 'Discover manufacturing capacity',
    gradient: 'from-yellow-500 to-orange-600',
    category: 'business',
    priority: 3,
    badge: 'NEW',
    isNew: true
  },
  {
    id: 'smart-matching',
    name: 'Smart Matching',
    href: '/dashboard/smart-matching',
    icon: ArrowPathIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'AI-powered matching',
    gradient: 'from-indigo-500 to-purple-600',
    category: 'business',
    priority: 4,
    badge: 'AI',
    isAI: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    href: '/dashboard/enterprise',
    icon: BuildingOfficeIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Enterprise solutions',
    gradient: 'from-slate-500 to-gray-600',
    category: 'business',
    priority: 5
  },

  // Manufacturing Category
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    href: '/dashboard/manufacturing',
    icon: WrenchScrewdriverIcon,
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Production management',
    gradient: 'from-blue-500 to-indigo-600',
    category: 'manufacturing',
    priority: 1
  },
  {
    id: 'production',
    name: 'Production',
    href: '/dashboard/production',
    icon: CpuChipIcon,
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Production planning',
    gradient: 'from-cyan-500 to-blue-600',
    category: 'manufacturing',
    priority: 2
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    href: '/dashboard/supply-chain',
    icon: TruckIcon,
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Supply chain management',
    gradient: 'from-emerald-500 to-green-600',
    category: 'manufacturing',
    priority: 3
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    href: '/dashboard/portfolio',
    icon: BriefcaseIcon,
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Showcase capabilities',
    gradient: 'from-violet-500 to-purple-600',
    category: 'manufacturing',
    priority: 4
  },

  // Financial Category
  {
    id: 'payments',
    name: 'Payments',
    href: '/dashboard/payments',
    icon: CurrencyDollarIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Payment management',
    gradient: 'from-green-500 to-emerald-600',
    category: 'financial',
    priority: 1
  },
  {
    id: 'invoices',
    name: 'Invoices',
    href: '/dashboard/invoices',
    icon: DocumentTextIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Invoice management',
    gradient: 'from-blue-500 to-cyan-600',
    category: 'financial',
    priority: 2
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: CreditCardIcon,
    allowedRoles: [UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Billing and plans',
    gradient: 'from-pink-500 to-rose-600',
    category: 'financial',
    priority: 3
  },

  // Tools Category
  {
    id: 'documents',
    name: 'Documents',
    href: '/dashboard/documents',
    icon: FolderIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'File management',
    gradient: 'from-gray-500 to-slate-600',
    category: 'tools',
    priority: 1
  },
  {
    id: 'notifications',
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: BellIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Alerts and updates',
    gradient: 'from-yellow-500 to-amber-600',
    category: 'tools',
    priority: 2,
    badge: '3'
  },

  // Admin Category
  {
    id: 'admin-users',
    name: 'User Management',
    href: '/admin/users',
    icon: UserGroupIcon,
    allowedRoles: [UserRole.ADMIN],
    description: 'Manage platform users',
    gradient: 'from-red-500 to-pink-600',
    category: 'admin',
    priority: 1
  },
  {
    id: 'admin-analytics',
    name: 'Admin Analytics',
    href: '/admin/analytics',
    icon: ChartPieIcon,
    allowedRoles: [UserRole.ADMIN],
    description: 'Platform analytics',
    gradient: 'from-indigo-500 to-blue-600',
    category: 'admin',
    priority: 2
  },
  {
    id: 'admin-escrow',
    name: 'Escrow Management',
    href: '/admin/escrow',
    icon: ShieldCheckIcon,
    allowedRoles: [UserRole.ADMIN],
    description: 'Payment escrow system',
    gradient: 'from-green-500 to-teal-600',
    category: 'admin',
    priority: 3
  },

  // Settings Category
  {
    id: 'profile',
    name: 'Profile',
    href: '/dashboard/profile',
    icon: UserIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'Account profile',
    gradient: 'from-blue-500 to-indigo-600',
    category: 'settings',
    priority: 1
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    allowedRoles: [UserRole.CLIENT, UserRole.MANUFACTURER, UserRole.ADMIN],
    description: 'App preferences',
    gradient: 'from-gray-500 to-slate-600',
    category: 'settings',
    priority: 2
  }
];

// Helper functions for filtering navigation
export const getNavigationForRole = (userRole: UserRole): NavigationItem[] => {
  return navigationItems
    .filter(item => item.allowedRoles.includes(userRole))
    .sort((a, b) => {
      // Sort by category priority first, then by item priority
      const categoryA = navigationCategories.find(cat => cat.id === a.category);
      const categoryB = navigationCategories.find(cat => cat.id === b.category);
      
      if (categoryA && categoryB && categoryA.priority !== categoryB.priority) {
        return categoryA.priority - categoryB.priority;
      }
      
      return a.priority - b.priority;
    });
};

export const getNavigationByCategory = (userRole: UserRole): Record<string, NavigationItem[]> => {
  const userNavigation = getNavigationForRole(userRole);
  const grouped: Record<string, NavigationItem[]> = {};
  
  userNavigation.forEach(item => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  
  return grouped;
};

export const getCategoriesForRole = (userRole: UserRole): NavigationCategory[] => {
  return navigationCategories
    .filter(category => category.allowedRoles.includes(userRole))
    .sort((a, b) => a.priority - b.priority);
};

export const getNavigationStats = (userRole: UserRole) => {
  const userNavigation = getNavigationForRole(userRole);
  const categories = getCategoriesForRole(userRole);
  
  return {
    totalItems: userNavigation.length,
    totalCategories: categories.length,
    newItems: userNavigation.filter(item => item.isNew).length,
    aiItems: userNavigation.filter(item => item.isAI).length,
    adminItems: userNavigation.filter(item => item.category === 'admin').length,
    itemsByCategory: getNavigationByCategory(userRole)
  };
}; 