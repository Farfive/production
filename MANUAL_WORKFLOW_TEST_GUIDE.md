# 🧪 Manual Client-Manufacturer Workflow Test Guide

## 🚀 **PRE-TEST SETUP**

### **Start the Application:**
1. **Backend**: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
2. **Frontend**: `cd frontend && npm start` (should open on port 3000)
3. **Access**: Open `http://localhost:3000` in your browser

---

## 📋 **PHASE 1: CLIENT USER WORKFLOW**

### **Step 1.1: Client Registration & Login**
1. **Navigate to**: `http://localhost:3000/register`
2. **Fill out registration form**:
   - Email: `testclient@example.com`
   - Password: `ClientTest123!`
   - First Name: `Test`
   - Last Name: `Client`
   - Company: `Test Manufacturing Corp`
   - Role: `Client`
   - ✅ Data Processing Consent
3. **Click**: "Register"
4. **Expected**: Success message and redirect to login
5. **Login** with the same credentials

### **Step 1.2: Client Dashboard Access**
1. **Navigate to**: Dashboard (should auto-redirect)
2. **Verify**: Client-specific dashboard displays
3. **Check**: Order statistics, quote metrics, dashboard widgets
4. **Expected**: Professional client dashboard with real data or empty states

### **Step 1.3: Create Manufacturing Order**
1. **Navigate to**: "Create Order" or "Orders" → "New Order"
2. **Fill out order form**:
   ```
   Title: "Aerospace Aluminum Components"
   Description: "High-precision aluminum parts for aerospace industry"
   Category: "Aerospace Components"
   Quantity: 500
   Target Price: $75.00
   Deadline: [30 days from now]
   
   Specifications:
   - Material: Aluminum 6061-T6
   - Finish: Anodized
   - Tolerance: ±0.05mm
   - Certification: AS9100
   
   Technical Requirements:
   - Dimensions: 150mm x 100mm x 25mm
   - Weight: Maximum 2kg
   - Surface Roughness: Ra 1.6
   ```
3. **Click**: "Create Order"
4. **Expected**: Order created successfully, order ID assigned

### **Step 1.4: View Created Orders**
1. **Navigate to**: "Orders" or "My Orders"
2. **Verify**: New order appears in the list
3. **Check**: Order details, status, specifications
4. **Click**: Order to view full details
5. **Expected**: Complete order information displayed

### **Step 1.5: Smart Matching Recommendations**
1. **From order details**: Look for "Find Manufacturers" or "Smart Matching"
2. **Click**: "Get Recommendations"
3. **Wait for**: AI-powered manufacturer suggestions
4. **Expected**: List of recommended manufacturers with scores

---

## 🏭 **PHASE 2: MANUFACTURER USER WORKFLOW**

### **Step 2.1: Manufacturer Registration & Login**
1. **Open new incognito window** or logout from client account
2. **Navigate to**: `http://localhost:3000/register`
3. **Fill out registration form**:
   - Email: `testmanufacturer@example.com`
   - Password: `ManufacturerTest123!`
   - First Name: `Test`
   - Last Name: `Manufacturer`
   - Company: `Precision Manufacturing LLC`
   - Role: `Manufacturer`
   - ✅ Data Processing Consent
4. **Register and login** with manufacturer account

### **Step 2.2: Manufacturer Dashboard**
1. **Verify**: Manufacturer-specific dashboard
2. **Check**: Available orders, quote statistics, production capacity
3. **Expected**: Different layout from client dashboard

### **Step 2.3: Browse Available Orders**
1. **Navigate to**: "Available Orders" or "Order Discovery"
2. **Verify**: Client's order appears in the list
3. **Filter by**: Category, location, budget range
4. **Click**: On the client's order to view details
5. **Expected**: Full order specifications visible

### **Step 2.4: Create Quotes for the Order**
1. **From order details**: Click "Submit Quote" or "Create Quote"
2. **Create Quote #1 - Standard**:
   ```
   Price: $72.50
   Delivery Time: 25 days
   Notes: "Standard production with quality certification"
   
   Manufacturing Details:
   - Process: CNC Machining + Anodizing
   - Equipment: 5-axis CNC machines
   - Quality: CMM inspection + AS9100 certification
   ```
3. **Create Quote #2 - Economy**:
   ```
   Price: $68.00
   Delivery Time: 35 days
   Notes: "Economy option with longer lead time"
   ```
4. **Create Quote #3 - Express**:
   ```
   Price: $78.00
   Delivery Time: 20 days
   Notes: "Express production with expedited delivery"
   ```
5. **Expected**: Multiple quotes submitted successfully

### **Step 2.5: Manage Submitted Quotes**
1. **Navigate to**: "My Quotes" or "Submitted Quotes"
2. **Verify**: All three quotes appear
3. **Check**: Quote status, client responses
4. **Expected**: Quote management interface working

---

## 📊 **PHASE 3: CLIENT QUOTE EVALUATION**

