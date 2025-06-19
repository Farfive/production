# Manufacturing Platform Setup Instructions

## ✅ Code Issues Fixed
- Import path: app.api.v1.api → app.api.v1.router ✅
- Async/sync function calls ✅
- Clean requirements file created ✅
- Environment files created ✅

## 🔧 Next Steps

### 1. Install Dependencies

#### Backend:
```bash
cd backend
pip install -r requirements-clean.txt
```

#### Frontend:
```bash
cd frontend
npm install
```

### 2. Start Services (Required)

#### Option A: Using Docker (Recommended)
```bash
# Start Docker Desktop first, then:
docker-compose up -d postgres redis
```

#### Option B: Manual Installation
- Install PostgreSQL 15+
- Install Redis 7+
- Configure connection strings in backend/.env

### 3. Start the Platform

#### Backend:
```bash
cd backend
python main.py
```

#### Frontend:
```bash
cd frontend
npm start
```

### 4. Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🚨 Important Notes
- PostgreSQL and Redis are required for the platform to work
- Use Docker for easiest setup: `docker-compose up -d postgres redis`
- All code issues have been resolved
- Environment files are configured for development

## 🧪 Testing
Run tests to verify everything works:
```bash
python test_platform.py
```
