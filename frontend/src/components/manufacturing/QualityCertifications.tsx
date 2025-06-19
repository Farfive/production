import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  BarChart3,
  TrendingUp,
  FileCheck,
  DollarSign
} from 'lucide-react';

interface Certification {
  id: number;
  certificationCode: string;
  name: string;
  type: 'ISO' | 'Industry' | 'Safety' | 'Environmental' | 'Quality' | 'Security';
  standard: string;
  issuingBody: string;
  status: 'Active' | 'Expired' | 'Pending' | 'Suspended' | 'Under Review';
  issueDate: string;
  expiryDate: string;
  renewalDate: string;
  scope: string;
  certificateNumber: string;
  auditor: string;
  nextAudit: string;
  complianceScore: number;
  requirements: string[];
  documents: string[];
  cost: number;
  responsible: string;
  notes: string;
}

interface Audit {
  id: number;
  auditNumber: string;
  certificationId: number;
  certificationName: string;
  type: 'Internal' | 'External' | 'Surveillance' | 'Recertification';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  auditor: string;
  auditFirm: string;
  scheduledDate: string;
  completionDate: string | null;
  duration: number; // days
  scope: string;
  findings: number;
  nonConformities: number;
  observations: number;
  score: number;
  result: 'Pass' | 'Conditional Pass' | 'Fail' | 'Pending';
  reportUrl: string;
  actionItems: number;
  cost: number;
  notes: string;
}

interface ComplianceItem {
  id: number;
  requirement: string;
  certificationId: number;
  certificationName: string;
  status: 'Compliant' | 'Non-Compliant' | 'Partial' | 'Under Review';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  responsible: string;
  evidence: string[];
  lastReview: string;
  nextReview: string;
  notes: string;
}

interface QualityMetrics {
  totalCertifications: number;
  activeCertifications: number;
  expiringSoon: number;
  expiredCertifications: number;
  averageComplianceScore: number;
  totalAudits: number;
  passedAudits: number;
  pendingAudits: number;
  totalFindings: number;
  criticalFindings: number;
  complianceRate: number;
  certificationCost: number;
}

