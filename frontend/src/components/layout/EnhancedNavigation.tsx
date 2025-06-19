import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
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
  DocumentIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  StarIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  TrophyIcon,
  UsersIcon,
  FireIcon,
  LightBulbIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: UserRole[];
  badge?: string | number;
  description?: string;
  gradient?: string;
  isNew?: boolean;
  isPro?: boolean;
}

interface EnhancedNavigationProps {
  className?: string;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Check for dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
  };

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: `/dashboard/${user?.role}`,
      icon: HomeIcon,
      description: 'Overview & insights',
      gradient: 'from-blue-500 via-purple-500 to-indigo-600'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      roles: [UserRole.ADMIN, UserRole.MANUFACTURER],
      description: 'Business intelligence',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      isPro: true
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingCartIcon,
      description: 'Manage orders',
      gradient: 'from-orange-500 via-red-500 to-pink-600',
      badge: user?.role === UserRole.MANUFACTURER ? '12' : undefined
    },
    {
      name: 'Quotes',
      href: '/quotes',
      icon: ClipboardDocumentListIcon,
      description: 'Quote management',
      gradient: 'from-purple-500 via-violet-500 to-indigo-600',
      badge: user?.role === UserRole.CLIENT ? '3' : undefined
    },
    {
      name: 'Manufacturers',
      href: '/manufacturers',
      icon: BuildingOfficeIcon,
      roles: [UserRole.CLIENT, UserRole.ADMIN],
      description: 'Find partners',
      gradient: 'from-green-500 via-emerald-500 to-teal-600'
    },
    {
      name: 'Production',
      href: '/production',
      icon: WrenchScrewdriverIcon,
      roles: [UserRole.MANUFACTURER],
      description: 'Production management',
      gradient: 'from-amber-500 via-orange-500 to-red-600'
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: BriefcaseIcon,
      roles: [UserRole.MANUFACTURER],
      description: 'Showcase work',
      gradient: 'from-indigo-500 via-blue-500 to-cyan-600'
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: DocumentIcon,
      description: 'File management',
      gradient: 'from-slate-500 via-gray-500 to-zinc-600'
    },
    {
      name: 'Payments',
      href: '/payments',
      icon: CurrencyDollarIcon,
      description: 'Financial tracking',
      gradient: 'from-yellow-500 via-amber-500 to-orange-600'
    },
    {
      name: 'Subscriptions',
      href: '/subscriptions',
      icon: CreditCardIcon,
      roles: [UserRole.MANUFACTURER],
      description: 'Billing & plans',
      gradient: 'from-rose-500 via-pink-500 to-purple-600'
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UsersIcon,
      roles: [UserRole.ADMIN],
      description: 'User management',
      gradient: 'from-blue-500 via-indigo-500 to-purple-600'
    }
  ];

  const quickActions = [
    {
      name: 'New Order',
      href: '/orders/create',
      icon: PlusIcon,
      roles: [UserRole.CLIENT],
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      name: 'New Quote',
      href: '/quotes/create',
      icon: DocumentTextIcon,
      roles: [UserRole.MANUFACTURER],
      gradient: 'from-blue-500 to-indigo-600'
    }
  ];

  const bottomNavigation = [
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellIcon,
      badge: '5',
      description: 'Updates & alerts',
      gradient: 'from-violet-500 to-purple-600',
      isNew: true
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: CogIcon,
      description: 'Preferences',
      gradient: 'from-gray-500 to-slate-600'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      description: 'Account settings',
      gradient: 'from-blue-500 to-indigo-600'
    }
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  const filteredQuickActions = quickActions.filter(item => 
    !item.roles || (user && item.roles.includes(user.role))
  );

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const sidebarVariants = {
    expanded: { width: 320 },
    collapsed: { width: 80 }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: 'easeOut'
      }
    })
  };

  const renderNavigationItem = (item: NavigationItem, index: number, isQuickAction = false) => {
    const isActive = isCurrentPath(item.href);
    const isHovered = hoveredItem === item.name;
    const Icon = item.icon;

    return (
      <motion.div
        key={item.name}
        custom={index}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
        className="relative"
      >
        <Link
          to={item.href}
          className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300 ${
            isActive
              ? 'text-white shadow-xl transform scale-[1.02] shadow-black/10'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          } ${isQuickAction ? 'mb-2' : 'mb-1'}`}
        >
          {/* Active/Hover Background */}
          <motion.div
            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.gradient}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : isHovered ? 1.05 : 0.8
            }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          
          {/* Hover Background */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gray-100 dark:bg-gray-800/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: !isActive && isHovered ? 0.7 : 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Glow Effect */}
          {isActive && (
            <motion.div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.gradient} blur-xl opacity-30`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.2 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Content */}
          <div className="relative flex items-center w-full">
            {/* Icon Container */}
            <motion.div
              className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isActive 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : isHovered 
                    ? 'bg-white/10 dark:bg-gray-700/50' 
                    : 'bg-transparent'
              }`}
              whileHover={{ scale: 1.1, rotate: isActive ? 0 : 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`w-5 h-5 transition-colors ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
              }`} />
            </motion.div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="ml-3 flex-1 min-w-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold">{item.name}</p>
                      {item.description && (
                        <p className={`text-xs truncate mt-0.5 ${
                          isActive 
                            ? 'text-white/80' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Badges and Indicators */}
                    <div className="flex items-center space-x-1 ml-2">
                      {item.isNew && (
                        <motion.span
                          className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          NEW
                        </motion.span>
                      )}
                      
                      {item.isPro && (
                        <motion.div
                          className="flex items-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <TrophyIcon className="w-3 h-3 text-yellow-400" />
                        </motion.div>
                      )}
                      
                      {item.badge && (
                        <motion.span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            isActive 
                              ? 'bg-white/20 text-white' 
                              : 'bg-red-500 text-white'
                          }`}
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Indicator */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute right-2 w-2 h-2 bg-white rounded-full"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
          </div>
        </Link>

        {/* Tooltip for collapsed state */}
        <AnimatePresence>
          {isCollapsed && isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.8 }}
              className="absolute left-20 top-1/2 transform -translate-y-1/2 z-50"
            >
              <div className="bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 dark:border-gray-600">
                <p className="text-sm font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-gray-300 mt-1">{item.description}</p>
                )}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                  <div className="w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`fixed left-0 top-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 z-40 flex flex-col shadow-2xl ${className}`}
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header Section */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div 
              className="relative"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <RocketLaunchIcon className="w-7 h-7 text-white" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <SparklesIcon className="w-3 h-3 text-white" />
              </motion.div>
            </motion.div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ManufacturingPro
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <GlobeAltIcon className="w-3 h-3 mr-1" />
                    Manufacturing Platform
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Collapse Toggle */}
          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDoubleLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user?.role === UserRole.ADMIN 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                      : user?.role === UserRole.MANUFACTURER
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                  }`}>
                    {user?.role}
                  </span>
                  <StarIcon className="w-3 h-3 text-yellow-400 fill-current" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Section */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 border-b border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <AnimatePresence>
        {!isCollapsed && filteredQuickActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 border-b border-gray-200/50 dark:border-gray-700/50"
          >
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center">
              <LightBulbIcon className="w-3 h-3 mr-1" />
              Quick Actions
            </h3>
            <div className="space-y-1">
              {filteredQuickActions.map((item, index) => renderNavigationItem(item, index, true))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center"
              >
                <FireIcon className="w-3 h-3 mr-1" />
                Navigation
              </motion.h3>
            )}
          </AnimatePresence>
          
          {filteredNavigation.map((item, index) => renderNavigationItem(item, index))}
        </nav>

        {/* Divider */}
        <div className="my-6 mx-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
        </div>

        {/* Bottom Navigation */}
        <nav className="space-y-1 px-4">
          {bottomNavigation.map((item, index) => renderNavigationItem(item, index + filteredNavigation.length))}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleDarkMode}
            className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isDarkMode ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isDarkMode ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <MoonIcon className="w-5 h-5 text-gray-600" />
              )}
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.button
                onClick={logout}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Logout</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedNavigation; 