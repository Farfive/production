import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Factory,
  FileCheck,
  Zap
} from 'lucide-react';
import { format, addDays, differenceInDays, isBefore, isAfter, isToday } from 'date-fns';
import { Quote } from '../../types';
import { cn } from '../../lib/utils';

interface QuoteTimelineVizProps {
  quote: Quote;
  compareWith?: Quote[];
  showComparison?: boolean;
  className?: string;
}

interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  date: Date;
  icon: React.ComponentType<any>;
  status: 'upcoming' | 'current' | 'completed' | 'delayed';
  critical?: boolean;
}

const QuoteTimelineViz: React.FC<QuoteTimelineVizProps> = ({
  quote,
  compareWith = [],
  showComparison = false,
  className
}) => {
  const milestones = useMemo((): TimelineMilestone[] => {
    const startDate = new Date();
    const deliveryDate = addDays(startDate, quote.deliveryTime);
    
    // Calculate milestone dates based on delivery time
    const productionDays = Math.floor(quote.deliveryTime * 0.7); // 70% for production
    const qualityDays = Math.floor(quote.deliveryTime * 0.1); // 10% for quality check
    const shippingDays = quote.deliveryTime - productionDays - qualityDays; // Remaining for shipping

    return [
      {
        id: 'order-confirmation',
        title: 'Order Confirmation',
        description: 'Quote accepted and order confirmed',
        date: startDate,
        icon: CheckCircle,
        status: 'upcoming',
        critical: true
      },
      {
        id: 'production-start',
        title: 'Production Start',
        description: 'Manufacturing process begins',
        date: addDays(startDate, 1),
        icon: Factory,
        status: 'upcoming'
      },
      {
        id: 'production-milestone',
        title: 'Production Milestone',
        description: '50% of production completed',
        date: addDays(startDate, Math.floor(productionDays / 2)),
        icon: Package,
        status: 'upcoming'
      },
      {
        id: 'production-complete',
        title: 'Production Complete',
        description: 'Manufacturing finished, ready for QC',
        date: addDays(startDate, productionDays),
        icon: FileCheck,
        status: 'upcoming'
      },
      {
        id: 'quality-check',
        title: 'Quality Inspection',
        description: 'Final quality control and testing',
        date: addDays(startDate, productionDays + 1),
        icon: AlertTriangle,
        status: 'upcoming',
        critical: true
      },
      {
        id: 'shipping',
        title: 'Shipping',
        description: 'Package dispatched for delivery',
        date: addDays(startDate, productionDays + qualityDays),
        icon: Truck,
        status: 'upcoming'
      },
      {
        id: 'delivery',
        title: 'Delivery',
        description: 'Order delivered to customer',
        date: deliveryDate,
        icon: CheckCircle,
        status: 'upcoming',
        critical: true
      }
    ];
  }, [quote.deliveryTime]);

  const comparisonData = useMemo(() => {
    if (!showComparison || compareWith.length === 0) return null;

    const allQuotes = [quote, ...compareWith].sort((a, b) => a.deliveryTime - b.deliveryTime);
    const fastestDelivery = allQuotes[0].deliveryTime;
    const slowestDelivery = allQuotes[allQuotes.length - 1].deliveryTime;

    return {
      quotes: allQuotes,
      fastestDelivery,
      slowestDelivery,
      range: slowestDelivery - fastestDelivery
    };
  }, [quote, compareWith, showComparison]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-500 border-success-500 text-white';
      case 'current':
        return 'bg-primary-500 border-primary-500 text-white animate-pulse';
      case 'upcoming':
        return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400';
      case 'delayed':
        return 'bg-error-500 border-error-500 text-white';
      default:
        return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400';
    }
  };

  const renderTimeline = () => (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      
      <div className="space-y-8">
        {milestones.map((milestone, index) => {
          const Icon = milestone.icon;
          const isLast = index === milestones.length - 1;

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative flex items-start"
            >
              {/* Timeline node */}
              <div className={cn(
                'flex-shrink-0 w-16 h-16 rounded-full border-4 flex items-center justify-center relative z-10',
                getStatusColor(milestone.status),
                milestone.critical && 'ring-4 ring-primary-200 dark:ring-primary-800'
              )}>
                <Icon className="w-6 h-6" />
                {milestone.critical && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning-500 rounded-full flex items-center justify-center">
                    <Zap className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="ml-6 flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    {milestone.title}
                  </h4>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(milestone.date, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format(milestone.date, 'EEEE')}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {milestone.description}
                </p>
                
                {/* Days from start */}
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Day {differenceInDays(milestone.date, milestones[0].date) + 1}
                  </div>
                  {milestone.critical && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200">
                      Critical Milestone
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderComparisonChart = () => {
    if (!comparisonData) return null;

    return (
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Delivery Timeline Comparison
        </h4>
        
        <div className="space-y-4">
          {comparisonData.quotes.map((compareQuote, index) => {
            const isCurrentQuote = compareQuote.id === quote.id;
            const percentage = comparisonData.range > 0 
              ? ((compareQuote.deliveryTime - comparisonData.fastestDelivery) / comparisonData.range) * 100
              : 50;

            return (
              <div key={compareQuote.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      isCurrentQuote ? 'bg-primary-500' : 'bg-gray-400'
                    )} />
                    <span className={cn(
                      'text-sm',
                      isCurrentQuote 
                        ? 'font-medium text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    )}>
                      {compareQuote.manufacturer?.companyName || `Quote ${compareQuote.id}`}
                      {isCurrentQuote && ' (Current)'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {compareQuote.deliveryTime} days
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(percentage, 10)}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className={cn(
                        'h-2 rounded-full',
                        isCurrentQuote ? 'bg-primary-500' : 'bg-gray-400'
                      )}
                    />
                  </div>
                  
                  {/* Delivery date */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>Start</span>
                    <span>{format(addDays(new Date(), compareQuote.deliveryTime), 'MMM dd')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Fastest Delivery</div>
            <div className="text-lg font-medium text-green-600 dark:text-green-400">
              {comparisonData.fastestDelivery} days
            </div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Your Quote</div>
            <div className={cn(
              'text-lg font-medium',
              quote.deliveryTime === comparisonData.fastestDelivery
                ? 'text-green-600 dark:text-green-400'
                : quote.deliveryTime <= comparisonData.fastestDelivery + (comparisonData.range * 0.3)
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            )}>
              {quote.deliveryTime} days
            </div>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">Time Difference</div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">
              +{quote.deliveryTime - comparisonData.fastestDelivery} days
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6', className)}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Delivery Timeline
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-1" />
            {quote.deliveryTime} days total
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Delivery: {format(addDays(new Date(), quote.deliveryTime), 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {renderTimeline()}
      {showComparison && renderComparisonChart()}
    </motion.div>
  );
};

export default QuoteTimelineViz; 