const QualityCertifications: React.FC = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalCertifications: 0,
    activeCertifications: 0,
    expiringSoon: 0,
    expiredCertifications: 0,
    averageComplianceScore: 0,
    totalAudits: 0,
    passedAudits: 0,
    pendingAudits: 0,
    totalFindings: 0,
    criticalFindings: 0,
    complianceRate: 0,
    certificationCost: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockCertifications: Certification[] = [
        {
          id: 1,
          certificationCode: 'ISO-9001',
          name: 'ISO 9001:2015 Quality Management System',
          type: 'ISO',
          standard: 'ISO 9001:2015',
          issuingBody: 'International Organization for Standardization',
          status: 'Active',
          issueDate: '2022-06-15',
          expiryDate: '2025-06-15',
          renewalDate: '2025-03-15',
          scope: 'Design, manufacture and supply of precision components',
          certificateNumber: 'ISO-9001-2022-001',
          auditor: 'BSI Group',
          nextAudit: '2024-06-15',
          complianceScore: 94.5,
          requirements: ['Document Control', 'Management Review', 'Internal Audits', 'Corrective Actions'],
          documents: ['Quality Manual', 'Procedures', 'Work Instructions'],
          cost: 25000,
          responsible: 'Lisa Chen',
          notes: 'Annual surveillance audit scheduled for June 2024'
        },
        {
          id: 2,
          certificationCode: 'ISO-14001',
          name: 'ISO 14001:2015 Environmental Management System',
          type: 'Environmental',
          standard: 'ISO 14001:2015',
          issuingBody: 'International Organization for Standardization',
          status: 'Active',
          issueDate: '2023-01-20',
          expiryDate: '2026-01-20',
          renewalDate: '2025-10-20',
          scope: 'Environmental management of manufacturing operations',
          certificateNumber: 'ISO-14001-2023-001',
          auditor: 'SGS',
          nextAudit: '2024-01-20',
          complianceScore: 91.2,
          requirements: ['Environmental Policy', 'Objectives', 'Monitoring', 'Emergency Preparedness'],
          documents: ['Environmental Manual', 'Procedures', 'Monitoring Records'],
          cost: 18000,
          responsible: 'Tom Rodriguez',
          notes: 'Focus on waste reduction and energy efficiency'
        },
        {
          id: 3,
          certificationCode: 'AS9100',
          name: 'AS9100D Aerospace Quality Management System',
          type: 'Industry',
          standard: 'AS9100D',
          issuingBody: 'International Aerospace Quality Group',
          status: 'Under Review',
          issueDate: '2021-09-10',
          expiryDate: '2024-09-10',
          renewalDate: '2024-06-10',
          scope: 'Design and manufacture of aerospace components',
          certificateNumber: 'AS9100-2021-001',
          auditor: 'DNV GL',
          nextAudit: '2024-03-10',
          complianceScore: 87.8,
          requirements: ['Configuration Management', 'Risk Management', 'Project Management'],
          documents: ['Quality Manual', 'Risk Register', 'Configuration Control'],
          cost: 35000,
          responsible: 'Mike Johnson',
          notes: 'Recertification audit in progress'
        }
      ];

      const mockAudits: Audit[] = [
        {
          id: 1,
          auditNumber: 'AUD-2024-001',
          certificationId: 1,
          certificationName: 'ISO 9001:2015',
          type: 'Surveillance',
          status: 'Scheduled',
          auditor: 'John Anderson',
          auditFirm: 'BSI Group',
          scheduledDate: '2024-06-15',
          completionDate: null,
          duration: 2,
          scope: 'Quality Management System review',
          findings: 0,
          nonConformities: 0,
          observations: 0,
          score: 0,
          result: 'Pending',
          reportUrl: '',
          actionItems: 0,
          cost: 5000,
          notes: 'Annual surveillance audit'
        },
        {
          id: 2,
          auditNumber: 'AUD-2024-002',
          certificationId: 3,
          certificationName: 'AS9100D',
          type: 'Recertification',
          status: 'In Progress',
          auditor: 'Sarah Williams',
          auditFirm: 'DNV GL',
          scheduledDate: '2024-03-10',
          completionDate: null,
          duration: 5,
          scope: 'Full system recertification',
          findings: 3,
          nonConformities: 1,
          observations: 2,
          score: 87.8,
          result: 'Pending',
          reportUrl: '',
          actionItems: 4,
          cost: 12000,
          notes: 'Recertification audit - minor findings identified'
        },
        {
          id: 3,
          auditNumber: 'AUD-2023-003',
          certificationId: 2,
          certificationName: 'ISO 14001:2015',
          type: 'Surveillance',
          status: 'Completed',
          auditor: 'David Brown',
          auditFirm: 'SGS',
          scheduledDate: '2023-12-15',
          completionDate: '2023-12-17',
          duration: 2,
          scope: 'Environmental management review',
          findings: 2,
          nonConformities: 0,
          observations: 2,
          score: 91.2,
          result: 'Pass',
          reportUrl: '/reports/audit-2023-003.pdf',
          actionItems: 2,
          cost: 4500,
          notes: 'Successful audit with minor observations'
        }
      ];

      const mockComplianceItems: ComplianceItem[] = [
        {
          id: 1,
          requirement: 'Management Review Meeting',
          certificationId: 1,
          certificationName: 'ISO 9001:2015',
          status: 'Compliant',
          priority: 'High',
          dueDate: '2024-03-31',
          responsible: 'Lisa Chen',
          evidence: ['Meeting Minutes', 'Action Items', 'Review Report'],
          lastReview: '2023-12-15',
          nextReview: '2024-03-15',
          notes: 'Quarterly management review completed'
        },
        {
          id: 2,
          requirement: 'Internal Audit Program',
          certificationId: 1,
          certificationName: 'ISO 9001:2015',
          status: 'Partial',
          priority: 'Medium',
          dueDate: '2024-02-28',
          responsible: 'Mike Johnson',
          evidence: ['Audit Schedule', 'Audit Reports'],
          lastReview: '2024-01-15',
          nextReview: '2024-02-15',
          notes: 'Q1 audits in progress'
        },
        {
          id: 3,
          requirement: 'Environmental Monitoring',
          certificationId: 2,
          certificationName: 'ISO 14001:2015',
          status: 'Non-Compliant',
          priority: 'Critical',
          dueDate: '2024-01-31',
          responsible: 'Tom Rodriguez',
          evidence: [],
          lastReview: '2023-12-01',
          nextReview: '2024-01-15',
          notes: 'Monthly monitoring reports overdue'
        }
      ];

      setCertifications(mockCertifications);
      setAudits(mockAudits);
      setComplianceItems(mockComplianceItems);
      setMetrics({
        totalCertifications: mockCertifications.length,
        activeCertifications: mockCertifications.filter(c => c.status === 'Active').length,
        expiringSoon: mockCertifications.filter(c => {
          const expiryDate = new Date(c.expiryDate);
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
          return expiryDate <= sixMonthsFromNow && c.status === 'Active';
        }).length,
        expiredCertifications: mockCertifications.filter(c => c.status === 'Expired').length,
        averageComplianceScore: mockCertifications.reduce((acc, c) => acc + c.complianceScore, 0) / mockCertifications.length,
        totalAudits: mockAudits.length,
        passedAudits: mockAudits.filter(a => a.result === 'Pass').length,
        pendingAudits: mockAudits.filter(a => a.status === 'Scheduled' || a.status === 'In Progress').length,
        totalFindings: mockAudits.reduce((acc, a) => acc + a.findings, 0),
        criticalFindings: 1,
        complianceRate: (mockComplianceItems.filter(c => c.status === 'Compliant').length / mockComplianceItems.length) * 100,
        certificationCost: mockCertifications.reduce((acc, c) => acc + c.cost, 0)
      });
    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Suspended': return 'bg-orange-100 text-orange-800';
      case 'Under Review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ISO': return 'bg-blue-100 text-blue-800';
      case 'Industry': return 'bg-purple-100 text-purple-800';
      case 'Safety': return 'bg-red-100 text-red-800';
      case 'Environmental': return 'bg-green-100 text-green-800';
      case 'Quality': return 'bg-yellow-100 text-yellow-800';
      case 'Security': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-800';
      case 'Non-Compliant': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Under Review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuditResultColor = (result: string) => {
    switch (result) {
      case 'Pass': return 'bg-green-100 text-green-800';
      case 'Conditional Pass': return 'bg-yellow-100 text-yellow-800';
      case 'Fail': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Certifications</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeCertifications}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-green-600">
              {metrics.totalCertifications} total certifications
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compliance Score</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.averageComplianceScore.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-blue-600">
              Average across all certifications
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.expiringSoon}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-yellow-600">
              Within 6 months
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Audit Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{((metrics.passedAudits / metrics.totalAudits) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-purple-600">
              {metrics.passedAudits}/{metrics.totalAudits} audits passed
            </div>
          </div>
        </motion.div>
      </div>

      {/* Certifications Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Certification Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{cert.name}</h4>
                  <p className="text-sm text-gray-500">{cert.certificationCode}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(cert.status)}`}>
                    {cert.status}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(cert.type)}`}>
                    {cert.type}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Compliance Score:</span>
                  <span className="font-medium">{cert.complianceScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Expires:</span>
                  <span className="font-medium">{new Date(cert.expiryDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Next Audit:</span>
                  <span className="font-medium">{new Date(cert.nextAudit).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Responsible:</span>
                  <span className="font-medium">{cert.responsible}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upcoming Audits */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Audits</h3>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Audit
          </button>
        </div>
        
        <div className="space-y-3">
          {audits.filter(audit => audit.status === 'Scheduled' || audit.status === 'In Progress').map((audit) => (
            <div key={audit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(audit.type)}`}>
                    {audit.type}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(audit.status)}`}>
                    {audit.status}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mt-1">{audit.certificationName}</h4>
                <p className="text-sm text-gray-500">{audit.auditNumber} • {audit.auditFirm}</p>
                <p className="text-sm text-gray-500">Auditor: {audit.auditor}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  ${audit.cost.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {audit.duration} days
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(audit.scheduledDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Status</h3>
          <div className="space-y-4">
            {complianceItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getComplianceStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <h5 className="font-medium text-gray-900 mt-1">{item.requirement}</h5>
                  <p className="text-sm text-gray-500">{item.certificationName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{item.responsible}</p>
                  <p className="text-xs text-gray-500">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm font-medium">Compliance Rate</span>
              </div>
              <span className="text-sm font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium">Total Audits</span>
              </div>
              <span className="text-sm font-bold text-blue-600">{metrics.totalAudits}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium">Total Findings</span>
              </div>
              <span className="text-sm font-bold text-yellow-600">{metrics.totalFindings}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-600 mr-3" />
                <span className="text-sm font-medium">Critical Findings</span>
              </div>
              <span className="text-sm font-bold text-red-600">{metrics.criticalFindings}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quality Certifications & Compliance</h1>
        <p className="text-gray-600 mt-2">
          Certification management, audit tracking, and compliance monitoring
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'certifications', name: 'Certifications', icon: Award },
            { id: 'audits', name: 'Audits', icon: FileText },
            { id: 'compliance', name: 'Compliance', icon: Shield },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'certifications' && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Certification Management</h3>
            <p className="text-gray-600">Detailed certification tracking and management coming soon.</p>
          </div>
        )}
        {activeTab === 'audits' && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Management</h3>
            <p className="text-gray-600">Comprehensive audit planning and tracking coming soon.</p>
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Monitoring</h3>
            <p className="text-gray-600">Real-time compliance tracking and reporting coming soon.</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Quality Analytics</h3>
            <p className="text-gray-600">Advanced quality analytics and insights coming soon.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QualityCertifications;