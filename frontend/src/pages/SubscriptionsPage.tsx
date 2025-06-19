import React from 'react';
import { CreditCardIcon, CheckIcon, StarIcon } from '@heroicons/react/24/outline';

const SubscriptionsPage: React.FC = () => {
  const plans = [
    {
      name: 'Basic',
      price: '$29',
      period: 'month',
      features: ['Up to 10 projects', 'Basic analytics', 'Email support', '5GB storage'],
      current: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: 'month',
      features: ['Unlimited projects', 'Advanced analytics', 'Priority support', '50GB storage', 'API access'],
      current: true,
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: 'month',
      features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'Unlimited storage', 'White-label'],
      current: false
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CreditCardIcon className="w-8 h-8 mr-3 text-emerald-600" />
          Subscriptions
        </h1>
        <p className="text-gray-600 mt-2">Manage your subscription plan and billing</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">Professional Plan</p>
            <p className="text-gray-600">$79/month • Next billing: January 15, 2024</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
              Change Plan
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative bg-white rounded-lg shadow-sm border-2 p-6 ${
            plan.current ? 'border-emerald-500' : 'border-gray-200'
          }`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center">
                  <StarIcon className="w-3 h-3 mr-1" />
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 ml-1">/{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <CheckIcon className="w-4 h-4 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              plan.current
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}>
              {plan.current ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Dec 15, 2023</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Professional Plan</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$79.00</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Paid
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage; 