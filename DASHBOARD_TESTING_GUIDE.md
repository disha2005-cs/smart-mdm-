# PM POSHAN Dashboard Testing Guide

## 🚀 Services Running

✅ **Backend API**: http://localhost:8000  
✅ **Frontend App**: http://localhost:5173

---

## 🔐 Test Credentials

### Government Administrator
- **Username**: `GOV-001`
- **Password**: `password123`
- **Role**: GOVERNMENT
- **Access**: State-wide monitoring and administration

### School Administrators
- **Username**: `SCH-001` to `SCH-005`
- **Password**: `password123`
- **Role**: SCHOOL
- **Access**: Individual school operations

---

## 🏛️ Government Dashboard Testing

### Test Steps:
1. **Login** with `GOV-001` / `password123`
2. **Verify Dashboard Components**:
   - [ ] Welcome section shows "PM POSHAN - Government Dashboard"
   - [ ] Department shows "Department of Public Instruction, Karnataka"
   - [ ] Live clock displays current date and time

### KPI Cards (12 Total - 3 Rows):

#### Row 1 - Primary Metrics:
- [ ] **Total Schools**: Shows total number of schools, clickable → navigates to /schools
- [ ] **Total Students**: Shows total enrolled students across Karnataka
- [ ] **Students Present Today**: Shows today's attendance count with percentage
- [ ] **Meals Served Today**: Shows total meals served across all schools

#### Row 2 - Resources:
- [ ] **Total Food Allocated (kg)**: Shows food allocation for the month
- [ ] **Budget Allocated (₹)**: Shows budget in lakhs for FY 2026-27
- [ ] **Overall Attendance %**: Shows state-wide attendance percentage
- [ ] **Pending Requests**: Shows unread alerts count (with warning if > 0)

#### Row 3 - System Monitoring:
- [ ] **Notifications**: Shows notification count
- [ ] **Reports Generated**: Shows monthly report count, clickable → /reports
- [ ] **AI Health %**: Shows AI recognition system health (98.5%)
- [ ] **IoT Devices**: Shows 0 with "Coming soon" indicator

### Charts & Analytics:
- [ ] **District-wise Bar Chart**: Shows school distribution across districts
- [ ] **Districts Overview Panel**: Lists all districts with school counts
- [ ] **State-wide Attendance Overview**: Shows total, present, percentage
- [ ] **Attendance Pie Chart**: Visual split of present vs absent students
- [ ] **Food & Budget Allocation Cards**: Shows allocated amounts with progress bars

### Alerts & Activities:
- [ ] **System Alerts Section**: 
  - Shows alerts by severity (HIGH/MEDIUM/LOW)
  - Color-coded borders (red/yellow/blue)
  - Displays "All systems operational" if no alerts
- [ ] **Recent Activities Section**:
  - Shows school registrations
  - Food allocations
  - Budget releases
  - Timestamps visible

### AI & IoT Monitoring:
- [ ] **AI System Health Panel**:
  - System health percentage displayed
  - "Operational" status badge with pulsing green dot
  - Cameras Online count (0 currently)
  - Recognition Accuracy percentage
- [ ] **IoT Monitoring Panel**:
  - Shows "Coming Soon" placeholder
  - Message about future smart devices

### Quick Actions (6 Buttons):
- [ ] Register School → /schools
- [ ] Allocate Food → (placeholder)
- [ ] Allocate Budget → (placeholder)
- [ ] Verify Inventory → /inventory
- [ ] Generate Reports → /reports
- [ ] Send Circular → (placeholder)

### Navigation (Sidebar):
- [ ] Dashboard
- [ ] School Management → /schools
- [ ] Food Allocation (future)
- [ ] Budget Allocation (future)
- [ ] Inventory Monitoring → /inventory
- [ ] Reports & Analytics → /reports
- [ ] Notifications (future)
- [ ] Users & Roles (future)
- [ ] Settings (future)

### System Status:
- [ ] Shows "PM POSHAN Karnataka"
- [ ] Shows "Government Admin"
- [ ] Green pulsing dot indicating "System Online"

---

## 🏫 School Dashboard Testing

### Test Steps:
1. **Login** with `SCH-001` / `password123`
2. **Verify Dashboard Components**:
   - [ ] Welcome section shows actual school name
   - [ ] Principal name displayed
   - [ ] District name displayed
   - [ ] Live clock shows current date and time

### KPI Cards (8 Total - 2 Rows):

#### Row 1:
- [ ] **Total Students**: Shows enrolled student count, clickable → /students
- [ ] **Students Present Today**: Shows today's attendance with percentage, clickable → /attendance
- [ ] **Meals Required Today**: Shows meals needed for kitchen
- [ ] **Current Food Stock (kg)**: Shows total inventory, clickable → /inventory

#### Row 2:
- [ ] **Low Stock Items**: Shows count of items below threshold (⚠ warning), clickable → /inventory
- [ ] **Attendance %**: Shows school attendance percentage with trend
- [ ] **AI Recognition Accuracy %**: Shows AI system accuracy (~96.8%)
- [ ] **Government Alerts**: Shows pending alert count

### Charts & Analytics:
- [ ] **Weekly Attendance Line Chart**:
  - Shows last 7 days (Mon-Sun)
  - Line graph with attendance counts
  - Smooth curve animation
- [ ] **Today's Meal Summary**:
  - Meals Required count (blue card)
  - Meals Served count (green card)
  - Ingredients Required section with 6 items:
    - Rice (kg)
    - Dal (kg)
    - Oil (L)
    - Vegetables (kg)
    - Eggs (nos)
    - Milk (L)

