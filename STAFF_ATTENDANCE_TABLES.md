# Staff Attendance Database Tables

The Staff Attendance system has been successfully initialized with the following MongoDB collections (tables):

## 📊 Database Collections Created

### 1. **staffs** (Staff Master Table)
Stores employee/staff master data.

**Fields:**
- `staffId` (String, Unique) - Staff identifier (e.g., STF001)
- `name` (String, Required) - Staff member's full name
- `mobile` (String, Required) - Contact number
- `designation` (String, Required) - Job title/role
- `salaryType` (Enum: 'daily', 'monthly') - Type of salary
- `salaryAmount` (Number, Required) - Salary value
- `joiningDate` (Date, Required) - Date of joining
- `isActive` (Boolean, Default: true) - Active status
- `createdAt` (Date) - Auto-generated
- `updatedAt` (Date) - Auto-generated

**Sample Data Created:**
- STF001 - Rajesh Kumar (Cutting Master) - Daily ₹800
- STF002 - Priya Sharma (Tailor) - Daily ₹600
- STF003 - Amit Patel (Helper) - Monthly ₹15,000
- STF004 - Sunita Devi (Finishing Worker) - Daily ₹500
- STF005 - Ravi Verma (Packing Staff) - Daily ₹450

---

### 2. **attendancerecords** (Daily Attendance Table)
Tracks daily attendance for all staff members.

**Fields:**
- `date` (String, Unique) - Date in YYYY-MM-DD format
- `attendance` (Map) - Staff-wise attendance details
  - Key: staffId
  - Value: Object containing:
    - `status` (Enum: 'present', 'absent', 'halfday') - Attendance status
    - `overtime` (Number) - Overtime hours worked
    - `remarks` (String) - Additional notes
- `createdAt` (Date) - Auto-generated
- `updatedAt` (Date) - Auto-generated

**Sample Data Created:**
- 2 attendance records (yesterday and today)
- All staff members marked with their attendance status

---

### 3. **advancesalaries** (Advance Salary Table)
Records advance salary payments to staff.

**Fields:**
- `advanceId` (String, Unique) - Advance identifier (e.g., ADV001)
- `staffId` (String, Required) - Reference to staff member
- `date` (Date, Required) - Date of advance
- `amount` (Number, Required) - Advance amount
- `reason` (String) - Reason for advance
- `repaymentType` (Enum: 'monthly', 'deduct') - How to recover
- `isPaid` (Boolean, Default: false) - Repayment status
- `createdAt` (Date) - Auto-generated
- `updatedAt` (Date) - Auto-generated

**Sample Data Created:**
- ADV001 - STF001 - ₹5,000 (Medical emergency)
- ADV002 - STF003 - ₹3,000 (Personal)

---

### 4. **salarypayments** (Salary Payment Table)
Tracks salary payments made to staff members.

**Fields:**
- `paymentId` (String, Unique) - Payment identifier (e.g., PAY001)
- `staffId` (String, Required) - Reference to staff member
- `paymentDate` (Date, Required) - Date of payment
- `amount` (Number, Required) - Payment amount
- `periodFrom` (Date, Required) - Salary period start
- `periodTo` (Date, Required) - Salary period end
- `paymentMode` (Enum: 'cash', 'bank', 'upi') - Payment method
- `notes` (String) - Additional notes
- `createdAt` (Date) - Auto-generated
- `updatedAt` (Date) - Auto-generated

**Sample Data:** No sample data created (starts empty)

---

## 🚀 API Endpoints Available

### Staff Management
- `GET /api/staff` - Get all staff members
- `POST /api/staff` - Create new staff member
- `PUT /api/staff/:staffId` - Update staff details
- `DELETE /api/staff/:staffId` - Delete staff member

### Attendance Management
- `GET /api/attendance` - Get all attendance records
- `POST /api/attendance` - Save attendance for a date

### Advance Salary Management
- `GET /api/advances` - Get all advance salary records
- `POST /api/advances` - Create advance salary record
- `PUT /api/advances/:advanceId` - Update advance record
- `DELETE /api/advances/:advanceId` - Delete advance record

### Salary Payment Management
- `GET /api/salary-payments` - Get all salary payments
- `POST /api/salary-payments` - Create salary payment record

---

## 🎯 Features Available in Frontend

1. **Dashboard Tab**
   - Total staff count
   - Today's present/absent count
   - Advance outstanding summary
   - Total salary payable

2. **Staff Master Tab**
   - View all staff in a table
   - Add new staff member
   - Edit staff details
   - Activate/deactivate staff

3. **Daily Attendance Tab**
   - Mark attendance for any date
   - Set status: Present/Absent/Half Day
   - Record overtime hours
   - Add remarks for each staff

4. **Advance Salary Tab**
   - Record advance salary requests
   - Track repayment status
   - View all advances with details

5. **Salary Payment Tab**
   - Record salary payments
   - Specify payment period
   - Track payment mode
   - Add payment notes

6. **Reports Tab**
   - Generate salary reports by date range
   - Filter by staff member
   - Calculate gross salary, overtime pay
   - Show advance deductions
   - Display net payable amount

---

## 💡 How to Use

### Starting the Application

1. **Start the Server:**
   ```bash
   cd server
   npm start
   ```
   Server runs on http://localhost:5000

2. **Start the Client:**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on http://localhost:5173

3. **Access Staff Attendance:**
   - Navigate to the application
   - Click on "Staff Attendance" in the sidebar
   - The tables are ready to use!

### Adding Staff Members
1. Go to "Staff Master" tab
2. Click "+ Add Staff" button
3. Fill in the details (name, mobile, designation, salary)
4. Click "Save"

### Marking Attendance
1. Go to "Daily Attendance" tab
2. Select the date
3. Mark each staff member as Present/Absent/Half Day
4. Add overtime hours if applicable
5. Click "Save Attendance"

### Recording Advances
1. Go to "Advance Salary" tab
2. Click "+ Add Advance"
3. Select staff member
4. Enter amount and reason
5. Choose repayment type
6. Click "Save"

### Recording Salary Payments
1. Go to "Salary Payment" tab
2. Click "+ Add Payment"
3. Select staff member
4. Enter payment details (amount, period, mode)
5. Click "Save"

### Generating Reports
1. Go to "Reports" tab
2. Select date range (from and to)
3. Choose staff member (or "All")
4. View detailed salary calculations
5. Export/Print if needed

---

## 🔍 Database Scripts Available

### Initialize Database
```bash
cd server
node src/init-staff-attendance.js
```
Creates collections and adds sample data.

### Check Staff Data
```bash
cd server
node check-staff.js
```
Displays all staff members in the database.

### Test All Collections
```bash
cd server
node test-staff-attendance.js
```
Shows summary of all attendance-related collections.

---

## ✅ Status: Tables Created Successfully!

All required database tables (MongoDB collections) for staff attendance management have been created and initialized with sample data. The system is ready to use!

**Current Database Status:**
- ✓ 5 Staff members created
- ✓ 2 Attendance records created
- ✓ 2 Advance salary records created
- ✓ Salary payment table ready (empty)

**Next Steps:**
1. Start the server and client
2. Access the Staff Attendance page
3. Begin managing your staff attendance data!
