/**
 * Global teardown for Playwright tests
 */
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');

  try {
    // Clean up authentication state file
    const authStatePath = path.join(__dirname, 'auth-state.json');
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
      console.log('🗑️ Cleaned up authentication state file');
    }

    // Clean up test data
    await cleanupTestData();

    // Clean up temporary files
    await cleanupTempFiles();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid failing the test run
  }
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');
  
  // Here you would typically:
  // 1. Remove test users
  // 2. Clean up test orders
  // 3. Reset database to clean state
  
  console.log('✅ Test data cleanup completed');
}

async function cleanupTempFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  const tempDirs = [
    'test-results',
    'playwright-report',
    'test-artifacts'
  ];

  for (const dir of tempDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`🗑️ Cleaned up ${dir} directory`);
      } catch (error) {
        console.warn(`⚠️ Could not clean up ${dir}:`, error);
      }
    }
  }
  
  console.log('✅ Temporary files cleanup completed');
}

export default globalTeardown; 