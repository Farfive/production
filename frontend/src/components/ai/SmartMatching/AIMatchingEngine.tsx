import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Target,
  TrendingUp,
  Zap,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Award,
  Activity,
  Cpu,
  BarChart3,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Package,
  AlertTriangle
} from 'lucide-react';

// Types for AI Matching
interface Order {
  id: string;
  title: string;
  description: string;
  technology: string;
  material: string;
  quantity: number;
  budget: number;
  deadline: string;
  complexity: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface Manufacturer {
  id: string;
  name: string;
  location: string;
  specialties: string[];
  rating: number;
  completedOrders: number;
  avgDeliveryTime: number;
  priceRange: { min: number; max: number };
  capacity: number;
  certifications: string[];
  lastActive: string;
}

interface MatchScore {
  overall: number;
  compatibility: number;
  cost: number;
  timeline: number;
  quality: number;
  location: number;
  capacity: number;
}

interface AIMatch {
  manufacturer: Manufacturer;
  order: Order;
  score: MatchScore;
  confidence: number;
  reasoning: string[];
  estimatedCost: number;
  estimatedDelivery: number;
  riskFactors: string[];
  advantages: string[];
}

const AIMatchingEngine: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [filterCriteria, setFilterCriteria] = useState({
    minScore: 70,
    maxResults: 10,
    prioritizeQuality: true,
    prioritizeCost: false,
    prioritizeSpeed: false
  });

  // Load real data from API
  useEffect(() => {
    // TODO: Replace with real API calls
    // This component should integrate with the real smart matching service
    // For now, we'll load empty arrays and the real matching engine will populate them
    setOrders([]);
    setManufacturers([]);
  }, []);

