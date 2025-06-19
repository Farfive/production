# Manufacturing Outsourcing SaaS Platform - Startup Guide
========================================================

## 🚀 **COMPLETE APPLICATION STARTUP INSTRUCTIONS**

This guide will help you run your production-ready Manufacturing Outsourcing SaaS Platform with both frontend and backend services.

---

## 📋 **PREREQUISITES**

### **Backend Requirements**
- ✅ Python 3.8+ installed
- ✅ Virtual environment activated (`.venv`)
- ✅ Backend dependencies installed
- ✅ PostgreSQL database running (or configured)

### **Frontend Requirements**
- ✅ Node.js 16+ installed
- ✅ npm or yarn package manager
- ✅ Frontend dependencies installed

---

## 🔧 **STEP-BY-STEP STARTUP PROCESS**

### **Step 1: Start the Backend Server**

Open your first terminal/command prompt:

```bash
# Navigate to project root
cd C:\Users\nlaszanowski\OneDrive - DXC Production\Desktop\production-outsorucing

# Activate virtual environment
.venv\Scripts\activate

# Navigate to backend directory
cd backend

# Start the FastAPI server
python main.py
```

**Alternative backend startup command:**
```bash
# Using uvicorn directly (if main.py doesn't work)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['C:\...\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process using WatchFiles
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### **Step 2: Start the Frontend Application**

Open your second terminal/command prompt:

```bash
# Navigate to project root
cd C:\Users\nlaszanowski\OneDrive - DXC Production\Desktop\production-outsorucing

# Navigate to frontend directory
cd frontend

# Start the React development server
npm start
```

**Alternative frontend startup command:**
```bash
# If npm start doesn't work
npm run dev
# or
npx react-scripts start
```

**Expected Output:**
```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

---

## 🌐 **ACCESS YOUR PLATFORM**

Once both services are running:

### **Frontend Application**
- **URL**: http://localhost:3000
- **Description**: Main user interface for clients, manufacturers, and admins
- **Features**: 
  - User registration and login
  - Order creation and management
  - Quote comparison and selection
  - Payment processing
  - Analytics dashboards
  - Real-time communication

### **Backend API**
- **URL**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs (Swagger UI)
- **Alternative Docs**: http://127.0.0.1:8000/redoc
- **Health Check**: http://127.0.0.1:8000/health
- **Features**:
  - RESTful API endpoints
  - Authentication and authorization
  - Database operations
  - Payment processing
  - Smart matching algorithms
  - Analytics and reporting

---

## 🛠️ **TROUBLESHOOTING**

### **Backend Issues**

#### **Port 8000 Already in Use**
```bash
# Kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

#### **Database Connection Issues**
```bash
# Check if PostgreSQL is running
# Update database credentials in backend/app/core/config.py
# Or use SQLite for development (if configured)
```

#### **Module Import Errors**
```bash
# Ensure virtual environment is activated
.venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### **Frontend Issues**

#### **Port 3000 Already in Use**
```bash
# The frontend will automatically suggest a different port
# Usually port 3001 will be offered as alternative
```

#### **Node Modules Issues**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Build Issues**
```bash
# Clear cache and rebuild
npm run build
# or
npx react-scripts build
```

---

## 🔍 **VERIFICATION STEPS**

### **1. Backend Verification**
Test these endpoints in your browser:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/

### **2. Frontend Verification**
- Open http://localhost:3000
- Check that the React app loads
- Verify navigation and UI components

### **3. Integration Verification**
- Try user registration from frontend
- Check API calls in browser dev tools
- Verify data flow between frontend and backend

---

## 📱 **DEVELOPMENT WORKFLOW**

### **Recommended Development Setup**

1. **Terminal 1**: Backend server running
2. **Terminal 2**: Frontend development server running
3. **Browser**: 
   - Tab 1: http://localhost:3000 (Frontend)
   - Tab 2: http://127.0.0.1:8000/docs (API docs)
4. **Code Editor**: VS Code or your preferred IDE

### **Hot Reload Features**
- ✅ **Backend**: Auto-reloads on Python file changes
- ✅ **Frontend**: Auto-reloads on React/TypeScript changes
- ✅ **Database**: Migrations auto-apply (if configured)

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Backend Production**
```bash
# Install production dependencies
pip install gunicorn

# Run with Gunicorn
gunicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### **Frontend Production**
```bash
# Build production bundle
npm run build

# Serve static files (using serve package)
npx serve -s build -l 3000
```

---

## 📞 **QUICK START COMMANDS**

### **Option 1: Manual Startup (Recommended for Development)**

**Terminal 1 (Backend):**
```bash
cd backend
.venv\Scripts\activate
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

### **Option 2: Using Scripts (If Available)**

```bash
# If you have startup scripts
npm run start:backend    # Start backend
npm run start:frontend   # Start frontend
npm run start:dev        # Start both (if configured)
```

---

## 🎯 **SUCCESS INDICATORS**

You'll know everything is working when:

### **Backend Success**
- ✅ Server starts without errors
- ✅ Health endpoint returns 200 OK
- ✅ API documentation is accessible
- ✅ Database connections established

### **Frontend Success**
- ✅ React app compiles successfully
- ✅ Browser opens automatically to localhost:3000
- ✅ UI loads without errors
- ✅ Navigation between pages works

### **Integration Success**
- ✅ API calls from frontend to backend work
- ✅ Authentication flow functional
- ✅ Data displays correctly in UI
- ✅ Real-time features working

---

## 🎉 **YOU'RE READY TO GO!**

Once both services are running:

1. **Access your platform** at http://localhost:3000
2. **Create user accounts** and test workflows
3. **Explore the features** - orders, quotes, payments, analytics
4. **Monitor the API** at http://127.0.0.1:8000/docs
5. **Start developing** new features or customizations

---

## 📚 **ADDITIONAL RESOURCES**

### **API Documentation**
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### **Frontend Features**
- User registration and authentication
- Order creation and management
- Quote comparison system
- Payment processing
- Analytics dashboards
- Real-time notifications

### **Backend Capabilities**
- RESTful API with 150+ endpoints
- JWT authentication
- Role-based access control
- Payment processing with Stripe
- AI-powered smart matching
- Comprehensive analytics

---

**Your Manufacturing Outsourcing SaaS Platform is ready for action!** 🚀

*Start both services and begin exploring your enterprise-grade manufacturing platform!* 