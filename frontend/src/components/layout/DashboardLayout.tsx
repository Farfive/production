import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Package,
  FileText,
  CreditCard,
  User,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Building2,
  ShoppingCart,
  BarChart3,
  Users,
  Wrench,
  Award,
  Plus,
  Sparkles,
  Rocket,
  Zap,
  Globe,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { IconButton } from '../ui/Button';

import { cn, getInitials } from '../../lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: UserRole[];
  badge?: string | number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Navigation items based on user role
  const getNavigationItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        name: 'Dashboard',
        href: `/dashboard/${user?.role || 'client'}`,
        icon: Home,
      },
    ];

    const clientItems: NavItem[] = [
      { name: 'Order Management', href: '/orders', icon: Package },
      { name: 'Quotes', href: '/quotes', icon: FileText },
      { name: 'Enhanced Quotes', href: '/quotes/enhanced', icon: FileText },
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Manufacturers', href: '/manufacturers', icon: Building2 },
    ];

    const manufacturerItems: NavItem[] = [
      { name: 'Order Management', href: '/orders', icon: ShoppingCart },
      { name: 'Production', href: '/production', icon: Wrench },
      { name: 'Quotes', href: '/quotes', icon: FileText },
      { name: 'Enhanced Quotes', href: '/quotes/enhanced', icon: FileText },
      { name: 'Quote Templates', href: '/quotes/templates', icon: FileText },
      { name: 'Quote Analytics', href: '/quotes/analytics', icon: BarChart3 },
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Manufacturers', href: '/manufacturers', icon: Building2 },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Profile', href: '/profile/manufacturer', icon: Award },
    ];

    const adminItems: NavItem[] = [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Order Management', href: '/orders', icon: Package },
      { name: 'Manufacturers', href: '/admin/manufacturers', icon: Building2 },
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Settings', href: '/admin/settings', icon: Wrench },
    ];

    let roleItems: NavItem[] = [];
    switch (user?.role) {
      case UserRole.CLIENT:
        roleItems = clientItems;
        break;
      case UserRole.MANUFACTURER:
        roleItems = manufacturerItems;
        break;
      case UserRole.ADMIN:
        roleItems = adminItems;
        break;
    }

    return [...baseItems, ...roleItems];
  };

  const navigationItems = getNavigationItems();

  const isCurrentPath = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleLogout = () => {
    logout();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Apply dark mode to document
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Initialize dark mode from localStorage
  React.useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close sidebar when location changes
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={sidebarOpen ? 'open' : 'closed'}
            initial={{ x: sidebarOpen ? -256 : 0 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg lg:static lg:inset-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}
          >
            {/* Enhanced Logo */}
            <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <Link to="/" className="flex items-center space-x-3">
                <motion.div 
                  className="relative"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </motion.div>
                </motion.div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    ManufacturingPro
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <Globe className="w-3 h-3 mr-1" />
                    Manufacturing Platform
                  </p>
                </div>
              </Link>
              <IconButton
                icon={<X className="h-5 w-5" />}
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              />
            </div>

            {/* Enhanced Navigation */}
            <nav className="mt-6 px-4">
              <div className="space-y-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = isCurrentPath(item.href);
                  
                  // Define gradients for different navigation items
                  const gradients = [
                    'from-blue-500 via-purple-500 to-indigo-600',
                    'from-emerald-500 via-teal-500 to-cyan-600',
                    'from-orange-500 via-red-500 to-pink-600',
                    'from-purple-500 via-violet-500 to-indigo-600',
                    'from-green-500 via-emerald-500 to-teal-600',
                    'from-amber-500 via-orange-500 to-red-600',
                    'from-indigo-500 via-blue-500 to-cyan-600',
                    'from-slate-500 via-gray-500 to-zinc-600',
                    'from-yellow-500 via-amber-500 to-orange-600',
                    'from-rose-500 via-pink-500 to-purple-600'
                  ];
                  const gradient = gradients[index % gradients.length];
                  
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="relative"
                    >
                      <Link
                        to={item.href}
                        className={cn(
                          'group relative flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-all duration-300',
                          isActive
                            ? 'text-white shadow-xl transform scale-[1.02]'
                            : 'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                        )}
                      >
                        {/* Background Gradient for Active State */}
                        <motion.div
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ 
                            opacity: isActive ? 1 : 0,
                            scale: isActive ? 1 : 0.8
                          }}
                          transition={{ duration: 0.3 }}
                        />
                        
                        {/* Hover Background */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-gray-100 dark:bg-gray-800/50"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: !isActive ? 0.7 : 0 }}
                          transition={{ duration: 0.2 }}
                        />

                        {/* Glow Effect for Active State */}
                        {isActive && (
                          <motion.div
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} blur-xl opacity-30`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1.2 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}

                        {/* Content */}
                        <div className="relative flex items-center w-full">
                          {/* Enhanced Icon Container */}
                          <motion.div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                              isActive 
                                ? 'bg-white/20 backdrop-blur-sm' 
                                : 'bg-transparent group-hover:bg-white/10 dark:group-hover:bg-gray-700/50'
                            )}
                            whileHover={{ scale: 1.1, rotate: isActive ? 0 : 5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Icon
                              className={cn(
                                'h-5 w-5 transition-colors',
                                isActive
                                  ? 'text-white'
                                  : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                              )}
                            />
                          </motion.div>
                          
                          <div className="ml-3 flex-1 flex items-center justify-between">
                            <span className="truncate font-semibold">{item.name}</span>
                            
                            {/* Enhanced Badges */}
                            {item.badge && (
                              <motion.span
                                className={cn(
                                  'text-xs font-bold rounded-full px-2 py-0.5',
                                  isActive 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-red-500 text-white'
                                )}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                {item.badge}
                              </motion.span>
                            )}
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
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Bottom section */}
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/settings"
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300" />
                Settings
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Enhanced Top Bar */}
        <motion.div 
          className="sticky top-0 z-40 flex items-center justify-between h-20 px-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg lg:px-6"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="flex items-center space-x-4">
            <IconButton
              icon={<Menu className="h-5 w-5" />}
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-blue-50 hover:text-blue-600 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            />
            
            {/* Enhanced Search */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="relative">
                <motion.div
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Search className="h-4 w-4 text-gray-400" />
                </motion.div>
                <input
                  type="text"
                  placeholder="Search orders, quotes, manufacturers..."
                  className="pl-10 pr-4 py-3 w-80 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 shadow-sm text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white dark:focus:bg-gray-800 transition-all backdrop-blur-sm dark:text-white"
                  onChange={(e) => {
                  // Implement global search
                    console.log('Search:', e.target.value);
                }}
              />
              </div>
              
              {/* Enhanced Quick filters */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-medium flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  Quick:
                </span>
                <motion.button 
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Orders
                </motion.button>
                <motion.button 
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Quotes
                </motion.button>
                <motion.button 
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Users
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Enhanced Quick Stats */}
            <motion.div 
              className="hidden lg:flex items-center space-x-4 px-4 py-3 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-gray-500 flex items-center justify-center">
                  <Activity className="w-3 h-3 mr-1" />
                  Active Orders
                </div>
                <div className="text-sm font-bold text-blue-600">89</div>
              </motion.div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-gray-500 flex items-center justify-center">
                  <Bell className="w-3 h-3 mr-1" />
                  Pending
                </div>
                <div className="text-sm font-bold text-orange-600">23</div>
              </motion.div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-xs text-gray-500 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Revenue
                </div>
                <div className="text-sm font-bold text-green-600">$2.8M</div>
              </motion.div>
            </motion.div>

            {/* Enhanced Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Dark mode toggle */}
              <motion.button
                onClick={toggleDarkMode}
                className="p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors backdrop-blur-sm"
                aria-label="Toggle dark mode"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: darkMode ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {darkMode ? 
                    <Sun className="h-5 w-5 text-yellow-500" /> : 
                    <Moon className="h-5 w-5 text-gray-600" />
                  }
                </motion.div>
              </motion.button>

              {/* Notifications with enhanced badge */}
              <motion.button
                onClick={() => navigate('/notifications')}
                className="relative p-3 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors backdrop-blur-sm"
                aria-label="Notifications"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <motion.span 
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  3
                </motion.span>
              </motion.button>

              {/* Enhanced Quick Add Menu */}
              <motion.button
                className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all shadow-lg"
                aria-label="Quick Add"
                title="Quick Add"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Plus className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Enhanced User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-semibold">
                    {user ? getInitials(user.fullName) : 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-1 ${
                      user?.role === 'admin' ? 'bg-red-500' : 
                      user?.role === 'manufacturer' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></span>
                    {user?.role}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* User dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  >
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="mr-3 h-4 w-4" />
                        Your Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Page content */}
        <motion.main 
          className="flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="py-6 px-4 lg:px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              {children || <Outlet />}
            </motion.div>
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardLayout; 