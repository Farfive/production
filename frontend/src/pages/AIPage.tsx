import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  BarChart3,
  MessageSquare,
  Activity,
  Cpu,
  Eye,
  Rocket,
  Shield,
  ChevronRight,
  Star,
  Globe,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  Layers,
  Network,
  Database,
  Bot,
  Lightbulb,
  Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';
import AIMatchingEngine from '../components/ai/SmartMatching/AIMatchingEngine';
import PredictiveAnalyticsDashboard from '../components/predictive-analytics/PredictiveAnalyticsDashboard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'beta' | 'coming-soon';
  category: 'matching' | 'analytics' | 'automation' | 'assistant';
  metrics?: {
    accuracy?: number;
    usage?: number;
    improvement?: number;
  };
}

interface AIMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

// Enhanced AI Interfaces for Real AI Functionality
interface AIMatchingResult {
  id: number;
  orderId: number;
  manufacturerId: number;
  manufacturerName: string;
  compatibilityScore: number;
  confidenceLevel: number;
  estimatedPrice: number;
  estimatedDelivery: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
  aiRecommendation: 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended';
}

interface AIInsight {
  id: number;
  type: 'optimization' | 'prediction' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
  timestamp: string;
  category: string;
}

interface MLModelPerformance {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrained: string;
  trainingDataSize: number;
  predictionsMade: number;
  successRate: number;
}

interface AIAnalyticsData {
  matchingEfficiency: Array<{ date: string; efficiency: number; volume: number }>;
  predictionAccuracy: Array<{ model: string; accuracy: number; trend: number }>;
  costOptimization: Array<{ category: string; savings: number; potential: number }>;
  qualityImprovements: Array<{ area: string; before: number; after: number; improvement: number }>;
}

interface AutomationRule {
  id: number;
  name: string;
  description: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused' | 'draft';
  executionCount: number;
  successRate: number;
  lastExecuted: string;
  aiGenerated: boolean;
}

// Mock data generators for AI functionality
const generateAIMatchingResults = (): AIMatchingResult[] => {
  const manufacturers = ['TechPrecision Ltd', 'Global Manufacturing', 'Innovative Solutions', 'Quality Works Inc', 'Advanced Production'];
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    orderId: 1000 + i,
    manufacturerId: i + 1,
    manufacturerName: manufacturers[i % manufacturers.length],
    compatibilityScore: 75 + Math.random() * 25,
    confidenceLevel: 80 + Math.random() * 20,
    estimatedPrice: 5000 + Math.random() * 15000,
    estimatedDelivery: 7 + Math.random() * 21,
    qualityScore: 85 + Math.random() * 15,
    riskScore: Math.random() * 30,
    reasons: [
      'Perfect capability match',
      'Excellent delivery track record',
      'Competitive pricing',
      'High quality standards'
    ].slice(0, 2 + Math.floor(Math.random() * 2)),
    aiRecommendation: ['highly_recommended', 'recommended', 'suitable'][Math.floor(Math.random() * 3)] as any
  }));
};

const generateAIInsights = (): AIInsight[] => [
  {
    id: 1,
    type: 'optimization',
    title: 'Cost Optimization Opportunity',
    description: 'AI detected 15% potential cost savings by switching to alternative materials',
    impact: 'high',
    confidence: 92,
    actionable: true,
    suggestedActions: ['Review material specifications', 'Contact alternative suppliers', 'Run cost-benefit analysis'],
    timestamp: new Date().toISOString(),
    category: 'Cost Management'
  },
  {
    id: 2,
    type: 'prediction',
    title: 'Delivery Delay Risk',
    description: 'High probability of delivery delays due to supplier capacity constraints',
    impact: 'medium',
    confidence: 87,
    actionable: true,
    suggestedActions: ['Identify backup suppliers', 'Adjust project timeline', 'Increase safety stock'],
    timestamp: new Date().toISOString(),
    category: 'Supply Chain'
  },
  {
    id: 3,
    type: 'anomaly',
    title: 'Quality Pattern Detected',
    description: 'Unusual quality variance pattern detected in recent orders',
    impact: 'medium',
    confidence: 78,
    actionable: true,
    suggestedActions: ['Investigate quality control processes', 'Review supplier standards', 'Schedule quality audit'],
    timestamp: new Date().toISOString(),
    category: 'Quality Control'
  }
];

