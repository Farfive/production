/**
 * Custom test utilities for React Testing Library
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mock providers
interface MockAuthContextValue {
  user: any;
  login: jest.Mock;
  logout: jest.Mock;
  register: jest.Mock;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const MockAuthContext = React.createContext<MockAuthContextValue>({
  user: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  isAuthenticated: false,
  isLoading: false,
});

interface MockThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: jest.Mock;
}

const MockThemeContext = React.createContext<MockThemeContextValue>({
  theme: 'light',
  toggleTheme: jest.fn(),
});

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  company_name: 'Test Company',
  role: 'buyer',
  is_active: true,
  is_verified: true,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
  id: 1,
  title: 'Test Order',
  description: 'Test order description',
  quantity: 100,
  material: 'Steel',
  deadline: '2024-02-01T00:00:00Z',
  budget_min: 1000,
  budget_max: 5000,
  status: 'published',
  buyer_id: 1,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockQuote = (overrides = {}) => ({
  id: 1,
  order_id: 1,
  manufacturer_id: 2,
  price: 2500,
  delivery_time: 14,
  message: 'We can deliver this order',
  status: 'pending',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

// Custom providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode;
  authValue?: Partial<MockAuthContextValue>;
  themeValue?: Partial<MockThemeContextValue>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  authValue = {},
  themeValue = {},
  queryClient,
  initialEntries = ['/'],
}) => {
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const client = queryClient || defaultQueryClient;

  const defaultAuthValue: MockAuthContextValue = {
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
    ...authValue,
  };

  const defaultThemeValue: MockThemeContextValue = {
    theme: 'light',
    toggleTheme: jest.fn(),
    ...themeValue,
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={client}>
        <MockAuthContext.Provider value={defaultAuthValue}>
          <MockThemeContext.Provider value={defaultThemeValue}>
            {children}
          </MockThemeContext.Provider>
        </MockAuthContext.Provider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<MockAuthContextValue>;
  themeValue?: Partial<MockThemeContextValue>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const {
    authValue,
    themeValue,
    queryClient,
    initialEntries,
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders
      authValue={authValue}
      themeValue={themeValue}
      queryClient={queryClient}
      initialEntries={initialEntries}
    >
      {children}
    </AllTheProviders>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  const user = userEvent.setup();

  return {
    ...result,
    user,
  };
};

// Authenticated user render
export const renderWithAuth = (
  ui: ReactElement,
  user = createMockUser(),
  options: CustomRenderOptions = {}
) => {
  return customRender(ui, {
    ...options,
    authValue: {
      user,
      isAuthenticated: true,
      isLoading: false,
      ...options.authValue,
    },
  });
};

// Manufacturer user render
export const renderWithManufacturer = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const manufacturer = createMockUser({ role: 'manufacturer' });
  return renderWithAuth(ui, manufacturer, options);
};

// Loading state render
export const renderWithLoading = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return customRender(ui, {
    ...options,
    authValue: {
      isLoading: true,
      ...options.authValue,
    },
  });
};

// Dark theme render
export const renderWithDarkTheme = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return customRender(ui, {
    ...options,
    themeValue: {
      theme: 'dark',
      ...options.themeValue,
    },
  });
};

// Helper functions for common test scenarios
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
};

export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
};

// Form testing utilities
export const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formData: Record<string, string>
) => {
  for (const [field, value] of Object.entries(formData)) {
    const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement;
    if (input) {
      await user.clear(input);
      await user.type(input, value);
    }
  }
};

export const submitForm = async (
  user: ReturnType<typeof userEvent.setup>,
  formSelector = 'form'
) => {
  const form = document.querySelector(formSelector);
  if (form) {
    const submitButton = form.querySelector('[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      await user.click(submitButton);
    }
  }
};

// File upload testing utilities
export const createMockFile = (
  name = 'test.pdf',
  size = 1024,
  type = 'application/pdf'
) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const uploadFile = async (
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLInputElement,
  file: File
) => {
  await user.upload(input, file);
};

// Drag and drop testing utilities
export const simulateDragAndDrop = async (
  user: ReturnType<typeof userEvent.setup>,
  dragElement: HTMLElement,
  dropElement: HTMLElement
) => {
  await user.pointer([
    { keys: '[MouseLeft>]', target: dragElement },
    { coords: { x: 0, y: 0 }, target: dropElement },
    { keys: '[/MouseLeft]' },
  ]);
};

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};

// Performance testing utilities
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

// Mock API response utilities
export const createMockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

export const createMockApiError = (message = 'API Error', status = 500) => ({
  response: {
    data: { detail: message },
    status,
    statusText: 'Internal Server Error',
    headers: {},
    config: {},
  },
  message,
  isAxiosError: true,
});

// Local storage testing utilities
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get store() {
      return { ...store };
    },
  };
};

// Session storage testing utilities
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get store() {
      return { ...store };
    },
  };
};

// URL testing utilities
export const mockLocation = (url: string) => {
  const location = new URL(url);
  Object.defineProperty(window, 'location', {
    value: {
      ...location,
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
    writable: true,
  });
};

// Viewport testing utilities
export const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

// Media query testing utilities
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Export context providers for direct testing
export { MockAuthContext, MockThemeContext };

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
} 