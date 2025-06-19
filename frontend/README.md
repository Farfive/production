# Manufacturing Platform Frontend

A modern React application with TypeScript for the Manufacturing Platform that connects businesses with verified manufacturers.

## 🚀 Features

### 🎨 Modern UI/UX
- **Atomic Design Pattern**: Organized component structure (atoms, molecules, organisms, templates, pages)
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: Full theme support with system preference detection
- **Accessibility**: WCAG 2.1 compliance with proper ARIA labels and keyboard navigation
- **Smooth Animations**: Framer Motion for delightful user interactions

### 🔧 Technical Implementation
- **React 18** with TypeScript for type safety
- **React Query** for efficient server state management
- **React Hook Form** with Yup validation for robust form handling
- **React Router** for client-side routing
- **Tailwind CSS** with custom design system
- **Error Boundaries** for graceful error handling
- **Comprehensive Testing** with React Testing Library

### 👥 User Roles & Features

#### 🛒 Client Dashboard
- Order creation with step-by-step wizard
- Quote comparison and selection
- Order tracking and status updates
- Payment processing and history
- Manufacturer discovery and profiles

#### 🏭 Manufacturer Dashboard
- Order opportunities browsing
- Quote creation and management
- Production tracking
- Analytics and insights
- Profile and capability management

#### ⚙️ Admin Dashboard
- User management
- Platform analytics
- Manufacturer verification
- System settings

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control
- Email verification
- Password reset functionality
- Secure form validation

### 💳 Payment Integration
- Multi-region Stripe integration
- Secure payment processing
- Transaction history
- Refund management
- Multiple currency support

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (atoms)
│   ├── layout/         # Layout components
│   ├── forms/          # Form components
│   └── providers/      # Context providers
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── orders/         # Order management
│   ├── quotes/         # Quote management
│   ├── payments/       # Payment processing
│   ├── profile/        # User profiles
│   ├── public/         # Public pages
│   └── errors/         # Error pages
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── api.ts          # API client & React Query setup
│   └── utils.ts        # Helper functions
├── types/              # TypeScript type definitions
└── styles/            # Global styles
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running (see backend README)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure environment variables:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api/v1
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Start development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Component logic and utilities
- **Integration Tests**: User workflows and API integration
- **Accessibility Tests**: WCAG compliance validation

## 🎨 Design System

### Color Palette
- **Primary**: Blue shades for main actions and branding
- **Secondary**: Gray shades for backgrounds and text
- **Success**: Green for positive actions
- **Warning**: Yellow for caution states
- **Error**: Red for error states
- **Manufacturing**: Specialized colors (steel, copper, aluminum)

### Typography
- **Font Family**: Inter for excellent readability
- **Scale**: Consistent type scale from xs to 6xl
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Components
- **Buttons**: Multiple variants with loading states
- **Forms**: Comprehensive validation and error handling
- **Navigation**: Responsive with role-based menu items
- **Cards**: Consistent elevation and spacing
- **Tables**: Sortable with pagination
- **Modals**: Accessible with proper focus management

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

### Mobile-First Approach
- Touch-friendly interface
- Optimized navigation
- Swipe gestures support
- Performance optimized for mobile

## 🔄 State Management

### React Query
- **Server State**: API data with caching and synchronization
- **Optimistic Updates**: Immediate UI feedback
- **Background Refetching**: Keep data fresh
- **Error Handling**: Automatic retry with exponential backoff

### Zustand (if needed)
- **Client State**: Local UI state management
- **Persistence**: Local storage integration
- **DevTools**: Development debugging support

## 🚀 Performance Optimization

### Code Splitting
- Route-based splitting for optimal loading
- Component lazy loading where appropriate
- Dynamic imports for heavy dependencies

### Optimization Techniques
- **Memoization**: React.memo, useMemo, useCallback
- **Virtual Scrolling**: For large lists
- **Image Optimization**: Lazy loading and WebP support
- **Bundle Analysis**: Regular size monitoring

## 🔧 Build & Deployment

### Build for Production
```bash
npm run build
```

### Deployment Options
- **Vercel**: Optimized for React apps
- **Netlify**: Simple static hosting
- **AWS S3 + CloudFront**: Enterprise solution
- **Docker**: Containerized deployment

### Environment Configuration
```bash
# Development
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:8000/api/v1

# Production
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.manufacturehub.com/v1
```

## 🔐 Security Considerations

### Authentication
- JWT tokens with automatic refresh
- Secure token storage
- Route protection based on roles

### Data Protection
- Input sanitization
- XSS prevention
- CSRF protection
- Content Security Policy

## 🌐 Internationalization (Future)

### i18n Setup
- React i18next integration
- Language detection
- Pluralization support
- Date/number formatting

## 📊 Analytics & Monitoring

### Error Tracking
- React Error Boundaries
- Sentry integration for production
- User feedback collection

### Performance Monitoring
- Web Vitals tracking
- User interaction analytics
- Performance budgets

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes following coding standards
3. Write/update tests
4. Submit pull request with description

### Coding Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

### Component Guidelines
- **Atomic Design**: Follow established patterns
- **Accessibility**: Include ARIA labels and keyboard navigation
- **Documentation**: JSDoc comments for complex components
- **Testing**: Unit tests for all components

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Component Storybook](link-to-storybook)
- [API Documentation](link-to-api-docs)
- [Design System Guide](link-to-design-guide)

### Getting Help
- Create an issue for bugs
- Start a discussion for questions
- Check existing documentation first

## 🗺️ Roadmap

### Phase 1 - MVP ✅
- [x] Authentication system
- [x] Basic dashboards
- [x] Order creation
- [x] Quote management
- [x] Payment integration

### Phase 2 - Enhanced Features
- [ ] Advanced search and filtering
- [ ] Real-time notifications
- [ ] File management system
- [ ] Advanced analytics
- [ ] Mobile app

### Phase 3 - Enterprise
- [ ] Multi-tenant support
- [ ] Advanced reporting
- [ ] API marketplace
- [ ] White-label solutions
- [ ] Enterprise SSO

---

Built with ❤️ by the Manufacturing Platform Team 