### Inventory Status:
- [ ] Shows inventory items with:
  - Item name
  - Quantity and unit
  - Progress bar (green = healthy, red = critical)
  - "⚠ Low Stock" warning if below threshold

### Government Alerts:
- [ ] Shows unread alerts with color-coded severity
- [ ] HIGH = red background
- [ ] MEDIUM = yellow background
- [ ] LOW = blue background
- [ ] Shows "No pending alerts" if empty

### Recent Activities:
- [ ] **Activity Timeline** with:
  - Attendance Completed (green dot)
  - Student Registered (blue dot)
  - Inventory Updated (green dot)
  - Meal Generated (green dot)
  - Timestamps for each activity

### Quick Actions (6 Buttons):
- [ ] Register Student → /students
- [ ] Register Face → /students
- [ ] Take Attendance → /attendance
- [ ] Generate Meals → (placeholder)
- [ ] Verify Inventory → /inventory
- [ ] Generate Report → /reports

### Navigation (Sidebar):
- [ ] Dashboard
- [ ] Student Management → /students
- [ ] Face Registration → /students
- [ ] Attendance → /attendance
- [ ] Meal Management (future)
- [ ] Inventory Management → /inventory
- [ ] Reports & Analytics → /reports
- [ ] Notifications (future)
- [ ] Settings (future)

### System Status:
- [ ] Shows school name
- [ ] Shows "School Admin"
- [ ] Green pulsing dot indicating "System Online"

---

## 🔄 Role-Based Access Control Testing

### Government Admin (GOV-001):
1. **Should Have Access To**:
   - [ ] Dashboard with 12 KPIs and state-wide data
   - [ ] All schools list (/schools)
   - [ ] District-wise analytics
   - [ ] Food & Budget allocation views
   - [ ] Inventory monitoring (all schools)
   - [ ] State-wide reports

2. **Should NOT Have Access To**:
   - [ ] Individual student management
   - [ ] Face registration
   - [ ] School-level attendance marking
   - [ ] Individual school meal planning

### School Admin (SCH-001 to SCH-005):
1. **Should Have Access To**:
   - [ ] Dashboard with 8 KPIs and school-specific data
   - [ ] Student management (own school only)
   - [ ] Face registration (own school only)
   - [ ] Attendance marking (own school only)
   - [ ] Meal management (own school only)
   - [ ] Inventory management (own school only)
   - [ ] School reports

2. **Should NOT Have Access To**:
   - [ ] Other schools' data
   - [ ] School registration
   - [ ] Food allocation
   - [ ] Budget allocation
   - [ ] State-wide analytics

---

## 🎯 API Endpoints Testing

### Government Dashboard API
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard/government" \
  -H "Authorization: Bearer <gov-token>"
```

**Expected Response**:
```json
{
  "kpis": {
    "total_schools": { "value": 5, "label": "Total Schools", "trend": "+2 this month" },
    "total_students": { "value": 200, "label": "Total Students", ... },
    ...
  },
  "districts": [...],
  "recent_activities": [...],
  "alerts": [...],
  "summary": { ... }
}
```

### School Dashboard API
```bash
curl -X GET "http://localhost:8000/api/v1/dashboard/school" \
  -H "Authorization: Bearer <school-token>"
```

**Expected Response**:
```json
{
  "school": {
    "name": "Greenwood Government High School",
    "principal": "Meena Rao",
    "district": "Mysuru"
  },
  "kpis": { ... },
  "attendance_data": [...],
  "meal_summary": { ... },
  "inventory_status": [...],
  "alerts": [...],
  "recent_activities": [...]
}
```

---

## ⚡ Performance Testing

- [ ] Dashboard loads in < 2 seconds
- [ ] KPI cards animate sequentially on load
- [ ] Charts render smoothly without lag
- [ ] Navigation between pages is instant
- [ ] Quick actions respond immediately
- [ ] No console errors in browser DevTools
- [ ] Backend responds in < 500ms for dashboard endpoints

---

## 🐛 Known Limitations

1. **Seed Data**: Bootstrap seeding is disabled in main.py lifespan - data must be seeded separately
2. **Mock Data**: Some features use mock data:
   - Food allocation amounts
   - Budget figures
   - Daily meal records
   - Reports count
   - IoT device status
3. **Future Features** (placeholders):
   - Food Allocation module
   - Budget Allocation module
   - Users & Roles management
   - Notifications panel
   - Settings page
   - IoT integration

---

## 📊 Success Criteria

### Government Dashboard:
✅ All 12 KPI cards display correctly  
✅ District analytics show real data  
✅ Charts render without errors  
✅ Navigation works for all menu items  
✅ Role-specific data filtering works  
✅ Quick actions navigate correctly  

### School Dashboard:
✅ All 8 KPI cards display correctly  
✅ School-specific data loads properly  
✅ Weekly attendance chart shows data  
✅ Meal summary calculates ingredients  
✅ Inventory status shows progress bars  
✅ Quick actions navigate correctly  

### General:
✅ No Supabase references anywhere  
✅ All API calls use FastAPI backend  
✅ Authentication works with JWT  
✅ Role-based routing functions  
✅ Layout sidebar adapts to role  
✅ System status shows correctly  

---

## 🎉 Test Complete!

If all checkboxes above are ticked, the comprehensive dashboard system is fully functional and ready for production deployment!

**Next Steps**:
1. Add real-time data seeding (run bootstrap separately)
2. Implement remaining placeholder features
3. Add data export functionality
4. Integrate real IoT devices
5. Deploy to production environment
