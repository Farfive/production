import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  DollarSign,
  Clock,
  Users,
  Globe,
  Star,
  Award,
  Briefcase,
  Settings,
  RefreshCw
} from 'lucide-react';
import api from '../../lib/api';

interface AIInsights {
  market_analysis: {
    demand_level: string;
    competition_level: string;
    price_trends: string;
    capacity_availability: string;
  };
  optimization_suggestions: string[];
  risk_assessment: {
    supply_chain_risks: string[];
    quality_risks: string[];
    timeline_risks: string[];
  };
  cost_optimization: {
    potential_savings: string;
    cost_drivers: string[];
    negotiation_points: string[];
  };
  quality_predictions: {
    expected_quality_level: string;
    quality_assurance_recommendations: string[];
  };
}

interface MarketIntelligence {
  market_overview: {
    total_active_manufacturers: number;
    avg_response_time_hours: number;
    avg_quote_turnaround_days: number;
    market_capacity_utilization: number;
  };
  pricing_trends: {
    avg_price_change_pct: number;
    price_volatility: string;
    cost_drivers: string[];
  };
  capacity_analysis: {
    available_capacity_pct: number;
    peak_demand_periods: string[];
    bottleneck_capabilities: string[];
  };
  quality_metrics: {
    avg_quality_rating: number;
    on_time_delivery_rate: number;
    customer_satisfaction: number;
  };
  geographic_distribution: {
    top_regions: Array<{
      region: string;
      manufacturer_count: number;
    }>;
  };
  emerging_trends: string[];
}

interface AIInsightsPanelProps {
  orderId: number;
  className?: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  orderId,
  className = ''
}) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'insights' | 'market'>('insights');

  useEffect(() => {
    if (orderId) {
      fetchAIInsights();
      fetchMarketIntelligence();
    }
  }, [orderId]);

  const fetchAIInsights = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/smart-matching/ai-insights/${orderId}`);
      if (response.data) {
        setInsights(response.data.insights);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketIntelligence = async () => {
    try {
      const response = await api.get('/smart-matching/market-intelligence');
      if (response.data) {
        setMarketIntelligence(response.data.intelligence);
      }
    } catch (error) {
      console.error('Error fetching market intelligence:', error);
    }
  };

  const getDemandLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCompetitionLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.toLowerCase().includes('increasing') || trend.toLowerCase().includes('rising')) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    }
    if (trend.toLowerCase().includes('decreasing') || trend.toLowerCase().includes('falling')) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Activity className="h-4 w-4 text-blue-500" />;
  };

  const MarketAnalysisCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Market Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Demand Level</div>
                <div className={`text-lg font-semibold ${getDemandLevelColor(insights.market_analysis.demand_level)}`}>
                  {insights.market_analysis.demand_level}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Competition Level</div>
                <div className={`text-lg font-semibold ${getCompetitionLevelColor(insights.market_analysis.competition_level)}`}>
                  {insights.market_analysis.competition_level}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Price Trends</div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(insights.market_analysis.price_trends)}
                  <span className="text-lg font-semibold">{insights.market_analysis.price_trends}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Capacity Availability</div>
                <div className="text-lg font-semibold text-green-600">
                  {insights.market_analysis.capacity_availability}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const OptimizationSuggestionsCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          AI Optimization Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights && insights.optimization_suggestions.length > 0 ? (
          <div className="space-y-3">
            {insights.optimization_suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No optimization suggestions available</p>
        )}
      </CardContent>
    </Card>
  );

  const RiskAssessmentCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights && (
          <div className="space-y-4">
            {insights.risk_assessment.supply_chain_risks.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Supply Chain Risks</div>
                <div className="space-y-1">
                  {insights.risk_assessment.supply_chain_risks.map((risk, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.risk_assessment.quality_risks.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Quality Risks</div>
                <div className="space-y-1">
                  {insights.risk_assessment.quality_risks.map((risk, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.risk_assessment.timeline_risks.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Timeline Risks</div>
                <div className="space-y-1">
                  {insights.risk_assessment.timeline_risks.map((risk, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CostOptimizationCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Cost Optimization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-800">Potential Savings</div>
              <div className="text-2xl font-bold text-green-600">
                {insights.cost_optimization.potential_savings}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Cost Drivers</div>
              <div className="flex flex-wrap gap-2">
                {insights.cost_optimization.cost_drivers.map((driver, index) => (
                  <Badge key={index} variant="outline">
                    {driver}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Negotiation Points</div>
              <div className="space-y-1">
                {insights.cost_optimization.negotiation_points.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const QualityPredictionsCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-purple-500" />
          Quality Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Expected Quality Level</div>
              <div className="text-lg font-semibold text-purple-600">
                {insights.quality_predictions.expected_quality_level}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-600 mb-2">Quality Assurance Recommendations</div>
              <div className="space-y-2">
                {insights.quality_predictions.quality_assurance_recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const MarketOverviewCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-500" />
          Market Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {marketIntelligence && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Active Manufacturers</div>
                <div className="text-2xl font-bold text-blue-600">
                  {marketIntelligence.market_overview.total_active_manufacturers}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Avg Response Time</div>
                <div className="text-lg font-semibold">
                  {marketIntelligence.market_overview.avg_response_time_hours}h
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Quote Turnaround</div>
                <div className="text-lg font-semibold">
                  {marketIntelligence.market_overview.avg_quote_turnaround_days} days
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Market Utilization</div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={marketIntelligence.market_overview.market_capacity_utilization * 100} 
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {Math.round(marketIntelligence.market_overview.market_capacity_utilization * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const EmergingTrendsCard: React.FC = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Emerging Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {marketIntelligence && marketIntelligence.emerging_trends.length > 0 ? (
          <div className="space-y-3">
            {marketIntelligence.emerging_trends.map((trend, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <Activity className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{trend}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No emerging trends data available</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-500" />
            AI Insights & Market Intelligence
          </h2>
          <p className="text-gray-600">Advanced analytics and recommendations for Order #{orderId}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === 'insights' ? 'default' : 'outline'}
            onClick={() => setActiveView('insights')}
          >
            AI Insights
          </Button>
          <Button
            variant={activeView === 'market' ? 'default' : 'outline'}
            onClick={() => setActiveView('market')}
          >
            Market Intelligence
          </Button>
          <Button variant="outline" onClick={fetchAIInsights} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Generating AI Insights</h3>
            <p className="text-gray-500">
              Our AI is analyzing market data and generating personalized recommendations...
            </p>
          </CardContent>
        </Card>
      ) : activeView === 'insights' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketAnalysisCard />
          <OptimizationSuggestionsCard />
          <RiskAssessmentCard />
          <CostOptimizationCard />
          <div className="lg:col-span-2">
            <QualityPredictionsCard />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketOverviewCard />
          <EmergingTrendsCard />
          {marketIntelligence && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Quality Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Avg Quality Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{marketIntelligence.quality_metrics.avg_quality_rating}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">On-time Delivery</span>
                      <span className="font-semibold">{marketIntelligence.quality_metrics.on_time_delivery_rate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Customer Satisfaction</span>
                      <span className="font-semibold">{marketIntelligence.quality_metrics.customer_satisfaction}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Geographic Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {marketIntelligence.geographic_distribution.top_regions.map((region, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{region.region}</span>
                        <Badge variant="outline">{region.manufacturer_count} manufacturers</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}; 