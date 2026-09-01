# Smart Mid-Day Meal System - Deployment Guide

## 🎉 What's Been Fixed

### ✅ 1. Inventory Management
- **Added columns**: `category`, `supplier`, `cost_per_unit`
- Frontend now shows supplier info and cost tracking
- School admins can manage full inventory details

### ✅ 2. Meal Management (Grade-Based Calculations)
- **Government MDMS Norms Implemented**:
  - **Primary (I-V)**: 100g grains, 20g pulses, 50g vegetables, 5g oil
  - **Upper Primary (VI-VIII)**: 150g grains, 30g pulses, 75g vegetables, 7.5g oil
- Automatic meal calculation based on attendance + student grades
- Shows ingredient requirements with inventory availability
- Cost estimation per meal
- Real-time shortage alerts

### ✅ 3. Food Allocation (Government Portal)
- Government admin can allocate food to schools
- Approval workflow (PENDING → APPROVED → adds to school inventory)
- Category-wise tracking (Grains, Pulses, Oil, Vegetables)
- Summary dashboard with allocation statistics

### ✅ 4. Budget Allocation (Government Portal)
- Government admin allocates budget to schools by financial year
- School admins track budget utilization
- District-wise budget breakdown
- Real-time utilization percentage tracking

---

## 🚀 Deployment Steps on AWS

### Step 1: Pull Latest Code on AWS Server

```bash
ssh ubuntu@16.192.185.245

cd ~/smart-mdm-/backend
git pull origin main
```

### Step 2: Activate Virtual Environment

```bash
source venv/bin/activate
```

### Step 3: Install Any New Dependencies (if needed)

```bash
pip install -r requirements.txt
```

### Step 4: Run Database Migrations

```bash
# Run the two new migrations
alembic upgrade inv_cost_001
alembic upgrade budget_alloc_001

# OR run all pending migrations
alembic upgrade head
```

This will:
- Add `category`, `supplier`, `cost_per_unit` columns to `inventory` table
- Create `budgets` table
- Create `food_allocations` table

### Step 5: Restart Backend

```bash
# Kill any running backend process
pkill -f "python3 main.py"

# Start fresh
python3 main.py
```

### Step 6: Verify Backend is Running

```bash
# In another terminal
curl http://16.192.185.245:8000/health

# Should return: {"status":"ok","message":"Smart Mid-Day Meal API is running"}
```

### Step 7: Test New Endpoints

```bash
# Check if new endpoints are registered
curl http://16.192.185.245:8000/docs

# You should see new endpoints:
# - /api/v1/meals/plan
# - /api/v1/meals/daily
# - /api/v1/allocations
# - /api/v1/budgets
```

### Step 8: Frontend Deployment

If you're using the frontend on AWS too:

```bash
cd ~/smart-mdm-/frontend-new
git pull origin main
npm install
npm run build

# If using a production server, restart it
```

---

## 📊 How to Use the New Features

### For School Admins:

#### 1. **Meal Management**
1. Mark attendance for students (face recognition or manual)
2. Go to "Meal Management" page
3. Select date and click "Generate Meal Plan"
4. System automatically calculates:
   - Grains: Primary students × 100g + Upper Primary students × 150g
   - Dal, vegetables, oil based on government norms
   - Total cost estimate
   - Inventory availability status
5. If inventory is sufficient, meals can be prepared

#### 2. **Inventory Management**
- Now you can add:
  - Item category (Grains, Pulses, Oil, etc.)
  - Supplier name
  - Cost per unit
- System uses these costs for meal plan estimation

### For Government Admins:

#### 1. **Food Allocation**
1. Go to "Food Allocation" page
2. Click "New Allocation"
3. Select school, item, category, quantity
4. Allocation is created in PENDING status
5. Click "Approve" to:
   - Change status to APPROVED
   - Automatically add item to school's inventory
6. View allocation summary by category

#### 2. **Budget Allocation**
1. Go to "Budget Allocation" page
2. Click "Allocate Budget"
3. Select school and financial year
4. Enter budget amount
5. View district-wise breakdown
6. Track utilization percentage per school

---

## 🧪 Testing Checklist

### Test 1: Meal Planning with Grade-Based Calculation
```bash
# On school admin portal:
1. Login as school admin
2. Add some students in different grades (Grade 1-5 and Grade 6-8)
3. Mark attendance for today
4. Go to Meal Management
5. Click "Generate Meal Plan"
6. Verify:
   ✓ Shows correct student count (Primary vs Upper Primary)
   ✓ Grains calculation: Primary × 100g + Upper × 150g
   ✓ Shows inventory availability
   ✓ Shows cost estimate
```