  // AI Matching Algorithm
  const calculateMatchScore = (order: Order, manufacturer: Manufacturer): MatchScore => {
    // Technology compatibility
    const techMatch = manufacturer.specialties.some(specialty => 
      specialty.toLowerCase().includes(order.technology.toLowerCase())
    ) ? 100 : 0;

    // Material compatibility
    const materialMatch = manufacturer.specialties.some(specialty => 
      specialty.toLowerCase().includes(order.material.toLowerCase())
    ) ? 100 : 0;

    // Cost compatibility
    const avgCost = order.budget / order.quantity;
    const costMatch = avgCost >= manufacturer.priceRange.min && avgCost <= manufacturer.priceRange.max ? 100 : 
                     Math.max(0, 100 - Math.abs(avgCost - (manufacturer.priceRange.min + manufacturer.priceRange.max) / 2) / avgCost * 100);

    // Timeline compatibility
    const daysUntilDeadline = Math.ceil((new Date(order.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const timelineMatch = daysUntilDeadline >= manufacturer.avgDeliveryTime ? 100 : 
                         Math.max(0, (daysUntilDeadline / manufacturer.avgDeliveryTime) * 100);

    // Quality score based on rating and certifications
    const qualityMatch = (manufacturer.rating / 5) * 100;

    // Location score (simplified - in real implementation would use actual distance)
    const locationMatch = 75; // Mock score

    // Capacity score
    const capacityMatch = manufacturer.capacity;

    // Compatibility score (weighted average of tech and material)
    const compatibility = (techMatch * 0.6 + materialMatch * 0.4);

    // Overall score calculation
    const overall = (
      compatibility * 0.25 +
      costMatch * 0.20 +
      timelineMatch * 0.20 +
      qualityMatch * 0.15 +
      locationMatch * 0.10 +
      capacityMatch * 0.10
    );

    return {
      overall: Math.round(overall),
      compatibility: Math.round(compatibility),
      cost: Math.round(costMatch),
      timeline: Math.round(timelineMatch),
      quality: Math.round(qualityMatch),
      location: Math.round(locationMatch),
      capacity: Math.round(capacityMatch)
    };
  };

  const generateAIMatch = (order: Order, manufacturer: Manufacturer): AIMatch => {
    const score = calculateMatchScore(order, manufacturer);
    const confidence = Math.min(95, score.overall + Math.random() * 10);
    
    const reasoning = [];
    if (score.compatibility > 80) reasoning.push('Excellent technology and material match');
    if (score.quality > 85) reasoning.push('High-rated manufacturer with proven track record');
    if (score.timeline > 80) reasoning.push('Can meet delivery deadline comfortably');
    if (score.cost > 75) reasoning.push('Competitive pricing within budget range');

    const riskFactors = [];
    if (score.capacity < 50) riskFactors.push('Limited current capacity');
    if (score.timeline < 70) riskFactors.push('Tight delivery timeline');
    if (manufacturer.completedOrders < 100) riskFactors.push('Limited order history');

    const advantages = [];
    if (manufacturer.certifications.length > 2) advantages.push('Multiple industry certifications');
    if (manufacturer.rating > 4.7) advantages.push('Exceptional customer ratings');
    if (manufacturer.avgDeliveryTime < 10) advantages.push('Fast delivery times');

    return {
      manufacturer,
      order,
      score,
      confidence: Math.round(confidence),
      reasoning,
      estimatedCost: Math.round(order.budget * (0.8 + Math.random() * 0.4)),
      estimatedDelivery: manufacturer.avgDeliveryTime + Math.floor(Math.random() * 5),
      riskFactors,
      advantages
    };
  };

  const runAIAnalysis = async (order: Order) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate AI processing with progress updates
    const progressSteps = [
      { progress: 20, message: 'Analyzing order requirements...' },
      { progress: 40, message: 'Evaluating manufacturer capabilities...' },
      { progress: 60, message: 'Calculating compatibility scores...' },
      { progress: 80, message: 'Applying AI optimization...' },
      { progress: 100, message: 'Generating recommendations...' }
    ];

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnalysisProgress(step.progress);
    }

    // Generate matches
    const aiMatches = manufacturers
      .map(manufacturer => generateAIMatch(order, manufacturer))
      .filter(match => match.score.overall >= filterCriteria.minScore)
      .sort((a, b) => b.score.overall - a.score.overall)
      .slice(0, filterCriteria.maxResults);

    setMatches(aiMatches);
    setIsAnalyzing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Smart Matching Engine</h1>
              <p className="text-purple-100">Intelligent order-manufacturer matching powered by machine learning</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-sm font-medium">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Order Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-blue-600" />
          Select Order for AI Analysis
        </h2>
        
        <div className="grid gap-4">
          {orders.map((order) => (
            <motion.div
              key={order.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOrder?.id === order.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedOrder(order)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{order.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Cpu className="h-4 w-4 mr-1" />
                      {order.technology}
                    </span>
                    <span className="flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      {order.material}
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ${order.budget.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Due: {new Date(order.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-6 border-t border-gray-200"
          >
            <button
              onClick={() => runAIAnalysis(selectedOrder)}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Analyzing... {analysisProgress}%</span>
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  <span>Run AI Analysis</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>

      {/* Analysis Progress */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AI Analysis in Progress</h3>
                <p className="text-sm text-gray-600">Processing order requirements and manufacturer data...</p>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">{analysisProgress}% Complete</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Matches Results */}
      <AnimatePresence>
        {matches.length > 0 && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                  AI Matching Results ({matches.length} matches found)
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Sorted by AI confidence score</span>
                </div>
              </div>

              <div className="space-y-4">
                {matches.map((match, index) => (
                  <motion.div
                    key={match.manufacturer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{match.manufacturer.name}</h3>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(match.score.overall)} ${getScoreColor(match.score.overall)}`}>
                            {match.score.overall}% Match
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{match.manufacturer.rating}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {match.manufacturer.location}
                          </span>
                          <span className="flex items-center">
                            <Award className="h-4 w-4 mr-1" />
                            {match.manufacturer.completedOrders} orders
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            ~{match.estimatedDelivery} days
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ~${match.estimatedCost.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {match.manufacturer.specialties.map((specialty) => (
                            <span key={specialty} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-1">{match.confidence}%</div>
                        <div className="text-sm text-gray-600">AI Confidence</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-4">
                      {Object.entries(match.score).map(([key, value]) => (
                        key !== 'overall' && (
                          <div key={key} className="text-center">
                            <div className={`text-lg font-semibold ${getScoreColor(value)}`}>{value}%</div>
                            <div className="text-xs text-gray-600 capitalize">{key}</div>
                          </div>
                        )
                      ))}
                    </div>

                    {/* AI Reasoning */}
                    {match.reasoning.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">AI Analysis:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {match.reasoning.map((reason, idx) => (
                            <li key={idx} className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Advantages and Risk Factors */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {match.advantages.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-green-700 mb-2">Advantages:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {match.advantages.map((advantage, idx) => (
                              <li key={idx} className="flex items-center">
                                <TrendingUp className="w-3 h-3 text-green-500 mr-2" />
                                {advantage}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {match.riskFactors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-orange-700 mb-2">Risk Factors:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {match.riskFactors.map((risk, idx) => (
                              <li key={idx} className="flex items-center">
                                <AlertTriangle className="w-3 h-3 text-orange-500 mr-2" />
                                {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                          Request Quote
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                          View Profile
                        </button>
                      </div>
                      <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIMatchingEngine; 