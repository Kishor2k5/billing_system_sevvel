import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

// Staff Schema
const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    salaryType: {
      type: String,
      enum: ['daily', 'monthly'],
      required: true,
    },
    salaryAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

// Attendance Record Schema
const attendanceRecordSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    attendance: {
      type: Map,
      of: {
        status: {
          type: String,
          enum: ['present', 'absent', 'halfday'],
          required: true,
        },
        overtime: Number,
        remarks: String,
      },
    },
  },
  { timestamps: true }
);

const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', attendanceRecordSchema);

// Advance Salary Schema
const advanceSalarySchema = new mongoose.Schema(
  {
    advanceId: {
      type: String,
      required: true,
      unique: true,
    },
    staffId: {
      type: String,
      required: true,
      ref: 'Staff',
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    repaymentType: {
      type: String,
      enum: ['monthly', 'deduct'],
      default: 'monthly',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AdvanceSalary = mongoose.models.AdvanceSalary || mongoose.model('AdvanceSalary', advanceSalarySchema);

// Salary Payment Schema
const salaryPaymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
    },
    staffId: {
      type: String,
      required: true,
      ref: 'Staff',
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    periodFrom: {
      type: Date,
      required: true,
    },
    periodTo: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
      enum: ['cash', 'bank', 'upi'],
      default: 'cash',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const SalaryPayment = mongoose.models.SalaryPayment || mongoose.model('SalaryPayment', salaryPaymentSchema);

async function initializeStaffAttendance() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('Connected to MongoDB successfully');

    // Check if staff already exist
    const existingStaff = await Staff.countDocuments();
    if (existingStaff > 0) {
      console.log(`Found ${existingStaff} existing staff members. Skipping staff creation.`);
    } else {
      console.log('Creating sample staff members...');
      const sampleStaff = [
        {
          staffId: 'STF001',
          name: 'Rajesh Kumar',
          mobile: '9876543210',
          designation: 'Cutting Master',
          salaryType: 'daily',
          salaryAmount: 800,
          joiningDate: new Date('2024-01-15'),
          isActive: true,
        },
        {
          staffId: 'STF002',
          name: 'Priya Sharma',
          mobile: '9876543211',
          designation: 'Tailor',
          salaryType: 'daily',
          salaryAmount: 600,
          joiningDate: new Date('2024-02-01'),
          isActive: true,
        },
        {
          staffId: 'STF003',
          name: 'Amit Patel',
          mobile: '9876543212',
          designation: 'Helper',
          salaryType: 'monthly',
          salaryAmount: 15000,
          joiningDate: new Date('2024-01-10'),
          isActive: true,
        },
        {
          staffId: 'STF004',
          name: 'Sunita Devi',
          mobile: '9876543213',
          designation: 'Finishing Worker',
          salaryType: 'daily',
          salaryAmount: 500,
          joiningDate: new Date('2024-03-01'),
          isActive: true,
        },
        {
          staffId: 'STF005',
          name: 'Ravi Verma',
          mobile: '9876543214',
          designation: 'Packing Staff',
          salaryType: 'daily',
          salaryAmount: 450,
          joiningDate: new Date('2024-04-15'),
          isActive: true,
        },
      ];

      await Staff.insertMany(sampleStaff);
      console.log(`✓ Created ${sampleStaff.length} staff members`);
    }

    // Check if attendance records exist
    const existingAttendance = await AttendanceRecord.countDocuments();
    if (existingAttendance > 0) {
      console.log(`Found ${existingAttendance} attendance records. Skipping attendance creation.`);
    } else {
      console.log('Creating sample attendance records...');
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayDate = today.toISOString().split('T')[0];
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const sampleAttendance = [
        {
          date: yesterdayDate,
          attendance: new Map([
            ['STF001', { status: 'present', overtime: 2, remarks: '' }],
            ['STF002', { status: 'present', overtime: 0, remarks: '' }],
            ['STF003', { status: 'halfday', overtime: 0, remarks: 'Medical appointment' }],
            ['STF004', { status: 'present', overtime: 1, remarks: '' }],
            ['STF005', { status: 'absent', overtime: 0, remarks: 'Leave' }],
          ]),
        },
        {
          date: todayDate,
          attendance: new Map([
            ['STF001', { status: 'present', overtime: 0, remarks: '' }],
            ['STF002', { status: 'present', overtime: 1.5, remarks: '' }],
            ['STF003', { status: 'present', overtime: 0, remarks: '' }],
            ['STF004', { status: 'present', overtime: 0, remarks: '' }],
            ['STF005', { status: 'present', overtime: 0, remarks: '' }],
          ]),
        },
      ];

      await AttendanceRecord.insertMany(sampleAttendance);
      console.log(`✓ Created ${sampleAttendance.length} attendance records`);
    }

    // Check if advance salary records exist
    const existingAdvances = await AdvanceSalary.countDocuments();
    if (existingAdvances > 0) {
      console.log(`Found ${existingAdvances} advance salary records. Skipping advance creation.`);
    } else {
      console.log('Creating sample advance salary records...');
      const sampleAdvances = [
        {
          advanceId: 'ADV001',
          staffId: 'STF001',
          date: new Date('2026-01-05'),
          amount: 5000,
          reason: 'Medical emergency',
          repaymentType: 'monthly',
          isPaid: false,
        },
        {
          advanceId: 'ADV002',
          staffId: 'STF003',
          date: new Date('2026-01-03'),
          amount: 3000,
          reason: 'Personal',
          repaymentType: 'deduct',
          isPaid: false,
        },
      ];

      await AdvanceSalary.insertMany(sampleAdvances);
      console.log(`✓ Created ${sampleAdvances.length} advance salary records`);
    }

    console.log('\n✓ Staff Attendance database initialization completed successfully!');
    console.log('\nCollections created:');
    console.log('  - staff (Staff members master data)');
    console.log('  - attendancerecords (Daily attendance tracking)');
    console.log('  - advancesalaries (Advance salary requests)');
    console.log('  - salarypayments (Salary payment history)');

  } catch (error) {
    console.error('Error initializing staff attendance database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

initializeStaffAttendance();
