import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI, MONGODB_DB_NAME } = process.env;

async function testStaffAttendance() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    });
    console.log('Connected successfully\n');

    // Get collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📋 Available Collections:');
    collectionNames.forEach(name => {
      console.log(`  - ${name}`);
    });
    console.log();

    // Check Staff collection
    const staffCount = await mongoose.connection.db.collection('staff').countDocuments();
    console.log(`👥 Staff Members: ${staffCount}`);
    
    if (staffCount > 0) {
      const staff = await mongoose.connection.db.collection('staff').find().limit(3).toArray();
      console.log('\nSample Staff Records:');
      staff.forEach(s => {
        console.log(`  • ${s.staffId} - ${s.name} (${s.designation}) - ${s.salaryType} salary: ₹${s.salaryAmount}`);
      });
    }

    // Check Attendance Records
    const attendanceCount = await mongoose.connection.db.collection('attendancerecords').countDocuments();
    console.log(`\n📅 Attendance Records: ${attendanceCount}`);
    
    if (attendanceCount > 0) {
      const attendance = await mongoose.connection.db.collection('attendancerecords').find().sort({ date: -1 }).limit(2).toArray();
      console.log('\nRecent Attendance:');
      attendance.forEach(a => {
        const totalStaff = a.attendance ? a.attendance.size : 0;
        console.log(`  • Date: ${a.date} - ${totalStaff} staff marked`);
      });
    }

    // Check Advance Salary
    const advanceCount = await mongoose.connection.db.collection('advancesalaries').countDocuments();
    console.log(`\n💰 Advance Salary Records: ${advanceCount}`);
    
    if (advanceCount > 0) {
      const advances = await mongoose.connection.db.collection('advancesalaries').find().toArray();
      console.log('\nAdvance Salary Details:');
      advances.forEach(a => {
        console.log(`  • ${a.advanceId} - Staff: ${a.staffId} - Amount: ₹${a.amount} - Reason: ${a.reason}`);
      });
    }

    // Check Salary Payments
    const paymentCount = await mongoose.connection.db.collection('salarypayments').countDocuments();
    console.log(`\n💳 Salary Payment Records: ${paymentCount}`);

    console.log('\n✓ Staff Attendance Database is ready!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testStaffAttendance();
