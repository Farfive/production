# ManufactureHub - B2B Manufacturing Platform

A modern, full-stack B2B manufacturing marketplace that connects businesses with verified manufacturers. Built with React, FastAPI, and PostgreSQL.

## 🚀 Features

### For Clients
- **Smart Manufacturer Matching**: AI-powered algorithm to find the perfect manufacturer for your needs
- **Instant Quotes**: Get competitive quotes from multiple manufacturers quickly
- **Order Management**: Track orders from creation to delivery with real-time updates
- **Secure Payments**: Stripe-powered escrow system protects both parties
- **Quality Assurance**: Built-in milestone tracking and quality checks

### For Manufacturers
- **Profile Management**: Showcase capabilities, certifications, and portfolio
- **Quote System**: Respond to RFQs with detailed pricing and timelines
- **Order Fulfillment**: Manage production schedules and deliveries
- **Analytics Dashboard**: Track performance metrics and revenue
- **Payment Protection**: Guaranteed payments through escrow system

### Platform Features
- **Modern UI/UX**: Beautiful, responsive design with dark mode support
- **Real-time Updates**: WebSocket-powered notifications and chat
- **Multi-language Support**: Internationalization ready
- **GDPR Compliant**: Full data protection and user privacy
- **API-First Design**: RESTful API with comprehensive documentation

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for data fetching
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **FastAPI** (Python) for high-performance API
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **Celery** for background tasks
- **SQLAlchemy** ORM
- **JWT** authentication
- **Stripe** for payments

### Infrastructure
- **Docker** & **Docker Compose** for containerization
- **Nginx** for reverse proxy
- **GitHub Actions** for CI/CD

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Docker** and Docker Compose (optional)
- **PostgreSQL** 14+ (if not using Docker)
- **Redis** 6+ (if not using Docker)

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/manufacturing-platform.git
cd manufacturing-platform
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (especially Stripe and SendGrid keys)

4. Run with Docker Compose:
```bash
# Windows
start-app.bat

# Linux/Mac
docker-compose up --build
```

### Option 2: Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/manufacturing-platform.git
cd manufacturing-platform
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

3. Set up the database:
```bash
# Create PostgreSQL database
createdb manufacturing_platform

# Run migrations
alembic upgrade head
```

4. Start the backend:
```bash
python main.py
```

5. In a new terminal, set up the frontend:
```bash
cd frontend
npm install
npm start
```

### Option 3: Quick Test (Windows)

Simply run:
```bash
quick-test.bat
```

This will automatically set up and start both frontend and backend servers.

## 🌐 Accessing the Application

Once running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database Admin** (if using Docker): http://localhost:8080
- **Flower** (Celery monitoring): http://localhost:5555

## 🔑 Default Credentials

For testing purposes:

- **Client Account**: client@example.com / password123
- **Manufacturer Account**: manufacturer@example.com / password123
- **Admin Account**: admin@example.com / password123

## 📱 Key Features Walkthrough

### 1. User Registration & Authentication
- Multi-role registration (Client/Manufacturer)
- Email verification
- Secure password reset
- JWT-based authentication

### 2. Order Creation Flow
- Detailed product specifications
- File attachments support
- Delivery requirements
- Budget constraints

### 3. Intelligent Matching
- AI-powered manufacturer selection
- Based on capabilities, location, and ratings
- Customizable matching criteria

### 4. Quote Management
- Detailed pricing breakdowns
- Production timelines
- Terms and conditions
- Quote comparison tools

### 5. Payment Processing
- Stripe Connect integration
- Milestone-based payments
- Escrow protection
- Multi-currency support

### 6. Communication
- In-app messaging
- Email notifications
- Real-time updates
- File sharing

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

## 📚 API Documentation

The API documentation is automatically generated and available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Authentication
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Email
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Payments
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Frontend
REACT_APP_API_URL=http://localhost:8000/api/v1
```

## 🚀 Deployment

### Production Deployment

1. Update environment variables for production
2. Build frontend:
```bash
cd frontend
npm run build
```

3. Use production Docker Compose:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@manufacturehub.com or join our Slack channel.

## 🎯 Roadmap

- [ ] Mobile applications (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Blockchain integration for supply chain
- [ ] AR/VR product visualization
- [ ] IoT integration for real-time tracking

---

Built with ❤️ by the ManufactureHub Team 