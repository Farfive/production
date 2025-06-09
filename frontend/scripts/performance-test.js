#!/usr/bin/env node

/**
 * Comprehensive performance testing script
 * Measures Web Vitals, runs Lighthouse audits, and generates reports
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// Performance budgets
const PERFORMANCE_BUDGETS = {
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'first-input-delay': 100,
  'cumulative-layout-shift': 0.1,
  'speed-index': 3000,
  'interactive': 3800,
  'total-blocking-time': 300,
};

// Lighthouse configuration
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'first-input-delay',
      'cumulative-layout-shift',
      'speed-index',
      'interactive',
      'total-blocking-time',
      'server-response-time',
      'render-blocking-resources',
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'uses-optimized-images',
      'uses-webp-images',
      'uses-text-compression',
      'uses-responsive-images',
      'efficient-animated-content',
      'preload-lcp-image',
      'non-composited-animations',
      'unsized-images',
    ],
  },
};

class PerformanceTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './reports';
    this.runs = options.runs || 3;
    this.pages = options.pages || [
      '/',
      '/dashboard',
      '/orders',
      '/manufacturers',
      '/quotes',
    ];
  }

  async init() {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async runLighthouseAudit(url, options = {}) {
    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        ...options,
      }, LIGHTHOUSE_CONFIG);

      return result;
    } finally {
      await chrome.kill();
    }
  }

  async runPerformanceTest() {
    console.log('🚀 Starting performance testing...');
    
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      runs: this.runs,
      pages: {},
      summary: {},
    };

    for (const page of this.pages) {
      console.log(`\n📊 Testing page: ${page}`);
      
      const pageResults = {
        url: `${this.baseUrl}${page}`,
        runs: [],
        averages: {},
        budgetStatus: {},
      };

      // Run multiple tests for each page
      for (let run = 1; run <= this.runs; run++) {
        console.log(`  Run ${run}/${this.runs}...`);
        
        try {
          const result = await this.runLighthouseAudit(`${this.baseUrl}${page}`);
          const metrics = this.extractMetrics(result);
          
          pageResults.runs.push({
            run,
            metrics,
            score: result.lhr.categories.performance.score * 100,
          });
          
          console.log(`    Performance Score: ${(result.lhr.categories.performance.score * 100).toFixed(1)}`);
        } catch (error) {
          console.error(`    Error in run ${run}:`, error.message);
          pageResults.runs.push({
            run,
            error: error.message,
          });
        }
      }

      // Calculate averages
      const validRuns = pageResults.runs.filter(run => !run.error);
      if (validRuns.length > 0) {
        pageResults.averages = this.calculateAverages(validRuns);
        pageResults.budgetStatus = this.checkBudgets(pageResults.averages);
      }

      results.pages[page] = pageResults;
    }

    // Generate summary
    results.summary = this.generateSummary(results.pages);

    // Save results
    await this.saveResults(results);
    
    // Generate reports
    await this.generateReports(results);

    console.log('\n✅ Performance testing completed!');
    console.log(`📁 Reports saved to: ${this.outputDir}`);

    return results;
  }

  extractMetrics(lighthouseResult) {
    const audits = lighthouseResult.lhr.audits;
    
    return {
      'first-contentful-paint': audits['first-contentful-paint']?.numericValue || 0,
      'largest-contentful-paint': audits['largest-contentful-paint']?.numericValue || 0,
      'first-input-delay': audits['first-input-delay']?.numericValue || 0,
      'cumulative-layout-shift': audits['cumulative-layout-shift']?.numericValue || 0,
      'speed-index': audits['speed-index']?.numericValue || 0,
      'interactive': audits['interactive']?.numericValue || 0,
      'total-blocking-time': audits['total-blocking-time']?.numericValue || 0,
      'server-response-time': audits['server-response-time']?.numericValue || 0,
    };
  }

  calculateAverages(runs) {
    const metrics = {};
    const metricKeys = Object.keys(runs[0].metrics);

    for (const key of metricKeys) {
      const values = runs.map(run => run.metrics[key]).filter(val => val !== undefined);
      metrics[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    const scores = runs.map(run => run.score).filter(score => score !== undefined);
    metrics.performanceScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return metrics;
  }

  checkBudgets(averages) {
    const budgetStatus = {};

    for (const [metric, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
      const value = averages[metric];
      if (value !== undefined) {
        const passed = value <= budget;
        budgetStatus[metric] = {
          budget,
          actual: value,
          passed,
          difference: value - budget,
          percentageOver: passed ? 0 : ((value - budget) / budget) * 100,
        };
      }
    }

    return budgetStatus;
  }

  generateSummary(pages) {
    const summary = {
      totalPages: Object.keys(pages).length,
      passedBudgets: 0,
      failedBudgets: 0,
      averagePerformanceScore: 0,
      criticalIssues: [],
      recommendations: [],
    };

    let totalScore = 0;
    let pageCount = 0;

    for (const [pagePath, pageData] of Object.entries(pages)) {
      if (pageData.averages && pageData.averages.performanceScore) {
        totalScore += pageData.averages.performanceScore;
        pageCount++;
      }

      if (pageData.budgetStatus) {
        for (const [metric, status] of Object.entries(pageData.budgetStatus)) {
          if (status.passed) {
            summary.passedBudgets++;
          } else {
            summary.failedBudgets++;
            
            // Add critical issues
            if (status.percentageOver > 50) {
              summary.criticalIssues.push({
                page: pagePath,
                metric,
                budget: status.budget,
                actual: status.actual,
                percentageOver: status.percentageOver,
              });
            }
          }
        }
      }
    }

    summary.averagePerformanceScore = pageCount > 0 ? totalScore / pageCount : 0;

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(pages);

    return summary;
  }

  generateRecommendations(pages) {
    const recommendations = [];
    const commonIssues = {};

    for (const [pagePath, pageData] of Object.entries(pages)) {
      if (pageData.budgetStatus) {
        for (const [metric, status] of Object.entries(pageData.budgetStatus)) {
          if (!status.passed) {
            if (!commonIssues[metric]) {
              commonIssues[metric] = [];
            }
            commonIssues[metric].push(pagePath);
          }
        }
      }
    }

    // Generate recommendations based on common issues
    for (const [metric, affectedPages] of Object.entries(commonIssues)) {
      const recommendation = this.getRecommendationForMetric(metric, affectedPages);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  getRecommendationForMetric(metric, affectedPages) {
    const recommendations = {
      'first-contentful-paint': {
        title: 'Improve First Contentful Paint',
        description: 'Optimize server response time, eliminate render-blocking resources, and minimize critical resource size.',
        actions: [
          'Optimize server response time',
          'Eliminate render-blocking CSS and JavaScript',
          'Minimize critical resource size',
          'Use a CDN for static assets',
        ],
      },
      'largest-contentful-paint': {
        title: 'Improve Largest Contentful Paint',
        description: 'Optimize images, preload important resources, and improve server response time.',
        actions: [
          'Optimize and compress images',
          'Preload the LCP element',
          'Remove unused CSS and JavaScript',
          'Use modern image formats (WebP)',
        ],
      },
      'cumulative-layout-shift': {
        title: 'Reduce Cumulative Layout Shift',
        description: 'Ensure size attributes on images and videos, reserve space for ads, and avoid inserting content above existing content.',
        actions: [
          'Include size attributes on images and videos',
          'Reserve space for ads and embeds',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive images',
        ],
      },
      'total-blocking-time': {
        title: 'Reduce Total Blocking Time',
        description: 'Break up long tasks, optimize third-party code, and reduce JavaScript execution time.',
        actions: [
          'Break up long tasks',
          'Optimize third-party code',
          'Use code splitting and lazy loading',
          'Remove unused JavaScript',
        ],
      },
    };

    const recommendation = recommendations[metric];
    if (recommendation) {
      return {
        ...recommendation,
        metric,
        affectedPages,
        priority: affectedPages.length > 1 ? 'high' : 'medium',
      };
    }

    return null;
  }

  async saveResults(results) {
    const filePath = path.join(this.outputDir, 'performance-results.json');
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
  }

  async generateReports(results) {
    // Generate HTML report
    await this.generateHTMLReport(results);
    
    // Generate CSV report
    await this.generateCSVReport(results);
    
    // Generate markdown summary
    await this.generateMarkdownSummary(results);
  }

  async generateHTMLReport(results) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .page-results { margin-bottom: 30px; }
        .budget-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .budget-table th, .budget-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .budget-table th { background-color: #f2f2f2; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .recommendation { margin-bottom: 15px; padding: 15px; background: white; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p><strong>Generated:</strong> ${results.timestamp}</p>
        <p><strong>Base URL:</strong> ${results.baseUrl}</p>
        <p><strong>Test Runs:</strong> ${results.runs} per page</p>
    </div>

    <div class="summary">
        <div class="metric-card">
            <h3>Average Performance Score</h3>
            <div class="metric-value ${results.summary.averagePerformanceScore >= 90 ? 'passed' : 'failed'}">
                ${results.summary.averagePerformanceScore.toFixed(1)}
            </div>
        </div>
        <div class="metric-card">
            <h3>Passed Budgets</h3>
            <div class="metric-value passed">${results.summary.passedBudgets}</div>
        </div>
        <div class="metric-card">
            <h3>Failed Budgets</h3>
            <div class="metric-value failed">${results.summary.failedBudgets}</div>
        </div>
        <div class="metric-card">
            <h3>Critical Issues</h3>
            <div class="metric-value ${results.summary.criticalIssues.length === 0 ? 'passed' : 'failed'}">
                ${results.summary.criticalIssues.length}
            </div>
        </div>
    </div>

    ${Object.entries(results.pages).map(([page, data]) => `
        <div class="page-results">
            <h2>Page: ${page}</h2>
            ${data.averages ? `
                <p><strong>Average Performance Score:</strong> ${data.averages.performanceScore.toFixed(1)}</p>
                <table class="budget-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Budget</th>
                            <th>Actual</th>
                            <th>Status</th>
                            <th>Difference</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.budgetStatus).map(([metric, status]) => `
                            <tr>
                                <td>${metric}</td>
                                <td>${status.budget}</td>
                                <td>${status.actual.toFixed(2)}</td>
                                <td class="${status.passed ? 'passed' : 'failed'}">
                                    ${status.passed ? '✅ Pass' : '❌ Fail'}
                                </td>
                                <td>${status.difference.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p>No valid test results</p>'}
        </div>
    `).join('')}

    ${results.summary.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${results.summary.recommendations.map(rec => `
                <div class="recommendation">
                    <h3>${rec.title} (${rec.priority} priority)</h3>
                    <p>${rec.description}</p>
                    <p><strong>Affected pages:</strong> ${rec.affectedPages.join(', ')}</p>
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>
    `;

    const filePath = path.join(this.outputDir, 'performance-report.html');
    await fs.writeFile(filePath, html);
  }

  async generateCSVReport(results) {
    const csvRows = ['Page,Metric,Budget,Actual,Status,Difference'];

    for (const [page, data] of Object.entries(results.pages)) {
      if (data.budgetStatus) {
        for (const [metric, status] of Object.entries(data.budgetStatus)) {
          csvRows.push([
            page,
            metric,
            status.budget,
            status.actual.toFixed(2),
            status.passed ? 'Pass' : 'Fail',
            status.difference.toFixed(2),
          ].join(','));
        }
      }
    }

    const filePath = path.join(this.outputDir, 'performance-results.csv');
    await fs.writeFile(filePath, csvRows.join('\n'));
  }

  async generateMarkdownSummary(results) {
    const markdown = `
# Performance Test Summary

**Generated:** ${results.timestamp}  
**Base URL:** ${results.baseUrl}  
**Test Runs:** ${results.runs} per page

## Summary

- **Average Performance Score:** ${results.summary.averagePerformanceScore.toFixed(1)}
- **Passed Budgets:** ${results.summary.passedBudgets}
- **Failed Budgets:** ${results.summary.failedBudgets}
- **Critical Issues:** ${results.summary.criticalIssues.length}

## Page Results

${Object.entries(results.pages).map(([page, data]) => `
### ${page}

${data.averages ? `
**Performance Score:** ${data.averages.performanceScore.toFixed(1)}

| Metric | Budget | Actual | Status |
|--------|--------|--------|--------|
${Object.entries(data.budgetStatus).map(([metric, status]) => 
  `| ${metric} | ${status.budget} | ${status.actual.toFixed(2)} | ${status.passed ? '✅' : '❌'} |`
).join('\n')}
` : 'No valid test results'}
`).join('')}

${results.summary.recommendations.length > 0 ? `
## Recommendations

${results.summary.recommendations.map(rec => `
### ${rec.title} (${rec.priority} priority)

${rec.description}

**Affected pages:** ${rec.affectedPages.join(', ')}

**Actions:**
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('')}
` : ''}
    `;

    const filePath = path.join(this.outputDir, 'performance-summary.md');
    await fs.writeFile(filePath, markdown.trim());
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'runs') {
      options.runs = parseInt(value, 10);
    } else if (key === 'baseUrl') {
      options.baseUrl = value;
    } else if (key === 'outputDir') {
      options.outputDir = value;
    }
  }

  const tester = new PerformanceTester(options);
  
  tester.init()
    .then(() => tester.runPerformanceTest())
    .then((results) => {
      console.log('\n📊 Performance Test Summary:');
      console.log(`Average Performance Score: ${results.summary.averagePerformanceScore.toFixed(1)}`);
      console.log(`Passed Budgets: ${results.summary.passedBudgets}`);
      console.log(`Failed Budgets: ${results.summary.failedBudgets}`);
      console.log(`Critical Issues: ${results.summary.criticalIssues.length}`);
      
      // Exit with error code if there are critical issues
      process.exit(results.summary.criticalIssues.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester; 