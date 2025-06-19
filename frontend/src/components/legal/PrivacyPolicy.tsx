import React from 'react';
import './LegalPages.css';

interface PrivacyPolicyProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ 
  onAccept, 
  onDecline, 
  showActions = false 
}) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <header className="legal-header">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-subtitle">Last updated: {currentDate}</p>
        </header>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            
            <h3>1.1 Personal Information</h3>
            <p>We collect the following personal information:</p>
            <ul>
              <li>Name, email address, and phone number</li>
              <li>Profile photos and beauty preferences</li>
              <li>Location data for service matching</li>
              <li>Payment information (processed securely)</li>
              <li>Service history and reviews</li>
            </ul>

            <h3>1.2 Beauty-Specific Data</h3>
            <p>For personalized recommendations, we may collect:</p>
            <ul>
              <li>Skin type and beauty concerns</li>
              <li>Service preferences and history</li>
              <li>Allergies and sensitivities</li>
              <li>Treatment outcomes and satisfaction</li>
            </ul>

            <h3>1.3 Technical Information</h3>
            <ul>
              <li>Device information and browser type</li>
              <li>IP address and usage analytics</li>
              <li>Cookies and tracking data</li>
              <li>App performance metrics</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Facilitate bookings and service delivery</li>
              <li>Process payments and manage loyalty points</li>
              <li>Personalize service recommendations</li>
              <li>Improve platform functionality</li>
              <li>Send service reminders and updates</li>
              <li>Ensure safety and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Information Sharing</h2>
            
            <h3>3.1 Service Providers</h3>
            <p>
              We share necessary booking information with beauty service providers to facilitate appointments. This includes contact details, service preferences, and any relevant health considerations.
            </p>

            <h3>3.2 Third-Party Services</h3>
            <p>We may share data with trusted partners for:</p>
            <ul>
              <li>Payment processing (Stripe, PayPal)</li>
              <li>Analytics and performance monitoring</li>
              <li>Customer support services</li>
              <li>Marketing and promotional activities (with consent)</li>
            </ul>

            <h3>3.3 Legal Requirements</h3>
            <p>
              We may disclose information when required by law, court order, or to protect our rights and the safety of our users.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Data Security</h2>
            <p>We implement robust security measures including:</p>
            <ul>
              <li>End-to-end encryption for sensitive data</li>
              <li>Secure SSL connections</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and staff training</li>
              <li>Data backup and recovery systems</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Your Rights and Choices</h2>
            
            <h3>5.1 GDPR Rights (EU Users)</h3>
            <p>Under GDPR, you have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Rectify inaccurate information</li>
              <li>Erase your data ("right to be forgotten")</li>
              <li>Restrict processing</li>
              <li>Data portability</li>
              <li>Object to processing</li>
            </ul>

            <h3>5.2 Communication Preferences</h3>
            <p>
              You can control promotional communications, notifications, and data sharing preferences in your account settings.
            </p>

            <h3>5.3 Cookie Management</h3>
            <p>
              You can manage cookie preferences through your browser settings or our cookie preference center.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data Retention</h2>
            <p>
              We retain personal data for as long as necessary to provide services and comply with legal obligations:
            </p>
            <ul>
              <li>Account data: Until account deletion</li>
              <li>Transaction records: 7 years for tax purposes</li>
              <li>Service history: 2 years for improvements</li>
              <li>Analytics data: Anonymized after 18 months</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. International Data Transfers</h2>
            <p>
              Your data may be processed in countries outside your residence. We ensure adequate protection through appropriate safeguards and compliance with applicable laws.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Children's Privacy</h2>
            <p>
              Our services are not intended for users under 16. We do not knowingly collect personal information from children under 16 without parental consent.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Health Data Protection</h2>
            <p>
              Beauty service-related health information is treated with special care and additional security measures. This data is only shared with relevant service providers with your explicit consent.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Changes to Privacy Policy</h2>
            <p>
              We may update this privacy policy periodically. Significant changes will be communicated via email or platform notifications.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, contact us at:
              <br />
              Email: privacy@beautyplatform.com
              <br />
              Data Protection Officer: dpo@beautyplatform.com
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
              Accept Policy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy; 