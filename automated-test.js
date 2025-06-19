/**
 * Automated Manufacturer Flow Test Script
 * Copy and paste this into your browser's console while on the application
 */

class ManufacturerTester {
    constructor() {
        this.results = {};
        console.log('🏭 Manufacturer Flow Automated Tester Initialized');
        console.log('📋 Available commands:');
        console.log('  - tester.runAllTests() - Run complete test suite');
        console.log('  - tester.testQuoteCreation() - Test quote creation only');
        console.log('  - tester.testNavigation() - Test navigation filtering');
        console.log('  - tester.showResults() - Show test results summary');
    }

    log(message, type = 'info') {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        console.log(`${icons[type]} ${message}`);
    }

    async wait(ms = 1000) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testNavigation() {
        this.log('Testing Navigation Role Filtering...', 'info');
        
        try {
            const manufacturerItems = ['Manufacturing', 'Portfolio', 'Supply Chain', 'Production', 'Quotes'];
            const foundItems = [];
            
            manufacturerItems.forEach(item => {
                const elements = Array.from(document.querySelectorAll('*'));
                const found = elements.some(el => 
                    el.textContent && 
                    el.textContent.includes(item) && 
                    (el.tagName === 'A' || el.closest('nav'))
                );
                if (found) foundItems.push(item);
            });

            const adminItems = ['Administration', 'User Management'];
            const hiddenAdminItems = adminItems.filter(item => {
                const elements = Array.from(document.querySelectorAll('*'));
                return !elements.some(el => 
                    el.textContent && 
                    el.textContent.includes(item) && 
                    getComputedStyle(el).display !== 'none'
                );
            });

            const passed = foundItems.length >= 3 && hiddenAdminItems.length >= 1;
            this.results.navigation = { 
                passed, 
                details: `Found: [${foundItems.join(', ')}], Hidden admin: ${hiddenAdminItems.length}` 
            };
            
            this.log(`Navigation Test: ${passed ? 'PASS' : 'FAIL'} - ${this.results.navigation.details}`, 
                     passed ? 'success' : 'error');
            return passed;
        } catch (error) {
            this.log(`Navigation Test Failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testQuoteCreation() {
        this.log('Testing Quote Creation (CRITICAL TEST)...', 'info');
        
        try {
            // First, navigate to quotes if not already there
            if (!window.location.href.includes('/quotes')) {
                this.log('Navigating to Quotes section...', 'info');
                const quotesNav = Array.from(document.querySelectorAll('*')).find(el => 
                    el.textContent && 
                    el.textContent.includes('Quotes') && 
                    (el.tagName === 'A' || el.onclick)
                );
                
                if (quotesNav) {
                    quotesNav.click();
                    await this.wait(2000);
                }
            }

            // Look for Create Quote button
            const createQuoteSelectors = [
                'a[href*="/quotes/create"]',
                'button:contains("Create Quote")',
                '*[href*="create"]'
            ];

            let createQuoteElement = null;
            let selectorUsed = '';

            // Try CSS selectors first
            for (const selector of createQuoteSelectors) {
                try {
                    createQuoteElement = document.querySelector(selector);
                    if (createQuoteElement) {
                        selectorUsed = selector;
                        break;
                    }
                } catch (e) {
                    // Selector might not be valid, continue
                }
            }

            // If not found, try text search
            if (!createQuoteElement) {
                const elements = Array.from(document.querySelectorAll('*'));
                createQuoteElement = elements.find(el => 
                    el.textContent && 
                    el.textContent.includes('Create Quote') && 
                    (el.tagName === 'BUTTON' || el.tagName === 'A')
                );
                if (createQuoteElement) selectorUsed = 'text search';
            }

            if (createQuoteElement) {
                this.log(`Found Create Quote element using: ${selectorUsed}`, 'success');
                
                const href = createQuoteElement.href || createQuoteElement.getAttribute('href');
                this.log(`Create Quote href: ${href}`, 'info');
                
                if (href && href.includes('/quotes/create')) {
                    this.log('Testing quote creation navigation...', 'info');
                    const currentURL = window.location.href;
                    
                    // Click and test navigation
                    createQuoteElement.click();
                    await this.wait(3000);
                    
                    const newURL = window.location.href;
                    this.log(`Navigation: ${currentURL} → ${newURL}`, 'info');
                    
                    if (newURL.includes('/quotes/create')) {
                        this.results.quoteCreation = { 
                            passed: true, 
                            details: 'Successfully navigated to quote creation page' 
                        };
                        this.log('Quote Creation Test: PASS - Route working correctly!', 'success');
                        return true;
                    } else if (newURL.includes('404') || newURL.includes('not-found')) {
                        this.results.quoteCreation = { 
                            passed: false, 
                            details: 'Navigation resulted in 404 error' 
                        };
                        this.log('Quote Creation Test: FAIL - 404 error', 'error');
                        return false;
                    } else {
                        this.results.quoteCreation = { 
                            passed: false, 
                            details: `Unexpected navigation to: ${newURL}` 
                        };
                        this.log(`Quote Creation Test: FAIL - Unexpected navigation`, 'error');
                        return false;
                    }
                } else {
                    this.results.quoteCreation = { 
                        passed: false, 
                        details: `Create Quote element found but href incorrect: ${href}` 
                    };
                    this.log('Quote Creation Test: FAIL - Incorrect href', 'error');
                    return false;
                }
            } else {
                this.results.quoteCreation = { 
                    passed: false, 
                    details: 'Create Quote button/link not found' 
                };
                this.log('Quote Creation Test: FAIL - Button not found', 'error');
                return false;
            }
        } catch (error) {
            this.results.quoteCreation = { 
                passed: false, 
                details: `Error: ${error.message}` 
            };
            this.log(`Quote Creation Test Failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testPredictiveAnalytics() {
        this.log('Testing Predictive Analytics...', 'info');
        
        try {
            const analyticsTerms = [
                'Predictive Analytics',
                'Overview',
                'Forecasts',
                'Risk Assessment',
                'Business Insights',
                'Model Performance'
            ];

            const foundTerms = analyticsTerms.filter(term => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements.some(el => el.textContent && el.textContent.includes(term));
            });

            const passed = foundTerms.length >= 3;
            this.results.predictiveAnalytics = { 
                passed, 
                details: `Found: [${foundTerms.join(', ')}]` 
            };
            
            this.log(`Predictive Analytics Test: ${passed ? 'PASS' : 'FAIL'} - ${this.results.predictiveAnalytics.details}`, 
                     passed ? 'success' : 'error');
            return passed;
        } catch (error) {
            this.log(`Predictive Analytics Test Failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testManufacturingHub() {
        this.log('Testing Manufacturing Hub...', 'info');
        
        try {
            // Check for infinite loading issues
            const loadingElements = Array.from(document.querySelectorAll('*'));
            const hasInfiniteLoading = loadingElements.some(el => 
                el.textContent && 
                (el.textContent.includes('Preparing your production dashboard') ||
                 el.textContent.includes('Loading...'))
            );

            const manufacturingElements = loadingElements.filter(el => 
                el.textContent && el.textContent.includes('Manufacturing')
            );

            const passed = !hasInfiniteLoading && manufacturingElements.length > 0;
            this.results.manufacturingHub = { 
                passed, 
                details: hasInfiniteLoading ? 'Has infinite loading issue' : 'Loads correctly' 
            };
            
            this.log(`Manufacturing Hub Test: ${passed ? 'PASS' : 'FAIL'} - ${this.results.manufacturingHub.details}`, 
                     passed ? 'success' : 'error');
            return passed;
        } catch (error) {
            this.log(`Manufacturing Hub Test Failed: ${error.message}`, 'error');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Starting Complete Manufacturer Flow Test Suite', 'info');
        this.log('═══════════════════════════════════════', 'info');
        
        const tests = [
            { name: 'Navigation Filtering', fn: this.testNavigation },
            { name: 'Quote Creation (CRITICAL)', fn: this.testQuoteCreation },
            { name: 'Predictive Analytics', fn: this.testPredictiveAnalytics },
            { name: 'Manufacturing Hub', fn: this.testManufacturingHub }
        ];

        for (const test of tests) {
            this.log(`\n🧪 Running ${test.name} test...`, 'info');
            await test.fn.call(this);
            await this.wait(1000);
        }

        this.showResults();
    }

    showResults() {
        const testResults = Object.values(this.results);
        const passedTests = testResults.filter(result => result.passed).length;
        const totalTests = testResults.length;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        this.log('\n═══════════════════════════════════════', 'info');
        this.log('🏆 TEST RESULTS SUMMARY', 'info');
        this.log('═══════════════════════════════════════', 'info');
        this.log(`📊 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`, 'info');
        this.log('\n📋 Detailed Results:', 'info');

        Object.entries(this.results).forEach(([test, result]) => {
            this.log(`   ${result.passed ? '✅' : '❌'} ${test}: ${result.details}`, 
                     result.passed ? 'success' : 'error');
        });

        if (successRate >= 80) {
            this.log('\n🎉 EXCELLENT! Manufacturer platform is working great!', 'success');
        } else if (successRate >= 60) {
            this.log('\n👍 GOOD! Most features working, some issues to address.', 'warning');
        } else {
            this.log('\n⚠️ NEEDS ATTENTION! Several critical issues found.', 'error');
        }

        this.log('═══════════════════════════════════════', 'info');
        return { successRate, results: this.results };
    }
}

// Initialize tester
const tester = new ManufacturerTester();

// Export for console use
window.manufacturerTester = tester;

console.log('🎯 To run tests, use:');
console.log('  manufacturerTester.runAllTests()');
console.log('  manufacturerTester.testQuoteCreation()'); 