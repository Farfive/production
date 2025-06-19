/**
 * Global setup for Playwright tests
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    console.log(`📡 Checking if application is ready at ${baseURL}`);
    
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Verify the app is loaded
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is ready');

    // Setup test data if needed
    await setupTestData(page);

    // Create authenticated user session for tests that need it
    await createAuthenticatedSession(page, baseURL);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  // Here you would typically:
  // 1. Clear existing test data
  // 2. Seed the database with test data
  // 3. Create test users, orders, etc.
  
  // For now, we'll just log that we're setting up data
  console.log('✅ Test data setup completed');
}

async function createAuthenticatedSession(page: any, baseURL: string) {
  console.log('🔐 Creating authenticated session...');
  
  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Fill in test credentials
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    
    // Submit login form
    await page.click('[type="submit"]');
    
    // Wait for successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Save authentication state
    await page.context().storageState({ path: 'tests/e2e/auth-state.json' });
    
    console.log('✅ Authenticated session created and saved');
  } catch (error) {
    console.warn('⚠️ Could not create authenticated session:', error);
    // Don't fail the setup if authentication fails
    // Some tests might not require authentication
  }
}

export default globalSetup; 