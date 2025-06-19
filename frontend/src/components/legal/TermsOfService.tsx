import React from 'react';
import './LegalPages.css';

interface TermsOfServiceProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ 
  onAccept, 
  onDecline, 
  showActions = false 
}) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-subtitle">Last updated: {currentDate}</p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using this beauty services platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Service Description</h2>
            <p>
              Our platform connects beauty service clients with qualified service providers. We facilitate bookings, payments, and loyalty rewards but do not directly provide beauty services.
            </p>
            <ul>
              <li>Booking management for beauty appointments</li>
              <li>Secure payment processing</li>
              <li>Loyalty points and rewards system</li>
              <li>Review and rating system</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. User Accounts and Responsibilities</h2>
            <h3>3.1 Account Registration</h3>
            <p>
              Users must provide accurate, current, and complete information during registration. You are responsible for safeguarding your account credentials.
            </p>
            
            <h3>3.2 User Conduct</h3>
            <p>Users agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload false or misleading information</li>
              <li>Interfere with the platform's operation</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Service Provider Terms</h2>
            <p>
              Beauty service providers using our platform agree to:
            </p>
            <ul>
              <li>Maintain proper licensing and certifications</li>
              <li>Provide services professionally and safely</li>
              <li>Honor confirmed bookings</li>
              <li>Comply with health and safety regulations</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Payment and Billing</h2>
            <p>
              Payment processing is handled securely through our platform. Service fees, cancellation policies, and refund terms are clearly displayed at the time of booking.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Limitation of Liability</h2>
            <p>
              Our platform facilitates connections between users and service providers. We are not liable for the quality, safety, or outcome of beauty services performed by independent providers.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Dispute Resolution</h2>
            <p>
              Any disputes arising from the use of this service will be resolved through binding arbitration in accordance with the rules of the jurisdiction where our company is registered.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or platform notifications.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
              <br />
              Email: legal@beautyplatform.com
              <br />
              Phone: +1 (555) 123-4567
            </p>
          </section>
        </div>

        {showActions && (
          <div className="legal-actions">
            <button 
              className="btn btn-secondary"
              onClick={onDecline}
            >
              Decline
            </button>
            <button 
              className="btn btn-primary"
              onClick={onAccept}
            >
              Accept Terms
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TermsOfService; 