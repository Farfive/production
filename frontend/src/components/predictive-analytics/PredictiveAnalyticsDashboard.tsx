import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Package,
  Globe,
  Zap,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  Lightbulb,
  Star,
  Cpu,
  LineChart,
  PieChart
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

// Types
interface PredictiveMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  icon: React.ReactNode;
  description: string;
}

interface Forecast {
  id: string;
  type: string;
  title: string;
  predictions: Array<{
    period: string;
    value: number;
    confidence: number;
  }>;
  accuracy: number;
  insights: string[];
  recommendations: string[];
}

interface RiskAlert {
  id: string;
  category: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: number;
  description: string;
  mitigation: string[];
  timeline: string;
}

interface ModelPerformance {
  name: string;
  accuracy: number;
  lastTrained: string;
  status: 'active' | 'training' | 'outdated';
  predictions: number;
}

interface BusinessInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionability: 'immediate' | 'short-term' | 'long-term';
  confidence: number;
  recommendations: string[];
}

const PredictiveAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'forecasts' | 'risks' | 'insights' | 'models'>('overview');
  const [timeHorizon, setTimeHorizon] = useState<'short' | 'medium' | 'long'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data - in production, this would come from API
  const predictiveMetrics: PredictiveMetric[] = [
    {
      id: 'demand-forecast',
      label: 'Demand Forecast Accuracy',
      value: '87.3%',
      change: '+2.4%',
      trend: 'up',
      confidence: 89,
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'ML-powered demand prediction accuracy for next quarter'
    },
    {
      id: 'price-prediction',
      label: 'Price Prediction Confidence',
      value: '82.1%',
      change: '+1.8%',
      trend: 'up',
      confidence: 82,
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Material and labor cost prediction reliability'
    },
    {
      id: 'quality-forecast',
      label: 'Quality Score Prediction',
      value: '94.6%',
      change: '+0.9%',
      trend: 'up',
      confidence: 95,
      icon: <Star className="h-5 w-5" />,
      description: 'Production quality outcome prediction accuracy'
    },
    {
      id: 'delivery-prediction',
      label: 'Delivery Time Accuracy',
      value: '91.2%',
      change: '-0.3%',
      trend: 'down',
      confidence: 91,
      icon: <Clock className="h-5 w-5" />,
      description: 'Supply chain delivery timeline prediction precision'
    },
    {
      id: 'risk-assessment',
      label: 'Risk Detection Rate',
      value: '88.7%',
      change: '+3.2%',
      trend: 'up',
      confidence: 89,
      icon: <Shield className="h-5 w-5" />,
      description: 'Early warning system effectiveness for supply chain risks'
    },
    {
      id: 'revenue-forecast',
      label: 'Revenue Forecast Accuracy',
      value: '85.4%',
      change: '+1.5%',
      trend: 'up',
      confidence: 85,
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Monthly and quarterly revenue prediction reliability'
    }
  ];

  const forecasts: Forecast[] = [
    {
      id: 'demand-q3',
      type: 'demand',
      title: 'Q3 Manufacturing Demand',
      predictions: [
        { period: 'Jul 2024', value: 1250, confidence: 87 },
        { period: 'Aug 2024', value: 1340, confidence: 84 },
        { period: 'Sep 2024', value: 1420, confidence: 81 }
      ],
      accuracy: 87.3,
      insights: [
        'Strong seasonal growth pattern detected',
        'Electronics sector driving 34% of increase',
        'Medical device demand up 28% year-over-year'
      ],
      recommendations: [
        'Increase production capacity by 15%',
        'Secure additional electronics component suppliers',
        'Invest in cleanroom capabilities for medical devices'
      ]
    },
    {
      id: 'price-materials',
      type: 'pricing',
      title: 'Material Cost Trends',
      predictions: [
        { period: 'Jul 2024', value: 102.5, confidence: 78 },
        { period: 'Aug 2024', value: 105.2, confidence: 75 },
        { period: 'Sep 2024', value: 107.8, confidence: 72 }
      ],
      accuracy: 82.1,
      insights: [
        'Steel prices showing upward pressure',
        'Energy costs stabilizing after recent volatility',
        'Rare earth metals experiencing supply constraints'
      ],
      recommendations: [
        'Lock in 6-month steel contracts at current rates',
        'Explore alternative materials for non-critical components',
        'Diversify rare earth metal suppliers'
      ]
    },
    {
      id: 'quality-production',
      type: 'quality',
      title: 'Production Quality Forecast',
      predictions: [
        { period: 'Jul 2024', value: 94.2, confidence: 95 },
        { period: 'Aug 2024', value: 94.8, confidence: 93 },
        { period: 'Sep 2024', value: 95.1, confidence: 91 }
      ],
      accuracy: 94.6,
      insights: [
        'Quality improvements from process optimization',
        'New equipment reducing defect rates',
        'Enhanced training showing positive impact'
      ],
      recommendations: [
        'Continue current quality improvement initiatives',
        'Expand successful training programs',
        'Monitor new equipment performance closely'
      ]
    }
  ];

  const riskAlerts: RiskAlert[] = [
    {
      id: 'risk-1',
      category: 'Supply Chain',
      level: 'medium',
      probability: 34,
      impact: 7.2,
      description: 'Single supplier dependency creating vulnerability in critical component supply',
      mitigation: [
        'Identify and qualify backup suppliers',
        'Negotiate dual-sourcing agreements',
        'Maintain strategic inventory buffer'
      ],
      timeline: 'immediate'
    },
    {
      id: 'risk-2',
      category: 'Market',
      level: 'low',
      probability: 18,
      impact: 4.5,
      description: 'Potential market slowdown in automotive sector affecting demand',
      mitigation: [
        'Diversify into growth sectors',
        'Develop aerospace capabilities',
        'Strengthen medical device partnerships'
      ],
      timeline: 'short-term'
    },
    {
      id: 'risk-3',
      category: 'Operational',
      level: 'high',
      probability: 67,
      impact: 8.9,
      description: 'Equipment aging increasing breakdown risk and maintenance costs',
      mitigation: [
        'Implement predictive maintenance program',
        'Schedule equipment upgrades',
        'Cross-train maintenance staff'
      ],
      timeline: 'immediate'
    }
  ];

  const modelPerformance: ModelPerformance[] = [
    {
      name: 'Demand Forecast RF v2.1',
      accuracy: 87.4,
      lastTrained: '2 days ago',
      status: 'active',
      predictions: 1247
    },
    {
      name: 'Price Prediction NN v1.8',
      accuracy: 82.3,
      lastTrained: '1 day ago',
      status: 'active',
      predictions: 892
    },
    {
      name: 'Quality Forecast LSTM v1.3',
      accuracy: 94.6,
      lastTrained: '5 days ago',
      status: 'active',
      predictions: 634
    },
    {
      name: 'Risk Assessment SVM v2.0',
      accuracy: 88.7,
      lastTrained: '3 days ago',
      status: 'active',
      predictions: 423
    }
  ];

  const businessInsights: BusinessInsight[] = [
    {
      id: 'insight-1',
      type: 'opportunity',
      title: 'Emerging Medical Device Manufacturing Demand',
      description: 'AI analysis identifies 34% increase in medical device manufacturing demand driven by aging population and healthcare digitization',
      impact: 'high',
      actionability: 'immediate',
      confidence: 89,
      recommendations: [
        'Expand precision manufacturing capabilities',
        'Invest in cleanroom facilities',
        'Develop medical device company partnerships',
        'Enhance quality certifications (ISO 13485)'
      ]
    },
    {
      id: 'insight-2',
      type: 'efficiency',
      title: 'Production Efficiency Optimization',
      description: 'ML models identify potential 18% efficiency improvement through optimized scheduling and resource allocation',
      impact: 'medium',
      actionability: 'immediate',
      confidence: 84,
      recommendations: [
        'Implement AI-driven production scheduling',
        'Optimize machine utilization patterns',
        'Reduce setup and changeover times',
        'Enhance predictive maintenance'
      ]
    },
    {
      id: 'insight-3',
      type: 'risk',
      title: 'Supply Chain Diversification Strategy',
      description: 'Risk analysis suggests reducing dependency on single-source suppliers to mitigate 67% of identified supply chain risks',
      impact: 'high',
      actionability: 'short-term',
      confidence: 91,
      recommendations: [
        'Identify alternative suppliers in different regions',
        'Develop supplier qualification programs',
        'Implement supplier risk monitoring',
        'Create strategic inventory buffers'
      ]
    }
  ];

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'stable': return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getImpactLevelColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics Overview</h2>
          <p className="text-gray-600">AI-powered insights and forecasting for manufacturing operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictiveMetrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {metric.icon}
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm font-medium text-gray-700">{metric.label}</div>
                  <div className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.change} from last month
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Confidence</span>
                      <span className="text-xs font-medium">{metric.confidence}%</span>
                    </div>
                    <Progress value={metric.confidence} className="h-2" />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <span>AI-Generated Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {businessInsights.slice(0, 2).map((insight, _index) => (
              <div key={insight.id} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={getImpactLevelColor(insight.impact)}>
                    {insight.impact} impact
                  </Badge>
                  <div className="text-sm text-gray-500">{insight.confidence}% confidence</div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{insight.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-700">Key Recommendations:</div>
                  {insight.recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i} className="text-xs text-gray-600 flex items-start space-x-1">
                      <span>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-green-600" />
            <span>Recent Predictions & Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: '5 minutes ago', action: 'Q3 demand forecast updated - 87.3% accuracy', type: 'forecast', status: 'completed' },
              { time: '12 minutes ago', action: 'Material price prediction model retrained', type: 'model', status: 'completed' },
              { time: '28 minutes ago', action: 'Supply chain risk assessment generated', type: 'risk', status: 'completed' },
              { time: '1 hour ago', action: 'Quality prediction analysis in progress', type: 'analysis', status: 'processing' },
              { time: '2 hours ago', action: 'Market trend analysis completed for automotive sector', type: 'market', status: 'completed' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'completed' ? 'bg-green-500' :
                  activity.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderForecasts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Predictive Forecasts</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="short">Short Term (1-30 days)</option>
            <option value="medium">Medium Term (1-6 months)</option>
            <option value="long">Long Term (6-24 months)</option>
          </select>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {forecasts.map((forecast, index) => (
          <motion.div
            key={forecast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <span>{forecast.title}</span>
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-800">
                    {forecast.accuracy}% accuracy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Prediction Chart Placeholder */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Predictions</h4>
                    <div className="space-y-3">
                      {forecast.predictions.map((pred, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{pred.period}</div>
                            <div className="text-xs text-gray-500">{pred.confidence}% confidence</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {forecast.type === 'pricing' ? `$${pred.value}` : pred.value.toLocaleString()}
                            </div>
                            <Progress value={pred.confidence} className="h-1 w-16 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insights & Recommendations */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Insights</h4>
                      <ul className="space-y-1">
                        {forecast.insights.map((insight, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {forecast.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                            <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderRisks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Risk Assessment</h2>
        <Button variant="outline" className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Generate Report</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {riskAlerts.map((risk, index) => (
          <motion.div
            key={risk.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-l-4 ${
              risk.level === 'critical' ? 'border-l-red-500' :
              risk.level === 'high' ? 'border-l-orange-500' :
              risk.level === 'medium' ? 'border-l-yellow-500' :
              'border-l-green-500'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.level)}`} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{risk.category} Risk</h3>
                      <p className="text-sm text-gray-600 capitalize">{risk.level} priority • {risk.timeline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{risk.probability}% probability</div>
                    <div className="text-xs text-gray-500">Impact: {risk.impact}/10</div>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{risk.description}</p>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Mitigation Strategies</h4>
                  <ul className="space-y-1">
                    {risk.mitigation.map((strategy, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start space-x-2">
                        <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Business Insights</h2>
        <Button className="flex items-center space-x-2">
          <Brain className="h-4 w-4" />
          <span>Generate New Insights</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {businessInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {insight.type === 'opportunity' ? <TrendingUp className="h-5 w-5 text-green-600" /> :
                       insight.type === 'efficiency' ? <Zap className="h-5 w-5 text-blue-600" /> :
                       <AlertTriangle className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getImpactLevelColor(insight.impact)}>
                          {insight.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.actionability}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{insight.confidence}%</div>
                    <div className="text-xs text-gray-500">confidence</div>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{insight.description}</p>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {insight.recommendations.map((rec, i) => (
                      <div key={i} className="text-sm text-gray-600 flex items-start space-x-2 p-2 bg-gray-50 rounded">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderModels = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Model Performance</h2>
        <Button className="flex items-center space-x-2">
          <Cpu className="h-4 w-4" />
          <span>Retrain Models</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelPerformance.map((model, index) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{model.name}</h3>
                    <p className="text-sm text-gray-600">Last trained: {model.lastTrained}</p>
                  </div>
                  <Badge className={`${
                    model.status === 'active' ? 'bg-green-100 text-green-800' :
                    model.status === 'training' ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {model.status}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Accuracy</span>
                      <span className="text-sm font-medium">{model.accuracy}%</span>
                    </div>
                    <Progress value={model.accuracy} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Predictions Made</span>
                    <span className="font-medium">{model.predictions.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Retrain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
            { id: 'forecasts', label: 'Forecasts', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'risks', label: 'Risk Assessment', icon: <AlertTriangle className="h-4 w-4" /> },
            { id: 'insights', label: 'Business Insights', icon: <Lightbulb className="h-4 w-4" /> },
            { id: 'models', label: 'Model Performance', icon: <Cpu className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
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
          {activeTab === 'forecasts' && renderForecasts()}
          {activeTab === 'risks' && renderRisks()}
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'models' && renderModels()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PredictiveAnalyticsDashboard; 