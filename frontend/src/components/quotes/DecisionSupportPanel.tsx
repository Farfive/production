import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  DollarSign,
  Clock,
  Star,
  Award,
  X,
  Info,
  BarChart3,
  Scale,
  FileCheck,
  Users,
  Globe,
  Truck
} from 'lucide-react';
import { Quote } from '../../types';
import Button from '../ui/Button';
import { formatCurrency, cn } from '../../lib/utils';
import { Slider } from '../ui/Slider';

interface DecisionSupportPanelProps {
  quotes: Quote[];
  criteria: {
    price: number;
    delivery: number;
    quality: number;
    reliability: number;
    compliance: number;
  };
  onCriteriaChange: (criteria: any) => void;
  onClose: () => void;
}

interface RiskFactor {
  id: string;
  title: string;
  description: string;
  weight: number;
  score: number; // 0-100, higher is riskier
  category: 'financial' | 'operational' | 'compliance' | 'reputational';
}

interface ComplianceItem {
  id: string;
  title: string;
  required: boolean;
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
  description: string;
}

const DecisionSupportPanel: React.FC<DecisionSupportPanelProps> = ({
  quotes,
  criteria,
  onCriteriaChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'recommendation' | 'tco' | 'risk' | 'compliance'>('recommendation');
  const [tcoParameters, setTcoParameters] = useState({
    operatingYears: 3,
    maintenanceCost: 0.05, // 5% of initial cost per year
    energyCost: 0.02, // 2% of initial cost per year
    disposalCost: 0.01, // 1% of initial cost
    inflationRate: 0.03, // 3% annual inflation
  });

  // Calculate recommendation scores
  const recommendationData = useMemo(() => {
    return quotes.map(quote => {
      // Normalize scores to 0-100 scale
      const maxPrice = Math.max(...quotes.map(q => q.totalAmount));
      const maxDelivery = Math.max(...quotes.map(q => q.deliveryTime));
      const maxRating = Math.max(...quotes.map(q => q.manufacturer?.rating || 0));

      const priceScore = 100 - ((quote.totalAmount / maxPrice) * 100);
      const deliveryScore = 100 - ((quote.deliveryTime / maxDelivery) * 100);
      const qualityScore = ((quote.manufacturer?.rating || 0) / maxRating) * 100;
      const reliabilityScore = Math.min(100, (quote.manufacturer?.reviewCount || 0) * 2); // Cap at 100
      const complianceScore = 85; // Default compliance score

      // Apply weights
      const weightedScore = (
        (priceScore * criteria.price / 100) +
        (deliveryScore * criteria.delivery / 100) +
        (qualityScore * criteria.quality / 100) +
        (reliabilityScore * criteria.reliability / 100) +
        (complianceScore * criteria.compliance / 100)
      );

      return {
        quote,
        scores: {
          price: priceScore,
          delivery: deliveryScore,
          quality: qualityScore,
          reliability: reliabilityScore,
          compliance: complianceScore,
          weighted: weightedScore
        }
      };
    }).sort((a, b) => b.scores.weighted - a.scores.weighted);
  }, [quotes, criteria]);

  // Calculate Total Cost of Ownership
  const tcoData = useMemo(() => {
    return quotes.map(quote => {
      const initialCost = quote.totalAmount;
      const annualMaintenance = initialCost * tcoParameters.maintenanceCost;
      const annualEnergy = initialCost * tcoParameters.energyCost;
      const disposalCost = initialCost * tcoParameters.disposalCost;

      let totalTco = initialCost;
      
      // Calculate NPV of future costs
      for (let year = 1; year <= tcoParameters.operatingYears; year++) {
        const yearlyOperatingCost = (annualMaintenance + annualEnergy) * Math.pow(1 + tcoParameters.inflationRate, year - 1);
        const presentValue = yearlyOperatingCost / Math.pow(1 + 0.05, year); // 5% discount rate
        totalTco += presentValue;
      }

      // Add disposal cost at end of life
      totalTco += disposalCost / Math.pow(1 + 0.05, tcoParameters.operatingYears);

      return {
        quote,
        tco: totalTco,
        breakdown: {
          initial: initialCost,
          maintenance: annualMaintenance * tcoParameters.operatingYears,
          energy: annualEnergy * tcoParameters.operatingYears,
          disposal: disposalCost
        }
      };
    }).sort((a, b) => a.tco - b.tco);
  }, [quotes, tcoParameters]);

  // Risk Assessment
  const riskAssessment = useMemo(() => {
    return quotes.map(quote => {
      const riskFactors: RiskFactor[] = [
        {
          id: 'financial-stability',
          title: 'Financial Stability',
          description: 'Risk of supplier financial issues',
          weight: 0.25,
          score: (quote.manufacturer?.reviewCount || 0) < 10 ? 70 : 30,
          category: 'financial'
        },
        {
          id: 'delivery-risk',
          title: 'Delivery Risk',
          description: 'Risk of delayed delivery',
          weight: 0.20,
          score: quote.deliveryTime > 30 ? 60 : 20,
          category: 'operational'
        },
        {
          id: 'quality-risk',
          title: 'Quality Risk',
          description: 'Risk of quality issues',
          weight: 0.20,
          score: (quote.manufacturer?.rating || 0) < 4 ? 70 : 25,
          category: 'operational'
        },
        {
          id: 'compliance-risk',
          title: 'Compliance Risk',
          description: 'Risk of regulatory non-compliance',
          weight: 0.15,
          score: Math.random() * 50 + 10, // Simulated risk score
          category: 'compliance'
        },
        {
          id: 'reputation-risk',
          title: 'Reputation Risk',
          description: 'Risk to company reputation',
          weight: 0.10,
          score: (quote.manufacturer?.rating || 0) < 3 ? 80 : 20,
          category: 'reputational'
        },
        {
          id: 'communication-risk',
          title: 'Communication Risk',
          description: 'Risk of poor communication',
          weight: 0.10,
          score: Math.random() * 40 + 20, // Simulated
          category: 'operational'
        }
      ];

      const overallRisk = riskFactors.reduce((total, factor) => 
        total + (factor.score * factor.weight), 0
      );

      return {
        quote,
        overallRisk,
        riskLevel: overallRisk > 60 ? 'high' as const : 
                  overallRisk > 40 ? 'medium' as const : 'low' as const,
        factors: riskFactors
      };
    });
  }, [quotes]);

  // Compliance Checklist
  const complianceChecklist: ComplianceItem[] = [
    {
      id: 'iso-9001',
      title: 'ISO 9001 Quality Management',
      required: true,
      status: 'compliant',
      description: 'Quality management system certification'
    },
    {
      id: 'iso-14001',
      title: 'ISO 14001 Environmental Management',
      required: false,
      status: 'partial',
      description: 'Environmental management system'
    },
    {
      id: 'reach-compliance',
      title: 'REACH Compliance',
      required: true,
      status: 'compliant',
      description: 'Chemical substances regulation compliance'
    },
    {
      id: 'conflict-minerals',
      title: 'Conflict Minerals Declaration',
      required: true,
      status: 'compliant',
      description: 'Conflict minerals reporting'
    },
    {
      id: 'gdpr-compliance',
      title: 'GDPR Compliance',
      required: true,
      status: 'compliant',
      description: 'Data protection regulation compliance'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 dark:text-green-400';
      case 'partial': return 'text-yellow-600 dark:text-yellow-400';
      case 'non-compliant': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderRecommendationTab = () => (
    <div className="space-y-6">
      {/* Criteria Adjustment */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Adjust Decision Criteria
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(criteria).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {key}
              </label>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => 
                  onCriteriaChange({ ...criteria, [key]: newValue })
                }
                max={50}
                step={5}
                className="w-full"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          Quote Recommendations
        </h4>
        {recommendationData.map((item, index) => (
          <motion.div
            key={item.quote.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'bg-white dark:bg-gray-800 border rounded-lg p-4',
              index === 0 && 'border-green-500 bg-green-50 dark:bg-green-900/20'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {index === 0 && (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <Award className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium">Recommended</span>
                  </div>
                )}
                <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                  {item.quote.manufacturer?.companyName}
                </h5>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(item.scores.weighted)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {Object.entries(item.scores).filter(([key]) => key !== 'weighted').map(([key, score]) => (
                <div key={key} className="text-center">
                  <div className={cn('text-lg font-medium', getScoreColor(score))}>
                    {Math.round(score)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {key}
                  </div>
                </div>
              ))}
            </div>

            {/* Quote Details */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>{formatCurrency(item.quote.totalAmount, item.quote.currency)}</span>
                <span>{item.quote.deliveryTime} days</span>
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  {item.quote.manufacturer?.rating || 0}
                </div>
              </div>
              {index === 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Best Overall Match
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderTcoTab = () => (
    <div className="space-y-6">
      {/* TCO Parameters */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          TCO Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Operating Years
            </label>
            <input
              type="number"
              value={tcoParameters.operatingYears}
              onChange={(e) => setTcoParameters(prev => ({
                ...prev,
                operatingYears: parseInt(e.target.value) || 0
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Annual Maintenance (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={tcoParameters.maintenanceCost * 100}
              onChange={(e) => setTcoParameters(prev => ({
                ...prev,
                maintenanceCost: parseFloat(e.target.value) / 100 || 0
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Annual Energy (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={tcoParameters.energyCost * 100}
              onChange={(e) => setTcoParameters(prev => ({
                ...prev,
                energyCost: parseFloat(e.target.value) / 100 || 0
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* TCO Results */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          Total Cost of Ownership Analysis
        </h4>
        {tcoData.map((item, index) => (
          <div key={item.quote.id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                {item.quote.manufacturer?.companyName}
              </h5>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(item.tco, item.quote.currency)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {tcoParameters.operatingYears}-year TCO
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Initial Cost</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.breakdown.initial, item.quote.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Maintenance</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.breakdown.maintenance, item.quote.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Energy</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.breakdown.energy, item.quote.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Disposal</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.breakdown.disposal, item.quote.currency)}
                </div>
              </div>
            </div>

            {index === 0 && (
              <div className="mt-3 flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Lowest TCO</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
        Risk Assessment
      </h4>
      
      {riskAssessment.map((item) => (
        <div key={item.quote.id} className="bg-white dark:bg-gray-800 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-medium text-gray-900 dark:text-white">
              {item.quote.manufacturer?.companyName}
            </h5>
            <div className="flex items-center space-x-3">
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                getRiskColor(item.riskLevel)
              )}>
                {item.riskLevel.toUpperCase()} RISK
              </span>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.round(item.overallRisk)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Risk Score</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {item.factors.map((factor) => (
              <div key={factor.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {factor.title}
                  </span>
                  <span className={cn('text-sm font-medium', getScoreColor(100 - factor.score))}>
                    {Math.round(factor.score)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full',
                      factor.score > 60 ? 'bg-red-500' :
                      factor.score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderComplianceTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
        Compliance Verification
      </h4>

      <div className="bg-white dark:bg-gray-800 border rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h5 className="text-lg font-medium text-gray-900 dark:text-white">
              Compliance Checklist
            </h5>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {complianceChecklist.filter(item => item.status === 'compliant').length} of{' '}
              {complianceChecklist.length} items compliant
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {complianceChecklist.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    item.status === 'compliant' ? 'bg-green-100 dark:bg-green-900' :
                    item.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900' :
                    item.status === 'non-compliant' ? 'bg-red-100 dark:bg-red-900' :
                    'bg-gray-100 dark:bg-gray-900'
                  )}>
                    {item.status === 'compliant' ? (
                      <CheckCircle className={cn('w-4 h-4', getComplianceColor(item.status))} />
                    ) : item.status === 'partial' ? (
                      <AlertTriangle className={cn('w-4 h-4', getComplianceColor(item.status))} />
                    ) : (
                      <X className={cn('w-4 h-4', getComplianceColor(item.status))} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </span>
                      {item.required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize',
                  item.status === 'compliant' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  item.status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  item.status === 'non-compliant' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                )}>
                  {item.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Decision Support Tools
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'recommendation', label: 'Recommendations', icon: Target },
              { id: 'tco', label: 'TCO Analysis', icon: Calculator },
              { id: 'risk', label: 'Risk Assessment', icon: Shield },
              { id: 'compliance', label: 'Compliance', icon: FileCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'recommendation' && renderRecommendationTab()}
          {activeTab === 'tco' && renderTcoTab()}
          {activeTab === 'risk' && renderRiskTab()}
          {activeTab === 'compliance' && renderComplianceTab()}
        </div>
      </div>
    </motion.div>
  );
};

export default DecisionSupportPanel; 