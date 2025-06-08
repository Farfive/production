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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import Button, { IconButton } from '../ui/Button';
import { SearchInput } from '../ui/Input';
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
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Manufacturers', href: '/manufacturers', icon: Building2 },
    ];

    const manufacturerItems: NavItem[] = [
      { name: 'Order Management', href: '/orders', icon: ShoppingCart },
      { name: 'Quotes', href: '/quotes', icon: FileText },
      { name: 'Payments', href: '/payments', icon: CreditCard },
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
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ManufactureHub
                </span>
              </Link>
              <IconButton
                icon={<X className="h-5 w-5" />}
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              />
            </div>

            {/* Navigation */}
            <nav className="mt-6 px-3">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isCurrentPath(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative',
                        isActive
                          ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 flex-shrink-0 h-5 w-5',
                          isActive
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300'
                        )}
                      />
                      {item.name}
                      {item.badge && (
                        <span className="ml-auto bg-primary-100 text-primary-600 text-xs rounded-full px-2 py-0.5 dark:bg-primary-900 dark:text-primary-300">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary-100 rounded-md dark:bg-primary-900"
                          style={{ zIndex: -1 }}
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </Link>
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
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 lg:px-6">
          <div className="flex items-center space-x-4">
            <IconButton
              icon={<Menu className="h-5 w-5" />}
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            />
            
            {/* Search */}
            <div className="hidden md:block">
              <SearchInput
                placeholder="Search orders, quotes..."
                className="w-80"
                onSearch={(value) => {
                  // Implement global search
                  console.log('Search:', value);
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <IconButton
              icon={darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            />

            {/* Notifications */}
            <IconButton
              icon={<Bell className="h-5 w-5" />}
              variant="ghost"
              size="icon"
              aria-label="Notifications"
            />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user ? getInitials(user.fullName) : 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
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
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6 px-4 lg:px-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 