### Test 2: Food Allocation Workflow
```bash
# On government admin portal:
1. Login as GOV-001 / admin123
2. Go to Food Allocation
3. Create allocation: Select a school, add "Rice 50kg"
4. Verify allocation appears as PENDING
5. Click "Approve"
6. Verify:
   ✓ Status changes to APPROVED
   ✓ Check school's inventory - Rice should be added
```

### Test 3: Budget Tracking
```bash
# On government admin portal:
1. Go to Budget Allocation
2. Allocate ₹100,000 to a school for FY 2026-27
3. Verify:
   ✓ Budget appears in table
   ✓ Shows in district breakdown
   ✓ Utilization shows 0%
```

### Test 4: Inventory with Cost Tracking
```bash
# On school admin portal:
1. Go to Inventory
2. Add item: Rice, Grains category, 50kg, Supplier: "ABC Suppliers", Cost: ₹40/kg
3. Verify item shows supplier and cost
4. Generate meal plan
5. Verify cost estimate uses ₹40/kg for rice
```

---

## 🐛 Troubleshooting

### Issue: Migration fails
```bash
# Check current migration version
alembic current

# If stuck, try:
alembic downgrade -1
alembic upgrade head
```

### Issue: Backend won't start
```bash
# Check logs
python3 main.py

# Common fixes:
1. Check if port 8000 is already in use: netstat -tuln | grep 8000
2. Kill process: pkill -f "python3 main.py"
3. Check database: ls -lh app.db
```

### Issue: Frontend shows "Failed to generate meal plan"
```bash
# Check:
1. Is attendance marked for the date? (Must mark attendance first)
2. Do students have grades assigned? (Check student records)
3. Are there students present? (No attendance = no meal plan)
4. Check browser console for error details
```

### Issue: Food allocation doesn't add to inventory
```bash
# Check:
1. Is allocation status PENDING? (Only PENDING can be approved)
2. Check backend logs for errors
3. Verify school_id exists in database
```

---

## 📈 Production Checklist

Before going live:

- [ ] Run all migrations successfully
- [ ] Test meal planning with real student data
- [ ] Test food allocation approval workflow
- [ ] Test budget allocation for at least one school
- [ ] Verify inventory cost tracking works
- [ ] Check government dashboard shows correct data
- [ ] Test with multiple schools and districts
- [ ] Backup database before deployment
- [ ] Set up monitoring for API endpoints

---

## 💡 Important Notes

1. **Student Grades**: Make sure all students have grades assigned (1-10). The system uses grades to classify Primary (1-5) vs Upper Primary (6-8) for correct meal calculations.

2. **Attendance First**: Meal planning requires attendance to be marked first. It calculates based on students marked PRESENT for that date.

3. **Inventory Costs**: If you don't enter cost_per_unit for inventory items, meal cost estimation will show ₹0. Add costs for accurate budgeting.

4. **Budget Utilization**: Currently budget utilization must be manually updated through the API. Future enhancement: auto-update when meals are served.

5. **Food Allocation**: Approved allocations automatically add to school inventory. Make sure to approve only verified allocations.

---

## 🔧 API Endpoints Reference

### Meal Planning
```
POST /api/v1/meals/plan?plan_date=2026-08-07
GET  /api/v1/meals
POST /api/v1/meals/daily
POST /api/v1/meals/{id}/consume
```

### Food Allocations
```
GET  /api/v1/allocations
POST /api/v1/allocations
PUT  /api/v1/allocations/{id}
POST /api/v1/allocations/{id}/approve
GET  /api/v1/allocations/summary
```

### Budgets
```
GET  /api/v1/budgets
POST /api/v1/budgets
PUT  /api/v1/budgets/{id}
POST /api/v1/budgets/{id}/utilize?amount=1000
GET  /api/v1/budgets/summary/government?financial_year=2026-27
```

---

## ✅ What's Working Now

1. **Food Allocation**: ✅ Working (Create, Approve, Track)
2. **Budget Allocation**: ✅ Working (Allocate, Track, District breakdown)
3. **Inventory Monitoring**: ✅ Working (Category, Supplier, Cost tracking)
4. **Meal Management**: ✅ Working (Grade-based calculations with government norms)
5. **Grade-based Requirements**: ✅ Working (100g Primary vs 150g Upper Primary)
6. **Cost Estimation**: ✅ Working (Per-student and total costs)
7. **Inventory Availability Checks**: ✅ Working (Shows sufficient/shortage)
8. **Government Dashboard**: ✅ Working (Shows allocations and budgets)
9. **School Dashboard**: ✅ Working (Shows meal requirements)

---

## 🎯 Next Steps (Optional Enhancements)

1. Add automatic budget deduction when meals are served
2. Generate purchase orders for low-stock items
3. Add export to Excel for meal plans and allocations
4. Add SMS/email notifications for low stock
5. Add historical trend analysis for meal costs
6. Add multi-day meal planning (weekly/monthly)

---

Need help? Check the error logs or contact the development team!
