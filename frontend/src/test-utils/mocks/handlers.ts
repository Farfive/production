/**
 * MSW request handlers for API mocking
 */
import { rest } from 'msw';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Mock data generators
const generateUser = (overrides = {}) => ({
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

const generateOrder = (overrides = {}) => ({
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

const generateQuote = (overrides = {}) => ({
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

const generatePayment = (overrides = {}) => ({
  id: 1,
  order_id: 1,
  quote_id: 1,
  amount: 2500,
  currency: 'USD',
  status: 'succeeded',
  stripe_payment_intent_id: 'pi_test123',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const handlers = [
  // Authentication endpoints
  rest.post(`${API_BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json(generateUser())
    );
  }),

  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock_access_token',
        token_type: 'bearer',
        expires_in: 3600,
      })
    );
  }),

  rest.get(`${API_BASE_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({ detail: 'Not authenticated' })
      );
    }

    return res(
      ctx.status(200),
      ctx.json(generateUser())
    );
  }),

  rest.post(`${API_BASE_URL}/auth/refresh`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'new_mock_access_token',
        token_type: 'bearer',
        expires_in: 3600,
      })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Successfully logged out' })
    );
  }),

  rest.put(`${API_BASE_URL}/auth/change-password`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Password changed successfully' })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/forgot-password`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Password reset email sent' })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/reset-password`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Password reset successfully' })
    );
  }),

  // User endpoints
  rest.get(`${API_BASE_URL}/users/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(generateUser())
    );
  }),

  rest.put(`${API_BASE_URL}/users/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(generateUser())
    );
  }),

  // Order endpoints
  rest.get(`${API_BASE_URL}/orders`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';
    
    const orders = Array.from({ length: parseInt(limit) }, (_, i) => 
      generateOrder({ id: i + 1 + (parseInt(page) - 1) * parseInt(limit) })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: orders,
        total: 100,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: 10,
      })
    );
  }),

  rest.get(`${API_BASE_URL}/orders/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateOrder({ id: parseInt(id as string) }))
    );
  }),

  rest.post(`${API_BASE_URL}/orders`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json(generateOrder())
    );
  }),

  rest.put(`${API_BASE_URL}/orders/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateOrder({ id: parseInt(id as string) }))
    );
  }),

  rest.delete(`${API_BASE_URL}/orders/:id`, (req, res, ctx) => {
    return res(
      ctx.status(204)
    );
  }),

  rest.get(`${API_BASE_URL}/orders/my-orders`, (req, res, ctx) => {
    const orders = Array.from({ length: 5 }, (_, i) => 
      generateOrder({ id: i + 1, buyer_id: 1 })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: orders,
        total: 5,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  // Quote endpoints
  rest.get(`${API_BASE_URL}/quotes`, (req, res, ctx) => {
    const quotes = Array.from({ length: 5 }, (_, i) => 
      generateQuote({ id: i + 1 })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: quotes,
        total: 5,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  rest.get(`${API_BASE_URL}/quotes/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateQuote({ id: parseInt(id as string) }))
    );
  }),

  rest.post(`${API_BASE_URL}/quotes`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json(generateQuote())
    );
  }),

  rest.put(`${API_BASE_URL}/quotes/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateQuote({ id: parseInt(id as string) }))
    );
  }),

  rest.post(`${API_BASE_URL}/quotes/:id/accept`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateQuote({ id: parseInt(id as string), status: 'accepted' }))
    );
  }),

  rest.post(`${API_BASE_URL}/quotes/:id/reject`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateQuote({ id: parseInt(id as string), status: 'rejected' }))
    );
  }),

  // Payment endpoints
  rest.post(`${API_BASE_URL}/payments/create-intent`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        client_secret: 'pi_test123_secret_test',
        payment_intent_id: 'pi_test123',
      })
    );
  }),

  rest.post(`${API_BASE_URL}/payments/confirm`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(generatePayment())
    );
  }),

  rest.get(`${API_BASE_URL}/payments/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generatePayment({ id: parseInt(id as string) }))
    );
  }),

  rest.get(`${API_BASE_URL}/payments/history`, (req, res, ctx) => {
    const payments = Array.from({ length: 5 }, (_, i) => 
      generatePayment({ id: i + 1 })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: payments,
        total: 5,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  // Manufacturer/Producer endpoints
  rest.get(`${API_BASE_URL}/manufacturers`, (req, res, ctx) => {
    const manufacturers = Array.from({ length: 5 }, (_, i) => 
      generateUser({ 
        id: i + 1, 
        role: 'manufacturer',
        company_name: `Manufacturer ${i + 1}`,
      })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: manufacturers,
        total: 5,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  rest.get(`${API_BASE_URL}/manufacturers/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json(generateUser({ 
        id: parseInt(id as string), 
        role: 'manufacturer' 
      }))
    );
  }),

  // Search endpoints
  rest.get(`${API_BASE_URL}/search/orders`, (req, res, ctx) => {
    const query = req.url.searchParams.get('q') || '';
    const orders = Array.from({ length: 3 }, (_, i) => 
      generateOrder({ 
        id: i + 1, 
        title: `${query} Order ${i + 1}` 
      })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: orders,
        total: 3,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  rest.get(`${API_BASE_URL}/search/manufacturers`, (req, res, ctx) => {
    const query = req.url.searchParams.get('q') || '';
    const manufacturers = Array.from({ length: 3 }, (_, i) => 
      generateUser({ 
        id: i + 1, 
        role: 'manufacturer',
        company_name: `${query} Manufacturer ${i + 1}`,
      })
    );

    return res(
      ctx.status(200),
      ctx.json({
        items: manufacturers,
        total: 3,
        page: 1,
        limit: 10,
        pages: 1,
      })
    );
  }),

  // File upload endpoints
  rest.post(`${API_BASE_URL}/upload`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        url: 'https://example.com/uploaded-file.pdf',
        filename: 'uploaded-file.pdf',
        size: 1024000,
      })
    );
  }),

  // Notification endpoints
  rest.get(`${API_BASE_URL}/notifications`, (req, res, ctx) => {
    const notifications = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Notification ${i + 1}`,
      message: `This is notification message ${i + 1}`,
      type: 'info',
      read: i % 2 === 0,
      created_at: '2023-01-01T00:00:00Z',
    }));

    return res(
      ctx.status(200),
      ctx.json({
        items: notifications,
        total: 5,
        unread_count: 3,
      })
    );
  }),

  rest.put(`${API_BASE_URL}/notifications/:id/read`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Notification marked as read' })
    );
  }),

  // Analytics endpoints
  rest.get(`${API_BASE_URL}/analytics/dashboard`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        total_orders: 150,
        active_orders: 25,
        completed_orders: 100,
        total_quotes: 300,
        accepted_quotes: 120,
        total_revenue: 250000,
        monthly_revenue: [
          { month: 'Jan', revenue: 20000 },
          { month: 'Feb', revenue: 25000 },
          { month: 'Mar', revenue: 30000 },
        ],
      })
    );
  }),

  // Error scenarios for testing
  rest.get(`${API_BASE_URL}/test/error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ detail: 'Internal server error' })
    );
  }),

  rest.get(`${API_BASE_URL}/test/unauthorized`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({ detail: 'Unauthorized' })
    );
  }),

  rest.get(`${API_BASE_URL}/test/forbidden`, (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({ detail: 'Forbidden' })
    );
  }),

  rest.get(`${API_BASE_URL}/test/not-found`, (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ detail: 'Not found' })
    );
  }),

  // Slow response for testing loading states
  rest.get(`${API_BASE_URL}/test/slow`, (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.status(200),
      ctx.json({ message: 'Slow response' })
    );
  }),
]; 