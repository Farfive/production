import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Quote } from '../../types';
import { formatCurrency } from '../../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface QuotePricingChartProps {
  quote: Quote;
  compareWith?: Quote[];
  chartType?: 'breakdown' | 'comparison' | 'doughnut';
  className?: string;
}

const QuotePricingChart: React.FC<QuotePricingChartProps> = ({
  quote,
  compareWith = [],
  chartType = 'breakdown',
  className
}) => {
  const breakdownData = useMemo(() => {
    const breakdown = quote.breakdown || {
      materials: quote.totalAmount * 0.4,
      labor: quote.totalAmount * 0.3,
      overhead: quote.totalAmount * 0.15,
      shipping: quote.totalAmount * 0.1,
      taxes: quote.totalAmount * 0.05,
      total: quote.totalAmount,
      currency: quote.currency
    };

    return breakdown;
  }, [quote]);

  const comparisonData = useMemo(() => {
    const allQuotes = [quote, ...compareWith];
    return {
      labels: allQuotes.map(q => q.manufacturer?.companyName || `Quote ${q.id}`),
      datasets: [
        {
          label: 'Materials',
          data: allQuotes.map(q => {
            const breakdown = q.breakdown || {
              materials: q.totalAmount * 0.4,
              labor: q.totalAmount * 0.3,
              overhead: q.totalAmount * 0.15,
              shipping: q.totalAmount * 0.1,
              taxes: q.totalAmount * 0.05,
            };
            return breakdown.materials;
          }),
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1,
        },
        {
          label: 'Labor',
          data: allQuotes.map(q => {
            const breakdown = q.breakdown || {
              materials: q.totalAmount * 0.4,
              labor: q.totalAmount * 0.3,
              overhead: q.totalAmount * 0.15,
              shipping: q.totalAmount * 0.1,
              taxes: q.totalAmount * 0.05,
            };
            return breakdown.labor;
          }),
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1,
        },
        {
          label: 'Overhead',
          data: allQuotes.map(q => {
            const breakdown = q.breakdown || {
              materials: q.totalAmount * 0.4,
              labor: q.totalAmount * 0.3,
              overhead: q.totalAmount * 0.15,
              shipping: q.totalAmount * 0.1,
              taxes: q.totalAmount * 0.05,
            };
            return breakdown.overhead;
          }),
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          borderWidth: 1,
        },
        {
          label: 'Shipping',
          data: allQuotes.map(q => {
            const breakdown = q.breakdown || {
              materials: q.totalAmount * 0.4,
              labor: q.totalAmount * 0.3,
              overhead: q.totalAmount * 0.15,
              shipping: q.totalAmount * 0.1,
              taxes: q.totalAmount * 0.05,
            };
            return breakdown.shipping;
          }),
          backgroundColor: '#8B5CF6',
          borderColor: '#7C3AED',
          borderWidth: 1,
        },
        {
          label: 'Taxes & Fees',
          data: allQuotes.map(q => {
            const breakdown = q.breakdown || {
              materials: q.totalAmount * 0.4,
              labor: q.totalAmount * 0.3,
              overhead: q.totalAmount * 0.15,
              shipping: q.totalAmount * 0.1,
              taxes: q.totalAmount * 0.05,
            };
            return breakdown.taxes;
          }),
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
          borderWidth: 1,
        },
      ],
    };
  }, [quote, compareWith]);

  const doughnutData = useMemo(() => ({
    labels: ['Materials', 'Labor', 'Overhead', 'Shipping', 'Taxes & Fees'],
    datasets: [
      {
        data: [
          breakdownData.materials,
          breakdownData.labor,
          breakdownData.overhead,
          breakdownData.shipping,
          breakdownData.taxes,
        ],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#8B5CF6',
          '#EF4444',
        ],
        borderColor: [
          '#2563EB',
          '#059669',
          '#D97706',
          '#7C3AED',
          '#DC2626',
        ],
        borderWidth: 2,
      },
    ],
  }), [breakdownData]);

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: chartType === 'comparison' ? 'Quote Comparison' : 'Cost Breakdown',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y, quote.currency)}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: chartType === 'breakdown',
        grid: {
          display: false,
        },
      },
      y: {
        stacked: chartType === 'breakdown',
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(Number(value), quote.currency);
          }
        }
      },
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Cost Breakdown',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => Number(a) + Number(b), 0);
            const percentage = ((Number(context.parsed) / Number(total)) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(Number(context.parsed), quote.currency)} (${percentage}%)`;
          }
        }
      }
    },
  };

  const renderBreakdownTable = () => (
    <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        Detailed Breakdown
      </h4>
      <div className="space-y-2">
        {[
          { label: 'Materials', value: breakdownData.materials, color: 'bg-blue-500' },
          { label: 'Labor', value: breakdownData.labor, color: 'bg-green-500' },
          { label: 'Overhead', value: breakdownData.overhead, color: 'bg-yellow-500' },
          { label: 'Shipping', value: breakdownData.shipping, color: 'bg-purple-500' },
          { label: 'Taxes & Fees', value: breakdownData.taxes, color: 'bg-red-500' },
        ].map((item) => {
          const percentage = ((item.value / breakdownData.total) * 100).toFixed(1);
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.value, quote.currency)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Total</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {formatCurrency(breakdownData.total, quote.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderComparisonMetrics = () => {
    if (compareWith.length === 0) return null;

    const allQuotes = [quote, ...compareWith];
    const avgPrice = allQuotes.reduce((sum, q) => sum + q.totalAmount, 0) / allQuotes.length;
    const minPrice = Math.min(...allQuotes.map(q => q.totalAmount));
    const maxPrice = Math.max(...allQuotes.map(q => q.totalAmount));
    
    const savingsFromAvg = quote.totalAmount - avgPrice;
    const savingsFromMax = maxPrice - quote.totalAmount;

    return (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">vs Average</div>
          <div className={`text-sm font-medium ${
            savingsFromAvg < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {savingsFromAvg < 0 ? '-' : '+'}
            {formatCurrency(Math.abs(savingsFromAvg), quote.currency)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">vs Highest</div>
          <div className="text-sm font-medium text-green-600 dark:text-green-400">
            -{formatCurrency(savingsFromMax, quote.currency)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Market Position</div>
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {quote.totalAmount === minPrice ? 'Lowest' : 
             quote.totalAmount === maxPrice ? 'Highest' : 
             'Mid-range'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Pricing Analysis
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(quote.totalAmount, quote.currency)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {quote.manufacturer?.companyName}
            </div>
          </div>
        </div>

        <div className="h-64 mb-4">
          {chartType === 'doughnut' ? (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          ) : (
            <Bar 
              data={chartType === 'comparison' ? comparisonData : {
                labels: ['Cost Breakdown'],
                datasets: comparisonData.datasets.map(dataset => ({
                  ...dataset,
                  data: [dataset.data[0]] // Only show first quote data
                }))
              }} 
              options={barOptions} 
            />
          )}
        </div>

        {chartType !== 'comparison' && renderBreakdownTable()}
        {chartType === 'comparison' && renderComparisonMetrics()}
      </div>
    </motion.div>
  );
};

export default QuotePricingChart; 