const generateMLModelPerformance = (): MLModelPerformance[] => [
  {
    modelName: 'Manufacturer Matching Engine',
    accuracy: 94.2,
    precision: 91.8,
    recall: 89.6,
    f1Score: 90.7,
    lastTrained: '2024-01-15',
    trainingDataSize: 25000,
    predictionsMade: 1847,
    successRate: 92.3
  },
  {
    modelName: 'Price Prediction Model',
    accuracy: 87.5,
    precision: 85.2,
    recall: 88.1,
    f1Score: 86.6,
    lastTrained: '2024-01-12',
    trainingDataSize: 18500,
    predictionsMade: 1203,
    successRate: 89.1
  },
  {
    modelName: 'Quality Forecast Model',
    accuracy: 91.3,
    precision: 93.1,
    recall: 87.9,
    f1Score: 90.4,
    lastTrained: '2024-01-18',
    trainingDataSize: 32000,
    predictionsMade: 2156,
    successRate: 93.7
  }
];

const AIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'matching' | 'analytics' | 'models' | 'insights' | 'automation'>('overview');
  const [aiStatus, setAiStatus] = useState<'online' | 'processing' | 'offline'>('online');
  const [processingTasks, setProcessingTasks] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Real-time AI data queries
  const { data: aiMatchingResults, isLoading: matchingLoading } = useQuery({
    queryKey: ['ai-matching-results', selectedOrderId],
    queryFn: async () => {
      // In production, this would call the real AI API
      return generateAIMatchingResults();
    },
    enabled: !!selectedOrderId,
    refetchInterval: 30000
  });

  const { data: aiInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      return generateAIInsights();
    },
    refetchInterval: 60000
  });

  const { data: mlModels, isLoading: modelsLoading } = useQuery({
    queryKey: ['ml-models'],
    queryFn: async () => {
      return generateMLModelPerformance();
    },
    refetchInterval: 300000
  });

  // AI action mutations
  const runAIAnalysisMutation = useMutation({
    mutationFn: async (orderId: number) => {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { success: true, orderId };
    },
    onSuccess: () => {
      toast.success('AI analysis completed successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-matching-results'] });
    },
    onError: () => {
      toast.error('AI analysis failed');
    }
  });

  const retrainModelMutation = useMutation({
    mutationFn: async (modelName: string) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return { success: true, modelName };
    },
    onSuccess: (data) => {
      toast.success(`${data.modelName} retrained successfully`);
      queryClient.invalidateQueries({ queryKey: ['ml-models'] });
    }
  });

  // AI Features Configuration
  const aiFeatures: AIFeature[] = [
    {
      id: 'smart-matching',
      title: 'Smart Matching Engine',
      description: 'AI-powered order-manufacturer matching with ML-based compatibility scoring',
      icon: <Target className="h-6 w-6" />,
      status: 'active',
      category: 'matching',
      metrics: {
        accuracy: 94,
        usage: 1247,
        improvement: 67
      }
    },
    {
      id: 'predictive-analytics',
      title: 'Predictive Analytics',
      description: 'Forecast demand, pricing trends, and delivery timelines using advanced ML models',
      icon: <BarChart3 className="h-6 w-6" />,
      status: 'beta',
      category: 'analytics',
      metrics: {
        accuracy: 87,
        usage: 892,
        improvement: 45
      }
    },
    {
      id: 'intelligent-automation',
      title: 'Intelligent Automation',
      description: 'Automated workflows, smart notifications, and process optimization',
      icon: <Zap className="h-6 w-6" />,
      status: 'active',
      category: 'automation',
      metrics: {
        accuracy: 91,
        usage: 634,
        improvement: 52
      }
    },
    {
      id: 'ai-assistant',
      title: 'AI Assistant',
      description: 'Natural language processing for intelligent query handling and support',
      icon: <MessageSquare className="h-6 w-6" />,
      status: 'beta',
      category: 'assistant',
      metrics: {
        accuracy: 89,
        usage: 423,
        improvement: 38
      }
    },
    {
      id: 'market-intelligence',
      title: 'Market Intelligence',
      description: 'Real-time market analysis, competitive insights, and trend identification',
      icon: <Globe className="h-6 w-6" />,
      status: 'coming-soon',
      category: 'analytics'
    },
    {
      id: 'quality-prediction',
      title: 'Quality Prediction',
      description: 'Predict manufacturing quality and identify potential issues before they occur',
      icon: <Shield className="h-6 w-6" />,
      status: 'coming-soon',
      category: 'analytics'
    }
  ];

  // AI Metrics
  const aiMetrics: AIMetric[] = [
    {
      label: 'AI Accuracy',
      value: '91.2%',
      change: '+2.4%',
      trend: 'up',
      icon: <Target className="h-5 w-5" />
    },
    {
      label: 'Active AI Tasks',
      value: '1,247',
      change: '+156',
      trend: 'up',
      icon: <Activity className="h-5 w-5" />
    },
    {
      label: 'Processing Speed',
      value: '2.3s',
      change: '-0.8s',
      trend: 'up',
      icon: <Zap className="h-5 w-5" />
    },
    {
      label: 'User Satisfaction',
      value: '4.8/5',
      change: '+0.2',
      trend: 'up',
      icon: <Star className="h-5 w-5" />
    }
  ];

  // Simulate AI processing
  useEffect(() => {
    const interval = setInterval(() => {
      setProcessingTasks(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'beta': return 'text-blue-600 bg-blue-100';
      case 'coming-soon': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable': return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* AI Status Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Brain className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Intelligence Hub</h1>
              <p className="text-purple-100 mt-1">Advanced AI-powered manufacturing intelligence</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${aiStatus === 'online' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
              <span className="text-sm font-medium capitalize">{aiStatus}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{processingTasks}</div>
              <div className="text-sm text-purple-100">Active Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {aiMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                {metric.icon}
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
              <div className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change} from last month
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Features Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">AI Features & Capabilities</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span>Powered by Machine Learning</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => {
                if (feature.category === 'matching') {
                  setActiveTab('matching');
                }
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  {feature.icon}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                  {feature.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{feature.description}</p>

              {feature.metrics && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Accuracy</span>
                    <span className="font-medium">{feature.metrics.accuracy}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Usage</span>
                    <span className="font-medium">{feature.metrics.usage?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Improvement</span>
                    <span className="font-medium text-green-600">+{feature.metrics.improvement}%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Cpu className="h-4 w-4" />
                  <span className="capitalize">{feature.category}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent AI Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent AI Activity</h2>
        
        <div className="space-y-4">
          {[
            { time: '2 minutes ago', action: 'Smart matching completed for Order #1247', type: 'matching', status: 'success' },
            { time: '5 minutes ago', action: 'Predictive analysis updated for Q3 demand forecast', type: 'analytics', status: 'success' },
            { time: '12 minutes ago', action: 'Automated workflow triggered for supplier onboarding', type: 'automation', status: 'processing' },
            { time: '18 minutes ago', action: 'AI assistant handled 23 customer queries', type: 'assistant', status: 'success' },
            { time: '25 minutes ago', action: 'Quality prediction model retrained with new data', type: 'analytics', status: 'success' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-green-500' :
                activity.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                'bg-gray-400'
              }`} />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                activity.type === 'matching' ? 'bg-purple-100 text-purple-800' :
                activity.type === 'analytics' ? 'bg-blue-100 text-blue-800' :
                activity.type === 'automation' ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {activity.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
                { id: 'matching', label: 'Smart Matching', icon: <Target className="h-4 w-4" /> },
                { id: 'analytics', label: 'Predictive Analytics', icon: <BarChart3 className="h-4 w-4" /> },
                { id: 'automation', label: 'Automation', icon: <Zap className="h-4 w-4" /> },
                { id: 'assistant', label: 'AI Assistant', icon: <MessageSquare className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'matching' && <AIMatchingEngine />}
            {activeTab === 'analytics' && <PredictiveAnalyticsDashboard />}
            {activeTab === 'automation' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Zap className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Intelligent Automation</h2>
                <p className="text-gray-600 mb-6">Smart workflow automation and process optimization</p>
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                  <Rocket className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">In Development</span>
                </div>
              </div>
            )}
            {activeTab === 'assistant' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <MessageSquare className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">AI Assistant</h2>
                <p className="text-gray-600 mb-6">Natural language processing and intelligent support</p>
                <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-lg">
                  <Rocket className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">In Development</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIPage; 