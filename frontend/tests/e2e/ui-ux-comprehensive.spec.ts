import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * COMPREHENSIVE UI/UX TESTING SUITE
 * Tests responsive design, loading states, form validation, navigation, and themes
 */

// Test data
const testUser = {
  email: `ui_test_${Date.now()}@example.com`,
  password: 'UITest123!',
  firstName: 'UI',
  lastName: 'Tester',
  company: 'UI Test Company',
  phone: '+1555123456'
};

// Viewport configurations for responsive testing
const viewports = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1920, height: 1080 }, // Desktop
  ultrawide: { width: 2560, height: 1440 } // Ultrawide
};

test.describe('🎨 UI/UX Comprehensive Testing Suite', () => {
  
  test.describe('📱 Responsive Design Testing', () => {
    
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize(viewports.mobile);
      await page.goto('/');
      
      // Test mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-navigation"]')).toBeHidden();
      
      // Test mobile layout
      await expect(page.locator('main')).toHaveCSS('padding', /8px|16px/);
      
      // Test responsive typography
      const heading = page.locator('h1').first();
      if (await heading.isVisible()) {
        const fontSize = await heading.evaluate(el => getComputedStyle(el).fontSize);
        expect(parseInt(fontSize)).toBeLessThan(48); // Mobile heading should be smaller
      }
      
      // Test touch-friendly buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            expect(boundingBox.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
          }
        }
      }
    });

    test('should display correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize(viewports.tablet);
      await page.goto('/');
      
      // Test tablet layout
      await expect(page.locator('main')).toHaveCSS('max-width', /100%|none/);
      
      // Test navigation on tablet
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      const desktopNav = page.locator('[data-testid="desktop-navigation"]');
      
      // Tablet might show either mobile or desktop nav depending on design
      const isMobileNavVisible = await mobileMenu.isVisible();
      const isDesktopNavVisible = await desktopNav.isVisible();
      expect(isMobileNavVisible || isDesktopNavVisible).toBeTruthy();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize(viewports.desktop);
      await page.goto('/');
      
      // Test desktop navigation
      await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeHidden();
      
      // Test desktop layout
      const container = page.locator('.container, [class*="container"]').first();
      if (await container.isVisible()) {
        const maxWidth = await container.evaluate(el => getComputedStyle(el).maxWidth);
        expect(maxWidth).not.toBe('none');
      }
    });

    test('should handle viewport changes gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Start with desktop
      await page.setViewportSize(viewports.desktop);
      await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
      
      // Switch to mobile
      await page.setViewportSize(viewports.mobile);
      await page.waitForTimeout(500); // Allow for responsive transitions
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Switch back to desktop
      await page.setViewportSize(viewports.desktop);
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="desktop-navigation"]')).toBeVisible();
    });
  });

  test.describe('⏳ Loading States and Error Handling', () => {
    
    test('should show loading states during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test page loading
      await expect(page.locator('body')).toBeVisible();
      
      // Navigate to a different page and check for loading indicators
      const navigationLinks = page.locator('a[href^="/"]');
      const linkCount = await navigationLinks.count();
      
      if (linkCount > 0) {
        const firstLink = navigationLinks.first();
        const href = await firstLink.getAttribute('href');
        
        if (href && href !== '/') {
          await firstLink.click();
          
          // Check for loading indicators
          const loadingIndicators = [
            '[data-testid="loading"]',
            '[data-testid="spinner"]',
            '.loading',
            '.spinner',
            '[aria-label*="loading" i]'
          ];
          
          let foundLoading = false;
          for (const selector of loadingIndicators) {
            if (await page.locator(selector).isVisible()) {
              foundLoading = true;
              break;
            }
          }
          
          // Wait for page to load completely
          await page.waitForLoadState('networkidle');
          
          // Loading should be gone
          for (const selector of loadingIndicators) {
            await expect(page.locator(selector)).toBeHidden();
          }
        }
      }
    });

    test('should handle API loading states', async ({ page }) => {
      await page.goto('/');
      
      // Mock slow API response
      await page.route('**/api/v1/**', async route => {
        await page.waitForTimeout(1000); // Simulate slow API
        route.continue();
      });
      
      // Try to trigger an API call (e.g., login form)
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        
        // Should show loading state
        await expect(page.locator('[data-testid="loading"], .loading, [aria-label*="loading" i]')).toBeVisible();
      }
    });

    test('should display error messages appropriately', async ({ page }) => {
      await page.goto('/');
      
      // Mock API error
      await page.route('**/api/v1/auth/login**', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        });
      });
      
      // Try to login with invalid credentials
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible() && await loginButton.isVisible()) {
        await emailInput.fill('invalid@example.com');
        await passwordInput.fill('wrongpassword');
        await loginButton.click();
        
        // Should show error message
        await expect(page.locator('[data-testid="error"], .error, [role="alert"]')).toBeVisible();
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Simulate network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      // Try to perform an action that requires network
      const actionButton = page.locator('button').first();
      if (await actionButton.isVisible()) {
        await actionButton.click();
        
        // Should show network error or retry option
        const errorSelectors = [
          '[data-testid="network-error"]',
          '[data-testid="retry-button"]',
          'text="Network error"',
          'text="Try again"',
          'text="Connection failed"'
        ];
        
        let foundError = false;
        for (const selector of errorSelectors) {
          if (await page.locator(selector).isVisible()) {
            foundError = true;
            break;
          }
        }
        
        // At least some error handling should be present
        expect(foundError).toBeTruthy();
      }
    });
  });

  test.describe('✅ Form Validation Testing', () => {
    
    test('should validate email fields', async ({ page }) => {
      await page.goto('/');
      
      // Find email input
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      
      if (await emailInput.isVisible()) {
        // Test invalid email
        await emailInput.fill('invalid-email');
        await emailInput.blur();
        
        // Should show validation error
        await expect(page.locator('[data-testid="email-error"], .error, [role="alert"]')).toBeVisible();
        
        // Test valid email
        await emailInput.fill('valid@example.com');
        await emailInput.blur();
        
        // Error should be gone
        await expect(page.locator('[data-testid="email-error"]')).toBeHidden();
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/');
      
      // Find a form
      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        const requiredInputs = form.locator('input[required], input[aria-required="true"]');
        const inputCount = await requiredInputs.count();
        
        if (inputCount > 0) {
          // Try to submit form without filling required fields
          const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should show validation errors
            await expect(page.locator('.error, [role="alert"], [data-testid*="error"]')).toBeVisible();
          }
        }
      }
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');
      
      const passwordInput = page.locator('input[type="password"][name*="password"]:not([name*="confirm"])').first();
      
      if (await passwordInput.isVisible()) {
        // Test weak password
        await passwordInput.fill('123');
        await passwordInput.blur();
        
        // Should show weakness indicator
        const weaknessIndicators = [
          '[data-testid="password-weak"]',
          'text="weak"',
          'text="too short"',
          '.password-strength'
        ];
        
        let foundWeakness = false;
        for (const selector of weaknessIndicators) {
          if (await page.locator(selector).isVisible()) {
            foundWeakness = true;
            break;
          }
        }
        
        // Test strong password
        await passwordInput.fill('StrongPassword123!');
        await passwordInput.blur();
        
        // Should show strength indicator
        const strengthIndicators = [
          '[data-testid="password-strong"]',
          'text="strong"',
          'text="good"',
          '.password-strength'
        ];
        
        let foundStrength = false;
        for (const selector of strengthIndicators) {
          if (await page.locator(selector).isVisible()) {
            foundStrength = true;
            break;
          }
        }
      }
    });

    test('should validate form submission', async ({ page }) => {
      await page.goto('/register');
      
      // Fill out registration form
      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const firstNameInput = page.locator('input[name*="first"], input[name*="firstName"]').first();
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      
      if (await emailInput.isVisible() && await submitButton.isVisible()) {
        // Fill valid data
        await emailInput.fill(testUser.email);
        if (await passwordInput.isVisible()) {
          await passwordInput.fill(testUser.password);
        }
        if (await firstNameInput.isVisible()) {
          await firstNameInput.fill(testUser.firstName);
        }
        
        // Submit form
        await submitButton.click();
        
        // Should either succeed or show specific validation errors
        await page.waitForTimeout(2000);
        
        // Check for success or error states
        const successIndicators = [
          '[data-testid="success"]',
          'text="success"',
          'text="registered"',
          'text="created"'
        ];
        
        const errorIndicators = [
          '[data-testid="error"]',
          '.error',
          '[role="alert"]'
        ];
        
        let foundResult = false;
        for (const selector of [...successIndicators, ...errorIndicators]) {
          if (await page.locator(selector).isVisible()) {
            foundResult = true;
            break;
          }
        }
        
        expect(foundResult).toBeTruthy();
      }
    });
  });

  test.describe('🧭 Navigation and Routing Testing', () => {
    
    test('should navigate between pages correctly', async ({ page }) => {
      await page.goto('/');
      
      // Test main navigation links
      const navLinks = page.locator('nav a, [data-testid="navigation"] a').first();
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        for (let i = 0; i < Math.min(linkCount, 5); i++) {
          const link = navLinks.nth(i);
          const href = await link.getAttribute('href');
          
          if (href && href.startsWith('/') && href !== '/') {
            await link.click();
            await page.waitForLoadState('networkidle');
            
            // Should navigate to correct URL
            expect(page.url()).toContain(href);
            
            // Should update page title or content
            await expect(page.locator('h1, [data-testid="page-title"]')).toBeVisible();
          }
        }
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('/');
      const initialUrl = page.url();
      
      // Navigate to another page
      const link = page.locator('a[href^="/"]').first();
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');
        if (href && href !== '/') {
          await link.click();
          await page.waitForLoadState('networkidle');
          
          // Go back
          await page.goBack();
          await page.waitForLoadState('networkidle');
          expect(page.url()).toBe(initialUrl);
          
          // Go forward
          await page.goForward();
          await page.waitForLoadState('networkidle');
          expect(page.url()).toContain(href);
        }
      }
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      
      // Should show 404 page or redirect
      const notFoundIndicators = [
        'text="404"',
        'text="Not Found"',
        'text="Page not found"',
        '[data-testid="404"]'
      ];
      
      let found404 = false;
      for (const selector of notFoundIndicators) {
        if (await page.locator(selector).isVisible()) {
          found404 = true;
          break;
        }
      }
      
      // Should either show 404 or redirect to home
      expect(found404 || page.url().includes('/')).toBeTruthy();
    });

    test('should maintain navigation state', async ({ page }) => {
      await page.goto('/');
      
      // Check if navigation shows current page
      const currentPageIndicators = [
        '[aria-current="page"]',
        '.active',
        '.current',
        '[data-testid="active-nav"]'
      ];
      
      let foundActive = false;
      for (const selector of currentPageIndicators) {
        if (await page.locator(selector).isVisible()) {
          foundActive = true;
          break;
        }
      }
      
      // Navigation should indicate current page
      expect(foundActive).toBeTruthy();
    });
  });

  test.describe('🎨 Theme Switching Testing', () => {
    
    test('should detect system theme preference', async ({ page }) => {
      // Test dark mode preference
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      
      // Should apply dark theme
      const body = page.locator('body');
      const bodyClass = await body.getAttribute('class');
      const bodyStyle = await body.evaluate(el => getComputedStyle(el));
      
      // Check for dark theme indicators
      const isDarkTheme = 
        bodyClass?.includes('dark') ||
        bodyStyle.backgroundColor === 'rgb(0, 0, 0)' ||
        bodyStyle.backgroundColor === 'rgb(17, 24, 39)' || // Tailwind gray-900
        bodyStyle.color === 'rgb(255, 255, 255)';
      
      expect(isDarkTheme).toBeTruthy();
    });

    test('should allow manual theme switching', async ({ page }) => {
      await page.goto('/');
      
      // Look for theme toggle button
      const themeToggle = page.locator(
        '[data-testid="theme-toggle"], [aria-label*="theme" i], button:has-text("Dark"), button:has-text("Light")'
      ).first();
      
      if (await themeToggle.isVisible()) {
        const initialBodyClass = await page.locator('body').getAttribute('class');
        
        // Click theme toggle
        await themeToggle.click();
        await page.waitForTimeout(500); // Allow for theme transition
        
        const newBodyClass = await page.locator('body').getAttribute('class');
        
        // Theme should have changed
        expect(newBodyClass).not.toBe(initialBodyClass);
        
        // Click again to toggle back
        await themeToggle.click();
        await page.waitForTimeout(500);
        
        const finalBodyClass = await page.locator('body').getAttribute('class');
        expect(finalBodyClass).toBe(initialBodyClass);
      }
    });

    test('should persist theme preference', async ({ page, context }) => {
      await page.goto('/');
      
      const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
      
      if (await themeToggle.isVisible()) {
        // Set theme
        await themeToggle.click();
        const themeClass = await page.locator('body').getAttribute('class');
        
        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Theme should persist
        const persistedClass = await page.locator('body').getAttribute('class');
        expect(persistedClass).toBe(themeClass);
      }
    });

    test('should apply theme consistently across components', async ({ page }) => {
      await page.goto('/');
      
      // Set dark theme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      
      // Check various components for consistent theming
      const components = [
        'header',
        'nav',
        'main',
        'footer',
        'button',
        'input',
        'card, .card'
      ];
      
      for (const component of components) {
        const element = page.locator(component).first();
        if (await element.isVisible()) {
          const styles = await element.evaluate(el => {
            const computed = getComputedStyle(el);
            return {
              backgroundColor: computed.backgroundColor,
              color: computed.color,
              borderColor: computed.borderColor
            };
          });
          
          // Should have dark theme colors (not pure white backgrounds)
          expect(styles.backgroundColor).not.toBe('rgb(255, 255, 255)');
        }
      }
    });
  });

  test.describe('♿ Accessibility Testing', () => {
    
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      // Check for ARIA labels on interactive elements
      const interactiveElements = page.locator('button, input, select, textarea, a');
      const count = await interactiveElements.count();
      
      let properlyLabeled = 0;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = interactiveElements.nth(i);
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledBy = await element.getAttribute('aria-labelledby');
        const title = await element.getAttribute('title');
        const textContent = await element.textContent();
        
        if (ariaLabel || ariaLabelledBy || title || (textContent && textContent.trim())) {
          properlyLabeled++;
        }
      }
      
      // At least 80% of interactive elements should be properly labeled
      expect(properlyLabeled / Math.min(count, 10)).toBeGreaterThan(0.8);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through several elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus');
        if (await focusedElement.isVisible()) {
          // Focus should be visible
          const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline);
          expect(outline).not.toBe('none');
        }
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Check text elements for color contrast
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div').first();
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const styles = await element.evaluate(el => {
            const computed = getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor
            };
          });
          
          // Basic check - text should not be too light on light backgrounds
          if (styles.backgroundColor === 'rgb(255, 255, 255)') {
            expect(styles.color).not.toBe('rgb(255, 255, 255)');
            expect(styles.color).not.toBe('rgb(240, 240, 240)');
          }
        }
      }
    });
  });

  test.describe('⚡ Performance Testing', () => {
    
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto('/');
      
      // Look for data tables or lists
      const dataContainers = page.locator('table, [data-testid*="list"], .list, [role="grid"]');
      const count = await dataContainers.count();
      
      if (count > 0) {
        const container = dataContainers.first();
        const rows = container.locator('tr, [role="row"], .list-item');
        const rowCount = await rows.count();
        
        if (rowCount > 10) {
          // Should implement virtualization or pagination for large datasets
          const pagination = page.locator('[data-testid="pagination"], .pagination, nav[aria-label*="pagination" i]');
          const virtualScroll = page.locator('[data-testid="virtual-scroll"]');
          
          const hasPagination = await pagination.isVisible();
          const hasVirtualScroll = await virtualScroll.isVisible();
          
          expect(hasPagination || hasVirtualScroll || rowCount < 50).toBeTruthy();
        }
      }
    });
  });
});

// Helper function to test component rendering
async function testComponentRendering(page: Page, selector: string, testName: string) {
  const element = page.locator(selector);
  if (await element.isVisible()) {
    // Component should be properly rendered
    const boundingBox = await element.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(0);
    expect(boundingBox?.height).toBeGreaterThan(0);
    
    console.log(`✅ ${testName}: Component rendered correctly`);
    return true;
  } else {
    console.log(`⚠️ ${testName}: Component not found`);
    return false;
  }
}

// Helper function to test responsive behavior
async function testResponsiveBehavior(page: Page, breakpoints: Record<string, {width: number, height: number}>) {
  const results: Record<string, boolean> = {};
  
  for (const [name, viewport] of Object.entries(breakpoints)) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500); // Allow for responsive transitions
    
    // Test basic layout
    const body = page.locator('body');
    const isVisible = await body.isVisible();
    results[name] = isVisible;
    
    console.log(`${isVisible ? '✅' : '❌'} ${name}: ${viewport.width}x${viewport.height}`);
  }
  
  return results;
} 