#!/usr/bin/env node
/**
 * Frontend setup and dependency test script
 */

const fs = require('fs');
const path = require('path');

function testBasicSetup() {
    console.log('📋 Testing Basic Setup...');
    
    try {
        // Check if package.json exists
        const packagePath = path.join(__dirname, 'package.json');
        if (!fs.existsSync(packagePath)) {
            console.log('❌ package.json not found');
            return false;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log(`✅ Project: ${packageJson.name}`);
        console.log(`✅ Version: ${packageJson.version}`);
        
        // Check if node_modules exists
        const nodeModulesPath = path.join(__dirname, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('⚠️  node_modules not found - run npm install');
            return false;
        }
        console.log('✅ node_modules directory exists');
        
        return true;
    } catch (error) {
        console.log(`❌ Basic setup failed: ${error.message}`);
        return false;
    }
}

function testDependencies() {
    console.log('\n📋 Testing Dependencies...');
    
    const requiredDeps = [
        'react',
        'react-dom',
        'webpack',
        'webpack-bundle-analyzer',
        'workbox-webpack-plugin',
        'web-vitals',
        '@sentry/react',
        'perfume.js'
    ];
    
    let allFound = true;
    
    for (const dep of requiredDeps) {
        try {
            require.resolve(dep);
            console.log(`✅ ${dep} - available`);
        } catch (error) {
            console.log(`❌ ${dep} - missing`);
            allFound = false;
        }
    }
    
    return allFound;
}

function testFileStructure() {
    console.log('\n📋 Testing File Structure...');
    
    const requiredFiles = [
        'src/utils/performance.ts',
        'src/components/LazyImage.tsx',
        'public/sw.js',
        'webpack.config.js',
        'scripts/performance-test.js'
    ];
    
    let allFound = true;
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} - exists`);
        } else {
            console.log(`❌ ${file} - missing`);
            allFound = false;
        }
    }
    
    return allFound;
}

function testPerformanceConfig() {
    console.log('\n📋 Testing Performance Configuration...');
    
    try {
        // Check webpack config
        const webpackPath = path.join(__dirname, 'webpack.config.js');
        if (fs.existsSync(webpackPath)) {
            const webpackContent = fs.readFileSync(webpackPath, 'utf8');
            
            const checks = [
                { name: 'Code Splitting', pattern: /splitChunks/ },
                { name: 'Bundle Analysis', pattern: /BundleAnalyzerPlugin/ },
                { name: 'Service Worker', pattern: /WorkboxPlugin/ },
                { name: 'Performance Budgets', pattern: /performance.*budgets/ }
            ];
            
            let allConfigured = true;
            for (const check of checks) {
                if (check.pattern.test(webpackContent)) {
                    console.log(`✅ ${check.name} - configured`);
                } else {
                    console.log(`❌ ${check.name} - not configured`);
                    allConfigured = false;
                }
            }
            
            return allConfigured;
        } else {
            console.log('❌ webpack.config.js not found');
            return false;
        }
    } catch (error) {
        console.log(`❌ Performance config test failed: ${error.message}`);
        return false;
    }
}

function testServiceWorker() {
    console.log('\n📋 Testing Service Worker...');
    
    try {
        const swPath = path.join(__dirname, 'public/sw.js');
        if (fs.existsSync(swPath)) {
            const swContent = fs.readFileSync(swPath, 'utf8');
            
            const features = [
                { name: 'Cache Strategies', pattern: /cache.*strategy/i },
                { name: 'Offline Support', pattern: /offline/i },
                { name: 'Background Sync', pattern: /background.*sync/i },
                { name: 'Performance Tracking', pattern: /performance/i }
            ];
            
            let featuresFound = 0;
            for (const feature of features) {
                if (feature.pattern.test(swContent)) {
                    console.log(`✅ ${feature.name} - implemented`);
                    featuresFound++;
                } else {
                    console.log(`⚠️  ${feature.name} - not found`);
                }
            }
            
            return featuresFound >= 2; // At least 2 features should be present
        } else {
            console.log('❌ Service worker not found');
            return false;
        }
    } catch (error) {
        console.log(`❌ Service worker test failed: ${error.message}`);
        return false;
    }
}

function main() {
    console.log('🧪 Testing Frontend Performance Setup');
    console.log('=' * 50);
    
    const tests = [
        { name: 'Basic Setup', func: testBasicSetup },
        { name: 'Dependencies', func: testDependencies },
        { name: 'File Structure', func: testFileStructure },
        { name: 'Performance Config', func: testPerformanceConfig },
        { name: 'Service Worker', func: testServiceWorker }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            const result = test.func();
            results.push({ name: test.name, passed: result });
        } catch (error) {
            console.log(`❌ ${test.name} crashed: ${error.message}`);
            results.push({ name: test.name, passed: false });
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary:');
    console.log('='.repeat(50));
    
    let passed = 0;
    for (const result of results) {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${result.name}`);
        if (result.passed) passed++;
    }
    
    console.log(`\n🎯 Overall: ${passed}/${results.length} tests passed`);
    
    if (passed === results.length) {
        console.log('🎉 All tests passed! Frontend is ready for performance optimization.');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Please fix the issues before proceeding.');
        console.log('\n💡 Next steps:');
        console.log('1. Run: npm install');
        console.log('2. Check missing files and configurations');
        console.log('3. Re-run this test script');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 