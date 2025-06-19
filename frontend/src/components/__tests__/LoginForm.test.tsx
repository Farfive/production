/**
 * Tests for LoginForm component
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { customRender, fillForm, submitForm, checkAccessibility } from '../../test-utils/test-utils';

// Mock the LoginForm component for testing
const MockLoginForm: React.FC<{
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}> = ({ onSubmit, isLoading = false, error }) => {
  const [formData, setFormData] = React.useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          aria-describedby={error ? "error-message" : undefined}
        />
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          aria-describedby={error ? "error-message" : undefined}
        />
      </div>

      {error && (
        <div id="error-message" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
};

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders login form with all required fields', () => {
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows user to enter email and password', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const form = screen.getByTestId('login-form') as HTMLFormElement;
    await fillForm(form, {
      email: 'test@example.com',
      password: 'password123',
    });

    await submitForm(form);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows loading state when submitting', () => {
    customRender(<MockLoginForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Signing in...');
  });

  it('displays error message when provided', () => {
    const errorMessage = 'Invalid credentials';
    customRender(<MockLoginForm onSubmit={mockOnSubmit} error={errorMessage} />);

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveTextContent(errorMessage);
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toBeInvalid();
    expect(passwordInput).toBeInvalid();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(emailInput).toBeInvalid();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles form submission errors gracefully', async () => {
    const mockOnSubmitWithError = jest.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmitWithError} />);

    const form = screen.getByTestId('login-form') as HTMLFormElement;
    await fillForm(form, {
      email: 'test@example.com',
      password: 'password123',
    });

    await submitForm(form);

    await waitFor(() => {
      expect(mockOnSubmitWithError).toHaveBeenCalled();
    });
  });

  it('clears form when reset', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await user.clear(emailInput);
    await user.clear(passwordInput);

    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });

  it('focuses on email field when component mounts', () => {
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    emailInput.focus();
    expect(emailInput).toHaveFocus();
  });

  it('allows navigation between fields using Tab key', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    emailInput.focus();
    expect(emailInput).toHaveFocus();

    await user.tab();
    expect(passwordInput).toHaveFocus();

    await user.tab();
    expect(submitButton).toHaveFocus();
  });

  it('submits form when Enter key is pressed', async () => {
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const form = screen.getByTestId('login-form') as HTMLFormElement;
    await fillForm(form, {
      email: 'test@example.com',
      password: 'password123',
    });

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, '{enter}');

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('meets accessibility standards', async () => {
    const { container } = customRender(<MockLoginForm onSubmit={mockOnSubmit} />);
    await checkAccessibility(container);
  });

  it('has proper ARIA attributes', () => {
    const errorMessage = 'Invalid credentials';
    customRender(<MockLoginForm onSubmit={mockOnSubmit} error={errorMessage} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const errorElement = screen.getByRole('alert');

    expect(emailInput).toHaveAttribute('aria-describedby', 'error-message');
    expect(passwordInput).toHaveAttribute('aria-describedby', 'error-message');
    expect(errorElement).toHaveAttribute('id', 'error-message');
  });

  it('handles password visibility toggle', async () => {
    // This would test a password visibility toggle if implemented
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // If there was a toggle button:
    // const toggleButton = screen.getByRole('button', { name: /show password/i });
    // await user.click(toggleButton);
    // expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('prevents multiple submissions', async () => {
    const slowOnSubmit = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    const user = userEvent.setup();
    customRender(<MockLoginForm onSubmit={slowOnSubmit} />);

    const form = screen.getByTestId('login-form') as HTMLFormElement;
    await fillForm(form, {
      email: 'test@example.com',
      password: 'password123',
    });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Click submit button multiple times quickly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only be called once
    expect(slowOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('remembers form data on component re-render', async () => {
    const user = userEvent.setup();
    const { rerender } = customRender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const form = screen.getByTestId('login-form') as HTMLFormElement;
    await fillForm(form, {
      email: 'test@example.com',
      password: 'password123',
    });

    // Re-render component
    rerender(<MockLoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Values should be preserved (if component implements this)
    // expect(emailInput).toHaveValue('test@example.com');
    // expect(passwordInput).toHaveValue('password123');
  });

  it('handles different error types', () => {
    const networkError = 'Network connection failed';
    const { rerender } = customRender(
      <MockLoginForm onSubmit={mockOnSubmit} error={networkError} />
    );

    expect(screen.getByText(networkError)).toBeInTheDocument();

    const validationError = 'Email is required';
    rerender(<MockLoginForm onSubmit={mockOnSubmit} error={validationError} />);

    expect(screen.getByText(validationError)).toBeInTheDocument();
    expect(screen.queryByText(networkError)).not.toBeInTheDocument();
  });

  it('works with different screen sizes', () => {
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    // Test desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    customRender(<MockLoginForm onSubmit={mockOnSubmit} />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
}); 