import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';

interface SecurityStatus {
  ssl_configured: boolean;
  secrets_configured: boolean;
  compliance_score: number;
  last_audit: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
}

interface SSLStatus {
  ssl_configured: boolean;
  services: Record<string, any>;
  issues: string[];
}

interface SecretsStatus {
  secrets_valid: boolean;
  missing_secrets: string[];
  invalid_secrets: string[];
  backend: string;
}

interface AuditResult {
  total_findings: number;
  severity_breakdown: Record<string, number>;
  timestamp: string;
}

const SecurityDashboard: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [sslStatus, setSSLStatus] = useState<SSLStatus | null>(null);
  const [secretsStatus, setSecretsStatus] = useState<SecretsStatus | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load all security data in parallel
      const [sslResponse, secretsResponse, complianceResponse] = await Promise.all([
        fetch('/api/v1/security/ssl/status'),
        fetch('/api/v1/security/secrets/status'),
        fetch('/api/v1/security/compliance/check')
      ]);

      if (sslResponse.ok) {
        setSSLStatus(await sslResponse.json());
      }

      if (secretsResponse.ok) {
        setSecretsStatus(await secretsResponse.json());
      }

      if (complianceResponse.ok) {
        const compliance = await complianceResponse.json();
        setSecurityStatus({
          ssl_configured: compliance.checks.ssl_configured,
          secrets_configured: compliance.checks.secrets_configured,
          compliance_score: compliance.score,
          last_audit: compliance.timestamp,
          threat_level: 'low' // Would come from threat monitoring
        });
      }

    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
  };

  const runSecurityAudit = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/security/audit/run', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setAuditResults(result.results.summary);
        await loadSecurityData(); // Refresh overall status
      }
    } catch (error) {
      console.error('Security audit failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSSL = async () => {
    try {
      await fetch('/api/v1/security/ssl/validate', { method: 'POST' });
      await loadSecurityData();
    } catch (error) {
      console.error('SSL validation failed:', error);
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !securityStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-gray-600">Monitor SSL, secrets, and security compliance</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runSecurityAudit} disabled={loading}>
            <Eye className="h-4 w-4 mr-2" />
            Run Audit
          </Button>
        </div>
      </div>

      {/* Security Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Compliance Score</p>
                <p className={`text-2xl font-bold ${getComplianceColor(securityStatus?.compliance_score || 0)}`}>
                  {securityStatus?.compliance_score || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">SSL Status</p>
                <div className="flex items-center space-x-1">
                  {sslStatus?.ssl_configured ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {sslStatus?.ssl_configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Key className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Secrets</p>
                <div className="flex items-center space-x-1">
                  {secretsStatus?.secrets_valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {secretsStatus?.secrets_valid ? 'Valid' : 'Issues Found'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Threat Level</p>
                <Badge className={getThreatLevelColor(securityStatus?.threat_level || 'low')}>
                  {securityStatus?.threat_level?.toUpperCase() || 'LOW'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Information */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
          <TabsTrigger value="secrets">Secrets</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">SSL/TLS Configuration</h4>
                    <p className="text-sm text-gray-600">
                      {sslStatus?.ssl_configured 
                        ? 'SSL certificates are properly configured' 
                        : 'SSL configuration needs attention'}
                    </p>
                    {sslStatus?.issues && sslStatus.issues.length > 0 && (
                      <ul className="text-sm text-red-600">
                        {sslStatus.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Secrets Management</h4>
                    <p className="text-sm text-gray-600">
                      Backend: {secretsStatus?.backend || 'Not configured'}
                    </p>
                    {secretsStatus?.missing_secrets && secretsStatus.missing_secrets.length > 0 && (
                      <div>
                        <p className="text-sm text-red-600">Missing secrets:</p>
                        <ul className="text-sm text-red-600">
                          {secretsStatus.missing_secrets.map((secret, index) => (
                            <li key={index}>• {secret}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ssl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                SSL/TLS Configuration
                <Button onClick={validateSSL} size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Validate Certificates
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sslStatus?.services && Object.entries(sslStatus.services).map(([service, config]) => (
                  <div key={service} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{service}</h4>
                      <Badge variant={config.cert_exists ? "default" : "destructive"}>
                        {config.cert_exists ? 'Certificate Found' : 'Certificate Missing'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Certificate: {config.cert_exists ? '✓' : '✗'}</p>
                      <p>Private Key: {config.key_exists ? '✓' : '✗'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Secrets Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">Backend: {secretsStatus?.backend}</Badge>
                  <Badge variant={secretsStatus?.secrets_valid ? "default" : "destructive"}>
                    {secretsStatus?.secrets_valid ? 'All Valid' : 'Issues Found'}
                  </Badge>
                </div>

                {secretsStatus?.missing_secrets && secretsStatus.missing_secrets.length > 0 && (
                  <div className="border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Missing Secrets</h4>
                    <ul className="space-y-1">
                      {secretsStatus.missing_secrets.map((secret, index) => (
                        <li key={index} className="text-sm text-red-600">
                          • {secret}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {secretsStatus?.invalid_secrets && secretsStatus.invalid_secrets.length > 0 && (
                  <div className="border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Invalid Secrets</h4>
                    <ul className="space-y-1">
                      {secretsStatus.invalid_secrets.map((secret, index) => (
                        <li key={index} className="text-sm text-yellow-600">
                          • {secret}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Security Audit Results
                <Button onClick={runSecurityAudit} disabled={loading}>
                  <Eye className="h-4 w-4 mr-2" />
                  Run New Audit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(auditResults.severity_breakdown).map(([severity, count]) => (
                      <div key={severity} className="text-center">
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-sm text-gray-600 capitalize">{severity}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Last audit: {new Date(auditResults.timestamp).toLocaleString()}
                    </p>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No audit results available</p>
                  <p className="text-sm text-gray-500">Run a security audit to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard; 