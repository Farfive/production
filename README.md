# Manufacturing Platform MVP

A comprehensive manufacturing platform that connects clients with producers through automated matching, integrated payments, and streamlined communication.

## 🚀 Features

- **Smart Matching**: Automated producer-client matching based on technology, location, and capabilities
- **Integrated Payments**: Secure payment processing with Stripe Connect and escrow functionality
- **Automated Communication**: Email notifications and updates via SendGrid
- **Multi-role Dashboard**: Separate interfaces for clients, producers, and administrators
- **Order Management**: Complete order lifecycle from request to completion

## 🛠️ Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Stripe Connect**: Payment processing and payouts
- **SendGrid**: Email communication
- **JWT**: Authentication and authorization

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and state management
- **React Hook Form**: Form handling and validation
- **React Router**: Client-side routing

## 📁 Project Structure

```
manufacturing-platform/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes (versioned)
│   │   ├── core/          # Configuration, security, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helpers and validators
│   │   └── tests/         # Test files
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API calls
│   │   ├── types/         # TypeScript interfaces
│   │   └── utils/         # Helper functions
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Docker (optional, for containerized development)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd manufacturing-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb manufacturing_platform
   
   # Run migrations
   python -m alembic upgrade head
   ```

5. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

#### Using Docker (Recommended)
```bash
docker-compose up --build
```

#### Manual Setup
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend  
cd frontend
npm start
```

## 🔧 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

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

## 🔐 Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `SENDGRID_API_KEY`: SendGrid API key
- `JWT_SECRET_KEY`: JWT signing secret
- `FRONTEND_URL`: Frontend application URL

## 📊 Database Schema

Key entities:
- **Users**: Authentication and role management
- **Orders**: Manufacturing requests from clients
- **Producers**: Manufacturing service providers
- **Quotes**: Producer offers for orders
- **Payments**: Payment processing and escrow

## 🚀 Deployment

### Backend Deployment
- Configure production environment variables
- Set up PostgreSQL database
- Deploy using Docker or cloud services (AWS, GCP, Azure)

### Frontend Deployment  
- Build production bundle: `npm run build`
- Deploy to CDN or static hosting (Vercel, Netlify, S3)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For questions or support, please contact the development team. 