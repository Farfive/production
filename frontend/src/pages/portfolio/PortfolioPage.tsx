import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  WrenchScrewdriverIcon,
  BuildingOfficeIcon,
  StarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShareIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { BriefcaseIcon as BriefcaseIconSolid } from '@heroicons/react/24/solid';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  completionDate: string;
  clientName: string;
  industryType: string;
  projectValue: number;
  duration: string;
  technologies: string[];
  featured: boolean;
}

interface Capability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  proficiencyLevel: number;
  yearsExperience: number;
  certifications: string[];
  equipment: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId: string;
  verified: boolean;
  documentUrl: string;
}

const PortfolioPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'capabilities' | 'certifications'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Mock data - replace with real API calls
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    {
      id: 'project_1',
      title: 'Precision Aerospace Components',
      description: 'Manufactured high-precision titanium components for commercial aircraft landing gear systems.',
      category: 'aerospace',
      images: ['/portfolio/aerospace-1.jpg', '/portfolio/aerospace-2.jpg'],
      completionDate: '2024-01-15',
      clientName: 'AeroTech Industries',
      industryType: 'Aerospace',
      projectValue: 250000,
      duration: '8 weeks',
      technologies: ['CNC Machining', 'Titanium Alloy', 'CAD/CAM', 'Quality Inspection'],
      featured: true
    },
    {
      id: 'project_2',
      title: 'Medical Device Housing',
      description: 'Produced FDA-compliant plastic housings for medical diagnostic equipment.',
      category: 'medical',
      images: ['/portfolio/medical-1.jpg'],
      completionDate: '2023-12-20',
      clientName: 'MedTech Solutions',
      industryType: 'Medical',
      projectValue: 125000,
      duration: '6 weeks',
      technologies: ['Injection Molding', 'Medical Grade Plastics', 'Clean Room Manufacturing'],
      featured: false
    },
    {
      id: 'project_3',
      title: 'Automotive Prototype Parts',
      description: 'Rapid prototyping of electric vehicle battery housing components.',
      category: 'automotive',
      images: ['/portfolio/automotive-1.jpg', '/portfolio/automotive-2.jpg', '/portfolio/automotive-3.jpg'],
      completionDate: '2023-11-30',
      clientName: 'ElectricAuto Corp',
      industryType: 'Automotive',
      projectValue: 180000,
      duration: '4 weeks',
      technologies: ['3D Printing', 'Aluminum Machining', 'Rapid Prototyping'],
      featured: true
    }
  ]);

  const [capabilities, setCapabilities] = useState<Capability[]>([
    {
      id: 'cap_1',
      name: 'CNC Machining',
      description: 'High-precision computer numerical control machining for complex geometries',
      icon: <CogIcon className="h-6 w-6" />,
      proficiencyLevel: 95,
      yearsExperience: 15,
      certifications: ['ISO 9001:2015', 'AS9100D'],
      equipment: ['Haas VF-2', 'Mazak Integrex', 'DMG Mori NLX']
    },
    {
      id: 'cap_2',
      name: 'Injection Molding',
      description: 'Thermoplastic and thermoset injection molding for high-volume production',
      icon: <BuildingOfficeIcon className="h-6 w-6" />,
      proficiencyLevel: 88,
      yearsExperience: 12,
      certifications: ['ISO 13485:2016', 'FDA Registered'],
      equipment: ['Engel Victory', 'Arburg Allrounder', 'Sumitomo Demag']
    },
    {
      id: 'cap_3',
      name: '3D Printing',
      description: 'Additive manufacturing for rapid prototyping and low-volume production',
      icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
      proficiencyLevel: 92,
      yearsExperience: 8,
      certifications: ['SLA/SLS Certified'],
      equipment: ['Formlabs Form 3L', 'EOS M290', 'Stratasys F900']
    },
    {
      id: 'cap_4',
      name: 'Quality Control',
      description: 'Comprehensive quality assurance and inspection services',
      icon: <CheckBadgeIcon className="h-6 w-6" />,
      proficiencyLevel: 98,
      yearsExperience: 18,
      certifications: ['ISO 9001:2015', 'IATF 16949'],
      equipment: ['Zeiss CMM', 'Mitutoyo Measuring', 'Keyence Vision Systems']
    }
  ]);

  const [certifications, setCertifications] = useState<Certification[]>([
    {
      id: 'cert_1',
      name: 'ISO 9001:2015 Quality Management',
      issuer: 'BSI Group',
      issueDate: '2023-06-15',
      expiryDate: '2026-06-15',
      credentialId: 'ISO9001-2023-001',
      verified: true,
      documentUrl: '/certificates/iso9001.pdf'
    },
    {
      id: 'cert_2',
      name: 'AS9100D Aerospace Quality',
      issuer: 'SAI Global',
      issueDate: '2023-08-20',
      expiryDate: '2026-08-20',
      credentialId: 'AS9100D-2023-045',
      verified: true,
      documentUrl: '/certificates/as9100d.pdf'
    },
    {
      id: 'cert_3',
      name: 'ISO 13485:2016 Medical Devices',
      issuer: 'TUV SUD',
      issueDate: '2023-09-10',
      expiryDate: '2026-09-10',
      credentialId: 'ISO13485-2023-078',
      verified: true,
      documentUrl: '/certificates/iso13485.pdf'
    }
  ]);

  const categories = [
    { id: 'all', name: 'All Projects', count: portfolioItems.length },
    { id: 'aerospace', name: 'Aerospace', count: portfolioItems.filter(p => p.category === 'aerospace').length },
    { id: 'medical', name: 'Medical', count: portfolioItems.filter(p => p.category === 'medical').length },
    { id: 'automotive', name: 'Automotive', count: portfolioItems.filter(p => p.category === 'automotive').length },
    { id: 'industrial', name: 'Industrial', count: portfolioItems.filter(p => p.category === 'industrial').length }
  ];

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredPortfolioItems = portfolioItems.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Beautiful Design */}
      <motion.div 
        className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50 to-purple-100 dark:from-gray-900 dark:via-indigo-900/20 dark:to-purple-900/30 rounded-3xl p-8 shadow-xl border border-white/20 dark:border-gray-700/30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-6 right-12 w-28 h-28 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 270, 360],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute bottom-6 left-12 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-xl"
            animate={{
              scale: [1.3, 1, 1.3],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-emerald-400/15 to-teal-600/15 rounded-full blur-lg"
            animate={{
              y: [-10, 10, -10],
              x: [-5, 5, -5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-6">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.7 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                <BriefcaseIconSolid className="h-10 w-10 text-white" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.4, 1],
                  rotate: [0, 180, 360] 
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
              >
                <StarIcon className="w-4 h-4 text-white" />
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8] 
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              >
                <CheckBadgeIcon className="w-3 h-3 text-white" />
              </motion.div>
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Portfolio & Capabilities
              </motion.h1>
              <motion.p 
                className="mt-3 text-lg text-gray-600 dark:text-gray-300 flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <WrenchScrewdriverIcon className="w-5 h-5 text-indigo-500" />
                <span>Showcase your manufacturing expertise & completed projects</span>
              </motion.p>
              
              <motion.div 
                className="mt-4 flex items-center space-x-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <motion.div
                      className="w-2 h-2 bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span>{portfolioItems.length} Active Projects</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <AcademicCapIcon className="w-4 h-4" />
                  <span>{certifications.filter(c => c.verified).length} Certifications</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-purple-600 dark:text-purple-400 font-medium">
                  <CogIcon className="w-4 h-4" />
                  <span>{capabilities.length} Core Capabilities</span>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div 
            className="mt-6 sm:mt-0 flex flex-col space-y-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <motion.button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center px-6 py-3 ${
                editMode 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700' 
                  : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/90 dark:hover:bg-gray-800/90 text-gray-700 dark:text-gray-300'
              } backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200`}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {editMode ? 'Exit Edit Mode' : 'Edit Portfolio'}
            </motion.button>
            
            <motion.button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New Project
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        className="border-b border-gray-200 dark:border-gray-700"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'portfolio', label: 'Portfolio', icon: BriefcaseIcon },
            { id: 'capabilities', label: 'Capabilities', icon: WrenchScrewdriverIcon },
            { id: 'certifications', label: 'Certifications', icon: AcademicCapIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <motion.div 
          className="space-y-6"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Completed Projects',
                value: portfolioItems.length.toString(),
                icon: BriefcaseIcon,
                color: 'text-blue-600'
              },
              {
                label: 'Total Project Value',
                value: formatCurrency(portfolioItems.reduce((sum, item) => sum + item.projectValue, 0)),
                icon: ChartBarIcon,
                color: 'text-green-600'
              },
              {
                label: 'Active Certifications',
                value: certifications.filter(c => c.verified).length.toString(),
                icon: AcademicCapIcon,
                color: 'text-purple-600'
              },
              {
                label: 'Core Capabilities',
                value: capabilities.length.toString(),
                icon: WrenchScrewdriverIcon,
                color: 'text-orange-600'
              }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center">
                  <div className={`${stat.color} dark:text-opacity-80`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Featured Projects */}
          <motion.div 
            variants={fadeInUp}
            className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Featured Projects
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {portfolioItems.filter(item => item.featured).map((item) => (
                  <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.industryType}</span>
                      <span>{formatCurrency(item.projectValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Capabilities Overview */}
          <motion.div 
            variants={fadeInUp}
            className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Capabilities
              </h2>
              <div className="space-y-4">
                {capabilities.slice(0, 3).map((capability) => (
                  <div key={capability.id} className="flex items-center space-x-4">
                    <div className="text-primary-600 dark:text-primary-400">
                      {capability.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {capability.name}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {capability.proficiencyLevel}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${capability.proficiencyLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <motion.div 
          className="space-y-6"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {/* Category Filter */}
          <motion.div 
            variants={fadeInUp}
            className="flex space-x-4 overflow-x-auto pb-2"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </motion.div>

          {/* Portfolio Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPortfolioItems.map((item) => (
              <motion.div 
                key={item.id}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700">
                  <div className="flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.featured && (
                      <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {item.description}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Client:</span>
                      <span className="text-gray-900 dark:text-white">{item.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Value:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(item.projectValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                      <span className="text-gray-900 dark:text-white">{item.duration}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {item.technologies.slice(0, 3).map((tech, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {tech}
                      </span>
                    ))}
                    {item.technologies.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{item.technologies.length - 3} more
                      </span>
                    )}
                  </div>

                  {editMode && (
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 text-xs bg-primary-600 hover:bg-primary-700 text-white py-2 rounded">
                        Edit
                      </button>
                      <button className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white py-2 rounded">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredPortfolioItems.length === 0 && (
            <motion.div 
              className="text-center py-12"
              variants={fadeInUp}
            >
              <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No projects found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding your first project to showcase your work.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Capabilities Tab */}
      {activeTab === 'capabilities' && (
        <motion.div 
          className="space-y-6"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <div className="grid md:grid-cols-2 gap-6">
            {capabilities.map((capability) => (
              <motion.div 
                key={capability.id}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start space-x-4">
                  <div className="text-primary-600 dark:text-primary-400">
                    {capability.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {capability.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {capability.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Proficiency Level
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {capability.proficiencyLevel}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${capability.proficiencyLevel}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {capability.yearsExperience} years
                        </div>
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-4 w-4 mr-1" />
                          {capability.certifications.length} certs
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Equipment & Tools
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {capability.equipment.map((equipment, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {equipment}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Certifications Tab */}
      {activeTab === 'certifications' && (
        <motion.div 
          className="space-y-6"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certifications.map((certification) => (
              <motion.div 
                key={certification.id}
                variants={fadeInUp}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <AcademicCapIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    {certification.verified && (
                      <CheckBadgeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    certification.verified 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {certification.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {certification.name}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Issuer:</span>
                    <span className="text-gray-900 dark:text-white">{certification.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Issue Date:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(certification.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                  {certification.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(certification.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">ID:</span>
                    <span className="text-gray-900 dark:text-white font-mono text-xs">
                      {certification.credentialId}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 text-xs bg-primary-600 hover:bg-primary-700 text-white py-2 rounded flex items-center justify-center">
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View
                  </button>
                  <button className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white py-2 rounded flex items-center justify-center">
                    <ShareIcon className="h-4 w-4 mr-1" />
                    Share
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PortfolioPage; 