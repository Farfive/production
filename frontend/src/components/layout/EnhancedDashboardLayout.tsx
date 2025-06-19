import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ModernNavigation from './ModernNavigation';
import {
  BellIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  FireIcon,
  GlobeAltIcon,
  CommandLineIcon,
  RocketLaunchIcon,
  BoltIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
}

const EnhancedDashboardLayout: React.FC<EnhancedDashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications] = useState([
    { id: 1, title: 'New Order Received', message: 'Order #12345 from TechCorp', time: '2 min ago', type: 'order', unread: true },
    { id: 2, title: 'Quote Approved', message: 'Your quote for Project Alpha was approved', time: '1 hour ago', type: 'quote', unread: true },
    { id: 3, title: 'Payment Processed', message: 'Payment of $2,500 has been processed', time: '3 hours ago', type: 'payment', unread: false },
    { id: 4, title: 'System Update', message: 'New features are now available', time: '1 day ago', type: 'system', unread: false }
  ]);

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

  const getPageTitle = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return 'Dashboard';
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace('-', ' ');
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
      href: '/' + pathSegments.slice(0, index + 1).join('/'),
      current: index === pathSegments.length - 1
    }));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

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
      icon: PlusIcon,
      roles: [UserRole.MANUFACTURER],
      gradient: 'from-blue-500 to-indigo-600'
    }
  ];

  const filteredQuickActions = quickActions.filter(action => 
    !action.roles || (user && action.roles.includes(user.role))
  );

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      {/* Modern Sidebar Navigation */}
      <ModernNavigation />

      {/* Main Content Area */}
      <div className="ml-80 transition-all duration-300">
        {/* Enhanced Top Navigation Bar */}
        <motion.header 
          className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left Section - Page Title & Breadcrumbs */}
              <div className="flex items-center space-x-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-center space-x-3">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <BoltIcon className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                        {getPageTitle()}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {currentTime.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Breadcrumbs */}
                <nav className="hidden lg:flex items-center space-x-2">
                  {getBreadcrumbs().map((crumb, index) => (
                    <React.Fragment key={crumb.href}>
                      {index > 0 && (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
                      )}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            crumb.current
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {crumb.name}
                        </span>
                      </motion.div>
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              {/* Center Section - Enhanced Search */}
              <div className="hidden md:flex flex-1 max-w-lg mx-8">
                <div className="relative w-full">
                  <motion.div
                    className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                    animate={{ scale: searchQuery ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </motion.div>
                  <input
                    type="text"
                    placeholder="Search orders, quotes, manufacturers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 backdrop-blur-sm"
                  />
                  <motion.div
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: searchQuery ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 rounded">
                      ⌘K
                    </kbd>
                  </motion.div>
                </div>
              </div>

              {/* Right Section - Actions & User */}
              <div className="flex items-center space-x-4">
                {/* Quick Actions */}
                {filteredQuickActions.map((action) => (
                  <motion.div key={action.name} className="hidden lg:block">
                    <motion.button
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${action.gradient} hover:shadow-lg transition-all duration-200`}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <action.icon className="w-4 h-4 mr-2" />
                      {action.name}
                    </motion.button>
                  </motion.div>
                ))}

                {/* Theme Toggle */}
                <motion.button
                  onClick={toggleDarkMode}
                  className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.1, rotate: 5 }}
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

                {/* Help */}
                <motion.button
                  className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </motion.button>

                {/* Messages */}
                <motion.button
                  className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <motion.span
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    2
                  </motion.span>
                </motion.button>

                {/* Notifications */}
                <div className="relative">
                  <motion.button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative backdrop-blur-sm"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    {unreadCount > 0 && (
                      <motion.span
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </motion.button>

                  {/* Enhanced Notifications Dropdown */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                              <BellIcon className="w-5 h-5 mr-2" />
                              Notifications
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                              {unreadCount} unread
                            </span>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.map((notification, index) => (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`p-4 border-b border-gray-100/50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${
                                notification.unread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <motion.div 
                                  className={`w-2 h-2 rounded-full mt-2 ${
                                    notification.unread ? 'bg-blue-500' : 'bg-gray-300'
                                  }`}
                                  animate={notification.unread ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                          <button className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                            View all notifications
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Enhanced User Menu */}
                <div className="relative">
                  <motion.button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors backdrop-blur-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">
                          {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </span>
                      </div>
                      <motion.div
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user?.fullName}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${
                      showUserMenu ? 'rotate-180' : ''
                    }`} />
                  </motion.button>

                  {/* Enhanced User Dropdown */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white text-lg font-bold">
                                {user?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {user?.fullName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="py-2">
                          <motion.button
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            <UserCircleIcon className="w-5 h-5 mr-3" />
                            Profile Settings
                          </motion.button>
                          <motion.button
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            <Cog6ToothIcon className="w-5 h-5 mr-3" />
                            Account Settings
                          </motion.button>
                          <motion.button
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            <QuestionMarkCircleIcon className="w-5 h-5 mr-3" />
                            Help & Support
                          </motion.button>
                        </div>
                        
                        <div className="border-t border-gray-200/50 dark:border-gray-700/50 py-2">
                          <motion.button
                            onClick={logout}
                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                            whileHover={{ x: 4 }}
                          >
                            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                            Sign Out
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden mt-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main
          className="flex-1 p-6"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
          transition={pageTransition}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </div>

      {/* Click outside handlers */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedDashboardLayout; 