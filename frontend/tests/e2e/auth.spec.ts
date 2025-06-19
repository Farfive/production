/**
 * E2E tests for authentication flow
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page).toHaveTitle(/login/i);
    await expect(page.locator('h1')).toContainText(/sign in/i);
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    await expect(page.locator('[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in credentials
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
    await expect(page).toHaveURL(/.*login/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit without filling fields
    await page.click('[type="submit"]');
    
    // Should show validation errors
    const emailInput = page.locator('[name="email"]');
    const passwordInput = page.locator('[name="password"]');
    
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'NewPassword123!');
    await page.fill('[name="confirmPassword"]', 'NewPassword123!');
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="companyName"]', 'Test Company');
    await page.selectOption('[name="role"]', 'buyer');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Should redirect to verification page or dashboard
    await expect(page).toHaveURL(/.*verify|.*dashboard/);
  });

  test('should logout user', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Fill email
    await page.fill('[name="email"]', 'test@example.com');
    
    // Submit form
    await page.click('[type="submit"]');
    
    // Should show success message
    await expect(page.locator('[role="alert"]')).toContainText(/email sent/i);
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Create new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // Should still be authenticated
    await expect(newPage).toHaveURL(/.*dashboard/);
    await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    // Mock expired token
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired_token');
    });
    
    // Try to access protected resource
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept login request and return network error
    await page.route('**/api/v1/auth/login', route => {
      route.abort('failed');
    });
    
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('[role="alert"]')).toContainText(/network error|connection failed/i);
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');
    
    // Check mobile-specific elements
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="password"]')).toBeVisible();
    
    // Test mobile interaction
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.tap('[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[name="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[type="submit"]')).toBeFocused();
    
    // Submit with Enter key
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.keyboard.press('Enter');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should meet accessibility standards', async ({ page }) => {
    await page.goto('/login');
    
    // Check for proper ARIA labels
    await expect(page.locator('[name="email"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[name="password"]')).toHaveAttribute('aria-label');
    
    // Check for proper heading structure
    await expect(page.locator('h1')).toBeVisible();
    
    // Check color contrast (would need axe-core for full testing)
    const backgroundColor = await page.locator('body').evaluate(el => 
      getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBeTruthy();
  });

  test('should handle rate limiting', async ({ page }) => {
    await page.goto('/login');
    
    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('[type="submit"]');
      
      if (i < 5) {
        await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
      }
    }
    
    // Should show rate limit message
    await expect(page.locator('[role="alert"]')).toContainText(/too many attempts|rate limit/i);
  });

  test('should handle different user roles', async ({ page }) => {
    // Test buyer login
    await page.goto('/login');
    await page.fill('[name="email"]', 'buyer@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="buyer-dashboard"]')).toBeVisible();
    
    // Logout and test manufacturer login
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.goto('/login');
    await page.fill('[name="email"]', 'manufacturer@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="manufacturer-dashboard"]')).toBeVisible();
  });
}); 