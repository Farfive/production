import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Assessment,
  Security,
  RocketLaunch,
  CheckCircle,
  Warning,
  Error,
  Refresh,
  Timeline,
  TrendingUp,
  Speed,
  Shield,
  Launch,
  Settings
} from '@mui/icons-material';

interface LoadTestResult {
  test_name: string;
  start_time: string;
  end_time: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  p95_response_time: number;
  requests_per_second: number;
  error_rate: number;
  errors_count: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  timestamp: string;
  recommendations: string[];
}

interface SecurityCheck {
  check_name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  recommendations: string[];
  timestamp: string;
}

interface SecurityReviewResult {
  overall_status: 'pass' | 'fail' | 'warning';
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  critical_issues: number;
  security_score: number;
  checks: SecurityCheck[];
  recommendations: string[];
  timestamp: string;
}

interface LaunchPlan {
  launch_name: string;
  strategy: string;
  target_environment: string;
  scheduled_time: string;
  rollback_threshold: Record<string, number>;
  monitoring_duration: number;
  steps: LaunchStep[];
  stakeholders: string[];
  total_steps: number;
  estimated_total_duration: number;
}

interface LaunchStep {
  name: string;
  description: string;
  phase: string;
  required: boolean;
  estimated_duration: number;
  dependencies: string[];
}

interface ReadinessCheck {
  launch_ready: boolean;
  readiness_score: number;
  checks: Record<string, boolean>;
  details: Record<string, any>;
  recommendations: string[];
}

const LaunchPreparationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load Testing State
  const [loadTestScenarios, setLoadTestScenarios] = useState<Record<string, any>>({});
  const [loadTestResults, setLoadTestResults] = useState<LoadTestResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  
  // Performance State
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, PerformanceMetric>>({});
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  
  // Security State
  const [securityReviewResults, setSecurityReviewResults] = useState<SecurityReviewResult[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  
  // Launch Planning State
  const [launchPlan, setLaunchPlan] = useState<LaunchPlan | null>(null);
  const [deploymentStrategies, setDeploymentStrategies] = useState<Record<string, any>>({});
  const [selectedStrategy, setSelectedStrategy] = useState('blue_green');
  const [deploymentStatus, setDeploymentStatus] = useState<any>(null);
  const [readinessCheck, setReadinessCheck] = useState<ReadinessCheck | null>(null);
  
  // Dialog States
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [executeLaunchDialog, setExecuteLaunchDialog] = useState(false);

  useEffect(() => {
    loadInitialData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLoadTestScenarios(),
        loadLoadTestResults(),
        loadPerformanceMetrics(),
        loadSecurityData(),
        loadDeploymentStrategies(),
        loadReadinessCheck()
      ]);
    } catch (err) {
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        loadLoadTestResults(),
        loadPerformanceMetrics(),
        loadSecurityData(),
        loadDeploymentStatus(),
        loadReadinessCheck()
      ]);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const loadLoadTestScenarios = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/load-testing/scenarios', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setLoadTestScenarios(data.scenarios);
        if (!selectedScenario && Object.keys(data.scenarios).length > 0) {
          setSelectedScenario(Object.keys(data.scenarios)[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load load test scenarios:', err);
    }
  };

  const loadLoadTestResults = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/load-testing/results', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setLoadTestResults(data.results);
      }
    } catch (err) {
      console.error('Failed to load load test results:', err);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/performance/analyze', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPerformanceMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
    }
  };

  const loadSecurityData = async () => {
    try {
      const [reviewResponse, complianceResponse] = await Promise.all([
        fetch('/api/v1/launch-preparation/security/review-results', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/launch-preparation/security/compliance-status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      const reviewData = await reviewResponse.json();
      const complianceData = await complianceResponse.json();
      
      if (reviewData.status === 'success') {
        setSecurityReviewResults(reviewData.results);
      }
      if (complianceData.status === 'success') {
        setComplianceStatus(complianceData);
      }
    } catch (err) {
      console.error('Failed to load security data:', err);
    }
  };

  const loadDeploymentStrategies = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/launch/strategies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setDeploymentStrategies(data.strategies);
      }
    } catch (err) {
      console.error('Failed to load deployment strategies:', err);
    }
  };

  const loadDeploymentStatus = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/launch/deployment-status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setDeploymentStatus(data);
      }
    } catch (err) {
      console.error('Failed to load deployment status:', err);
    }
  };

  const loadReadinessCheck = async () => {
    try {
      const response = await fetch('/api/v1/launch-preparation/launch/readiness-check', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setReadinessCheck(data);
      }
    } catch (err) {
      console.error('Failed to load readiness check:', err);
    }
  };

  const runLoadTest = async () => {
    if (!selectedScenario) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/launch-preparation/load-testing/run/${selectedScenario}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_url: targetUrl || undefined })
      });
      
      const data = await response.json();
      if (data.status === 'started') {
        setError(null);
        // Refresh results after a delay
        setTimeout(() => loadLoadTestResults(), 5000);
      }
    } catch (err) {
      setError('Failed to start load test');
    } finally {
      setLoading(false);
    }
  };

  const optimizePerformance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/launch-preparation/performance/optimize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.status === 'started') {
        setError(null);
        // Refresh metrics after a delay
        setTimeout(() => loadPerformanceMetrics(), 5000);
      }
    } catch (err) {
      setError('Failed to start performance optimization');
    } finally {
      setLoading(false);
    }
  };

  const runSecurityReview = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/launch-preparation/security/final-review', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.status === 'started') {
        setError(null);
        // Refresh security data after a delay
        setTimeout(() => loadSecurityData(), 10000);
      }
    } catch (err) {
      setError('Failed to start security review');
    } finally {
      setLoading(false);
    }
  };

  const createLaunchPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/launch-preparation/launch/create-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategy: selectedStrategy })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setLaunchPlan(data.plan);
        setCreatePlanDialog(false);
        setError(null);
      }
    } catch (err) {
      setError('Failed to create launch plan');
    } finally {
      setLoading(false);
    }
  };

  const executeLaunch = async () => {
    if (!launchPlan) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/v1/launch-preparation/launch/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategy: launchPlan.strategy })
      });
      
      const data = await response.json();
      if (data.status === 'started') {
        setExecuteLaunchDialog(false);
        setError(null);
        // Start monitoring deployment status
        setTimeout(() => loadDeploymentStatus(), 5000);
      }
    } catch (err) {
      setError('Failed to execute launch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (status) {
      case 'good':
      case 'pass':
      case 'completed':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
      case 'fail':
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'pass':
      case 'completed':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'critical':
      case 'fail':
      case 'error':
        return <Error color="error" />;
      default:
        return <Settings />;
    }
  };

  const renderReadinessOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <RocketLaunch sx={{ mr: 1 }} />
              <Typography variant="h6">Launch Readiness Overview</Typography>
              <Box ml="auto">
                <Tooltip title="Refresh">
                  <IconButton onClick={loadReadinessCheck} size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {readinessCheck && (
              <>
                <Box mb={3}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Typography variant="subtitle1">
                      Readiness Score: {readinessCheck.readiness_score.toFixed(1)}%
                    </Typography>
                    <Box ml={2}>
                      <Chip
                        label={readinessCheck.launch_ready ? 'READY' : 'NOT READY'}
                        color={readinessCheck.launch_ready ? 'success' : 'error'}
                        variant="filled"
                      />
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={readinessCheck.readiness_score}
                    color={readinessCheck.launch_ready ? 'success' : 'warning'}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                
                <Grid container spacing={2}>
                  {Object.entries(readinessCheck.checks).map(([check, passed]) => (
                    <Grid item xs={12} sm={6} md={3} key={check}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          {getStatusIcon(passed ? 'good' : 'critical')}
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            {check.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Chip
                            size="small"
                            label={passed ? 'PASS' : 'FAIL'}
                            color={passed ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderLoadTesting = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Run Load Test</Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Test Scenario</InputLabel>
              <Select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                label="Test Scenario"
              >
                {Object.entries(loadTestScenarios).map(([key, scenario]) => (
                  <MenuItem key={key} value={key}>
                    {scenario.name} ({scenario.concurrent_users} users)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Target URL (optional)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              margin="normal"
              placeholder="https://api.example.com"
            />
            
            <Button
              fullWidth
              variant="contained"
              onClick={runLoadTest}
              disabled={loading || !selectedScenario}
              startIcon={<PlayArrow />}
              sx={{ mt: 2 }}
            >
              Run Load Test
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Load Test Results</Typography>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Test</TableCell>
                    <TableCell align="right">RPS</TableCell>
                    <TableCell align="right">Avg Response</TableCell>
                    <TableCell align="right">P95</TableCell>
                    <TableCell align="right">Error Rate</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadTestResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.test_name}</TableCell>
                      <TableCell align="right">{result.requests_per_second.toFixed(1)}</TableCell>
                      <TableCell align="right">{result.avg_response_time.toFixed(0)}ms</TableCell>
                      <TableCell align="right">{result.p95_response_time.toFixed(0)}ms</TableCell>
                      <TableCell align="right">{result.error_rate.toFixed(1)}%</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={result.error_rate < 5 && result.p95_response_time < 2000 ? 'PASS' : 'FAIL'}
                          color={result.error_rate < 5 && result.p95_response_time < 2000 ? 'success' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPerformanceOptimization = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUp sx={{ mr: 1 }} />
              <Typography variant="h6">Performance Metrics</Typography>
              <Box ml="auto">
                <Button
                  variant="contained"
                  onClick={optimizePerformance}
                  disabled={loading}
                  startIcon={<Speed />}
                  size="small"
                >
                  Optimize
                </Button>
              </Box>
            </Box>
            
            {Object.entries(performanceMetrics).map(([key, metric]) => (
              <Box key={key} mb={2}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">{metric.name}</Typography>
                  <Box ml="auto">
                    <Chip
                      size="small"
                      label={metric.status.toUpperCase()}
                      color={getStatusColor(metric.status)}
                    />
                  </Box>
                </Box>
                <Box display="flex" alignItems="center">
                  <Typography variant="body2" color="textSecondary">
                    {metric.value.toFixed(1)}{metric.unit}
                  </Typography>
                  <Box ml={1} flexGrow={1}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((metric.value / metric.threshold) * 100, 100)}
                      color={getStatusColor(metric.status)}
                      sx={{ height: 4 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    /{metric.threshold}{metric.unit}
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Optimization History</Typography>
            
            {optimizationHistory.length === 0 ? (
              <Typography color="textSecondary">
                No optimizations have been run yet.
              </Typography>
            ) : (
              optimizationHistory.map((optimization, index) => (
                <Box key={index} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                  <Typography variant="subtitle2">
                    {new Date(optimization.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {optimization.applied_optimizations.join(', ')}
                  </Typography>
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSecurityReview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Security Review</Typography>
            
            <Button
              fullWidth
              variant="contained"
              onClick={runSecurityReview}
              disabled={loading}
              startIcon={<Shield />}
              sx={{ mb: 2 }}
            >
              Run Security Review
            </Button>
            
            {complianceStatus && (
              <Box>
                <Typography variant="subtitle2" mb={1}>Compliance Status</Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="body2">Security Score:</Typography>
                  <Box ml="auto">
                    <Typography variant="h6" color={complianceStatus.compliance_score >= 80 ? 'success.main' : 'error.main'}>
                      {complianceStatus.compliance_score.toFixed(1)}/100
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={complianceStatus.launch_ready ? 'LAUNCH READY' : 'NOT READY'}
                  color={complianceStatus.launch_ready ? 'success' : 'error'}
                  variant="filled"
                  sx={{ width: '100%' }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Security Check Results</Typography>
            
            {securityReviewResults.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Check</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityReviewResults[0]?.checks.map((check, index) => (
                      <TableRow key={index}>
                        <TableCell>{check.check_name}</TableCell>
                        <TableCell align="center">
                          {getStatusIcon(check.passed ? 'good' : 'critical')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={check.severity.toUpperCase()}
                            color={check.severity === 'critical' ? 'error' : check.severity === 'high' ? 'warning' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{check.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderLaunchPlanning = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Launch Planning</Typography>
            
            <Button
              fullWidth
              variant="contained"
              onClick={() => setCreatePlanDialog(true)}
              disabled={loading}
              startIcon={<Settings />}
              sx={{ mb: 2 }}
            >
              Create Launch Plan
            </Button>
            
            {launchPlan && (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                onClick={() => setExecuteLaunchDialog(true)}
                disabled={loading}
                startIcon={<Launch />}
              >
                Execute Launch
              </Button>
            )}
            
            {deploymentStatus && (
              <Box mt={2}>
                <Typography variant="subtitle2" mb={1}>Deployment Status</Typography>
                <Chip
                  label={deploymentStatus.current_deployment || 'No Active Deployment'}
                  color={deploymentStatus.current_deployment ? 'primary' : 'secondary'}
                  sx={{ width: '100%' }}
                />
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Success Rate: {deploymentStatus.success_rate?.toFixed(1) || 0}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Launch Plan Details</Typography>
            
            {launchPlan ? (
              <Box>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Strategy:</Typography>
                    <Typography variant="body2">{launchPlan.strategy}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Total Steps:</Typography>
                    <Typography variant="body2">{launchPlan.total_steps}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Estimated Duration:</Typography>
                    <Typography variant="body2">{launchPlan.estimated_total_duration} minutes</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Environment:</Typography>
                    <Typography variant="body2">{launchPlan.target_environment}</Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle2" mb={1}>Deployment Steps:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Step</TableCell>
                        <TableCell>Phase</TableCell>
                        <TableCell align="right">Duration</TableCell>
                        <TableCell align="center">Required</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {launchPlan.steps.map((step, index) => (
                        <TableRow key={index}>
                          <TableCell>{step.name}</TableCell>
                          <TableCell>{step.phase}</TableCell>
                          <TableCell align="right">{step.estimated_duration}m</TableCell>
                          <TableCell align="center">
                            {step.required ? <CheckCircle color="success" /> : <Settings />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography color="textSecondary">
                No launch plan created yet. Create a plan to get started.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Launch Preparation Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" icon={<Assessment />} />
          <Tab label="Load Testing" icon={<Speed />} />
          <Tab label="Performance" icon={<TrendingUp />} />
          <Tab label="Security" icon={<Shield />} />
          <Tab label="Launch Planning" icon={<Launch />} />
        </Tabs>
      </Box>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      {activeTab === 0 && renderReadinessOverview()}
      {activeTab === 1 && renderLoadTesting()}
      {activeTab === 2 && renderPerformanceOptimization()}
      {activeTab === 3 && renderSecurityReview()}
      {activeTab === 4 && renderLaunchPlanning()}
      
      {/* Create Launch Plan Dialog */}
      <Dialog open={createPlanDialog} onClose={() => setCreatePlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Launch Plan</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Deployment Strategy</InputLabel>
            <Select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              label="Deployment Strategy"
            >
              {Object.entries(deploymentStrategies).map(([key, strategy]) => (
                <MenuItem key={key} value={key}>
                  {strategy.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePlanDialog(false)}>Cancel</Button>
          <Button onClick={createLaunchPlan} variant="contained" disabled={loading}>
            Create Plan
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Execute Launch Dialog */}
      <Dialog open={executeLaunchDialog} onClose={() => setExecuteLaunchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Execute Launch</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will execute the production launch. Make sure all preparations are complete.
          </Alert>
          {launchPlan && (
            <Box>
              <Typography variant="subtitle2">Launch Plan: {launchPlan.launch_name}</Typography>
              <Typography variant="body2">Strategy: {launchPlan.strategy}</Typography>
              <Typography variant="body2">Steps: {launchPlan.total_steps}</Typography>
              <Typography variant="body2">Estimated Duration: {launchPlan.estimated_total_duration} minutes</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteLaunchDialog(false)}>Cancel</Button>
          <Button onClick={executeLaunch} variant="contained" color="secondary" disabled={loading}>
            Execute Launch
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LaunchPreparationDashboard; 