### **Step 3.1: Return to Client Account**
1. **Switch back** to client account (logout manufacturer, login client)
2. **Navigate to**: Dashboard or "Quotes"
3. **Expected**: Notification of new quotes received

### **Step 3.2: View Received Quotes**
1. **Navigate to**: "Received Quotes" or "Quote Management"
2. **Verify**: All three manufacturer quotes are visible
3. **Check**: Price comparison, delivery times, details
4. **Expected**: Professional quote comparison interface

### **Step 3.3: Compare Quotes**
1. **Select**: Multiple quotes for comparison
2. **Click**: "Compare Quotes" or comparison tool
3. **Review**: Side-by-side comparison
4. **Analyze**: Price, delivery, quality factors
5. **Expected**: Detailed comparison matrix

### **Step 3.4: Evaluate and Respond**
1. **Rate quotes**: If rating system available
2. **Add comments**: Questions or feedback
3. **Shortlist**: Preferred quotes
4. **Expected**: Quote evaluation tools working

---

## 💰 **PHASE 4: PAYMENT AND ESCROW FLOW**

### **Step 4.1: Accept Quote (Client)**
1. **Select**: Best quote from comparison
2. **Click**: "Accept Quote" or "Proceed to Payment"
3. **Review**: Final order and quote details
4. **Expected**: Payment flow initiation

### **Step 4.2: Escrow Payment Setup**
1. **Navigate**: Through payment wizard
2. **Select**: Payment method (test mode)
3. **Review**: Escrow terms and conditions
4. **Expected**: Secure payment processing interface

### **Step 4.3: Order Confirmation**
1. **Complete**: Payment process (test mode)
2. **Verify**: Order status changes to "In Production"
3. **Check**: Both client and manufacturer notifications
4. **Expected**: Order confirmation and tracking information

---

## 📈 **PHASE 5: ANALYTICS AND MONITORING**

### **Step 5.1: Client Analytics**
1. **Navigate to**: Analytics or Reports section
2. **Check**: Order statistics, spending analysis
3. **Verify**: Quote comparison analytics
4. **Expected**: Business intelligence dashboards

### **Step 5.2: Manufacturer Analytics**
1. **Switch to manufacturer account**
2. **Navigate to**: Analytics or Business Dashboard
3. **Check**: Quote success rates, revenue tracking
4. **Verify**: Production scheduling tools
5. **Expected**: Manufacturing-specific analytics

### **Step 5.3: Real-time Features**
1. **Test**: Live notifications
2. **Check**: Real-time status updates
3. **Verify**: WebSocket connections
4. **Expected**: Live data synchronization

---

## 💬 **PHASE 6: COMMUNICATION FEATURES**

### **Step 6.1: Messaging System**
1. **From order/quote**: Click "Message" or "Contact"
2. **Send message**: Between client and manufacturer
3. **Verify**: Real-time message delivery
4. **Expected**: Integrated communication system

### **Step 6.2: Notifications**
1. **Check**: Notification center for both users
2. **Verify**: Email notifications (if configured)
3. **Test**: Push notifications (if available)
4. **Expected**: Comprehensive notification system

---

## ✅ **SUCCESS CRITERIA CHECKLIST**

### **Authentication & User Management**
- [ ] Client registration and login working
- [ ] Manufacturer registration and login working
- [ ] Role-based dashboard access
- [ ] User profile management

### **Core Business Workflow**
- [ ] Order creation by client
- [ ] Order discovery by manufacturer
- [ ] Quote submission by manufacturer
- [ ] Quote evaluation by client
- [ ] Payment and escrow processing

### **Smart Features**
- [ ] Smart matching recommendations
- [ ] Quote comparison tools
- [ ] Analytics and reporting
- [ ] Real-time updates

### **Communication**
- [ ] Messaging between users
- [ ] Notification system
- [ ] Status updates
- [ ] Email notifications

### **UI/UX Quality**
- [ ] Professional design
- [ ] Responsive layout
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states

---

## 🎯 **EXPECTED OUTCOMES**

### **If Everything Works:**
✅ **Complete order-to-payment workflow functional**
✅ **Real-time communication between users**
✅ **Professional business interface**
✅ **Secure payment processing**
✅ **Smart matching and analytics**

### **Platform Ready For:**
- Real customer onboarding
- Live business transactions
- Production deployment
- Scaling to multiple users

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**
1. **API Errors**: Check backend console for error messages
2. **Login Issues**: Verify user registration completed
3. **Missing Data**: Check if real API endpoints are responding
4. **UI Errors**: Check browser console for JavaScript errors

### **Debug Steps:**
1. Open browser developer tools (F12)
2. Check Network tab for API calls
3. Check Console tab for errors
4. Verify backend is running on port 8000
5. Verify frontend is running on port 3000

---

**🎉 READY TO TEST! Follow each phase step-by-step and verify the complete workflow.** 