import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { 
  getNavigationForRole, 
  getNavigationByCategory, 
  getCategoriesForRole,
  getNavigationStats,
  type NavigationItem,
  type NavigationCategory
} from '../../config/navigation';
import {
  ArrowRightOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  RocketLaunchIcon,
  StarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const BeautifulSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(true);

  // Initialize CSS custom property for main content margin
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px');
  }, [isCollapsed]);

  // Get role-based navigation
  const userRole = user?.role || UserRole.CLIENT;
  const navigationItems = getNavigationForRole(userRole);
  const navigationByCategory = getNavigationByCategory(userRole);
  const categories = getCategoriesForRole(userRole);
  const navigationStats = getNavigationStats(userRole);

  // Helper function to get role-specific dashboard URL
  const getDashboardUrl = () => {
    switch (userRole) {
      case UserRole.CLIENT:
        return '/dashboard/client';
      case UserRole.MANUFACTURER:
        return '/dashboard/manufacturer';
      case UserRole.ADMIN:
        return '/dashboard/admin';
      default:
        return '/dashboard/analytics';
    }
  };

  // Update the main dashboard navigation item href
  const mainDashboardItem = navigationItems.find((item: NavigationItem) => item.id === 'dashboard-home');
  if (mainDashboardItem) {
    mainDashboardItem.href = getDashboardUrl();
  }

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <motion.div
      className="fixed left-0 top-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 z-50 flex flex-col shadow-2xl"
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        '--sidebar-width': isCollapsed ? '80px' : '280px'
      } as React.CSSProperties}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="relative"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <RocketLaunchIcon className="w-6 h-6 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <SparklesIcon className="w-2 h-2 text-white" />
            </motion.div>
          </motion.div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ManufacturingPro
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manufacturing Platform
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-lg"
      >
        {isCollapsed ? (
          <ChevronDoubleRightIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDoubleLeftIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
              animate={{ scale: [1, 1.1, 1] }}
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
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.fullName || 'User'}
                </p>
                <div className="flex items-center space-x-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 dark:from-blue-900/50 dark:to-purple-900/50 dark:text-blue-200">
                    {user?.role}
                  </span>
                  <StarIcon className="w-3 h-3 text-yellow-400 fill-current" />
                </div>
                {/* Navigation Stats */}
                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                  <span>{navigationStats.totalItems} items</span>
                  {navigationStats.newItems > 0 && (
                    <span className="text-green-600">{navigationStats.newItems} new</span>
                  )}
                  {navigationStats.aiItems > 0 && (
                    <span className="text-purple-600">{navigationStats.aiItems} AI</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Category Toggle (only when not collapsed) */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-4"
            >
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>Navigation ({navigationStats.totalItems})</span>
                <motion.div
                  animate={{ rotate: showCategories ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDoubleLeftIcon className="w-3 h-3" />
                </motion.div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categorized Navigation */}
        {showCategories || isCollapsed ? (
          <div className="space-y-6">
            {categories.map((category: NavigationCategory) => {
              const categoryItems = navigationByCategory[category.id] || [];
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="px-3 mb-2"
                      >
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {category.description}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Category Items */}
                  <nav className="space-y-1 px-3">
                    {categoryItems.map((item: NavigationItem, index: number) => {
                      const isActive = isCurrentPath(item.href);
                      const isHovered = hoveredItem === item.id;
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.02 }}
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <Link
                            to={item.href}
                            className={`group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                              isActive
                                ? 'text-white shadow-lg transform scale-[1.02]'
                                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {/* Background Gradient */}
                            <motion.div
                              className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.gradient}`}
                              initial={{ opacity: 0 }}
                              animate={{ 
                                opacity: isActive ? 1 : 0,
                                scale: isActive ? 1 : isHovered ? 1.02 : 0.98
                              }}
                              transition={{ duration: 0.2 }}
                            />
                            
                            {/* Hover Background */}
                            <motion.div
                              className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-gray-800"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: !isActive && isHovered ? 0.5 : 0 }}
                              transition={{ duration: 0.2 }}
                            />

                            <div className="relative flex items-center space-x-3 flex-1">
                              <item.icon className={`w-5 h-5 transition-colors ${
                                isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                              }`} />
                              
                              <AnimatePresence>
                                {!isCollapsed && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="truncate">{item.name}</span>
                                      <div className="flex items-center space-x-1">
                                        {item.isNew && (
                                          <motion.span
                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                          >
                                            NEW
                                          </motion.span>
                                        )}
                                        {item.isAI && (
                                          <motion.span
                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white"
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                          >
                                            AI
                                          </motion.span>
                                        )}
                                        {item.badge && !item.isNew && !item.isAI && (
                                          <motion.span
                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white"
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                          >
                                            {item.badge}
                                          </motion.span>
                                        )}
                                      </div>
                                    </div>
                                    {item.description && (
                                      <p className={`text-xs truncate ${
                                        isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                                      }`}>
                                        {item.description}
                                      </p>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Active Indicator */}
                            <AnimatePresence>
                              {isActive && (
                                <motion.div
                                  className="absolute right-2 w-2 h-2 bg-white rounded-full"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </AnimatePresence>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Navigation (when categories are hidden) */
          <nav className="space-y-1 px-3">
            {navigationItems.map((item: NavigationItem, index: number) => {
              const isActive = isCurrentPath(item.href);
              const isHovered = hoveredItem === item.id;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    to={item.href}
                    className={`group relative flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <motion.div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.gradient}`}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: isActive ? 1 : 0,
                        scale: isActive ? 1 : isHovered ? 1.05 : 0.95
                      }}
                      transition={{ duration: 0.2 }}
                    />
                    
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gray-100 dark:bg-gray-800"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: !isActive && isHovered ? 0.5 : 0 }}
                      transition={{ duration: 0.2 }}
                    />

                    <div className="relative flex items-center space-x-3 flex-1">
                      <item.icon className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      }`} />
                      
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{item.name}</span>
                              {(item.badge || item.isNew || item.isAI) && (
                                <motion.span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    item.isNew ? 'bg-green-500 text-white' :
                                    item.isAI ? 'bg-purple-500 text-white' :
                                    'bg-red-500 text-white'
                                  }`}
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  {item.isNew ? 'NEW' : item.isAI ? 'AI' : item.badge}
                                </motion.span>
                              )}
                            </div>
                            {item.description && (
                              <p className={`text-xs truncate ${
                                isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {item.description}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute right-2 w-2 h-2 bg-white rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <motion.button
          onClick={logout}
          className="group relative w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="absolute inset-0 rounded-xl bg-red-50 dark:bg-red-900/20"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          
          <div className="relative flex items-center space-x-3 flex-1">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="truncate"
                >
                  Sign out
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default BeautifulSidebar; 