import React, { useState, useEffect } from 'react';
import './Billing.css';

interface Subscription {
  id: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  planName: string;
  downloadUrl?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

const BillingDashboard: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Mock data - replace with actual API calls
      setSubscription({
        id: 'sub_123',
        plan: 'premium',
        status: 'active',
        currentPeriodStart: '2024-01-01',
        currentPeriodEnd: '2024-02-01',
        cancelAtPeriodEnd: false
      });

      setInvoices([
        {
          id: 'inv_123',
          date: '2024-01-01',
          amount: 49.99,
          status: 'paid',
          planName: 'Premium Plan',
          downloadUrl: '/invoices/inv_123.pdf'
        },
        {
          id: 'inv_124',
          date: '2023-12-01',
          amount: 49.99,
          status: 'paid',
          planName: 'Premium Plan',
          downloadUrl: '/invoices/inv_124.pdf'
        }
      ]);

      setPaymentMethods([
        {
          id: 'pm_123',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          isDefault: true
        }
      ]);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanDetails = (plan: string) => {
    const plans = {
      basic: { name: 'Basic Plan', price: 19.99, features: ['Up to 50 bookings/month', 'Basic analytics', 'Email support'] },
      premium: { name: 'Premium Plan', price: 49.99, features: ['Unlimited bookings', 'Advanced analytics', 'Priority support', 'Custom branding'] },
      enterprise: { name: 'Enterprise Plan', price: 99.99, features: ['Everything in Premium', 'Multi-location support', 'API access', 'Dedicated support'] }
    };
    return plans[plan as keyof typeof plans];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'status-active',
      trial: 'status-trial',
      cancelled: 'status-cancelled',
      past_due: 'status-past-due',
      paid: 'status-paid',
      pending: 'status-pending',
      failed: 'status-failed'
    };
    return <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses]}`}>{status.replace('_', ' ')}</span>;
  };

  if (loading) {
    return (
      <div className="billing-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-dashboard">
      <div className="billing-header">
        <h1>Billing & Subscription</h1>
        <p>Manage your subscription, payment methods, and billing history</p>
      </div>

      {/* Current Subscription */}
      <div className="billing-section">
        <div className="section-header">
          <h2>Current Subscription</h2>
          <button 
            className="btn btn-outline"
            onClick={() => setShowPlanModal(true)}
          >
            Change Plan
          </button>
        </div>
        
        {subscription ? (
          <div className="subscription-card">
            <div className="subscription-info">
              <div className="plan-details">
                <h3>{getPlanDetails(subscription.plan).name}</h3>
                <p className="plan-price">${getPlanDetails(subscription.plan).price}/month</p>
                {getStatusBadge(subscription.status)}
              </div>
              
              <div className="billing-cycle">
                <p><strong>Current Period:</strong></p>
                <p>{formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                {subscription.cancelAtPeriodEnd && (
                  <p className="cancel-notice">⚠️ Subscription will cancel at period end</p>
                )}
              </div>
            </div>

            <div className="subscription-actions">
              {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                <button className="btn btn-danger-outline">Cancel Subscription</button>
              )}
              {subscription.cancelAtPeriodEnd && (
                <button className="btn btn-primary">Reactivate Subscription</button>
              )}
            </div>
          </div>
        ) : (
          <div className="no-subscription">
            <p>No active subscription found.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowPlanModal(true)}
            >
              Choose a Plan
            </button>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="billing-section">
        <div className="section-header">
          <h2>Payment Methods</h2>
          <button 
            className="btn btn-outline"
            onClick={() => setShowPaymentModal(true)}
          >
            Add Payment Method
          </button>
        </div>

        <div className="payment-methods">
          {paymentMethods.map((method) => (
            <div key={method.id} className="payment-method-card">
              <div className="payment-info">
                <div className="card-icon">
                  {method.type === 'card' ? '💳' : '🏦'}
                </div>
                <div className="card-details">
                  <p className="card-brand">{method.brand.toUpperCase()} •••• {method.last4}</p>
                  {method.expiryMonth && method.expiryYear && (
                    <p className="card-expiry">Expires {method.expiryMonth}/{method.expiryYear}</p>
                  )}
                  {method.isDefault && <span className="default-badge">Default</span>}
                </div>
              </div>
              <div className="payment-actions">
                {!method.isDefault && (
                  <button className="btn-link">Set as Default</button>
                )}
                <button className="btn-link text-danger">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="billing-section">
        <div className="section-header">
          <h2>Billing History</h2>
        </div>

        <div className="invoices-table">
          <div className="table-header">
            <div>Date</div>
            <div>Description</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          
          {invoices.map((invoice) => (
            <div key={invoice.id} className="table-row">
              <div>{formatDate(invoice.date)}</div>
              <div>{invoice.planName}</div>
              <div>${invoice.amount}</div>
              <div>{getStatusBadge(invoice.status)}</div>
              <div>
                {invoice.downloadUrl && (
                  <button className="btn-link">Download PDF</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage & Limits */}
      <div className="billing-section">
        <div className="section-header">
          <h2>Usage & Limits</h2>
        </div>

        <div className="usage-cards">
          <div className="usage-card">
            <h4>Monthly Bookings</h4>
            <div className="usage-meter">
              <div className="usage-bar">
                <div className="usage-fill" style={{ width: '65%' }}></div>
              </div>
              <p>156 / 240 bookings used</p>
            </div>
          </div>

          <div className="usage-card">
            <h4>Storage Used</h4>
            <div className="usage-meter">
              <div className="usage-bar">
                <div className="usage-fill" style={{ width: '40%' }}></div>
              </div>
              <p>2.1 GB / 5 GB used</p>
            </div>
          </div>

          <div className="usage-card">
            <h4>API Calls</h4>
            <div className="usage-meter">
              <div className="usage-bar">
                <div className="usage-fill" style={{ width: '30%' }}></div>
              </div>
              <p>3,521 / 10,000 calls used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Alerts */}
      <div className="billing-section">
        <div className="section-header">
          <h2>Billing Alerts</h2>
        </div>

        <div className="alert-settings">
          <div className="alert-item">
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
            <div className="alert-info">
              <h4>Payment Failed</h4>
              <p>Get notified when a payment fails</p>
            </div>
          </div>

          <div className="alert-item">
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
            <div className="alert-info">
              <h4>Usage Limits</h4>
              <p>Alert when approaching plan limits</p>
            </div>
          </div>

          <div className="alert-item">
            <label className="switch">
              <input type="checkbox" />
              <span className="slider"></span>
            </label>
            <div className="alert-info">
              <h4>Renewal Reminder</h4>
              <p>Reminder before subscription renewal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard; 